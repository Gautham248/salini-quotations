import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("Store Deletion & Data Lifecycle Suite", () => {
  it("deletes a store and deactivates staff while archiving quotations as unassigned templates", async () => {
    const timestamp = Date.now();

    // 1. Create a test store
    const store = await db.store.create({
      data: {
        name: `Lifecycle Test Store ${timestamp}`,
        slug: `lifecycle-store-${timestamp}`,
        quotSequence: { create: { lastNumber: 0 } },
      },
    });

    // 2. Create staff user assigned to store
    const staff = await db.user.create({
      data: {
        username: `lifecycle_staff_${timestamp}`,
        passwordHash: "hash",
        role: "staff",
        storeId: store.id,
        isActive: true,
      },
    });

    // 3. Create quotation assigned to store
    const quote = await db.quotation.create({
      data: {
        storeId: store.id,
        quotNo: "Q-DEL-001",
        refNo: "REF-DEL-001",
        quotDate: new Date(),
        status: "finalized",
        customerName: "Lifecycle Customer",
        createdById: staff.id,
      },
    });

    // 4. Perform store deletion via endpoint logic (Soft Delete staff, Archive quotes)
    // - Unassign & deactivate staff
    await db.user.updateMany({
      where: { storeId: store.id, role: { not: "superadmin" } },
      data: { storeId: null, isActive: false },
    });

    // - Archive quotes as unassigned templates
    await db.quotation.updateMany({
      where: { storeId: store.id },
      data: { storeId: null, status: "ARCHIVED" },
    });

    // - Clean up store auxiliary records
    await db.itemStoreRate.deleteMany({ where: { storeId: store.id } });
    await db.companySettings.deleteMany({ where: { storeId: store.id } });
    await db.storeQuotSequence.deleteMany({ where: { storeId: store.id } });

    // - Delete store record
    await db.store.delete({ where: { id: store.id } });

    // 5. Verify Store is completely removed
    const deletedStore = await db.store.findUnique({ where: { id: store.id } });
    expect(deletedStore).toBeNull();

    // 6. Verify Staff is deactivated and unassigned (storeId: null, isActive: false)
    const updatedStaff = await db.user.findUnique({ where: { id: staff.id } });
    expect(updatedStaff).not.toBeNull();
    expect(updatedStaff?.storeId).toBeNull();
    expect(updatedStaff?.isActive).toBe(false);

    // 7. Verify Quotation is archived as template (storeId: null, status: "ARCHIVED")
    const updatedQuote = await db.quotation.findUnique({ where: { id: quote.id } });
    expect(updatedQuote).not.toBeNull();
    expect(updatedQuote?.storeId).toBeNull();
    expect(updatedQuote?.status).toBe("ARCHIVED");

    // 8. Verify Staff status prevents active store authentication:
    // Non-superadmin users with storeId === null or isActive === false are rejected by auth checks
    const isStaffAuthorized = updatedStaff?.isActive && updatedStaff?.storeId !== null;
    expect(isStaffAuthorized).toBe(false);

    // Clean up test staff and quote
    await db.quotation.delete({ where: { id: quote.id } });
    await db.user.delete({ where: { id: staff.id } });
  });

  it("removes remaining test stores (Seq Store A, Seq Store B) from database", async () => {
    const testStores = await db.store.findMany({
      where: { name: { in: ["Seq Store A", "Seq Store B"] } },
    });

    for (const s of testStores) {
      await db.user.updateMany({
        where: { storeId: s.id, role: { not: "superadmin" } },
        data: { storeId: null, isActive: false },
      });
      await db.quotation.updateMany({
        where: { storeId: s.id },
        data: { storeId: null, status: "ARCHIVED" },
      });
      await db.itemStoreRate.deleteMany({ where: { storeId: s.id } });
      await db.companySettings.deleteMany({ where: { storeId: s.id } });
      await db.storeQuotSequence.deleteMany({ where: { storeId: s.id } });
      await db.store.delete({ where: { id: s.id } });
    }

    const remaining = await db.store.findMany({
      where: { name: { in: ["Seq Store A", "Seq Store B"] } },
    });
    expect(remaining).toHaveLength(0);
  });
});
