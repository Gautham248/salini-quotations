# Feature plan: Quotation Bill Enhancements

**Repository:** leedsdigital/salini-quotations
**Requested by:** @gauthamkrishna
**Date:** 2026-08-11

---

## What this feature does

Enhances the quotation bill (on-screen preview and PDF) with six improvements:

1. **GST-excluded rates**: Rate entered = MRP (GST-inclusive). Bill shows GST-excluded rate + GST separately. Final total = sum of MRP values.
2. **Loading charges**: A single loading-charges field on the quotation (entered by staff/admin/manager), shown in the totals section of the bill.
3. **Editable line items**: All columns remain editable post-creation (already mostly true; verified against locked-item rules).
4. **Remark column**: Free-text field per line item for brand details, narration, etc.
5. **Alternate quantity**: Items with alternate units (e.g. Pipe: primary=Nos, alternate=Kg via MasterItemUnit) display the converted quantity. If qty = 5 (primary unit) and conversionFactor = 0.1 (1 Nos = 0.1 Kg), Alt Qty = 5 × 0.1 = 0.5 Kg. The rate is per the primary unit — the conversion is purely for display.
6. **Payment QR code**: Placeholder image in the bill footer, configurable by admin/manager via company settings.

## How it fits the existing codebase

Extends the Quotation schema (`prisma/schema.prisma`), the line-item UI (`src/components/quotations/quotation-line-items.tsx`), the on-screen preview (`src/components/quotations/quotation-preview.tsx`), the PDF template (`src/lib/pdf/quotation-template.tsx`), the calculation logic (`src/lib/calculations.ts`), and company settings (`src/app/api/settings/route.ts`). Uses existing alternate-unit data in `MasterItemUnit` and `UnitConversion`.

## Implementation steps

### 1. Data model — schema and migrations

Add fields to Prisma schema:

- **QuotationLineItem**: add `remark` String? (brand/narration), `altQty` Float? (computed as `qty × conversionFactor` from the item's alternate unit), `altUnit` String? (alternate unit name, e.g. "Kg"), `gstMode` String @default("inclusive") (backward compatibility with old exclusive-mode quotations).
- **Quotation**: add `loadingCharges` Float? (single field, entered by staff/admin/manager, shown in the totals section).
- **CompanySettings**: add `paymentQrCode` String? (URL or base64 data URI, configurable by admin/manager).

Run `prisma migrate dev` to generate the migration.

### 2. Calculation layer — GST-excluded rate logic

Modify `src/lib/calculations.ts`:

- Add `computeGstExcludedRate(rate: number, gstPercent: number): number` — returns `rate / (1 + gstPercent / 100)`.
- Add `computeLineItemGst(netValue: number, gstPercent: number): number` — returns `netValue * gstPercent / (100 + gstPercent)` (reverse-computes GST from MRP-inclusive values).
- Extend `LineItemInput` with optional `gstExcludedRate`, `gstMode`, `loadingCharges`.
- Modify `computeTotals()`: when `gstMode` is "inclusive", compute subTotalBeforeTax from `qty * gstExcludedRate`, compute GST via reverse formula; netAmount = round(subTotalBeforeTax + cgst + sgst + loadingCharges) ≈ sum(qty × rate). When "exclusive" (old mode), use existing formula unchanged.
- `LineTotals` gains fields: `subTotalBeforeTax` (taxable base), `loadingCharges`, `totalLoadingCharges`.

Risk: all new quotations default to inclusive mode. Existing saved quotations are unaffected (exclusive mode).

### 3. Line item hook and UI — editable columns + remark

Modify `src/hooks/use-quotation.ts`:

- `LineItem` interface gains: `remark: string`, `gstExcludedRate: number`, `altQty: number | null`, `altUnit: string | null`, `loadingCharges: number`, `gstMode: string`.
- `calcNetValue()`: when gstMode is "inclusive", netValue = `qty * computeGstExcludedRate(rate, gstPercent)` (taxable value).
- Autosave payload includes new fields: `remark`, `gstExcludedRate`, `altQty`, `altUnit`, `loadingCharges`, `gstMode`.
- When catalog items have alternate units (MasterItemUnit records), populate `altQty = qty × conversionFactor` and `altUnit = alternateUnit.name`. The `conversionFactor` on `MasterItemUnit` defines how many alternate units per 1 primary unit — so qty in primary units multiplied by factor gives altQty. When qty is updated, reclculate altQty accordingly. Rate is always per the primary unit (no adjustment needed).
- When loading saved quotations, extract `altQty` and `altUnit` from stored values. If the item still has a MasterItemUnit relationship, re-derive altQty from current qty; if not (item was deleted/updated), use stored values as-is.

Modify `src/components/quotations/quotation-line-items.tsx`:

- Add table columns: **Remark** (text input), **Alt Qty** (read-only display when altQty set), **Loading** (number input).
- **Rate** column label changes to "MRP (incl. GST)" — editable as before.
- Add read-only column "Rate (excl. GST)" showing the computed excluded rate.
- Weight column remains; Alt Qty column shows alternate unit conversion.
- Mobile edit sheet gains all new fields.

### 4. On-screen preview — updated columns

Modify `src/components/quotations/quotation-preview.tsx`:

- Table headers: #, Description, Remark, GST%, Qty, Alt Qty, Unit, Rate (excl), Loading, Net Value.
- Rate column shows GST-excluded rate computed on-the-fly.
- GST column shows computed per-line GST amount (from reverse formula).
- Footer totals restructured: Sub Total (taxable), Loading Charges, CGST, SGST, Round Off, Net Amount (= sum of qty × rate).
- Add payment QR code below bank details if `cs.paymentQrCode` is set; skip silently if missing or fails to load.
- `StorePreviewSettings` interface gains `paymentQrCode?: string | null`.

Modify `src/components/quotations/quotation-totals.tsx` to display `subTotalBeforeTax` and `loadingCharges`.

### 5. PDF template — updated columns + QR code

Modify `src/lib/pdf/quotation-template.tsx`:

- Mirror all column changes from the on-screen preview.
- Add payment QR code in the footer area using `@react-pdf/renderer`'s `Image` component. Skip silently if null/fails.
- Update `QuotationData`, `CompanySettingsData` interfaces and `LineItem` interface.
- Update `mapToQuotationData()` and `mapToCompanySettings()` in `src/lib/pdf/generate.ts` to pass new fields.

### 6. Settings API — QR code field

Modify `src/app/api/settings/route.ts`:

- PUT handler: accept `paymentQrCode` field, save/update in CompanySettings.
- GET handler: returns `paymentQrCode` automatically via Prisma `findUnique`.

### 7. Tests

- **`src/__tests__/calculations.test.ts`** — add cases for:
  - `computeGstExcludedRate(60, 18)` → ~50.85
  - `computeLineItemGst(60, 18)` → ~9.15
  - `computeTotals()` inclusive mode: verify subTotalBeforeTax < subTotal, netAmount = sum(qty × rate)
  - `computeTotals()` exclusive mode: backward compatible, existing behavior unchanged
  - Edge: 0% GST, 100% GST, fractional rates, loading charges included in totals
- **`src/__tests__/alternate-units.test.ts`** — extend to test altQty derivation from conversion factors.

## Files to change

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `remark`, `altQty`, `altUnit`, `gstMode`, `loadingCharges` to QuotationLineItem; `loadingCharges` to Quotation; `paymentQrCode` to CompanySettings |
| `src/lib/calculations.ts` | Add `computeGstExcludedRate()`, `computeLineItemGst()`; modify `LineItemInput`, `LineTotals`, `computeTotals()` for dual-mode GST |
| `src/hooks/use-quotation.ts` | `LineItem` gains `remark`, `gstExcludedRate`, `altQty`, `altUnit`, `loadingCharges`, `gstMode`; `calcNetValue()` updated |
| `src/components/quotations/quotation-line-items.tsx` | Add Remark, Alt Qty, Loading columns; add Rate (excl) display; mobile sheet update |
| `src/components/quotations/quotation-preview.tsx` | New table headers, GST-excluded rate display, per-line GST, loading charges, QR code; `StorePreviewSettings` interface update |
| `src/components/quotations/quotation-totals.tsx` | Add subTotalBeforeTax and loadingCharges display |
| `src/lib/pdf/quotation-template.tsx` | Mirror column changes; add QR code rendering; update type interfaces |
| `src/lib/pdf/generate.ts` | Update `mapToQuotationData()` and `mapToCompanySettings()` to include new fields |
| `src/app/api/settings/route.ts` | PUT handler accepts `paymentQrCode` |
| `src/__tests__/calculations.test.ts` | Add GST-excluded/reverse-GST test cases |
| `src/__tests__/alternate-units.test.ts` | Add altQty derivation tests |

## Files to create

| File | Purpose |
|---|---|
| `prisma/migrations/YYYYMMDD_add_bill_enhancements/migration.sql` | Auto-generated by prisma migrate |

## Risks and open questions

- **Backward compatibility**: Old quotations have rate as pre-GST. The `gstMode` field handles this — old records treated as "exclusive", new as "inclusive". If an existing exclusive quotation is duplicated/edited, its mode must be preserved.
- **Loading charges scope**: A single `loadingCharges` field on the Quotation model, shown in the totals section. If per-line-item loading is needed later, the schema can be extended — but this plan keeps it simple with one field.
- **Weight column vs Alt Qty**: The existing Weight column (derived from `weightPerUnit`) stays as-is. The new Alt Qty column (from `MasterItemUnit.conversionFactor`) is separate. An item could show both if it has both a weightPerUnit and an alternate unit — these are independent dimensions.
- **QR code format**: The placeholder can be any URL (image URL, base64 data URI). No upload mechanism is planned — the admin pastes a URL. If a file upload is needed later, that is a separate feature.
- **A4 page space**: Adding 4+ columns to the PDF template may require narrower column widths or smaller fonts to fit A4 width (210mm). Column widths will be adjusted.
- **Weight column**: The existing Weight column remains alongside Alt Qty. If they overlap conceptually, they can be consolidated in a follow-up.

## What this plan does NOT cover

- Purchase/supplier bills or any non-quotation documents
- Mobile app changes
- Email delivery of bills
- Inventory tracking or stock management
- QR code file upload (URL pasting only)
- Changing the quotation creation/edit form layout (only the preview/PDF views are modified)
- Changes to the admin settings UI (the settings API already exists; UI tweaks to add the QR code field are a separate minor task)
- Migration rollback automation (manual DB migration revert suffices per the rollback answer)

---
> This plan was generated by an AI agent based on the current codebase.
> Verify file paths and assumptions before starting implementation.
