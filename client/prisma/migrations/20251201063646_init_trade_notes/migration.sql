-- CreateTable
CREATE TABLE "TradeNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "trades" INTEGER,
    "pnl" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeNote_userId_idx" ON "TradeNote"("userId");

-- CreateIndex
CREATE INDEX "TradeNote_date_idx" ON "TradeNote"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TradeNote_userId_date_key" ON "TradeNote"("userId", "date");
