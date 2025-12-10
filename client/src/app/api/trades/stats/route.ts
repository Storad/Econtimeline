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
    const period = searchParams.get("period"); // "day", "week", "month", "year", "all"

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
          start = new Date(0); // All time
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
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
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

    // By tag
    const byTag: Record<string, { count: number; pnl: number; wins: number; name: string; color: string }> = {};
    trades.forEach((t) => {
      t.tags.forEach((tt) => {
        const tag = tt.tag;
        if (!byTag[tag.id]) {
          byTag[tag.id] = { count: 0, pnl: 0, wins: 0, name: tag.name, color: tag.color };
        }
        byTag[tag.id].count++;
        byTag[tag.id].pnl += t.pnl;
        if (t.pnl > 0) byTag[tag.id].wins++;
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
