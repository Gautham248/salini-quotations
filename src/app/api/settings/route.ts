import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth-guards";
import { resolveStoreId } from "@/lib/auth-guards";

export async function GET(req: NextRequest) {
  await requireAuth();
  const storeId = await resolveStoreId(req);
  if (!storeId) {
    return NextResponse.json({ error: "Store context required — use ?storeId= to select a store" }, { status: 400 });
  }

  const s = await db.companySettings.findUnique({ where: { storeId } });
  return NextResponse.json(s);
}

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const storeId = await resolveStoreId(req);
  if (!storeId) {
    return NextResponse.json({ error: "Store context required" }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));
  const existing = await db.companySettings.findUnique({ where: { storeId } });

  if (existing) {
    const u = await db.companySettings.update({
      where: { id: existing.id },
      data: {
        companyName: b.companyName ?? existing.companyName,
        subheading: b.subheading ?? existing.subheading,
        phone: b.phone ?? existing.phone,
        mobile: b.mobile ?? existing.mobile,
        email: b.email ?? existing.email,
        gstin: b.gstin ?? existing.gstin,
        bankDetails: b.bankDetails ?? existing.bankDetails,
        disclaimerText: b.disclaimerText ?? existing.disclaimerText,
        loadingNote: b.loadingNote ?? existing.loadingNote,
        paymentQrCode: b.paymentQrCode ?? existing.paymentQrCode,
        pan: b.pan ?? existing.pan,
        declarationText: b.declarationText ?? existing.declarationText,
        jurisdiction: b.jurisdiction ?? existing.jurisdiction,
      },
    });
    return NextResponse.json(u);
  }

  const c = await db.companySettings.create({
    data: {
      storeId,
      companyName: b.companyName || "",
      subheading: b.subheading || "",
      phone: b.phone || "",
      mobile: b.mobile || "",
      email: b.email || "",
      gstin: b.gstin || "",
      bankDetails: b.bankDetails || "",
      disclaimerText: b.disclaimerText || "",
      loadingNote: b.loadingNote || "",
      paymentQrCode: b.paymentQrCode || null,
      pan: b.pan || null,
      declarationText: b.declarationText || null,
      jurisdiction: b.jurisdiction || null,
    },
  });
  return NextResponse.json(c, { status: 201 });
}
