import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

// Mock SWR
vi.mock("swr", () => ({
  default: vi.fn((_url: string) => ({
    data: null,
    isLoading: true,
    isValidating: false,
    mutate: vi.fn(),
  })),
}));

// We need the actual SWR import for dynamic mocking
import useSWR from "swr";

function mockSWRData(data: unknown, isLoading = false) {
  vi.mocked(useSWR).mockReturnValue({
    data,
    isLoading,
    isValidating: false,
    mutate: vi.fn(),
    error: undefined,
  } as never);
}

describe("AnalyticsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders period toggle buttons", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={false} />);
    expect(screen.getByText("24h")).toBeDefined();
    expect(screen.getByText("7 Days")).toBeDefined();
    expect(screen.getByText("30 Days")).toBeDefined();
    expect(screen.getByText("All")).toBeDefined();
  });

  it("renders store KPI card for non-superadmin", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={false} />);
    expect(screen.getByText("Store Status")).toBeDefined();
  });

  it("renders stores network card for superadmin", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={true} />);
    expect(screen.getByText("Stores Network")).toBeDefined();
  });

  it("renders quotations created card", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={false} />);
    expect(screen.getByText("Quotations Created")).toBeDefined();
  });

  it("renders quotation value card", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={false} />);
    expect(screen.getByText("Quotation Value")).toBeDefined();
  });

  it("renders master catalog card", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={false} />);
    expect(screen.getByText("Master Catalog")).toBeDefined();
  });

  it("shows dashboard em dashes while loading", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={false} />);
    // "—" is an em-dash
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows status breakdown section", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={false} />);
    expect(screen.getByText("Drafts")).toBeDefined();
    expect(screen.getByText("Finalized")).toBeDefined();
    expect(screen.getByText("Locked")).toBeDefined();
    expect(screen.getByText("Archived")).toBeDefined();
  });

  it("renders refresh button", () => {
    mockSWRData(null, true);
    render(<AnalyticsDashboard isSuperAdmin={false} />);
    const btn = screen.getByTitle("Refresh analytics");
    expect(btn).toBeDefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Extracted logic tests for analytics
// ──────────────────────────────────────────────────────────────────────────────

describe("analytics data transformation", () => {
  function buildStatusCounts(
    quotations: Array<{ status: string; isLocked?: boolean }>,
  ): { draft: number; finalized: number; locked: number; archived: number } {
    const counts = { draft: 0, finalized: 0, locked: 0, archived: 0 };
    for (const q of quotations) {
      if (q.isLocked) counts.locked++;
      const st = q.status.toLowerCase();
      if (st === "draft") counts.draft++;
      else if (st === "finalized") counts.finalized++;
      else if (st === "archived") counts.archived++;
    }
    return counts;
  }

  function formatCurrencyINR(val: number): string {
    return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  it("counts statuses correctly", () => {
    const counts = buildStatusCounts([
      { status: "draft" },
      { status: "draft" },
      { status: "finalized" },
      { status: "finalized" },
      { status: "finalized" },
      { status: "archived" },
      { status: "draft", isLocked: true },
    ]);
    expect(counts.draft).toBe(3);
    expect(counts.finalized).toBe(3);
    expect(counts.archived).toBe(1);
    expect(counts.locked).toBe(1);
  });

  it("handles empty list", () => {
    const counts = buildStatusCounts([]);
    expect(counts.draft).toBe(0);
    expect(counts.finalized).toBe(0);
  });

  it("formats currency with Indian grouping", () => {
    expect(formatCurrencyINR(1500000)).toBe("₹15,00,000");
  });

  it("formats zero correctly", () => {
    expect(formatCurrencyINR(0)).toBe("₹0");
  });
});
