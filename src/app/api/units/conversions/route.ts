import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth-guards";

export async function GET() {
  await requireAdmin();
  const c = await db.unitConversion.findMany({
    include: { fromUnit: true, toUnit: true },
    orderBy: { fromUnitId: "asc" },
  });
  return NextResponse.json(c);
}

export async function POST(req: NextRequest) {
  await requireSuperAdmin();
  const b = await req.json();
  const c = await db.unitConversion.create({
    data: { fromUnitId: b.fromUnitId, toUnitId: b.toUnitId, factor: b.factor },
    include: { fromUnit: true, toUnit: true },
  });
  return NextResponse.json(c, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await requireSuperAdmin();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) await db.unitConversion.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
