import { describe, it, expect } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import { UnitHoverCard } from "@/components/items/unit-hover-card";

describe("UnitHoverCard", () => {
  it("renders simple unit name when item has no alternate units", () => {
    const { container } = render(
      <UnitHoverCard primaryUnit={{ id: 1, name: "Nos" }} alternateUnits={[]} />
    );
    expect(container.textContent).toBe("Nos");
    expect(container.querySelector(".bg-primary\\/10")).toBeNull();
  });

  it("renders translucent see-through badge with +N indicator when item has alternate units", () => {
    const { container } = render(
      <UnitHoverCard
        primaryUnit={{ id: 1, name: "Roll" }}
        alternateUnits={[
          { id: 1, unitId: 2, unit: { id: 2, name: "Meter" }, conversionFactor: 100 },
        ]}
      />
    );
    expect(container.textContent).toContain("Roll");
    expect(container.textContent).toContain("+1");
  });

  it("opens popup box on mouse enter displaying unit conversion details", async () => {
    const { container } = render(
      <UnitHoverCard
        primaryUnit={{ id: 1, name: "Roll" }}
        alternateUnits={[
          { id: 1, unitId: 2, unit: { id: 2, name: "Meter" }, conversionFactor: 100 },
        ]}
        rate={100}
        description="UPVC Sheet Roll"
      />
    );

    const trigger = container.querySelector("[data-slot='popover-trigger']");
    expect(trigger).not.toBeNull();

    await act(async () => {
      fireEvent.mouseEnter(trigger!);
    });

    expect(document.body.textContent).toContain("Unit Conversions");
    expect(document.body.textContent).toContain("UPVC Sheet Roll");
    expect(document.body.textContent).toContain("1 Roll = 100 Meter");
    expect(document.body.textContent).toContain("×100");
    expect(document.body.textContent).toContain("₹10000.00");
  });
});
