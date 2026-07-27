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

  // Self-healing schema migration check for missing columns on production/remote database
  if (!globalForPrisma._schemaEnsured) {
    globalForPrisma._schemaEnsured = true;
    Promise.resolve().then(async () => {
      try {
        // 1. Quotation table check
        const qCols: any[] = await client.$queryRawUnsafe(`PRAGMA table_info("Quotation")`);
        if (Array.isArray(qCols) && !qCols.some((c: any) => c.name === "isLocked")) {
          await client.$executeRawUnsafe(
            `ALTER TABLE "Quotation" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT 0`
          );
          console.log("✓ Self-healing schema: Added isLocked column to Quotation table");
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
      } catch (e) {
        console.error("Schema initialization warning:", e);
      }
    });
  }

  return client;
}

export const db = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

