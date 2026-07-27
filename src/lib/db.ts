import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

// Prisma DB client initialization
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

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
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

