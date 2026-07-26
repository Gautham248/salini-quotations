import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db"; import { requireAuth } from "@/lib/auth-guards"; import { computeTotals, amountInWords } from "@/lib/calculations"; import { generatePdf } from "@/lib/pdf/generate";
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAuth(); const { id } = await params; const idn = parseInt(id);
  const q = await db.quotation.findUnique({ where: { id: idn }, include: { lineItems: true } }); if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 }); if (q.lineItems.length === 0) return NextResponse.json({ error: "At least one line item required" }, { status: 400 });
  const totals = computeTotals(q.lineItems); const words = amountInWords(totals.netAmount);
  const upd = await db.quotation.update({ where: { id: idn }, data: { status: "finalized", finalizedAt: new Date(), subTotal: totals.subTotal, cgst: totals.cgst, sgst: totals.sgst, roundOff: totals.roundOff, netAmount: totals.netAmount, amountInWords: words }, include: { lineItems: { orderBy: { lineNo: "asc" } } } });
  const settings = await db.companySettings.findFirst();
  const pdf = await generatePdf(upd, settings);
  return new NextResponse(pdf as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Quotation_${upd.quotNo}.pdf"` } });
}
