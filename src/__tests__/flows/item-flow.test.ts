/**
 * Item Flow — create, read, update, toggle item sequence
 *
 * Runs as admin (requires admin+ for item CRUD).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loginAs, logout, api } from "./helpers";

let createdItemId: number;
let unitId: number;

describe("Item Flow", () => {
  beforeAll(async () => {
    const result = await loginAs("admin", "admin123");
    expect(result.ok).toBe(true);
  });

  describe("Step 1 — Fetch available units", () => {
    it("GET /api/units returns active units", async () => {
      const res = await api.get("/api/units");
      expect(res.status).toBe(200);
      const units = res.body as Array<{ id: number; name: string }>;
      expect(units.length).toBeGreaterThan(0);
      const nos = units.find((u) => u.name === "Nos");
      expect(nos).toBeDefined();
      unitId = nos!.id;
    });
  });

  describe("Step 2 — Create item", () => {
    it("POST /api/items creates a new item with correct fields", async () => {
      const res = await api.post("/api/items", {
        description: "Flow Test Item - Widget XYZ",
        unitId,
        rate: 150.5,
        gstPercent: 18,
        weightPerUnit: 2.5,
        piecesPerUnit: 10,
      });

      expect(res.status).toBe(201);
      const body = res.body as Record<string, unknown>;
      expect(body.description).toBe("Flow Test Item - Widget XYZ");
      expect(body.rate).toBe(150.5);
      expect(body.gstPercent).toBe(18);
      expect(typeof body.id).toBe("number");
      createdItemId = body.id as number;
    });
  });

  describe("Step 3 — Read item by ID", () => {
    it("GET /api/items/[id] returns the item", async () => {
      const res = await api.get(`/api/items/${createdItemId}`);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.id).toBe(createdItemId);
      expect(body.description).toBe("Flow Test Item - Widget XYZ");
    });
  });

  describe("Step 4 — Item appears in list", () => {
    it("GET /api/items includes new item", async () => {
      const res = await api.get("/api/items");
      expect(res.status).toBe(200);
      const body = res.body as { items: Array<{ id: number; description: string }> };
      const found = body.items.find((i) => i.id === createdItemId);
      expect(found).toBeDefined();
      expect(found!.description).toBe("Flow Test Item - Widget XYZ");
    });

    it("GET /api/items?search=flow finds the item", async () => {
      const res = await api.get("/api/items", { search: "flow" });
      expect(res.status).toBe(200);
      const body = res.body as { items: Array<{ id: number }> };
      const found = body.items.find((i) => i.id === createdItemId);
      expect(found).toBeDefined();
    });
  });

  describe("Step 5 — Update item", () => {
    it("PUT /api/items/[id] updates description, rate, gstPercent", async () => {
      const res = await api.put(`/api/items/${createdItemId}`, {
        description: "Flow Test Item - Widget UPDATED",
        unitId,
        rate: 200,
        gstPercent: 12,
      });

      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.description).toBe("Flow Test Item - Widget UPDATED");
      expect(body.rate).toBe(200);
      expect(body.gstPercent).toBe(12);
    });
  });

  describe("Step 6 — Toggle item (deactivate/re-activate)", () => {
    it("PATCH /api/items/[id] toggles isActive to false", async () => {
      const res = await api.patch(`/api/items/${createdItemId}`);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.isActive).toBe(false);
    });

    it("deactivated item does not appear in default list", async () => {
      const res = await api.get("/api/items");
      const body = res.body as { items: Array<{ id: number }> };
      const found = body.items.find((i) => i.id === createdItemId);
      expect(found).toBeUndefined();
    });

    it("deactivated item appears with showInactive=true", async () => {
      const res = await api.get("/api/items", { showInactive: "true" });
      const body = res.body as { items: Array<{ id: number }> };
      const found = body.items.find((i) => i.id === createdItemId);
      expect(found).toBeDefined();
    });

    it("PATCH again toggles back to active", async () => {
      const res = await api.patch(`/api/items/${createdItemId}`);
      const body = res.body as Record<string, unknown>;
      expect(body.isActive).toBe(true);
    });
  });

  describe("Step 7 — Validation", () => {
    it("POST /api/items without description returns 400", async () => {
      const res = await api.post("/api/items", { unitId, rate: 100, gstPercent: 18 });
      expect(res.status).toBe(400);
      const body = res.body as Record<string, unknown>;
      expect(body.error).toBe("Item description is required");
    });

    it("POST /api/items without unitId returns 400", async () => {
      const res = await api.post("/api/items", { description: "Test", rate: 100, gstPercent: 18 });
      expect(res.status).toBe(400);
    });
  });

  afterAll(async () => {
    await logout();
  });
});
