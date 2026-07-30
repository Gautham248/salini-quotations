import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/quotations/1"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Tests: quotation detail view — extracted rendering logic
// ──────────────────────────────────────────────────────────────────────────────

describe("quotation detail — action visibility", () => {
  function getVisibleActions(params: {
    role: string;
    status: string;
    isLocked: boolean;
    isOwner: boolean;
  }): string[] {
    const actions: string[] = [];
    const isAdmin = params.role === "admin" || params.role === "superadmin" || params.role === "manager";

    // View is always shown
    actions.push("view");

    // Edit: admin or draft owner
    if (isAdmin || params.status === "draft") {
      actions.push("edit");
    }

    // Duplicate: everyone
    actions.push("duplicate");

    // Delete: everyone
    actions.push("delete");

    // Lock/Unlock: admin only
    if (isAdmin) actions.push("toggle-lock");

    // Finalize: admin only or draft owner
    if (isAdmin || (params.status === "draft" && params.isOwner)) {
      actions.push("finalize");
    }

    return actions;
  }

  it("admin sees all actions on any quotation", () => {
    const actions = getVisibleActions({
      role: "admin", status: "finalized", isLocked: true, isOwner: false,
    });
    expect(actions).toContain("edit");
    expect(actions).toContain("toggle-lock");
    expect(actions).toContain("finalize");
  });

  it("staff sees limited actions on own draft", () => {
    const actions = getVisibleActions({
      role: "staff", status: "draft", isLocked: false, isOwner: true,
    });
    expect(actions).toContain("edit");
    expect(actions).not.toContain("toggle-lock");
  });

  it("staff cannot see edit on finalized quotation", () => {
    const actions = getVisibleActions({
      role: "staff", status: "finalized", isLocked: false, isOwner: true,
    });
    expect(actions).not.toContain("edit");
  });

  it("staff cannot see finalize on finalized quotation", () => {
    const actions = getVisibleActions({
      role: "staff", status: "finalized", isLocked: false, isOwner: true,
    });
    // Staff on finalized: isAdmin=false, status!=="draft" → no finalize
    expect(actions).not.toContain("finalize");
  });
});

describe("quotation detail — status badge", () => {
  function getStatusVariant(status: string): string {
    return status === "finalized" ? "default" : "secondary";
  }

  function formatStatus(status: string, isLocked: boolean): { label: string; locked: boolean } {
    return { label: status, locked: isLocked };
  }

  it("returns default variant for finalized", () => {
    expect(getStatusVariant("finalized")).toBe("default");
  });

  it("returns secondary variant for draft", () => {
    expect(getStatusVariant("draft")).toBe("secondary");
  });

  it("returns secondary variant for archived", () => {
    expect(getStatusVariant("archived")).toBe("secondary");
  });

  it("flags locked status separately", () => {
    const result = formatStatus("draft", true);
    expect(result.locked).toBe(true);
    expect(result.label).toBe("draft");
  });
});

describe("quotation detail — amount formatting", () => {
  function formatAmount(n: number | null): string {
    if (n == null) return "—";
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  it("formats thousands", () => {
    expect(formatAmount(1000)).toBe("₹1,000");
  });

  it("formats lakhs", () => {
    expect(formatAmount(250000)).toBe("₹2,50,000");
  });

  it("formats crores", () => {
    expect(formatAmount(15000000)).toBe("₹1,50,00,000");
  });

  it("returns em dash for null", () => {
    expect(formatAmount(null)).toBe("—");
  });

  it("rounds to zero decimal places", () => {
    expect(formatAmount(1234.56)).toBe("₹1,235");
  });
});

describe("quotation detail — date formatting", () => {
  function formatDate(d: string): string {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  it("formats date in Indian locale", () => {
    expect(formatDate("2024-01-15")).toBe("15 Jan 2024");
  });
});
