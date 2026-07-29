// @vitest-environment node

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Use a direct client (bypasses db.ts singleton) so we can set up/teardown freely
const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" }),
});

const imports: typeof import("@/lib/quot-no") = {} as any;
let nextQuotNo: typeof imports.nextQuotNo;

beforeAll(async () => {
  const mod = await import("@/lib/quot-no");
  nextQuotNo = mod.nextQuotNo;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("nextQuotNo", () => {
  let testStoreId: number;

  beforeAll(async () => {
    // Create a test store with unique slug
    const ts = Date.now();
    const store = await prisma.store.create({
      data: { name: `Test Store ${ts}`, slug: `test-quot-no-${ts}` },
    });
    testStoreId = store.id;

    // Create StoreQuotSequence for the test store
    await prisma.storeQuotSequence.create({
      data: { storeId: testStoreId },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testStoreId) {
      await prisma.quotationLineItem.deleteMany({
        where: { quotation: { storeId: testStoreId } },
      });
      await prisma.quotation.deleteMany({ where: { storeId: testStoreId } });
      await prisma.storeQuotSequence.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.store.delete({ where: { id: testStoreId } });
    }
  });

  it("produces unique sequential quotNo values under concurrent calls", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => nextQuotNo(testStoreId)),
    );

    const unique = new Set(results);
    expect(unique.size).toBe(results.length);

    // All should be stringified positive integers
    for (const r of results) {
      expect(r).toMatch(/^\d+$/);
    }
  });

  it("independent stores do not block each other", async () => {
    // Create a second test store
    const ts = Date.now();
    const store2 = await prisma.store.create({
      data: { name: `Test Store 2 ${ts}`, slug: `test-quot-no-2-${ts}` },
    });
    await prisma.storeQuotSequence.create({
      data: { storeId: store2.id },
    });

    try {
      const [results1, results2] = await Promise.all([
        Promise.all(
          Array.from({ length: 5 }, () => nextQuotNo(testStoreId)),
        ),
        Promise.all(
          Array.from({ length: 5 }, () => nextQuotNo(store2.id)),
        ),
      ]);

      // Both stores got all unique values
      expect(new Set(results1).size).toBe(5);
      expect(new Set(results2).size).toBe(5);

      // Store 2 should start from 1 (fresh counter)
      expect(results2[0]).toBe("1");
    } finally {
      // Clean up store 2
      await prisma.storeQuotSequence.deleteMany({
        where: { storeId: store2.id },
      });
      await prisma.store.delete({ where: { id: store2.id } });
    }
  });

  it("skips over existing quotNo collisions (manually-inserted values)", async () => {
    // Create a fresh store for isolated collision test
    const ts = Date.now();
    const store3 = await prisma.store.create({
      data: { name: `Test Store 3 ${ts}`, slug: `test-quot-collision-${ts}` },
    });
    await prisma.storeQuotSequence.create({
      data: { storeId: store3.id },
    });

    try {
      // Insert a quotation that claims quotNo="1" manually
      // (before the counter has been incremented, so its collision check hits)
      await prisma.quotation.create({
        data: {
          storeId: store3.id,
          quotNo: "1",
          refNo: "override",
          quotDate: new Date(),
          status: "draft",
          customerName: "Test",
          createdById: 1,
        },
      });

      // Now nextQuotNo should increment to 1 (atomically), see "1" is
      // taken, and bump to "2"
      const qn = await nextQuotNo(store3.id);
      expect(qn).toBe("2");
    } finally {
      await prisma.quotationLineItem.deleteMany({
        where: { quotation: { storeId: store3.id } },
      });
      await prisma.quotation.deleteMany({ where: { storeId: store3.id } });
      await prisma.storeQuotSequence.deleteMany({
        where: { storeId: store3.id },
      });
      await prisma.store.delete({ where: { id: store3.id } });
    }
  });
});
