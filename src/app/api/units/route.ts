import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET() {
  await requireAdmin();
  const u = await db.unit.findMany({
    where: { isActive: true },
    include: { conversionsFrom: { include: { toUnit: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(u);
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  const b = await req.json().catch(() => ({}));
  if (!b.name || typeof b.name !== "string" || !b.name.trim()) {
    return NextResponse.json({ error: "Unit name is required" }, { status: 400 });
  }

  try {
    const u = await db.unit.create({
      data: { name: b.name.trim(), createdById: s.user.id },
      include: { conversionsFrom: { include: { toUnit: true } } },
    });
    return NextResponse.json(u, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unit already exists" }, { status: 409 });
  }
}
