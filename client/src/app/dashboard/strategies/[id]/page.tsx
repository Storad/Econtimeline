"use client";

import { useState, useEffect, use } from "react";
import { useStrategies } from "@/hooks/useStrategies";
import { ArrowLeft, TrendingUp, Calendar, Target, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  Strategy,
  StrategyStats,
  StrategyTrade,
  StrategySignal,
} from "@/components/Strategies/types";

export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    fetchStrategy,
    fetchStrategyStats,
    fetchStrategyTrades,
    fetchStrategySignals,
  } = useStrategies();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [stats, setStats] = useState<StrategyStats | null>(null);
  const [trades, setTrades] = useState<StrategyTrade[]>([]);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [strategyData, statsData, tradesData, signalsData] = await Promise.all([
        fetchStrategy(id),
        fetchStrategyStats(id),
        fetchStrategyTrades(id),
        fetchStrategySignals(id),
      ]);
      setStrategy(strategyData);
      setStats(statsData);
      setTrades(tradesData);
      setSignals(signalsData);
      setLoading(false);
    };
    loadData();
  }, [id, fetchStrategy, fetchStrategyStats, fetchStrategyTrades, fetchStrategySignals]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-muted mb-4">Strategy not found</p>
        <Link href="/dashboard/strategies" className="text-accent-light hover:underline">
          ← Back to strategies
        </Link>
      </div>
    );
  }

  // Separate open vs closed trades
  const openTrades = trades.filter((t) => !t.exitPrice && !t.isBacktest);
  const closedTrades = trades.filter((t) => t.exitPrice || t.isBacktest);
  const activeSignals = signals.filter((s) => s.status === "PENDING" || s.status === "TRIGGERED");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Back Link */}
      <Link
        href="/dashboard/strategies"
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Strategies
      </Link>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Strategy Header & Description */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{strategy.name}</h1>
              <span className="text-sm text-muted">{strategy.type}</span>
            </div>
            {strategy.isPublished && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                Live
              </span>
            )}
          </div>

          {strategy.description && (
            <div className="prose prose-sm prose-invert max-w-none">
              {strategy.description.split("\n").map((paragraph, i) => (
                <p key={i} className="text-muted text-sm leading-relaxed mb-2">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        {stats && stats.totalTrades > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.totalTrades}</p>
              <p className="text-xs text-muted">Total Trades</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.winRate.toFixed(0)}%</p>
              <p className="text-xs text-muted">Win Rate</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className={`text-2xl font-bold ${stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ${stats.totalPnl.toLocaleString()}
              </p>
              <p className="text-xs text-muted">Total P&L</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{openTrades.length}</p>
              <p className="text-xs text-muted">Open Positions</p>
            </div>
          </div>
        )}

        {/* Active Alerts */}
        {activeSignals.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="font-medium text-yellow-400">Active Alert</span>
            </div>
            {activeSignals.map((signal) => (
              <p key={signal.id} className="text-sm text-foreground">
                {signal.message}
              </p>
            ))}
          </div>
        )}

        {/* Open Positions */}
        {openTrades.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Open Positions</h2>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card-hover">
                    <th className="text-left p-3 text-muted font-medium">Date Opened</th>
                    <th className="text-left p-3 text-muted font-medium">Ticker</th>
                    <th className="text-left p-3 text-muted font-medium">Direction</th>
                    <th className="text-right p-3 text-muted font-medium">Entry</th>
                    <th className="text-right p-3 text-muted font-medium">Unrealized P&L</th>
                    <th className="text-left p-3 text-muted font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-border/50 last:border-0">
                      <td className="p-3 text-foreground">{formatDate(trade.date)}</td>
                      <td className="p-3 text-foreground font-medium">{trade.ticker}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trade.direction === "LONG"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="p-3 text-right text-foreground">
                        ${trade.entryPrice?.toLocaleString()}
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toLocaleString()}
                      </td>
                      <td className="p-3 text-muted text-xs max-w-xs truncate">
                        {trade.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trade History */}
        {closedTrades.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Trade History</h2>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card-hover">
                    <th className="text-left p-3 text-muted font-medium">Date</th>
                    <th className="text-left p-3 text-muted font-medium">Ticker</th>
                    <th className="text-left p-3 text-muted font-medium">Direction</th>
                    <th className="text-right p-3 text-muted font-medium">Entry</th>
                    <th className="text-right p-3 text-muted font-medium">Exit</th>
                    <th className="text-right p-3 text-muted font-medium">P&L</th>
                    <th className="text-right p-3 text-muted font-medium">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {closedTrades
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((trade) => {
                      const returnPct = trade.entryPrice
                        ? ((trade.pnl / trade.entryPrice) * 100).toFixed(0)
                        : "50";
                      return (
                        <tr key={trade.id} className="border-b border-border/50 last:border-0">
                          <td className="p-3 text-foreground">{formatDate(trade.date)}</td>
                          <td className="p-3 text-foreground font-medium">{trade.ticker}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              trade.direction === "LONG"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="p-3 text-right text-foreground">
                            ${trade.entryPrice?.toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-foreground">
                            ${trade.exitPrice?.toLocaleString()}
                          </td>
                          <td className={`p-3 text-right font-medium ${
                            trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toLocaleString()}
                          </td>
                          <td className={`p-3 text-right ${
                            trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {trade.pnl >= 0 ? "+" : ""}{returnPct}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {trades.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted">No trades recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
