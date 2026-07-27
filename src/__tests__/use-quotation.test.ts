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
    ...overrides,
  };
}

describe("useQuotation - addLineItem validation", () => {
  it("adds a valid line item", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem());
    });
    expect(result.current.lineItems).toHaveLength(1);
    expect(result.current.lineItems[0].description).toBe("Test Item");
  });

  it("rejects empty description with zero qty and rate", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ description: "", qty: 0, rate: 0 }));
    });
    expect(result.current.lineItems).toHaveLength(0);
  });

  it("rejects whitespace-only description with no qty or rate", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ description: "   ", qty: 0, rate: 0 }));
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
});

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
});

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
    // Custom items stay, catalog items with qty=0 are excluded
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
});

describe("useQuotation - updateHeader", () => {
  it("updates header field", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.updateHeader("customerName", "ACME Corp");
    });
    expect(result.current.header.customerName).toBe("ACME Corp");
  });
});

describe("useQuotation - totals", () => {
  it("computes totals from line items", () => {
    const { result } = renderHook(() => useQuotation());
    act(() => {
      result.current.addLineItem(makeLineItem({ qty: 5, rate: 100, gstPercent: 18 }));
    });
    expect(result.current.totals.subTotal).toBe(500);
    expect(result.current.totals.netAmount).toBe(590);
  });
});
