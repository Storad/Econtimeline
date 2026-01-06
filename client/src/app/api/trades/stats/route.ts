import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Calculate trading statistics
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period");

    // Build date filter
    let dateFilter: { gte?: string; lte?: string } | undefined;

    if (startDate && endDate) {
      dateFilter = { gte: startDate, lte: endDate };
    } else if (period) {
      const now = new Date();
      let start: Date;

      switch (period) {
        case "day":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          const dayOfWeek = now.getDay();
          start = new Date(now);
          start.setDate(now.getDate() - dayOfWeek);
          start.setHours(0, 0, 0, 0);
          break;
        case "month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          start = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          start = new Date(0);
      }

      dateFilter = {
        gte: start.toISOString().split("T")[0],
        lte: now.toISOString().split("T")[0],
      };
    }

    // Fetch trades
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        ...(dateFilter && { date: dateFilter }),
      },
      orderBy: { date: "asc" },
    });

    if (trades.length === 0) {
      return NextResponse.json({
        stats: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          breakEvenTrades: 0,
          winRate: 0,
          totalPnl: 0,
          averagePnl: 0,
          averageWin: 0,
          averageLoss: 0,
          largestWin: 0,
          largestLoss: 0,
          profitFactor: 0,
          tradingDays: 0,
          byTicker: {},
          byDirection: { LONG: { count: 0, pnl: 0 }, SHORT: { count: 0, pnl: 0 } },
          byTag: {},
          dailyPnl: [],
          // Advanced metrics
          maxConsecWins: 0,
          maxConsecLosses: 0,
          currentStreak: 0,
          currentStreakType: "none",
          expectancy: 0,
          maxDrawdown: 0,
          recoveryFactor: 0,
          sharpeRatio: 0,
          winDays: 0,
          lossDays: 0,
        },
      });
    }

    // Calculate stats
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);
    const breakEvenTrades = trades.filter((t) => t.pnl === 0);

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    const averageWin = winningTrades.length > 0
      ? grossProfit / winningTrades.length
      : 0;
    const averageLoss = losingTrades.length > 0
      ? grossLoss / losingTrades.length
      : 0;

    // By ticker
    const byTicker: Record<string, { count: number; pnl: number; wins: number }> = {};
    trades.forEach((t) => {
      if (!byTicker[t.ticker]) {
        byTicker[t.ticker] = { count: 0, pnl: 0, wins: 0 };
      }
      byTicker[t.ticker].count++;
      byTicker[t.ticker].pnl += t.pnl;
      if (t.pnl > 0) byTicker[t.ticker].wins++;
    });

    // By direction
    const byDirection = {
      LONG: { count: 0, pnl: 0, wins: 0 },
      SHORT: { count: 0, pnl: 0, wins: 0 },
    };
    trades.forEach((t) => {
      const dir = t.direction as "LONG" | "SHORT";
      if (byDirection[dir]) {
        byDirection[dir].count++;
        byDirection[dir].pnl += t.pnl;
        if (t.pnl > 0) byDirection[dir].wins++;
      }
    });

    // By tag (now simple string array)
    const byTag: Record<string, { count: number; pnl: number; wins: number }> = {};
    trades.forEach((t) => {
      t.tags.forEach((tag) => {
        if (!byTag[tag]) {
          byTag[tag] = { count: 0, pnl: 0, wins: 0 };
        }
        byTag[tag].count++;
        byTag[tag].pnl += t.pnl;
        if (t.pnl > 0) byTag[tag].wins++;
      });
    });

    // Daily P&L
    const dailyPnlMap: Record<string, number> = {};
    trades.forEach((t) => {
      if (!dailyPnlMap[t.date]) {
        dailyPnlMap[t.date] = 0;
      }
      dailyPnlMap[t.date] += t.pnl;
    });
    const dailyPnl = Object.entries(dailyPnlMap)
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Unique trading days
    const tradingDays = new Set(trades.map((t) => t.date)).size;

    // Calculate max consecutive wins/losses
    let maxConsecWins = 0;
    let maxConsecLosses = 0;
    let currentConsecWins = 0;
    let currentConsecLosses = 0;
    let currentStreak = 0;
    let currentStreakType: "win" | "loss" | "none" = "none";

    trades.forEach((t) => {
      if (t.pnl > 0) {
        currentConsecWins++;
        currentConsecLosses = 0;
        maxConsecWins = Math.max(maxConsecWins, currentConsecWins);
        currentStreak = currentConsecWins;
        currentStreakType = "win";
      } else if (t.pnl < 0) {
        currentConsecLosses++;
        currentConsecWins = 0;
        maxConsecLosses = Math.max(maxConsecLosses, currentConsecLosses);
        currentStreak = currentConsecLosses;
        currentStreakType = "loss";
      } else {
        // Break even doesn't break streak but doesn't extend it
      }
    });

    // Calculate expectancy: (Win% × AvgWin) - (Loss% × AvgLoss)
    const winRateDecimal = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const lossRateDecimal = trades.length > 0 ? losingTrades.length / trades.length : 0;
    const expectancy = (winRateDecimal * averageWin) - (lossRateDecimal * averageLoss);

    // Calculate max drawdown from daily P&L
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    dailyPnl.forEach(({ pnl }) => {
      cumulative += pnl;
      peak = Math.max(peak, cumulative);
      const drawdown = peak - cumulative;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });

    // Recovery factor: Total P&L / Max Drawdown
    const recoveryFactor = maxDrawdown > 0 ? totalPnl / maxDrawdown : totalPnl > 0 ? Infinity : 0;

    // Calculate daily returns standard deviation for Sharpe-like ratio
    const dailyReturns = dailyPnl.map(d => d.pnl);
    const avgDailyReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
      : 0;
    const variance = dailyReturns.length > 1
      ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / (dailyReturns.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);

    // Simplified Sharpe-like ratio (avg daily return / daily std dev)
    // Annualized by multiplying by sqrt(252 trading days)
    const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0;

    // Win days vs loss days
    const winDays = dailyPnl.filter(d => d.pnl > 0).length;
    const lossDays = dailyPnl.filter(d => d.pnl < 0).length;

    const stats = {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      breakEvenTrades: breakEvenTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalPnl,
      averagePnl: trades.length > 0 ? totalPnl / trades.length : 0,
      averageWin,
      averageLoss,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl)) : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      tradingDays,
      byTicker,
      byDirection,
      byTag,
      dailyPnl,
      // Advanced metrics
      maxConsecWins,
      maxConsecLosses,
      currentStreak,
      currentStreakType,
      expectancy,
      maxDrawdown,
      recoveryFactor,
      sharpeRatio,
      winDays,
      lossDays,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error calculating stats:", error);
    return NextResponse.json(
      { error: "Failed to calculate stats" },
      { status: 500 }
    );
  }
}
