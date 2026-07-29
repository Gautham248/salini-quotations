-- CreateTable
CREATE TABLE "MasterItemUnit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "masterItemId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "conversionFactor" REAL NOT NULL DEFAULT 1.0,
    CONSTRAINT "MasterItemUnit_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MasterItemUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterItemUnit_masterItemId_unitId_key" ON "MasterItemUnit"("masterItemId", "unitId");
