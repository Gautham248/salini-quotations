import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth-guards";
import { getEffectiveRate } from "@/lib/item-rates";
import { resolveStoreId } from "@/lib/auth-guards";

export async function GET(req: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const showInactive = searchParams.get("showInactive") === "true";

  // Resolve store context for rate resolution
  const storeId = await resolveStoreId(req);

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

  // Resolve effective rates if a store context is available
  let resolvedItems = items;
  if (storeId) {
    resolvedItems = await Promise.all(
      items.map(async (item) => {
        const effectiveRate = await getEffectiveRate(item.id, storeId);
        return { ...item, rate: effectiveRate };
      })
    );
  }

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ items: resolvedItems, categories });
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
