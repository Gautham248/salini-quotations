import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireManager } from "@/lib/auth-guards";
import { requireSuperAdmin } from "@/lib/auth-guards";
import bcrypt from "bcryptjs";

export async function GET() {
  await requireManager();
  const stores = await db.store.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(stores);
}

export async function POST(req: NextRequest) {
  await requireSuperAdmin();
  const b = await req.json().catch(() => ({}));

  if (!b.name || typeof b.name !== "string" || !b.name.trim()) {
    return NextResponse.json({ error: "Store name is required" }, { status: 400 });
  }

  try {
    const store = await db.$transaction(async (tx) => {
      const s = await tx.store.create({
        data: {
          name: b.name.trim(),
          slug: b.slug ? b.slug.trim() : b.name.trim().toLowerCase().replace(/\s+/g, "-"),
        },
      });

      // Create CompanySettings for the store
      await tx.companySettings.create({
        data: {
          storeId: s.id,
          companyName: b.companyName || b.name,
          subheading: b.subheading || "",
          phone: b.phone || "",
          mobile: b.mobile || "",
          email: b.email || "",
          gstin: b.gstin || "",
          bankDetails: b.bankDetails || "",
        },
      });

      // Create StoreQuotSequence lock row
      await tx.storeQuotSequence.create({ data: { storeId: s.id } });

      // Optionally create the first admin user
      if (b.adminUsername && b.adminPassword) {
        const hash = await bcrypt.hash(b.adminPassword, 12);
        await tx.user.create({
          data: {
            username: b.adminUsername,
            passwordHash: hash,
            role: "admin",
            storeId: s.id,
            forcePasswordChange: false,
          },
        });
      }

      return s;
    });

    return NextResponse.json(store, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create store. Name or slug may already exist." }, { status: 409 });
  }
}
