import { createClient } from "@libsql/client";

const url = "libsql://salini-gautham248.aws-ap-south-1.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE3OTI4ODczODQsImlhdCI6MTc4NTExMTM4NSwiaWQiOiIwMTlmYTBjZC1iMDAxLTc4MDYtOTNiYi01M2RiZjUwMjJmY2IiLCJraWQiOiJhN3hMSC1VSXRRWEpnWk96bWJGdHZqVUZ4dnNVUVJjd0FiUkVnMWI2cThBIiwicmlkIjoiNWViMDQzNzEtMTIwNy00YWYzLThhYTAtYzJhNGY5MDk5ZmQ4In0.MoEhxHXQ2c8muL_h7rqnncK8UkeYABtKpThgBI-lZKuT1XmUQJMR2Ju36yPyG2kT_-VZzOhVQJA5p-mNpxY_BA";
const c = createClient({ url });

try {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS User (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, role TEXT NOT NULL, isActive INTEGER DEFAULT 1, forcePasswordChange INTEGER DEFAULT 0, createdAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS CompanySettings (id INTEGER PRIMARY KEY AUTOINCREMENT, companyName TEXT DEFAULT 'SALINI TRADERS', subheading TEXT DEFAULT 'Pala - Thodupuzha Road, Kanattupura, Pala, Kottayam, Kerala', phone TEXT DEFAULT '+91 9539066366', mobile TEXT DEFAULT '+91 9539088488', email TEXT DEFAULT 'salinisteelspala@gmail.com', gstin TEXT DEFAULT '32AESFS0236G1Z3', bankDetails TEXT DEFAULT 'State Bank of India, SME Branch Pala - A/C: 42459778328 - IFSC: SBIN0063661', disclaimerText TEXT DEFAULT 'Certified that the particulars given above are true and correct.', loadingNote TEXT DEFAULT 'LOADING CHARGE AND TRANSPORTATION CHARGES EXTRA', updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS Unit (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, isActive INTEGER DEFAULT 1, createdById INTEGER NOT NULL REFERENCES User(id), createdAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS UnitConversion (id INTEGER PRIMARY KEY AUTOINCREMENT, fromUnitId INTEGER NOT NULL REFERENCES Unit(id), toUnitId INTEGER NOT NULL REFERENCES Unit(id), factor REAL NOT NULL, UNIQUE(fromUnitId, toUnitId))`,
    `CREATE TABLE IF NOT EXISTS MasterItem (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL, unitId INTEGER NOT NULL REFERENCES Unit(id), rate REAL NOT NULL, gstPercent REAL NOT NULL, category TEXT, weightPerUnit REAL, piecesPerUnit INTEGER, isActive INTEGER DEFAULT 1, createdById INTEGER NOT NULL REFERENCES User(id), updatedById INTEGER NOT NULL REFERENCES User(id), createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS Quotation (id INTEGER PRIMARY KEY AUTOINCREMENT, quotNo TEXT UNIQUE NOT NULL, refNo TEXT NOT NULL, quotDate TEXT NOT NULL, status TEXT NOT NULL, customerName TEXT NOT NULL, customerAddress TEXT, customerPlace TEXT, customerGstin TEXT, deliveryTerms TEXT, gstNote TEXT, validity TEXT DEFAULT 'LIMITED', paymentTerms TEXT DEFAULT 'READY PAYMENT', subTotal REAL, cgst REAL, sgst REAL, roundOff REAL, netAmount REAL, amountInWords TEXT, createdById INTEGER NOT NULL REFERENCES User(id), createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT NOT NULL, finalizedAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS QuotationLineItem (id INTEGER PRIMARY KEY AUTOINCREMENT, quotationId INTEGER NOT NULL REFERENCES Quotation(id) ON DELETE CASCADE, masterItemId INTEGER REFERENCES MasterItem(id) ON DELETE SET NULL, lineNo INTEGER NOT NULL, description TEXT NOT NULL, unit TEXT NOT NULL, rate REAL NOT NULL, gstPercent REAL NOT NULL, qty REAL NOT NULL, netValue REAL NOT NULL, quoteMode TEXT DEFAULT 'quantity', weightKg REAL, pieceCount REAL)`,
    `CREATE TABLE IF NOT EXISTS QuotSequence (id INTEGER PRIMARY KEY AUTOINCREMENT, dummy INTEGER UNIQUE NOT NULL)`,
  ];

  for (const s of stmts) {
    await c.execute(s);
    console.log("OK");
  }
  console.log("ALL TABLES CREATED");

  const { default: bcrypt } = await import("bcryptjs");
  const now = new Date().toISOString();
  const adminHash = await bcrypt.hash("admin123", 12);
  const staffHash = await bcrypt.hash("staff123", 12);

  await c.execute({ sql: "INSERT INTO User (username, passwordHash, role) VALUES (?, ?, ?)", args: ["admin", adminHash, "admin"] });
  await c.execute({ sql: "INSERT INTO User (username, passwordHash, role) VALUES (?, ?, ?)", args: ["staff", staffHash, "staff"] });
  console.log("Users created");

  await c.execute({ sql: "INSERT INTO CompanySettings (updatedAt) VALUES (?)", args: [now] });
  console.log("Settings created");

  const units = ["Sqf", "Sqm", "Nos", "Kg", "Ton", "Ltr", "Mtr", "Pcs", "Roll", "Box"];
  for (const name of units) {
    await c.execute({ sql: "INSERT INTO Unit (name, createdById) VALUES (?, 1)", args: [name] });
  }
  const conversions = [
    { from: "Sqf", to: "Sqm", factor: 0.092903 },
    { from: "Sqm", to: "Sqf", factor: 10.7639 },
    { from: "Kg", to: "Ton", factor: 0.001 },
    { from: "Ton", to: "Kg", factor: 1000 },
  ];
  for (const conv of conversions) {
    const fromId = units.indexOf(conv.from) + 1;
    const toId = units.indexOf(conv.to) + 1;
    await c.execute({ sql: "INSERT OR IGNORE INTO UnitConversion (fromUnitId, toUnitId, factor) VALUES (?, ?, ?)", args: [fromId, toId, conv.factor] });
  }
  console.log("Units and conversions seeded");

  const items = [
    { desc: "UPVC SPANISH TILE 17.96'' 2.5 MM", unit: "Sqf", rate: 41.53, gst: 18, wt: 1.2 },
    { desc: "UPVC SPANISH TILE 16 52'' 2.5 MM", unit: "Sqf", rate: 41.53, gst: 18, wt: 1.0 },
    { desc: "UPVC SPANISH TILE 14.37'' 2.5 MM", unit: "Sqf", rate: 41.53, gst: 18, wt: 0.9 },
    { desc: "UPVC SPANISH TILE 12.21'' 2.5 MM", unit: "Sqf", rate: 41.53, gst: 18, wt: 0.75 },
    { desc: "UPVC SPANISH TILE 10.06'' 2.5 MM", unit: "Sqf", rate: 41.53, gst: 18, wt: 0.65 },
    { desc: "UPVC SPANISH TILE 7.90'' 2.5 MM", unit: "Sqf", rate: 41.53, gst: 18, wt: 0.5 },
    { desc: "UPVC SPANISH TILE 6.60'' 2.5 MM", unit: "Sqf", rate: 41.53, gst: 18, wt: 0.4 },
    { desc: "UPVC TOP RIDGES GREY", unit: "Nos", rate: 635.59, gst: 18, wt: 3.5 },
    { desc: "UPVC TILED RIDGES", unit: "Nos", rate: 525.42, gst: 18, wt: 4.0 },
    { desc: "UPVC THREE WAY RIDGE 2.5MM GREY", unit: "Nos", rate: 737.29, gst: 18, wt: 4.5 },
    { desc: "UPVC HIP END", unit: "Nos", rate: 550.85, gst: 18, wt: 3.0 },
    { desc: "UPVC SCREW 55MM", unit: "Nos", rate: 7.63, gst: 18, wt: 0.01, pcs: 100 },
    { desc: "UPVC SCREW CAP", unit: "Nos", rate: 7.63, gst: 18, wt: 0.005, pcs: 100 },
    { desc: "SDS 10 X 25 ( 1'')", unit: "Nos", rate: 2.88, gst: 18, wt: 0.02, pcs: 600 },
  ];
  for (const item of items) {
    await c.execute({
      sql: "INSERT INTO MasterItem (description, unitId, rate, gstPercent, weightPerUnit, piecesPerUnit, createdById, updatedById, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)",
      args: [item.desc, units.indexOf(item.unit) + 1, item.rate, item.gst, item.wt, item.pcs || null, now],
    });
  }
  console.log("Items seeded");

  console.log("\n=== ALL DONE ===\nAdmin: admin / admin123\nStaff: staff / staff123\n");

  c.close();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
