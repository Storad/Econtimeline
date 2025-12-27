-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "assetType" TEXT NOT NULL DEFAULT 'STOCK',
ADD COLUMN     "closeDate" TEXT,
ADD COLUMN     "expirationDate" TEXT,
ADD COLUMN     "optionType" TEXT,
ADD COLUMN     "premium" DOUBLE PRECISION,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'CLOSED',
ADD COLUMN     "strikePrice" DOUBLE PRECISION,
ADD COLUMN     "underlyingTicker" TEXT;

-- CreateIndex
CREATE INDEX "Trade_status_idx" ON "Trade"("status");
