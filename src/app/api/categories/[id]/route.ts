import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const cat = await db.category.update({
      where: { id: parseInt(id) },
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
  await db.category.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
