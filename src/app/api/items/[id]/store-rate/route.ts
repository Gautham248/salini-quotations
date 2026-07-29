import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, resolveStoreId } from "@/lib/auth-guards";

async function getTargetStoreId(req: NextRequest): Promise<number | null> {
  const s = await requireAdmin();
  const { searchParams } = new URL(req.url);
  const storeIdParam = searchParams.get("storeId");

  if ((s.user.role === "superadmin" || s.user.role === "manager") && storeIdParam) {
    const parsed = parseInt(storeIdParam);
    return isNaN(parsed) ? null : parsed;
  }
  const resolved = await resolveStoreId(req);
  return resolved;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const masterItemId = parseInt(id);
  if (isNaN(masterItemId) || masterItemId <= 0) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const storeId = await getTargetStoreId(req);
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  if (typeof b.rate !== "number" || !isFinite(b.rate) || b.rate < 0) {
    return NextResponse.json({ error: "Valid non-negative rate required" }, { status: 400 });
  }

  const item = await db.masterItem.findUnique({ where: { id: masterItemId }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const override = await db.itemStoreRate.upsert({
    where: { masterItemId_storeId: { masterItemId, storeId } },
    create: { masterItemId, storeId, rate: b.rate },
    update: { rate: b.rate },
  });

  return NextResponse.json(override);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const masterItemId = parseInt(id);
  if (isNaN(masterItemId) || masterItemId <= 0) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const storeId = await getTargetStoreId(req);
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  await db.itemStoreRate.deleteMany({
    where: { masterItemId, storeId },
  });
  return NextResponse.json({ success: true });
}
