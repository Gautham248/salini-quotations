import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { nextQuotNo } from "@/lib/quot-no";

describe("Database Migration & Schema Integrity Suite", () => {
  it("verifies multi-tenant composite unique index on Quotation (storeId + quotNo)", async () => {
    // Create two test stores
    const store1 = await db.store.create({
      data: { name: "Verification Store A", slug: `test-ver-a-${Date.now()}` },
    });
    const store2 = await db.store.create({
      data: { name: "Verification Store B", slug: `test-ver-b-${Date.now()}` },
    });

    const user1 = await db.user.create({
      data: {
        username: `ver_user1_${Date.now()}`,
        passwordHash: "hash",
        role: "admin",
        storeId: store1.id,
      },
    });
    const user2 = await db.user.create({
      data: {
        username: `ver_user2_${Date.now()}`,
        passwordHash: "hash",
        role: "admin",
        storeId: store2.id,
      },
    });

    // Create quotation with quotNo "Q-VER-001" in Store 1
    const q1 = await db.quotation.create({
      data: {
        storeId: store1.id,
        quotNo: "Q-VER-001",
        refNo: "REF-001",
        quotDate: new Date(),
        status: "draft",
        customerName: "Test Customer A",
        createdById: user1.id,
      },
    });

    // Create quotation with identical quotNo "Q-VER-001" in Store 2 — MUST SUCCEED due to composite index
    const q2 = await db.quotation.create({
      data: {
        storeId: store2.id,
        quotNo: "Q-VER-001",
        refNo: "REF-001",
        quotDate: new Date(),
        status: "draft",
        customerName: "Test Customer B",
        createdById: user2.id,
      },
    });

    expect(q1.quotNo).toBe("Q-VER-001");
    expect(q2.quotNo).toBe("Q-VER-001");
    expect(q1.storeId).not.toBe(q2.storeId);

    // Attempt to create duplicate quotNo "Q-VER-001" within SAME Store 1 — MUST FAIL
    await expect(
      db.quotation.create({
        data: {
          storeId: store1.id,
          quotNo: "Q-VER-001",
          refNo: "REF-002",
          quotDate: new Date(),
          status: "draft",
          customerName: "Duplicate Customer",
          createdById: user1.id,
        },
      })
    ).rejects.toThrow();

    // Clean up test data
    await db.quotation.deleteMany({ where: { id: { in: [q1.id, q2.id] } } });
    await db.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
    await db.store.deleteMany({ where: { id: { in: [store1.id, store2.id] } } });
  });

  it("verifies store-isolated quotation sequences (StoreQuotSequence)", async () => {
    const storeA = await db.store.create({
      data: {
        name: "Seq Store A",
        slug: `seq-a-${Date.now()}`,
        quotSequence: { create: { lastNumber: 0 } },
      },
    });
    const storeB = await db.store.create({
      data: {
        name: "Seq Store B",
        slug: `seq-b-${Date.now()}`,
        quotSequence: { create: { lastNumber: 0 } },
      },
    });

    const qNoA1 = await nextQuotNo(storeA.id);
    const qNoA2 = await nextQuotNo(storeA.id);

    const qNoB1 = await nextQuotNo(storeB.id);

    expect(qNoA1).toBe("1");
    expect(qNoA2).toBe("2");
    expect(qNoB1).toBe("1");

    // Clean up
    await db.storeQuotSequence.deleteMany({
      where: { storeId: { in: [storeA.id, storeB.id] } },
    });
    await db.store.deleteMany({ where: { id: { in: [storeA.id, storeB.id] } } });
  });

  it("verifies ItemStoreRate composite unique constraint per store", async () => {
    const store = await db.store.create({
      data: { name: "Override Store", slug: `over-s-${Date.now()}` },
    });

    const user = await db.user.findFirst();
    const unit = await db.unit.findFirst();
    if (!user || !unit) return;

    const item = await db.masterItem.create({
      data: {
        description: `Test Item ${Date.now()}`,
        unitId: unit.id,
        rate: 100,
        gstPercent: 18,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    // Create rate override for store
    const override1 = await db.itemStoreRate.create({
      data: {
        masterItemId: item.id,
        storeId: store.id,
        rate: 125.5,
      },
    });
    expect(override1.rate).toBe(125.5);

    // Attempt duplicate store rate for same item & store — MUST FAIL
    await expect(
      db.itemStoreRate.create({
        data: {
          masterItemId: item.id,
          storeId: store.id,
          rate: 150.0,
        },
      })
    ).rejects.toThrow();

    // Clean up
    await db.itemStoreRate.deleteMany({ where: { id: override1.id } });
    await db.masterItem.delete({ where: { id: item.id } });
    await db.store.delete({ where: { id: store.id } });
  });
});
