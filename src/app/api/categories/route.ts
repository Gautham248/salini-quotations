import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth-guards";

export async function GET() {
  await requireAuth();
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const cat = await db.category.create({ data: { name: name.trim() } });
    return NextResponse.json(cat, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Category name already exists" }, { status: 409 });
  }
}
