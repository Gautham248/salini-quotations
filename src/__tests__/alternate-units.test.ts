import { describe, it, expect } from "vitest";

// ── Alternate units validation (mirrors API route validation logic) ────────────

interface AlternateUnitInput {
  unitId: number;
  conversionFactor: number;
}

/**
 * Validates alternate units array before saving.
 * - No duplicate unitId entries
 * - All conversionFactors > 0
 * - Cannot include the item's primary unitId
 */
function validateAlternateUnits(
  alternateUnits: AlternateUnitInput[],
  primaryUnitId: number,
): { valid: true; data: AlternateUnitInput[] } | { valid: false; error: string } {
  if (!Array.isArray(alternateUnits)) {
    return { valid: true, data: [] };
  }

  // Filter to valid entries
  const filtered = alternateUnits.filter(
    a => a.unitId > 0 && a.conversionFactor > 0 && Number.isFinite(a.conversionFactor),
  );

  // Check for primary unit collision
  const hasPrimary = filtered.some(a => a.unitId === primaryUnitId);
  if (hasPrimary) {
    return { valid: false, error: "Alternate unit cannot be the same as the primary unit" };
  }

  // Check for duplicate unitIds
  const unitIds = filtered.map(a => a.unitId);
  const uniqueIds = new Set(unitIds);
  if (unitIds.length !== uniqueIds.size) {
    return { valid: false, error: "Duplicate unit entries are not allowed" };
  }

  return { valid: true, data: filtered };
}

describe("validateAlternateUnits", () => {
  it("accepts a valid set of alternate units", () => {
    const result = validateAlternateUnits(
      [{ unitId: 2, conversionFactor: 10 }, { unitId: 3, conversionFactor: 50 }],
      1,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data).toHaveLength(2);
  });

  it("accepts empty array", () => {
    const result = validateAlternateUnits([], 1);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data).toHaveLength(0);
  });

  it("accepts non-array (undefined)", () => {
    const result = validateAlternateUnits(undefined as unknown as AlternateUnitInput[], 1);
    expect(result.valid).toBe(true);
  });

  it("rejects primary unitId in alternate units", () => {
    const result = validateAlternateUnits(
      [{ unitId: 1, conversionFactor: 2 }],
      1,
    );
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate unitIds", () => {
    const result = validateAlternateUnits(
      [
        { unitId: 2, conversionFactor: 10 },
        { unitId: 2, conversionFactor: 20 },
      ],
      1,
    );
    expect(result.valid).toBe(false);
  });

  it("filters out zero unitId entries", () => {
    const result = validateAlternateUnits(
      [
        { unitId: 0, conversionFactor: 10 },
        { unitId: 2, conversionFactor: 10 },
      ],
      1,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data).toHaveLength(1);
    if (result.valid) expect(result.data[0].unitId).toBe(2);
  });

  it("filters out zero conversion factor entries", () => {
    const result = validateAlternateUnits(
      [
        { unitId: 2, conversionFactor: 0 },
        { unitId: 3, conversionFactor: 50 },
      ],
      1,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data).toHaveLength(1);
    if (result.valid) expect(result.data[0].unitId).toBe(3);
  });

  it("filters out negative conversion factors", () => {
    const result = validateAlternateUnits(
      [{ unitId: 2, conversionFactor: -5 }],
      1,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data).toHaveLength(0);
  });

  it("filters out NaN conversion factors", () => {
    const result = validateAlternateUnits(
      [{ unitId: 2, conversionFactor: NaN }],
      1,
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data).toHaveLength(0);
  });
});

// ── Rate auto-compute (mirrors item picker logic) ─────────────────────────────

function computeAlternateRate(baseRate: number, conversionFactor: number): number {
  if (conversionFactor <= 0 || !Number.isFinite(conversionFactor)) return baseRate;
  return Math.round(baseRate * conversionFactor * 100) / 100;
}

describe("computeAlternateRate", () => {
  it("returns base rate when factor is 1", () => {
    expect(computeAlternateRate(100, 1)).toBe(100);
  });

  it("multiplies rate by conversion factor", () => {
    expect(computeAlternateRate(100, 10)).toBe(1000);
  });

  it("handles fractional factors", () => {
    expect(computeAlternateRate(100, 2.5)).toBe(250);
  });

  it("handles fractional base rates", () => {
    expect(computeAlternateRate(50.75, 10)).toBe(507.5);
  });

  it("rounds to 2 decimal places", () => {
    expect(computeAlternateRate(33.33, 3)).toBe(99.99);
  });

  it("returns base rate when factor is zero or negative", () => {
    expect(computeAlternateRate(100, 0)).toBe(100);
    expect(computeAlternateRate(100, -1)).toBe(100);
  });

  it("returns base rate when factor is NaN", () => {
    expect(computeAlternateRate(100, NaN)).toBe(100);
  });

  it("returns base rate when factor is Infinity", () => {
    expect(computeAlternateRate(100, Infinity)).toBe(100);
  });

  it("handles zero base rate", () => {
    expect(computeAlternateRate(0, 10)).toBe(0);
  });
});

// ── Items table data mapping (editFormData with alternateUnits) ───────────────

interface ApiMasterItem {
  id: number;
  description: string;
  unit: { id: number; name: string };
  unitId: number;
  rate: number;
  gstPercent: number;
  weightPerUnit: number | null;
  piecesPerUnit: number | null;
  isActive: boolean;
  categories: { category: { id: number; name: string } }[];
  alternateUnits?: Array<{
    id: number;
    unitId: number;
    unit: { id: number; name: string };
    conversionFactor: number;
  }>;
}

function mapItemToFormData(item: ApiMasterItem) {
  return {
    description: item.description,
    unitId: item.unit?.id || 0,
    rate: String(item.rate),
    gstPercent: String(item.gstPercent),
    weightPerUnit: item.weightPerUnit != null ? String(item.weightPerUnit) : "",
    piecesPerUnit: item.piecesPerUnit != null ? String(item.piecesPerUnit) : "",
    categoryIds: item.categories.map((c: { category: { id: number; name: string } }) => c.category.id),
    alternateUnits:
      item.alternateUnits?.map((a: { unitId: number; conversionFactor: number }) => ({
        unitId: a.unitId,
        conversionFactor: String(a.conversionFactor),
      })) ?? [],
  };
}

describe("mapItemToFormData (items table → form)", () => {
  const baseItem: ApiMasterItem = {
    id: 1,
    description: "UPVC Sheets",
    unit: { id: 1, name: "sqft" },
    unitId: 1,
    rate: 100,
    gstPercent: 18,
    weightPerUnit: null,
    piecesPerUnit: null,
    isActive: true,
    categories: [{ category: { id: 1, name: "Sheets" } }],
  };

  it("maps alternate units to form data with string conversion factors", () => {
    const item: ApiMasterItem = {
      ...baseItem,
      alternateUnits: [
        { id: 1, unitId: 2, unit: { id: 2, name: "Roll" }, conversionFactor: 10 },
        { id: 2, unitId: 3, unit: { id: 3, name: "Bundle" }, conversionFactor: 50.5 },
      ],
    };
    const result = mapItemToFormData(item);
    expect(result.alternateUnits).toHaveLength(2);
    expect(result.alternateUnits[0].unitId).toBe(2);
    expect(result.alternateUnits[0].conversionFactor).toBe("10");
    expect(result.alternateUnits[1].conversionFactor).toBe("50.5");
  });

  it("returns empty alternateUnits when item has none", () => {
    const result = mapItemToFormData(baseItem);
    expect(result.alternateUnits).toEqual([]);
  });

  it("preserves other form fields", () => {
    const result = mapItemToFormData(baseItem);
    expect(result.description).toBe("UPVC Sheets");
    expect(result.rate).toBe("100");
    expect(result.gstPercent).toBe("18");
    expect(result.unitId).toBe(1);
  });

  it("handles null weightPerUnit and piecesPerUnit", () => {
    const result = mapItemToFormData(baseItem);
    expect(result.weightPerUnit).toBe("");
    expect(result.piecesPerUnit).toBe("");
  });

  it("handles non-null weightPerUnit", () => {
    const result = mapItemToFormData({ ...baseItem, weightPerUnit: 1.5 });
    expect(result.weightPerUnit).toBe("1.5");
  });
});
