/**
 * pull-data-remote.ts
 * Syncs all records from the remote Turso database into the local dev.db database.
 * 
 * Run with:
 * netlify dev:exec --context production npx tsx prisma/pull-data-remote.ts
 */
import { createClient } from "@libsql/client";
import path from "path";

const remoteUrl = process.env.DATABASE_URL;
const remoteAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!remoteUrl || !remoteUrl.startsWith("libsql://")) {
  console.error("\n❌ REMOTE_DATABASE_URL or DATABASE_URL must start with 'libsql://' to pull remote data.");
  console.error("Please run via: netlify dev:exec --context production npx tsx prisma/pull-data-remote.ts\n");
  process.exit(1);
}

if (!remoteAuthToken) {
  console.error("\n❌ TURSO_AUTH_TOKEN is required. Please ensure you are logged in to Netlify or pass it explicitly.");
  process.exit(1);
}

// Convert libsql:// to https:// for HTTP client compatibility if needed
const httpUrl = remoteUrl.replace(/^libsql:\/\//, "https://");
const localDbPath = path.join(process.cwd(), "dev.db");

console.log(`🔗 Connecting to remote Turso database: ${remoteUrl}`);
console.log(`🏠 Local SQLite database path: ${localDbPath}\n`);

const remote = createClient({ url: httpUrl, authToken: remoteAuthToken });
const local = createClient({ url: `file:${localDbPath}` });

const tables = [
  "QuotationLineItem",
  "Quotation",
  "ItemStoreRate",
  "MasterItemUnit",
  "ItemCategory",
  "MasterItem",
  "Category",
  "UnitConversion",
  "Unit",
  "CompanySettings",
  "User",
  "StoreQuotSequence",
  "Store"
];

async function pullRemote() {
  // 1. Fetch remote data first
  console.log("📥 Fetching remote data...");
  const data: Record<string, any[]> = {};
  for (const table of tables) {
    try {
      const result = await remote.execute(`SELECT * FROM "${table}"`);
      data[table] = result.rows;
      console.log(`  - ${table}: fetched ${result.rows.length} rows`);
    } catch (e: any) {
      console.warn(`  ⚠️ Could not fetch remote table "${table}":`, e.message);
      data[table] = [];
    }
  }

  console.log("\n🧹 Cleaning local database tables...");
  await local.execute("PRAGMA foreign_keys = OFF;");
  for (const table of tables) {
    await local.execute(`DELETE FROM "${table}"`);
  }

  console.log("🚀 Inserting records into local dev.db database...");
  
  // Insert in reverse order (independent tables first)
  const insertOrder = [...tables].reverse();

  for (const table of insertOrder) {
    const rows = data[table];
    if (!rows || rows.length === 0) continue;

    console.log(`  Writing ${rows.length} rows to "${table}"...`);

    // Get column names from the first row keys
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders});`;

    for (const row of rows) {
      const values = columns.map(c => row[c]);
      await local.execute({ sql, args: values });
    }
  }

  await local.execute("PRAGMA foreign_keys = ON;");
  console.log("\n✅ Local database successfully synchronized with remote Turso database data!");
  
  await remote.close();
  await local.close();
}

pullRemote().catch((err) => {
  console.error("\n❌ Pull failed:", err);
  process.exit(1);
});
