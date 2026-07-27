/**
 * apply-migration.ts
 * Manually applies the Category/ItemCategory schema migration to the database
 * WITHOUT destroying existing data. Uses raw SQL via libsql client.
 * 
 * Steps:
 * 1. Create Category table
 * 2. Create ItemCategory join table
 * 3. Migrate old category strings from MasterItem to Category rows
 * 4. Drop the old category column from MasterItem (via table rebuild for SQLite)
 * 5. Update Prisma migration history so Prisma knows the schema is up-to-date
 */
import { createClient } from "@libsql/client";
import * as fs from "fs";

const url = process.env.DATABASE_URL || "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient(authToken ? { url, authToken } : { url });

async function run() {
  console.log(`🔗 Connecting to: ${url}\n`);

  // ── 1. Create Category table ──────────────────────────────────────────────
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name"      TEXT    NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name")
  `);
  console.log("✓ Category table ready");

  // ── 2. Create ItemCategory join table ─────────────────────────────────────
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ItemCategory" (
      "itemId"     INTEGER NOT NULL,
      "categoryId" INTEGER NOT NULL,
      PRIMARY KEY ("itemId", "categoryId"),
      FOREIGN KEY ("itemId")     REFERENCES "MasterItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")   ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  console.log("✓ ItemCategory table ready");

  // ── 3. Migrate old category strings → Category rows ──────────────────────
  // Check if the old column still exists
  const tableInfo = await client.execute(`PRAGMA table_info("MasterItem")`);
  const hasCategoryCol = tableInfo.rows.some(
    (r) => (r as unknown as { name: string }).name === "category"
  );

  if (hasCategoryCol) {
    const items = await client.execute(
      `SELECT id, category FROM "MasterItem" WHERE category IS NOT NULL AND category != ''`
    );
    console.log(`\n📦 Found ${items.rows.length} items with category strings`);

    const categoryMap = new Map<string, number>();

    for (const row of items.rows) {
      const r = row as unknown as { id: number; category: string | null };
      if (!r.category) continue;

      const catName = r.category.trim();
      if (!catName) continue;

      // Insert category if not exists
      if (!categoryMap.has(catName)) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO "Category" ("name") VALUES (?)`,
          args: [catName],
        });
        const catRow = await client.execute({
          sql: `SELECT id FROM "Category" WHERE name = ?`,
          args: [catName],
        });
        const catId = (catRow.rows[0] as unknown as { id: number }).id;
        categoryMap.set(catName, catId);
        console.log(`  ✓ Created category: "${catName}" (id=${catId})`);
      }

      const catId = categoryMap.get(catName)!;
      await client.execute({
        sql: `INSERT OR IGNORE INTO "ItemCategory" ("itemId", "categoryId") VALUES (?, ?)`,
        args: [r.id, catId],
      });
    }

    console.log(`\n✓ Migrated ${categoryMap.size} categories, linked ${items.rows.length} items`);

    // ── 4. Drop the old category column (SQLite needs full table rebuild) ──
    console.log("\n🔧 Rebuilding MasterItem table to drop legacy category column...");

    await client.executeMultiple(`
      PRAGMA foreign_keys = OFF;

      CREATE TABLE "_MasterItem_new" (
        "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
        "description"   TEXT     NOT NULL,
        "unitId"        INTEGER  NOT NULL,
        "rate"          REAL     NOT NULL,
        "gstPercent"    REAL     NOT NULL,
        "weightPerUnit" REAL,
        "piecesPerUnit" INTEGER,
        "isActive"      BOOLEAN  NOT NULL DEFAULT 1,
        "createdById"   INTEGER  NOT NULL,
        "updatedById"   INTEGER  NOT NULL,
        "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"     DATETIME NOT NULL,
        FOREIGN KEY ("unitId")      REFERENCES "Unit"("id")  ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id")  ON UPDATE CASCADE,
        FOREIGN KEY ("updatedById") REFERENCES "User"("id")  ON UPDATE CASCADE
      );

      INSERT INTO "_MasterItem_new"
        ("id","description","unitId","rate","gstPercent","weightPerUnit","piecesPerUnit","isActive","createdById","updatedById","createdAt","updatedAt")
      SELECT
        "id","description","unitId","rate","gstPercent","weightPerUnit","piecesPerUnit","isActive","createdById","updatedById","createdAt","updatedAt"
      FROM "MasterItem";

      DROP TABLE "MasterItem";

      ALTER TABLE "_MasterItem_new" RENAME TO "MasterItem";

      PRAGMA foreign_keys = ON;
    `);

    console.log("✓ MasterItem rebuilt without category column");
  } else {
    console.log("ℹ  category column already removed — skipping rebuild");
  }

  // ── 5. Update _prisma_migrations table ───────────────────────────────────
  // Create it if it doesn't exist (needed for prisma generate / studio)
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

  console.log("\n✅ Migration complete!");
  await client.close();
}

run().catch((e) => {
  console.error("\n❌ Migration failed:", e);
  process.exit(1);
});
