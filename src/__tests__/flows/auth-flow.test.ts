/**
 * Auth Flow — login, session, logout sequence
 *
 * Verifies the full Next-Auth credentials flow end-to-end.
 * Tests in a single vitest file run sequentially, so state
 * (cookies, session) persists naturally.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loginAs, logout, getSession, api } from "./helpers";

describe("Auth Flow", () => {
  // ── Step 1 ───────────────────────────────────────────────────────────
  describe("Step 1 — Login as superadmin", () => {
    let result: Awaited<ReturnType<typeof loginAs>>;

    beforeAll(async () => {
      result = await loginAs("superadmin", "admin123");
    });

    it("returns ok", () => {
      expect(result.ok).toBe(true);
    });

    it("resolves role as superadmin", () => {
      expect(result.role).toBe("superadmin");
    });

    it("has no storeId (superadmin)", () => {
      expect(result.storeId).toBeNull();
    });
  });

  // ── Step 2 ───────────────────────────────────────────────────────────
  describe("Step 2 — Verify session after login", () => {
    let session: Awaited<ReturnType<typeof getSession>>;

    beforeAll(async () => {
      session = await getSession();
    });

    it("session is not null", () => {
      expect(session).not.toBeNull();
    });

    it("session has user with id", () => {
      expect(session!.user.id).toBeGreaterThan(0);
    });

    it("session user role is superadmin", () => {
      expect(session!.user.role).toBe("superadmin");
    });
  });

  // ── Step 3 ───────────────────────────────────────────────────────────
  describe("Step 3 — Access protected routes", () => {
    it("can GET /api/users (requires admin+)", async () => {
      const res = await api.get("/api/users");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("can GET /api/stores (requires manager+)", async () => {
      const res = await api.get("/api/stores");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Step 4 ───────────────────────────────────────────────────────────
  describe("Step 4 — Login with invalid credentials", () => {
    let result: Awaited<ReturnType<typeof loginAs>>;

    beforeAll(async () => {
      result = await loginAs("superadmin", "wrongpassword");
    });

    it("fails (ok=false)", () => {
      expect(result.ok).toBe(false);
    });
  });

  // ── Step 5 ───────────────────────────────────────────────────────────
  describe("Step 5 — No session after bad login", () => {
    it("session is null", async () => {
      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  // ── Step 6 ───────────────────────────────────────────────────────────
  describe("Step 6 — Re-login and logout", () => {
    beforeAll(async () => {
      const result = await loginAs("admin", "admin123");
      expect(result.ok).toBe(true);
    });

    it("session is valid before logout", async () => {
      const session = await getSession();
      expect(session).not.toBeNull();
    });

    it("session is gone after logout", async () => {
      await logout();
      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  // ── Step 7 ───────────────────────────────────────────────────────────
  describe("Step 7 — Protected route blocked after logout", () => {
    it("GET /api/users is blocked (not 200) after logout", async () => {
      const res = await api.get("/api/users");
      expect(res.status).not.toBe(200);
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────────────
  afterAll(async () => {
    await logout();
  });
});
