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
  const s = await requireAuth(); const b = await req.json();
  if (typeof b.customerName !== "string" || !b.customerName.trim()) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }
  const quotNo = b.quotNo || await nextQuotNo(); const today = new Date(b.quotDate || new Date());
  const q = await db.quotation.create({ data: { quotNo, refNo: b.refNo || quotNo, quotDate: today, status: "draft", customerName: b.customerName, customerAddress: b.customerAddress || null, customerPlace: b.customerPlace || null, customerGstin: b.customerGstin || null, deliveryTerms: b.deliveryTerms || null, gstNote: b.gstNote || null, validity: b.validity || "LIMITED", paymentTerms: b.paymentTerms || "READY PAYMENT", createdById: s.user.id } });
  return NextResponse.json(q, { status: 201 });
}
