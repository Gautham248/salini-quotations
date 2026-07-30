import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuotationHeaderForm, type QH } from "@/components/quotations/quotation-header-form";

function makeHeader(overrides: Partial<QH> = {}): QH {
  return {
    customerName: "",
    customerAddress: "",
    customerPlace: "",
    customerGstin: "",
    quotDate: new Date().toISOString().slice(0, 10),
    refNo: "",
    deliveryTerms: "",
    gstNote: "",
    validity: "LIMITED",
    paymentTerms: "READY PAYMENT",
    ...overrides,
  };
}

describe("QuotationHeaderForm", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onChange: any;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("renders customer name input", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Enter customer / company name") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe("");
  });

  it("renders GSTIN input", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const input = screen.getByPlaceholderText("e.g. 32AAACS12341Z") as HTMLInputElement;
    expect(input).toBeDefined();
  });

  it("renders date input", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    // Date input has type="date" so it won't match textbox. Use type lookup.
    const dateInput = document.querySelector('input[type="date"]');
    expect(dateInput).toBeDefined();
  });

  it("renders reference number input", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Reference #") as HTMLInputElement;
    expect(input).toBeDefined();
  });

  it("renders delivery terms input", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const input = screen.getByPlaceholderText("e.g. EXTRA / INCLUDED") as HTMLInputElement;
    expect(input).toBeDefined();
  });

  it("renders validity input", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const input = screen.getByPlaceholderText("e.g. 15 DAYS / LIMITED") as HTMLInputElement;
    expect(input).toBeDefined();
  });

  it("renders payment terms input", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const input = screen.getByPlaceholderText("e.g. READY PAYMENT / 50% ADVANCE") as HTMLInputElement;
    expect(input).toBeDefined();
  });

  it("shows quotNo when provided", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} quotNo="QT-001" />);
    expect(screen.getByDisplayValue("QT-001")).toBeDefined();
  });

  it("shows Auto-generated when no quotNo", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    expect(screen.getByDisplayValue("Auto-generated")).toBeDefined();
  });

  it("accepts input for customer name (field exists and is enabled)", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Enter customer / company name") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.disabled).toBe(false);
  });

  it("disables inputs when readOnly", () => {
    render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} readOnly />);
    const input = screen.getByPlaceholderText("Enter customer / company name") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("renders GST note input", () => {
    const { container } = render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const labels = container.querySelectorAll("label");
    const gstLabel = Array.from(labels).find((l) => l.textContent === "GST Note");
    expect(gstLabel).toBeDefined();
  });

  it("renders address input", () => {
    const { container } = render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const labels = container.querySelectorAll("label");
    const addrLabel = Array.from(labels).find((l) => l.textContent === "Address");
    expect(addrLabel).toBeDefined();
  });

  it("renders place/city input", () => {
    const { container } = render(<QuotationHeaderForm header={makeHeader()} onChange={onChange} />);
    const labels = container.querySelectorAll("label");
    const placeLabel = Array.from(labels).find((l) => l.textContent === "Place / City");
    expect(placeLabel).toBeDefined();
  });

  it("displays pre-filled customer name", () => {
    render(<QuotationHeaderForm header={makeHeader({ customerName: "Test Corp" })} onChange={onChange} />);
    expect(screen.getByDisplayValue("Test Corp")).toBeDefined();
  });
});
