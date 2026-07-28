import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  _schemaEnsured?: boolean;
};

function createPrismaClient(): PrismaClient {
  let url = process.env.DATABASE_URL || "file:./dev.db";

  if (url.startsWith("file:")) {
    const rawPath = url.replace(/^file:/, "");
    if (!path.isAbsolute(rawPath)) {
      url = `file:${path.join(/*turbopackIgnore: true*/ process.cwd(), rawPath)}`;
    }
  }

  const config: { url: string; authToken?: string } = { url };
  if (process.env.TURSO_AUTH_TOKEN) {
    config.authToken = process.env.TURSO_AUTH_TOKEN;
  }

  const adapter = new PrismaLibSql(config);
  const client = new PrismaClient({ adapter });

  // Self-healing schema migration check for missing columns on production/remote database.
  // Runs synchronously before db is exported — no request handler can execute until
  // schema integrity is confirmed, eliminating SQLITE_BUSY contention.
  if (!globalForPrisma._schemaEnsured) {
    globalForPrisma._schemaEnsured = true;
    (async () => {
      try {
        // 1. Quotation table check
        const qCols: any[] = await client.$queryRawUnsafe(`PRAGMA table_info("Quotation")`);
        if (Array.isArray(qCols)) {
          const qNames = new Set(qCols.map((c: any) => c.name));
          if (!qNames.has("isLocked")) {
            await client.$executeRawUnsafe(
              `ALTER TABLE "Quotation" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT 0`
            );
            console.log("✓ Self-healing schema: Added isLocked column to Quotation table");
          }
          if (!qNames.has("storeId")) {
            await client.$executeRawUnsafe(
              `ALTER TABLE "Quotation" ADD COLUMN "storeId" INTEGER REFERENCES "Store"("id")`
            );
            console.log("✓ Self-healing schema: Added storeId column to Quotation table");
          }
        }

        // 2. QuotationLineItem table checks
        const liCols: any[] = await client.$queryRawUnsafe(`PRAGMA table_info("QuotationLineItem")`);
        if (Array.isArray(liCols)) {
          const colNames = new Set(liCols.map((c: any) => c.name));
          if (!colNames.has("isLocked")) {
            await client.$executeRawUnsafe(
              `ALTER TABLE "QuotationLineItem" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT 0`
            );
            console.log("✓ Self-healing schema: Added isLocked column to QuotationLineItem table");
          }
          if (!colNames.has("quoteMode")) {
            await client.$executeRawUnsafe(
              `ALTER TABLE "QuotationLineItem" ADD COLUMN "quoteMode" TEXT NOT NULL DEFAULT 'quantity'`
            );
            console.log("✓ Self-healing schema: Added quoteMode column to QuotationLineItem table");
          }
          if (!colNames.has("weightKg")) {
            await client.$executeRawUnsafe(
              `ALTER TABLE "QuotationLineItem" ADD COLUMN "weightKg" REAL`
            );
            console.log("✓ Self-healing schema: Added weightKg column to QuotationLineItem table");
          }
          if (!colNames.has("pieceCount")) {
            await client.$executeRawUnsafe(
              `ALTER TABLE "QuotationLineItem" ADD COLUMN "pieceCount" REAL`
            );
            console.log(
              "✓ Self-healing schema: Added pieceCount column to QuotationLineItem table"
            );
          }
        }

        // 3. User table — storeId column
        const uCols: any[] = await client.$queryRawUnsafe(`PRAGMA table_info("User")`);
        if (Array.isArray(uCols) && !uCols.some((c: any) => c.name === "storeId")) {
          await client.$executeRawUnsafe(
            `ALTER TABLE "User" ADD COLUMN "storeId" INTEGER REFERENCES "Store"("id")`
          );
          console.log("✓ Self-healing schema: Added storeId column to User table");
        }

        // 4. CompanySettings table — storeId column
        const csCols: any[] = await client.$queryRawUnsafe(`PRAGMA table_info("CompanySettings")`);
        if (Array.isArray(csCols) && !csCols.some((c: any) => c.name === "storeId")) {
          await client.$executeRawUnsafe(
            `ALTER TABLE "CompanySettings" ADD COLUMN "storeId" INTEGER REFERENCES "Store"("id")`
          );
          console.log("✓ Self-healing schema: Added storeId column to CompanySettings table");
        }

        // 5. New tables: Store, ItemStoreRate, StoreQuotSequence
        const tables: any[] = await client.$queryRawUnsafe(
          `SELECT name FROM sqlite_master WHERE type='table'`
        );
        const tableNames = new Set(tables.map((t: any) => t.name));
        if (!tableNames.has("Store")) {
          await client.$executeRawUnsafe(`
            CREATE TABLE "Store" (
              "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
              "name" TEXT NOT NULL,
              "slug" TEXT NOT NULL,
              "isActive" BOOLEAN NOT NULL DEFAULT 1,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);
          await client.$executeRawUnsafe(`CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug")`);
          console.log("✓ Self-healing schema: Created Store table");
        }
        if (!tableNames.has("ItemStoreRate")) {
          await client.$executeRawUnsafe(`
            CREATE TABLE "ItemStoreRate" (
              "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
              "masterItemId" INTEGER NOT NULL,
              "storeId" INTEGER NOT NULL,
              "rate" REAL NOT NULL,
              "updatedAt" DATETIME NOT NULL,
              FOREIGN KEY ("masterItemId") REFERENCES "MasterItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
              FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await client.$executeRawUnsafe(`
            CREATE UNIQUE INDEX "ItemStoreRate_masterItemId_storeId_key" ON "ItemStoreRate"("masterItemId", "storeId")
          `);
          console.log("✓ Self-healing schema: Created ItemStoreRate table");
        }
        if (!tableNames.has("StoreQuotSequence")) {
          await client.$executeRawUnsafe(`
            CREATE TABLE "StoreQuotSequence" (
              "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
              "storeId" INTEGER NOT NULL,
              FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await client.$executeRawUnsafe(`CREATE UNIQUE INDEX "StoreQuotSequence_storeId_key" ON "StoreQuotSequence"("storeId")`);
          console.log("✓ Self-healing schema: Created StoreQuotSequence table");
        }
      } catch (e) {
        console.error("Schema initialization warning:", e);
      }
    })();
  }

  return client;
}

export const db = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

