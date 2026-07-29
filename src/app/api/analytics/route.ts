import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, resolveStoreId } from "@/lib/auth-guards";

export async function GET(req: NextRequest) {
  const s = await requireAuth();
  const targetStoreId = await resolveStoreId(req);
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "24h";

  // Calculate threshold date for period filter
  let sinceDate: Date | null = null;
  const now = Date.now();
  if (period === "24h") {
    sinceDate = new Date(now - 24 * 60 * 60 * 1000);
  } else if (period === "7d") {
    sinceDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    sinceDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
  } // "all" leaves sinceDate as null

  const isSuperAdmin = s.user.role === "superadmin";

  // Store scoping clause for Quotations
  const quotationStoreWhere: Record<string, unknown> = {};
  if (!isSuperAdmin) {
    quotationStoreWhere.storeId = s.user.storeId;
    if (s.user.role === "staff") {
      quotationStoreWhere.createdById = s.user.id;
    }
  } else if (targetStoreId) {
    quotationStoreWhere.storeId = targetStoreId;
  }

  // 1. Stores metrics
  const totalStores = await db.store.count();
  const activeStores = await db.store.count({ where: { isActive: true } });
  const inactiveStores = totalStores - activeStores;

  // 2. All-time quotations
  const allTimeQuotations = await db.quotation.findMany({
    where: quotationStoreWhere,
    select: {
      id: true,
      netAmount: true,
      status: true,
      isLocked: true,
      storeId: true,
      createdAt: true,
    },
  });

  const allTimeCount = allTimeQuotations.length;
  const allTimeValue = allTimeQuotations.reduce(
    (sum, q) => sum + (q.netAmount || 0),
    0
  );

  // 3. Period-filtered quotations & breakdown list
  const periodWhere = {
    ...quotationStoreWhere,
    ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
  };

  const periodQuotationsFull = await db.quotation.findMany({
    where: periodWhere,
    select: {
      id: true,
      quotNo: true,
      customerName: true,
      netAmount: true,
      status: true,
      isLocked: true,
      createdAt: true,
      store: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const periodCount = periodQuotationsFull.length;
  const periodValue = periodQuotationsFull.reduce(
    (sum, q) => sum + (q.netAmount || 0),
    0
  );

  const periodQuotationList = periodQuotationsFull.map((q) => ({
    id: q.id,
    quotNo: q.quotNo,
    customerName: q.customerName,
    netAmount: q.netAmount || 0,
    storeName: q.store?.name || "Unassigned Store",
    createdAt: q.createdAt,
  }));

  // Status breakdown within period
  const statusCounts = {
    draft: 0,
    finalized: 0,
    locked: 0,
    archived: 0,
  };

  periodQuotationsFull.forEach((q) => {
    if (q.isLocked) statusCounts.locked++;
    const st = q.status?.toLowerCase();
    if (st === "draft") statusCounts.draft++;
    else if (st === "finalized") statusCounts.finalized++;
    else if (st === "archived") statusCounts.archived++;
  });

  // 4. Master Items metrics
  const totalItems = await db.masterItem.count();
  const activeItems = await db.masterItem.count({ where: { isActive: true } });
  const inactiveItems = totalItems - activeItems;
  const totalUnits = await db.unit.count();

  // 5. Per-Store Breakdown (for superadmin overview or store details)
  const storesList = await db.store.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: {
        select: {
          users: true,
          quotations: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  // Fetch per-store quotation values and period counts
  const storeBreakdown = await Promise.all(
    storesList.map(async (st) => {
      const storeQuotes = await db.quotation.findMany({
        where: { storeId: st.id },
        select: { netAmount: true, createdAt: true },
      });

      const periodStoreQuotes = sinceDate
        ? storeQuotes.filter((q) => new Date(q.createdAt) >= sinceDate)
        : storeQuotes;

      const totalValue = storeQuotes.reduce(
        (sum, q) => sum + (q.netAmount || 0),
        0
      );
      const periodValue = periodStoreQuotes.reduce(
        (sum, q) => sum + (q.netAmount || 0),
        0
      );

      return {
        id: st.id,
        name: st.name,
        slug: st.slug,
        isActive: st.isActive,
        totalQuotations: st._count.quotations,
        totalValue,
        periodQuotations: periodStoreQuotes.length,
        periodValue,
        userCount: st._count.users,
      };
    })
  );

  return NextResponse.json({
    period,
    stores: {
      total: totalStores,
      active: activeStores,
      inactive: inactiveStores,
    },
    quotations: {
      periodCount,
      periodValue,
      allTimeCount,
      allTimeValue,
      statusCounts,
      periodQuotationList,
    },
    masterItems: {
      total: totalItems,
      active: activeItems,
      inactive: inactiveItems,
      units: totalUnits,
    },
    storeBreakdown,
  });
}
