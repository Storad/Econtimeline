"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Percent,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TradeStats as Stats } from "./types";

interface TradeStatsProps {
  stats: Stats | null;
  loading?: boolean;
  period: string;
  onPeriodChange: (period: string) => void;
}

export default function TradeStatsPanel({
  stats,
  loading,
  period,
  onPeriodChange,
}: TradeStatsProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="p-4 text-center text-muted">
        <div className="animate-pulse">Loading stats...</div>
      </div>
    );
  }

  if (!stats || stats.totalTrades === 0) {
    return (
      <div className="p-4 text-center text-muted">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No trades logged yet</p>
        <p className="text-xs mt-1">Start logging trades to see your stats</p>
      </div>
    );
  }

  const periods = [
    { value: "day", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="space-y-3">
      {/* Period Selector */}
      <div className="flex items-center gap-1 p-1 bg-card rounded-lg">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-all ${
              period === p.value
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Total P&L */}
        <div
          className={`p-3 rounded-lg border ${
            stats.totalPnl >= 0
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-wider mb-1">
            <DollarSign className="w-3 h-3" />
            Total P&L
          </div>
          <div
            className={`text-xl font-bold ${
              stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}
          </div>
        </div>

        {/* Win Rate */}
        <div
          className={`p-3 rounded-lg border ${
            stats.winRate >= 50
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-wider mb-1">
            <Target className="w-3 h-3" />
            Win Rate
          </div>
          <div
            className={`text-xl font-bold ${
              stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {stats.winRate.toFixed(1)}%
          </div>
        </div>

        {/* Total Trades */}
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-wider mb-1">
            <BarChart3 className="w-3 h-3" />
            Trades
          </div>
          <div className="text-xl font-bold text-foreground">
            {stats.totalTrades}
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            {stats.winningTrades}W / {stats.losingTrades}L
          </div>
        </div>

        {/* Profit Factor */}
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-wider mb-1">
            <Percent className="w-3 h-3" />
            Profit Factor
          </div>
          <div
            className={`text-xl font-bold ${
              stats.profitFactor >= 1 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {stats.profitFactor === Infinity
              ? "∞"
              : stats.profitFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        {expanded ? "Show less" : "Show more"}
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 animate-slide-in">
          {/* Averages */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-card/50 border border-border/50 text-center">
              <div className="text-[10px] text-muted mb-0.5">Avg P&L</div>
              <div
                className={`text-sm font-semibold ${
                  stats.averagePnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                ${stats.averagePnl.toFixed(2)}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-[10px] text-muted mb-0.5">Avg Win</div>
              <div className="text-sm font-semibold text-emerald-400">
                ${stats.averageWin.toFixed(2)}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <div className="text-[10px] text-muted mb-0.5">Avg Loss</div>
              <div className="text-sm font-semibold text-red-400">
                ${stats.averageLoss.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Largest Win/Loss */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-1 text-[10px] text-muted mb-0.5">
                <TrendingUp className="w-3 h-3" />
                Largest Win
              </div>
              <div className="text-sm font-semibold text-emerald-400">
                +${stats.largestWin.toFixed(2)}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-1 text-[10px] text-muted mb-0.5">
                <TrendingDown className="w-3 h-3" />
                Largest Loss
              </div>
              <div className="text-sm font-semibold text-red-400">
                ${stats.largestLoss.toFixed(2)}
              </div>
            </div>
          </div>

          {/* By Direction */}
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
              By Direction
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-card/50 border border-border/50">
                <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Long
                </div>
                <div className="text-sm font-semibold">
                  {stats.byDirection.LONG.count} trades
                </div>
                <div
                  className={`text-xs ${
                    stats.byDirection.LONG.pnl >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {stats.byDirection.LONG.pnl >= 0 ? "+" : ""}$
                  {stats.byDirection.LONG.pnl.toFixed(2)}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-card/50 border border-border/50">
                <div className="flex items-center gap-1 text-xs text-red-400 mb-1">
                  <TrendingDown className="w-3 h-3" />
                  Short
                </div>
                <div className="text-sm font-semibold">
                  {stats.byDirection.SHORT.count} trades
                </div>
                <div
                  className={`text-xs ${
                    stats.byDirection.SHORT.pnl >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {stats.byDirection.SHORT.pnl >= 0 ? "+" : ""}$
                  {stats.byDirection.SHORT.pnl.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* By Ticker */}
          {Object.keys(stats.byTicker).length > 0 && (
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                By Ticker
              </div>
              <div className="space-y-1">
                {Object.entries(stats.byTicker)
                  .sort((a, b) => b[1].pnl - a[1].pnl)
                  .slice(0, 5)
                  .map(([ticker, data]) => (
                    <div
                      key={ticker}
                      className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/50"
                    >
                      <div>
                        <span className="font-semibold text-sm">{ticker}</span>
                        <span className="text-xs text-muted ml-2">
                          {data.count} trades ({data.wins}W)
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          data.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* By Tag */}
          {Object.keys(stats.byTag).length > 0 && (
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                By Tag
              </div>
              <div className="space-y-1">
                {Object.entries(stats.byTag)
                  .sort((a, b) => b[1].pnl - a[1].pnl)
                  .slice(0, 5)
                  .map(([tag, data]) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        <span className="text-sm">{tag}</span>
                        <span className="text-xs text-muted">
                          {data.count} ({data.wins}W)
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          data.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Trading Days */}
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-card/50 border border-border/50">
            <Calendar className="w-4 h-4 text-muted" />
            <span className="text-sm">
              <span className="font-semibold">{stats.tradingDays}</span>{" "}
              <span className="text-muted">trading days</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
