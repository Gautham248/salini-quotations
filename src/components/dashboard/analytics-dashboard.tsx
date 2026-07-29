"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Store,
  FileText,
  Package,
  TrendingUp,
  RefreshCw,
  Lock,
  FileCheck,
  FileClock,
  Archive,
  ArrowRight,
  Users,
  Layers,
  ChevronDown,
  ExternalLink,
  Building2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

interface QuotationSummaryItem {
  id: number;
  quotNo: string;
  customerName: string;
  netAmount: number;
  storeName: string;
  createdAt: string;
}

interface AnalyticsData {
  period: "24h" | "7d" | "30d" | "all";
  stores: {
    total: number;
    active: number;
    inactive: number;
  };
  quotations: {
    periodCount: number;
    periodValue: number;
    allTimeCount: number;
    allTimeValue: number;
    statusCounts: {
      draft: number;
      finalized: number;
      locked: number;
      archived: number;
    };
    periodQuotationList?: QuotationSummaryItem[];
  };
  masterItems: {
    total: number;
    active: number;
    inactive: number;
    units: number;
  };
  storeBreakdown: Array<{
    id: number;
    name: string;
    slug: string;
    isActive: boolean;
    totalQuotations: number;
    totalValue: number;
    periodQuotations: number;
    periodValue: number;
    userCount: number;
  }>;
}

interface AnalyticsDashboardProps {
  isSuperAdmin?: boolean;
}

export function AnalyticsDashboard({ isSuperAdmin = false }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "all">("24h");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Failed to load analytics data");
      }
    } catch {
      toast.error("Error fetching analytics");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (val: number) =>
    `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const periodLabels: Record<string, string> = {
    "24h": "Last 24 Hours",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    all: "All Time",
  };

  const quotationsBaseUrl = isSuperAdmin ? "/superadmin/quotations" : "/admin/quotations";
  const storesBaseUrl = isSuperAdmin ? "/superadmin/stores" : "/admin/users";

  // Reusable inline button styling class to guarantee single-line flex row rendering
  const actionButtonClass =
    "inline-flex flex-row items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium border border-border/80 bg-background hover:bg-muted hover:text-foreground rounded-md transition-colors whitespace-nowrap shrink-0 h-7 text-foreground shadow-xs";

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-lg p-4 shadow-xs">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Overview Analytics</h2>
          <p className="text-xs text-muted-foreground">
            Real-time performance metrics with dedicated navigation controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period Selection Pills */}
          <div className="inline-flex items-center bg-muted/60 p-1 rounded-md text-xs font-medium border border-border/40">
            {(["24h", "7d", "30d", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-sm transition-all duration-150 whitespace-nowrap ${
                  period === p
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "24h"
                  ? "24h"
                  : p === "7d"
                  ? "7 Days"
                  : p === "30d"
                  ? "30 Days"
                  : "All"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="h-8 w-8 p-0 shrink-0"
            title="Refresh analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid - Accidental Tap Protected */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Stores Summary */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <CardContent className="p-4.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isSuperAdmin ? "Stores Network" : "Store Status"}
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Store className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold tracking-tight">
                {loading ? "—" : data?.stores.total ?? 0}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                {isSuperAdmin ? "Total Stores" : "Registered"}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t text-xs">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
                {data?.stores.active ?? 0} Active
              </Badge>
              {isSuperAdmin && (data?.stores.inactive ?? 0) > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">
                  {data?.stores.inactive} Inactive
                </Badge>
              )}
            </div>
          </CardContent>
          <div className="p-2.5 bg-muted/30 border-t flex justify-end">
            <Link href={storesBaseUrl} className={actionButtonClass}>
              <span>Manage Stores</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        </Card>

        {/* Card 2: Period Quotations Count */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <CardContent className="p-4.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quotations Created
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold tracking-tight">
                {loading ? "—" : data?.quotations.periodCount ?? 0}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                ({periodLabels[period]})
              </span>
            </div>
            <div className="pt-1 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>All-time total:</span>
              <span className="font-semibold text-foreground">
                {data?.quotations.allTimeCount ?? 0}
              </span>
            </div>
          </CardContent>
          <div className="p-2.5 bg-muted/30 border-t flex justify-end">
            <Link href={`${quotationsBaseUrl}?period=${period}`} className={actionButtonClass}>
              <span>View Quotations</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        </Card>

        {/* Card 3: Quotation Value with Popover Breakdown */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <CardContent className="p-4.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quotation Value
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold tracking-tight truncate">
                {loading ? "—" : formatCurrency(data?.quotations.periodValue ?? 0)}
              </div>
            </div>
            <div className="pt-1 border-t text-[11px] text-muted-foreground flex items-center justify-between truncate">
              <span>All-time:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(data?.quotations.allTimeValue ?? 0)}
              </span>
            </div>
          </CardContent>

          {/* Interactive Popover Dropdown for Quotation Items */}
          <div className="p-2.5 bg-muted/30 border-t flex items-center justify-between gap-1.5">
            <Popover>
              <PopoverTrigger className={actionButtonClass}>
                <span>View Breakdown</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 shadow-lg" align="start">
                <PopoverHeader className="p-3 border-b bg-muted/40">
                  <PopoverTitle className="text-xs font-semibold">
                    Quotations ({periodLabels[period]})
                  </PopoverTitle>
                </PopoverHeader>
                <div className="max-h-60 overflow-y-auto divide-y">
                  {(data?.quotations.periodQuotationList?.length ?? 0) === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No quotations found in this period.
                    </div>
                  ) : (
                    data?.quotations.periodQuotationList?.map((q) => (
                      <div
                        key={q.id}
                        className="p-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">
                            {q.customerName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {q.quotNo} · {q.storeName}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-foreground">
                            {formatCurrency(q.netAmount)}
                          </div>
                          <Link
                            href={`/quotations/${q.id}`}
                            className="inline-flex items-center text-[10px] text-primary hover:underline whitespace-nowrap"
                          >
                            View <ExternalLink className="h-2.5 w-2.5 ml-0.5 shrink-0" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Link
              href={`${quotationsBaseUrl}?period=${period}`}
              className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 whitespace-nowrap"
            >
              View All
            </Link>
          </div>
        </Card>

        {/* Card 4: Master Item Catalog */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <CardContent className="p-4.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Master Catalog
              </span>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold tracking-tight">
                {loading ? "—" : data?.masterItems.total ?? 0}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                Items
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t text-xs">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
                {data?.masterItems.active ?? 0} Active
              </Badge>
              <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-500/20 text-[10px]">
                {data?.masterItems.inactive ?? 0} Inactive
              </Badge>
            </div>
          </CardContent>
          <div className="p-2.5 bg-muted/30 border-t flex justify-end">
            <Link href="/admin/items" className={actionButtonClass}>
              <span>View Catalog</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Middle Section: Status Breakdown & Catalog Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <Card className="md:col-span-2 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Quotation Status Breakdown ({periodLabels[period]})
            </CardTitle>
            <CardDescription className="text-xs">
              Click a dedicated button to filter quotations by status
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {/* Draft */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-center space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <FileClock className="h-4 w-4 mx-auto text-amber-600" />
                <div className="text-xl font-bold text-amber-900 dark:text-amber-300">
                  {data?.quotations.statusCounts.draft ?? 0}
                </div>
                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  Drafts
                </div>
              </div>
              <Link
                href={`${quotationsBaseUrl}?status=draft&period=${period}`}
                className="w-full inline-flex flex-row items-center justify-center px-2 py-1 text-[11px] font-medium border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 rounded-md transition-colors whitespace-nowrap h-7"
              >
                View Drafts
              </Link>
            </div>

            {/* Finalized */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-3 text-center space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <FileCheck className="h-4 w-4 mx-auto text-emerald-600" />
                <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300">
                  {data?.quotations.statusCounts.finalized ?? 0}
                </div>
                <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  Finalized
                </div>
              </div>
              <Link
                href={`${quotationsBaseUrl}?status=finalized&period=${period}`}
                className="w-full inline-flex flex-row items-center justify-center px-2 py-1 text-[11px] font-medium border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 rounded-md transition-colors whitespace-nowrap h-7"
              >
                View Finalized
              </Link>
            </div>

            {/* Locked */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 text-center space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <Lock className="h-4 w-4 mx-auto text-blue-600" />
                <div className="text-xl font-bold text-blue-900 dark:text-blue-300">
                  {data?.quotations.statusCounts.locked ?? 0}
                </div>
                <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                  Locked
                </div>
              </div>
              <Link
                href={`${quotationsBaseUrl}?status=locked&period=${period}`}
                className="w-full inline-flex flex-row items-center justify-center px-2 py-1 text-[11px] font-medium border border-blue-500/30 text-blue-800 dark:text-blue-300 hover:bg-blue-500/20 rounded-md transition-colors whitespace-nowrap h-7"
              >
                View Locked
              </Link>
            </div>

            {/* Archived */}
            <div className="bg-slate-500/10 border border-slate-500/20 rounded-md p-3 text-center space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <Archive className="h-4 w-4 mx-auto text-slate-600" />
                <div className="text-xl font-bold text-slate-900 dark:text-slate-300">
                  {data?.quotations.statusCounts.archived ?? 0}
                </div>
                <div className="text-[11px] font-medium text-slate-700 dark:text-slate-400">
                  Archived
                </div>
              </div>
              <Link
                href={`${quotationsBaseUrl}?status=archived&period=${period}`}
                className="w-full inline-flex flex-row items-center justify-center px-2 py-1 text-[11px] font-medium border border-slate-500/30 text-slate-800 dark:text-slate-300 hover:bg-slate-500/20 rounded-md transition-colors whitespace-nowrap h-7"
              >
                View Archived
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Master Catalog Quick Card (Guaranteed side-by-side button layout without overflow) */}
        <Card className="shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              Catalog &amp; Units
            </CardTitle>
            <CardDescription className="text-xs">
              Product specifications &amp; measurement units
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs border-b pb-2">
              <span className="text-muted-foreground">Master Items</span>
              <span className="font-semibold">{data?.masterItems.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b pb-2">
              <span className="text-muted-foreground">Registered Units</span>
              <span className="font-semibold">{data?.masterItems.units ?? 0}</span>
            </div>
            <div className="pt-1 flex flex-row items-center gap-2 w-full min-w-0">
              <Link
                href="/admin/items"
                className="flex-1 inline-flex flex-row items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-border/80 bg-background hover:bg-muted hover:text-foreground rounded-md transition-colors whitespace-nowrap h-8 min-w-0 shadow-xs"
              >
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">Items</span>
              </Link>
              <Link
                href="/admin/units"
                className="flex-1 inline-flex flex-row items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-border/80 bg-background hover:bg-muted hover:text-foreground rounded-md transition-colors whitespace-nowrap h-8 min-w-0 shadow-xs"
              >
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">Units</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Network Breakdown Grid (Expanded Desktop Grid) */}
      {isSuperAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                Store Network Breakdown
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Performance metrics per store ({periodLabels[period]})
              </p>
            </div>
            <Link href="/superadmin/stores" className={actionButtonClass}>
              <span>Manage Stores</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>

          {/* Individual Store Cards Container Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground bg-card border rounded-lg">
                Loading store network cards...
              </div>
            ) : (data?.storeBreakdown.length ?? 0) === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground bg-card border rounded-lg">
                No stores registered yet.
              </div>
            ) : (
              data?.storeBreakdown.map((st) => (
                <Card key={st.id} className="shadow-xs hover:border-primary/30 transition-colors flex flex-col justify-between">
                  <CardHeader className="pb-2.5 border-b bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold text-foreground truncate">
                          {st.name}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          slug: {st.slug}
                        </CardDescription>
                      </div>
                      {st.isActive ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] shrink-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px] shrink-0">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/40 p-2 rounded-md">
                        <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Period Quotes</span>
                        <span className="text-base font-bold text-foreground">{st.periodQuotations}</span>
                      </div>
                      <div className="bg-muted/40 p-2 rounded-md">
                        <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Period Value</span>
                        <span className="text-sm font-bold text-foreground truncate block">
                          {formatCurrency(st.periodValue)}
                        </span>
                      </div>
                      <div className="bg-muted/40 p-2 rounded-md">
                        <span className="text-[10px] text-muted-foreground uppercase block font-semibold">All-Time Quotes</span>
                        <span className="text-sm font-medium text-foreground">{st.totalQuotations}</span>
                      </div>
                      <div className="bg-muted/40 p-2 rounded-md">
                        <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Staff Count</span>
                        <span className="text-sm font-medium text-foreground inline-flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {st.userCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-2.5 bg-muted/30 border-t flex justify-end">
                    <Link
                      href={`/superadmin/quotations?storeId=${st.id}&period=${period}`}
                      className={actionButtonClass}
                    >
                      <span>View Quotes</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
