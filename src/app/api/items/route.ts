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
    const parsedCatId = parseInt(categoryId);
    if (!isNaN(parsedCatId)) {
      where.categories = { some: { categoryId: parsedCatId } };
    }
  }

  if (!showInactive) where.isActive = true;

  const items = await db.masterItem.findMany({
    where,
    include: {
      unit: true,
      alternateUnits: { include: { unit: true } },
      categories: { include: { category: true } },
      createdBy: { select: { username: true } },
      updatedBy: { select: { username: true } },
    },
    orderBy: { description: "asc" },
  });

  // Resolve effective rates in a single batch query if store context is available
  let resolvedItems = items;
  if (storeId) {
    const storeRates = await db.itemStoreRate.findMany({
      where: { storeId },
      select: { masterItemId: true, rate: true },
    });
    const rateMap = new Map(storeRates.map((r) => [r.masterItemId, r.rate]));
    resolvedItems = items.map((item) => ({
      ...item,
      rate: rateMap.get(item.id) ?? item.rate,
    }));
  }

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json(
    { items: resolvedItems, categories },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  const b = await req.json().catch(() => ({}));

  if (!b.description || typeof b.description !== "string" || !b.description.trim()) {
    return NextResponse.json({ error: "Item description is required" }, { status: 400 });
  }

  if (!b.unitId || typeof b.unitId !== "number") {
    return NextResponse.json({ error: "Valid unitId is required" }, { status: 400 });
  }

  const { categoryIds, alternateUnits, ...rest } = b;

  try {
    const item = await db.masterItem.create({
      data: {
        description: rest.description.trim(),
        unitId: rest.unitId,
        rate: typeof rest.rate === "number" ? rest.rate : 0,
        gstPercent: typeof rest.gstPercent === "number" ? rest.gstPercent : 0,
        weightPerUnit: rest.weightPerUnit || null,
        piecesPerUnit: rest.piecesPerUnit ? parseInt(rest.piecesPerUnit) : null,
        createdById: s.user.id,
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
      include: {
        unit: true,
        alternateUnits: { include: { unit: true } },
        categories: { include: { category: true } },
        createdBy: { select: { username: true } },
        updatedBy: { select: { username: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create item" }, { status: 400 });
  }
}
