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
  if (period === "24h") sinceDate = new Date(now - 24 * 60 * 60 * 1000);
  else if (period === "7d") sinceDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  else if (period === "30d") sinceDate = new Date(now - 30 * 24 * 60 * 60 * 1000);

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

  // Period-scoped where clause
  const periodWhere = {
    ...quotationStoreWhere,
    ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
  };

  // Run all independent queries in parallel
  const [
    totalStores,
    activeStores,
    allTimeQuotAgg,
    periodQuotAgg,
    periodQuotList,
    statusGroups,
    totalItems,
    activeItems,
    totalUnits,
    storesList,
  ] = await Promise.all([
    db.store.count(),
    db.store.count({ where: { isActive: true } }),

    // All-time quotation aggregates
    db.quotation.aggregate({
      where: quotationStoreWhere,
      _count: { id: true },
      _sum: { netAmount: true },
    }),

    // Period quotation aggregates
    db.quotation.aggregate({
      where: periodWhere,
      _count: { id: true },
      _sum: { netAmount: true },
    }),

    // Period quotation list (limited to 50, lightweight select)
    db.quotation.findMany({
      where: periodWhere,
      select: {
        id: true,
        quotNo: true,
        customerName: true,
        netAmount: true,
        createdAt: true,
        store: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Status breakdown via groupBy
    db.quotation.groupBy({
      by: ["status"],
      where: periodWhere,
      _count: { id: true },
    }),

    // Master Items metrics
    db.masterItem.count(),
    db.masterItem.count({ where: { isActive: true } }),
    db.unit.count(),

    // Stores list for superadmin breakdown
    db.store.findMany({
      select: { id: true, name: true, slug: true, isActive: true,
        _count: { select: { users: true, quotations: true } },
      },
      orderBy: { id: "asc" },
    }),
  ]);

  const inactiveStores = totalStores - activeStores;
  const inactiveItems = totalItems - activeItems;

  // Build status counts from groupBy
  const statusCounts = { draft: 0, finalized: 0, locked: 0, archived: 0 };
  for (const g of statusGroups) {
    const st = (g.status as string).toLowerCase();
    if (st === "draft") statusCounts.draft = g._count.id;
    else if (st === "finalized") statusCounts.finalized = g._count.id;
    else if (st === "archived") statusCounts.archived = g._count.id;
  }
  // Count locked separately (a quote can be locked in any status)
  const allLocked = await db.quotation.count({
    where: { ...periodWhere, isLocked: true },
  });
  statusCounts.locked = allLocked;

  // Per-store breakdown — one bulk aggregate query instead of N+1
  const storeIds = storesList.map((st) => st.id);
  const storeQuotAggs = await db.quotation.groupBy({
    by: ["storeId"],
    where: { storeId: { in: storeIds } },
    _count: { id: true },
    _sum: { netAmount: true },
  });

  const periodStoreAggs = sinceDate
    ? await db.quotation.groupBy({
        by: ["storeId"],
        where: { storeId: { in: storeIds }, createdAt: { gte: sinceDate } },
        _count: { id: true },
        _sum: { netAmount: true },
      })
    : [];

  const allTimeMap = new Map(storeQuotAggs.map((a) => [a.storeId, { count: a._count.id, sum: a._sum.netAmount ?? 0 }]));
  const periodMap = new Map(periodStoreAggs.map((a) => [a.storeId, { count: a._count.id, sum: a._sum.netAmount ?? 0 }]));

  const storeBreakdown = storesList.map((st) => {
    const allTime = allTimeMap.get(st.id);
    const periodAgg = periodMap.get(st.id);
    return {
      id: st.id,
      name: st.name,
      slug: st.slug,
      isActive: st.isActive,
      totalQuotations: st._count.quotations,
      totalValue: allTime?.sum ?? 0,
      periodQuotations: periodAgg?.count ?? 0,
      periodValue: periodAgg?.sum ?? 0,
      userCount: st._count.users,
    };
  });

  return NextResponse.json({
    period,
    stores: { total: totalStores, active: activeStores, inactive: inactiveStores },
    quotations: {
      periodCount: periodQuotAgg._count.id,
      periodValue: periodQuotAgg._sum.netAmount ?? 0,
      allTimeCount: allTimeQuotAgg._count.id,
      allTimeValue: allTimeQuotAgg._sum.netAmount ?? 0,
      statusCounts,
      periodQuotationList: periodQuotList.map((q) => ({
        id: q.id,
        quotNo: q.quotNo,
        customerName: q.customerName,
        netAmount: q.netAmount || 0,
        storeName: q.store?.name || "Unassigned Store",
        createdAt: q.createdAt,
      })),
    },
    masterItems: { total: totalItems, active: activeItems, inactive: inactiveItems, units: totalUnits },
    storeBreakdown,
  });
}
