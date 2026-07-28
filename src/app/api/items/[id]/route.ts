import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const item = await db.masterItem.findUnique({
    where: { id: parseInt(id) },
    include: { unit: true, categories: { include: { category: true } }, createdBy: { select: { username: true } }, updatedBy: { select: { username: true } } },
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await requireAdmin();
  const { id } = await params;
  const b = await req.json();
  const { categoryIds, ...rest } = b;
  const numericId = parseInt(id);

  await db.itemCategory.deleteMany({ where: { itemId: numericId } });

  const item = await db.masterItem.update({
    where: { id: numericId },
    data: {
      description: rest.description,
      unitId: rest.unitId,
      rate: rest.rate,
      gstPercent: rest.gstPercent,
      weightPerUnit: rest.weightPerUnit || null,
      piecesPerUnit: rest.piecesPerUnit ? parseInt(rest.piecesPerUnit) : null,
      updatedById: s.user.id,
      categories: categoryIds?.length
        ? { create: (categoryIds as number[]).map((catId: number) => ({ categoryId: catId })) }
        : undefined,
    },
    include: { unit: true, categories: { include: { category: true } }, createdBy: { select: { username: true } }, updatedBy: { select: { username: true } } },
  });
  return NextResponse.json(item);
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const item = await db.masterItem.findUnique({ where: { id: parseInt(id) } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const u = await db.masterItem.update({
    where: { id: parseInt(id) },
    data: { isActive: !item.isActive },
  });
  return NextResponse.json(u);
}
