import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export async function GET(req: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const fromId = searchParams.get("fromUnitId");
  const toId = searchParams.get("toUnitId");

  if (!fromId || !toId) return NextResponse.json([]);

  const numFrom = parseInt(fromId);
  const numTo = parseInt(toId);

  if (isNaN(numFrom) || isNaN(numTo)) return NextResponse.json([]);

  const c = await db.unitConversion.findMany({
    where: { fromUnitId: numFrom, toUnitId: numTo },
    include: { fromUnit: true, toUnit: true },
  });

  return NextResponse.json(c);
}
