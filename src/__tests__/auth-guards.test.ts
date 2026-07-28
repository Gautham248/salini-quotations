import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.mockAuth }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect(${path})`);
  }),
}));

import { resolveStoreId, requireAdmin, requireSuperAdmin, requireManager, getSession } from "@/lib/auth-guards";

function session(role: string, storeId: number | null, id = 1) {
  return { user: { id, role, storeId, name: "Test", email: "test@test.com" } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getSession ───────────────────────────────────────────────────────────────
describe("getSession", () => {
  it("returns session when authenticated", async () => {
    mocks.mockAuth.mockResolvedValue(session("admin", 5));
    const s = await getSession();
    expect(s).not.toBeNull();
    expect(s!.user.role).toBe("admin");
  });

  it("returns null when not authenticated", async () => {
    mocks.mockAuth.mockResolvedValue(null);
    const s = await getSession();
    expect(s).toBeNull();
  });

  it("returns null when session has no user id", async () => {
    mocks.mockAuth.mockResolvedValue({ user: { role: "admin", storeId: 5 } });
    const s = await getSession();
    expect(s).toBeNull();
  });
});

// ── requireAdmin ─────────────────────────────────────────────────────────────
describe("requireAdmin", () => {
  it("accepts admin role", async () => {
    mocks.mockAuth.mockResolvedValue(session("admin", 5));
    const s = await requireAdmin();
    expect(s.user.role).toBe("admin");
  });

  it("accepts superadmin role", async () => {
    mocks.mockAuth.mockResolvedValue(session("superadmin", null));
    const s = await requireAdmin();
    expect(s.user.role).toBe("superadmin");
  });

  it("accepts manager role", async () => {
    mocks.mockAuth.mockResolvedValue(session("manager", null));
    const s = await requireAdmin();
    expect(s.user.role).toBe("manager");
  });

  it("rejects staff role (redirects)", async () => {
    mocks.mockAuth.mockResolvedValue(session("staff", 5));
    await expect(requireAdmin()).rejects.toThrow("redirect(/quotations)");
  });

  it("rejects unauthenticated (redirects to login)", async () => {
    mocks.mockAuth.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("redirect(/login)");
  });

  it("allows admin to read users by passing requireAdmin guard", async () => {
    mocks.mockAuth.mockResolvedValue(session("admin", 5));
    const s = await requireAdmin();
    expect(s.user.storeId).toBe(5);
  });
});

// ── requireManager ─────────────────────────────────────────────────────────
describe("requireManager", () => {
  it("accepts superadmin role", async () => {
    mocks.mockAuth.mockResolvedValue(session("superadmin", null));
    const s = await requireManager();
    expect(s.user.role).toBe("superadmin");
  });

  it("accepts manager role", async () => {
    mocks.mockAuth.mockResolvedValue(session("manager", null));
    const s = await requireManager();
    expect(s.user.role).toBe("manager");
  });

  it("rejects admin role (redirects)", async () => {
    mocks.mockAuth.mockResolvedValue(session("admin", 5));
    await expect(requireManager()).rejects.toThrow("redirect(/quotations)");
  });

  it("rejects staff role (redirects)", async () => {
    mocks.mockAuth.mockResolvedValue(session("staff", 5));
    await expect(requireManager()).rejects.toThrow("redirect(/quotations)");
  });
});

// ── requireSuperAdmin ────────────────────────────────────────────────────────
describe("requireSuperAdmin", () => {
  it("accepts superadmin role", async () => {
    mocks.mockAuth.mockResolvedValue(session("superadmin", null));
    const s = await requireSuperAdmin();
    expect(s.user.role).toBe("superadmin");
  });

  it("rejects admin role (redirects)", async () => {
    mocks.mockAuth.mockResolvedValue(session("admin", 5));
    await expect(requireSuperAdmin()).rejects.toThrow("redirect(/quotations)");
  });

  it("rejects staff role (redirects)", async () => {
    mocks.mockAuth.mockResolvedValue(session("staff", 5));
    await expect(requireSuperAdmin()).rejects.toThrow("redirect(/quotations)");
  });

  it("rejects unauthenticated (redirects)", async () => {
    mocks.mockAuth.mockResolvedValue(null);
    await expect(requireSuperAdmin()).rejects.toThrow("redirect(/login)");
  });
});

// ── resolveStoreId ───────────────────────────────────────────────────────────
describe("resolveStoreId", () => {
  function requestWithQuery(query: string): Request {
    return new Request(`http://localhost/api/test?${query}`);
  }

  // ── admin: storeId from session ONLY, never from request ─────────────────
  describe("admin role", () => {
    it("returns session storeId", async () => {
      mocks.mockAuth.mockResolvedValue(session("admin", 5));
      const result = await resolveStoreId();
      expect(result).toBe(5);
    });

    it("returns null when session storeId is null", async () => {
      mocks.mockAuth.mockResolvedValue(session("admin", null));
      const result = await resolveStoreId();
      expect(result).toBeNull();
    });

    it("NEVER reads ?storeId= from request query — uses session only", async () => {
      mocks.mockAuth.mockResolvedValue(session("admin", 5));
      const result = await resolveStoreId(
        requestWithQuery("storeId=99"),
      );
      // Must be session storeId (5), NOT query param (99)
      expect(result).toBe(5);
    });
  });

  // ── staff: same as admin, storeId from session only ──────────────────────
  describe("staff role", () => {
    it("returns session storeId", async () => {
      mocks.mockAuth.mockResolvedValue(session("staff", 5));
      const result = await resolveStoreId();
      expect(result).toBe(5);
    });

    it("NEVER reads ?storeId= from request query", async () => {
      mocks.mockAuth.mockResolvedValue(session("staff", 5));
      const result = await resolveStoreId(
        requestWithQuery("storeId=99"),
      );
      expect(result).toBe(5);
    });

    it("returns null when session storeId is null", async () => {
      mocks.mockAuth.mockResolvedValue(session("staff", null));
      const result = await resolveStoreId();
      expect(result).toBeNull();
    });
  });

  // ── superadmin: may use query param, falls back to session ───────────────
  describe("superadmin role", () => {
    it("returns ?storeId= query param when present", async () => {
      mocks.mockAuth.mockResolvedValue(session("superadmin", null));
      const result = await resolveStoreId(
        requestWithQuery("storeId=99"),
      );
      expect(result).toBe(99);
    });

    it("falls back to session storeId when no query param", async () => {
      mocks.mockAuth.mockResolvedValue(session("superadmin", null));
      const result = await resolveStoreId();
      expect(result).toBeNull();
    });

    it("ignores NaN ?storeId= values", async () => {
      mocks.mockAuth.mockResolvedValue(session("superadmin", null));
      const result = await resolveStoreId(
        requestWithQuery("storeId=abc"),
      );
      expect(result).toBeNull();
    });

    it("ignores zero ?storeId=", async () => {
      mocks.mockAuth.mockResolvedValue(session("superadmin", null));
      const result = await resolveStoreId(
        requestWithQuery("storeId=0"),
      );
      expect(result).toBeNull();
    });

    it("ignores negative ?storeId=", async () => {
      mocks.mockAuth.mockResolvedValue(session("superadmin", null));
      const result = await resolveStoreId(
        requestWithQuery("storeId=-5"),
      );
      expect(result).toBeNull();
    });

    it("prefers query param over non-null session storeId", async () => {
      mocks.mockAuth.mockResolvedValue(session("superadmin", 5));
      const result = await resolveStoreId(
        requestWithQuery("storeId=99"),
      );
      expect(result).toBe(99);
    });
  });

  // ── manager: store-scoped like admin, returns session storeId ─────────
  describe("manager role", () => {
    it("returns session storeId, never reads ?storeId=", async () => {
      mocks.mockAuth.mockResolvedValue(session("manager", 5));
      const result = await resolveStoreId(
        requestWithQuery("storeId=99"),
      );
      // Manager is store-scoped — must be session (5), not query (99)
      expect(result).toBe(5);
    });

    it("returns null when session storeId is null", async () => {
      mocks.mockAuth.mockResolvedValue(session("manager", null));
      const result = await resolveStoreId();
      expect(result).toBeNull();
    });
  });
});
