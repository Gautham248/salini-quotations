import { NextRequest, NextResponse } from "next/server"; import { db } from "@/lib/db"; import { requireAuth } from "@/lib/auth-guards";
export async function GET(req: NextRequest) { await requireAuth(); const { searchParams } = new URL(req.url); const fromId = searchParams.get("fromUnitId"); const toId = searchParams.get("toUnitId"); if (!fromId || !toId) return NextResponse.json([]);
  const c = await db.unitConversion.findMany({ where: { fromUnitId: parseInt(fromId), toUnitId: parseInt(toId) }, include: { fromUnit: true, toUnit: true } }); return NextResponse.json(c); }
