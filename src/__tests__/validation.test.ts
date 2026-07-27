import { describe, it, expect } from "vitest";
import {
  lineItemSchema,
  partialLineItemSchema,
  quotationHeaderSchema,
  cartItemSchema,
  isLineItemEffectivelyEmpty,
} from "@/lib/validation";

// ── Valid line item fixture ──────────────────────────────────────────────────

function validLineItem(overrides: Record<string, unknown> = {}) {
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
    quoteMode: "quantity" as const,
    weightKg: null,
    weightPerUnit: null,
    pieceCount: null,
    piecesPerUnit: null,
    ...overrides,
  };
}

// ── LineItem schema ──────────────────────────────────────────────────────────

describe("lineItemSchema", () => {
  it("accepts a valid line item", () => {
    const result = lineItemSchema.safeParse(validLineItem());
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = lineItemSchema.safeParse(validLineItem({ description: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes("description"))).toBe(true);
    }
  });

  it("rejects negative rate", () => {
    const result = lineItemSchema.safeParse(validLineItem({ rate: -1 }));
    expect(result.success).toBe(false);
  });

  it("rejects negative qty", () => {
    const result = lineItemSchema.safeParse(validLineItem({ qty: -5 }));
    expect(result.success).toBe(false);
  });

  it("rejects GST above 100", () => {
    const result = lineItemSchema.safeParse(validLineItem({ gstPercent: 101 }));
    expect(result.success).toBe(false);
  });

  it("rejects GST below 0", () => {
    const result = lineItemSchema.safeParse(validLineItem({ gstPercent: -1 }));
    expect(result.success).toBe(false);
  });

  it("accepts zero qty and rate", () => {
    const result = lineItemSchema.safeParse(validLineItem({ qty: 0, rate: 0, netValue: 0 }));
    expect(result.success).toBe(true);
  });

  it("rejects NaN rate", () => {
    const result = lineItemSchema.safeParse(validLineItem({ rate: NaN }));
    expect(result.success).toBe(false);
  });

  it("rejects infinite qty", () => {
    const result = lineItemSchema.safeParse(validLineItem({ qty: Infinity }));
    expect(result.success).toBe(false);
  });

  it("accepts weight mode item", () => {
    const result = lineItemSchema.safeParse(validLineItem({
      quoteMode: "weight",
      weightKg: 2.5,
      weightPerUnit: 0.05,
      qty: 0,
      netValue: 2500,
    }));
    expect(result.success).toBe(true);
  });

  it("accepts pieces mode item", () => {
    const result = lineItemSchema.safeParse(validLineItem({
      quoteMode: "pieces",
      pieceCount: 100,
      piecesPerUnit: 1,
      qty: 100,
    }));
    expect(result.success).toBe(true);
  });

  it("rejects invalid quoteMode", () => {
    const result = lineItemSchema.safeParse(validLineItem({ quoteMode: "invalid" }));
    expect(result.success).toBe(false);
  });

  it("accepts null weightKg and pieceCount", () => {
    const result = lineItemSchema.safeParse(validLineItem({ weightKg: null, pieceCount: null }));
    expect(result.success).toBe(true);
  });

  it("rejects negative weightKg", () => {
    const result = lineItemSchema.safeParse(validLineItem({ weightKg: -1 }));
    expect(result.success).toBe(false);
  });

  it("rejects non-integer positive id", () => {
    // id is optional positive int
    const result = lineItemSchema.safeParse(validLineItem({ id: 1.5 }));
    expect(result.success).toBe(false);
  });

  it("accepts optional isLocked boolean", () => {
    const result = lineItemSchema.safeParse(validLineItem({ isLocked: true }));
    expect(result.success).toBe(true);
  });

  it("accepts missing isLocked field", () => {
    const result = lineItemSchema.safeParse({
      key: "abc",
      lineNo: 1,
      masterItemId: null,
      description: "Test",
      unit: "",
      rate: 0,
      gstPercent: 0,
      qty: 0,
      netValue: 0,
      quoteMode: "quantity",
      weightKg: null,
      weightPerUnit: null,
      pieceCount: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(true);
  });
});

// ── Partial line item schema (for API submits) ───────────────────────────────

describe("partialLineItemSchema", () => {
  it("accepts a valid partial item", () => {
    const result = partialLineItemSchema.safeParse({
      masterItemId: 1,
      description: "Widget",
      unit: "Kg",
      rate: 50,
      gstPercent: 18,
      qty: 10,
      netValue: 500,
      quoteMode: "quantity",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null masterItemId for custom items", () => {
    const result = partialLineItemSchema.safeParse({
      masterItemId: null,
      description: "Custom",
      unit: "Nos",
      rate: 10,
      gstPercent: 5,
      qty: 1,
      netValue: 10,
      quoteMode: "quantity",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = partialLineItemSchema.safeParse({
      masterItemId: 1,
      description: "",
      unit: "Kg",
      rate: 50,
      gstPercent: 18,
      qty: 10,
      netValue: 500,
      quoteMode: "quantity",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative rate", () => {
    const result = partialLineItemSchema.safeParse({
      masterItemId: 1,
      description: "Widget",
      unit: "Kg",
      rate: -10,
      gstPercent: 18,
      qty: 10,
      netValue: 500,
      quoteMode: "quantity",
    });
    expect(result.success).toBe(false);
  });
});

// ── Quotation header schema ─────────────────────────────────────────────────

describe("quotationHeaderSchema", () => {
  it("accepts a valid header", () => {
    const result = quotationHeaderSchema.safeParse({
      customerName: "ACME Corp",
      customerAddress: "123 Main St",
      customerPlace: "Springfield",
      customerGstin: "GST123",
      quotDate: "2024-01-01",
      refNo: "REF001",
      deliveryTerms: "FOB",
      gstNote: "",
      validity: "LIMITED",
      paymentTerms: "READY PAYMENT",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty customer name", () => {
    const result = quotationHeaderSchema.safeParse({
      customerName: "",
      customerAddress: "",
      customerPlace: "",
      customerGstin: "",
      quotDate: "2024-01-01",
      refNo: "",
      deliveryTerms: "",
      gstNote: "",
      validity: "LIMITED",
      paymentTerms: "READY PAYMENT",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty optional fields", () => {
    const result = quotationHeaderSchema.safeParse({
      customerName: "Test",
      customerAddress: "",
      customerPlace: "",
      customerGstin: "",
      quotDate: "2024-01-01",
      refNo: "",
      deliveryTerms: "",
      gstNote: "",
      validity: "",
      paymentTerms: "",
    });
    expect(result.success).toBe(true);
  });
});

// ── Cart item schema ─────────────────────────────────────────────────────────

describe("cartItemSchema", () => {
  it("accepts a valid cart item", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 5,
      description: "Iron Bar",
      unit: "Kg",
      unitId: 2,
      rate: 80,
      gstPercent: 18,
      qty: 10,
      weightPerUnit: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null weightPerUnit and piecesPerUnit", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 5,
      description: "Iron Bar",
      unit: "Kg",
      unitId: 2,
      rate: 80,
      gstPercent: 18,
      qty: 10,
      weightPerUnit: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero/negative masterItemId", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 0,
      description: "Iron Bar",
      unit: "Kg",
      unitId: 2,
      rate: 80,
      gstPercent: 18,
      qty: 10,
      weightPerUnit: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 5,
      description: "",
      unit: "Kg",
      unitId: 2,
      rate: 80,
      gstPercent: 18,
      qty: 10,
      weightPerUnit: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty unit", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 5,
      description: "Iron Bar",
      unit: "",
      unitId: 2,
      rate: 80,
      gstPercent: 18,
      qty: 10,
      weightPerUnit: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative rate", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 5,
      description: "Iron Bar",
      unit: "Kg",
      unitId: 2,
      rate: -10,
      gstPercent: 18,
      qty: 10,
      weightPerUnit: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects GST > 100", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 5,
      description: "Iron Bar",
      unit: "Kg",
      unitId: 2,
      rate: 80,
      gstPercent: 150,
      qty: 10,
      weightPerUnit: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative qty", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 5,
      description: "Iron Bar",
      unit: "Kg",
      unitId: 2,
      rate: 80,
      gstPercent: 18,
      qty: -5,
      weightPerUnit: null,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative weightPerUnit", () => {
    const result = cartItemSchema.safeParse({
      masterItemId: 5,
      description: "Iron Bar",
      unit: "Kg",
      unitId: 2,
      rate: 80,
      gstPercent: 18,
      qty: 10,
      weightPerUnit: -0.5,
      piecesPerUnit: null,
    });
    expect(result.success).toBe(false);
  });
});

// ── isLineItemEffectivelyEmpty ───────────────────────────────────────────────

describe("isLineItemEffectivelyEmpty", () => {
  it("returns true for an item with no data", () => {
    expect(isLineItemEffectivelyEmpty({
      description: "",
      qty: 0,
      rate: 0,
      masterItemId: null,
    })).toBe(true);
  });

  it("returns true for a custom item with only whitespace description", () => {
    expect(isLineItemEffectivelyEmpty({
      description: "   ",
      qty: 0,
      rate: 0,
      masterItemId: null,
    })).toBe(true);
  });

  it("returns false for a custom item with description and qty", () => {
    expect(isLineItemEffectivelyEmpty({
      description: "Test",
      qty: 5,
      rate: 0,
      masterItemId: null,
    })).toBe(false);
  });

  it("returns false for a custom item with description and rate", () => {
    expect(isLineItemEffectivelyEmpty({
      description: "Test",
      qty: 0,
      rate: 100,
      masterItemId: null,
    })).toBe(false);
  });

  it("returns true for a custom item with only qty but no description", () => {
    expect(isLineItemEffectivelyEmpty({
      description: "",
      qty: 5,
      rate: 0,
      masterItemId: null,
    })).toBe(true);
  });

  it("returns false for a catalog item with qty > 0", () => {
    expect(isLineItemEffectivelyEmpty({
      description: "Catalog Item",
      qty: 1,
      rate: 100,
      masterItemId: 5,
    })).toBe(false);
  });

  it("returns true for a catalog item with qty = 0", () => {
    expect(isLineItemEffectivelyEmpty({
      description: "Catalog Item",
      qty: 0,
      rate: 100,
      masterItemId: 5,
    })).toBe(true);
  });
});
