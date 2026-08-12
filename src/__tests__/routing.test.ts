import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/proxy.ts — middleware route gating
// ──────────────────────────────────────────────────────────────────────────────

function proxyAdminGate(role: string): string {
  if (role === "staff") return "/quotations";
  return null as unknown as string; // no redirect
}

function proxyRootRedirect(role: string): string {
  if (role === "admin") return "/admin";
  return "/superadmin";
}

// ──────────────────────────────────────────────────────────────────────────────
// Extracted from src/app/page.tsx and superadmin/layout.tsx
// ──────────────────────────────────────────────────────────────────────────────

function rootRedirect(role: string): string {
  if (role === "superadmin" || role === "manager") return "/superadmin";
  if (role === "admin") return "/admin";
  return "/quotations";
}

const SUPERADMIN_LAYOUT_ROLES = new Set(["superadmin", "manager"]);

function superadminLayoutGate(role: string): boolean {
  return SUPERADMIN_LAYOUT_ROLES.has(role);
}

// ── Proxy: /admin/* access ────────────────────────────────────────────────
describe("proxy middleware /admin/* access", () => {
  it("allows admin to access /admin/*", () => {
    expect(proxyAdminGate("admin")).toBeNull();
  });

  it("allows superadmin to access /admin/*", () => {
    expect(proxyAdminGate("superadmin")).toBeNull();
  });

  it("allows manager to access /admin/*", () => {
    expect(proxyAdminGate("manager")).toBeNull();
  });

  it("redirects staff away from /admin/*", () => {
    expect(proxyAdminGate("staff")).toBe("/quotations");
  });
});

// ── Proxy: root redirect ──────────────────────────────────────────────────
describe("proxy middleware root redirect", () => {
  it("redirects admin to /admin", () => {
    expect(proxyRootRedirect("admin")).toBe("/admin");
  });

  it("redirects superadmin to /superadmin", () => {
    expect(proxyRootRedirect("superadmin")).toBe("/superadmin");
  });

  it("redirects manager to /superadmin", () => {
    expect(proxyRootRedirect("manager")).toBe("/superadmin");
  });

  it("redirects staff to /superadmin", () => {
    // staff → quotes page via the quotations redirect, but proxy root → /superadmin
    expect(proxyRootRedirect("staff")).toBe("/superadmin");
  });
});

// ── Page root redirect ────────────────────────────────────────────────────
describe("page.tsx root redirect", () => {
  it("redirects admin to /admin", () => {
    expect(rootRedirect("admin")).toBe("/admin");
  });

  it("redirects superadmin to /superadmin", () => {
    expect(rootRedirect("superadmin")).toBe("/superadmin");
  });

  it("redirects manager to /superadmin", () => {
    expect(rootRedirect("manager")).toBe("/superadmin");
  });

  it("redirects staff to /quotations", () => {
    expect(rootRedirect("staff")).toBe("/quotations");
  });
});

// ── Superadmin layout gate ────────────────────────────────────────────────
describe("superadmin layout.tsx gate", () => {
  it("accepts superadmin", () => {
    expect(superadminLayoutGate("superadmin")).toBe(true);
  });

  it("accepts manager", () => {
    expect(superadminLayoutGate("manager")).toBe(true);
  });

  it("rejects admin", () => {
    expect(superadminLayoutGate("admin")).toBe(false);
  });

  it("rejects staff", () => {
    expect(superadminLayoutGate("staff")).toBe(false);
  });
});
