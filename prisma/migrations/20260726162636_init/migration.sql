-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyName" TEXT NOT NULL DEFAULT 'MARAMATTAM INFRA MART',
    "subheading" TEXT NOT NULL DEFAULT 'BHARANANGANAM - PALA KOTTAYAM',
    "phone" TEXT NOT NULL DEFAULT '9072329100',
    "mobile" TEXT NOT NULL DEFAULT '9072329200',
    "email" TEXT NOT NULL DEFAULT 'mtminfra24@gmail.com',
    "gstin" TEXT NOT NULL DEFAULT '32BMBPJ5689L1ZO',
    "bankDetails" TEXT NOT NULL DEFAULT 'HDFC- BHARANANGANAM- A/C NO: 502000 9419 8674 -IFSC CODE:HDFC 0008448',
    "disclaimerText" TEXT NOT NULL DEFAULT 'Certified that the particulars given above are true and correct.',
    "loadingNote" TEXT NOT NULL DEFAULT 'LOADING CHARGE AND TRANSPORTATION CHARGES EXTRA',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MasterItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "gstPercent" REAL NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MasterItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MasterItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quotNo" TEXT NOT NULL,
    "refNo" TEXT NOT NULL,
    "quotDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerAddress" TEXT,
    "customerPlace" TEXT,
    "customerGstin" TEXT,
    "deliveryTerms" TEXT,
    "gstNote" TEXT,
    "validity" TEXT NOT NULL DEFAULT 'LIMITED',
    "paymentTerms" TEXT NOT NULL DEFAULT 'READY PAYMENT',
    "subTotal" REAL,
    "cgst" REAL,
    "sgst" REAL,
    "roundOff" REAL,
    "netAmount" REAL,
    "amountInWords" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "finalizedAt" DATETIME,
    CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationLineItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quotationId" INTEGER NOT NULL,
    "masterItemId" INTEGER,
    "lineNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "gstPercent" REAL NOT NULL,
    "qty" REAL NOT NULL,
    "netValue" REAL NOT NULL,
    CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationLineItem_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotSequence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dummy" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotNo_key" ON "Quotation"("quotNo");

-- CreateIndex
CREATE UNIQUE INDEX "QuotSequence_dummy_key" ON "QuotSequence"("dummy");
