-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "paymentQrCode" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN "loadingCharges" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "remark" TEXT,
    "altQty" REAL,
    "altUnit" TEXT,
    "gstMode" TEXT NOT NULL DEFAULT 'inclusive',
    "loadingCharges" REAL,
    CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationLineItem_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuotationLineItem" ("description", "gstPercent", "id", "isLocked", "lineNo", "masterItemId", "netValue", "pieceCount", "qty", "quotationId", "quoteMode", "rate", "unit", "weightKg") SELECT "description", "gstPercent", "id", "isLocked", "lineNo", "masterItemId", "netValue", "pieceCount", "qty", "quotationId", "quoteMode", "rate", "unit", "weightKg" FROM "QuotationLineItem";
DROP TABLE "QuotationLineItem";
ALTER TABLE "new_QuotationLineItem" RENAME TO "QuotationLineItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
