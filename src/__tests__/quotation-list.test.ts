import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/quotations/route.ts — GET handler filter logic
// ──────────────────────────────────────────────────────────────────────────────

function buildQuotationWhere(params: {
  role: string;
  sessionStoreId: number | null;
  sessionUserId: number;
  queryStoreId?: string;
  search?: string;
  status?: string;
  period?: string;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  // Store scoping
  if (params.role === "superadmin") {
    if (params.queryStoreId) {
      const parsed = parseInt(params.queryStoreId);
      if (!isNaN(parsed) && parsed > 0) where.storeId = parsed;
    }
  } else {
    where.storeId = params.sessionStoreId;
    if (params.role === "staff") where.createdById = params.sessionUserId;
  }

  // Status filtering
  if (params.status) {
    const st = params.status.toLowerCase();
    if (st === "locked") {
      where.isLocked = true;
    } else {
      where.status = st;
    }
  }

  // Period filtering
  if (params.period && params.period !== "all") {
    const now = Date.now();
    let since: Date | null = null;
    if (params.period === "24h") since = new Date(now - 24 * 60 * 60 * 1000);
    else if (params.period === "7d") since = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (params.period === "30d") since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    if (since) where.createdAt = { gte: since };
  }

  // Search
  if (params.search) {
    where.OR = [
      { customerName: { contains: params.search } },
      { quotNo: { contains: params.search } },
    ];
  }

  return where;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests: store scoping
// ──────────────────────────────────────────────────────────────────────────────

describe("buildQuotationWhere — store scoping", () => {
  it("staff: sees only own quotations in own store", () => {
    const where = buildQuotationWhere({
      role: "staff", sessionStoreId: 5, sessionUserId: 42,
    });
    expect(where.storeId).toBe(5);
    expect(where.createdById).toBe(42);
  });

  it("admin: sees all quotations in own store", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1,
    });
    expect(where.storeId).toBe(5);
    expect(where.createdById).toBeUndefined();
  });

  it("manager: sees all quotations in own store", () => {
    const where = buildQuotationWhere({
      role: "manager", sessionStoreId: 5, sessionUserId: 1,
    });
    expect(where.storeId).toBe(5);
    expect(where.createdById).toBeUndefined();
  });

  it("superadmin: sees all stores by default", () => {
    const where = buildQuotationWhere({
      role: "superadmin", sessionStoreId: null, sessionUserId: 1,
    });
    expect(where.storeId).toBeUndefined();
  });

  it("superadmin: filters by query storeId", () => {
    const where = buildQuotationWhere({
      role: "superadmin", sessionStoreId: null, sessionUserId: 1,
      queryStoreId: "10",
    });
    expect(where.storeId).toBe(10);
  });

  it("superadmin: ignores NaN query storeId", () => {
    const where = buildQuotationWhere({
      role: "superadmin", sessionStoreId: null, sessionUserId: 1,
      queryStoreId: "abc",
    });
    expect(where.storeId).toBeUndefined();
  });

  it("superadmin: ignores zero query storeId", () => {
    const where = buildQuotationWhere({
      role: "superadmin", sessionStoreId: null, sessionUserId: 1,
      queryStoreId: "0",
    });
    expect(where.storeId).toBeUndefined();
  });

  it("superadmin: ignores negative query storeId", () => {
    const where = buildQuotationWhere({
      role: "superadmin", sessionStoreId: null, sessionUserId: 1,
      queryStoreId: "-5",
    });
    expect(where.storeId).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: status filtering
// ──────────────────────────────────────────────────────────────────────────────

describe("buildQuotationWhere — status filtering", () => {
  it("filters by draft status", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, status: "draft",
    });
    expect(where.status).toBe("draft");
  });

  it("filters by finalized status", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, status: "finalized",
    });
    expect(where.status).toBe("finalized");
  });

  it("filters by archived status", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, status: "archived",
    });
    expect(where.status).toBe("archived");
  });

  it("filters locked quotations (boolean flag)", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, status: "locked",
    });
    expect(where.isLocked).toBe(true);
    expect(where.status).toBeUndefined();
  });

  it("no status filter when not provided", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1,
    });
    expect(where.status).toBeUndefined();
    expect(where.isLocked).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: period filtering
// ──────────────────────────────────────────────────────────────────────────────

describe("buildQuotationWhere — period filtering", () => {
  it("no period filter for 'all'", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, period: "all",
    });
    expect(where.createdAt).toBeUndefined();
  });

  it("returns gte filter for 24h", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, period: "24h",
    });
    expect(where.createdAt).toBeDefined();
    const filter = where.createdAt as { gte: Date };
    expect(filter.gte).toBeInstanceOf(Date);
    const diff = Date.now() - filter.gte.getTime();
    expect(diff).toBeGreaterThan(23.5 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it("returns gte filter for 7d", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, period: "7d",
    });
    const filter = where.createdAt as { gte: Date };
    const diff = Date.now() - filter.gte.getTime();
    expect(diff).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(7.1 * 24 * 60 * 60 * 1000);
  });

  it("returns gte filter for 30d", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, period: "30d",
    });
    const filter = where.createdAt as { gte: Date };
    const diff = Date.now() - filter.gte.getTime();
    expect(diff).toBeGreaterThan(29.9 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(30.1 * 24 * 60 * 60 * 1000);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: search
// ──────────────────────────────────────────────────────────────────────────────

describe("buildQuotationWhere — search", () => {
  it("adds OR for customerName and quotNo", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, search: "salini",
    });
    expect(where.OR).toEqual([
      { customerName: { contains: "salini" } },
      { quotNo: { contains: "salini" } },
    ]);
  });

  it("no OR when search is empty", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1, search: "",
    });
    expect(where.OR).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: combined filters
// ──────────────────────────────────────────────────────────────────────────────

describe("buildQuotationWhere — combined", () => {
  it("combines store + status + period + search", () => {
    const where = buildQuotationWhere({
      role: "admin", sessionStoreId: 5, sessionUserId: 1,
      status: "finalized", period: "7d", search: "john",
    });
    expect(where.storeId).toBe(5);
    expect(where.status).toBe("finalized");
    expect(where.createdAt).toBeDefined();
    expect(where.OR).toBeDefined();
  });
});
