import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/items/route.ts — search & filter
// ──────────────────────────────────────────────────────────────────────────────

function buildItemSearch(search: string): Record<string, unknown> | undefined {
  if (!search.trim()) return undefined;
  const tokens = search.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { description: { contains: tokens[0] } };
  }
  return { AND: tokens.map((t) => ({ description: { contains: t } })) };
}

function buildItemWhere(params: {
  search?: string;
  categoryId?: string;
  showInactive?: boolean;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (params.search?.trim()) {
    const searchFilter = buildItemSearch(params.search);
    if (searchFilter) Object.assign(where, searchFilter);
  }
  if (params.categoryId) {
    const parsed = parseInt(params.categoryId);
    if (!isNaN(parsed)) where.categories = { some: { categoryId: parsed } };
  }
  if (!params.showInactive) where.isActive = true;
  return where;
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted item rate resolution
// ──────────────────────────────────────────────────────────────────────────────

function resolveEffectiveRate(
  baseRate: number,
  storeId: number | null,
  storeRates: Map<number, number>,
): number {
  if (storeId && storeRates.has(storeId)) return storeRates.get(storeId)!;
  return baseRate;
}

function resolveItemRates(
  items: Array<{ id: number; rate: number }>,
  storeId: number | null,
  storeRates: Map<number, number>,
): Array<{ id: number; rate: number }> {
  if (!storeId) return items.map((i) => ({ ...i }));
  return items.map((item) => ({
    ...item,
    rate: storeRates.has(item.id) ? storeRates.get(item.id)! : item.rate,
  }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted validation
// ──────────────────────────────────────────────────────────────────────────────

function validateItemCreate(body: Record<string, unknown>): string | null {
  if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
    return "Item description is required";
  }
  if (!body.unitId || typeof body.unitId !== "number") {
    return "Valid unitId is required";
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted rate defaults
// ──────────────────────────────────────────────────────────────────────────────

function sanitizeItemInput(rest: Record<string, unknown>) {
  return {
    description: typeof rest.description === "string" ? rest.description.trim() : "",
    unitId: rest.unitId,
    rate: typeof rest.rate === "number" && Number.isFinite(rest.rate) ? rest.rate : 0,
    gstPercent: typeof rest.gstPercent === "number" && Number.isFinite(rest.gstPercent) ? rest.gstPercent : 0,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests: search builder
// ──────────────────────────────────────────────────────────────────────────────

describe("buildItemSearch", () => {
  it("returns undefined for empty search", () => {
    expect(buildItemSearch("")).toBeUndefined();
  });

  it("returns undefined for whitespace", () => {
    expect(buildItemSearch("   ")).toBeUndefined();
  });

  it("single token → contains", () => {
    const result = buildItemSearch("sand");
    expect(result).toEqual({ description: { contains: "sand" } });
  });

  it("multi-token → AND", () => {
    const result = buildItemSearch("coarse sand");
    expect(result).toEqual({
      AND: [
        { description: { contains: "coarse" } },
        { description: { contains: "sand" } },
      ],
    });
  });

  it("trims extra whitespace between tokens", () => {
    const result = buildItemSearch("  sand   cement  ");
    expect(result).toEqual({
      AND: [
        { description: { contains: "sand" } },
        { description: { contains: "cement" } },
      ],
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: where builder
// ──────────────────────────────────────────────────────────────────────────────

describe("buildItemWhere", () => {
  it("filters active by default", () => {
    const where = buildItemWhere({});
    expect(where.isActive).toBe(true);
  });

  it("shows inactive when flag is true", () => {
    const where = buildItemWhere({ showInactive: true });
    expect(where.isActive).toBeUndefined();
  });

  it("adds category filter", () => {
    const where = buildItemWhere({ categoryId: "5" });
    expect(where.categories).toEqual({ some: { categoryId: 5 } });
  });

  it("ignores NaN categoryId", () => {
    const where = buildItemWhere({ categoryId: "abc" });
    expect(where.categories).toBeUndefined();
  });

  it("combines search + category + active filter", () => {
    const where = buildItemWhere({ search: "sand", categoryId: "3", showInactive: false });
    expect(where.isActive).toBe(true);
    expect(where.description).toEqual({ contains: "sand" });
    expect(where.categories).toEqual({ some: { categoryId: 3 } });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: rate resolution
// ──────────────────────────────────────────────────────────────────────────────

describe("resolveEffectiveRate", () => {
  it("returns store override when present", () => {
    const rateMap = new Map<number, number>([[1, 150]]);
    expect(resolveEffectiveRate(100, 1, rateMap)).toBe(150);
  });

  it("falls back to base when no override", () => {
    const rateMap = new Map<number, number>([]);
    expect(resolveEffectiveRate(100, 1, rateMap)).toBe(100);
  });

  it("falls back to base when storeId is null", () => {
    const rateMap = new Map<number, number>([[1, 150]]);
    expect(resolveEffectiveRate(100, null, rateMap)).toBe(100);
  });
});

describe("resolveItemRates", () => {
  const items = [
    { id: 1, rate: 100 },
    { id: 2, rate: 200 },
    { id: 3, rate: 300 },
  ];

  it("applies overrides for matching items", () => {
    const rateMap = new Map<number, number>([[2, 250]]);
    const result = resolveItemRates(items, 5, rateMap);
    expect(result[1].rate).toBe(250);
    expect(result[0].rate).toBe(100);
    expect(result[2].rate).toBe(300);
  });

  it("returns base rates when storeId is null", () => {
    const rateMap = new Map<number, number>([[1, 999]]);
    const result = resolveItemRates(items, null, rateMap);
    expect(result[0].rate).toBe(100);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: validation
// ──────────────────────────────────────────────────────────────────────────────

describe("validateItemCreate", () => {
  it("accepts valid payload", () => {
    expect(validateItemCreate({ description: "Sand", unitId: 1 })).toBeNull();
  });

  it("rejects missing description", () => {
    const err = validateItemCreate({ unitId: 1 });
    expect(err).toBe("Item description is required");
  });

  it("rejects empty description", () => {
    const err = validateItemCreate({ description: "", unitId: 1 });
    expect(err).toBe("Item description is required");
  });

  it("rejects missing unitId", () => {
    const err = validateItemCreate({ description: "Sand" });
    expect(err).toBe("Valid unitId is required");
  });

  it("rejects non-number unitId", () => {
    const err = validateItemCreate({ description: "Sand", unitId: "abc" });
    expect(err).toBe("Valid unitId is required");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: rate sanitization
// ──────────────────────────────────────────────────────────────────────────────

describe("sanitizeItemInput", () => {
  it("uses provided rate when valid", () => {
    const result = sanitizeItemInput({ description: "Sand", unitId: 1, rate: 150, gstPercent: 5 });
    expect(result.rate).toBe(150);
    expect(result.gstPercent).toBe(5);
  });

  it("defaults NaN rate to 0", () => {
    const result = sanitizeItemInput({ description: "Sand", unitId: 1, rate: NaN });
    expect(result.rate).toBe(0);
  });

  it("defaults Infinity rate to 0", () => {
    const result = sanitizeItemInput({ description: "Sand", unitId: 1, rate: Infinity });
    expect(result.rate).toBe(0);
  });

  it("defaults missing rate to 0", () => {
    const result = sanitizeItemInput({ description: "Sand", unitId: 1 });
    expect(result.rate).toBe(0);
    expect(result.gstPercent).toBe(0);
  });
});
