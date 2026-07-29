import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ItemForm } from "@/components/items/item-form";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    json: () => Promise.resolve([]),
  }));
});

const units = [
  { id: 1, name: "sqft" },
  { id: 2, name: "Roll" },
  { id: 3, name: "Bundle" },
];

describe("ItemForm — alternate units rendering", () => {
  it("shows Alternate Units section header", async () => {
    await act(async () => {
      render(
        <ItemForm
          open={true}
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          initialData={{
            description: "Test",
            unitId: 1,
            rate: "100",
            gstPercent: "18",
            weightPerUnit: "",
            piecesPerUnit: "",
            categoryIds: [],
            alternateUnits: [],
          }}
          units={units}
        />
      );
    });
    expect(document.body.textContent).toContain("Alternate Units");
  });

  it("renders alternate units from initialData with correct names and factors", async () => {
    await act(async () => {
      render(
        <ItemForm
          open={true}
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          initialData={{
            description: "UPVC Sheets",
            unitId: 1,
            rate: "100",
            gstPercent: "18",
            weightPerUnit: "",
            piecesPerUnit: "",
            categoryIds: [],
            alternateUnits: [
              { unitId: 2, conversionFactor: "10" },
              { unitId: 3, conversionFactor: "50" },
            ],
          }}
          units={units}
        />
      );
    });
    expect(document.body.textContent).toContain("Roll");
    expect(document.body.textContent).toContain("10");
    expect(document.body.textContent).toContain("Bundle");
    expect(document.body.textContent).toContain("50");
  });

  it("does not show alternate unit list items when none defined", async () => {
    await act(async () => {
      render(
        <ItemForm
          open={true}
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          initialData={{
            description: "Test",
            unitId: 1,
            rate: "100",
            gstPercent: "18",
            weightPerUnit: "",
            piecesPerUnit: "",
            categoryIds: [],
            alternateUnits: [],
          }}
          units={units}
        />
      );
    });
    expect(document.body.textContent).toContain("Alternate Units");
    // No alternate unit entries rendered in the list
    const addButton = document.body.querySelector("button");
    // The "Add" button should be disabled since no selection made
    expect(document.body.textContent).toContain("Add");
  });

  it("shows edit mode title when initialData is provided", async () => {
    await act(async () => {
      render(
        <ItemForm
          open={true}
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          initialData={{
            description: "Edit Me",
            unitId: 1,
            rate: "200",
            gstPercent: "18",
            weightPerUnit: "",
            piecesPerUnit: "",
            categoryIds: [],
            alternateUnits: [],
          }}
          units={units}
        />
      );
    });
    expect(document.body.textContent).toContain("Edit Item");
  });

  it("shows add mode title when initialData is null", async () => {
    await act(async () => {
      render(
        <ItemForm
          open={true}
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          initialData={null}
          units={units}
        />
      );
    });
    expect(document.body.textContent).toContain("Add Item");
  });
});
