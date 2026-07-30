import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/stores/route.ts
// ──────────────────────────────────────────────────────────────────────────────

function validateStoreName(name: unknown): string | { error: string; status: number } {
  if (!name || typeof name !== "string" || !name.trim()) {
    return { error: "Store name is required", status: 400 };
  }
  return name.trim();
}

function generateSlug(name: string, providedSlug?: string): string {
  if (providedSlug && providedSlug.trim()) return providedSlug.trim();
  return name.toLowerCase().replace(/\s+/g, "-");
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/stores/[id]/route.ts
// ──────────────────────────────────────────────────────────────────────────────

function validateStoreId(id: string): number | { error: string; status: number } {
  const num = parseInt(id);
  if (isNaN(num) || num <= 0) return { error: "Invalid ID", status: 400 };
  return num;
}

function toggleIsActive(currentIsActive: boolean): boolean {
  return !currentIsActive;
}

function resolveStoreDeleteOptions(body: Record<string, unknown>) {
  return {
    deleteStaff: Boolean(body.deleteStaff),
    deleteQuotations: Boolean(body.deleteQuotations),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe("store name validation", () => {
  it("accepts valid name", () => {
    expect(validateStoreName("Salini Pala")).toBe("Salini Pala");
  });

  it("trims whitespace", () => {
    expect(validateStoreName("  Store A  ")).toBe("Store A");
  });

  it("rejects empty string", () => {
    const result = validateStoreName("");
    expect(result).toEqual({ error: "Store name is required", status: 400 });
  });

  it("rejects whitespace-only string", () => {
    const result = validateStoreName("   ");
    expect(result).toEqual({ error: "Store name is required", status: 400 });
  });

  it("rejects null", () => {
    const result = validateStoreName(null);
    expect(result).toEqual({ error: "Store name is required", status: 400 });
  });

  it("rejects undefined", () => {
    const result = validateStoreName(undefined);
    expect(result).toEqual({ error: "Store name is required", status: 400 });
  });

  it("rejects non-string types", () => {
    const result = validateStoreName(123);
    expect(result).toEqual({ error: "Store name is required", status: 400 });
  });
});

describe("store slug generation", () => {
  it("generates slug from name", () => {
    expect(generateSlug("Salini Pala")).toBe("salini-pala");
  });

  it("uses provided slug when given", () => {
    expect(generateSlug("Salini Pala", "salini-main")).toBe("salini-main");
  });

  it("trims whitespace from provided slug", () => {
    expect(generateSlug("Salini Pala", "  my-slug  ")).toBe("my-slug");
  });

  it("handles single word name", () => {
    expect(generateSlug("Salini")).toBe("salini");
  });

  it("handles name with spaces and special characters that slugify simply", () => {
    expect(generateSlug("Store #1")).toBe("store-#1");
  });
});

describe("store ID validation", () => {
  it("parses valid numeric ID", () => {
    expect(validateStoreId("5")).toBe(5);
  });

  it("parses zero-prefixed ID", () => {
    expect(validateStoreId("042")).toBe(42);
  });

  it("rejects NaN", () => {
    const result = validateStoreId("abc");
    expect(result).toEqual({ error: "Invalid ID", status: 400 });
  });

  it("rejects zero", () => {
    const result = validateStoreId("0");
    expect(result).toEqual({ error: "Invalid ID", status: 400 });
  });

  it("rejects negative", () => {
    const result = validateStoreId("-5");
    expect(result).toEqual({ error: "Invalid ID", status: 400 });
  });

  it("rejects empty string", () => {
    const result = validateStoreId("");
    expect(result).toEqual({ error: "Invalid ID", status: 400 });
  });
});

describe("toggleIsActive", () => {
  it("toggles true to false", () => {
    expect(toggleIsActive(true)).toBe(false);
  });

  it("toggles false to true", () => {
    expect(toggleIsActive(false)).toBe(true);
  });
});

describe("store delete options", () => {
  it("defaults both deleteStaff and deleteQuotations to false", () => {
    const result = resolveStoreDeleteOptions({});
    expect(result.deleteStaff).toBe(false);
    expect(result.deleteQuotations).toBe(false);
  });

  it("sets both to true when explicitly passed", () => {
    const result = resolveStoreDeleteOptions({ deleteStaff: true, deleteQuotations: true });
    expect(result.deleteStaff).toBe(true);
    expect(result.deleteQuotations).toBe(true);
  });

  it("handles truthy non-boolean values", () => {
    const result = resolveStoreDeleteOptions({ deleteStaff: "true", deleteQuotations: undefined });
    expect(result.deleteStaff).toBe(true);
    expect(result.deleteQuotations).toBe(false);
  });
});

describe("store access control (extracted guard logic)", () => {
  // GET/PUT/PATCH: requireManager() => superadmin | manager
  // POST/DELETE: requireSuperAdmin() => superadmin only

  const MANAGER_ROLES = new Set(["superadmin", "manager"]);
  const SUPERADMIN_ROLES = new Set(["superadmin"]);

  function canAccessStore(role: string, operation: "read" | "write" | "delete"): boolean {
    if (operation === "delete") return SUPERADMIN_ROLES.has(role);
    return MANAGER_ROLES.has(role);
  }

  it("superadmin can read, write, delete stores", () => {
    expect(canAccessStore("superadmin", "read")).toBe(true);
    expect(canAccessStore("superadmin", "write")).toBe(true);
    expect(canAccessStore("superadmin", "delete")).toBe(true);
  });

  it("manager can read and write but not delete stores", () => {
    expect(canAccessStore("manager", "read")).toBe(true);
    expect(canAccessStore("manager", "write")).toBe(true);
    expect(canAccessStore("manager", "delete")).toBe(false);
  });

  it("admin cannot access store management at all", () => {
    expect(canAccessStore("admin", "read")).toBe(false);
    expect(canAccessStore("admin", "write")).toBe(false);
    expect(canAccessStore("admin", "delete")).toBe(false);
  });

  it("staff cannot access store management at all", () => {
    expect(canAccessStore("staff", "read")).toBe(false);
    expect(canAccessStore("staff", "write")).toBe(false);
    expect(canAccessStore("staff", "delete")).toBe(false);
  });
});
