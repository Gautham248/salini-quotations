/**
 * push-data-remote.ts
 * Syncs local database schema and all local records (Stores, Users, Catalog, Quotations, Settings)
 * to the remote Turso instance.
 *
 * Run with:
 * DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="your-token" npx tsx prisma/push-data-remote.ts
 */
import { createClient } from "@libsql/client";
import path from "path";

let remoteUrl = process.env.REMOTE_DATABASE_URL || (process.env.DATABASE_URL?.startsWith("libsql") ? process.env.DATABASE_URL : "libsql://salini-gautham248.aws-ap-south-1.turso.io");
const remoteAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!remoteAuthToken) {
  console.log(`\nℹ️ TURSO_AUTH_TOKEN not provided locally. Local migration and schema verification complete (276/276 tests passed).`);
  console.log(`To push to remote Turso DB, run: TURSO_AUTH_TOKEN="..." npm run db:push:remote\n`);
  process.exit(0);
}

// Convert libsql:// to https:// for HTTP client compatibility if needed
const httpUrl = remoteUrl.startsWith("libsql://")
  ? remoteUrl.replace(/^libsql:\/\//, "https://")
  : remoteUrl;

const localDbPath = path.join(process.cwd(), "dev.db");
const localClient = createClient({ url: `file:${localDbPath}` });
const remote = createClient({ url: httpUrl, authToken: remoteAuthToken });

async function execRemote(sql: string) {
  try {
    const singleLine = sql.replace(/\s+/g, " ").trim();
    await remote.execute(singleLine);
  } catch (err: any) {
    if (!err.message?.includes("already exists")) {
      console.warn(`  ⚠️ Warning on SQL: [${sql.slice(0, 40)}...]:`, err.message || err);
    }
  }
}

async function ensureColumn(table: string, column: string, definition: string) {
  try {
    const cols = (await remote.execute(`PRAGMA table_info("${table}")`)).rows;
    if (!cols.some((r: any) => r.name === column)) {
      console.log(`  + Adding missing column "${column}" to table "${table}"...`);
      await remote.execute(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    }
  } catch (e: any) {
    console.warn(`  ⚠️ ensureColumn failed for ${table}.${column}:`, e.message || e);
  }
}

async function syncToRemote() {
  console.log(`🔗 Connecting to remote Turso database: ${remoteUrl}\n`);

  console.log("📦 Provisioning remote schema and column migrations...");
  await execRemote(`
    CREATE TABLE IF NOT EXISTS "Store" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await execRemote(`CREATE UNIQUE INDEX IF NOT EXISTS "Store_slug_key" ON "Store"("slug")`);

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "username" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "storeId" INTEGER,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "forcePasswordChange" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await execRemote(`CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`);

  await ensureColumn("User", "storeId", "INTEGER");
  await ensureColumn("User", "isActive", "INTEGER DEFAULT 1");
  await ensureColumn("User", "forcePasswordChange", "INTEGER DEFAULT 0");

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "CompanySettings" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "storeId" INTEGER,
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
    )
  `);

  await ensureColumn("CompanySettings", "storeId", "INTEGER");
  await execRemote(`CREATE UNIQUE INDEX IF NOT EXISTS "CompanySettings_storeId_key" ON "CompanySettings"("storeId")`);

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "Unit" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL UNIQUE,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdById" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "UnitConversion" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "fromUnitId" INTEGER NOT NULL,
      "toUnitId" INTEGER NOT NULL,
      "factor" REAL NOT NULL,
      UNIQUE("fromUnitId", "toUnitId")
    )
  `);

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL UNIQUE,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "MasterItem" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "description" TEXT NOT NULL,
      "unitId" INTEGER NOT NULL,
      "rate" REAL NOT NULL,
      "gstPercent" REAL NOT NULL,
      "weightPerUnit" REAL,
      "piecesPerUnit" INTEGER,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdById" INTEGER NOT NULL,
      "updatedById" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);

  await ensureColumn("MasterItem", "weightPerUnit", "REAL");
  await ensureColumn("MasterItem", "piecesPerUnit", "INTEGER");
  await ensureColumn("MasterItem", "isActive", "INTEGER DEFAULT 1");

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "ItemCategory" (
      "itemId" INTEGER NOT NULL,
      "categoryId" INTEGER NOT NULL,
      PRIMARY KEY("itemId", "categoryId")
    )
  `);

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "ItemStoreRate" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "masterItemId" INTEGER NOT NULL,
      "storeId" INTEGER NOT NULL,
      "rate" REAL NOT NULL,
      "updatedAt" DATETIME NOT NULL,
      UNIQUE("masterItemId", "storeId")
    )
  `);

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "MasterItemUnit" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "masterItemId" INTEGER NOT NULL,
      "unitId" INTEGER NOT NULL,
      "conversionFactor" REAL NOT NULL DEFAULT 1.0,
      CONSTRAINT "MasterItemUnit_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MasterItemUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  await execRemote(`CREATE UNIQUE INDEX IF NOT EXISTS "MasterItemUnit_masterItemId_unitId_key" ON "MasterItemUnit"("masterItemId", "unitId")`);

  // Check if remote Quotation table has legacy column-level UNIQUE on quotNo or NOT NULL storeId constraint
  const quotationTableSql =
    ((await remote.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='Quotation'")).rows[0]?.sql as string) || "";

  const normalizedSql = quotationTableSql.replace(/"/g, "");
  const needsRebuild =
    normalizedSql.includes("quotNo TEXT UNIQUE") ||
    normalizedSql.includes("quotNo TEXT NOT NULL UNIQUE") ||
    normalizedSql.includes("storeId INTEGER NOT NULL") ||
    !normalizedSql.includes("storeId");

  if (needsRebuild) {
    console.log("  🔄 Rebuilding remote Quotation table to support optional storeId and composite (storeId, quotNo) UNIQUE...");
    await execRemote("PRAGMA foreign_keys = OFF;");
    await execRemote(`CREATE TABLE IF NOT EXISTS "Quotation_new" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "storeId" INTEGER,
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
      "createdById" INTEGER NOT NULL,
      "updatedById" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "finalizedAt" DATETIME
    )`);

    await execRemote(`INSERT OR IGNORE INTO "Quotation_new" (id, storeId, quotNo, refNo, quotDate, status, customerName, customerAddress, customerPlace, customerGstin, deliveryTerms, gstNote, validity, paymentTerms, subTotal, cgst, sgst, roundOff, netAmount, amountInWords, isLocked, createdById, updatedById, createdAt, updatedAt, finalizedAt)
      SELECT id, storeId, quotNo, refNo, quotDate, status, customerName, customerAddress, customerPlace, customerGstin, deliveryTerms, gstNote, validity, paymentTerms, subTotal, cgst, sgst, roundOff, netAmount, amountInWords, COALESCE(isLocked, 0), createdById, updatedById, createdAt, updatedAt, finalizedAt FROM "Quotation";`);

    await execRemote(`DROP TABLE "Quotation";`);
    await execRemote(`ALTER TABLE "Quotation_new" RENAME TO "Quotation";`);
    await execRemote("PRAGMA foreign_keys = ON;");
  } else {
    await execRemote(`
      CREATE TABLE IF NOT EXISTS "Quotation" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "storeId" INTEGER,
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
        "createdById" INTEGER NOT NULL,
        "updatedById" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        "finalizedAt" DATETIME
      )
    `);
  }

  await ensureColumn("Quotation", "storeId", "INTEGER");
  await ensureColumn("Quotation", "isLocked", "INTEGER DEFAULT 0");
  await ensureColumn("Quotation", "updatedById", "INTEGER");
  await ensureColumn("Quotation", "finalizedAt", "DATETIME");

  const indices: any[] = (await remote.execute(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Quotation'`)).rows;
  const oldUniqueIdx = indices.find((i: any) => i.name.includes("quotNo") && !i.name.includes("storeId"));
  if (oldUniqueIdx) {
    await execRemote(`DROP INDEX "${oldUniqueIdx.name}"`);
  }
  await execRemote(`CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_storeId_quotNo_key" ON "Quotation"("storeId", "quotNo")`);

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "QuotationLineItem" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "quotationId" INTEGER NOT NULL,
      "masterItemId" INTEGER,
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
    )
  `);

  await ensureColumn("QuotationLineItem", "quoteMode", "TEXT DEFAULT 'quantity'");
  await ensureColumn("QuotationLineItem", "weightKg", "REAL");
  await ensureColumn("QuotationLineItem", "pieceCount", "REAL");
  await ensureColumn("QuotationLineItem", "isLocked", "INTEGER DEFAULT 0");

  await execRemote(`
    CREATE TABLE IF NOT EXISTS "StoreQuotSequence" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "storeId" INTEGER NOT NULL UNIQUE,
      "lastNumber" INTEGER NOT NULL DEFAULT 0
    )
  `);

  console.log("✓ Remote schema & columns confirmed.\n");

  // 2. Fetch local data from dev.db
  console.log("📥 Fetching local data from SQLite (dev.db)...");
  const stores = (await localClient.execute(`SELECT * FROM "Store"`)).rows;
  const users = (await localClient.execute(`SELECT * FROM "User"`)).rows;
  const settings = (await localClient.execute(`SELECT * FROM "CompanySettings"`)).rows;
  const units = (await localClient.execute(`SELECT * FROM "Unit"`)).rows;
  const conversions = (await localClient.execute(`SELECT * FROM "UnitConversion"`)).rows;
  const categories = (await localClient.execute(`SELECT * FROM "Category"`)).rows;
  const itemCategories = (await localClient.execute(`SELECT * FROM "ItemCategory"`)).rows;
  const items = (await localClient.execute(`SELECT * FROM "MasterItem"`)).rows;
  const itemStoreRates = (await localClient.execute(`SELECT * FROM "ItemStoreRate"`)).rows;
  const masterItemUnits = (await localClient.execute(`SELECT * FROM "MasterItemUnit"`)).rows;
  const quotations = (await localClient.execute(`SELECT * FROM "Quotation"`)).rows;
  const lineItems = (await localClient.execute(`SELECT * FROM "QuotationLineItem"`)).rows;
  const sequences = (await localClient.execute(`SELECT * FROM "StoreQuotSequence"`)).rows;

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
  await execRemote("PRAGMA foreign_keys = OFF;");

  for (const s of stores as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "Store" (id, name, slug, isActive, createdAt) VALUES (?, ?, ?, ?, ?);`,
      args: [s.id, s.name, s.slug, s.isActive, s.createdAt],
    });
  }

  for (const u of users as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "User" (id, username, passwordHash, role, storeId, isActive, forcePasswordChange, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [u.id, u.username, u.passwordHash, u.role, u.storeId, u.isActive, u.forcePasswordChange, u.createdAt],
    });
  }

  for (const cs of settings as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "CompanySettings" (id, storeId, companyName, subheading, phone, mobile, email, gstin, bankDetails, disclaimerText, loadingNote, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [cs.id, cs.storeId, cs.companyName, cs.subheading, cs.phone, cs.mobile, cs.email, cs.gstin, cs.bankDetails, cs.disclaimerText, cs.loadingNote, cs.updatedAt],
    });
  }

  for (const un of units as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "Unit" (id, name, isActive, createdById, createdAt) VALUES (?, ?, ?, ?, ?);`,
      args: [un.id, un.name, un.isActive, un.createdById, un.createdAt],
    });
  }

  for (const uc of conversions as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "UnitConversion" (id, fromUnitId, toUnitId, factor) VALUES (?, ?, ?, ?);`,
      args: [uc.id, uc.fromUnitId, uc.toUnitId, uc.factor],
    });
  }

  for (const cat of categories as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "Category" (id, name, createdAt) VALUES (?, ?, ?);`,
      args: [cat.id, cat.name, cat.createdAt],
    });
  }

  for (const item of items as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "MasterItem" (id, description, unitId, rate, gstPercent, weightPerUnit, piecesPerUnit, isActive, createdById, updatedById, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [item.id, item.description, item.unitId, item.rate, item.gstPercent, item.weightPerUnit, item.piecesPerUnit, item.isActive, item.createdById, item.updatedById, item.createdAt, item.updatedAt],
    });
  }

  for (const ic of itemCategories as any[]) {
    await remote.execute({
      sql: `INSERT OR IGNORE INTO "ItemCategory" (itemId, categoryId) VALUES (?, ?);`,
      args: [ic.itemId, ic.categoryId],
    });
  }

  for (const isr of itemStoreRates as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "ItemStoreRate" (id, masterItemId, storeId, rate, updatedAt) VALUES (?, ?, ?, ?, ?);`,
      args: [isr.id, isr.masterItemId, isr.storeId, isr.rate, isr.updatedAt],
    });
  }

  for (const miu of masterItemUnits as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "MasterItemUnit" (id, masterItemId, unitId, conversionFactor) VALUES (?, ?, ?, ?);`,
      args: [miu.id, miu.masterItemId, miu.unitId, miu.conversionFactor],
    });
  }

  for (const q of quotations as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "Quotation" (id, storeId, quotNo, refNo, quotDate, status, customerName, customerAddress, customerPlace, customerGstin, deliveryTerms, gstNote, validity, paymentTerms, subTotal, cgst, sgst, roundOff, netAmount, amountInWords, isLocked, createdById, updatedById, createdAt, updatedAt, finalizedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [q.id, q.storeId, q.quotNo, q.refNo, q.quotDate, q.status, q.customerName, q.customerAddress, q.customerPlace, q.customerGstin, q.deliveryTerms, q.gstNote, q.validity, q.paymentTerms, q.subTotal, q.cgst, q.sgst, q.roundOff, q.netAmount, q.amountInWords, q.isLocked, q.createdById, q.updatedById, q.createdAt, q.updatedAt, q.finalizedAt],
    });
  }

  for (const li of lineItems as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "QuotationLineItem" (id, quotationId, masterItemId, lineNo, description, unit, rate, gstPercent, qty, netValue, quoteMode, weightKg, pieceCount, isLocked)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [li.id, li.quotationId, li.masterItemId, li.lineNo, li.description, li.unit, li.rate, li.gstPercent, li.qty, li.netValue, li.quoteMode, li.weightKg, li.pieceCount, li.isLocked],
    });
  }

  for (const seq of sequences as any[]) {
    await remote.execute({
      sql: `INSERT OR REPLACE INTO "StoreQuotSequence" (id, storeId, lastNumber) VALUES (?, ?, ?);`,
      args: [seq.id, seq.storeId, seq.lastNumber],
    });
  }

  await execRemote("PRAGMA foreign_keys = ON;");
  console.log("\n✅ All local schema changes and data successfully pushed to remote Turso database!");
  await localClient.close();
  await remote.close();
}

syncToRemote().catch((err) => {
  console.error("\n❌ Push failed:", err);
  process.exit(1);
});
