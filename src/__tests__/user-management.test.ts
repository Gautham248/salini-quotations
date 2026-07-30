import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/users/route.ts — POST handler
// ──────────────────────────────────────────────────────────────────────────────

function resolveUserPayload(params: {
  requesterRole: string;
  requesterStoreId: number | null;
  bodyRole?: string;
  bodyStoreId?: number | null;
}) {
  let storeId: number | null = null;
  let role = params.bodyRole || "staff";

  if (params.requesterRole === "superadmin") {
    storeId = params.bodyStoreId ?? null;
    if (role === "superadmin") storeId = null;
  } else {
    storeId = params.requesterStoreId;
    if (role !== "admin" && role !== "staff") role = "staff";
  }

  return { storeId, role };
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/users/route.ts — validation
// ──────────────────────────────────────────────────────────────────────────────

function validateUserPayload(username: unknown, password: unknown): string | null {
  if (!username || typeof username !== "string" || !username.trim()) {
    return "Username is required";
  }
  if (!password || typeof password !== "string" || password.length < 4) {
    return "Password must be at least 4 characters";
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/users/route.ts — GET handler scoping
// ──────────────────────────────────────────────────────────────────────────────

function getUserListFilter(params: {
  requesterRole: string;
  requesterStoreId: number | null;
  filterStoreId?: string;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (params.requesterRole === "superadmin") {
    if (params.filterStoreId) {
      const parsed = parseInt(params.filterStoreId);
      if (!isNaN(parsed)) where.storeId = parsed;
    }
  } else {
    where.storeId = params.requesterStoreId;
  }
  return where;
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/users/[id]/route.ts — PATCH handler
// ──────────────────────────────────────────────────────────────────────────────

function selfEditGuard(requesterId: number, targetId: number): boolean {
  return targetId === requesterId;
}

function crossStoreEditGuard(
  requesterRole: string,
  requesterStoreId: number | null,
  targetStoreId: number | null,
): boolean {
  if (requesterRole === "superadmin") return true;
  return targetStoreId === requesterStoreId;
}

function rolePromotionGuard(requesterRole: string, targetRole: string): boolean {
  if (requesterRole === "superadmin") return true;
  return targetRole !== "superadmin";
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/users/[id]/route.ts — DELETE handler
// ──────────────────────────────────────────────────────────────────────────────

function userDeleteGuard(params: {
  requesterRole: string;
  requesterId: number;
  targetId: number;
  targetRole: string;
  targetStoreId: number | null;
  requesterStoreId: number | null;
}): string | null {
  // Manager/staff cannot delete
  if (params.requesterRole !== "admin" && params.requesterRole !== "superadmin") {
    return "Forbidden: User deletion is reserved for Admins and Superadmins";
  }

  // Self-deletion
  if (params.targetId === params.requesterId) {
    return "Cannot delete own account";
  }

  // Cross-store
  if (params.requesterRole !== "superadmin" && params.targetStoreId !== params.requesterStoreId) {
    return "Not found";
  }

  // Admin cannot delete superadmin
  if (params.requesterRole !== "superadmin" && params.targetRole === "superadmin") {
    return "Forbidden: Cannot delete superadmin account";
  }

  return null; // allowed
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests: user payload resolution
// ──────────────────────────────────────────────────────────────────────────────

describe("resolveUserPayload", () => {
  // ── Admin ──
  describe("admin creating users", () => {
    it("forces storeId to their own store", () => {
      const result = resolveUserPayload({ requesterRole: "admin", requesterStoreId: 5, bodyStoreId: 99, bodyRole: "staff" });
      expect(result.storeId).toBe(5);
      expect(result.role).toBe("staff");
    });

    it("defaults role to staff when no role provided", () => {
      const result = resolveUserPayload({ requesterRole: "admin", requesterStoreId: 5 });
      expect(result.role).toBe("staff");
    });

    it("clamps invalid role to staff", () => {
      const result = resolveUserPayload({ requesterRole: "admin", requesterStoreId: 5, bodyRole: "superadmin" });
      expect(result.role).toBe("staff");
    });

    it("allows creating admin in own store", () => {
      const result = resolveUserPayload({ requesterRole: "admin", requesterStoreId: 5, bodyRole: "admin" });
      expect(result.role).toBe("admin");
    });
  });

  // ── Superadmin ──
  describe("superadmin creating users", () => {
    it("can create user in any store", () => {
      const result = resolveUserPayload({ requesterRole: "superadmin", requesterStoreId: null, bodyStoreId: 99, bodyRole: "admin" });
      expect(result.storeId).toBe(99);
      expect(result.role).toBe("admin");
    });

    it("forces storeId to null for superadmin role", () => {
      const result = resolveUserPayload({ requesterRole: "superadmin", requesterStoreId: null, bodyStoreId: 5, bodyRole: "superadmin" });
      expect(result.storeId).toBeNull();
      expect(result.role).toBe("superadmin");
    });

    it("creates staff without storeId", () => {
      const result = resolveUserPayload({ requesterRole: "superadmin", requesterStoreId: null, bodyRole: "staff" });
      expect(result.storeId).toBeNull();
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: user validation
// ──────────────────────────────────────────────────────────────────────────────

describe("validateUserPayload", () => {
  it("accepts valid username and password", () => {
    expect(validateUserPayload("john", "pass1234")).toBeNull();
  });

  it("rejects empty username", () => {
    expect(validateUserPayload("", "pass1234")).toBe("Username is required");
  });

  it("rejects whitespace-only username", () => {
    expect(validateUserPayload("   ", "pass1234")).toBe("Username is required");
  });

  it("rejects null username", () => {
    expect(validateUserPayload(null, "pass1234")).toBe("Username is required");
  });

  it("rejects short password", () => {
    expect(validateUserPayload("john", "ab")).toBe("Password must be at least 4 characters");
  });

  it("rejects empty password", () => {
    expect(validateUserPayload("john", "")).toBe("Password must be at least 4 characters");
  });

  it("accepts exactly 4 character password", () => {
    expect(validateUserPayload("john", "abcd")).toBeNull();
  });

  it("rejects non-string password", () => {
    expect(validateUserPayload("john", 12345)).toBe("Password must be at least 4 characters");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: user list scoping
// ──────────────────────────────────────────────────────────────────────────────

describe("getUserListFilter", () => {
  it("superadmin sees all users when no storeId filter", () => {
    const where = getUserListFilter({ requesterRole: "superadmin", requesterStoreId: null });
    expect(where.storeId).toBeUndefined();
  });

  it("superadmin can filter by storeId", () => {
    const where = getUserListFilter({ requesterRole: "superadmin", requesterStoreId: null, filterStoreId: "5" });
    expect(where.storeId).toBe(5);
  });

  it("superadmin ignores NaN storeId filter", () => {
    const where = getUserListFilter({ requesterRole: "superadmin", requesterStoreId: null, filterStoreId: "abc" });
    expect(where.storeId).toBeUndefined();
  });

  it("admin always sees only own store users", () => {
    const where = getUserListFilter({ requesterRole: "admin", requesterStoreId: 5, filterStoreId: "99" });
    expect(where.storeId).toBe(5); // ignores filterStoreId
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: user edit guards
// ──────────────────────────────────────────────────────────────────────────────

describe("selfEditGuard", () => {
  it("blocks editing own account", () => {
    expect(selfEditGuard(5, 5)).toBe(true);
  });

  it("allows editing other accounts", () => {
    expect(selfEditGuard(5, 7)).toBe(false);
  });
});

describe("crossStoreEditGuard", () => {
  it("superadmin can edit any store's user", () => {
    expect(crossStoreEditGuard("superadmin", null, 99)).toBe(true);
  });

  it("admin can edit users in own store", () => {
    expect(crossStoreEditGuard("admin", 5, 5)).toBe(true);
  });

  it("admin cannot edit users in different store", () => {
    expect(crossStoreEditGuard("admin", 5, 99)).toBe(false);
  });

  it("manager can edit users in own store", () => {
    expect(crossStoreEditGuard("manager", 5, 5)).toBe(true);
  });
});

describe("rolePromotionGuard", () => {
  it("superadmin can promote to superadmin", () => {
    expect(rolePromotionGuard("superadmin", "superadmin")).toBe(true);
  });

  it("admin cannot promote to superadmin", () => {
    expect(rolePromotionGuard("admin", "superadmin")).toBe(false);
  });

  it("admin can change role to staff", () => {
    expect(rolePromotionGuard("admin", "staff")).toBe(true);
  });

  it("manager cannot promote to superadmin", () => {
    expect(rolePromotionGuard("manager", "superadmin")).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests: user delete guard
// ──────────────────────────────────────────────────────────────────────────────

describe("userDeleteGuard", () => {
  function makeParams(overrides: Partial<{
    requesterRole: string; requesterId: number; targetId: number;
    targetRole: string; targetStoreId: number | null; requesterStoreId: number | null;
  }> = {}) {
    return {
      requesterRole: "admin", requesterId: 1, targetId: 2,
      targetRole: "staff", targetStoreId: 5, requesterStoreId: 5,
      ...overrides,
    };
  }

  it("admin can delete staff in own store", () => {
    expect(userDeleteGuard(makeParams())).toBeNull();
  });

  it("admin cannot delete superadmin", () => {
    const result = userDeleteGuard(makeParams({ targetRole: "superadmin" }));
    expect(result).toBe("Forbidden: Cannot delete superadmin account");
  });

  it("admin cannot delete users in other stores", () => {
    const result = userDeleteGuard(makeParams({ targetStoreId: 99 }));
    expect(result).toBe("Not found");
  });

  it("cannot delete own account", () => {
    const result = userDeleteGuard(makeParams({ targetId: 1, requesterId: 1 }));
    expect(result).toBe("Cannot delete own account");
  });

  it("manager cannot delete any user", () => {
    const result = userDeleteGuard(makeParams({ requesterRole: "manager" }));
    expect(result).toBe("Forbidden: User deletion is reserved for Admins and Superadmins");
  });

  it("staff cannot delete any user", () => {
    const result = userDeleteGuard(makeParams({ requesterRole: "staff" }));
    expect(result).toBe("Forbidden: User deletion is reserved for Admins and Superadmins");
  });

  it("superadmin can delete any user", () => {
    const result = userDeleteGuard(makeParams({
      requesterRole: "superadmin", targetRole: "admin",
      requesterStoreId: null,
    }));
    expect(result).toBeNull();
  });

  it("superadmin can delete superadmin accounts", () => {
    const result = userDeleteGuard(makeParams({
      requesterRole: "superadmin", targetRole: "superadmin",
      requesterStoreId: null, targetStoreId: null,
    }));
    expect(result).toBeNull();
  });
});
