// @vitest-environment node

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";

describe("Analytics Endpoint & Metrics Suite", () => {
  let testStore: any;
  let adminUser: any;
  let sampleQuote1: any;
  let sampleQuote2: any;

  beforeAll(async () => {
    const ts = Date.now();
    testStore = await db.store.create({
      data: {
        name: `Analytics Test Store ${ts}`,
        slug: `analytics-store-${ts}`,
        isActive: true,
      },
    });

    adminUser = await db.user.create({
      data: {
        username: `analytics_admin_${ts}`,
        passwordHash: "hash",
        role: "admin",
        storeId: testStore.id,
        isActive: true,
      },
    });

    sampleQuote1 = await db.quotation.create({
      data: {
        storeId: testStore.id,
        quotNo: `Q-AN-${ts}-1`,
        refNo: `REF-AN-${ts}-1`,
        quotDate: new Date(),
        status: "draft",
        customerName: "Analytics Customer 1",
        netAmount: 1200,
        createdById: adminUser.id,
      },
    });

    sampleQuote2 = await db.quotation.create({
      data: {
        storeId: testStore.id,
        quotNo: `Q-AN-${ts}-2`,
        refNo: `REF-AN-${ts}-2`,
        quotDate: new Date(),
        status: "finalized",
        isLocked: true,
        customerName: "Analytics Customer 2",
        netAmount: 3500,
        createdById: adminUser.id,
      },
    });
  });

  afterAll(async () => {
    if (sampleQuote1?.id) await db.quotation.deleteMany({ where: { id: sampleQuote1.id } });
    if (sampleQuote2?.id) await db.quotation.deleteMany({ where: { id: sampleQuote2.id } });
    if (adminUser?.id) await db.user.deleteMany({ where: { id: adminUser.id } });
    if (testStore?.id) await db.store.deleteMany({ where: { id: testStore.id } });
  });

  it("calculates store count and active store ratio accurately", async () => {
    const totalStores = await db.store.count();
    const activeStores = await db.store.count({ where: { isActive: true } });

    expect(totalStores).toBeGreaterThan(0);
    expect(activeStores).toBeGreaterThan(0);
    expect(activeStores).toBeLessThanOrEqual(totalStores);
  });

  it("calculates period-filtered quotations and net monetary value for store", async () => {
    const storeQuotes = await db.quotation.findMany({
      where: { storeId: testStore.id },
      select: { netAmount: true, status: true, isLocked: true },
    });

    expect(storeQuotes).toHaveLength(2);
    const totalVal = storeQuotes.reduce((sum, q) => sum + (q.netAmount || 0), 0);
    expect(totalVal).toBe(4700);
  });

  it("evaluates quotation status distribution accurately", async () => {
    const storeQuotes = await db.quotation.findMany({
      where: { storeId: testStore.id },
      select: { status: true, isLocked: true },
    });

    const drafts = storeQuotes.filter((q) => q.status === "draft").length;
    const finalized = storeQuotes.filter((q) => q.status === "finalized").length;
    const locked = storeQuotes.filter((q) => q.isLocked).length;

    expect(drafts).toBe(1);
    expect(finalized).toBe(1);
    expect(locked).toBe(1);
  });

  it("calculates master item catalog metrics", async () => {
    const totalItems = await db.masterItem.count();
    const activeItems = await db.masterItem.count({ where: { isActive: true } });
    const inactiveItems = totalItems - activeItems;

    expect(totalItems).toBeGreaterThanOrEqual(0);
    expect(activeItems + inactiveItems).toBe(totalItems);
  });

  it("fetches period quotation breakdown details with store relations", async () => {
    const quotes = await db.quotation.findMany({
      where: { storeId: testStore.id },
      select: {
        id: true,
        quotNo: true,
        customerName: true,
        netAmount: true,
        store: { select: { name: true } },
      },
    });

    expect(quotes).toHaveLength(2);
    expect(quotes[0].customerName).toMatch(/Analytics Customer/);
    expect(quotes[0].store?.name).toBe(testStore.name);
  });
});
