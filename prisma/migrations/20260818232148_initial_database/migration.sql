-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('CRITICAL', 'MINIMUM', 'ADEQUATE', 'SAFE');

-- CreateTable
CREATE TABLE "blood_stock_snapshots" (
    "id" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_stock_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_stocks" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "bloodType" "BloodType" NOT NULL,
    "minimumQuantity" INTEGER NOT NULL,
    "adequateQuantity" INTEGER NOT NULL,
    "safeQuantity" INTEGER NOT NULL,
    "actualQuantity" INTEGER NOT NULL,
    "fillPercentage" INTEGER NOT NULL,
    "status" "StockStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blood_stock_snapshots_scrapedAt_idx" ON "blood_stock_snapshots"("scrapedAt");

-- CreateIndex
CREATE INDEX "blood_stocks_bloodType_status_idx" ON "blood_stocks"("bloodType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "blood_stocks_snapshotId_bloodType_key" ON "blood_stocks"("snapshotId", "bloodType");

-- AddForeignKey
ALTER TABLE "blood_stocks" ADD CONSTRAINT "blood_stocks_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "blood_stock_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
