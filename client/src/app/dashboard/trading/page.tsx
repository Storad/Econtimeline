"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Flame,
  Snowflake,
  Trophy,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  BarChart3,
  Activity,
  Award,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  X,
  Check,
  HelpCircle,
} from "lucide-react";
import { useTradeJournal } from "@/hooks/useTradeJournal";
import { Trade } from "@/components/TradeJournal/types";

// Tooltip content type for structured tooltips
interface TooltipContent {
  title: string;
  description: string;
  details?: { label: string; value: string; color?: string }[];
  formula?: string;
  tip?: string;
}

// Tooltip Component - uses fixed positioning to stay in viewport
const Tooltip = ({ children, content }: { children: React.ReactNode; content: TooltipContent }) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 160;
    const padding = 12;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.bottom + padding;

    // Keep tooltip within horizontal bounds
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }

    // If tooltip would go below viewport, show above instead
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = rect.top - tooltipHeight - padding;
    }

    setTooltipStyle({ left, top, position: 'fixed' });
    setIsVisible(true);
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div
        style={tooltipStyle}
        className={`fixed w-[280px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden transition-all duration-200 z-[9999] pointer-events-none ${
          isVisible ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {/* Header */}
        <div className="px-3 py-2 bg-accent/10 border-b border-border">
          <h4 className="text-xs font-semibold text-accent-light flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            {content.title}
          </h4>
        </div>

        {/* Body */}
        <div className="p-3 space-y-2">
          <p className="text-xs text-muted leading-relaxed">{content.description}</p>

          {/* Details list */}
          {content.details && content.details.length > 0 && (
            <div className="space-y-1 pt-1">
              {content.details.map((detail, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted">{detail.label}</span>
                  <span className={`font-medium ${detail.color || "text-foreground"}`}>{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Formula */}
          {content.formula && (
            <div className="mt-2 px-2 py-1.5 bg-background rounded-md border border-border/50">
              <code className="text-[10px] text-accent-light font-mono">{content.formula}</code>
            </div>
          )}

          {/* Tip */}
          {content.tip && (
            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border/50">
              <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted italic">{content.tip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Info icon button for tooltips
const InfoTip = ({ content }: { content: TooltipContent }) => (
  <Tooltip content={content}>
    <HelpCircle className="w-3.5 h-3.5 text-muted/50 hover:text-accent-light cursor-help ml-1 flex-shrink-0 transition-colors" />
  </Tooltip>
);

// Goal settings interface
interface TradingGoals {
  yearlyPnlGoal: number;
  monthlyPnlGoal: number;
}

export default function TradingPage() {
  const { trades, loading } = useTradeJournal();
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [goals, setGoals] = useState<TradingGoals>({ yearlyPnlGoal: 0, monthlyPnlGoal: 0 });
  const [goalInput, setGoalInput] = useState({ yearly: "", monthly: "" });
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Load goals from localStorage
  useEffect(() => {
    const savedGoals = localStorage.getItem("tradingGoals");
    if (savedGoals) {
      const parsed = JSON.parse(savedGoals);
      setGoals(parsed);
      setGoalInput({
        yearly: parsed.yearlyPnlGoal > 0 ? parsed.yearlyPnlGoal.toString() : "",
        monthly: parsed.monthlyPnlGoal > 0 ? parsed.monthlyPnlGoal.toString() : "",
      });
    }
  }, []);

  // Save goals
  const saveGoals = () => {
    const newGoals = {
      yearlyPnlGoal: parseFloat(goalInput.yearly) || 0,
      monthlyPnlGoal: parseFloat(goalInput.monthly) || 0,
    };
    setGoals(newGoals);
    localStorage.setItem("tradingGoals", JSON.stringify(newGoals));
    setShowGoalSettings(false);
  };

  // Calculate all trading statistics
  const tradingStats = useMemo(() => {
    if (!trades.length) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastYear = currentYear - 1;

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return 0;
    });

    // All-time stats
    const allTimePnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const allTimeTrades = trades.length;

    // YTD stats
    const ytdTrades = trades.filter((t) => {
      const [y] = t.date.split("-").map(Number);
      return y === currentYear;
    });
    const ytdPnl = ytdTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Last year stats (for YoY comparison)
    const lastYearTrades = trades.filter((t) => {
      const [y] = t.date.split("-").map(Number);
      return y === lastYear;
    });
    const lastYearPnl = lastYearTrades.reduce((sum, t) => sum + t.pnl, 0);

    // MTD stats
    const mtdTrades = trades.filter((t) => {
      const [y, m] = t.date.split("-").map(Number);
      return y === currentYear && m === currentMonth + 1;
    });
    const mtdPnl = mtdTrades.reduce((sum, t) => sum + t.pnl, 0);

    // WTD stats (Sunday to Saturday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const wtdTrades = trades.filter((t) => {
      const [y, m, d] = t.date.split("-").map(Number);
      const tradeDate = new Date(y, m - 1, d);
      return tradeDate >= startOfWeek;
    });
    const wtdPnl = wtdTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Calculate streaks
    const tradesByDate: Record<string, number> = {};
    trades.forEach((t) => {
      tradesByDate[t.date] = (tradesByDate[t.date] || 0) + t.pnl;
    });

    const sortedDates = Object.keys(tradesByDate).sort();
    let currentStreak = 0;
    let currentStreakType: "win" | "loss" | null = null;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    sortedDates.forEach((date) => {
      const dailyPnl = tradesByDate[date];
      if (dailyPnl > 0) {
        tempWinStreak++;
        tempLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else if (dailyPnl < 0) {
        tempLossStreak++;
        tempWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
      }
    });

    // Current streak (from most recent day backwards)
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const dailyPnl = tradesByDate[sortedDates[i]];
      if (i === sortedDates.length - 1) {
        currentStreakType = dailyPnl > 0 ? "win" : dailyPnl < 0 ? "loss" : null;
        currentStreak = dailyPnl !== 0 ? 1 : 0;
      } else {
        const thisType = dailyPnl > 0 ? "win" : dailyPnl < 0 ? "loss" : null;
        if (thisType === currentStreakType && thisType !== null) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate equity curve with drawdown
    let runningPnl = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let currentDrawdown = 0;
    let drawdownStart: string | null = null;
    let maxDrawdownStart: string | null = null;
    let maxDrawdownEnd: string | null = null;
    let inDrawdown = false;

    const equityCurve: { date: string; pnl: number; cumulative: number; drawdown: number; drawdownPercent: number }[] = [];

    sortedDates.forEach((date) => {
      runningPnl += tradesByDate[date];

      if (runningPnl > peak) {
        peak = runningPnl;
        inDrawdown = false;
        drawdownStart = null;
      }

      currentDrawdown = peak - runningPnl;
      const drawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0;

      if (currentDrawdown > 0 && !inDrawdown) {
        inDrawdown = true;
        drawdownStart = date;
      }

      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
        maxDrawdownPercent = drawdownPercent;
        maxDrawdownStart = drawdownStart;
        maxDrawdownEnd = date;
      }

      equityCurve.push({
        date,
        pnl: tradesByDate[date],
        cumulative: runningPnl,
        drawdown: currentDrawdown,
        drawdownPercent,
      });
    });

    // Calculate consistency score (0-100)
    // Factors: win rate, profit factor, drawdown severity, streak consistency
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;

    // Consistency factors
    const winRateScore = Math.min(winRate / 60 * 25, 25); // Max 25 points for 60%+ win rate
    const profitFactorScore = Math.min((profitFactor / 2) * 25, 25); // Max 25 points for 2+ PF
    const drawdownScore = Math.max(25 - (maxDrawdownPercent / 4), 0); // Lose points for high drawdown
    const streakScore = Math.min((longestWinStreak / 10) * 25, 25); // Max 25 for 10+ win streak

    const consistencyScore = Math.round(winRateScore + profitFactorScore + drawdownScore + streakScore);

    // YoY monthly comparison
    const monthlyByYear: Record<number, Record<number, number>> = {};
    trades.forEach((t) => {
      const [y, m] = t.date.split("-").map(Number);
      if (!monthlyByYear[y]) monthlyByYear[y] = {};
      monthlyByYear[y][m] = (monthlyByYear[y][m] || 0) + t.pnl;
    });

    // Average win/loss
    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    return {
      // P&L summaries
      allTimePnl,
      allTimeTrades,
      ytdPnl,
      ytdTrades: ytdTrades.length,
      lastYearPnl,
      lastYearTrades: lastYearTrades.length,
      mtdPnl,
      mtdTrades: mtdTrades.length,
      wtdPnl,
      wtdTrades: wtdTrades.length,
      // Streaks
      currentStreak,
      currentStreakType,
      longestWinStreak,
      longestLossStreak,
      // Equity & Drawdown
      equityCurve,
      maxDrawdown,
      maxDrawdownPercent,
      currentDrawdown,
      currentDrawdownPercent: peak > 0 ? (currentDrawdown / peak) * 100 : 0,
      maxDrawdownStart,
      maxDrawdownEnd,
      peak,
      // Consistency
      consistencyScore,
      winRateScore,
      profitFactorScore,
      drawdownScore,
      streakScore,
      // Core stats
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      // YoY data
      monthlyByYear,
      currentYear,
      lastYear,
      // Sorted trades for table
      sortedTrades,
    };
  }, [trades]);

  // Goal progress calculations
  const goalProgress = useMemo(() => {
    if (!tradingStats) return null;

    const yearlyProgress = goals.yearlyPnlGoal > 0
      ? (tradingStats.ytdPnl / goals.yearlyPnlGoal) * 100
      : 0;
    const monthlyProgress = goals.monthlyPnlGoal > 0
      ? (tradingStats.mtdPnl / goals.monthlyPnlGoal) * 100
      : 0;

    // Project end of year
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const daysInYear = 365;
    const projectedYearEnd = (tradingStats.ytdPnl / dayOfYear) * daysInYear;

    return {
      yearlyProgress: Math.min(yearlyProgress, 100),
      monthlyProgress: Math.min(monthlyProgress, 100),
      projectedYearEnd,
      onTrack: projectedYearEnd >= goals.yearlyPnlGoal,
    };
  }, [tradingStats, goals]);

  const getConsistencyGrade = (score: number) => {
    if (score >= 90) return { grade: "A+", color: "text-emerald-400" };
    if (score >= 80) return { grade: "A", color: "text-emerald-400" };
    if (score >= 70) return { grade: "B+", color: "text-green-400" };
    if (score >= 60) return { grade: "B", color: "text-green-400" };
    if (score >= 50) return { grade: "C+", color: "text-yellow-400" };
    if (score >= 40) return { grade: "C", color: "text-yellow-400" };
    if (score >= 30) return { grade: "D", color: "text-orange-400" };
    return { grade: "F", color: "text-red-400" };
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-light"></div>
      </div>
    );
  }

  if (!tradingStats) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted">
        <TrendingUp className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold mb-2">No Trading Data</h2>
        <p className="text-sm">Add trades in the Economic Calendar to see your trading analytics.</p>
      </div>
    );
  }

  const consistencyGrade = getConsistencyGrade(tradingStats.consistencyScore);

  return (
    <div className="h-full overflow-y-auto space-y-6 pb-6">
      {/* Header Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* All-Time P&L */}
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center">
            All-Time
            <InfoTip content={{
              title: "All-Time P&L",
              description: "Your total profit or loss across all trades ever recorded since you started tracking.",
              tip: "This number never resets - it's your lifetime trading performance."
            }} />
          </div>
          <div className={`text-xl font-bold ${tradingStats.allTimePnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {tradingStats.allTimePnl >= 0 ? "+" : ""}${tradingStats.allTimePnl.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted">{tradingStats.allTimeTrades} trades</div>
        </div>

        {/* YTD P&L */}
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center">
            YTD
            <InfoTip content={{
              title: "Year-To-Date P&L",
              description: "Your total P&L from January 1st of this year until today.",
              details: [
                { label: "Period", value: "Jan 1 - Today" },
                { label: "Resets", value: "Every New Year" }
              ],
              tip: "Compare to last year's YTD to track improvement."
            }} />
          </div>
          <div className={`text-xl font-bold ${tradingStats.ytdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {tradingStats.ytdPnl >= 0 ? "+" : ""}${tradingStats.ytdPnl.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted">{tradingStats.ytdTrades} trades</div>
        </div>

        {/* MTD P&L */}
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center">
            MTD
            <InfoTip content={{
              title: "Month-To-Date P&L",
              description: "Your total P&L from the 1st of this month until today.",
              details: [
                { label: "Period", value: "1st - Today" },
                { label: "Resets", value: "Every Month" }
              ],
              tip: "Use this to track your monthly performance goals."
            }} />
          </div>
          <div className={`text-xl font-bold ${tradingStats.mtdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {tradingStats.mtdPnl >= 0 ? "+" : ""}${tradingStats.mtdPnl.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted">{tradingStats.mtdTrades} trades</div>
        </div>

        {/* WTD P&L */}
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center">
            WTD
            <InfoTip content={{
              title: "Week-To-Date P&L",
              description: "Your total P&L from Sunday of this week until today.",
              details: [
                { label: "Period", value: "Sunday - Today" },
                { label: "Resets", value: "Every Sunday" }
              ],
              tip: "Great for tracking weekly consistency."
            }} />
          </div>
          <div className={`text-xl font-bold ${tradingStats.wtdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {tradingStats.wtdPnl >= 0 ? "+" : ""}${tradingStats.wtdPnl.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted">{tradingStats.wtdTrades} trades</div>
        </div>

        {/* Goal Progress */}
        <div
          className="glass rounded-xl p-4 border border-border/50 cursor-pointer hover:bg-card-hover transition-colors"
          onClick={() => setShowGoalSettings(true)}
        >
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            Goal <Settings className="w-3 h-3" />
            <InfoTip content={{
              title: "P&L Goal Tracking",
              description: "Set a yearly target and track your progress visually.",
              details: [
                { label: "Green bar", value: "On track", color: "text-emerald-400" },
                { label: "Yellow bar", value: "Behind pace", color: "text-yellow-400" }
              ],
              tip: "Click the card to set or update your goal."
            }} />
          </div>
          {goals.yearlyPnlGoal > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${goalProgress?.onTrack ? "bg-emerald-500" : "bg-yellow-500"}`}
                    style={{ width: `${goalProgress?.yearlyProgress || 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{(goalProgress?.yearlyProgress || 0).toFixed(0)}%</span>
              </div>
              <div className="text-[10px] text-muted mt-1">
                ${tradingStats.ytdPnl.toFixed(0)} / ${goals.yearlyPnlGoal.toFixed(0)}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">Set goal</div>
          )}
        </div>

        {/* Consistency Score */}
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center">
            Consistency
            <InfoTip content={{
              title: "Consistency Score",
              description: "A 0-100 score measuring your trading discipline across 4 key factors.",
              details: [
                { label: "Win Rate", value: "25 pts max" },
                { label: "Profit Factor", value: "25 pts max" },
                { label: "Drawdown Control", value: "25 pts max" },
                { label: "Win Streaks", value: "25 pts max" }
              ],
              tip: "See the breakdown section below for your detailed scores."
            }} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${consistencyGrade.color}`}>{consistencyGrade.grade}</span>
            <span className="text-sm text-muted">({tradingStats.consistencyScore}/100)</span>
          </div>
        </div>

        {/* Current Streak */}
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center">
            Streak
            <InfoTip content={{
              title: "Current Streak",
              description: "Consecutive profitable (W) or losing (L) trading days.",
              details: [
                { label: "Win Day", value: "Daily P&L > $0", color: "text-emerald-400" },
                { label: "Loss Day", value: "Daily P&L < $0", color: "text-red-400" }
              ],
              tip: "Tracks momentum - a 5W streak means 5 profitable days in a row."
            }} />
          </div>
          <div className="flex items-center gap-2">
            {tradingStats.currentStreakType === "win" ? (
              <Flame className="w-5 h-5 text-orange-400" />
            ) : tradingStats.currentStreakType === "loss" ? (
              <Snowflake className="w-5 h-5 text-blue-400" />
            ) : (
              <Activity className="w-5 h-5 text-muted" />
            )}
            <span className={`text-xl font-bold ${
              tradingStats.currentStreakType === "win" ? "text-emerald-400" :
              tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted"
            }`}>
              {tradingStats.currentStreak}{tradingStats.currentStreakType === "win" ? "W" : tradingStats.currentStreakType === "loss" ? "L" : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve - Takes 2 columns */}
        <div className="lg:col-span-2 glass rounded-xl border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent-light" />
              Equity Curve
              <InfoTip content={{
                title: "Equity Curve Chart",
                description: "Visual representation of your cumulative P&L over time.",
                details: [
                  { label: "Green line", value: "Your equity growth", color: "text-emerald-400" },
                  { label: "Red area", value: "Drawdown periods", color: "text-red-400" }
                ],
                tip: "A smooth upward curve indicates consistent, disciplined trading."
              }} />
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-emerald-500 rounded"></div>
                <span className="text-muted">Equity</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-red-500/50 rounded"></div>
                <span className="text-muted">Drawdown</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-64 relative">
            {tradingStats.equityCurve.length > 0 && (() => {
              const data = tradingStats.equityCurve;
              const values = data.map(d => d.cumulative);
              const min = Math.min(...values, 0);
              const max = Math.max(...values);
              const range = max - min || 1;

              return (
                <svg className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="currentColor" strokeOpacity="0.1" />
                  ))}

                  {/* Zero line */}
                  {min < 0 && max > 0 && (
                    <line
                      x1="0"
                      y1={`${((max - 0) / range) * 100}%`}
                      x2="100%"
                      y2={`${((max - 0) / range) * 100}%`}
                      stroke="currentColor"
                      strokeOpacity="0.3"
                      strokeDasharray="4"
                    />
                  )}

                  {/* Drawdown area */}
                  <path
                    d={`M 0 ${((max - data[0].cumulative) / range) * 100} ${data.map((d, i) => {
                      const x = (i / (data.length - 1)) * 100;
                      const y = ((max - d.cumulative + d.drawdown) / range) * 100;
                      return `L ${x} ${y}`;
                    }).join(" ")} L 100 ${((max - data[data.length - 1].cumulative) / range) * 100} ${data.map((d, i) => {
                      const x = ((data.length - 1 - i) / (data.length - 1)) * 100;
                      const y = ((max - data[data.length - 1 - i].cumulative) / range) * 100;
                      return `L ${x} ${y}`;
                    }).join(" ")} Z`}
                    fill="rgba(239, 68, 68, 0.15)"
                  />

                  {/* Equity line */}
                  <path
                    d={`M 0 ${((max - data[0].cumulative) / range) * 100} ${data.map((d, i) => {
                      const x = (i / (data.length - 1)) * 100;
                      const y = ((max - d.cumulative) / range) * 100;
                      return `L ${x} ${y}`;
                    }).join(" ")}`}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2"
                  />
                </svg>
              );
            })()}

            {/* Y-axis labels */}
            <div className="absolute right-0 top-0 bottom-0 w-16 flex flex-col justify-between text-[10px] text-muted py-1">
              <span>${Math.max(...tradingStats.equityCurve.map(d => d.cumulative)).toFixed(0)}</span>
              <span>$0</span>
              <span>${Math.min(...tradingStats.equityCurve.map(d => d.cumulative), 0).toFixed(0)}</span>
            </div>
          </div>

          {/* Drawdown Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider flex items-center">
                Max Drawdown
                <InfoTip content={{
                  title: "Maximum Drawdown",
                  description: "The largest peak-to-trough decline in your equity - your worst losing streak from a high point.",
                  details: [
                    { label: "Pro target", value: "< 20%", color: "text-emerald-400" },
                    { label: "Warning zone", value: "> 30%", color: "text-yellow-400" },
                    { label: "Danger zone", value: "> 50%", color: "text-red-400" }
                  ],
                  tip: "Lower is better - this measures your worst-case loss scenario."
                }} />
              </div>
              <div className="text-lg font-bold text-red-400">
                -${tradingStats.maxDrawdown.toFixed(0)} <span className="text-sm">({tradingStats.maxDrawdownPercent.toFixed(1)}%)</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider flex items-center">
                Current Drawdown
                <InfoTip content={{
                  title: "Current Drawdown",
                  description: "How far below your peak equity you currently are.",
                  details: [
                    { label: "At Peak", value: "No drawdown", color: "text-emerald-400" },
                    { label: "In Drawdown", value: "Below your high", color: "text-red-400" }
                  ],
                  tip: "Shows how much you need to recover to reach a new all-time high."
                }} />
              </div>
              <div className={`text-lg font-bold ${tradingStats.currentDrawdown > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {tradingStats.currentDrawdown > 0 ? `-$${tradingStats.currentDrawdown.toFixed(0)}` : "At Peak"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider flex items-center">
                Peak Equity
                <InfoTip content={{
                  title: "Peak Equity (High Water Mark)",
                  description: "The highest cumulative P&L you've ever reached - your all-time high.",
                  tip: "New profits push this higher. Losses create drawdown measured from this level."
                }} />
              </div>
              <div className="text-lg font-bold text-emerald-400">${tradingStats.peak.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Right Column - Streak & YoY */}
        <div className="space-y-6">
          {/* Streak Tracker */}
          <div className="glass rounded-xl border border-border/50 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-400" />
              Streak Tracker
              <InfoTip content={{
                title: "Streak Tracker",
                description: "Tracks consecutive winning or losing days (not individual trades).",
                details: [
                  { label: "Win day", value: "Total P&L > $0", color: "text-emerald-400" },
                  { label: "Loss day", value: "Total P&L < $0", color: "text-red-400" }
                ],
                tip: "Helps identify momentum and patterns in your trading performance."
              }} />
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center justify-center">
                  Current
                  <InfoTip content={{
                    title: "Current Streak",
                    description: "Your active streak right now - consecutive days profitable or unprofitable leading up to today.",
                    tip: "A positive streak indicates momentum in your favor."
                  }} />
                </div>
                <div className={`text-2xl font-bold ${
                  tradingStats.currentStreakType === "win" ? "text-emerald-400" :
                  tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted"
                }`}>
                  {tradingStats.currentStreak}
                </div>
                <div className="text-[10px] text-muted">
                  {tradingStats.currentStreakType === "win" ? "Wins" : tradingStats.currentStreakType === "loss" ? "Losses" : "N/A"}
                </div>
              </div>

              <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-center">
                  Best
                  <InfoTip content={{
                    title: "Best Win Streak",
                    description: "Your longest winning streak ever - most consecutive profitable trading days.",
                    tip: "Higher is better. Aim to beat this record!"
                  }} />
                </div>
                <div className="text-2xl font-bold text-emerald-400">{tradingStats.longestWinStreak}</div>
                <div className="text-[10px] text-emerald-400/70">Win Streak</div>
              </div>

              <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1 flex items-center justify-center">
                  Worst
                  <InfoTip content={{
                    title: "Worst Loss Streak",
                    description: "Your longest losing streak - most consecutive unprofitable trading days.",
                    tip: "Lower is better. Use this to prepare for worst-case scenarios."
                  }} />
                </div>
                <div className="text-2xl font-bold text-red-400">{tradingStats.longestLossStreak}</div>
                <div className="text-[10px] text-red-400/70">Loss Streak</div>
              </div>
            </div>
          </div>

          {/* YoY Comparison */}
          <div className="glass rounded-xl border border-border/50 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-accent-light" />
              Year over Year
              <InfoTip content={{
                title: "Year-over-Year Comparison",
                description: "Compare your performance between this year and last year.",
                details: [
                  { label: "Shows", value: "P&L & trade count" },
                  { label: "Comparison", value: "% change YoY" }
                ],
                tip: "Track long-term improvement by comparing annual performance."
              }} />
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <div className="text-sm font-medium">{tradingStats.currentYear}</div>
                  <div className="text-[10px] text-muted">{tradingStats.ytdTrades} trades</div>
                </div>
                <div className={`text-lg font-bold ${tradingStats.ytdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {tradingStats.ytdPnl >= 0 ? "+" : ""}${tradingStats.ytdPnl.toFixed(0)}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <div className="text-sm font-medium">{tradingStats.lastYear}</div>
                  <div className="text-[10px] text-muted">{tradingStats.lastYearTrades} trades</div>
                </div>
                <div className={`text-lg font-bold ${tradingStats.lastYearPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {tradingStats.lastYearPnl >= 0 ? "+" : ""}${tradingStats.lastYearPnl.toFixed(0)}
                </div>
              </div>

              {/* Change */}
              {tradingStats.lastYearPnl !== 0 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {tradingStats.ytdPnl >= tradingStats.lastYearPnl ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm font-medium ${tradingStats.ytdPnl >= tradingStats.lastYearPnl ? "text-emerald-400" : "text-red-400"}`}>
                    {tradingStats.lastYearPnl !== 0
                      ? `${(((tradingStats.ytdPnl - tradingStats.lastYearPnl) / Math.abs(tradingStats.lastYearPnl)) * 100).toFixed(0)}% vs last year`
                      : "No data last year"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consistency Score Breakdown */}
      <div className="glass rounded-xl border border-border/50 p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-yellow-400" />
          Consistency Score Breakdown
          <InfoTip content={{
            title: "Consistency Score Breakdown",
            description: "Your total score (0-100) is calculated from 4 equally-weighted factors.",
            details: [
              { label: "75+ score", value: "Good", color: "text-emerald-400" },
              { label: "50-74 score", value: "Average", color: "text-yellow-400" },
              { label: "< 50 score", value: "Needs work", color: "text-red-400" }
            ],
            tip: "Focus on improving your weakest factor first."
          }} />
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted flex items-center">
                Win Rate
                <InfoTip content={{
                  title: "Win Rate Score",
                  description: "Points based on your percentage of winning trades.",
                  details: [
                    { label: "Max points", value: "25 (at 60%+ WR)" },
                    { label: "Example", value: "45% WR = 18.75 pts" }
                  ],
                  formula: "(Win Rate ÷ 60%) × 25, max 25"
                }} />
              </span>
              <span className="text-sm font-bold">{tradingStats.winRateScore.toFixed(0)}/25</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(tradingStats.winRateScore / 25) * 100}%` }} />
            </div>
            <div className="text-[10px] text-muted mt-1">{tradingStats.winRate.toFixed(0)}% win rate</div>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted flex items-center">
                Profit Factor
                <InfoTip content={{
                  title: "Profit Factor Score",
                  description: "Points based on gross profit ÷ gross loss ratio.",
                  details: [
                    { label: "Max points", value: "25 (at 2.0+ PF)" },
                    { label: "Breakeven", value: "PF = 1.0" },
                    { label: "Example", value: "1.5 PF = 18.75 pts" }
                  ],
                  formula: "(Profit Factor ÷ 2) × 25, max 25"
                }} />
              </span>
              <span className="text-sm font-bold">{tradingStats.profitFactorScore.toFixed(0)}/25</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(tradingStats.profitFactorScore / 25) * 100}%` }} />
            </div>
            <div className="text-[10px] text-muted mt-1">{tradingStats.profitFactor.toFixed(2)} PF</div>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted flex items-center">
                Drawdown
                <InfoTip content={{
                  title: "Drawdown Control Score",
                  description: "Points based on how well you control losses. You START with 25 and LOSE points for high drawdown.",
                  details: [
                    { label: "0% DD", value: "25 pts (perfect)", color: "text-emerald-400" },
                    { label: "50% DD", value: "12.5 pts" },
                    { label: "100% DD", value: "0 pts", color: "text-red-400" }
                  ],
                  formula: "25 − (Max DD% ÷ 4)"
                }} />
              </span>
              <span className="text-sm font-bold">{tradingStats.drawdownScore.toFixed(0)}/25</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(tradingStats.drawdownScore / 25) * 100}%` }} />
            </div>
            <div className="text-[10px] text-muted mt-1">{tradingStats.maxDrawdownPercent.toFixed(1)}% max DD</div>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted flex items-center">
                Win Streaks
                <InfoTip content={{
                  title: "Win Streak Score",
                  description: "Points based on your longest winning streak (consecutive profitable days).",
                  details: [
                    { label: "Max points", value: "25 (at 10+ days)" },
                    { label: "Example", value: "5 day streak = 12.5 pts" }
                  ],
                  formula: "(Best Streak ÷ 10) × 25, max 25"
                }} />
              </span>
              <span className="text-sm font-bold">{tradingStats.streakScore.toFixed(0)}/25</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(tradingStats.streakScore / 25) * 100}%` }} />
            </div>
            <div className="text-[10px] text-muted mt-1">{tradingStats.longestWinStreak} best streak</div>
          </div>
        </div>
      </div>

      {/* Trade History Table */}
      <div className="glass rounded-xl border border-border/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-light" />
            Recent Trades
            <InfoTip content={{
              title: "Recent Trades",
              description: "Your last 20 trades sorted by date.",
              details: [
                { label: "LONG", value: "Bought (bullish)", color: "text-emerald-400" },
                { label: "SHORT", value: "Sold (bearish)", color: "text-red-400" }
              ],
              tip: "Add new trades in the Economic Calendar page."
            }} />
          </h3>
          <span className="text-xs text-muted">{tradingStats.sortedTrades.length} total trades</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs text-muted font-medium">Date</th>
                <th className="text-left py-2 px-3 text-xs text-muted font-medium">Time</th>
                <th className="text-left py-2 px-3 text-xs text-muted font-medium">Ticker</th>
                <th className="text-left py-2 px-3 text-xs text-muted font-medium">Direction</th>
                <th className="text-right py-2 px-3 text-xs text-muted font-medium">P&L</th>
              </tr>
            </thead>
            <tbody>
              {tradingStats.sortedTrades.slice(-20).reverse().map((trade) => (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="py-2 px-3">{trade.date}</td>
                  <td className="py-2 px-3 text-muted">{trade.time || "-"}</td>
                  <td className="py-2 px-3 font-medium">{trade.ticker}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className={`py-2 px-3 text-right font-medium ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goal Settings Modal */}
      {showGoalSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGoalSettings(false)}>
          <div className="w-full max-w-md glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-accent-light" />
                Set Trading Goals
              </h3>
              <button onClick={() => setShowGoalSettings(false)} className="p-1.5 rounded-lg hover:bg-card-hover transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Yearly P&L Goal</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="number"
                    value={goalInput.yearly}
                    onChange={(e) => setGoalInput({ ...goalInput, yearly: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Monthly P&L Goal</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="number"
                    value={goalInput.monthly}
                    onChange={(e) => setGoalInput({ ...goalInput, monthly: e.target.value })}
                    placeholder="e.g. 5000"
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>

              <button
                onClick={saveGoals}
                className="w-full py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
