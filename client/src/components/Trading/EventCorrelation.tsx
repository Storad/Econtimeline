"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low" | "holiday" | "early_close";
  category: string;
}

interface TradeInput {
  date: string;
  pnl: number;
}

interface EventCorrelationProps {
  trades?: TradeInput[];
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

function calculateCorrelations(trades: TradeInput[], events: EconomicEvent[]): Correlations {
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

      const uniqueImpacts = new Set<string>();
      const uniqueCategories = new Set<string>();
      const uniqueEventTypes = new Set<string>();

      dayEvents.forEach((event) => {
        if (event.impact !== "holiday" && event.impact !== "early_close") {
          uniqueImpacts.add(event.impact);
        }
        if (event.category) {
          uniqueCategories.add(event.category);
        }
        const eventType = event.event.substring(0, 40);
        uniqueEventTypes.add(eventType);
      });

      uniqueImpacts.forEach((impact) => {
        if (!byImpact[impact]) byImpact[impact] = createEmptyStats();
        byImpact[impact].count++;
        if (isWin) byImpact[impact].wins++;
        if (isLoss) byImpact[impact].losses++;
        byImpact[impact].totalPnl += pnl;
      });

      uniqueCategories.forEach((category) => {
        if (!byCategory[category]) byCategory[category] = createEmptyStats();
        byCategory[category].count++;
        if (isWin) byCategory[category].wins++;
        if (isLoss) byCategory[category].losses++;
        byCategory[category].totalPnl += pnl;
      });

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

  // Find best performers
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

  return {
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
}

const IMPACT_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-blue-400",
};

// Format category names for display (e.g., "central_bank" -> "Central Bank")
function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// All possible event categories from the calendar
const ALL_CATEGORIES = [
  'energy',
  'manufacturing',
  'bonds',
  'employment',
  'housing',
  'central_bank',
  'inflation',
  'services',
  'trade',
  'sentiment',
  'consumer',
  'growth',
  'fiscal'
];

const IMPACT_BG: Record<string, string> = {
  high: "bg-red-500/10 border-red-500/30",
  medium: "bg-amber-500/10 border-amber-500/30",
  low: "bg-blue-500/10 border-blue-500/30",
};

function StatCard({
  label,
  stats,
  colorClass,
  bgClass,
}: {
  label: string;
  stats: CorrelationStats;
  colorClass?: string;
  bgClass?: string;
}) {
  if (stats.count === 0) return null;

  return (
    <div className={`p-3 rounded-lg border ${bgClass || "bg-card border-border"}`}>
      <div className={`text-xs font-medium mb-2 ${colorClass || "text-foreground"}`}>
        {label}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold">{stats.count}</div>
          <div className="text-[10px] text-muted">trades</div>
        </div>
        <div>
          <div
            className={`text-lg font-bold ${
              stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {stats.winRate.toFixed(0)}%
          </div>
          <div className="text-[10px] text-muted">win rate</div>
        </div>
        <div>
          <div
            className={`text-lg font-bold ${
              stats.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            ${stats.avgPnl.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted">avg P&L</div>
        </div>
      </div>
    </div>
  );
}

export default function EventCorrelation({ trades }: EventCorrelationProps) {
  const [correlations, setCorrelations] = useState<Correlations | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<EconomicEvent[]>([]);

  // Fetch calendar events for client-side calculation
  useEffect(() => {
    async function fetchCalendarEvents() {
      try {
        const res = await fetch("/calendar-data.json");
        if (res.ok) {
          const data = await res.json();
          const events = (data.events || []).map((e: Record<string, unknown>, i: number) => ({
            id: `event-${i}`,
            date: e.date as string,
            time: e.time as string,
            currency: e.currency as string,
            event: e.title as string,
            impact: e.impact as "high" | "medium" | "low" | "holiday" | "early_close",
            category: e.category as string,
          }));
          setCalendarEvents(events);
        }
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
      }
    }
    fetchCalendarEvents();
  }, []);

  // Calculate correlations from passed trades (demo mode) or fetch from API
  useEffect(() => {
    if (trades && trades.length > 0 && calendarEvents.length > 0) {
      // Client-side calculation for demo trades
      const calculated = calculateCorrelations(trades, calendarEvents);
      setCorrelations(calculated);
      setLoading(false);
    } else if (trades && trades.length === 0) {
      // Empty trades array passed - show empty state
      setCorrelations(null);
      setLoading(false);
    } else if (!trades) {
      // No trades prop - fetch from API (real trades mode)
      async function fetchCorrelations() {
        try {
          const res = await fetch("/api/trades/correlations");
          if (res.ok) {
            const data = await res.json();
            setCorrelations(data.correlations);
          }
        } catch (error) {
          console.error("Failed to fetch correlations:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchCorrelations();
    }
  }, [trades, calendarEvents]);

  if (loading) {
    return (
      <div className="p-4 text-center text-muted">
        <div className="animate-pulse">Loading correlations...</div>
      </div>
    );
  }

  if (!correlations || correlations.summary.totalTrades === 0) {
    return (
      <div className="p-4 text-center text-muted">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No trade-event correlations yet</p>
        <p className="text-xs mt-1">Log trades to see how events affect your performance</p>
      </div>
    );
  }

  const { byImpact, byCategory, noEventDays, eventDays, summary } = correlations;

  // Find best/worst performers for at-a-glance section
  type PerfResult = { key: string; stats: CorrelationStats } | null;
  const findBestWorst = (stats: Record<string, CorrelationStats>, minTrades: number = 2): { best: PerfResult; worst: PerfResult } => {
    let best: PerfResult = null;
    let worst: PerfResult = null;

    Object.entries(stats).forEach(([key, s]) => {
      if (s.count >= minTrades) {
        if (!best || s.winRate > best.stats.winRate) {
          best = { key, stats: s };
        }
        if (!worst || s.winRate < worst.stats.winRate) {
          worst = { key, stats: s };
        }
      }
    });

    return { best, worst };
  };

  const impactPerf = findBestWorst(byImpact);
  const categoryPerf = findBestWorst(byCategory);

  return (
    <div className="space-y-3">
      {/* Performance Summary */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1">
          <span className="text-muted">Best on:</span>
          {impactPerf.best && (
            <span className="text-emerald-400 capitalize">{impactPerf.best.key} impact</span>
          )}
          {impactPerf.best && categoryPerf.best && <span className="text-muted">,</span>}
          {categoryPerf.best && (
            <span className="text-emerald-400">{formatCategoryName(categoryPerf.best.key)} events</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted">Worst on:</span>
          {impactPerf.worst && impactPerf.worst.key !== impactPerf.best?.key && (
            <span className="text-red-400 capitalize">{impactPerf.worst.key} impact</span>
          )}
          {impactPerf.worst && impactPerf.worst.key !== impactPerf.best?.key && categoryPerf.worst && categoryPerf.worst.key !== categoryPerf.best?.key && <span className="text-muted">,</span>}
          {categoryPerf.worst && categoryPerf.worst.key !== categoryPerf.best?.key && (
            <span className="text-red-400">{formatCategoryName(categoryPerf.worst.key)} events</span>
          )}
        </div>
      </div>

      {/* Event Days vs Quiet Days */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/30">
          <div className="flex items-center gap-1 text-xs font-semibold text-accent mb-1">
            <Zap className="w-3 h-3" />
            Event Days
          </div>
          {eventDays.count > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-base font-bold ${eventDays.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {eventDays.totalPnl >= 0 ? "+" : ""}${eventDays.totalPnl.toFixed(0)}
                  </span>
                  <span className="text-xs text-muted ml-1">total</span>
                </div>
                <div>
                  <span className={`text-sm ${eventDays.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {eventDays.avgPnl >= 0 ? "+" : ""}${eventDays.avgPnl.toFixed(0)}
                  </span>
                  <span className="text-xs text-muted ml-1">avg</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted">{eventDays.count} trades</span>
                <span className={`${eventDays.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                  {eventDays.winRate.toFixed(0)}% win
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-0.5">
                <span className="text-emerald-400">{eventDays.wins} wins</span>
                <span className="text-red-400">{eventDays.losses} losses</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted/40">No trades</div>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-1 text-xs font-semibold text-muted mb-1">
            <Calendar className="w-3 h-3" />
            Quiet Days
          </div>
          {noEventDays.count > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-base font-bold ${noEventDays.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {noEventDays.totalPnl >= 0 ? "+" : ""}${noEventDays.totalPnl.toFixed(0)}
                  </span>
                  <span className="text-xs text-muted ml-1">total</span>
                </div>
                <div>
                  <span className={`text-sm ${noEventDays.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {noEventDays.avgPnl >= 0 ? "+" : ""}${noEventDays.avgPnl.toFixed(0)}
                  </span>
                  <span className="text-xs text-muted ml-1">avg</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted">{noEventDays.count} trades</span>
                <span className={`${noEventDays.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                  {noEventDays.winRate.toFixed(0)}% win
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-0.5">
                <span className="text-emerald-400">{noEventDays.wins} wins</span>
                <span className="text-red-400">{noEventDays.losses} losses</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted/40">No trades</div>
          )}
        </div>
      </div>

      {/* By Impact Level */}
      <div>
        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
          Performance by Event Impact
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["high", "medium", "low"] as const).map((impact) => {
            const stats = byImpact[impact];
            const hasData = stats && stats.count > 0;

            return (
              <div
                key={impact}
                className={`p-2.5 rounded-lg border ${
                  !hasData
                    ? "bg-card/30 border-border/40"
                    : IMPACT_BG[impact]
                }`}
              >
                <div className={`text-xs font-semibold mb-1 ${!hasData ? "text-muted/50" : IMPACT_COLORS[impact]}`}>
                  {impact.charAt(0).toUpperCase() + impact.slice(1)} Impact
                </div>
                {hasData ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-base font-bold ${stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(0)}
                        </span>
                        <span className="text-xs text-muted ml-1">total</span>
                      </div>
                      <div>
                        <span className={`text-sm ${stats.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {stats.avgPnl >= 0 ? "+" : ""}${stats.avgPnl.toFixed(0)}
                        </span>
                        <span className="text-xs text-muted ml-1">avg</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted">{stats.count} trades</span>
                      <span className={`${stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                        {stats.winRate.toFixed(0)}% win
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-0.5">
                      <span className="text-emerald-400">{stats.wins} wins</span>
                      <span className="text-red-400">{stats.losses} losses</span>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted/40">No trades</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand/Collapse for Categories */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        {expanded ? "Show less" : "Show by category"}
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="space-y-3 animate-slide-in">
          {/* By Category */}
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
              Performance by Event Category
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_CATEGORIES.map((category) => {
                const stats = byCategory[category];
                const hasData = stats && stats.count > 0;

                return (
                  <div
                    key={category}
                    className={`p-2.5 rounded-lg border ${
                      !hasData
                        ? "bg-card/30 border-border/40"
                        : stats.avgPnl >= 0
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-1 ${!hasData ? "text-muted/50" : "text-foreground"}`}>
                      {formatCategoryName(category)}
                    </div>
                    {hasData ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`text-base font-bold ${stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(0)}
                            </span>
                            <span className="text-xs text-muted ml-1">total</span>
                          </div>
                          <div>
                            <span className={`text-sm ${stats.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {stats.avgPnl >= 0 ? "+" : ""}${stats.avgPnl.toFixed(0)}
                            </span>
                            <span className="text-xs text-muted ml-1">avg</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted">{stats.count} trades</span>
                          <span className={`${stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                            {stats.winRate.toFixed(0)}% win
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-0.5">
                          <span className="text-emerald-400">{stats.wins} wins</span>
                          <span className="text-red-400">{stats.losses} losses</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted/40">No trades</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
