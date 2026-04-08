import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertRouteSchema } from "@shared/schema";
import * as crypto from "crypto";

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
  app.post("/api/auth/register", (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const user = storage.createUser({
        ...data,
        password: hashPassword(data.password),
        role: "member",
      });
      const token = generateToken();
      sessions.set(token, { userId: user.id, role: user.role });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid input" });
    }
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
}
