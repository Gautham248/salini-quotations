/**
 * apply-remote-migration.ts
 * Applies the Category/ItemCategory migration to a remote Turso/libsql database.
 * Run with: DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... pnpm tsx prisma/apply-remote-migration.ts
 */
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !url.startsWith("libsql://")) {
  console.error("❌ Set DATABASE_URL=libsql://your-db.turso.io and TURSO_AUTH_TOKEN=your-token");
  process.exit(1);
}

const client = createClient({ url: url!, authToken });

async function run() {
  console.log(`🔗 Connecting to remote: ${url}\n`);

  // ── 1. Category table ─────────────────────────────────────────────────────
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

  // ── 2. ItemCategory join table ────────────────────────────────────────────
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

  // ── 3. Migrate existing category strings ─────────────────────────────────
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
      if (!r.category?.trim()) continue;
      const catName = r.category.trim();
      if (!categoryMap.has(catName)) {
        await client.execute({ sql: `INSERT OR IGNORE INTO "Category" ("name") VALUES (?)`, args: [catName] });
        const catRow = await client.execute({ sql: `SELECT id FROM "Category" WHERE name = ?`, args: [catName] });
        const catId = (catRow.rows[0] as unknown as { id: number }).id;
        categoryMap.set(catName, catId);
        console.log(`  ✓ Created category: "${catName}" (id=${catId})`);
      }
      await client.execute({
        sql: `INSERT OR IGNORE INTO "ItemCategory" ("itemId", "categoryId") VALUES (?, ?)`,
        args: [r.id, categoryMap.get(catName)!],
      });
    }

    // ── 4. Rebuild MasterItem without category column ─────────────────────
    console.log("\n🔧 Rebuilding MasterItem to drop legacy category column...");
    // Turso supports multi-statement execution
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
    console.log("ℹ  category column already removed or never existed — skipping rebuild");
  }

  // ── 5. Add isLocked column to Quotation table ─────────────────────────────
  const quotationInfo = await client.execute(`PRAGMA table_info("Quotation")`);
  const hasIsLockedCol = quotationInfo.rows.some(
    (r) => (r as unknown as { name: string }).name === "isLocked"
  );

  if (!hasIsLockedCol) {
    console.log("\n🔧 Adding isLocked column to Quotation table...");
    await client.execute(`ALTER TABLE "Quotation" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT 0`);
    console.log("✓ isLocked column added to Quotation table");
  } else {
    console.log("ℹ  isLocked column already exists on Quotation table");
  }

  console.log("\n✅ Remote migration complete!");
  await client.close();
}

run().catch((e) => {
  console.error("\n❌ Remote migration failed:", e);
  process.exit(1);
});
