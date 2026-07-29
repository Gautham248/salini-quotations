import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seeding comprehensive backdated test quotations across all stores...");

  const stores = await db.store.findMany({ select: { id: true, name: true, slug: true } });
  if (stores.length === 0) {
    console.error("❌ No stores found in database. Create a store first.");
    return;
  }

  const users = await db.user.findMany({ select: { id: true, storeId: true, username: true } });
  if (users.length === 0) {
    console.error("❌ No users found in database.");
    return;
  }

  const defaultAdmin = users.find((u) => u.role === "admin" || u.role === "superadmin") || users[0];

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
    { daysAgo: 0.1, status: "draft", locked: false, baseAmount: 12500 },
    { daysAgo: 0.4, status: "finalized", locked: true, baseAmount: 34000 },
    { daysAgo: 0.8, status: "finalized", locked: false, baseAmount: 18900 },

    // 7 days
    { daysAgo: 2, status: "draft", locked: false, baseAmount: 45000 },
    { daysAgo: 4, status: "finalized", locked: false, baseAmount: 62500 },
    { daysAgo: 6, status: "archived", locked: false, baseAmount: 22000 },

    // 30 days
    { daysAgo: 12, status: "finalized", locked: true, baseAmount: 87000 },
    { daysAgo: 19, status: "draft", locked: false, baseAmount: 29500 },
    { daysAgo: 26, status: "finalized", locked: false, baseAmount: 51200 },

    // 1-2 Months (All Time filter test)
    { daysAgo: 38, status: "finalized", locked: true, baseAmount: 96000 },
    { daysAgo: 48, status: "draft", locked: false, baseAmount: 41000 },
    { daysAgo: 58, status: "archived", locked: false, baseAmount: 115000 },
  ];

  let totalInserted = 0;

  // Insert test records for EVERY store so every store displays active period metrics!
  for (const store of stores) {
    console.log(`  -> Seeding quotations for store: "${store.name}" (ID: ${store.id})`);

    // Assign store user or fall back to admin
    const storeUser = users.find((u) => u.storeId === store.id) || defaultAdmin;

    for (let i = 0; i < timeBuckets.length; i++) {
      const bucket = timeBuckets[i];
      const customer = customers[(store.id * 3 + i) % customers.length];
      const createdDate = new Date(now - bucket.daysAgo * dayMs);

      // Generate unique sequence quotNo for this store to prevent collision with sequence generator
      const quotNo = `Q-${store.slug.toUpperCase().slice(0, 4)}-TEST-${1000 + i + Math.floor(Math.random() * 8999)}`;
      const refNo = `REF-${Math.floor(10000 + Math.random() * 89999)}`;

      const amount = bucket.baseAmount + (i * 1250) % 5000;

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
          netAmount: amount,
          subTotal: amount,
          cgst: Math.round(amount * 0.09),
          sgst: Math.round(amount * 0.09),
        },
      });
      totalInserted++;
    }
  }

  console.log(`\n✅ Successfully seeded ${totalInserted} backdated quotations across all ${stores.length} stores!`);
}

main()
  .catch((e) => {
    console.error("Error seeding backdated quotations:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
