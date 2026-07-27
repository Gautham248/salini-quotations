import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { computeTotals, amountInWords } from "@/lib/calculations";
import { generatePdf } from "@/lib/pdf/generate";

async function handleFinalize(idStr: string) {
  const idn = parseInt(idStr);
  if (isNaN(idn) || idn <= 0) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const q = await db.quotation.findUnique({
    where: { id: idn },
    include: { lineItems: { orderBy: { lineNo: "asc" } } },
  });

  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (q.lineItems.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required to generate PDF" },
      { status: 400 }
    );
  }

  const totals = computeTotals(q.lineItems);
  const words = amountInWords(totals.netAmount);

  const upd = await db.quotation.update({
    where: { id: idn },
    data: {
      status: "finalized",
      finalizedAt: new Date(),
      subTotal: totals.subTotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      roundOff: totals.roundOff,
      netAmount: totals.netAmount,
      amountInWords: words,
    },
    include: { lineItems: { orderBy: { lineNo: "asc" } } },
  });

  const settings = await db.companySettings.findFirst();
  const pdf = await generatePdf(upd, settings);

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Quotation_${upd.quotNo}.pdf"`,
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;
  return handleFinalize(id);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;
  return handleFinalize(id);
}
