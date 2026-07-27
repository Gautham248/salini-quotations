import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db"; import { requireAuth } from "@/lib/auth-guards"; import { nextQuotNo } from "@/lib/quot-no";
export async function GET(req: NextRequest) {
  const s = await requireAuth(); const { searchParams } = new URL(req.url); const search = searchParams.get("search") || ""; const isAdmin = s.user.role === "admin";
  const where: Record<string, unknown> = {};
  if (!isAdmin) where.createdById = s.user.id;
  if (search) where.OR = [{ customerName: { contains: search } }, { quotNo: { contains: search } }];
  const q = await db.quotation.findMany({ where, include: { createdBy: { select: { username: true } }, lineItems: { orderBy: { lineNo: "asc" } } }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(q);
}
export async function POST(req: NextRequest) {
  const s = await requireAuth();
  const b = await req.json();

  const customerName =
    typeof b.customerName === "string" && b.customerName.trim()
      ? b.customerName.trim()
      : "Draft Customer";

  const quotNo = b.quotNo || (await nextQuotNo());
  const today = new Date(b.quotDate || new Date());

  const q = await db.quotation.create({
    data: {
      quotNo,
      refNo: b.refNo || quotNo,
      quotDate: today,
      status: "draft",
      customerName,
      customerAddress: b.customerAddress || null,
      customerPlace: b.customerPlace || null,
      customerGstin: b.customerGstin || null,
      deliveryTerms: b.deliveryTerms || null,
      gstNote: b.gstNote || null,
      validity: b.validity || "LIMITED",
      paymentTerms: b.paymentTerms || "READY PAYMENT",
      createdById: s.user.id,
    },
  });

  if (b.lineItems && Array.isArray(b.lineItems)) {
    const validItems = b.lineItems.filter(
      (item: Record<string, unknown>) =>
        typeof item.description === "string" && item.description.trim().length > 0
    );
    if (validItems.length > 0) {
      await db.quotationLineItem.createMany({
        data: validItems.map((item: Record<string, unknown>, idx: number) => ({
          quotationId: q.id,
          masterItemId: (item.masterItemId as number) || null,
          lineNo: (item.lineNo as number) ?? idx + 1,
          description: item.description as string,
          unit: item.unit as string,
          rate: (item.rate as number) || 0,
          gstPercent: (item.gstPercent as number) || 0,
          qty: (item.qty as number) || 0,
          netValue: (item.netValue as number) || 0,
          quoteMode: (item.quoteMode as string) || "quantity",
          weightKg: (item.weightKg as number) || null,
          pieceCount: (item.pieceCount as number) || null,
          isLocked: Boolean(item.isLocked),
        })),
      });
    }
  }

  const fullQuot = await db.quotation.findUnique({
    where: { id: q.id },
    include: {
      createdBy: { select: { username: true } },
      lineItems: { include: { masterItem: true }, orderBy: { lineNo: "asc" } },
    },
  });

  return NextResponse.json(fullQuot, { status: 201 });
}
