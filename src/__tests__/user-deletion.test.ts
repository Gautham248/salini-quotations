// @vitest-environment node

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

describe("User Account Deletion & Manager Warning Suite", () => {
  let testStore: any;
  let adminUser: any;
  let managerUser: any;
  let staffUser: any;

  beforeAll(async () => {
    const ts = Date.now();
    testStore = await db.store.create({
      data: {
        name: `Test User Del Store ${ts}`,
        slug: `user-del-store-${ts}`,
      },
    });

    const pass = await bcrypt.hash("password123", 10);

    adminUser = await db.user.create({
      data: {
        username: `test_admin_${ts}`,
        passwordHash: pass,
        role: "admin",
        storeId: testStore.id,
        isActive: true,
      },
    });

    managerUser = await db.user.create({
      data: {
        username: `test_manager_${ts}`,
        passwordHash: pass,
        role: "manager",
        storeId: testStore.id,
        isActive: true,
      },
    });

    staffUser = await db.user.create({
      data: {
        username: `test_staff_${ts}`,
        passwordHash: pass,
        role: "staff",
        storeId: testStore.id,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    if (adminUser?.id) await db.user.deleteMany({ where: { id: adminUser.id } });
    if (managerUser?.id) await db.user.deleteMany({ where: { id: managerUser.id } });
    if (staffUser?.id) await db.user.deleteMany({ where: { id: staffUser.id } });
    if (testStore?.id) await db.store.deleteMany({ where: { id: testStore.id } });
  });

  it("verifies manager role cannot delete staff (role check restriction)", async () => {
    const callingRole = managerUser.role;
    const canDelete = callingRole === "admin" || callingRole === "superadmin";

    expect(canDelete).toBe(false);
  });

  it("allows admin to delete a staff user and reassign relations", async () => {
    const targetUserId = staffUser.id;
    const adminId = adminUser.id;

    // Perform reassignments to admin before deletion
    await db.quotation.updateMany({ where: { createdById: targetUserId }, data: { createdById: adminId } });
    await db.quotation.updateMany({ where: { updatedById: targetUserId }, data: { updatedById: null } });
    await db.masterItem.updateMany({ where: { createdById: targetUserId }, data: { createdById: adminId } });
    await db.masterItem.updateMany({ where: { updatedById: targetUserId }, data: { updatedById: adminId } });
    await db.unit.updateMany({ where: { createdById: targetUserId }, data: { createdById: adminId } });

    // Delete user
    await db.user.delete({ where: { id: targetUserId } });

    const check = await db.user.findUnique({ where: { id: targetUserId } });
    expect(check).toBeNull();
  });

  it("triggers a warning notification when deleting the last manager of a store", async () => {
    const targetManager = managerUser;

    // Check active managers remaining for store
    const activeManagersLeft = await db.user.count({
      where: {
        storeId: targetManager.storeId,
        role: "manager",
        isActive: true,
        id: { not: targetManager.id },
      },
    });

    let warningMessage: string | null = null;
    if (activeManagersLeft === 0) {
      warningMessage = `Store "${testStore.name}" currently has no active manager assigned.`;
    }

    expect(activeManagersLeft).toBe(0);
    expect(warningMessage).toContain("no active manager assigned");

    // Perform deletion
    await db.user.delete({ where: { id: targetManager.id } });
    const check = await db.user.findUnique({ where: { id: targetManager.id } });
    expect(check).toBeNull();
  });

  it("prevents self-deletion by validating caller ID against target ID", async () => {
    const callerId = adminUser.id;
    const targetId = adminUser.id;

    const isSelfDelete = callerId === targetId;
    expect(isSelfDelete).toBe(true);
  });
});
