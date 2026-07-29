import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { resolveStoreId } from "@/lib/auth-guards";
import { computeTotals, amountInWords } from "@/lib/calculations";
import { generatePdf } from "@/lib/pdf/generate";

async function handleFinalize(idStr: string, req: NextRequest) {
  try {
    const session = await requireAuth();
    const resolvedStoreId = await resolveStoreId(req);
    const isSuperAdmin = session.user.role === "superadmin";

    const idn = parseInt(idStr);
    if (isNaN(idn) || idn <= 0) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const q = await db.quotation.findUnique({
      where: { id: idn },
      include: { lineItems: { orderBy: { lineNo: "asc" } } },
    });

    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Store-scoping: quotation must belong to resolved store
    if (!isSuperAdmin && resolvedStoreId !== null && q.storeId !== resolvedStoreId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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

    const settings = upd.storeId
      ? await db.companySettings.findUnique({
          where: { storeId: upd.storeId },
        })
      : null;

    const pdf = await generatePdf(
      upd as unknown as Record<string, unknown>,
      settings as unknown as Record<string, unknown> | null
    );

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Quotation_${upd.quotNo}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error finalizing/generating PDF:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF quotation" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleFinalize(id, req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleFinalize(id, req);
}
