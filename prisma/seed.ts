import { PrismaClient } from "@/generated/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const units = ["Sqf", "Sqm", "Nos", "Kg", "Ton", "Ltr", "Mtr", "Pcs", "Roll", "Box"];

const conversions: Array<{ from: string; to: string; factor: number }> = [
  { from: "Sqf", to: "Sqm", factor: 0.092903 },
  { from: "Sqm", to: "Sqf", factor: 10.7639 },
  { from: "Kg", to: "Ton", factor: 0.001 },
  { from: "Ton", to: "Kg", factor: 1000 },
];

const items = [
  { description: 'UPVC SPANISH TILE 17.96" 2.5 MM', unit: "Sqf", rate: 41.53, gstPercent: 18, weightPerUnit: 1.2 },
  { description: 'UPVC SPANISH TILE 16 52" 2.5 MM', unit: "Sqf", rate: 41.53, gstPercent: 18, weightPerUnit: 1.0 },
  { description: 'UPVC SPANISH TILE 14.37" 2.5 MM', unit: "Sqf", rate: 41.53, gstPercent: 18, weightPerUnit: 0.9 },
  { description: 'UPVC SPANISH TILE 12.21" 2.5 MM', unit: "Sqf", rate: 41.53, gstPercent: 18, weightPerUnit: 0.75 },
  { description: 'UPVC SPANISH TILE 10.06" 2.5 MM', unit: "Sqf", rate: 41.53, gstPercent: 18, weightPerUnit: 0.65 },
  { description: 'UPVC SPANISH TILE 7.90" 2.5 MM', unit: "Sqf", rate: 41.53, gstPercent: 18, weightPerUnit: 0.5 },
  { description: 'UPVC SPANISH TILE 6.60" 2.5 MM', unit: "Sqf", rate: 41.53, gstPercent: 18, weightPerUnit: 0.4 },
  { description: "UPVC TOP RIDGES GREY", unit: "Nos", rate: 635.59, gstPercent: 18, weightPerUnit: 3.5 },
  { description: "UPVC TILED RIDGES", unit: "Nos", rate: 525.42, gstPercent: 18, weightPerUnit: 4.0 },
  { description: "UPVC THREE WAY RIDGE 2.5MM GREY", unit: "Nos", rate: 737.29, gstPercent: 18, weightPerUnit: 4.5 },
  { description: "UPVC HIP END", unit: "Nos", rate: 550.85, gstPercent: 18, weightPerUnit: 3.0 },
  { description: "UPVC SCREW 55MM", unit: "Nos", rate: 7.63, gstPercent: 18, weightPerUnit: 0.01, piecesPerUnit: 100 },
  { description: "UPVC SCREW CAP", unit: "Nos", rate: 7.63, gstPercent: 18, weightPerUnit: 0.005, piecesPerUnit: 100 },
  { description: 'SDS 10 X 25 ( 1")', unit: "Nos", rate: 2.88, gstPercent: 18, weightPerUnit: 0.02, piecesPerUnit: 600 },
];

async function main() {
  const existing = await prisma.companySettings.findFirst();
  if (!existing) {
    const pw = randomBytes(6).toString("hex").slice(0, 8);
    const hash = await bcrypt.hash(pw, 12);
    const admin = await prisma.user.create({
      data: { username: "admin", passwordHash: hash, role: "admin", forcePasswordChange: true },
    });
    await prisma.companySettings.create({ data: {} });

    const unitMap: Record<string, number> = {};
    for (const name of units) {
      const u = await prisma.unit.create({ data: { name, createdById: admin.id } });
      unitMap[name] = u.id;
    }

    for (const conv of conversions) {
      await prisma.unitConversion.create({
        data: { fromUnitId: unitMap[conv.from], toUnitId: unitMap[conv.to], factor: conv.factor },
      });
    }

    for (const item of items) {
      const { unit, ...rest } = item;
      await prisma.masterItem.create({
        data: { ...rest, unitId: unitMap[unit], createdById: admin.id, updatedById: admin.id },
      });
    }

    console.log(`\n=== SEED COMPLETE ===\nAdmin: admin\nPassword: ${pw}\n====================\n`);
  } else {
    console.log("Already seeded.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
