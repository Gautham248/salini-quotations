import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await requireAdmin();
  const { id } = await params;
  const uid = parseInt(id);

  if (isNaN(uid) || uid <= 0) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Self-modification prevention
  if (uid === s.user.id) {
    return NextResponse.json({ error: "Cannot modify own account" }, { status: 400 });
  }

  // Fetch target user to verify store-scoping
  const target = await db.user.findUnique({ where: { id: uid } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Store-scoping: admin can only modify users in their own store
  if (s.user.role !== "superadmin" && target.storeId !== s.user.storeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const b = await req.json().catch(() => ({}));

  if (b.action === "toggle") {
    const upd = await db.user.update({
      where: { id: uid },
      data: { isActive: !target.isActive },
      select: { id: true, username: true, role: true, storeId: true, isActive: true },
    });
    return NextResponse.json(upd);
  }

  if (b.action === "reset-password") {
    if (!b.password) return NextResponse.json({ error: "Password required" }, { status: 400 });
    const h = await bcrypt.hash(b.password, 12);
    await db.user.update({
      where: { id: uid },
      data: { passwordHash: h, forcePasswordChange: true },
    });
    return NextResponse.json({ success: true });
  }

  if (b.action === "update-role") {
    // Admin cannot promote anyone to superadmin
    if (s.user.role !== "superadmin" && b.role === "superadmin") {
      return NextResponse.json({ error: "Forbidden: only superadmin can assign superadmin role" }, { status: 403 });
    }
    const upd = await db.user.update({
      where: { id: uid },
      data: { role: b.role },
      select: { id: true, username: true, role: true, storeId: true, isActive: true },
    });
    return NextResponse.json(upd);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requireAuth } = await import("@/lib/auth-guards");
  const s = await requireAuth();

  // 1. Strict Authorization: Managers and staff CANNOT delete users (reserved for Admin / Superadmin)
  if (s.user.role !== "admin" && s.user.role !== "superadmin") {
    return NextResponse.json(
      { error: "Forbidden: User deletion is reserved for Admins and Superadmins. Managers cannot delete staff." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const uid = parseInt(id);

  if (isNaN(uid) || uid <= 0) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 2. Self-deletion prevention
  if (uid === s.user.id) {
    return NextResponse.json({ error: "Cannot delete own account" }, { status: 400 });
  }

  // 3. Fetch target user to verify store-scoping and role
  const target = await db.user.findUnique({
    where: { id: uid },
    include: { store: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Store-scoping: Admin can only delete users in their store
  if (s.user.role !== "superadmin" && target.storeId !== s.user.storeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Admin cannot delete superadmin accounts
  if (s.user.role !== "superadmin" && target.role === "superadmin") {
    return NextResponse.json({ error: "Forbidden: Cannot delete superadmin account" }, { status: 403 });
  }

  // 4. Notification check: If deleting a manager, check if store will have 0 active managers left
  let warningMessage: string | null = null;
  if (target.role === "manager" && target.storeId) {
    const activeManagersLeft = await db.user.count({
      where: {
        storeId: target.storeId,
        role: "manager",
        isActive: true,
        id: { not: target.id },
      },
    });

    if (activeManagersLeft === 0) {
      const storeName = target.store?.name || `Store #${target.storeId}`;
      warningMessage = `Store "${storeName}" currently has no active manager assigned.`;
    }
  }

  // 5. Reassign foreign key references to calling admin to preserve data integrity
  await db.quotation.updateMany({ where: { createdById: uid }, data: { createdById: s.user.id } });
  await db.quotation.updateMany({ where: { updatedById: uid }, data: { updatedById: null } });
  await db.masterItem.updateMany({ where: { createdById: uid }, data: { createdById: s.user.id } });
  await db.masterItem.updateMany({ where: { updatedById: uid }, data: { updatedById: s.user.id } });
  await db.unit.updateMany({ where: { createdById: uid }, data: { createdById: s.user.id } });

  // 6. Delete user account
  await db.user.delete({ where: { id: uid } });

  return NextResponse.json({
    success: true,
    message: `User "${target.username}" deleted successfully`,
    warning: warningMessage,
  });
}
