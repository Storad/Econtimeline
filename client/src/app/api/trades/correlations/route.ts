import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low" | "holiday" | "early_close";
  category: string;
}

interface CorrelationStats {
  count: number;
  wins: number;
  losses: number;
  totalPnl: number;
  winRate: number;
  avgPnl: number;
}

interface Correlations {
  byImpact: Record<string, CorrelationStats>;
  byCategory: Record<string, CorrelationStats>;
  byEventType: Record<string, CorrelationStats>;
  noEventDays: CorrelationStats;
  eventDays: CorrelationStats;
  summary: {
    totalTrades: number;
    tradesOnEventDays: number;
    tradesOnNonEventDays: number;
    bestImpactLevel: string | null;
    bestCategory: string | null;
    bestEventType: string | null;
  };
}

function createEmptyStats(): CorrelationStats {
  return { count: 0, wins: 0, losses: 0, totalPnl: 0, winRate: 0, avgPnl: 0 };
}

function finalizeStats(stats: CorrelationStats): CorrelationStats {
  return {
    ...stats,
    winRate: stats.count > 0 ? (stats.wins / stats.count) * 100 : 0,
    avgPnl: stats.count > 0 ? stats.totalPnl / stats.count : 0,
  };
}

async function loadCalendarEvents(): Promise<EconomicEvent[]> {
  try {
    const filePath = path.join(process.cwd(), "public", "calendar-data.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const rawData = JSON.parse(fileContent);

    return (rawData.events || []).map((e: Record<string, unknown>, i: number) => ({
      id: `event-${i}`,
      date: e.date as string,
      time: e.time as string,
      currency: e.currency as string,
      event: e.title as string,
      impact: e.impact as "high" | "medium" | "low" | "holiday" | "early_close",
      category: e.category as string,
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all trades and calendar events
    const [trades, events] = await Promise.all([
      prisma.trade.findMany({
        where: { userId },
        orderBy: { date: "asc" },
      }),
      loadCalendarEvents(),
    ]);

    if (trades.length === 0) {
      return NextResponse.json({
        correlations: {
          byImpact: {},
          byCategory: {},
          byEventType: {},
          noEventDays: createEmptyStats(),
          eventDays: createEmptyStats(),
          summary: {
            totalTrades: 0,
            tradesOnEventDays: 0,
            tradesOnNonEventDays: 0,
            bestImpactLevel: null,
            bestCategory: null,
            bestEventType: null,
          },
        },
      });
    }

    // Group events by date for quick lookup
    const eventsByDate = new Map<string, EconomicEvent[]>();
    events.forEach((event) => {
      const existing = eventsByDate.get(event.date) || [];
      existing.push(event);
      eventsByDate.set(event.date, existing);
    });

    // Initialize correlation stats
    const byImpact: Record<string, CorrelationStats> = {
      high: createEmptyStats(),
      medium: createEmptyStats(),
      low: createEmptyStats(),
    };
    const byCategory: Record<string, CorrelationStats> = {};
    const byEventType: Record<string, CorrelationStats> = {};
    const noEventDays = createEmptyStats();
    const eventDays = createEmptyStats(); // Track event days same way as quiet days

    let tradesOnEventDays = 0;
    let tradesOnNonEventDays = 0;

    // Process each trade
    trades.forEach((trade) => {
      const dayEvents = eventsByDate.get(trade.date) || [];
      const pnl = Number(trade.pnl);
      const isWin = pnl > 0;
      const isLoss = pnl < 0;

      if (dayEvents.length === 0) {
        // No events on this day
        noEventDays.count++;
        if (isWin) noEventDays.wins++;
        if (isLoss) noEventDays.losses++;
        noEventDays.totalPnl += pnl;
        tradesOnNonEventDays++;
      } else {
        tradesOnEventDays++;
        eventDays.count++;
        eventDays.totalPnl += pnl;
        if (isWin) eventDays.wins++;
        if (isLoss) eventDays.losses++;

        // Track unique impacts and categories for this trade
        const uniqueImpacts = new Set<string>();
        const uniqueCategories = new Set<string>();
        const uniqueEventTypes = new Set<string>();

        dayEvents.forEach((event) => {
          // Skip holidays/early closes for impact tracking
          if (event.impact !== "holiday" && event.impact !== "early_close") {
            uniqueImpacts.add(event.impact);
          }
          if (event.category) {
            uniqueCategories.add(event.category);
          }
          // Use first 30 chars of event name as type
          const eventType = event.event.substring(0, 40);
          uniqueEventTypes.add(eventType);
        });

        // Record by impact (count once per impact level per trade)
        uniqueImpacts.forEach((impact) => {
          if (!byImpact[impact]) byImpact[impact] = createEmptyStats();
          byImpact[impact].count++;
          if (isWin) byImpact[impact].wins++;
          if (isLoss) byImpact[impact].losses++;
          byImpact[impact].totalPnl += pnl;
        });

        // Record by category
        uniqueCategories.forEach((category) => {
          if (!byCategory[category]) byCategory[category] = createEmptyStats();
          byCategory[category].count++;
          if (isWin) byCategory[category].wins++;
          if (isLoss) byCategory[category].losses++;
          byCategory[category].totalPnl += pnl;
        });

        // Record by event type
        uniqueEventTypes.forEach((eventType) => {
          if (!byEventType[eventType]) byEventType[eventType] = createEmptyStats();
          byEventType[eventType].count++;
          if (isWin) byEventType[eventType].wins++;
          if (isLoss) byEventType[eventType].losses++;
          byEventType[eventType].totalPnl += pnl;
        });
      }
    });

    // Finalize all stats
    Object.keys(byImpact).forEach((k) => {
      byImpact[k] = finalizeStats(byImpact[k]);
    });
    Object.keys(byCategory).forEach((k) => {
      byCategory[k] = finalizeStats(byCategory[k]);
    });
    Object.keys(byEventType).forEach((k) => {
      byEventType[k] = finalizeStats(byEventType[k]);
    });
    const finalNoEventDays = finalizeStats(noEventDays);
    const finalEventDays = finalizeStats(eventDays);

    // Find best performers (by win rate, with min 3 trades)
    const findBest = (stats: Record<string, CorrelationStats>): string | null => {
      let best: string | null = null;
      let bestRate = -1;
      Object.entries(stats).forEach(([key, s]) => {
        if (s.count >= 3 && s.winRate > bestRate) {
          bestRate = s.winRate;
          best = key;
        }
      });
      return best;
    };

    const correlations: Correlations = {
      byImpact,
      byCategory,
      byEventType,
      noEventDays: finalNoEventDays,
      eventDays: finalEventDays,
      summary: {
        totalTrades: trades.length,
        tradesOnEventDays,
        tradesOnNonEventDays,
        bestImpactLevel: findBest(byImpact),
        bestCategory: findBest(byCategory),
        bestEventType: findBest(byEventType),
      },
    };

    return NextResponse.json({ correlations });
  } catch (error) {
    console.error("Error calculating correlations:", error);
    return NextResponse.json(
      { error: "Failed to calculate correlations" },
      { status: 500 }
    );
  }
}
