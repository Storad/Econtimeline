import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Admin Clerk user ID
const ADMIN_USER_ID = "user_35pFuZuSM2GjwNGguCIqh0dMVMD";

async function main() {
  console.log("Seeding % Gap Down strategy...");

  // Create the strategy
  const strategy = await prisma.strategy.create({
    data: {
      userId: ADMIN_USER_ID,
      name: "% Gap Down",
      description: `Buy-the-dip strategy using long-dated call options on QQQ/QQQM. When the index gaps down 1% or more at open, buy an at-the-money LEAP call with approximately 12 months until expiration. Target a 50% gain with no stop loss.

**Entry Trigger:** QQQ or QQQM opens down ≥1%
**Position:** ATM LEAP call (~12 months to expiration)
**Take Profit:** 50%
**Stop Loss:** None
**Typical Hold:** 3-4 months

This strategy capitalizes on QQQ's historical tendency to rally 5%+ in 85% of quarters. A 6-10% move in QQQ can yield 50% returns on ATM LEAPs. Often called the "Nancy Pelosi special" - no technical analysis or monthly management required.`,
      type: "REVERSAL",
      status: "ACTIVE",
      isPublished: true,
      color: "#22c55e", // Green for bullish strategy
      defaultRiskPercent: null,
      maxDrawdownPercent: null,
    },
  });

  console.log(`Created strategy: ${strategy.id}`);

  // Closed trades (backtest)
  const closedTrades = [
    {
      date: "2025-01-13",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 5500,
      exitPrice: 8250,
      pnl: 2750,
      notes: "$505 strike, 1/16/2026 expiration. 196 days in trade. QQQ +12.38%",
      isBacktest: true,
    },
    {
      date: "2025-01-27",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 5265,
      exitPrice: 7897.5,
      pnl: 2632.5,
      notes: "$515 strike, 1/16/2026 expiration. 193 days in trade. QQQ +11.73%",
      isBacktest: true,
    },
    {
      date: "2025-02-03",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 5453,
      exitPrice: 8179.5,
      pnl: 2726.5,
      notes: "$515 strike, 1/16/2026 expiration. 190 days in trade. QQQ +11.95%",
      isBacktest: true,
    },
    {
      date: "2025-02-12",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 5414,
      exitPrice: 8121,
      pnl: 2707,
      notes: "$520 strike, 1/16/2026 expiration. 218 days in trade. QQQ +13.98%",
      isBacktest: true,
    },
    {
      date: "2025-05-19",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 6026,
      exitPrice: 9039,
      pnl: 3013,
      notes: "$520 strike, 6/18/2026 expiration. 81 days in trade. QQQ +10.82%",
      isBacktest: true,
    },
    {
      date: "2025-05-23",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 5900,
      exitPrice: 8850,
      pnl: 2950,
      notes: "$510 strike, 6/18/2026 expiration. 55 days in trade. QQQ +10.32%",
      isBacktest: true,
    },
    {
      date: "2025-06-13",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 5700,
      exitPrice: 8550,
      pnl: 2850,
      notes: "$530 strike, 6/18/2026 expiration. 60 days in trade. QQQ +10.07%",
      isBacktest: true,
    },
    {
      date: "2025-08-01",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 5500,
      exitPrice: 8250,
      pnl: 2750,
      notes: "$555 strike, 6/30/2026 expiration. 53 days in trade. QQQ +8.88%",
      isBacktest: true,
    },
    {
      date: "2025-09-02",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 6000,
      exitPrice: 9000,
      pnl: 3000,
      notes: "$565 strike, 9/18/2026 expiration. 36 days in trade. QQQ +8.16%",
      isBacktest: true,
    },
  ];

  // Open trades (live)
  const openTrades = [
    {
      date: "2025-10-14",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 6962,
      exitPrice: null,
      pnl: 3481, // Unrealized, at 50% target
      notes: "$600 strike, 12/18/2026 expiration. OPEN - Currently at 50% target ($10,443)",
      isBacktest: false,
    },
    {
      date: "2025-11-04",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 6920,
      exitPrice: null,
      pnl: 3460, // Unrealized
      notes: "$625 strike, 12/18/2026 expiration. OPEN - Currently at 50% target ($10,380)",
      isBacktest: false,
    },
    {
      date: "2025-11-14",
      ticker: "QQQ",
      direction: "LONG",
      entryPrice: 6790,
      exitPrice: null,
      pnl: 3395, // Unrealized
      notes: "$605 strike, 12/18/2026 expiration. OPEN - Currently at 50% target ($10,185)",
      isBacktest: false,
    },
  ];

  // Insert all trades
  const allTrades = [...closedTrades, ...openTrades];

  for (const trade of allTrades) {
    await prisma.strategyTrade.create({
      data: {
        strategyId: strategy.id,
        date: trade.date,
        ticker: trade.ticker,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        pnl: trade.pnl,
        notes: trade.notes,
        isBacktest: trade.isBacktest,
      },
    });
  }

  console.log(`Added ${closedTrades.length} backtest trades`);
  console.log(`Added ${openTrades.length} live trades`);

  // Create an alert for the open positions
  await prisma.strategySignal.create({
    data: {
      strategyId: strategy.id,
      type: "ALERT",
      direction: "LONG",
      ticker: "QQQ",
      price: null,
      message: "3 open positions currently at 50% target. Consider taking profits on next gap down opportunity.",
      status: "TRIGGERED",
      triggeredAt: new Date(),
    },
  });

  console.log("Added alert signal");

  console.log("\n✅ Seeding complete!");
  console.log(`Strategy ID: ${strategy.id}`);
  console.log(`View at: /dashboard/strategies/${strategy.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
