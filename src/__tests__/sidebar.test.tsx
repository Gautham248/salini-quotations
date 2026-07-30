import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/superadmin"),
}));

import { useSession } from "next-auth/react";

function renderWithRole(role: string) {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: 1, role, name: "Test User", email: "test@test.com" } },
    status: "authenticated",
    update: vi.fn(),
  } as never);
  return render(<Sidebar />);
}

describe("Sidebar — superadmin links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes New Quotation link for superadmin", () => {
    const { getByText } = renderWithRole("superadmin");
    expect(getByText("New Quotation")).toBeDefined();
  });

  it("includes All Quotations link for superadmin", () => {
    const { getAllByText } = renderWithRole("superadmin");
    expect(getAllByText("All Quotations").length).toBeGreaterThan(0);
  });

  it("includes Stores link for superadmin", () => {
    const { getAllByText } = renderWithRole("superadmin");
    expect(getAllByText("Stores").length).toBeGreaterThan(0);
  });

  it("does NOT show New Quotation link for admin", () => {
    const { queryByText } = renderWithRole("admin");
    expect(queryByText("New Quotation")).toBeNull();
  });

  it("does NOT show New Quotation link for staff", () => {
    const { queryByText } = renderWithRole("staff");
    expect(queryByText("New Quotation")).toBeNull();
  });

  it("does NOT show New Quotation link for manager", () => {
    const { queryByText } = renderWithRole("manager");
    expect(queryByText("New Quotation")).toBeNull();
  });

  it("superadmin sees user role displayed", () => {
    const { getAllByText } = renderWithRole("superadmin");
    expect(getAllByText("superadmin").length).toBeGreaterThan(0);
  });

  it("admin sees correct role-specific links", () => {
    const { getAllByText } = renderWithRole("admin");
    expect(getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(getAllByText("Master Items").length).toBeGreaterThan(0);
    expect(getAllByText("Units").length).toBeGreaterThan(0);
    expect(getAllByText("Users").length).toBeGreaterThan(0);
    expect(getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("staff sees limited links", () => {
    const { getAllByText } = renderWithRole("staff");
    expect(getAllByText("My Quotations").length).toBeGreaterThan(0);
    expect(getAllByText("Master Items").length).toBeGreaterThan(0);
  });

  it("all New Quotation link hrefs point to /quotations/new", () => {
    const { container } = renderWithRole("superadmin");
    const links = container.querySelectorAll("a");
    const newQuotLink = Array.from(links).find(a => a.textContent === "New Quotation");
    expect(newQuotLink).toBeDefined();
    expect(newQuotLink?.getAttribute("href")).toBe("/quotations/new");
  });
});
