/**
 * backup-data.ts
 * Backs up users, units, unit conversions, master items (with old category strings),
 * and company settings to JSON before the schema migration.
 */
import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const url = process.env.DATABASE_URL || "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

async function backup() {
  const data: Record<string, unknown> = {};

  const tables = [
    "User",
    "Unit",
    "UnitConversion",
    "MasterItem",
    "CompanySettings",
    "Quotation",
    "QuotationLineItem",
    "QuotSequence",
  ];

  for (const table of tables) {
    try {
      const result = await client.execute(`SELECT * FROM "${table}"`);
      data[table] = result.rows;
      console.log(`✓ Backed up ${result.rows.length} rows from ${table}`);
    } catch (e) {
      console.warn(`⚠ Could not back up ${table}:`, (e as Error).message);
      data[table] = [];
    }
  }

  const outPath = path.resolve("./backup.json");
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`\n✅ Backup saved to ${outPath}`);
  await client.close();
}

backup().catch((e) => {
  console.error("Backup failed:", e);
  process.exit(1);
});
