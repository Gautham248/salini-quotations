import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth-guards";
import { resolveStoreId } from "@/lib/auth-guards";

export async function GET(req: Request) {
  await requireAuth();
  const storeId = await resolveStoreId(req);
  if (!storeId) {
    return Response.json({ error: "Store context required — use ?storeId= to select a store" }, { status: 400 });
  }

  const s = await db.companySettings.findUnique({ where: { storeId } });
  return Response.json(s);
}

export async function PUT(req: Request) {
  await requireAdmin();
  const storeId = await resolveStoreId(req);
  if (!storeId) {
    return Response.json({ error: "Store context required" }, { status: 400 });
  }

  const b = await req.json();
  const existing = await db.companySettings.findUnique({ where: { storeId } });

  if (existing) {
    const u = await db.companySettings.update({
      where: { id: existing.id },
      data: {
        companyName: b.companyName,
        subheading: b.subheading,
        phone: b.phone,
        mobile: b.mobile,
        email: b.email,
        gstin: b.gstin,
        bankDetails: b.bankDetails,
        disclaimerText: b.disclaimerText,
        loadingNote: b.loadingNote,
      },
    });
    return Response.json(u);
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
    },
  });
  return Response.json(c, { status: 201 });
}
