import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireManager } from "@/lib/auth-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireManager();
  const { id } = await params;
  const store = await db.store.findUnique({
    where: { id: parseInt(id) },
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
  const b = await req.json();
  const store = await db.store.update({
    where: { id: parseInt(id) },
    data: {
      name: b.name,
      slug: b.slug,
    },
  });
  return NextResponse.json(store);
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireManager();
  const { id } = await params;
  const store = await db.store.findUnique({ where: { id: parseInt(id) } });
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.store.update({
    where: { id: parseInt(id) },
    data: { isActive: !store.isActive },
  });
  return NextResponse.json(updated);
}
