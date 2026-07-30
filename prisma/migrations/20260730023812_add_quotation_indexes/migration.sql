/*
  Warnings:

  - You are about to drop the `QuotSequence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `category` on the `MasterItem` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `MasterItem` table. All the data in the column will be lost.
  - Added the required column `storeId` to the `CompanySettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitId` to the `MasterItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "QuotSequence_dummy_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuotSequence";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Unit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnitConversion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromUnitId" INTEGER NOT NULL,
    "toUnitId" INTEGER NOT NULL,
    "factor" REAL NOT NULL,
    CONSTRAINT "UnitConversion_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UnitConversion_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ItemCategory" (
    "itemId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    PRIMARY KEY ("itemId", "categoryId"),
    CONSTRAINT "ItemCategory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MasterItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemStoreRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "masterItemId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "rate" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ItemStoreRate_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemStoreRate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreQuotSequence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StoreQuotSequence_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CompanySettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "subheading" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "bankDetails" TEXT NOT NULL,
    "disclaimerText" TEXT NOT NULL DEFAULT 'Certified that the particulars given above are true and correct.',
    "loadingNote" TEXT NOT NULL DEFAULT 'LOADING CHARGE AND TRANSPORTATION CHARGES EXTRA',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanySettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CompanySettings" ("bankDetails", "companyName", "disclaimerText", "email", "gstin", "id", "loadingNote", "mobile", "phone", "subheading", "updatedAt") SELECT "bankDetails", "companyName", "disclaimerText", "email", "gstin", "id", "loadingNote", "mobile", "phone", "subheading", "updatedAt" FROM "CompanySettings";
DROP TABLE "CompanySettings";
ALTER TABLE "new_CompanySettings" RENAME TO "CompanySettings";
CREATE UNIQUE INDEX "CompanySettings_storeId_key" ON "CompanySettings"("storeId");
CREATE TABLE "new_MasterItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "unitId" INTEGER NOT NULL,
    "rate" REAL NOT NULL,
    "gstPercent" REAL NOT NULL,
    "weightPerUnit" REAL,
    "piecesPerUnit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MasterItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MasterItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MasterItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MasterItem" ("createdAt", "createdById", "description", "gstPercent", "id", "isActive", "rate", "updatedAt", "updatedById") SELECT "createdAt", "createdById", "description", "gstPercent", "id", "isActive", "rate", "updatedAt", "updatedById" FROM "MasterItem";
DROP TABLE "MasterItem";
ALTER TABLE "new_MasterItem" RENAME TO "MasterItem";
CREATE TABLE "new_MasterItemUnit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "masterItemId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "conversionFactor" REAL NOT NULL DEFAULT 1.0,
    CONSTRAINT "MasterItemUnit_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MasterItemUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MasterItemUnit" ("conversionFactor", "id", "masterItemId", "unitId") SELECT "conversionFactor", "id", "masterItemId", "unitId" FROM "MasterItemUnit";
DROP TABLE "MasterItemUnit";
ALTER TABLE "new_MasterItemUnit" RENAME TO "MasterItemUnit";
CREATE UNIQUE INDEX "MasterItemUnit_masterItemId_unitId_key" ON "MasterItemUnit"("masterItemId", "unitId");
CREATE TABLE "new_Quotation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER,
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
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "finalizedAt" DATETIME,
    CONSTRAINT "Quotation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quotation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quotation" ("amountInWords", "cgst", "createdAt", "createdById", "customerAddress", "customerGstin", "customerName", "customerPlace", "deliveryTerms", "finalizedAt", "gstNote", "id", "netAmount", "paymentTerms", "quotDate", "quotNo", "refNo", "roundOff", "sgst", "status", "subTotal", "updatedAt", "validity") SELECT "amountInWords", "cgst", "createdAt", "createdById", "customerAddress", "customerGstin", "customerName", "customerPlace", "deliveryTerms", "finalizedAt", "gstNote", "id", "netAmount", "paymentTerms", "quotDate", "quotNo", "refNo", "roundOff", "sgst", "status", "subTotal", "updatedAt", "validity" FROM "Quotation";
DROP TABLE "Quotation";
ALTER TABLE "new_Quotation" RENAME TO "Quotation";
CREATE INDEX "Quotation_storeId_idx" ON "Quotation"("storeId");
CREATE INDEX "Quotation_createdAt_idx" ON "Quotation"("createdAt");
CREATE INDEX "Quotation_storeId_status_idx" ON "Quotation"("storeId", "status");
CREATE INDEX "Quotation_createdById_idx" ON "Quotation"("createdById");
CREATE UNIQUE INDEX "Quotation_storeId_quotNo_key" ON "Quotation"("storeId", "quotNo");
CREATE TABLE "new_QuotationLineItem" (
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
    "quoteMode" TEXT NOT NULL DEFAULT 'quantity',
    "weightKg" REAL,
    "pieceCount" REAL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationLineItem_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuotationLineItem" ("description", "gstPercent", "id", "lineNo", "masterItemId", "netValue", "qty", "quotationId", "rate", "unit") SELECT "description", "gstPercent", "id", "lineNo", "masterItemId", "netValue", "qty", "quotationId", "rate", "unit" FROM "QuotationLineItem";
DROP TABLE "QuotationLineItem";
ALTER TABLE "new_QuotationLineItem" RENAME TO "QuotationLineItem";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "storeId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "forcePasswordChange", "id", "isActive", "passwordHash", "role", "username") SELECT "createdAt", "forcePasswordChange", "id", "isActive", "passwordHash", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitConversion_fromUnitId_toUnitId_key" ON "UnitConversion"("fromUnitId", "toUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ItemStoreRate_masterItemId_storeId_key" ON "ItemStoreRate"("masterItemId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreQuotSequence_storeId_key" ON "StoreQuotSequence"("storeId");
