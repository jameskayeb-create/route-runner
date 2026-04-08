import Database from "better-sqlite3";
import * as fs from "fs";
import * as crypto from "crypto";

const dbPath = process.env.DATABASE_PATH || "database.sqlite";
console.log(`Seeding database at: ${dbPath}`);
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Create tables
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

// Load seed data
const seedData = JSON.parse(fs.readFileSync("seed-data.json", "utf-8"));
const now = new Date().toISOString();

// Create admin user
const adminPassword = crypto.createHash("sha256").update("admin123").digest("hex");
try {
  sqlite.prepare(`INSERT OR IGNORE INTO users (email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run("admin@sixfigurecourier.com", adminPassword, "James (Admin)", "admin", now);
  console.log("Admin user created: admin@sixfigurecourier.com / admin123");
} catch (e) {
  console.log("Admin user already exists");
}

// Create a demo member
const demoPassword = crypto.createHash("sha256").update("demo123").digest("hex");
try {
  sqlite.prepare(`INSERT OR IGNORE INTO users (email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run("demo@example.com", demoPassword, "Demo User", "member", now);
  console.log("Demo user created: demo@example.com / demo123");
} catch (e) {
  console.log("Demo user already exists");
}

// Insert routes
const insertRoute = sqlite.prepare(`
  INSERT OR IGNORE INTO routes (opportunity_id, status, state, metro_city, company, equipment_category, equipment_raw, pay_min, pay_max, pay_unit, pay_raw, route_notes, source_url, source_page, imported_on, last_verified, in_weekly_update, is_new, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let routeCount = 0;
for (const opp of seedData.opportunities) {
  try {
    insertRoute.run(
      opp.opportunityId,
      "Active", // Mark all as Active for the app
      opp.state,
      opp.metroCity || null,
      opp.company,
      opp.equipmentCategory,
      opp.equipmentRaw || null,
      opp.payMin || null,
      opp.payMax || null,
      opp.payUnit || null,
      opp.payRaw || null,
      opp.routeNotes || null,
      opp.sourceUrl || null,
      opp.sourcePage || null,
      opp.importedOn || null,
      null,
      0,
      1,
      now
    );
    routeCount++;
  } catch (e) {
    // Skip duplicates
  }
}
console.log(`Imported ${routeCount} routes`);

// Insert companies
const insertCompany = sqlite.prepare(`
  INSERT OR IGNORE INTO companies (company_id, name, website, contact_info, notes)
  VALUES (?, ?, ?, ?, ?)
`);

let companyCount = 0;
for (const comp of seedData.companies) {
  try {
    insertCompany.run(
      comp.companyId,
      comp.name,
      comp.website || null,
      comp.contactInfo || null,
      comp.notes || null
    );
    companyCount++;
  } catch (e) {
    // Skip duplicates
  }
}
console.log(`Imported ${companyCount} companies`);

sqlite.close();
console.log("\nSeed complete!");
