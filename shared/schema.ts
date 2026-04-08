import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"), // admin | member
  createdAt: text("created_at").notNull(),
});

export const routes = sqliteTable("routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  opportunityId: text("opportunity_id").notNull().unique(),
  status: text("status").notNull().default("Active"),
  state: text("state").notNull(),
  metroCity: text("metro_city"),
  company: text("company").notNull(),
  equipmentCategory: text("equipment_category").notNull(),
  equipmentRaw: text("equipment_raw"),
  payMin: real("pay_min"),
  payMax: real("pay_max"),
  payUnit: text("pay_unit"),
  payRaw: text("pay_raw"),
  routeNotes: text("route_notes"),
  sourceUrl: text("source_url"),
  sourcePage: text("source_page"),
  importedOn: text("imported_on"),
  lastVerified: text("last_verified"),
  inWeeklyUpdate: integer("in_weekly_update", { mode: "boolean" }).default(false),
  isNew: integer("is_new", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull(),
});

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: text("company_id").notNull().unique(),
  name: text("name").notNull(),
  website: text("website"),
  contactInfo: text("contact_info"),
  notes: text("notes"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});
