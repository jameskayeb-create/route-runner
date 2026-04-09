import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { users, routes, companies, type User, type InsertUser, type Route, type InsertRoute, type Company, type InsertCompany } from "@shared/schema";
import { eq, like, and, gte, lte, desc, asc, sql, or } from "drizzle-orm";
import * as path from "path";

// Railway persistent volume: set DATABASE_PATH env var to /data/database.sqlite
// Locally, defaults to ./database.sqlite in the project root
const dbPath = process.env.DATABASE_PATH || "database.sqlite";
console.log(`[database] Using SQLite at: ${path.resolve(dbPath)}`);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

// Run migrations
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Active',
    state TEXT NOT NULL,
    metro_city TEXT,
    company TEXT NOT NULL,
    equipment_category TEXT NOT NULL,
    equipment_raw TEXT,
    pay_min REAL,
    pay_max REAL,
    pay_unit TEXT,
    pay_raw TEXT,
    route_notes TEXT,
    source_url TEXT,
    source_page TEXT,
    imported_on TEXT,
    last_verified TEXT,
    in_weekly_update INTEGER DEFAULT 0,
    is_new INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    website TEXT,
    contact_info TEXT,
    notes TEXT
  );
`);

export interface IStorage {
  // Auth
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  createUser(user: InsertUser): User;
  getAllMembers(): User[];
  deleteUser(id: number): void;

  // Routes
  getRoutes(filters?: RouteFilters): Route[];
  getRouteById(id: number): Route | undefined;
  createRoute(route: InsertRoute): Route;
  updateRoute(id: number, route: Partial<InsertRoute>): Route | undefined;
  deleteRoute(id: number): void;
  getRouteStats(): RouteStats;
  getStateBreakdown(): StateBreakdown[];

  // Companies
  getCompanies(): Company[];
  getCompanyById(id: number): Company | undefined;
  createCompany(company: InsertCompany): Company;
}

export interface RouteFilters {
  state?: string;
  equipmentCategory?: string;
  payUnit?: string;
  minPay?: number;
  maxPay?: number;
  search?: string;
  status?: string;
  isNew?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface RouteStats {
  totalRoutes: number;
  activeRoutes: number;
  statesCovered: number;
  newThisWeek: number;
  avgPayWeekly: number;
}

export interface StateBreakdown {
  state: string;
  count: number;
}

export class DatabaseStorage implements IStorage {
  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  createUser(user: InsertUser): User {
    const now = new Date().toISOString();
    return db.insert(users).values({ ...user, createdAt: now }).returning().get();
  }

  getAllMembers(): User[] {
    return db.select().from(users).all();
  }

  deleteUser(id: number): void {
    db.delete(users).where(eq(users.id, id)).run();
  }

  getRoutes(filters?: RouteFilters): Route[] {
    const conditions: any[] = [];

    if (filters?.state) {
      conditions.push(eq(routes.state, filters.state));
    }
    if (filters?.equipmentCategory) {
      conditions.push(eq(routes.equipmentCategory, filters.equipmentCategory));
    }
    if (filters?.payUnit) {
      conditions.push(eq(routes.payUnit, filters.payUnit));
    }
    if (filters?.status) {
      conditions.push(eq(routes.status, filters.status));
    }
    if (filters?.isNew !== undefined) {
      conditions.push(eq(routes.isNew, filters.isNew));
    }
    if (filters?.minPay !== undefined) {
      conditions.push(gte(routes.payMin, filters.minPay));
    }
    if (filters?.maxPay !== undefined) {
      conditions.push(lte(routes.payMax, filters.maxPay));
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(routes.company, term),
          like(routes.state, term),
          like(routes.metroCity, term),
          like(routes.routeNotes, term)
        )
      );
    }

    let query = db.select().from(routes);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Sort
    const sortCol = filters?.sortBy === 'pay' ? routes.payMax
      : filters?.sortBy === 'state' ? routes.state
      : filters?.sortBy === 'company' ? routes.company
      : routes.createdAt;
    const sortDirection = filters?.sortDir === 'asc' ? asc : desc;
    query = query.orderBy(sortDirection(sortCol)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return (query as any).all();
  }

  getRouteById(id: number): Route | undefined {
    return db.select().from(routes).where(eq(routes.id, id)).get();
  }

  createRoute(route: InsertRoute): Route {
    const now = new Date().toISOString();
    return db.insert(routes).values({ ...route, createdAt: now }).returning().get();
  }

  updateRoute(id: number, data: Partial<InsertRoute>): Route | undefined {
    return db.update(routes).set(data).where(eq(routes.id, id)).returning().get();
  }

  deleteRoute(id: number): void {
    db.delete(routes).where(eq(routes.id, id)).run();
  }

  getRouteStats(): RouteStats {
    const total = db.select({ count: sql<number>`count(*)` }).from(routes).get();
    const active = db.select({ count: sql<number>`count(*)` }).from(routes).where(eq(routes.status, "Active")).get();
    const statesResult = db.select({ count: sql<number>`count(distinct ${routes.state})` }).from(routes).get();
    const newRoutes = db.select({ count: sql<number>`count(*)` }).from(routes).where(eq(routes.isNew, true)).get();
    const avgPay = db.select({ avg: sql<number>`avg(${routes.payMax})` }).from(routes).where(eq(routes.payUnit, "Per Week")).get();

    return {
      totalRoutes: total?.count ?? 0,
      activeRoutes: active?.count ?? 0,
      statesCovered: statesResult?.count ?? 0,
      newThisWeek: newRoutes?.count ?? 0,
      avgPayWeekly: Math.round(avgPay?.avg ?? 0),
    };
  }

  getStateBreakdown(): StateBreakdown[] {
    return db
      .select({
        state: routes.state,
        count: sql<number>`count(*)`,
      })
      .from(routes)
      .groupBy(routes.state)
      .orderBy(desc(sql`count(*)`))
      .all();
  }

  getCompanies(): Company[] {
    return db.select().from(companies).orderBy(asc(companies.name)).all();
  }

  getCompanyById(id: number): Company | undefined {
    return db.select().from(companies).where(eq(companies.id, id)).get();
  }

  createCompany(company: InsertCompany): Company {
    return db.insert(companies).values(company).returning().get();
  }
}

export const storage = new DatabaseStorage();
