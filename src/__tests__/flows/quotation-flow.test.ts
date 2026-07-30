/**
 * Quotation Flow — create, update with line items, finalize, duplicate, delete sequence
 *
 * Runs as admin for full CRUD access.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loginAs, logout, api } from "./helpers";

let quotationId: number;
let quotNo: string;

describe("Quotation Flow", () => {
  beforeAll(async () => {
    const result = await loginAs("admin", "admin123");
    expect(result.ok).toBe(true);
  });

  describe("Step 1 — Create quotation (draft)", () => {
    it("POST /api/quotations creates a new draft quotation", async () => {
      const res = await api.post("/api/quotations", {
        customerName: "Flow Test Customer",
        customerAddress: "123 Test Lane, Kerala",
        customerPlace: "Kochi",
        customerGstin: "32AABBCCDD1E2Z3",
        deliveryTerms: "FOB",
        gstNote: "Tax as applicable",
      });

      expect(res.status).toBe(201);
      const body = res.body as Record<string, unknown>;
      expect(body.customerName).toBe("Flow Test Customer");
      expect(body.status).toBe("draft");
      expect(typeof body.id).toBe("number");
      expect(typeof body.quotNo).toBe("string");
      expect(body.lineItems).toBeDefined();
      expect(Array.isArray(body.lineItems)).toBe(true);

      quotationId = body.id as number;
      quotNo = body.quotNo as string;
    });
  });

  describe("Step 2 — Read quotation by ID", () => {
    it("GET /api/quotations/[id] returns full quotation", async () => {
      const res = await api.get(`/api/quotations/${quotationId}`);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.id).toBe(quotationId);
      expect(body.customerName).toBe("Flow Test Customer");
      expect(body.status).toBe("draft");
    });

    it("quotation appears in GET /api/quotations list", async () => {
      const res = await api.get("/api/quotations");
      expect(res.status).toBe(200);
      const list = res.body as Array<{ id: number }>;
      const found = list.find((q) => q.id === quotationId);
      expect(found).toBeDefined();
    });
  });

  describe("Step 3 — Update quotation with line items", () => {
    it("PUT /api/quotations/[id] adds line items and recalculates totals", async () => {
      // Get an existing item for reference
      const itemsRes = await api.get("/api/items");
      const itemsBody = itemsRes.body as { items: Array<{ id: number; description: string; rate: number; gstPercent: number; unit: { name: string } }> };
      const item = itemsBody.items[0];

      const res = await api.put(`/api/quotations/${quotationId}`, {
        customerName: "Flow Test Customer - Updated",
        lineItems: [
          {
            lineNo: 1,
            description: item.description,
            masterItemId: item.id,
            unit: item.unit.name,
            rate: item.rate,
            gstPercent: item.gstPercent,
            qty: 10,
            netValue: item.rate * 10,
          },
          {
            lineNo: 2,
            description: "Freight Charges",
            unit: "Nos",
            rate: 500,
            gstPercent: 18,
            qty: 1,
            netValue: 500,
          },
        ],
      });

      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.customerName).toBe("Flow Test Customer - Updated");
      const lineItems = body.lineItems as Array<Record<string, unknown>>;
      expect(lineItems).toHaveLength(2);

      expect(typeof body.subTotal).toBe("number");
      expect(typeof body.cgst).toBe("number");
      expect(typeof body.sgst).toBe("number");
      expect(typeof body.netAmount).toBe("number");
      expect(body.subTotal as number).toBeGreaterThan(0);
      expect(body.netAmount as number).toBeGreaterThan(body.subTotal as number);
    });
  });

  describe("Step 4 — Update status to finalized", () => {
    it("PUT /api/quotations/[id] can change status to finalized", async () => {
      const res = await api.put(`/api/quotations/${quotationId}`, {
        status: "finalized",
      });

      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.status).toBe("finalized");
    });

    it("re-reading shows finalized status", async () => {
      const res = await api.get(`/api/quotations/${quotationId}`);
      const body = res.body as Record<string, unknown>;
      expect(body.status).toBe("finalized");
    });
  });

  describe("Step 5 — Finalize/PDF endpoint", () => {
    it("GET /api/quotations/[id]/finalize returns PDF", async () => {
      const res = await api.get(`/api/quotations/${quotationId}/finalize`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/pdf");
    });
  });

  describe("Step 6 — Duplicate quotation", () => {
    let duplicateId: number;

    it("POST /api/quotations/[id]/duplicate creates a copy", async () => {
      const res = await api.post(`/api/quotations/${quotationId}/duplicate`);
      expect(res.status).toBe(201);
      const body = res.body as Record<string, unknown>;
      expect(typeof body.id).toBe("number");
      expect(body.id).not.toBe(quotationId);
      expect(body.quotNo).not.toBe(quotNo);
      expect(body.status).toBe("draft");
      duplicateId = body.id as number;
    });

    it("cleanup duplicate", async () => {
      const res = await api.del(`/api/quotations/${duplicateId}`);
      expect(res.status).toBe(200);
    });
  });

  describe("Step 7 — Delete quotation", () => {
    it("DELETE /api/quotations/[id] removes the quotation", async () => {
      const res = await api.del(`/api/quotations/${quotationId}`);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body.success).toBe(true);
    });

    it("GET returns 404 after deletion", async () => {
      const res = await api.get(`/api/quotations/${quotationId}`);
      expect(res.status).toBe(404);
    });
  });

  describe("Step 8 — Validation", () => {
    it("POST without customerName defaults to 'Draft Customer'", async () => {
      const res = await api.post("/api/quotations", {});
      expect(res.status).toBe(201);
      const body = res.body as Record<string, unknown>;
      expect(body.customerName).toBe("Draft Customer");

      // Cleanup
      await api.del(`/api/quotations/${body.id as number}`);
    });
  });

  afterAll(async () => {
    await logout();
  });
});
