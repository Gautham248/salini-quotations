import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId) || numericId <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const item = await db.masterItem.findUnique({
    where: { id: numericId },
    include: { unit: true, alternateUnits: { include: { unit: true } }, categories: { include: { category: true } }, createdBy: { select: { username: true } }, updatedBy: { select: { username: true } } },
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await requireAdmin();
  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId) || numericId <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const { categoryIds, alternateUnits, ...rest } = b;

  await db.itemCategory.deleteMany({ where: { itemId: numericId } });
  if (alternateUnits !== undefined) {
    await db.masterItemUnit.deleteMany({ where: { masterItemId: numericId } });
  }

  try {
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
        alternateUnits: alternateUnits?.length
          ? {
              create: (alternateUnits as Array<{ unitId: number; conversionFactor: number }>).map(
                (a) => ({ unitId: a.unitId, conversionFactor: a.conversionFactor })
              ),
            }
          : undefined,
      },
      include: { unit: true, alternateUnits: { include: { unit: true } }, categories: { include: { category: true } }, createdBy: { select: { username: true } }, updatedBy: { select: { username: true } } },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Item not found or update failed" }, { status: 404 });
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId) || numericId <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const item = await db.masterItem.findUnique({ where: { id: numericId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const u = await db.masterItem.update({
    where: { id: numericId },
    data: { isActive: !item.isActive },
  });
  return NextResponse.json(u);
}
