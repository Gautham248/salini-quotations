import { describe, it, expect } from "vitest";
import {
  computeNetValue,
  computeTotals,
  round,
  amountInWords,
} from "@/lib/calculations";

describe("round", () => {
  it("rounds to 2 decimal places by default", () => {
    expect(round(1.234)).toBe(1.23);
    expect(round(1.235)).toBe(1.24);
  });

  it("rounds to custom decimal places", () => {
    expect(round(1.23456, 3)).toBe(1.235);
    expect(round(1.2, 0)).toBe(1);
  });
});

describe("computeNetValue", () => {
  it("computes qty * rate rounded to 2 decimals", () => {
    expect(computeNetValue(5, 100)).toBe(500);
    expect(computeNetValue(1.5, 10.5)).toBe(round(1.5 * 10.5));
  });

  it("returns 0 when qty is 0", () => {
    expect(computeNetValue(0, 100)).toBe(0);
  });

  it("returns 0 when rate is 0", () => {
    expect(computeNetValue(5, 0)).toBe(0);
  });
});

describe("computeTotals", () => {
  it("computes totals for a single item", () => {
    const result = computeTotals([{ qty: 5, rate: 100, gstPercent: 18 }]);
    expect(result.subTotal).toBe(500);
    expect(result.totalGst).toBe(90);
    expect(result.cgst).toBe(45);
    expect(result.sgst).toBe(45);
    expect(result.netAmount).toBe(590);
    expect(result.roundOff).toBe(0);
  });

  it("computes totals for multiple items", () => {
    const result = computeTotals([
      { qty: 5, rate: 100, gstPercent: 18 },
      { qty: 2, rate: 50, gstPercent: 5 },
    ]);
    // subTotal = 500 + 100 = 600
    expect(result.subTotal).toBe(600);
    // GST = 90 + 5 = 95
    expect(result.totalGst).toBe(95);
    // rawTotal = 600 + 95 = 695
    expect(result.netAmount).toBe(695);
  });

  it("returns zeros for empty items array", () => {
    const result = computeTotals([]);
    expect(result.subTotal).toBe(0);
    expect(result.totalGst).toBe(0);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.netAmount).toBe(0);
  });

  it("handles round-off correctly", () => {
    // 3 * 33.33 = 99.99, GST 18% = 17.9982, rawTotal = 117.9882
    const result = computeTotals([{ qty: 3, rate: 33.33, gstPercent: 18 }]);
    expect(result.netAmount).toBe(round(117.99, 0));
    expect(result.roundOff).toBe(round(round(117.99, 0) - 117.99));
  });

  it("handles 0% GST", () => {
    const result = computeTotals([{ qty: 10, rate: 50, gstPercent: 0 }]);
    expect(result.totalGst).toBe(0);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.subTotal).toBe(500);
    expect(result.netAmount).toBe(500);
  });
});

describe("amountInWords", () => {
  it("converts zero", () => {
    expect(amountInWords(0)).toContain("Zero");
  });

  it("converts a round number", () => {
    const result = amountInWords(500);
    expect(result).toContain("Five Hundred");
    expect(result).toContain("Rupees");
  });

  it("converts a number with paise", () => {
    const result = amountInWords(500.50);
    expect(result).toContain("Fifty Paise");
  });

  it("handles lakh and crore", () => {
    const result = amountInWords(1500000);
    expect(result).toContain("Lakh");
  });
});
