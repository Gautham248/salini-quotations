import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const s = await requireAdmin();
  const { searchParams } = new URL(req.url);
  const filterStoreId = searchParams.get("storeId");

  let where: Record<string, unknown> = {};

  if (s.user.role === "superadmin" || s.user.role === "manager") {
    if (filterStoreId) where.storeId = parseInt(filterStoreId);
  } else if (s.user.role === "admin") {
    where.storeId = s.user.storeId;
  }
  // staff don't access the user list

  const users = await db.user.findMany({
    select: { id: true, username: true, role: true, storeId: true, isActive: true, createdAt: true },
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  const b = await req.json();
  const hash = await bcrypt.hash(b.password, 12);

  // Determine storeId and role
  let storeId: number | null = null;
  let role = b.role || "staff";

  if (s.user.role === "superadmin" || s.user.role === "manager") {
    // Superadmin/manager can create any role for any store
    storeId = b.storeId ?? null;
    if (role === "superadmin") storeId = null;
  } else {
    // Admin: forced to own store, can only create admin/staff
    storeId = s.user.storeId;
    if (role !== "admin" && role !== "staff") role = "staff";
  }

  if (!storeId && role !== "superadmin") {
    return NextResponse.json({ error: "storeId is required for non-superadmin users" }, { status: 400 });
  }

  const user = await db.user.create({
    data: {
      username: b.username,
      passwordHash: hash,
      role,
      storeId,
      forcePasswordChange: true,
    },
    select: { id: true, username: true, role: true, storeId: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}
