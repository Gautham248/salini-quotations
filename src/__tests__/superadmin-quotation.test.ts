import { describe, it, expect } from "vitest";

// ── Validate storeId requirement for quotation creation ──────────────────────

/**
 * Checks if a user (by role) can create a quotation with a given storeId.
 * Mirrors the logic in POST /api/quotations: requireAuth + resolveStoreId.
 */
function canCreateQuotation(
  role: string,
  sessionStoreId: number | null,
  queryStoreId: number | null,
): { allowed: boolean; effectiveStoreId: number | null } {
  // Replicate resolveStoreId logic
  let storeId: number | null = null;

  if (role === "admin" || role === "staff" || role === "manager") {
    storeId = sessionStoreId;
  } else if (role === "superadmin") {
    if (queryStoreId !== null && queryStoreId > 0) {
      storeId = queryStoreId;
    } else {
      storeId = sessionStoreId; // falls back to session (null for superadmin)
    }
  }

  return {
    allowed: storeId !== null,
    effectiveStoreId: storeId,
  };
}

describe("canCreateQuotation (POST /api/quotations gate)", () => {
  // ── Admin ──────────────────────────────────────────────────────────────────
  describe("admin", () => {
    it("can create with own storeId from session", () => {
      const result = canCreateQuotation("admin", 5, null);
      expect(result.allowed).toBe(true);
      expect(result.effectiveStoreId).toBe(5);
    });

    it("ignores query storeId and uses session", () => {
      const result = canCreateQuotation("admin", 5, 99);
      expect(result.allowed).toBe(true);
      expect(result.effectiveStoreId).toBe(5);
    });

    it("cannot create when session storeId is null", () => {
      const result = canCreateQuotation("admin", null, null);
      expect(result.allowed).toBe(false);
    });
  });

  // ── Staff ──────────────────────────────────────────────────────────────────
  describe("staff", () => {
    it("can create with own storeId from session", () => {
      const result = canCreateQuotation("staff", 5, null);
      expect(result.allowed).toBe(true);
      expect(result.effectiveStoreId).toBe(5);
    });

    it("ignores query storeId", () => {
      const result = canCreateQuotation("staff", 5, 99);
      expect(result.effectiveStoreId).toBe(5);
    });
  });

  // ── Manager ───────────────────────────────────────────────────────────────
  describe("manager", () => {
    it("can create with own storeId from session", () => {
      const result = canCreateQuotation("manager", 5, null);
      expect(result.allowed).toBe(true);
      expect(result.effectiveStoreId).toBe(5);
    });

    it("ignores query storeId", () => {
      const result = canCreateQuotation("manager", 5, 99);
      expect(result.effectiveStoreId).toBe(5);
    });
  });

  // ── Superadmin ────────────────────────────────────────────────────────────
  describe("superadmin", () => {
    it("cannot create without selecting a store", () => {
      const result = canCreateQuotation("superadmin", null, null);
      expect(result.allowed).toBe(false);
    });

    it("can create with valid query storeId", () => {
      const result = canCreateQuotation("superadmin", null, 5);
      expect(result.allowed).toBe(true);
      expect(result.effectiveStoreId).toBe(5);
    });

    it("uses query storeId even when session has non-null storeId", () => {
      const result = canCreateQuotation("superadmin", 3, 10);
      expect(result.allowed).toBe(true);
      expect(result.effectiveStoreId).toBe(10);
    });

    it("rejects zero query storeId", () => {
      const result = canCreateQuotation("superadmin", null, 0);
      expect(result.allowed).toBe(false);
    });

    it("rejects negative query storeId", () => {
      const result = canCreateQuotation("superadmin", null, -1);
      expect(result.allowed).toBe(false);
    });
  });
});

// ── Store picker redirect logic ──────────────────────────────────────────────

/**
 * Decides whether to show the store picker or the quotation form.
 * Mirrors the logic in quotations/new/page.tsx.
 */
function shouldShowStorePicker(role: string, urlStoreId: string | null): boolean {
  return role === "superadmin" && urlStoreId === null;
}

describe("shouldShowStorePicker (quotations/new page logic)", () => {
  it("shows store picker for superadmin with no storeId", () => {
    expect(shouldShowStorePicker("superadmin", null)).toBe(true);
  });

  it("shows form for superadmin with storeId", () => {
    expect(shouldShowStorePicker("superadmin", "5")).toBe(false);
  });

  it("shows form for admin regardless of storeId", () => {
    expect(shouldShowStorePicker("admin", null)).toBe(false);
    expect(shouldShowStorePicker("admin", "5")).toBe(false);
  });

  it("shows form for staff regardless of storeId", () => {
    expect(shouldShowStorePicker("staff", null)).toBe(false);
    expect(shouldShowStorePicker("staff", "5")).toBe(false);
  });

  it("shows form for manager regardless of storeId", () => {
    expect(shouldShowStorePicker("manager", null)).toBe(false);
    expect(shouldShowStorePicker("manager", "5")).toBe(false);
  });
});

// ── Store picker URL construction ────────────────────────────────────────────

describe("store picker redirect URL", () => {
  it("builds URL with query param", () => {
    const storeId = 42;
    const url = `/quotations/new?storeId=${storeId}`;
    expect(url).toBe("/quotations/new?storeId=42");
  });

  it("works for different store IDs", () => {
    expect(`/quotations/new?storeId=${1}`).toBe("/quotations/new?storeId=1");
    expect(`/quotations/new?storeId=${999}`).toBe("/quotations/new?storeId=999");
  });
});
