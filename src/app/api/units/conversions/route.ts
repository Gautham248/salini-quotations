import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET() {
  await requireAdmin();
  const c = await db.unitConversion.findMany({
    include: { fromUnit: true, toUnit: true },
    orderBy: { fromUnitId: "asc" },
  });
  return NextResponse.json(c);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const b = await req.json().catch(() => ({}));
  if (!b.fromUnitId || !b.toUnitId || typeof b.factor !== "number" || isNaN(b.factor)) {
    return NextResponse.json({ error: "Valid fromUnitId, toUnitId, and numeric factor required" }, { status: 400 });
  }

  try {
    const c = await db.unitConversion.create({
      data: { fromUnitId: parseInt(b.fromUnitId), toUnitId: parseInt(b.toUnitId), factor: b.factor },
      include: { fromUnit: true, toUnit: true },
    });
    return NextResponse.json(c, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create conversion" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const idStr = searchParams.get("id");
  if (!idStr) return NextResponse.json({ error: "ID parameter required" }, { status: 400 });

  const numericId = parseInt(idStr);
  if (isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await db.unitConversion.delete({ where: { id: numericId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Conversion not found" }, { status: 404 });
  }
}
