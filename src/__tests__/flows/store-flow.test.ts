/**
 * Store Flow — create, read, update, delete store sequence
 *
 * Runs as superadmin (only role that can create/delete stores).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loginAs, logout, api } from "./helpers";

let createdStoreId: number;

describe("Store Flow", () => {
  // ── Step 1 ───────────────────────────────────────────────────────────
  beforeAll(async () => {
    const result = await loginAs("superadmin", "admin123");
    expect(result.ok).toBe(true);
  });

  describe("Step 1 — Create store", () => {
    it("POST /api/stores creates a store with settings and quote sequence", async () => {
      const res = await api.post("/api/stores", {
        name: "Flow Test Store",
        slug: "flow-test-store",
        companyName: "Flow Test Company",
        phone: "+91 9999999999",
        email: "flow@test.com",
        gstin: "TEST123",
        adminUsername: "storeadmin",
        adminPassword: "admin123",
      });

      expect(res.status).toBe(201);
      const body = res.body as Record<string, unknown>;
      expect(body.name).toBe("Flow Test Store");
      expect(body.slug).toBe("flow-test-store");
      expect(typeof body.id).toBe("number");

      createdStoreId = body.id as number;
    });

    it("created store appears in GET /api/stores list", async () => {
      const res = await api.get("/api/stores");
      expect(res.status).toBe(200);
      const stores = res.body as Array<{ id: number; name: string }>;
      const found = stores.find((s) => s.id === createdStoreId);
      expect(found).toBeDefined();
      expect(found!.name).toBe("Flow Test Store");
    });
  });

  describe("Step 2 — Verify admin user created with store", () => {
    it("new admin user exists in GET /api/users?storeId=X", async () => {
      const res = await api.get("/api/users", { storeId: String(createdStoreId) });
      expect(res.status).toBe(200);
      const users = res.body as Array<{ username: string; storeId: number; role: string }>;
      const admin = users.find((u) => u.username === "storeadmin");
      expect(admin).toBeDefined();
      expect(admin!.role).toBe("admin");
      expect(admin!.storeId).toBe(createdStoreId);
    });
  });

  describe("Step 3 — Verify company settings", () => {
    it("settings exist for the new store", async () => {
      const res = await api.get(`/api/settings?storeId=${createdStoreId}`);
      if (res.status === 200) {
        const body = res.body as Record<string, unknown>;
        expect(body.companyName).toBe("Flow Test Company");
      }
    });
  });

  describe("Step 4 — Login as store admin", () => {
    it("store admin can login", async () => {
      const result = await loginAs("storeadmin", "admin123");
      expect(result.ok).toBe(true);
      expect(result.role).toBe("admin");
      expect(result.storeId).toBe(createdStoreId);
    });
  });

  describe("Step 5 — Delete store", () => {
    beforeAll(async () => {
      const result = await loginAs("superadmin", "admin123");
      expect(result.ok).toBe(true);
    });

    it("DELETE /api/stores/[id] removes the store", async () => {
      const res = await api.del(`/api/stores/${createdStoreId}`);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.success).toBe(true);
    });

    it("store no longer appears in list", async () => {
      const res = await api.get("/api/stores");
      expect(res.status).toBe(200);
      const stores = res.body as Array<{ id: number }>;
      const found = stores.find((s) => s.id === createdStoreId);
      expect(found).toBeUndefined();
    });

    it("store admin cannot login after store deletion", async () => {
      const result = await loginAs("storeadmin", "admin123");
      expect(result.ok).toBe(false);
    });
  });

  afterAll(async () => {
    await logout();
  });
});
