import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertRouteSchema } from "@shared/schema";
import * as crypto from "crypto";
import { Resend } from "resend";

// Lazy init — Resend throws if no API key at construction time
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

function shopifyLog(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [shopify] ${message}`);
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Simple session map (in-memory for this deployment)
const sessions = new Map<string, { userId: number; role: string }>();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.session = sessions.get(token)!;
  next();
}

function adminMiddleware(req: any, res: any, next: any) {
  if (req.session?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function registerRoutes(server: Server, app: Express) {
  // ======= HEALTH CHECK (Railway) =======
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ======= AUTH =======
  // Public registration disabled — accounts created via Shopify webhook only
  app.post("/api/auth/register", (_req, res) => {
    res.status(403).json({ error: "Registration is disabled. Purchase a subscription at sixfigurecouriers.com to get access." });
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = storage.getUserByEmail(data.email);
      if (!user || user.password !== hashPassword(data.password)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = generateToken();
      sessions.set(token, { userId: user.id, role: user.role });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid input" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", authMiddleware, (req: any, res) => {
    const user = storage.getUserById(req.session.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  });

  // ======= ROUTES (Public stats, auth required for details) =======
  app.get("/api/routes/stats", (_req, res) => {
    const stats = storage.getRouteStats();
    res.json(stats);
  });

  app.get("/api/routes/states", (_req, res) => {
    const breakdown = storage.getStateBreakdown();
    res.json(breakdown);
  });

  app.get("/api/routes", authMiddleware, (req: any, res) => {
    const filters = {
      state: req.query.state as string | undefined,
      equipmentCategory: req.query.equipmentCategory as string | undefined,
      payUnit: req.query.payUnit as string | undefined,
      minPay: req.query.minPay ? Number(req.query.minPay) : undefined,
      maxPay: req.query.maxPay ? Number(req.query.maxPay) : undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      isNew: req.query.isNew === "true" ? true : req.query.isNew === "false" ? false : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      sortBy: req.query.sortBy as string | undefined,
      sortDir: req.query.sortDir as string | undefined,
    };
    const routes = storage.getRoutes(filters);
    res.json(routes);
  });

  app.get("/api/routes/:id", authMiddleware, (req: any, res) => {
    const route = storage.getRouteById(Number(req.params.id));
    if (!route) return res.status(404).json({ error: "Route not found" });
    res.json(route);
  });

  // Admin routes
  app.post("/api/routes", authMiddleware, adminMiddleware, (req: any, res) => {
    try {
      const data = insertRouteSchema.parse(req.body);
      const route = storage.createRoute(data);
      res.json(route);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid input" });
    }
  });

  app.patch("/api/routes/:id", authMiddleware, adminMiddleware, (req: any, res) => {
    const route = storage.updateRoute(Number(req.params.id), req.body);
    if (!route) return res.status(404).json({ error: "Route not found" });
    res.json(route);
  });

  app.delete("/api/routes/:id", authMiddleware, adminMiddleware, (req: any, res) => {
    storage.deleteRoute(Number(req.params.id));
    res.json({ ok: true });
  });

  // ======= COMPANIES =======
  app.get("/api/companies", authMiddleware, (_req, res) => {
    const companies = storage.getCompanies();
    res.json(companies);
  });

  // ======= SHOPIFY WEBHOOK =======
  app.post("/api/shopify/webhook", async (req, res) => {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body));

      // HMAC verification in production
      if (process.env.SHOPIFY_WEBHOOK_SECRET) {
        const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
        if (!hmacHeader) {
          shopifyLog("missing HMAC header");
          return res.status(401).json({ error: "Unauthorized" });
        }
        const computed = crypto
          .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET)
          .update(rawBody)
          .digest("base64");
        const computedBuf = Buffer.from(computed);
        const headerBuf = Buffer.from(hmacHeader);
        if (computedBuf.length !== headerBuf.length || !crypto.timingSafeEqual(computedBuf, headerBuf)) {
          shopifyLog("HMAC mismatch");
          return res.status(401).json({ error: "Unauthorized" });
        }
      }

      const order = JSON.parse(rawBody.toString());
      const topic = req.headers["x-shopify-topic"] as string;
      shopifyLog(`webhook received: ${topic}`);

      if (topic === "orders/create") {
        const lineItems: any[] = order.line_items || [];
        const hasRouteRunner = lineItems.some(
          (item: any) => item.title && item.title.toLowerCase().includes("route runner")
        );

        if (hasRouteRunner) {
          const customerEmail = order.customer?.email || order.email;
          const customerName =
            [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
            order.customer?.email ||
            "Member";

          if (!customerEmail) {
            shopifyLog("no customer email found");
            return res.status(200).json({ ok: true, skipped: "no email" });
          }

          const existing = storage.getUserByEmail(customerEmail);
          if (existing) {
            shopifyLog(`user ${customerEmail} already exists, sending notice`);
            try {
              await getResend().emails.send({
                from: "Route Runner <noreply@sixfigurecouriers.com>",
                to: customerEmail,
                subject: "Route Runner — You Already Have Access",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #fff; padding: 40px; border-radius: 8px;">
                    <h1 style="color: #D4A017; margin-bottom: 4px;">Route Runner</h1>
                    <p style="color: #888; margin-top: 0;">by Six Figure Courier</p>
                    <hr style="border-color: #333; margin: 24px 0;" />
                    <p>Hey ${customerName},</p>
                    <p>You already have an active Route Runner account. Log in with your existing credentials:</p>
                    <div style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 20px; margin: 24px 0;">
                      <p style="margin: 4px 0;"><strong style="color: #D4A017;">Login URL:</strong> <a href="${process.env.APP_URL || "https://routes.sixfigurecouriers.com"}" style="color: #D4A017;">${process.env.APP_URL || "https://routes.sixfigurecouriers.com"}</a></p>
                      <p style="margin: 4px 0;"><strong style="color: #D4A017;">Email:</strong> ${customerEmail}</p>
                    </div>
                    <p style="color: #888; font-size: 14px;">If you forgot your password, reply to this email and we'll help you reset it.</p>
                    <p>— The Six Figure Courier Team</p>
                  </div>
                `,
              });
            } catch (emailErr) {
              shopifyLog(`failed to send existing-user email: ${emailErr}`);
            }
            return res.status(200).json({ ok: true, existing: true });
          }

          // Create new user
          const password = crypto.randomBytes(6).toString("hex");
          const hashedPassword = hashPassword(password);

          const user = storage.createUser({
            email: customerEmail,
            password: hashedPassword,
            name: customerName,
            role: "member",
          });
          shopifyLog(`created user ${user.email} (id=${user.id})`);

          // Send welcome email
          try {
            await getResend().emails.send({
              from: "Route Runner <noreply@sixfigurecouriers.com>",
              to: customerEmail,
              subject: "Welcome to Route Runner — Your Login Details",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #fff; padding: 40px; border-radius: 8px;">
                  <h1 style="color: #D4A017; margin-bottom: 4px;">Route Runner</h1>
                  <p style="color: #888; margin-top: 0;">by Six Figure Courier</p>
                  <hr style="border-color: #333; margin: 24px 0;" />
                  <p>Hey ${customerName},</p>
                  <p>Your Route Runner membership is active. Here are your login details:</p>
                  <div style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 20px; margin: 24px 0;">
                    <p style="margin: 4px 0;"><strong style="color: #D4A017;">Login URL:</strong> <a href="${process.env.APP_URL || "https://routes.sixfigurecouriers.com"}" style="color: #D4A017;">${process.env.APP_URL || "https://routes.sixfigurecouriers.com"}</a></p>
                    <p style="margin: 4px 0;"><strong style="color: #D4A017;">Email:</strong> ${customerEmail}</p>
                    <p style="margin: 4px 0;"><strong style="color: #D4A017;">Password:</strong> ${password}</p>
                  </div>
                  <p style="color: #888; font-size: 14px;">You can change your password after logging in. If you have any issues, reply to this email.</p>
                  <p>— The Six Figure Courier Team</p>
                </div>
              `,
            });
            shopifyLog(`welcome email sent to ${customerEmail}`);
          } catch (emailErr) {
            shopifyLog(`failed to send welcome email: ${emailErr}`);
          }

          return res.status(200).json({ ok: true, created: true });
        }

        shopifyLog("order has no Route Runner line items, skipping");
      } else if (topic === "orders/cancelled") {
        shopifyLog(`order cancelled — ${JSON.stringify(order.name || order.id)}`);
      } else if (topic === "app/uninstalled") {
        shopifyLog("app uninstalled");
      } else {
        shopifyLog(`unhandled topic ${topic}`);
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      shopifyLog(`error: ${err}`);
      return res.status(200).json({ ok: true });
    }
  });

  // ======= SHOPIFY TEST WEBHOOK (dev only) =======
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/shopify/test-webhook", async (req, res) => {
      try {
        const { email, name } = req.body;
        if (!email || !name) {
          return res.status(400).json({ error: "email and name are required" });
        }

        const existing = storage.getUserByEmail(email);
        if (existing) {
          return res.status(400).json({ error: "User already exists", email });
        }

        const password = crypto.randomBytes(6).toString("hex");
        const hashedPassword = hashPassword(password);

        const user = storage.createUser({
          email,
          password: hashedPassword,
          name,
          role: "member",
        });

        // Send welcome email via Resend
        try {
          await resend.emails.send({
            from: "Route Runner <noreply@sixfigurecouriers.com>",
            to: email,
            subject: "Welcome to Route Runner — Your Login Details",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #fff; padding: 40px; border-radius: 8px;">
                <h1 style="color: #D4A017; margin-bottom: 4px;">Route Runner</h1>
                <p style="color: #888; margin-top: 0;">by Six Figure Courier</p>
                <hr style="border-color: #333; margin: 24px 0;" />
                <p>Hey ${name},</p>
                <p>Your Route Runner membership is active. Here are your login details:</p>
                <div style="background: #2a2a2a; border: 1px solid #333; border-radius: 6px; padding: 20px; margin: 24px 0;">
                  <p style="margin: 4px 0;"><strong style="color: #D4A017;">Login URL:</strong> <a href="${process.env.APP_URL || "https://routes.sixfigurecouriers.com"}" style="color: #D4A017;">${process.env.APP_URL || "https://routes.sixfigurecouriers.com"}</a></p>
                  <p style="margin: 4px 0;"><strong style="color: #D4A017;">Email:</strong> ${email}</p>
                  <p style="margin: 4px 0;"><strong style="color: #D4A017;">Password:</strong> ${password}</p>
                </div>
                <p style="color: #888; font-size: 14px;">You can change your password after logging in. If you have any issues, reply to this email.</p>
                <p>— The Six Figure Courier Team</p>
              </div>
            `,
          });
        } catch (emailErr) {
          shopifyLog(`test webhook: failed to send email: ${emailErr}`);
        }

        res.json({ success: true, email, password, userId: user.id });
      } catch (err: any) {
        res.status(500).json({ error: err.message || "Internal error" });
      }
    });
  }
}
