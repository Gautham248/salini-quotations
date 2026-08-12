import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { resolveStoreId } from "@/lib/auth-guards";
import { computeTotals, amountInWords } from "@/lib/calculations";

function parseId(id: string): number {
  const n = parseInt(id);
  return isNaN(n) ? -1 : n;
}

async function getQuotation(id: number, storeId: number | null, userId: number, canBypassStoreScope: boolean) {
  if (id <= 0) return null;
  const q = await db.quotation.findUnique({
    where: { id },
    include: {
      createdBy: { select: { username: true } },
      updatedBy: { select: { username: true } },
      lineItems: { include: { masterItem: true }, orderBy: { lineNo: "asc" } },
    },
  });
  if (!q) return null;

  // Store-scoping: must belong to resolved store (or be superadmin)
  if (!canBypassStoreScope && storeId !== null && q.storeId !== storeId) return null;

  // Staff: can only see their own quotations within their store
  // (server-side only check — admin/superadmin bypass)
  return q;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await requireAuth();
  const { id } = await params;
  const storeId = await resolveStoreId(_req);
  const canBypassStoreScope = s.user.role === "superadmin" || s.user.role === "manager";

  const q = await getQuotation(parseId(id), storeId, s.user.id, canBypassStoreScope);
  return q ? NextResponse.json(q) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await requireAuth();
  const { id } = await params;
  const idn = parseId(id);
  if (idn <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const storeId = await resolveStoreId(req);
  const isSuperAdmin = s.user.role === "superadmin";
  const isAdmin = s.user.role === "admin" || s.user.role === "manager" || isSuperAdmin;

  const ex = await db.quotation.findUnique({
    where: { id: idn },
    include: { lineItems: true },
  });

  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Store-scoping: quotation must belong to resolved store
  if (!isSuperAdmin && storeId !== null && ex.storeId !== storeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership: staff can only edit their own, admin can edit any in their store
  if (!isAdmin && ex.createdById !== s.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const b = await req.json().catch(() => ({}));

  // Check document-level lock for non-admin users
  if (ex.isLocked && !isAdmin) {
    return NextResponse.json(
      { error: "This quotation is locked by an administrator and cannot be edited by staff." },
      { status: 403 }
    );
  }

  // Only admins can edit finalized quotations
  if (ex.status === "finalized" && !isAdmin) {
    return NextResponse.json({ error: "Cannot edit finalized quotation" }, { status: 400 });
  }

  let totalsData: Record<string, unknown> = {};
  if (b.lineItems && Array.isArray(b.lineItems)) {
    const validItems = b.lineItems.filter(
      (item: Record<string, unknown>) =>
        typeof item.description === "string" &&
        item.description.trim().length > 0 &&
        typeof item.rate === "number" &&
        Number.isFinite(item.rate) &&
        item.rate >= 0 &&
        typeof item.qty === "number" &&
        Number.isFinite(item.qty) &&
        item.qty >= 0
    );

    if (validItems.length > 0) {
      const totals = computeTotals(
        validItems.map((i: Record<string, unknown>) => ({
          qty: i.qty as number,
          rate: i.rate as number,
          gstPercent: (i.gstPercent as number) || 0,
          netValue: typeof i.netValue === "number" ? (i.netValue as number) : undefined,
          gstExcludedRate: typeof i.gstExcludedRate === "number" ? (i.gstExcludedRate as number) : undefined,
          gstMode: (i.gstMode as string) || "inclusive",
        })),
        typeof b.loadingCharges === "number" ? b.loadingCharges : (ex.loadingCharges ?? 0)
      );
      totalsData = {
        subTotal: totals.subTotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        roundOff: totals.roundOff,
        netAmount: totals.netAmount,
        amountInWords: amountInWords(totals.netAmount),
        loadingCharges: totals.totalLoadingCharges,
      };

      await db.$transaction(async (tx) => {
        await tx.quotationLineItem.deleteMany({ where: { quotationId: idn } });
        await tx.quotationLineItem.createMany({
          data: validItems.map((item: Record<string, unknown>, idx: number) => ({
            quotationId: idn,
            masterItemId: (item.masterItemId as number) || null,
            lineNo: (item.lineNo as number) ?? idx + 1,
            description: item.description as string,
            unit: item.unit as string,
            rate: item.rate as number,
            gstPercent: item.gstPercent as number,
            qty: item.qty as number,
            netValue: item.netValue as number,
            quoteMode: (item.quoteMode as string) || "quantity",
            weightKg: (item.weightKg as number) || null,
            pieceCount: (item.pieceCount as number) || null,
            isLocked: Boolean(item.isLocked),
            remark: (item.remark as string) || null,
            altQty: (item.altQty as number) || null,
            altUnit: (item.altUnit as string) || null,
            gstMode: (item.gstMode as string) || "inclusive",
            loadingCharges: (item.loadingCharges as number) || null,
          })),
        });
      });
    } else {
      totalsData = {
        subTotal: 0,
        cgst: 0,
        sgst: 0,
        roundOff: 0,
        netAmount: 0,
        amountInWords: "Rupees Zero Only",
      };
    }
  }

  await db.quotation.update({
    where: { id: idn },
    data: {
      quotNo: b.quotNo ?? ex.quotNo,
      refNo: b.refNo ?? ex.refNo,
      quotDate: b.quotDate ? new Date(b.quotDate) : ex.quotDate,
      customerName: b.customerName ?? ex.customerName,
      customerAddress: b.customerAddress,
      customerPlace: b.customerPlace,
      customerGstin: b.customerGstin,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      shipToName: b.shipToName,
      shipToAddress: b.shipToAddress,
      shipToPlace: b.shipToPlace,
      shipToGstin: b.shipToGstin,
      deliveryNote: b.deliveryNote,
      deliveryTerms: b.deliveryTerms,
      gstNote: b.gstNote,
      validity: b.validity ?? ex.validity,
      paymentTerms: b.paymentTerms ?? ex.paymentTerms,
      status: b.status ?? ex.status,
      isLocked: b.isLocked !== undefined ? Boolean(b.isLocked) : ex.isLocked,
      updatedById: s.user.id,
      loadingCharges: typeof b.loadingCharges === "number" ? b.loadingCharges : ex.loadingCharges,
      ...totalsData,
    },
  });

  const upd = await getQuotation(idn, storeId, s.user.id, isSuperAdmin);
  return NextResponse.json(upd);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await requireAuth();
  const { id } = await params;
  const idn = parseId(id);
  if (idn <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const storeId = await resolveStoreId(_req);
  const isSuperAdmin = s.user.role === "superadmin";
  const isAdmin = s.user.role === "admin" || s.user.role === "manager" || isSuperAdmin;

  const q = await db.quotation.findUnique({ where: { id: idn } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Store-scoping
  if (!isSuperAdmin && storeId !== null && q.storeId !== storeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership
  if (!isAdmin && q.createdById !== s.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.quotationLineItem.deleteMany({ where: { quotationId: idn } });
  await db.quotation.delete({ where: { id: idn } });
  return NextResponse.json({ success: true });
}
