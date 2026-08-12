import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { StorePicker } from "@/components/ui/store-picker";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StorePicker", () => {
  it("renders loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const { getByText } = render(
      <StorePicker onSelect={vi.fn()} />
    );
    expect(getByText("Select a store to create a quotation for")).toBeDefined();
  });

  it("shows stores after loading", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: () => Promise.resolve([
        { id: 1, name: "Store A", slug: "store-a" },
        { id: 2, name: "Store B", slug: "store-b" },
      ]),
    }));

    const { findByText } = render(
      <StorePicker onSelect={vi.fn()} />
    );

    expect(await findByText("Store A")).toBeDefined();
    expect(await findByText("Store B")).toBeDefined();
    expect(await findByText("store-a")).toBeDefined();
  });

  it("shows empty message when no stores", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    }));

    const { findByText } = render(
      <StorePicker onSelect={vi.fn()} />
    );

    expect(await findByText("No stores available.")).toBeDefined();
  });

  it("shows heading text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ id: 1, name: "Store A", slug: "store-a" }]),
    }));

    const { findByText } = render(
      <StorePicker onSelect={vi.fn()} />
    );

    expect(await findByText("New Quotation")).toBeDefined();
  });
});
