import { describe, it, expect } from "vitest";

// ── parseId utility (extracted from [id]/route.ts) ────────────────────────────

function parseId(id: string): number {
  const n = parseInt(id);
  return isNaN(n) ? -1 : n;
}

describe("parseId", () => {
  it("parses valid numeric string", () => {
    expect(parseId("42")).toBe(42);
  });

  it("returns -1 for NaN strings", () => {
    expect(parseId("abc")).toBe(-1);
  });

  it("returns -1 for empty string", () => {
    expect(parseId("")).toBe(-1);
  });

  it("parses leading-zero numbers", () => {
    expect(parseId("007")).toBe(7);
  });

  it("strips decimals", () => {
    expect(parseId("5.9")).toBe(5);
  });
});

// ── API line item validation (extracted from PUT route filter) ───────────────

function isValidLineItem(item: Record<string, unknown>): boolean {
  return (
    typeof item.description === "string" &&
    item.description.trim().length > 0 &&
    typeof item.rate === "number" &&
    Number.isFinite(item.rate) &&
    item.rate >= 0 &&
    typeof item.qty === "number" &&
    Number.isFinite(item.qty) &&
    item.qty >= 0
  );
}

describe("isValidLineItem (API filter)", () => {
  it("accepts a valid item", () => {
    expect(isValidLineItem({
      description: "Widget",
      rate: 100,
      qty: 5,
    })).toBe(true);
  });

  it("rejects empty description", () => {
    expect(isValidLineItem({ description: "", rate: 100, qty: 5 })).toBe(false);
  });

  it("rejects whitespace-only description", () => {
    expect(isValidLineItem({ description: "   ", rate: 100, qty: 5 })).toBe(false);
  });

  it("rejects NaN rate", () => {
    expect(isValidLineItem({ description: "W", rate: NaN, qty: 5 })).toBe(false);
  });

  it("rejects negative rate", () => {
    expect(isValidLineItem({ description: "W", rate: -1, qty: 5 })).toBe(false);
  });

  it("allows zero rate", () => {
    expect(isValidLineItem({ description: "W", rate: 0, qty: 5 })).toBe(true);
  });

  it("rejects NaN qty", () => {
    expect(isValidLineItem({ description: "W", rate: 100, qty: NaN })).toBe(false);
  });

  it("rejects negative qty", () => {
    expect(isValidLineItem({ description: "W", rate: 100, qty: -1 })).toBe(false);
  });

  it("allows zero qty", () => {
    expect(isValidLineItem({ description: "W", rate: 100, qty: 0 })).toBe(true);
  });

  it("rejects missing description", () => {
    expect(isValidLineItem({ rate: 100, qty: 5 })).toBe(false);
  });

  it("rejects string rate", () => {
    expect(isValidLineItem({ description: "W", rate: "100", qty: 5 })).toBe(false);
  });

  it("rejects string qty", () => {
    expect(isValidLineItem({ description: "W", rate: 100, qty: "5" })).toBe(false);
  });

  it("rejects null/undefined description", () => {
    expect(isValidLineItem({ description: null, rate: 100, qty: 5 })).toBe(false);
  });

  it("rejects Infinity rate", () => {
    expect(isValidLineItem({ description: "W", rate: Infinity, qty: 5 })).toBe(false);
  });

  it("rejects Infinity qty", () => {
    expect(isValidLineItem({ description: "W", rate: 100, qty: Infinity })).toBe(false);
  });
});

// ── Collision-avoiding quotNo (extracted from quot-no.ts) ────────────────────

function assignQuotNo(
  maxId: number,
  existingNumbers: Set<string>,
): string {
  let num = maxId + 1;
  let candidate = String(num);
  while (existingNumbers.has(candidate)) {
    num += 1;
    candidate = String(num);
  }
  return candidate;
}

describe("assignQuotNo", () => {
  it("returns maxId + 1 when no collision", () => {
    expect(assignQuotNo(5, new Set())).toBe("6");
  });

  it("skips colliding numbers", () => {
    expect(assignQuotNo(5, new Set(["6", "7"]))).toBe("8");
  });

  it("skips multiple collisions", () => {
    const existing = new Set(["6", "7", "8", "9", "10"]);
    expect(assignQuotNo(5, existing)).toBe("11");
  });

  it("handles zero maxId", () => {
    expect(assignQuotNo(0, new Set())).toBe("1");
  });

  it("handles string-based collision set", () => {
    // quotNo could be strings that aren't numeric
    const existing = new Set(["001", "UNK-42"]);
    expect(assignQuotNo(0, existing)).toBe("1");
  });
});
