import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuotation, type LineItem } from "@/hooks/use-quotation";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeLineItem(overrides: Partial<LineItem> = {}): LineItem {
  return {
    key: crypto.randomUUID(),
    lineNo: 1,
    masterItemId: null,
    description: "Test Item",
    unit: "Nos",
    rate: 100,
    gstPercent: 18,
    qty: 5,
    netValue: 500,
    quoteMode: "quantity",
    weightKg: null,
    weightPerUnit: null,
    pieceCount: null,
    piecesPerUnit: null,
    isLocked: false,
    remark: "",
    gstExcludedRate: 0,
    altQty: null,
    altUnit: null,
    gstMode: "inclusive",
    loadingCharges: 0,
    ...overrides,
  };
}

// ── addLineItem ──────────────────────────────────────────────────────────────

describe("useQuotation - addLineItem validation", () => {
  it("adds a valid line item", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem());
    });
    expect(result.current.lineItems).toHaveLength(1);
    expect(result.current.lineItems[0].description).toBe("Test Item");
  });

  it("allows adding blank custom line items", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ masterItemId: null, description: "", qty: 0, rate: 0 }));
    });
    expect(result.current.lineItems).toHaveLength(1);
    expect(result.current.lineItems[0].masterItemId).toBeNull();
  });

  it("rejects empty description with zero qty and rate for catalog items", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ masterItemId: 1, description: "", qty: 0, rate: 0 }));
    });
    expect(result.current.lineItems).toHaveLength(0);
  });

  it("rejects whitespace-only description with no qty or rate for catalog items", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ masterItemId: 1, description: "   ", qty: 0, rate: 0 }));
    });
    expect(result.current.lineItems).toHaveLength(0);
  });

  it("accepts item with description and zero qty but positive rate", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 0, rate: 100 }));
    });
    expect(result.current.lineItems).toHaveLength(1);
  });

  it("rejects negative rate", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ rate: -5 }));
    });
    expect(result.current.lineItems).toHaveLength(0);
  });

  it("rejects negative qty", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: -3 }));
    });
    expect(result.current.lineItems).toHaveLength(0);
  });

  it("rejects GST outside 0-100 range", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ gstPercent: 150 }));
    });
    expect(result.current.lineItems).toHaveLength(0);
  });

  it("computes netValue on add", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 3, rate: 50, netValue: 0 }));
    });
    expect(result.current.lineItems[0].netValue).toBe(150);
  });

  it("stores isLocked status on add", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ isLocked: true }));
    });
    expect(result.current.lineItems[0].isLocked).toBe(true);
  });

  it("defaults isLocked to undefined when not provided", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ isLocked: undefined }));
    });
    expect(result.current.lineItems[0].isLocked).toBeUndefined();
  });

  it("auto-calculates weightKg from qty * weightPerUnit", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 10, weightPerUnit: 0.5, weightKg: null }));
    });
    expect(result.current.lineItems[0].weightKg).toBe(5);
  });
});

// ── updateLineItem ───────────────────────────────────────────────────────────

describe("useQuotation - updateLineItem validation", () => {
  it("clamps negative qty to 0", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 5 }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "qty", -10);
    });
    expect(result.current.lineItems[0].qty).toBe(0);
  });

  it("clamps negative rate to 0", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ rate: 100 }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "rate", -50);
    });
    expect(result.current.lineItems[0].rate).toBe(0);
  });

  it("clamps GST above 100 to 100", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ gstPercent: 18 }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "gstPercent", 200);
    });
    expect(result.current.lineItems[0].gstPercent).toBe(100);
  });

  it("clamps GST below 0 to 0", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ gstPercent: 18 }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "gstPercent", -5);
    });
    expect(result.current.lineItems[0].gstPercent).toBe(0);
  });

  it("ignores non-finite numeric values", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 5 }));
    });
    const key = result.current.lineItems[0].key;
    const original = result.current.lineItems[0].qty;
    act(() => {
      result.current.updateLineItem(key, "qty", NaN);
    });
    expect(result.current.lineItems[0].qty).toBe(original);
  });

  it("updates isLocked as boolean", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ isLocked: false }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "isLocked", true);
    });
    expect(result.current.lineItems[0].isLocked).toBe(true);
  });

  it("toggles isLocked from true to false", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ isLocked: true }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "isLocked", false);
    });
    expect(result.current.lineItems[0].isLocked).toBe(false);
  });

  it("auto-calculates weight on qty change", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 1, weightPerUnit: 10, weightKg: null }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "qty", 5);
    });
    expect(result.current.lineItems[0].weightKg).toBe(50);
  });

  it("recalculates netValue on rate change", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 3, rate: 50 }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "rate", 100);
    });
    expect(result.current.lineItems[0].netValue).toBe(300);
    expect(result.current.lineItems[0].rate).toBe(100);
  });

  it("auto-calculates pieceCount on qty change with piecesPerUnit", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 1, piecesPerUnit: 100, pieceCount: null }));
    });
    const key = result.current.lineItems[0].key;
    act(() => {
      result.current.updateLineItem(key, "qty", 3);
    });
    expect(result.current.lineItems[0].pieceCount).toBe(300);
  });
});

// ── removeLineItem ───────────────────────────────────────────────────────────

describe("useQuotation - removeLineItem", () => {
  it("removes a line item by key", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ description: "A" }));
      result.current.addLineItem(makeLineItem({ description: "B" }));
    });
    expect(result.current.lineItems).toHaveLength(2);
    const keyA = result.current.lineItems[0].key;
    act(() => {
      result.current.removeLineItem(keyA);
    });
    expect(result.current.lineItems).toHaveLength(1);
    expect(result.current.lineItems[0].description).toBe("B");
  });
});

// ── moveLineItem ─────────────────────────────────────────────────────────────

describe("useQuotation - moveLineItem", () => {
  it("moves item up", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ description: "A" }));
      result.current.addLineItem(makeLineItem({ description: "B" }));
    });
    const keyB = result.current.lineItems[1].key;
    act(() => {
      result.current.moveLineItem(keyB, "up");
    });
    expect(result.current.lineItems[0].description).toBe("B");
    expect(result.current.lineItems[1].description).toBe("A");
  });

  it("does not move first item up", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ description: "A" }));
    });
    const keyA = result.current.lineItems[0].key;
    act(() => {
      result.current.moveLineItem(keyA, "up");
    });
    expect(result.current.lineItems[0].description).toBe("A");
  });

  it("renumbers lineNos after move", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ description: "A" }));
      result.current.addLineItem(makeLineItem({ description: "B" }));
    });
    const keyB = result.current.lineItems[1].key;
    act(() => {
      result.current.moveLineItem(keyB, "up");
    });
    expect(result.current.lineItems[0].lineNo).toBe(1);
    expect(result.current.lineItems[1].lineNo).toBe(2);
  });
});

// ── syncCatalogItems ─────────────────────────────────────────────────────────

describe("useQuotation - syncCatalogItems", () => {
  it("filters out items with qty = 0 and keeps existing state", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ description: "Custom" }));
    });
    act(() => {
      result.current.syncCatalogItems([
        {
          masterItemId: 10,
          description: "Empty Qty Item",
          unit: "Kg",
          rate: 100,
          gstPercent: 18,
          qty: 0,
          weightPerUnit: null,
          piecesPerUnit: null,
        },
      ]);
    });
    expect(result.current.lineItems).toHaveLength(1);
  });

  it("does nothing when no items have quantity", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.syncCatalogItems([
        { masterItemId: 1, description: "X", unit: "Kg", rate: 100, gstPercent: 18, qty: 0, weightPerUnit: null, piecesPerUnit: null },
        { masterItemId: 2, description: "Y", unit: "Kg", rate: 200, gstPercent: 18, qty: 0, weightPerUnit: null, piecesPerUnit: null },
      ]);
    });
    expect(result.current.lineItems).toHaveLength(0);
  });

  it("matches legacy custom items by description and merges catalog data", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({
        masterItemId: null,
        description: "Steel Bar",
        unit: "pcs",
        rate: 50,
        isLocked: true,
      }));
    });
    act(() => {
      result.current.syncCatalogItems([{
        masterItemId: 99,
        description: "Steel Bar",
        unit: "Kg",
        rate: 100,
        gstPercent: 18,
        qty: 5,
        weightPerUnit: null,
        piecesPerUnit: null,
      }]);
    });
    const items = result.current.lineItems;
    // Should now have masterItemId from catalog, updated unit/rate, still locked
    const merged = items.find(i => i.description === "Steel Bar");
    expect(merged).toBeDefined();
    expect(merged?.masterItemId).toBe(99);
    expect(merged?.rate).toBe(100);
    expect(merged?.unit).toBe("Kg");
    expect(merged?.isLocked).toBe(true);
  });

  it("preserves unmatched custom items", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ description: "Unique Custom", masterItemId: null }));
    });
    act(() => {
      result.current.syncCatalogItems([{
        masterItemId: 5,
        description: "Different Item",
        unit: "Kg",
        rate: 50,
        gstPercent: 18,
        qty: 2,
        weightPerUnit: null,
        piecesPerUnit: null,
      }]);
    });
    expect(result.current.lineItems).toHaveLength(2);
    expect(result.current.lineItems.some(i => i.description === "Unique Custom")).toBe(true);
    expect(result.current.lineItems.some(i => i.description === "Different Item")).toBe(true);
  });

  it("updates existing catalog items by masterItemId", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({
        masterItemId: 5,
        description: "Old Desc",
        rate: 50,
        qty: 1,
      }));
    });
    act(() => {
      result.current.syncCatalogItems([{
        masterItemId: 5,
        description: "Updated Desc",
        unit: "Kg",
        rate: 75,
        gstPercent: 18,
        qty: 3,
        weightPerUnit: null,
        piecesPerUnit: null,
      }]);
    });
    const item = result.current.lineItems[0];
    expect(item.description).toBe("Updated Desc");
    expect(item.rate).toBe(75);
    expect(item.qty).toBe(3);
  });

  it("auto-calculates weightKg from qty * weightPerUnit in catalog sync", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.syncCatalogItems([{
        masterItemId: 1,
        description: "Heavy Item",
        unit: "Kg",
        rate: 100,
        gstPercent: 18,
        qty: 5,
        weightPerUnit: 2,
        piecesPerUnit: null,
      }]);
    });
    expect(result.current.lineItems[0].weightKg).toBe(10);
  });

  it("auto-calculates pieceCount from qty * piecesPerUnit in catalog sync", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.syncCatalogItems([{
        masterItemId: 1,
        description: "Pack Item",
        unit: "Pcs",
        rate: 10,
        gstPercent: 5,
        qty: 3,
        weightPerUnit: null,
        piecesPerUnit: 100,
      }]);
    });
    expect(result.current.lineItems[0].pieceCount).toBe(300);
  });

  it("filters empty qty but preserves state when mixed with valid qty", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.syncCatalogItems([
        { masterItemId: 1, description: "Empty", unit: "Kg", rate: 100, gstPercent: 18, qty: 0, weightPerUnit: null, piecesPerUnit: null },
        { masterItemId: 2, description: "Real", unit: "Kg", rate: 50, gstPercent: 18, qty: 10, weightPerUnit: null, piecesPerUnit: null },
      ]);
    });
    expect(result.current.lineItems).toHaveLength(1);
    expect(result.current.lineItems[0].description).toBe("Real");
  });
});

// ── updateHeader ─────────────────────────────────────────────────────────────

describe("useQuotation - updateHeader", () => {
  it("updates header field", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.updateHeader("customerName", "ACME Corp");
    });
    expect(result.current.header.customerName).toBe("ACME Corp");
  });
});

// ── updateIsLocked / updateStatus ────────────────────────────────────────────

describe("useQuotation - updateIsLocked", () => {
  it("defaults isLocked to false", () => {
    const { result } = renderHook(() => useQuotation());
    expect(result.current.isLocked).toBe(false);
  });

  it("sets isLocked to true", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.updateIsLocked(true);
    });
    expect(result.current.isLocked).toBe(true);
    expect(result.current.dirty).toBe(true);
  });

  it("sets isLocked back to false", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.updateIsLocked(true);
      result.current.updateIsLocked(false);
    });
    expect(result.current.isLocked).toBe(false);
  });
});

describe("useQuotation - updateStatus", () => {
  it("defaults status to draft", () => {
    const { result } = renderHook(() => useQuotation());
    expect(result.current.status).toBe("draft");
  });

  it("updates status to finalized", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.updateStatus("finalized");
    });
    expect(result.current.status).toBe("finalized");
    expect(result.current.dirty).toBe(true);
  });

  it("immediately syncs status to statusRef for synchronous manualSave", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 100, status: "draft" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useQuotation(100));
    act(() => {
      result.current.updateStatus("finalized");
      result.current.updateStatus("draft");
      result.current.manualSave();
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/quotations/100",
      expect.objectContaining({
        body: expect.stringContaining('"status":"draft"'),
      })
    );
    vi.unstubAllGlobals();
  });
});

// ── totals ───────────────────────────────────────────────────────────────────

describe("useQuotation - totals", () => {
  it("computes totals from line items", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 5, rate: 100, gstPercent: 18 }));
    });
    expect(result.current.totals.subTotal).toBe(500);
    expect(result.current.totals.netAmount).toBe(500);
  });
});
