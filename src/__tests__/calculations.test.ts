import { describe, it, expect } from "vitest";
import {
  computeNetValue,
  computeLineNetValue,
  computeTotals,
  round,
  amountInWords,
} from "@/lib/calculations";

describe("round", () => {
  it("rounds to 2 decimal places by default", () => {
    expect(round(1.234)).toBe(1.23);
    expect(round(1.235)).toBe(1.24);
    expect(round(0.005)).toBe(0.01);
  });

  it("rounds to custom decimal places", () => {
    expect(round(1.23456, 3)).toBe(1.235);
    expect(round(1.2, 0)).toBe(1);
    expect(round(1234.5678, 2)).toBe(1234.57);
  });
});

describe("computeNetValue and computeLineNetValue", () => {
  it("computes qty * rate rounded to 2 decimals", () => {
    expect(computeNetValue(5, 100)).toBe(500);
    expect(computeNetValue(1.5, 10.5)).toBe(round(1.5 * 10.5));
  });

  it("returns 0 when qty is 0 or rate is 0", () => {
    expect(computeNetValue(0, 100)).toBe(0);
    expect(computeNetValue(5, 0)).toBe(0);
  });

  it("uses pre-calculated netValue if provided on LineItemInput", () => {
    const itemWithPrecalculatedNet = {
      qty: 10,
      rate: 100,
      gstPercent: 18,
      netValue: 450.75, // Weight/piece mode or customized net value
    };
    expect(computeLineNetValue(itemWithPrecalculatedNet)).toBe(450.75);
  });

  it("falls back to qty * rate if netValue is not provided", () => {
    const itemWithoutNet = {
      qty: 10,
      rate: 100,
      gstPercent: 18,
    };
    expect(computeLineNetValue(itemWithoutNet)).toBe(1000);
  });
});

describe("computeTotals — Multi-GST Rates and Accounting Invariance", () => {
  it("computes totals for a single item", () => {
    const result = computeTotals([{ qty: 5, rate: 100, gstPercent: 18 }]);
    expect(result.subTotal).toBe(500);
    expect(result.totalGst).toBe(90);
    expect(result.cgst).toBe(45);
    expect(result.sgst).toBe(45);
    expect(result.netAmount).toBe(590);
    expect(result.roundOff).toBe(0);
  });

  it("computes totals correctly across ALL 5 standard GST rate tiers (0%, 5%, 12%, 18%, 28%) in a single quotation", () => {
    const items = [
      { qty: 10, rate: 100, gstPercent: 0 },   // net: 1000, gst: 0
      { qty: 20, rate: 50, gstPercent: 5 },    // net: 1000, gst: 50
      { qty: 5, rate: 200, gstPercent: 12 },   // net: 1000, gst: 120
      { qty: 4, rate: 250, gstPercent: 18 },   // net: 1000, gst: 180
      { qty: 2, rate: 500, gstPercent: 28 },   // net: 1000, gst: 280
    ];

    const result = computeTotals(items);
    // Total subtotal: 1000 + 1000 + 1000 + 1000 + 1000 = 5000
    expect(result.subTotal).toBe(5000);
    // Total GST: 0 + 50 + 120 + 180 + 280 = 630
    expect(result.totalGst).toBe(630);
    expect(result.cgst).toBe(315);
    expect(result.sgst).toBe(315);
    expect(result.netAmount).toBe(5630);
    expect(result.roundOff).toBe(0);
  });

  it("handles fractional quantities and decimal rates (building materials in kg, meters, tons)", () => {
    const items = [
      { qty: 12.375, rate: 48.60, gstPercent: 18 }, // Steel: 12.375 kg @ 48.60 = 601.425 -> 601.43
      { qty: 3.333, rate: 5450.75, gstPercent: 12 }, // Cement: 3.333 tons @ 5450.75 = 18167.34975 -> 18167.35
    ];

    const result = computeTotals(items);
    const line1Net = round(12.375 * 48.60);
    const line2Net = round(3.333 * 5450.75);
    expect(result.subTotal).toBe(round(line1Net + line2Net));

    // Verify strict invariant: subTotal + cgst + sgst + roundOff === netAmount
    const checkSum = round(result.subTotal + result.cgst + result.sgst + result.roundOff);
    expect(checkSum).toBe(result.netAmount);
  });

  it("handles line items with pre-calculated netValue (weight-based & piece-based quoting)", () => {
    const items = [
      { qty: 100, rate: 45, gstPercent: 18, netValue: 2250 }, // Weight mode: 50kg @ Rs.45/kg
      { qty: 50, rate: 120, gstPercent: 18, netValue: 1200 }, // Piece mode: 10 bundles @ Rs.120/bundle
    ];

    const result = computeTotals(items);
    expect(result.subTotal).toBe(3450);
    expect(result.totalGst).toBe(621);
    expect(result.cgst).toBe(310.5);
    expect(result.sgst).toBe(310.5);
    expect(result.netAmount).toBe(4071);
  });

  it("returns zeros for empty items array", () => {
    const result = computeTotals([]);
    expect(result.subTotal).toBe(0);
    expect(result.totalGst).toBe(0);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.netAmount).toBe(0);
    expect(result.roundOff).toBe(0);
  });

  it("strictly enforces the accounting invariant subTotal + cgst + sgst + roundOff === netAmount across 150 random combinations", () => {
    const gstRates = [0, 5, 12, 18, 28];
    for (let i = 0; i < 150; i++) {
      const numItems = Math.floor(Math.random() * 8) + 1;
      const items = Array.from({ length: numItems }, () => ({
        qty: round(Math.random() * 500 + 0.1, 3),
        rate: round(Math.random() * 2500 + 0.5, 2),
        gstPercent: gstRates[Math.floor(Math.random() * gstRates.length)],
      }));

      const totals = computeTotals(items);
      const reconstructed = round(totals.subTotal + totals.cgst + totals.sgst + totals.roundOff);

      expect(reconstructed).toBe(totals.netAmount);
      expect(Number.isInteger(totals.netAmount)).toBe(true);
    }
  });

  it("includes global loading charges in the final netAmount calculation", () => {
    const items = [
      { qty: 10, rate: 100, gstPercent: 18 }
    ];
    const result = computeTotals(items, 150);
    expect(result.subTotal).toBe(1000);
    expect(result.totalLoadingCharges).toBe(150);
    expect(result.netAmount).toBe(1330);
  });
});

describe("amountInWords — Indian Currency System", () => {
  it("converts zero", () => {
    expect(amountInWords(0)).toBe("Rupees Zero Only");
  });

  it("converts single and double digit amounts", () => {
    expect(amountInWords(5)).toBe("Rupees Five Only");
    expect(amountInWords(45)).toBe("Rupees Forty Five Only");
    expect(amountInWords(99)).toBe("Rupees Ninety Nine Only");
  });

  it("converts hundreds, thousands, lakhs, and crores", () => {
    expect(amountInWords(500)).toBe("Rupees Five Hundred Only");
    expect(amountInWords(15000)).toBe("Rupees Fifteen Thousand Only");
    expect(amountInWords(250000)).toBe("Rupees Two Lakh Fifty Thousand Only");
    expect(amountInWords(12545000)).toBe("Rupees One Crore Twenty Five Lakh Forty Five Thousand Only");
  });

  it("converts amounts with paise correctly", () => {
    expect(amountInWords(500.50)).toBe("Rupees Five Hundred and Fifty Paise Only");
    expect(amountInWords(1234.05)).toBe("Rupees One Thousand Two Hundred Thirty Four and Five Paise Only");
    expect(amountInWords(99.99)).toBe("Rupees Ninety Nine and Ninety Nine Paise Only");
  });
});
