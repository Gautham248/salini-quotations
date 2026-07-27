import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth-guards";

export async function GET(req: NextRequest) {
  await requireAuth(); // staff can now access catalog
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const showInactive = searchParams.get("showInactive") === "true";

  // Build fuzzy where: split search tokens, every token must appear in description
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (search.trim()) {
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      where.description = { contains: tokens[0] };
    } else {
      where.AND = tokens.map((t) => ({ description: { contains: t } }));
    }
  }

  if (categoryId) {
    where.categories = { some: { categoryId: parseInt(categoryId) } };
  }

  if (!showInactive) where.isActive = true;

  const items = await db.masterItem.findMany({
    where,
    include: {
      unit: true,
      categories: { include: { category: true } },
    },
    orderBy: { description: "asc" },
  });

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ items, categories });
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  const b = await req.json();
  const { categoryIds, ...rest } = b;

  const item = await db.masterItem.create({
    data: {
      description: rest.description,
      unitId: rest.unitId,
      rate: rest.rate,
      gstPercent: rest.gstPercent,
      weightPerUnit: rest.weightPerUnit || null,
      piecesPerUnit: rest.piecesPerUnit || null,
      createdById: s.user.id,
      updatedById: s.user.id,
      categories: categoryIds?.length
        ? { create: (categoryIds as number[]).map((catId: number) => ({ categoryId: catId })) }
        : undefined,
    },
    include: { unit: true, categories: { include: { category: true } } },
  });

  return NextResponse.json(item, { status: 201 });
}
