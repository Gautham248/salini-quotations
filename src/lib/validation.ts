import { z } from "zod/v4";

export const lineItemSchema = z.object({
  id: z.number().int().positive().optional(),
  key: z.string().min(1),
  lineNo: z.number().int().positive(),
  masterItemId: z.number().int().positive().nullable(),
  description: z.string().min(1, "Description is required"),
  unit: z.string(),
  rate: z.number().finite().min(0, "Rate must be non-negative"),
  gstPercent: z.number().finite().min(0).max(100, "GST must be between 0 and 100"),
  qty: z.number().finite().min(0, "Quantity must be non-negative"),
  netValue: z.number().finite(),
  quoteMode: z.enum(["quantity", "weight", "pieces"]),
  weightKg: z.number().finite().min(0).nullable(),
  weightPerUnit: z.number().finite().positive().nullable(),
  pieceCount: z.number().finite().int().min(0).nullable(),
  piecesPerUnit: z.number().finite().int().positive().nullable(),
  isLocked: z.boolean().optional(),
});

export const partialLineItemSchema = z.object({
  masterItemId: z.number().int().positive().nullable(),
  lineNo: z.number().int().positive().optional(),
  description: z.string().min(1, "Description is required"),
  unit: z.string(),
  rate: z.number().finite().min(0, "Rate must be non-negative"),
  gstPercent: z.number().finite().min(0).max(100, "GST must be between 0 and 100"),
  qty: z.number().finite().min(0, "Quantity must be non-negative"),
  netValue: z.number().finite(),
  quoteMode: z.enum(["quantity", "weight", "pieces"]),
  weightKg: z.number().finite().nullable().optional(),
  pieceCount: z.number().finite().int().nullable().optional(),
});

export const quotationHeaderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerAddress: z.string(),
  customerPlace: z.string(),
  customerGstin: z.string(),
  quotDate: z.string().min(1),
  refNo: z.string(),
  deliveryTerms: z.string(),
  gstNote: z.string(),
  validity: z.string(),
  paymentTerms: z.string(),
});

export const cartItemSchema = z.object({
  masterItemId: z.number().int().positive(),
  description: z.string().min(1, "Description is required"),
  unit: z.string().min(1, "Unit is required"),
  unitId: z.number().int().nonnegative(),
  rate: z.number().finite().min(0, "Rate must be non-negative"),
  gstPercent: z.number().finite().min(0).max(100, "GST must be between 0 and 100"),
  qty: z.number().finite().min(0, "Quantity must be non-negative"),
  weightPerUnit: z.number().finite().positive().nullable(),
  piecesPerUnit: z.number().finite().int().positive().nullable(),
});

export type ValidatedLineItem = z.infer<typeof lineItemSchema>;
export type ValidatedPartialLineItem = z.infer<typeof partialLineItemSchema>;
export type ValidatedQuotationHeader = z.infer<typeof quotationHeaderSchema>;
export type ValidatedCartItem = z.infer<typeof cartItemSchema>;

/**
 * Check if a line item is effectively empty (no description, no meaningful
 * quantities, and zero rate — i.e. a placeholder with no real data).
 */
export function isLineItemEffectivelyEmpty(item: {
  description: string;
  qty: number;
  rate: number;
  masterItemId: number | null;
}): boolean {
  const hasDescription = item.description.trim().length > 0;
  const hasQuantity = item.qty > 0;
  const hasRate = item.rate > 0;
  const hasMasterItem = item.masterItemId !== null;

  if (hasMasterItem) {
    // Catalog items need qty > 0 to be meaningful
    return !hasQuantity;
  }

  // Custom items need at least a description AND (qty OR rate)
  if (hasDescription && (hasQuantity || hasRate)) return false;
  return true;
}
