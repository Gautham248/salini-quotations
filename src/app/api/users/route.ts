import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db"; import { requireAdmin } from "@/lib/auth-guards"; import bcrypt from "bcryptjs";
export async function GET() { await requireAdmin(); const u = await db.user.findMany({ select: { id: true, username: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" } }); return NextResponse.json(u); }
export async function POST(req: NextRequest) {
  await requireAdmin(); const b = await req.json(); const hash = await bcrypt.hash(b.password, 12);
  const u = await db.user.create({ data: { username: b.username, passwordHash: hash, role: b.role, forcePasswordChange: true }, select: { id: true, username: true, role: true, isActive: true, createdAt: true } });
  return NextResponse.json(u, { status: 201 });
}
