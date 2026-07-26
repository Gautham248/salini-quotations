import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db"; import { requireAdmin } from "@/lib/auth-guards";
export async function GET(req: NextRequest) {
  await requireAdmin(); const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || ""; const category = searchParams.get("category") || ""; const showInactive = searchParams.get("showInactive") === "true";
  const where: Record<string, unknown> = {};
  if (search) where.description = { contains: search };
  if (category) where.category = category;
  if (!showInactive) where.isActive = true;
  const items = await db.masterItem.findMany({ where, include: { unit: true }, orderBy: { updatedAt: "desc" } });
  const cats = await db.masterItem.findMany({ select: { category: true }, distinct: ["category"], where: { category: { not: null } } });
  return NextResponse.json({ items, categories: cats.map(c => c.category).filter(Boolean) });
}
export async function POST(req: NextRequest) {
  const s = await requireAdmin(); const b = await req.json();
  const item = await db.masterItem.create({ data: { description: b.description, unitId: b.unitId, rate: b.rate, gstPercent: b.gstPercent, weightPerUnit: b.weightPerUnit || null, piecesPerUnit: b.piecesPerUnit || null, category: b.category || null, createdById: s.user.id, updatedById: s.user.id } });
  return NextResponse.json(item, { status: 201 });
}
