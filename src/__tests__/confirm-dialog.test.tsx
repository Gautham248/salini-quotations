import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  it("renders when open", () => {
    const onConfirm = vi.fn();
    const { getByText } = render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );
    expect(getByText("Delete Item")).toBeDefined();
    expect(getByText("Are you sure?")).toBeDefined();
    // Cancel and Delete buttons
    expect(getByText("Cancel")).toBeDefined();
    expect(getByText("Delete")).toBeDefined();
  });

  it("does not render when closed", () => {
    const { queryByText } = render(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={vi.fn()}
      />
    );
    expect(queryByText("Delete Item")).toBeNull();
  });

  it("uses custom confirm label", () => {
    const { getByText } = render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Remove"
        description="Proceed?"
        confirmLabel="Yes, Remove"
        onConfirm={vi.fn()}
      />
    );
    expect(getByText("Yes, Remove")).toBeDefined();
  });

  it("renders non-destructive button variant", () => {
    const { getByRole } = render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Save Changes"
        description="Apply these changes?"
        destructive={false}
        confirmLabel="Save"
        onConfirm={vi.fn()}
      />
    );
    const btn = getByRole("button", { name: "Save" });
    expect(btn).toBeDefined();
  });
});
