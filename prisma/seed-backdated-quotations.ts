import { db } from "../src/lib/db";
import { computeTotals, amountInWords } from "../src/lib/calculations";

async function main() {
  console.log("🌱 Seeding comprehensive backdated test quotations with real line items across all stores...");

  // 1. Delete all existing test quotations (quotations containing "TEST-" in quotNo) or quotations without line items
  const testQuotations = await db.quotation.findMany({
    where: {
      OR: [
        { quotNo: { contains: "TEST-" } },
        { lineItems: { none: {} } }
      ]
    },
    select: { id: true }
  });

  if (testQuotations.length > 0) {
    const testIds = testQuotations.map(q => q.id);
    console.log(`🧹 Cleaning up ${testIds.length} existing incomplete or test quotations...`);
    await db.quotationLineItem.deleteMany({ where: { quotationId: { in: testIds } } });
    await db.quotation.deleteMany({ where: { id: { in: testIds } } });
  }

  const stores = await db.store.findMany({ select: { id: true, name: true, slug: true } });
  if (stores.length === 0) {
    console.error("❌ No stores found in database. Create a store first.");
    return;
  }

  const users = await db.user.findMany({ select: { id: true, storeId: true, username: true, role: true } });
  if (users.length === 0) {
    console.error("❌ No users found in database.");
    return;
  }

  const defaultAdmin = users.find((u) => u.role === "admin" || u.role === "superadmin") || users[0];

  // Fetch or ensure MasterItems exist
  let masterItems = await db.masterItem.findMany({
    include: { unit: true }
  });

  if (masterItems.length === 0) {
    console.log("📦 Creating default master items for test quotations...");
    // Ensure unit exists
    let pcsUnit = await db.unit.findFirst({ where: { name: "Pcs" } });
    if (!pcsUnit) {
      pcsUnit = await db.unit.create({ data: { name: "Pcs", code: "PCS" } });
    }
    let mtrUnit = await db.unit.findFirst({ where: { name: "Mtr" } });
    if (!mtrUnit) {
      mtrUnit = await db.unit.create({ data: { name: "Mtr", code: "MTR" } });
    }

    const defaultItemDefs = [
      { description: 'PVC Pipe 110mm 6kg', unitId: mtrUnit.id, rate: 450.0, gstPercent: 18.0 },
      { description: 'CPVC Pipe 1 inch SDR 11', unitId: mtrUnit.id, rate: 280.0, gstPercent: 18.0 },
      { description: 'Brass Ball Valve 1 inch', unitId: pcsUnit.id, rate: 320.0, gstPercent: 18.0 },
      { description: 'Overhead Water Tank 1000L Triple Layer', unitId: pcsUnit.id, rate: 6500.0, gstPercent: 18.0 },
      { description: 'SWR Elbow 110mm Shoe Door', unitId: pcsUnit.id, rate: 120.0, gstPercent: 18.0 },
      { description: 'Garden Hose Pipe 1/2 inch (30 Mtr Roll)', unitId: pcsUnit.id, rate: 850.0, gstPercent: 12.0 },
      { description: 'Solvent Cement 500ml Tin', unitId: pcsUnit.id, rate: 240.0, gstPercent: 18.0 },
      { description: 'GI Pipe Clamp Heavy 1 inch', unitId: pcsUnit.id, rate: 35.0, gstPercent: 18.0 },
    ];

    for (const itemDef of defaultItemDefs) {
      await db.masterItem.create({
        data: {
          ...itemDef,
          createdById: defaultAdmin.id,
          updatedById: defaultAdmin.id,
        }
      });
    }

    masterItems = await db.masterItem.findMany({ include: { unit: true } });
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Customers for test data
  const customers = [
    "Apex Tech Labs",
    "Metro Hardware",
    "Greenline Infra",
    "Surya Distributors",
    "Kaveri Builders",
    "National Pipe Co.",
    "Vanguard Electricals",
    "Coastal Engineering",
    "Heritage Traders",
    "Prabhat Mills",
    "Southern Enterprises",
    "Trinity Heights Ltd",
    "Malabar Traders",
    "Highland Agencies",
    "Royal Steel Corp",
  ];

  // Defined time buckets (daysAgo) to ensure data appears in 24h, 7d, 30d, and All Time (>30d)
  const timeBuckets = [
    // 24 hours
    { daysAgo: 0.1, status: "draft", locked: false },
    { daysAgo: 0.4, status: "finalized", locked: true },
    { daysAgo: 0.8, status: "finalized", locked: false },

    // 7 days
    { daysAgo: 2, status: "draft", locked: false },
    { daysAgo: 4, status: "finalized", locked: false },
    { daysAgo: 6, status: "archived", locked: false },

    // 30 days
    { daysAgo: 12, status: "finalized", locked: true },
    { daysAgo: 19, status: "draft", locked: false },
    { daysAgo: 26, status: "finalized", locked: false },

    // 1-2 Months (All Time filter test)
    { daysAgo: 38, status: "finalized", locked: true },
    { daysAgo: 48, status: "draft", locked: false },
    { daysAgo: 58, status: "archived", locked: false },
  ];

  let totalInserted = 0;

  for (const store of stores) {
    console.log(`  -> Seeding complete quotations for store: "${store.name}" (ID: ${store.id})`);

    const storeUser = users.find((u) => u.storeId === store.id) || defaultAdmin;

    for (let i = 0; i < timeBuckets.length; i++) {
      const bucket = timeBuckets[i];
      const customer = customers[(store.id * 3 + i) % customers.length];
      const createdDate = new Date(now - bucket.daysAgo * dayMs);

      const quotNo = `Q-${store.slug.toUpperCase().slice(0, 4)}-TEST-${1000 + i + Math.floor(Math.random() * 8999)}`;
      const refNo = `REF-${Math.floor(10000 + Math.random() * 89999)}`;

      // Pick 2 to 4 items from master items
      const numItems = 2 + (i % 3); // 2, 3, or 4 items
      const selectedItems: Array<{
        masterItemId: number;
        lineNo: number;
        description: string;
        unit: string;
        rate: number;
        gstPercent: number;
        qty: number;
        netValue: number;
        quoteMode: string;
      }> = [];

      for (let j = 0; j < numItems; j++) {
        const itemIdx = (i + j * 2 + store.id) % masterItems.length;
        const mi = masterItems[itemIdx];
        const qty = [5, 10, 15, 20, 25, 50, 100][(i + j) % 7];
        const rate = mi.rate;
        const netValue = qty * rate;

        selectedItems.push({
          masterItemId: mi.id,
          lineNo: j + 1,
          description: mi.description,
          unit: mi.unit?.name || "Pcs",
          rate,
          gstPercent: mi.gstPercent,
          qty,
          netValue,
          quoteMode: "quantity",
        });
      }

      // Compute exact line totals
      const totals = computeTotals(
        selectedItems.map((item) => ({
          qty: item.qty,
          rate: item.rate,
          gstPercent: item.gstPercent,
          netValue: item.netValue,
        }))
      );

      await db.quotation.create({
        data: {
          storeId: store.id,
          createdById: storeUser.id,
          quotNo,
          refNo,
          quotDate: createdDate,
          createdAt: createdDate,
          updatedAt: createdDate,
          customerName: customer,
          customerPlace: "Kottayam",
          status: bucket.status,
          isLocked: bucket.locked,
          subTotal: totals.subTotal,
          cgst: totals.cgst,
          sgst: totals.sgst,
          roundOff: totals.roundOff,
          netAmount: totals.netAmount,
          amountInWords: amountInWords(totals.netAmount),
          lineItems: {
            create: selectedItems.map((item) => ({
              masterItemId: item.masterItemId,
              lineNo: item.lineNo,
              description: item.description,
              unit: item.unit,
              rate: item.rate,
              gstPercent: item.gstPercent,
              qty: item.qty,
              netValue: item.netValue,
              quoteMode: item.quoteMode,
            })),
          },
        },
      });

      totalInserted++;
    }
  }

  console.log(`\n✅ Successfully seeded ${totalInserted} quotations with complete line items and calculated totals across all ${stores.length} stores!`);
}

main()
  .catch((e) => {
    console.error("Error seeding backdated quotations:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
