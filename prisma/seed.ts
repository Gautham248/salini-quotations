import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" }) });

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
  const existing = await prisma.store.findFirst();
  if (existing) {
    console.log("Already seeded.");
    return;
  }

  const superadminHash = await bcrypt.hash("admin123", 12);
  const adminHash = await bcrypt.hash("admin123", 12);
  const staffHash = await bcrypt.hash("staff123", 12);

  // Create the default store
  const store = await prisma.store.create({
    data: {
      name: "SALINI TRADERS",
      slug: "salini-pala",
    },
  });

  // Create CompanySettings for the store
  await prisma.companySettings.create({
    data: {
      storeId: store.id,
      companyName: "SALINI TRADERS",
      subheading: "Pala - Thodupuzha Road, Kanattupura, Pala, Kottayam, Kerala",
      phone: "+91 9539066366",
      mobile: "+91 9539088488",
      email: "salinisteelspala@gmail.com",
      gstin: "32AESFS0236G1Z3",
      bankDetails: "State Bank of India, SME Branch Pala - A/C: 42459778328 - IFSC: SBIN0063661",
    },
  });

  // Create StoreQuotSequence for the store
  await prisma.storeQuotSequence.create({ data: { storeId: store.id } });

  // Create superadmin (no store)
  await prisma.user.create({
    data: {
      username: "superadmin",
      passwordHash: superadminHash,
      role: "superadmin",
      forcePasswordChange: false,
    },
  });

  // Create store admin
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: adminHash,
      role: "admin",
      storeId: store.id,
      forcePasswordChange: false,
    },
  });

  // Create staff user
  await prisma.user.create({
    data: {
      username: "staff",
      passwordHash: staffHash,
      role: "staff",
      storeId: store.id,
      forcePasswordChange: false,
    },
  });

  // Create units
  const unitMap: Record<string, number> = {};
  for (const name of units) {
    const u = await prisma.unit.create({ data: { name, createdById: admin.id } });
    unitMap[name] = u.id;
  }

  // Create unit conversions
  for (const conv of conversions) {
    await prisma.unitConversion.create({
      data: { fromUnitId: unitMap[conv.from], toUnitId: unitMap[conv.to], factor: conv.factor },
    });
  }

  // Create master items
  for (const item of items) {
    const { unit, ...rest } = item;
    await prisma.masterItem.create({
      data: { ...rest, unitId: unitMap[unit], createdById: admin.id, updatedById: admin.id },
    });
  }

  console.log(`
╔═══════════════════════════════════════╗
║          SEED COMPLETE                ║
╠═══════════════════════════════════════╣
║  Super Admin: superadmin / admin123   ║
║  Admin:       admin      / admin123   ║
║  Staff:       staff      / staff123   ║
║  Store:       salini-pala             ║
╚═══════════════════════════════════════╝
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
