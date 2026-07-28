import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted core logic from src/app/api/quotations/[id]/route.ts getQuotation()
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns whether a quotation is visible to the current requester based
 * on store-scoping. Extracted from getQuotation() in [id]/route.ts.
 *
 * - superadmin: sees all quotations in all stores
 * - admin/staff (storeId !== null): only sees quotations in their own store
 * - storeId === null (should not happen for non-superadmin): allows access
 */
function canAccessQuotation(
  quotationStoreId: number,
  resolvedStoreId: number | null,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (resolvedStoreId === null) return true;
  return quotationStoreId === resolvedStoreId;
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/users/route.ts POST handler
// ──────────────────────────────────────────────────────────────────────────────

interface ResolveUserCreateParams {
  requesterRole: string;
  requesterStoreId: number | null;
  bodyStoreId?: number | null;
  bodyRole?: string;
}

/** Returns { storeId, role } that should be used for the create. */
function resolveUserCreate(params: ResolveUserCreateParams): {
  storeId: number | null;
  role: string;
  error?: string;
} {
  let storeId: number | null = null;
  let role = params.bodyRole || "staff";

  if (params.requesterRole === "superadmin") {
    storeId = params.bodyStoreId ?? null;
    if (role === "superadmin") storeId = null;
  } else {
    // Admin: forced to own store, can only create admin/staff
    storeId = params.requesterStoreId;
    if (role !== "admin" && role !== "staff") role = "staff";
  }

  if (!storeId && role !== "superadmin") {
    return { storeId: null, role, error: "storeId is required for non-superadmin users" };
  }

  return { storeId, role };
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/users/[id]/route.ts PATCH handler
// ──────────────────────────────────────────────────────────────────────────────

interface CrossStoreCheckParams {
  requesterRole: string;
  requesterStoreId: number | null;
  targetStoreId: number | null;
}

/** Returns null if access is OK, or { status, error } if denied. */
function crossStoreGuard(params: CrossStoreCheckParams): {
  status: number;
  error: string;
} | null {
  if (params.requesterRole !== "superadmin" && params.targetStoreId !== params.requesterStoreId) {
    return { status: 404, error: "Not found" };
  }
  return null;
}

interface UpdateRoleCheckParams {
  requesterRole: string;
  targetRole: string;
}

function updateRoleGuard(params: UpdateRoleCheckParams): {
  status: number;
  error: string;
} | null {
  if (params.requesterRole !== "superadmin" && params.targetRole === "superadmin") {
    return { status: 403, error: "Forbidden: only superadmin can assign superadmin role" };
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests: quotation store-scoping (canAccessQuotation)
// ──────────────────────────────────────────────────────────────────────────────

describe("quotation store-scoping (canAccessQuotation)", () => {
  describe("admin", () => {
    // Admin with storeId=5
    it("allows access to a quotation in own store (5)", () => {
      expect(canAccessQuotation(5, 5, false)).toBe(true);
    });

    it("denies access to a quotation in a different store (3)", () => {
      expect(canAccessQuotation(3, 5, false)).toBe(false);
    });

    it("denies access when resolved storeId is different (99)", () => {
      expect(canAccessQuotation(5, 99, false)).toBe(false);
    });
  });

  describe("staff", () => {
    it("allows access to own store's quotation", () => {
      expect(canAccessQuotation(7, 7, false)).toBe(true);
    });

    it("denies access to another store's quotation", () => {
      expect(canAccessQuotation(7, 10, false)).toBe(false);
    });
  });

  describe("superadmin", () => {
    it("allows access to any store's quotation", () => {
      expect(canAccessQuotation(5, 5, true)).toBe(true);
      expect(canAccessQuotation(42, null, true)).toBe(true);
      expect(canAccessQuotation(99, 1, true)).toBe(true);
    });

    it("allows access regardless of resolved storeId", () => {
      // superadmin with storeId=null
      expect(canAccessQuotation(5, null, true)).toBe(true);
      // superadmin who happens to have a non-null storeId
      expect(canAccessQuotation(9, 5, true)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("allows access when resolved storeId is null (should not happen for admin/staff)", () => {
      expect(canAccessQuotation(5, null, false)).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: user creation storeId enforcement (resolveUserCreate)
// ──────────────────────────────────────────────────────────────────────────────

describe("user creation storeId enforcement", () => {
  describe("admin creating users", () => {
    it("forces storeId to requester's own store, ignoring body", () => {
      const result = resolveUserCreate({
        requesterRole: "admin",
        requesterStoreId: 5,
        bodyStoreId: 99, // ← attacker tries to create user in another store
        bodyRole: "staff",
      });
      expect(result.storeId).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it("forces storeId even when no body storeId provided", () => {
      const result = resolveUserCreate({
        requesterRole: "admin",
        requesterStoreId: 5,
        bodyRole: "staff",
      });
      expect(result.storeId).toBe(5);
    });

    it("defaults role to staff when body has an invalid role", () => {
      const result = resolveUserCreate({
        requesterRole: "admin",
        requesterStoreId: 5,
        bodyRole: "superadmin", // ← attacker
      });
      expect(result.role).toBe("staff");
      expect(result.storeId).toBe(5);
    });

    it("allows admin to create another admin in own store", () => {
      const result = resolveUserCreate({
        requesterRole: "admin",
        requesterStoreId: 5,
        bodyRole: "admin",
      });
      expect(result.role).toBe("admin");
      expect(result.storeId).toBe(5);
    });

    it("allows admin to create staff in own store", () => {
      const result = resolveUserCreate({
        requesterRole: "admin",
        requesterStoreId: 5,
        bodyRole: "staff",
      });
      expect(result.role).toBe("staff");
      expect(result.storeId).toBe(5);
    });

    it("defaults missing role to staff", () => {
      const result = resolveUserCreate({
        requesterRole: "admin",
        requesterStoreId: 5,
      });
      expect(result.role).toBe("staff");
    });
  });

  describe("superadmin creating users", () => {
    it("allows creating a user in any store", () => {
      const result = resolveUserCreate({
        requesterRole: "superadmin",
        requesterStoreId: null,
        bodyStoreId: 99,
        bodyRole: "admin",
      });
      expect(result.storeId).toBe(99);
      expect(result.role).toBe("admin");
    });

    it("forces storeId=null when role is superadmin", () => {
      const result = resolveUserCreate({
        requesterRole: "superadmin",
        requesterStoreId: null,
        bodyStoreId: 99, // ← body tries to give superadmin a store
        bodyRole: "superadmin",
      });
      expect(result.storeId).toBeNull();
      expect(result.role).toBe("superadmin");
    });

    it("allows creating staff without store if role is superadmin", () => {
      // Body says staff but no storeId — should error
      const result = resolveUserCreate({
        requesterRole: "superadmin",
        requesterStoreId: null,
        bodyRole: "staff",
      });
      expect(result.error).toBeDefined();
    });
  });

  describe("manager creating users", () => {
    it("is store-scoped — forced to own store, ignores body storeId", () => {
      const result = resolveUserCreate({
        requesterRole: "manager",
        requesterStoreId: 5,
        bodyStoreId: 99, // ← attacker
        bodyRole: "staff",
      });
      expect(result.storeId).toBe(5);
    });

    it("defaults invalid role to staff", () => {
      const result = resolveUserCreate({
        requesterRole: "manager",
        requesterStoreId: 5,
        bodyRole: "superadmin", // ← manager cannot create superadmins
      });
      expect(result.role).toBe("staff");
    });

    it("can create admin in own store", () => {
      const result = resolveUserCreate({
        requesterRole: "manager",
        requesterStoreId: 5,
        bodyRole: "admin",
      });
      expect(result.role).toBe("admin");
      expect(result.storeId).toBe(5);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: cross-store PATCH guard
// ──────────────────────────────────────────────────────────────────────────────

describe("cross-store user PATCH guard", () => {
  describe("admin", () => {
    it("allows PATCH on user in own store", () => {
      expect(
        crossStoreGuard({
          requesterRole: "admin",
          requesterStoreId: 5,
          targetStoreId: 5,
        }),
      ).toBeNull();
    });

    it("denies PATCH on user in different store — returns 404", () => {
      const result = crossStoreGuard({
        requesterRole: "admin",
        requesterStoreId: 5,
        targetStoreId: 99,
      });
      expect(result).not.toBeNull();
      expect(result!.status).toBe(404);
      expect(result!.error).toBe("Not found");
    });

    it("denies PATCH when target storeId is null (may be superadmin user)", () => {
      const result = crossStoreGuard({
        requesterRole: "admin",
        requesterStoreId: 5,
        targetStoreId: null,
      });
      expect(result).not.toBeNull();
      expect(result!.status).toBe(404);
    });
  });

  describe("superadmin", () => {
    it("allows PATCH on user in any store", () => {
      expect(
        crossStoreGuard({
          requesterRole: "superadmin",
          requesterStoreId: null,
          targetStoreId: 99,
        }),
      ).toBeNull();
    });

    it("allows PATCH on user with null storeId (other superadmin)", () => {
      expect(
        crossStoreGuard({
          requesterRole: "superadmin",
          requesterStoreId: null,
          targetStoreId: null,
        }),
      ).toBeNull();
    });
  });

  describe("manager", () => {
    it("denies PATCH on user in different store", () => {
      const result = crossStoreGuard({
        requesterRole: "manager",
        requesterStoreId: 5,
        targetStoreId: 99,
      });
      expect(result).not.toBeNull();
      expect(result!.status).toBe(404);
    });

    it("allows PATCH on user in own store", () => {
      expect(
        crossStoreGuard({
          requesterRole: "manager",
          requesterStoreId: 5,
          targetStoreId: 5,
        }),
      ).toBeNull();
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: role promotion guard
// ──────────────────────────────────────────────────────────────────────────────

describe("role promotion guard (admin cannot create superadmin)", () => {
  it("allows superadmin to promote anyone to superadmin", () => {
    expect(
      updateRoleGuard({
        requesterRole: "superadmin",
        targetRole: "superadmin",
      }),
    ).toBeNull();
  });

  it("denies manager from promoting staff to superadmin", () => {
    const result = updateRoleGuard({
      requesterRole: "manager",
      targetRole: "superadmin",
    });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("denies admin from promoting staff to superadmin", () => {
    const result = updateRoleGuard({
      requesterRole: "admin",
      targetRole: "superadmin",
    });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("allows admin to change role to staff", () => {
    expect(
      updateRoleGuard({ requesterRole: "admin", targetRole: "staff" }),
    ).toBeNull();
  });

  it("allows admin to change role to admin", () => {
    expect(
      updateRoleGuard({ requesterRole: "admin", targetRole: "admin" }),
    ).toBeNull();
  });
});
