-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "defaultRiskPercent" DOUBLE PRECISION,
    "maxDrawdownPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyTrade" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "tradeId" TEXT,
    "date" TEXT NOT NULL,
    "time" TEXT,
    "ticker" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "entryPrice" DOUBLE PRECISION,
    "exitPrice" DOUBLE PRECISION,
    "size" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "isBacktest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategySignal" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT,
    "ticker" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggerAt" TIMESTAMP(3),
    "triggeredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategySubscription" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "push" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalNotification" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushSubscription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Strategy_userId_idx" ON "Strategy"("userId");

-- CreateIndex
CREATE INDEX "Strategy_status_idx" ON "Strategy"("status");

-- CreateIndex
CREATE INDEX "Strategy_isPublished_idx" ON "Strategy"("isPublished");

-- CreateIndex
CREATE INDEX "StrategyTrade_strategyId_idx" ON "StrategyTrade"("strategyId");

-- CreateIndex
CREATE INDEX "StrategyTrade_tradeId_idx" ON "StrategyTrade"("tradeId");

-- CreateIndex
CREATE INDEX "StrategyTrade_date_idx" ON "StrategyTrade"("date");

-- CreateIndex
CREATE INDEX "StrategyTrade_isBacktest_idx" ON "StrategyTrade"("isBacktest");

-- CreateIndex
CREATE INDEX "StrategySignal_strategyId_idx" ON "StrategySignal"("strategyId");

-- CreateIndex
CREATE INDEX "StrategySignal_status_idx" ON "StrategySignal"("status");

-- CreateIndex
CREATE INDEX "StrategySignal_triggerAt_idx" ON "StrategySignal"("triggerAt");

-- CreateIndex
CREATE INDEX "StrategySubscription_userId_idx" ON "StrategySubscription"("userId");

-- CreateIndex
CREATE INDEX "StrategySubscription_strategyId_idx" ON "StrategySubscription"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "StrategySubscription_strategyId_userId_key" ON "StrategySubscription"("strategyId", "userId");

-- CreateIndex
CREATE INDEX "SignalNotification_userId_idx" ON "SignalNotification"("userId");

-- CreateIndex
CREATE INDEX "SignalNotification_signalId_idx" ON "SignalNotification"("signalId");

-- CreateIndex
CREATE INDEX "SignalNotification_status_idx" ON "SignalNotification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreferences_userId_key" ON "UserNotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserNotificationPreferences_userId_idx" ON "UserNotificationPreferences"("userId");

-- AddForeignKey
ALTER TABLE "StrategyTrade" ADD CONSTRAINT "StrategyTrade_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyTrade" ADD CONSTRAINT "StrategyTrade_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategySignal" ADD CONSTRAINT "StrategySignal_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategySubscription" ADD CONSTRAINT "StrategySubscription_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalNotification" ADD CONSTRAINT "SignalNotification_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "StrategySignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
