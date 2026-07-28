/**
 * apply-migration.ts
 * Multi-tenant conversion — schema + data migration.
 *
 * Steps:
 * 1. Create Store table
 * 2. Add storeId columns to User, CompanySettings, Quotation
 * 3. Create ItemStoreRate + StoreQuotSequence tables
 * 4. Fix Quotation quotNo index (per-store unique, drop global unique)
 * 5. Drop deprecated QuotSequence table
 * 6. Data backfill: create default store, assign all existing data
 * 7. Promote one user to superadmin
 */
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL || "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient(authToken ? { url, authToken } : { url });

async function run() {
  console.log(`🔗 Connecting to: ${url}\n`);

  // ── 1. Create Store table ──────────────────────────────────────────────────
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Store" (
      "id"        INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name"      TEXT     NOT NULL,
      "slug"      TEXT     NOT NULL,
      "isActive"  BOOLEAN  NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "Store_slug_key" ON "Store"("slug")`);
  console.log("✓ Store table ready");

  // ── 2. Add storeId columns ────────────────────────────────────────────────
  const userInfo = (await client.execute(`PRAGMA table_info("User")`)).rows;
  if (!userInfo.some((r: any) => r.name === "storeId")) {
    await client.execute(`ALTER TABLE "User" ADD COLUMN "storeId" INTEGER REFERENCES "Store"("id")`);
    console.log("✓ Added storeId to User");
  }

  const csInfo = (await client.execute(`PRAGMA table_info("CompanySettings")`)).rows;
  if (!csInfo.some((r: any) => r.name === "storeId")) {
    await client.execute(`ALTER TABLE "CompanySettings" ADD COLUMN "storeId" INTEGER REFERENCES "Store"("id")`);
    console.log("✓ Added storeId to CompanySettings");
  }

  const quotInfo = (await client.execute(`PRAGMA table_info("Quotation")`)).rows;
  if (!quotInfo.some((r: any) => r.name === "storeId")) {
    await client.execute(`ALTER TABLE "Quotation" ADD COLUMN "storeId" INTEGER REFERENCES "Store"("id")`);
    console.log("✓ Added storeId to Quotation");
  }

  // ── 3. Create ItemStoreRate + StoreQuotSequence ────────────────────────────
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ItemStoreRate" (
      "id"           INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
      "masterItemId" INTEGER  NOT NULL,
      "storeId"      INTEGER  NOT NULL,
      "rate"         REAL     NOT NULL,
      "updatedAt"    DATETIME NOT NULL,
      FOREIGN KEY ("masterItemId") REFERENCES "MasterItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("storeId")      REFERENCES "Store"("id")      ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "ItemStoreRate_masterItemId_storeId_key" ON "ItemStoreRate"("masterItemId", "storeId")`);
  console.log("✓ ItemStoreRate table ready");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "StoreQuotSequence" (
      "id"      INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "storeId" INTEGER NOT NULL,
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "StoreQuotSequence_storeId_key" ON "StoreQuotSequence"("storeId")`);

  const sqsInfo = (await client.execute(`PRAGMA table_info("StoreQuotSequence")`)).rows;
  if (!sqsInfo.some((r: any) => r.name === "lastNumber")) {
    await client.execute(`ALTER TABLE "StoreQuotSequence" ADD COLUMN "lastNumber" INTEGER NOT NULL DEFAULT 0`);
    console.log("✓ Added lastNumber to StoreQuotSequence");
  }
  console.log("✓ StoreQuotSequence table ready");

  // ── 4. Fix Quotation quotNo index ─────────────────────────────────────────
  const indices: any[] = (await client.execute(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Quotation'`)).rows;
  const oldUniqueIdx = indices.find((i: any) => i.name.includes("quotNo") && !i.name.includes("storeId"));
  if (oldUniqueIdx) {
    await client.execute(`DROP INDEX "${oldUniqueIdx.name}"`);
    console.log(`✓ Dropped old global quotNo index: ${oldUniqueIdx.name}`);
  }
  try {
    await client.execute(`CREATE UNIQUE INDEX "Quotation_storeId_quotNo_key" ON "Quotation"("storeId", "quotNo")`);
    console.log("✓ Created per-store quotNo unique index");
  } catch (e: any) {
    if (!e.message?.includes("already exists")) throw e;
  }

  // ── 5. Drop deprecated QuotSequence ───────────────────────────────────────
  await client.execute(`DROP TABLE IF EXISTS "QuotSequence"`);
  console.log("✓ Dropped deprecated QuotSequence table");

  // ── 6. Data backfill ──────────────────────────────────────────────────────
  // 6a. Check for duplicate quotNo values before migration
  const dupes = (await client.execute(
    `SELECT "quotNo", COUNT(*) as cnt FROM "Quotation" GROUP BY "quotNo" HAVING cnt > 1`
  )).rows;
  if (dupes.length > 0) {
    console.warn(`\n⚠️  Found ${dupes.length} duplicate quotNo values:`);
    for (const d of dupes as any[]) {
      console.warn(`   quotNo="${d.quotNo}" appears ${d.cnt} times`);
    }
    console.warn("   Reconciliation: keeping lowest-id row, appending suffixes to duplicates\n");
    for (const d of dupes as any[]) {
      const rows: any[] = (await client.execute({
        sql: `SELECT id, quotNo FROM "Quotation" WHERE quotNo = ? ORDER BY id ASC`,
        args: [d.quotNo],
      })).rows;
      for (let i = 1; i < rows.length; i++) {
        const suffix = String.fromCharCode(96 + i);
        await client.execute({
          sql: `UPDATE "Quotation" SET quotNo = ? WHERE id = ?`,
          args: [`${rows[i].quotNo}-${suffix}`, rows[i].id],
        });
        console.log(`   ✓ Reassigned quotNo="${rows[i].quotNo}-${suffix}" for row id=${rows[i].id}`);
      }
    }
  } else {
    console.log("\n✓ No duplicate quotNo values found");
  }

  // 6b. Read live CompanySettings for the existing business
  const csRow = (await client.execute(`SELECT * FROM "CompanySettings" LIMIT 1`)).rows[0] as any;
  const companyName = csRow?.companyName || "SALINI TRADERS";

  // 6c. Create the default store row (id=1)
  const existingStore = (await client.execute(`SELECT id FROM "Store" WHERE id = 1`)).rows;
  if (existingStore.length === 0) {
    await client.execute({
      sql: `INSERT INTO "Store" ("id", "name", "slug", "isActive") VALUES (1, ?, 'salini-pala', 1)`,
      args: [companyName],
    });
    console.log(`✓ Created default Store: "${companyName}" (slug=salini-pala)`);
  } else {
    console.log(`✓ Default store already exists (id=1)`);
  }

  // 6d. Backfill storeId on existing data
  await client.execute(`UPDATE "CompanySettings" SET "storeId" = 1 WHERE "storeId" IS NULL`);
  console.log("✓ Backfilled CompanySettings.storeId");
  await client.execute(`UPDATE "User" SET "storeId" = 1 WHERE "storeId" IS NULL`);
  console.log("✓ Backfilled User.storeId");
  await client.execute(`UPDATE "Quotation" SET "storeId" = 1 WHERE "storeId" IS NULL`);
  console.log("✓ Backfilled Quotation.storeId");

  // 6e. Create StoreQuotSequence row for the default store
  await client.execute(`INSERT OR IGNORE INTO "StoreQuotSequence" ("storeId") VALUES (1)`);
  console.log("✓ Created StoreQuotSequence row for store 1");

  // 6f. Promote one user to superadmin
  const adminUser = (await client.execute(
    `SELECT id, username FROM "User" WHERE role = 'admin' AND storeId = 1 LIMIT 1`
  )).rows[0] as any;
  if (adminUser) {
    await client.execute({
      sql: `UPDATE "User" SET role = 'superadmin', "storeId" = NULL WHERE id = ?`,
      args: [adminUser.id],
    });
    console.log(`✓ Promoted user "${adminUser.username}" (id=${adminUser.id}) to superadmin`);
  } else {
    console.warn("⚠  No admin user found to promote to superadmin");
  }

  // ── 7. Update _prisma_migrations table ────────────────────────────────────
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                  TEXT     NOT NULL PRIMARY KEY,
      "checksum"            TEXT     NOT NULL,
      "finished_at"         DATETIME,
      "migration_name"      TEXT     NOT NULL,
      "logs"                TEXT,
      "rolled_back_at"      DATETIME,
      "started_at"          DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER  NOT NULL DEFAULT 0
    )
  `);

  console.log("\n✅ Multi-tenant migration complete!");
  await client.close();
}

run().catch((e) => {
  console.error("\n❌ Migration failed:", e);
  process.exit(1);
});
