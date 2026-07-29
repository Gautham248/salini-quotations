import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  try {
    const cat = await db.category.update({
      where: { id: numericId },
      data: { name: name.trim() },
    });
    return NextResponse.json(cat);
  } catch {
    return NextResponse.json({ error: "Category not found or name already exists" }, { status: 409 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await db.category.delete({ where: { id: numericId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}
