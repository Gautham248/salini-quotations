import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db"; import { requireAuth } from "@/lib/auth-guards";
function parseId(id: string): number { const n = parseInt(id); return isNaN(n) ? -1 : n; }
async function getQuotation(id: number, uid: number, isAdmin: boolean) { if (id <= 0) return null; const q = await db.quotation.findUnique({ where: { id }, include: { createdBy: { select: { username: true } }, lineItems: { include: { masterItem: true }, orderBy: { lineNo: "asc" } } } }); if (!q) return null; if (!isAdmin && q.createdById !== uid) return null; return q; }
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) { const s = await requireAuth(); const { id } = await params; const q = await getQuotation(parseId(id), s.user.id, s.user.role === "admin"); return q ? NextResponse.json(q) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAuth();
  const { id } = await params;
  const idn = parseId(id);
  if (idn <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const b = await req.json();
  const ex = await db.quotation.findUnique({
    where: { id: idn },
    include: { lineItems: true },
  });

  if (!ex || (ex.createdById !== s.user.id && s.user.role !== "admin")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check document level lock for non-admin users
  if (ex.isLocked && s.user.role !== "admin") {
    return NextResponse.json(
      { error: "This quotation is locked by an administrator and cannot be edited by staff." },
      { status: 403 }
    );
  }

  // Only admins can edit finalized quotations
  if (ex.status === "finalized" && s.user.role !== "admin") {
    return NextResponse.json({ error: "Cannot edit finalized quotation" }, { status: 400 });
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
      deliveryTerms: b.deliveryTerms,
      gstNote: b.gstNote,
      validity: b.validity ?? ex.validity,
      paymentTerms: b.paymentTerms ?? ex.paymentTerms,
      status: b.status ?? ex.status,
      isLocked: b.isLocked !== undefined ? Boolean(b.isLocked) : ex.isLocked,
    },
  });

  if (b.lineItems && Array.isArray(b.lineItems)) {
    await db.quotationLineItem.deleteMany({ where: { quotationId: idn } });
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
      await db.quotationLineItem.createMany({
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
        })),
      });
    }
  }

  const upd = await getQuotation(idn, s.user.id, s.user.role === "admin");
  return NextResponse.json(upd);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAuth(); const { id } = await params; const idn = parseId(id); if (idn <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const q = await db.quotation.findUnique({ where: { id: idn } }); if (!q || (q.createdById !== s.user.id && s.user.role !== "admin")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.quotationLineItem.deleteMany({ where: { quotationId: idn } }); await db.quotation.delete({ where: { id: idn } }); return NextResponse.json({ success: true });
}
