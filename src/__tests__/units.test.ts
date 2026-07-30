import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/units/route.ts
// ──────────────────────────────────────────────────────────────────────────────

function validateUnitName(name: unknown): string | { error: string; status: number } {
  if (!name || typeof name !== "string" || !name.trim()) {
    return { error: "Unit name is required", status: 400 };
  }
  return name.trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/units/conversions/route.ts — conversion logic
// ──────────────────────────────────────────────────────────────────────────────

interface ConversionInput {
  fromUnitId: number;
  toUnitId: number;
  factor: number;
}

function validateConversion(input: ConversionInput): string | null {
  if (!input.fromUnitId || !input.toUnitId) return "Both units are required";
  if (input.fromUnitId === input.toUnitId) return "Cannot convert to the same unit";
  if (!input.factor || input.factor <= 0) return "Factor must be a positive number";
  if (!Number.isFinite(input.factor)) return "Factor must be a finite number";
  return null;
}

function resolveConversion(
  fromUnitId: number,
  toUnitId: number,
  conversions: Array<{ fromUnitId: number; toUnitId: number; factor: number }>,
): number | null {
  // Direct conversion
  const direct = conversions.find(
    (c) => c.fromUnitId === fromUnitId && c.toUnitId === toUnitId,
  );
  if (direct) return direct.factor;

  // Reverse conversion
  const reverse = conversions.find(
    (c) => c.fromUnitId === toUnitId && c.toUnitId === fromUnitId,
  );
  if (reverse) return 1 / reverse.factor;

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests: unit name validation
// ──────────────────────────────────────────────────────────────────────────────

describe("validateUnitName", () => {
  it("accepts valid name", () => {
    expect(validateUnitName("Kilogram")).toBe("Kilogram");
  });

  it("trims whitespace", () => {
    expect(validateUnitName("  Ton  ")).toBe("Ton");
  });

  it("rejects empty string", () => {
    const result = validateUnitName("");
    expect(result).toEqual({ error: "Unit name is required", status: 400 });
  });

  it("rejects whitespace-only", () => {
    const result = validateUnitName("   ");
    expect(result).toEqual({ error: "Unit name is required", status: 400 });
  });

  it("rejects null", () => {
    const result = validateUnitName(null);
    expect(result).toEqual({ error: "Unit name is required", status: 400 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: conversion validation
// ──────────────────────────────────────────────────────────────────────────────

describe("validateConversion", () => {
  it("accepts valid conversion", () => {
    expect(validateConversion({ fromUnitId: 1, toUnitId: 2, factor: 1000 })).toBeNull();
  });

  it("rejects missing fromUnitId", () => {
    const err = validateConversion({ fromUnitId: 0, toUnitId: 2, factor: 1000 });
    expect(err).toBe("Both units are required");
  });

  it("rejects missing toUnitId", () => {
    const err = validateConversion({ fromUnitId: 1, toUnitId: 0, factor: 1000 });
    expect(err).toBe("Both units are required");
  });

  it("rejects same unit", () => {
    const err = validateConversion({ fromUnitId: 1, toUnitId: 1, factor: 1 });
    expect(err).toBe("Cannot convert to the same unit");
  });

  it("rejects zero factor", () => {
    const err = validateConversion({ fromUnitId: 1, toUnitId: 2, factor: 0 });
    expect(err).toBe("Factor must be a positive number");
  });

  it("rejects negative factor", () => {
    const err = validateConversion({ fromUnitId: 1, toUnitId: 2, factor: -5 });
    expect(err).toBe("Factor must be a positive number");
  });

  it("rejects NaN factor", () => {
    const err = validateConversion({ fromUnitId: 1, toUnitId: 2, factor: NaN });
    expect(err).toBe("Factor must be a positive number");
  });

  it("rejects Infinity factor", () => {
    const err = validateConversion({ fromUnitId: 1, toUnitId: 2, factor: Infinity });
    expect(err).toBe("Factor must be a finite number");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: conversion lookup
// ──────────────────────────────────────────────────────────────────────────────

describe("resolveConversion", () => {
  const conversions = [
    { fromUnitId: 1, toUnitId: 2, factor: 1000 },  // 1→2 = 1000
    { fromUnitId: 1, toUnitId: 3, factor: 0.001 }, // 1→3 = 0.001
    { fromUnitId: 4, toUnitId: 5, factor: 2.5 },   // 4→5 = 2.5
  ];

  it("returns direct conversion factor", () => {
    expect(resolveConversion(1, 2, conversions)).toBe(1000);
  });

  it("returns reverse conversion (1/factor)", () => {
    const rev = resolveConversion(2, 1, conversions);
    expect(rev).toBeCloseTo(0.001);
  });

  it("returns null for unknown conversion", () => {
    expect(resolveConversion(1, 99, conversions)).toBeNull();
  });

  it("returns null for empty conversions list", () => {
    expect(resolveConversion(1, 2, [])).toBeNull();
  });

  it("works for other defined conversions", () => {
    expect(resolveConversion(4, 5, conversions)).toBe(2.5);
    expect(resolveConversion(5, 4, conversions)).toBeCloseTo(0.4);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: unit access control
// ──────────────────────────────────────────────────────────────────────────────

describe("unit access control", () => {
  const ADMIN_ROLES = new Set(["admin", "superadmin", "manager"]);

  function canManageUnits(role: string): boolean {
    return ADMIN_ROLES.has(role);
  }

  it("admin can manage units", () => {
    expect(canManageUnits("admin")).toBe(true);
  });

  it("superadmin can manage units", () => {
    expect(canManageUnits("superadmin")).toBe(true);
  });

  it("manager can manage units", () => {
    expect(canManageUnits("manager")).toBe(true);
  });

  it("staff cannot manage units", () => {
    expect(canManageUnits("staff")).toBe(false);
  });
});
