"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity,
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
  summary: {
    totalTrades: number;
    tradesOnEventDays: number;
    tradesOnNonEventDays: number;
    bestImpactLevel: string | null;
    bestCategory: string | null;
    bestEventType: string | null;
  };
}

const IMPACT_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-blue-400",
};

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

export default function EventCorrelation() {
  const [correlations, setCorrelations] = useState<Correlations | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
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
  }, []);

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

  const { byImpact, byCategory, noEventDays, summary } = correlations;

  // Calculate comparison between event days vs non-event days
  const eventDaysPnl =
    summary.tradesOnEventDays > 0
      ? Object.values(byImpact).reduce((sum, s) => sum + s.totalPnl, 0) /
        summary.tradesOnEventDays
      : 0;

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Event Impact Analysis</span>
        </div>
        <div className="text-xs text-muted">
          {summary.tradesOnEventDays} on event days / {summary.tradesOnNonEventDays} quiet
          days
        </div>
      </div>

      {/* Quick Comparison */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
          <div className="flex items-center gap-1 text-xs text-accent mb-1">
            <Zap className="w-3 h-3" />
            Event Days
          </div>
          <div className="text-xl font-bold">
            {summary.tradesOnEventDays > 0 ? (
              <span className={eventDaysPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                ${eventDaysPnl.toFixed(0)}
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
          <div className="text-[10px] text-muted">avg P&L per trade</div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-1 text-xs text-muted mb-1">
            <Calendar className="w-3 h-3" />
            Quiet Days
          </div>
          <div className="text-xl font-bold">
            {noEventDays.count > 0 ? (
              <span className={noEventDays.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                ${noEventDays.avgPnl.toFixed(0)}
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
          <div className="text-[10px] text-muted">avg P&L per trade</div>
        </div>
      </div>

      {/* By Impact Level */}
      <div>
        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
          Performance by Event Impact
        </div>
        <div className="space-y-2">
          {(["high", "medium", "low"] as const).map((impact) => {
            const stats = byImpact[impact];
            if (!stats || stats.count === 0) return null;
            return (
              <StatCard
                key={impact}
                label={`${impact.charAt(0).toUpperCase() + impact.slice(1)} Impact`}
                stats={stats}
                colorClass={IMPACT_COLORS[impact]}
                bgClass={IMPACT_BG[impact]}
              />
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
            <div className="space-y-2">
              {Object.entries(byCategory)
                .filter(([, stats]) => stats.count >= 2)
                .sort((a, b) => b[1].avgPnl - a[1].avgPnl)
                .slice(0, 6)
                .map(([category, stats]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/50"
                  >
                    <div>
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-xs text-muted ml-2">
                        {stats.count} trades ({stats.wins}W)
                      </span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          stats.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        ${stats.avgPnl.toFixed(0)} avg
                      </div>
                      <div
                        className={`text-xs ${
                          stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {stats.winRate.toFixed(0)}% win
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Best/Worst Insights */}
          {(summary.bestCategory || summary.bestImpactLevel) && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-1 text-xs text-emerald-400 mb-2">
                <TrendingUp className="w-3 h-3" />
                Best Performance
              </div>
              <div className="space-y-1 text-sm">
                {summary.bestImpactLevel && byImpact[summary.bestImpactLevel] && (
                  <div>
                    <span className="text-muted">Impact:</span>{" "}
                    <span className="font-medium capitalize">{summary.bestImpactLevel}</span>
                    <span className="text-emerald-400 ml-2">
                      {byImpact[summary.bestImpactLevel].winRate.toFixed(0)}% win rate
                    </span>
                  </div>
                )}
                {summary.bestCategory && byCategory[summary.bestCategory] && (
                  <div>
                    <span className="text-muted">Category:</span>{" "}
                    <span className="font-medium">{summary.bestCategory}</span>
                    <span className="text-emerald-400 ml-2">
                      {byCategory[summary.bestCategory].winRate.toFixed(0)}% win rate
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
