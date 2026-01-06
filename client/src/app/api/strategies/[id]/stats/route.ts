import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Fetch strategy statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify access
    const strategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    // Check access: must be owner
    if (strategy.userId !== userId) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    // Fetch all trades for this strategy
    const trades = await prisma.strategyTrade.findMany({
      where: { strategyId: id },
      orderBy: { date: "asc" },
    });

    if (trades.length === 0) {
      return NextResponse.json({
        stats: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalPnl: 0,
          averagePnl: 0,
          averageWin: 0,
          averageLoss: 0,
          largestWin: 0,
          largestLoss: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          maxDrawdownPercent: 0,
          riskRewardRatio: 0,
          avgHoldTime: null,
          tradeFrequency: 0,
          tradingDays: 0,
          backtestTrades: 0,
          liveTrades: 0,
          equityCurve: [],
        },
      });
    }

    // Calculate basic stats
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);
    const breakEvenTrades = trades.filter((t) => t.pnl === 0);

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const averagePnl = totalPnl / trades.length;

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl)) : 0;

    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const riskRewardRatio = averageLoss > 0 ? averageWin / averageLoss : averageWin > 0 ? Infinity : 0;

    // Calculate equity curve and max drawdown
    let runningPnl = 0;
    let peak = 0;
    let maxDrawdown = 0;
    const equityCurve: { date: string; equity: number }[] = [];
    const dailyPnl: { [date: string]: number } = {};

    trades.forEach((trade) => {
      runningPnl += trade.pnl;
      dailyPnl[trade.date] = (dailyPnl[trade.date] || 0) + trade.pnl;

      if (runningPnl > peak) {
        peak = runningPnl;
      }
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Build equity curve by date
    const sortedDates = Object.keys(dailyPnl).sort();
    let cumulativeEquity = 0;
    sortedDates.forEach((date) => {
      cumulativeEquity += dailyPnl[date];
      equityCurve.push({ date, equity: cumulativeEquity });
    });

    // Calculate Sharpe Ratio (simplified daily returns version)
    const dailyReturns = Object.values(dailyPnl);
    const avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    // Max drawdown percent (based on peak)
    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    // Trade frequency (trades per week based on date range)
    const uniqueDates = new Set(trades.map((t) => t.date));
    const tradingDays = uniqueDates.size;
    const firstDate = new Date(trades[0].date);
    const lastDate = new Date(trades[trades.length - 1].date);
    const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksInPeriod = daysDiff / 7;
    const tradeFrequency = weeksInPeriod > 0 ? trades.length / weeksInPeriod : trades.length;

    // Backtest vs live trades
    const backtestTrades = trades.filter((t) => t.isBacktest).length;
    const liveTrades = trades.filter((t) => !t.isBacktest).length;

    return NextResponse.json({
      stats: {
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        breakEvenTrades: breakEvenTrades.length,
        winRate: (winningTrades.length / trades.length) * 100,
        totalPnl,
        averagePnl,
        averageWin,
        averageLoss,
        largestWin,
        largestLoss,
        profitFactor: profitFactor === Infinity ? null : profitFactor,
        sharpeRatio: isNaN(sharpeRatio) || !isFinite(sharpeRatio) ? 0 : sharpeRatio,
        maxDrawdown,
        maxDrawdownPercent,
        riskRewardRatio: riskRewardRatio === Infinity ? null : riskRewardRatio,
        avgHoldTime: null, // Would need time data to calculate
        tradeFrequency,
        tradingDays,
        backtestTrades,
        liveTrades,
        equityCurve,
      },
    });
  } catch (error) {
    console.error("Error fetching strategy stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategy stats" },
      { status: 500 }
    );
  }
}
