import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/api/settings/route.ts
// ──────────────────────────────────────────────────────────────────────────────

function validatedSettingsInput(body: Record<string, unknown>): {
  companyName: string;
  subheading: string;
  phone: string;
  mobile: string;
  email: string;
  gstin: string;
  bankDetails: string;
  disclaimerText: string;
  loadingNote: string;
} {
  return {
    companyName: typeof body.companyName === "string" ? body.companyName.trim() : "",
    subheading: typeof body.subheading === "string" ? body.subheading.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    mobile: typeof body.mobile === "string" ? body.mobile.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    gstin: typeof body.gstin === "string" ? body.gstin.trim() : "",
    bankDetails: typeof body.bankDetails === "string" ? body.bankDetails.trim() : "",
    disclaimerText: typeof body.disclaimerText === "string" ? body.disclaimerText.trim() : "",
    loadingNote: typeof body.loadingNote === "string" ? body.loadingNote.trim() : "",
  };
}

function storeRequiredForSettings(resolvedStoreId: number | null): boolean {
  return resolvedStoreId !== null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe("validatedSettingsInput", () => {
  it("extracts all fields from body", () => {
    const result = validatedSettingsInput({
      companyName: "Test Corp",
      phone: "1234567890",
      email: "test@corp.com",
    });
    expect(result.companyName).toBe("Test Corp");
    expect(result.phone).toBe("1234567890");
    expect(result.email).toBe("test@corp.com");
  });

  it("trims whitespace from all fields", () => {
    const result = validatedSettingsInput({
      companyName: "  Test Corp  ",
      gstin: "  32ABC  ",
    });
    expect(result.companyName).toBe("Test Corp");
    expect(result.gstin).toBe("32ABC");
  });

  it("defaults missing strings to empty string", () => {
    const result = validatedSettingsInput({});
    expect(result.companyName).toBe("");
    expect(result.bankDetails).toBe("");
    expect(result.disclaimerText).toBe("");
  });

  it("defaults non-string values to empty string", () => {
    const result = validatedSettingsInput({ companyName: 123, phone: null });
    expect(result.companyName).toBe("");
    expect(result.phone).toBe("");
  });
});

describe("storeRequiredForSettings", () => {
  it("requires store ID for settings access", () => {
    expect(storeRequiredForSettings(null)).toBe(false);
    expect(storeRequiredForSettings(5)).toBe(true);
  });
});

describe("settings store scoping", () => {
  // GET: requireAuth() + resolveStoreId(req) — any authenticated user
  // PUT: requireAdmin() + resolveStoreId(req) — admin/manager/superadmin

  function canAccessSettings(role: string, operation: "read" | "write"): boolean {
    if (operation === "read") return true; // any authenticated user
    const adminRoles = new Set(["admin", "superadmin", "manager"]);
    return adminRoles.has(role);
  }

  it("all authenticated users can read settings", () => {
    expect(canAccessSettings("superadmin", "read")).toBe(true);
    expect(canAccessSettings("admin", "read")).toBe(true);
    expect(canAccessSettings("manager", "read")).toBe(true);
    expect(canAccessSettings("staff", "read")).toBe(true);
  });

  it("only admin/superadmin/manager can write settings", () => {
    expect(canAccessSettings("superadmin", "write")).toBe(true);
    expect(canAccessSettings("admin", "write")).toBe(true);
    expect(canAccessSettings("manager", "write")).toBe(true);
    expect(canAccessSettings("staff", "write")).toBe(false);
  });
});
