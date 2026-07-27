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

  const b = await req.json();

  if (b.action === "toggle") {
    const upd = await db.user.update({
      where: { id: uid },
      data: { isActive: !target.isActive },
      select: { id: true, username: true, role: true, storeId: true, isActive: true },
    });
    return NextResponse.json(upd);
  }

  if (b.action === "reset-password") {
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
