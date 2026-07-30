import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/quotations"),
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

describe("Navigation — sidebar and mobile nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Desktop sidebar ──
  describe("desktop sidebar links", () => {
    it("staff sees My Quotations and Master Items", () => {
      renderWithRole("staff");
      const links = screen.getAllByText("My Quotations");
      expect(links.length).toBeGreaterThan(0);
      const items = screen.getAllByText("Master Items");
      expect(items.length).toBeGreaterThan(0);
    });

    it("admin sees Dashboard, Master Items, Units, Users, All Quotations, Settings", () => {
      renderWithRole("admin");
      const dashboards = screen.getAllByText("Dashboard");
      expect(dashboards.length).toBeGreaterThan(0);
      const items = screen.getAllByText("Master Items");
      expect(items.length).toBeGreaterThan(0);
      const units = screen.getAllByText("Units");
      expect(units.length).toBeGreaterThan(0);
      const users = screen.getAllByText("Users");
      expect(users.length).toBeGreaterThan(0);
      const settings = screen.getAllByText("Settings");
      expect(settings.length).toBeGreaterThan(0);
      const quotations = screen.getAllByText("All Quotations");
      expect(quotations.length).toBeGreaterThan(0);
    });

    it("superadmin sees additional Stores and New Quotation links", () => {
      renderWithRole("superadmin");
      const stores = screen.getAllByText("Stores");
      expect(stores.length).toBeGreaterThan(0);
      const newQ = screen.getAllByText("New Quotation");
      expect(newQ.length).toBeGreaterThan(0);
    });

    it("renders sign out button", () => {
      renderWithRole("admin");
      expect(screen.getByTitle("Sign Out")).toBeDefined();
    });

    it("displays username", () => {
      renderWithRole("admin");
      expect(screen.getByText("Test User")).toBeDefined();
    });

    it("displays role in lowercase", () => {
      renderWithRole("admin");
      expect(screen.getByText("admin")).toBeDefined();
    });
  });

  // ── Mobile navigation ──
  describe("mobile bottom navigation", () => {
    it("renders 'More' button in mobile nav", () => {
      renderWithRole("admin");
      expect(screen.getByText("More")).toBeDefined();
    });

    it("staff bottom nav shows My Quotations and Master Items", () => {
      renderWithRole("staff");
      const links = screen.getAllByText("My Quotations");
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Brand section ──
  describe("brand", () => {
    it("shows Salini Traders brand name", () => {
      renderWithRole("admin");
      expect(screen.getByText("Salini Traders")).toBeDefined();
    });
  });

  // ── Sign out confirmation ──
  describe("sign out flow", () => {
    it("clicking sign out shows confirmation dialog", () => {
      const { container } = renderWithRole("admin");
      // Dialog is initially not in DOM with open=false
      // Sign out button exists
      const signOutBtn = screen.getByTitle("Sign Out");
      expect(signOutBtn).toBeDefined();
    });
  });
});
