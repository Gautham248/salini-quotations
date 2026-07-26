import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db"; import { requireAdmin } from "@/lib/auth-guards";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params; const item = await db.masterItem.findUnique({ where: { id: parseInt(id) } });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin(); const { id } = await params; const b = await req.json();
  const item = await db.masterItem.update({ where: { id: parseInt(id) }, data: { description: b.description, unitId: b.unitId, rate: b.rate, gstPercent: b.gstPercent, weightPerUnit: b.weightPerUnit || null, piecesPerUnit: b.piecesPerUnit ? parseInt(b.piecesPerUnit) : null, category: b.category || null, updatedById: s.user.id } });
  return NextResponse.json(item);
}
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params; const item = await db.masterItem.findUnique({ where: { id: parseInt(id) } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const u = await db.masterItem.update({ where: { id: parseInt(id) }, data: { isActive: !item.isActive } });
  return NextResponse.json(u);
}
