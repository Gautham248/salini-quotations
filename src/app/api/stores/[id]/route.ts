import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireManager } from "@/lib/auth-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireManager();
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId) || numId <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const store = await db.store.findUnique({
    where: { id: numId },
    include: { settings: true },
  });
  return store ? NextResponse.json(store) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireManager();
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId) || numId <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  if (!b.name) return NextResponse.json({ error: "Store name required" }, { status: 400 });

  try {
    const store = await db.store.update({
      where: { id: numId },
      data: {
        name: b.name,
        slug: b.slug || b.name.toLowerCase().replace(/\s+/g, "-"),
      },
    });
    return NextResponse.json(store);
  } catch {
    return NextResponse.json({ error: "Store not found or slug exists" }, { status: 400 });
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireManager();
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId) || numId <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const store = await db.store.findUnique({ where: { id: numId } });
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newIsActive = !store.isActive;
  const updated = await db.store.update({
    where: { id: numId },
    data: { isActive: newIsActive },
  });

  // Automatically update all non-superadmin staff belonging to this store
  await db.user.updateMany({
    where: { storeId: numId, role: { not: "superadmin" } },
    data: { isActive: newIsActive },
  });

  return NextResponse.json(updated);
}
