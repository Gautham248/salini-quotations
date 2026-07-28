/**
 * push-data-remote.ts
 * Syncs local database schema and all local records (Stores, Users, Catalog, Quotations, Settings)
 * to the remote Turso instance.
 *
 * Run with:
 * DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="your-token" npx tsx prisma/push-data-remote.ts
 */
import { createClient } from "@libsql/client";
import { db as localDb } from "../src/lib/db";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !url.startsWith("libsql://")) {
  console.error("\n❌ Error: Please set remote DATABASE_URL (libsql://...) and TURSO_AUTH_TOKEN.");
  console.error("Example:");
  console.error("  DATABASE_URL=\"libsql://your-db.turso.io\" TURSO_AUTH_TOKEN=\"...\" npx tsx prisma/push-data-remote.ts\n");
  process.exit(1);
}

const remote = createClient({ url, authToken });

async function syncToRemote() {
  console.log(`🔗 Connecting to remote Turso database: ${url}\n`);

  // 1. Ensure Schema Tables Exist on Remote
  console.log("📦 Creating remote schema tables...");
  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "Store" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await remote.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "Store_slug_key" ON "Store"("slug");`);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "username" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "storeId" INTEGER REFERENCES "Store"("id"),
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "forcePasswordChange" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await remote.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");`);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "CompanySettings" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "storeId" INTEGER NOT NULL UNIQUE REFERENCES "Store"("id"),
      "companyName" TEXT NOT NULL,
      "subheading" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "mobile" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "gstin" TEXT NOT NULL,
      "bankDetails" TEXT NOT NULL,
      "disclaimerText" TEXT NOT NULL DEFAULT 'Certified that the particulars given above are true and correct.',
      "loadingNote" TEXT NOT NULL DEFAULT 'LOADING CHARGE AND TRANSPORTATION CHARGES EXTRA',
      "updatedAt" DATETIME NOT NULL
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "Unit" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL UNIQUE,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdById" INTEGER NOT NULL REFERENCES "User"("id"),
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "UnitConversion" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "fromUnitId" INTEGER NOT NULL REFERENCES "Unit"("id"),
      "toUnitId" INTEGER NOT NULL REFERENCES "Unit"("id"),
      "factor" REAL NOT NULL,
      UNIQUE("fromUnitId", "toUnitId")
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL UNIQUE,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "MasterItem" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "description" TEXT NOT NULL,
      "unitId" INTEGER NOT NULL REFERENCES "Unit"("id"),
      "rate" REAL NOT NULL,
      "gstPercent" REAL NOT NULL,
      "weightPerUnit" REAL,
      "piecesPerUnit" INTEGER,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdById" INTEGER NOT NULL REFERENCES "User"("id"),
      "updatedById" INTEGER NOT NULL REFERENCES "User"("id"),
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "ItemCategory" (
      "itemId" INTEGER NOT NULL REFERENCES "MasterItem"("id") ON DELETE CASCADE,
      "categoryId" INTEGER NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
      PRIMARY KEY("itemId", "categoryId")
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "ItemStoreRate" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "masterItemId" INTEGER NOT NULL REFERENCES "MasterItem"("id") ON DELETE CASCADE,
      "storeId" INTEGER NOT NULL REFERENCES "Store"("id") ON DELETE CASCADE,
      "rate" REAL NOT NULL,
      "updatedAt" DATETIME NOT NULL,
      UNIQUE("masterItemId", "storeId")
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "Quotation" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "storeId" INTEGER NOT NULL REFERENCES "Store"("id"),
      "quotNo" TEXT NOT NULL,
      "refNo" TEXT NOT NULL,
      "quotDate" DATETIME NOT NULL,
      "status" TEXT NOT NULL,
      "customerName" TEXT NOT NULL,
      "customerAddress" TEXT,
      "customerPlace" TEXT,
      "customerGstin" TEXT,
      "deliveryTerms" TEXT,
      "gstNote" TEXT,
      "validity" TEXT NOT NULL DEFAULT 'LIMITED',
      "paymentTerms" TEXT NOT NULL DEFAULT 'READY PAYMENT',
      "subTotal" REAL,
      "cgst" REAL,
      "sgst" REAL,
      "roundOff" REAL,
      "netAmount" REAL,
      "amountInWords" TEXT,
      "isLocked" BOOLEAN NOT NULL DEFAULT 0,
      "createdById" INTEGER NOT NULL REFERENCES "User"("id"),
      "updatedById" INTEGER REFERENCES "User"("id"),
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "finalizedAt" DATETIME,
      UNIQUE("storeId", "quotNo")
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "QuotationLineItem" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "quotationId" INTEGER NOT NULL REFERENCES "Quotation"("id") ON DELETE CASCADE,
      "masterItemId" INTEGER REFERENCES "MasterItem"("id"),
      "lineNo" INTEGER NOT NULL,
      "description" TEXT NOT NULL,
      "unit" TEXT NOT NULL,
      "rate" REAL NOT NULL,
      "gstPercent" REAL NOT NULL,
      "qty" REAL NOT NULL,
      "netValue" REAL NOT NULL,
      "quoteMode" TEXT NOT NULL DEFAULT 'quantity',
      "weightKg" REAL,
      "pieceCount" REAL,
      "isLocked" BOOLEAN NOT NULL DEFAULT 0
    );
  `);

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS "StoreQuotSequence" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "storeId" INTEGER NOT NULL UNIQUE REFERENCES "Store"("id"),
      "lastNumber" INTEGER NOT NULL DEFAULT 0
    );
  `);

  console.log("✓ Remote schema structure confirmed.\n");

  // 2. Fetch local data from dev.db
  console.log("📥 Fetching local data from SQLite (dev.db)...");
  const stores = await localDb.store.findMany();
  const users = await localDb.user.findMany();
  const settings = await localDb.companySettings.findMany();
  const units = await localDb.unit.findMany();
  const conversions = await localDb.unitConversion.findMany();
  const categories = await localDb.category.findMany();
  const itemCategories = await localDb.itemCategory.findMany();
  const items = await localDb.masterItem.findMany();
  const itemStoreRates = await localDb.itemStoreRate.findMany();
  const quotations = await localDb.quotation.findMany();
  const lineItems = await localDb.quotationLineItem.findMany();
  const sequences = await localDb.storeQuotSequence.findMany();

  console.log(`  - Stores: ${stores.length}`);
  console.log(`  - Users: ${users.length}`);
  console.log(`  - CompanySettings: ${settings.length}`);
  console.log(`  - Units: ${units.length}`);
  console.log(`  - UnitConversions: ${conversions.length}`);
  console.log(`  - Categories: ${categories.length}`);
  console.log(`  - Items: ${items.length}`);
  console.log(`  - Quotations: ${quotations.length}\n`);

  // 3. Push to Remote
  console.log("🚀 Syncing records to remote Turso database...");

  // Stores
  for (const s of stores) {
    await remote.execute({
      sql: `INSERT INTO "Store" (id, name, slug, isActive, createdAt) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, isActive=excluded.isActive;`,
      args: [s.id, s.name, s.slug, s.isActive ? 1 : 0, s.createdAt.toISOString()],
    });
  }

  // Users
  for (const u of users) {
    await remote.execute({
      sql: `INSERT INTO "User" (id, username, passwordHash, role, storeId, isActive, forcePasswordChange, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET username=excluded.username, role=excluded.role, storeId=excluded.storeId, isActive=excluded.isActive;`,
      args: [u.id, u.username, u.passwordHash, u.role, u.storeId, u.isActive ? 1 : 0, u.forcePasswordChange ? 1 : 0, u.createdAt.toISOString()],
    });
  }

  // CompanySettings
  for (const cs of settings) {
    await remote.execute({
      sql: `INSERT INTO "CompanySettings" (id, storeId, companyName, subheading, phone, mobile, email, gstin, bankDetails, disclaimerText, loadingNote, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET companyName=excluded.companyName, subheading=excluded.subheading, phone=excluded.phone, mobile=excluded.mobile, email=excluded.email, gstin=excluded.gstin, bankDetails=excluded.bankDetails;`,
      args: [cs.id, cs.storeId, cs.companyName, cs.subheading, cs.phone, cs.mobile, cs.email, cs.gstin, cs.bankDetails, cs.disclaimerText, cs.loadingNote, cs.updatedAt.toISOString()],
    });
  }

  // Units
  for (const un of units) {
    await remote.execute({
      sql: `INSERT INTO "Unit" (id, name, isActive, createdById, createdAt) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, isActive=excluded.isActive;`,
      args: [un.id, un.name, un.isActive ? 1 : 0, un.createdById, un.createdAt.toISOString()],
    });
  }

  // UnitConversions
  for (const uc of conversions) {
    await remote.execute({
      sql: `INSERT INTO "UnitConversion" (id, fromUnitId, toUnitId, factor) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET factor=excluded.factor;`,
      args: [uc.id, uc.fromUnitId, uc.toUnitId, uc.factor],
    });
  }

  // Categories
  for (const cat of categories) {
    await remote.execute({
      sql: `INSERT INTO "Category" (id, name, createdAt) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name;`,
      args: [cat.id, cat.name, cat.createdAt.toISOString()],
    });
  }

  // MasterItems
  for (const item of items) {
    await remote.execute({
      sql: `INSERT INTO "MasterItem" (id, description, unitId, rate, gstPercent, weightPerUnit, piecesPerUnit, isActive, createdById, updatedById, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET description=excluded.description, unitId=excluded.unitId, rate=excluded.rate, gstPercent=excluded.gstPercent;`,
      args: [item.id, item.description, item.unitId, item.rate, item.gstPercent, item.weightPerUnit, item.piecesPerUnit, item.isActive ? 1 : 0, item.createdById, item.updatedById, item.createdAt.toISOString(), item.updatedAt.toISOString()],
    });
  }

  // ItemCategory
  for (const ic of itemCategories) {
    await remote.execute({
      sql: `INSERT INTO "ItemCategory" (itemId, categoryId) VALUES (?, ?)
            ON CONFLICT(itemId, categoryId) DO NOTHING;`,
      args: [ic.itemId, ic.categoryId],
    });
  }

  // ItemStoreRate
  for (const isr of itemStoreRates) {
    await remote.execute({
      sql: `INSERT INTO "ItemStoreRate" (id, masterItemId, storeId, rate, updatedAt) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET rate=excluded.rate;`,
      args: [isr.id, isr.masterItemId, isr.storeId, isr.rate, isr.updatedAt.toISOString()],
    });
  }

  // Quotations
  for (const q of quotations) {
    await remote.execute({
      sql: `INSERT INTO "Quotation" (id, storeId, quotNo, refNo, quotDate, status, customerName, customerAddress, customerPlace, customerGstin, deliveryTerms, gstNote, validity, paymentTerms, subTotal, cgst, sgst, roundOff, netAmount, amountInWords, isLocked, createdById, updatedById, createdAt, updatedAt, finalizedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET status=excluded.status, netAmount=excluded.netAmount, isLocked=excluded.isLocked;`,
      args: [q.id, q.storeId, q.quotNo, q.refNo, q.quotDate.toISOString(), q.status, q.customerName, q.customerAddress, q.customerPlace, q.customerGstin, q.deliveryTerms, q.gstNote, q.validity, q.paymentTerms, q.subTotal, q.cgst, q.sgst, q.roundOff, q.netAmount, q.amountInWords, q.isLocked ? 1 : 0, q.createdById, q.updatedById, q.createdAt.toISOString(), q.updatedAt.toISOString(), q.finalizedAt ? q.finalizedAt.toISOString() : null],
    });
  }

  // QuotationLineItems
  for (const li of lineItems) {
    await remote.execute({
      sql: `INSERT INTO "QuotationLineItem" (id, quotationId, masterItemId, lineNo, description, unit, rate, gstPercent, qty, netValue, quoteMode, weightKg, pieceCount, isLocked)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET qty=excluded.qty, netValue=excluded.netValue, isLocked=excluded.isLocked;`,
      args: [li.id, li.quotationId, li.masterItemId, li.lineNo, li.description, li.unit, li.rate, li.gstPercent, li.qty, li.netValue, li.quoteMode, li.weightKg, li.pieceCount, li.isLocked ? 1 : 0],
    });
  }

  // StoreQuotSequence
  for (const seq of sequences) {
    await remote.execute({
      sql: `INSERT INTO "StoreQuotSequence" (id, storeId, lastNumber) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET lastNumber=excluded.lastNumber;`,
      args: [seq.id, seq.storeId, seq.lastNumber],
    });
  }

  console.log("\n✅ All local schema changes and data successfully pushed to remote Turso database!");
  await remote.close();
}

syncToRemote().catch((err) => {
  console.error("\n❌ Push failed:", err);
  process.exit(1);
});
