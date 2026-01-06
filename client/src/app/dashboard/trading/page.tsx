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
  Tag as TagIcon,
} from "lucide-react";
import { useTradeJournal } from "@/hooks/useTradeJournal";
import { Trade } from "@/components/TradeJournal/types";
import {
  Tooltip,
  InfoTip,
  TooltipContent,
  CircularProgress,
  EquityCurveChart,
  EquityDataPoint,
  EventCorrelation,
  TagPill,
} from "@/components/Trading";
import { useDemoMode } from "@/context/DemoModeContext";
import { useTagSettings, TAG_COLORS } from "@/context/TagContext";

// Asset types for filtering
const ASSET_TYPES = [
  { value: "STOCK", label: "Stocks", color: "blue" },
  { value: "OPTIONS", label: "Options", color: "purple" },
  { value: "FUTURES", label: "Futures", color: "amber" },
  { value: "CRYPTO", label: "Crypto", color: "cyan" },
  { value: "FOREX", label: "Forex", color: "emerald" },
] as const;

// Goal settings interface
interface TradingGoals {
  yearlyPnlGoal: number;
  monthlyPnlGoal: number;
  startingEquity: number;
}

// Compact Stat Component for summary bar
const CompactStat = ({ label, value, count }: { label: string; value: number; count?: number }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-muted">{label}</span>
    <span className={`font-bold ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
      {value >= 0 ? "+" : ""}${value.toFixed(0)}
    </span>
    {count !== undefined && <span className="text-[10px] text-muted">({count})</span>}
  </div>
);

export default function TradingPage() {
  const { trades: realTrades, tags: realTags, loading, closeTrade } = useTradeJournal();
  const { isDemoMode, demoTrades, demoSettings } = useDemoMode();
  const { tagSettings, getTagColor, getTagById, getAllTags } = useTagSettings();

  // Use demo trades when in demo mode, otherwise use real trades
  const trades = useMemo(() => {
    if (isDemoMode) {
      return demoTrades as unknown as Trade[];
    }
    return realTrades;
  }, [isDemoMode, demoTrades, realTrades]);

  // Get unique tags from current trades
  const tags = useMemo(() => {
    if (isDemoMode) {
      const allTags = new Set<string>();
      demoTrades.forEach(t => t.tags.forEach(tag => allTags.add(tag)));
      return Array.from(allTags);
    }
    return realTags;
  }, [isDemoMode, demoTrades, realTags]);

  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [goals, setGoals] = useState<TradingGoals>({ yearlyPnlGoal: 0, monthlyPnlGoal: 0, startingEquity: 0 });
  const [goalInput, setGoalInput] = useState({ yearly: "", monthly: "", startingEquity: "" });
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showRecentTrades, setShowRecentTrades] = useState(false);
  const [showOpenTrades, setShowOpenTrades] = useState(true);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [closeTradeForm, setCloseTradeForm] = useState({ exitPrice: "", pnl: "", closeDate: "" });
  const [showCloseDatePicker, setShowCloseDatePicker] = useState(false);
  const [closeDateMonth, setCloseDateMonth] = useState("");
  const [closeDateDay, setCloseDateDay] = useState("");
  const [closeDateYear, setCloseDateYear] = useState("");
  const closeDatePickerRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  // Equity curve filters
  const [equityPeriod, setEquityPeriod] = useState<"all" | "ytd" | "mtd" | "wtd" | "daily" | "custom">("all");
  const [equityTagFilter, setEquityTagFilter] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [equityAssetFilter, setEquityAssetFilter] = useState<string[]>([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  // Initialize date range with today and one month ago
  const [customFilter, setCustomFilter] = useState<{
    type: "dateRange" | "daysBack" | "tradesBack";
    dateRange: { start: string; end: string };
    daysBack: number;
    tradesBack: number;
  }>(() => {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    return {
      type: "dateRange",
      dateRange: { start: formatDate(monthAgo), end: formatDate(today) },
      daysBack: 30,
      tradesBack: 50
    };
  });
  const [showCustomMenu, setShowCustomMenu] = useState(false);
  const customMenuRef = useRef<HTMLDivElement>(null);
  // Date range picker state (MM/DD/YYYY format)
  const [startDateInputs, setStartDateInputs] = useState(() => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return {
      month: String(monthAgo.getMonth() + 1),
      day: String(monthAgo.getDate()),
      year: String(monthAgo.getFullYear())
    };
  });
  const [endDateInputs, setEndDateInputs] = useState(() => {
    const today = new Date();
    return {
      month: String(today.getMonth() + 1),
      day: String(today.getDate()),
      year: String(today.getFullYear())
    };
  });

  // Day trades modal
  const [selectedDayTrades, setSelectedDayTrades] = useState<{ date: string; trades: Trade[] } | null>(null);

  // Filter trades: open vs closed
  const openTrades = useMemo(() => trades.filter(t => t.status === "OPEN"), [trades]);
  const closedTrades = useMemo(() => trades.filter(t => t.status !== "OPEN"), [trades]);

  // Use demo starting equity when in demo mode, otherwise use tagSettings startingEquity
  const effectiveStartingEquity = isDemoMode ? demoSettings.startingEquity : tagSettings.startingEquity;

  // Convert equityTagFilter and equityAssetFilter to TagPill[] for display in equity curve
  const selectedTagPills = useMemo((): TagPill[] => {
    const tagPills = equityTagFilter.map(tagName => {
      const tagInfo = getTagById(tagName);
      const colors = tagInfo ? TAG_COLORS[tagInfo.section.color] || TAG_COLORS.blue : TAG_COLORS.blue;
      return {
        id: `tag-${tagName}`,
        name: tagInfo?.tag.name || tagName,
        color: {
          bg: colors.bg,
          text: colors.text,
          border: colors.border
        }
      };
    });

    const assetPills = equityAssetFilter.map(assetType => {
      const asset = ASSET_TYPES.find(a => a.value === assetType);
      const colors = TAG_COLORS[asset?.color || "blue"];
      return {
        id: `asset-${assetType}`,
        name: asset?.label || assetType,
        color: {
          bg: colors.bg,
          text: colors.text,
          border: colors.border
        }
      };
    });

    return [...assetPills, ...tagPills];
  }, [equityTagFilter, equityAssetFilter, getTagById]);

  // Load goals from localStorage
  useEffect(() => {
    const savedGoals = localStorage.getItem("tradingGoals");
    if (savedGoals) {
      const parsed = JSON.parse(savedGoals);
      setGoals({ ...parsed, startingEquity: parsed.startingEquity || 0 });
      setGoalInput({
        yearly: parsed.yearlyPnlGoal > 0 ? parsed.yearlyPnlGoal.toString() : "",
        monthly: parsed.monthlyPnlGoal > 0 ? parsed.monthlyPnlGoal.toString() : "",
        startingEquity: parsed.startingEquity > 0 ? parsed.startingEquity.toString() : "",
      });
    }
  }, []);

  // Save goals
  const saveGoals = () => {
    const newGoals = {
      yearlyPnlGoal: parseFloat(goalInput.yearly) || 0,
      monthlyPnlGoal: parseFloat(goalInput.monthly) || 0,
      startingEquity: parseFloat(goalInput.startingEquity) || 0,
    };
    setGoals(newGoals);
    localStorage.setItem("tradingGoals", JSON.stringify(newGoals));
    setShowGoalSettings(false);
  };

  // Close date picker click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (closeDatePickerRef.current && !closeDatePickerRef.current.contains(e.target as Node)) {
        setShowCloseDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close custom menu click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customMenuRef.current && !customMenuRef.current.contains(e.target as Node)) {
        setShowCustomMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close tag dropdown click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close asset dropdown click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target as Node)) {
        setShowAssetDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update close date from picker inputs
  const updateCloseDate = (month: string, day: string, year: string) => {
    setCloseDateMonth(month);
    setCloseDateDay(day);
    setCloseDateYear(year);
    if (month && day && year && month.length <= 2 && day.length <= 2 && year.length === 4) {
      const m = month.padStart(2, "0");
      const d = day.padStart(2, "0");
      setCloseTradeForm(prev => ({ ...prev, closeDate: `${year}-${m}-${d}` }));
    }
  };

  // Format close date for display
  const formatCloseDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${m}/${d}/${y}`;
  };

  // Update custom filter start date from picker inputs
  const updateStartDate = (month: string, day: string, year: string) => {
    setStartDateInputs({ month, day, year });
    if (month && day && year && month.length <= 2 && day.length <= 2 && year.length === 4) {
      const m = month.padStart(2, "0");
      const d = day.padStart(2, "0");
      setCustomFilter(prev => ({
        ...prev,
        dateRange: { ...prev.dateRange, start: `${year}-${m}-${d}` }
      }));
    }
  };

  // Update custom filter end date from picker inputs
  const updateEndDate = (month: string, day: string, year: string) => {
    setEndDateInputs({ month, day, year });
    if (month && day && year && month.length <= 2 && day.length <= 2 && year.length === 4) {
      const m = month.padStart(2, "0");
      const d = day.padStart(2, "0");
      setCustomFilter(prev => ({
        ...prev,
        dateRange: { ...prev.dateRange, end: `${year}-${m}-${d}` }
      }));
    }
  };

  // Calculate all trading statistics (only from CLOSED trades)
  const tradingStats = useMemo(() => {
    if (!closedTrades.length) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastYear = currentYear - 1;

    // Sort trades by date
    const sortedTrades = [...closedTrades].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return 0;
    });

    // All-time stats
    const allTimePnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const allTimeTrades = closedTrades.length;

    // YTD stats
    const ytdTrades = closedTrades.filter((t) => {
      const [y] = t.date.split("-").map(Number);
      return y === currentYear;
    });
    const ytdPnl = ytdTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Last year stats (for YoY comparison)
    const lastYearTrades = closedTrades.filter((t) => {
      const [y] = t.date.split("-").map(Number);
      return y === lastYear;
    });
    const lastYearPnl = lastYearTrades.reduce((sum, t) => sum + t.pnl, 0);

    // MTD stats
    const mtdTrades = closedTrades.filter((t) => {
      const [y, m] = t.date.split("-").map(Number);
      return y === currentYear && m === currentMonth + 1;
    });
    const mtdPnl = mtdTrades.reduce((sum, t) => sum + t.pnl, 0);

    // WTD stats (Sunday to Saturday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const wtdTrades = closedTrades.filter((t) => {
      const [y, m, d] = t.date.split("-").map(Number);
      const tradeDate = new Date(y, m - 1, d);
      return tradeDate >= startOfWeek;
    });
    const wtdPnl = wtdTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Calculate streaks
    const tradesByDate: Record<string, { pnl: number; tradeCount: number; winCount: number; lossCount: number }> = {};
    closedTrades.forEach((t) => {
      if (!tradesByDate[t.date]) {
        tradesByDate[t.date] = { pnl: 0, tradeCount: 0, winCount: 0, lossCount: 0 };
      }
      tradesByDate[t.date].pnl += t.pnl;
      tradesByDate[t.date].tradeCount += 1;
      if (t.pnl > 0) tradesByDate[t.date].winCount += 1;
      else if (t.pnl < 0) tradesByDate[t.date].lossCount += 1;
    });

    const sortedDates = Object.keys(tradesByDate).sort();
    let currentStreak = 0;
    let currentStreakType: "win" | "loss" | null = null;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    sortedDates.forEach((date) => {
      const dailyPnl = tradesByDate[date].pnl;
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
      const dailyPnl = tradesByDate[sortedDates[i]].pnl;
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

    // Calculate equity curve with drawdown (using starting equity as base)
    const startingEquity = effectiveStartingEquity || 0;
    let runningEquity = startingEquity;
    let peak = startingEquity;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let currentDrawdown = 0;
    let drawdownStart: string | null = null;
    let maxDrawdownStart: string | null = null;
    let maxDrawdownEnd: string | null = null;
    let inDrawdown = false;

    const equityCurve: { date: string; pnl: number; cumulative: number; drawdown: number; drawdownPercent: number; tradeCount: number; winCount: number; lossCount: number }[] = [];

    sortedDates.forEach((date) => {
      const sessionData = tradesByDate[date];
      runningEquity += sessionData.pnl;

      if (runningEquity > peak) {
        peak = runningEquity;
        inDrawdown = false;
        drawdownStart = null;
      }

      currentDrawdown = peak - runningEquity;
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
        pnl: sessionData.pnl,
        cumulative: runningEquity,
        drawdown: currentDrawdown,
        drawdownPercent,
        tradeCount: sessionData.tradeCount,
        winCount: sessionData.winCount,
        lossCount: sessionData.lossCount,
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

    // Expectancy: (Win% × AvgWin) - (Loss% × AvgLoss)
    const winRateDecimal = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const lossRateDecimal = trades.length > 0 ? losingTrades.length / trades.length : 0;
    const expectancy = (winRateDecimal * avgWin) - (lossRateDecimal * avgLoss);

    // Recovery Factor: Total P&L / Max Drawdown
    const recoveryFactor = maxDrawdown > 0 ? allTimePnl / maxDrawdown : allTimePnl > 0 ? 10 : 0;

    // Calculate daily returns for Sharpe ratio
    const dailyReturns = equityCurve.map(d => d.pnl);
    const avgDailyReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
      : 0;
    const variance = dailyReturns.length > 1
      ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / (dailyReturns.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0;

    // Win days vs loss days
    const winDays = equityCurve.filter(d => d.pnl > 0).length;
    const lossDays = equityCurve.filter(d => d.pnl < 0).length;

    // Risk/Reward ratio (avg win / avg loss)
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 10 : 0;

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
      // Advanced metrics
      expectancy,
      recoveryFactor,
      sharpeRatio,
      winDays,
      lossDays,
      riskRewardRatio,
      // YoY data
      monthlyByYear,
      currentYear,
      lastYear,
      // Sorted trades for table
      sortedTrades,
    };
  }, [trades, effectiveStartingEquity]);

  // Goal progress calculations
  const goalProgress = useMemo(() => {
    if (!tradingStats) return null;

    const TRADING_DAYS_PER_YEAR = 252;

    // Daily target based on yearly goal
    const dailyTarget = goals.yearlyPnlGoal > 0
      ? goals.yearlyPnlGoal / TRADING_DAYS_PER_YEAR
      : 0;

    // Today's P&L
    const today = new Date().toISOString().split('T')[0];
    const todayPnl = tradingStats.equityCurve.find(d => d.date === today)?.pnl || 0;
    const todayVsTarget = dailyTarget > 0 ? (todayPnl / dailyTarget) * 100 : 0;

    const yearlyProgress = goals.yearlyPnlGoal > 0
      ? (tradingStats.ytdPnl / goals.yearlyPnlGoal) * 100
      : 0;
    const monthlyProgress = goals.monthlyPnlGoal > 0
      ? (tradingStats.mtdPnl / goals.monthlyPnlGoal) * 100
      : 0;

    // Project end of year based on trading days
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    // Approximate trading days elapsed (252/365 ratio)
    const tradingDaysElapsed = Math.floor(dayOfYear * (TRADING_DAYS_PER_YEAR / 365));
    const projectedYearEnd = tradingDaysElapsed > 0
      ? (tradingStats.ytdPnl / tradingDaysElapsed) * TRADING_DAYS_PER_YEAR
      : 0;

    // Calculate monthly breakdown for the year
    const monthlyPnl: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthPnl = tradingStats.equityCurve
        .filter(d => {
          const [year, month] = d.date.split('-').map(Number);
          return year === tradingStats.currentYear && month === m;
        })
        .reduce((sum, d) => sum + d.pnl, 0);
      monthlyPnl.push(monthPnl);
    }

    return {
      yearlyProgress: Math.min(yearlyProgress, 100),
      monthlyProgress: Math.min(monthlyProgress, 100),
      projectedYearEnd,
      onTrack: projectedYearEnd >= goals.yearlyPnlGoal,
      dailyTarget,
      todayPnl,
      todayVsTarget,
      monthlyPnl,
      tradingDaysElapsed,
      tradingDaysRemaining: TRADING_DAYS_PER_YEAR - tradingDaysElapsed,
    };
  }, [tradingStats, goals]);

  // Filtered equity curve based on period and tags
  const filteredEquityCurve = useMemo(() => {
    if (!tradingStats) return { data: [], dateRange: null, period: equityPeriod, tradeCount: 0, startingEquity: effectiveStartingEquity || 0 };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const today = now.toISOString().split("T")[0];

    // First filter by asset class if any selected (OR logic - trade can be any of the selected asset types)
    let filteredTrades = closedTrades;
    if (equityAssetFilter.length > 0) {
      filteredTrades = filteredTrades.filter(trade =>
        equityAssetFilter.includes((trade as any).assetType || "STOCK")
      );
    }

    // Then filter by tags if any selected (AND logic - trade must have ALL selected tags)
    if (equityTagFilter.length > 0) {
      filteredTrades = filteredTrades.filter(trade =>
        equityTagFilter.every(filterTag => trade.tags.includes(filterTag))
      );
    }

    // Determine date range based on period
    let dateRange: { start: string; end: string } | null = null;

    // Filter by time period
    // Use closeDate for closed trades (swing trades), otherwise use date
    if (equityPeriod !== "all") {
      filteredTrades = filteredTrades.filter(trade => {
        // For closed trades, use closeDate if available, otherwise use date
        const effectiveDate = trade.closeDate || trade.date;
        const [y, m, d] = effectiveDate.split("-").map(Number);
        const tradeDate = new Date(y, m - 1, d);

        switch (equityPeriod) {
          case "ytd":
            return y === currentYear;
          case "mtd":
            return y === currentYear && m === currentMonth + 1;
          case "wtd":
            return tradeDate >= startOfWeek;
          case "daily":
            return effectiveDate === today;
          case "custom": {
            if (customFilter.type === "dateRange") {
              if (customFilter.dateRange.start && customFilter.dateRange.end) {
                const [sy, sm, sd] = customFilter.dateRange.start.split("-").map(Number);
                const [ey, em, ed] = customFilter.dateRange.end.split("-").map(Number);
                const startDate = new Date(sy, sm - 1, sd);
                const endDate = new Date(ey, em - 1, ed);
                endDate.setHours(23, 59, 59, 999);
                return tradeDate >= startDate && tradeDate <= endDate;
              }
              return true;
            } else if (customFilter.type === "daysBack") {
              // If daysBack is 0 (empty input), show no trades
              if (customFilter.daysBack === 0) return false;
              const daysAgo = new Date(now);
              daysAgo.setDate(now.getDate() - customFilter.daysBack);
              daysAgo.setHours(0, 0, 0, 0);
              return tradeDate >= daysAgo;
            }
            // tradesBack is handled after sorting
            return true;
          }
          default:
            return true;
        }
      });
    }

    // Handle tradesBack filter - takes the most recent N trades
    if (equityPeriod === "custom" && customFilter.type === "tradesBack") {
      // If tradesBack is 0 (empty input), show no trades
      if (customFilter.tradesBack === 0) {
        filteredTrades = [];
      } else {
        // Sort by date descending, take N trades, then re-sort by date ascending
        filteredTrades = [...filteredTrades]
          .sort((a, b) => {
            const dateA = a.closeDate || a.date;
            const dateB = b.closeDate || b.date;
            return dateB.localeCompare(dateA);
          })
          .slice(0, customFilter.tradesBack)
          .sort((a, b) => {
            const dateA = a.closeDate || a.date;
            const dateB = b.closeDate || b.date;
            return dateA.localeCompare(dateB);
          });
      }
    }

    if (equityPeriod !== "all") {
      // Set date range for calendar-based periods
      switch (equityPeriod) {
        case "ytd": {
          const startOfYear = new Date(currentYear, 0, 1);
          // Add one day after today so the last trade is visible on the grid
          const [ty, tm, td] = today.split("-").map(Number);
          const dayAfterToday = new Date(ty, tm - 1, td);
          dayAfterToday.setDate(dayAfterToday.getDate() + 1);
          dateRange = {
            start: startOfYear.toISOString().split("T")[0],
            end: dayAfterToday.toISOString().split("T")[0]
          };
          break;
        }
        case "mtd": {
          const startOfMonth = new Date(currentYear, currentMonth, 1);
          // Add one day after today so the last trade is visible on the grid
          const [ty, tm, td] = today.split("-").map(Number);
          const dayAfterToday = new Date(ty, tm - 1, td);
          dayAfterToday.setDate(dayAfterToday.getDate() + 1);
          dateRange = {
            start: startOfMonth.toISOString().split("T")[0],
            end: dayAfterToday.toISOString().split("T")[0]
          };
          break;
        }
        case "wtd": {
          // WTD shows full week Sunday to Saturday
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7); // Day after Saturday
          dateRange = {
            start: startOfWeek.toISOString().split("T")[0],
            end: endOfWeek.toISOString().split("T")[0]
          };
          break;
        }
      }
    }

    // For "all" period, set range from day before first trade to day after last trade
    if (equityPeriod === "all" && filteredTrades.length > 0) {
      const sortedByDate = [...filteredTrades].sort((a, b) => a.date.localeCompare(b.date));
      const firstTradeDate = sortedByDate[0].date;
      const lastTradeDate = sortedByDate[sortedByDate.length - 1].date;

      // Get day before first trade
      const [fy, fm, fd] = firstTradeDate.split("-").map(Number);
      const dayBeforeFirst = new Date(fy, fm - 1, fd);
      dayBeforeFirst.setDate(dayBeforeFirst.getDate() - 1);

      // Get day after last trade so it's visible on the grid
      const [ly, lm, ld] = lastTradeDate.split("-").map(Number);
      const dayAfterLast = new Date(ly, lm - 1, ld);
      dayAfterLast.setDate(dayAfterLast.getDate() + 1);

      dateRange = {
        start: dayBeforeFirst.toISOString().split("T")[0],
        end: dayAfterLast.toISOString().split("T")[0]
      };
    }

    // Build equity curve from filtered trades
    // Sort by effective date (closeDate for swing trades, otherwise date)
    const sortedTrades = [...filteredTrades].sort((a, b) => {
      const dateA = a.closeDate || a.date;
      const dateB = b.closeDate || b.date;
      return dateA.localeCompare(dateB);
    });

    // Helper to get the start of week (Sunday) for a given date
    const getWeekStart = (dateStr: string): string => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const dayOfWeek = date.getDay(); // 0 = Sunday
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - dayOfWeek);
      return weekStart.toISOString().split("T")[0];
    };

    // Helper to get end of week (Saturday) from week start
    const getWeekEnd = (weekStartStr: string): string => {
      const [y, m, d] = weekStartStr.split("-").map(Number);
      const weekStart = new Date(y, m - 1, d);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return weekEnd.toISOString().split("T")[0];
    };

    const curve: EquityDataPoint[] = [];
    const baseStartingEquity = effectiveStartingEquity || 0;

    // Calculate the equity at the START of the selected period
    // by adding all PnL from trades BEFORE the period begins
    let periodStartEquity = baseStartingEquity;

    if (equityPeriod !== "all") {
      // Get all closed trades (unfiltered by tags for accurate equity calculation)
      const allClosedTrades = closedTrades;

      // Sum up PnL from all trades that occurred BEFORE the current period
      allClosedTrades.forEach(trade => {
        const effectiveDate = trade.closeDate || trade.date;
        const [y, m, d] = effectiveDate.split("-").map(Number);
        const tradeDate = new Date(y, m - 1, d);

        let isBeforePeriod = false;

        switch (equityPeriod) {
          case "ytd":
            // Trades from previous years
            isBeforePeriod = y < currentYear;
            break;
          case "mtd":
            // Trades from previous months (or previous years)
            isBeforePeriod = y < currentYear || (y === currentYear && m < currentMonth + 1);
            break;
          case "wtd":
            // Trades before this week started
            isBeforePeriod = tradeDate < startOfWeek;
            break;
          case "daily":
            // Trades before today
            isBeforePeriod = effectiveDate < today;
            break;
          case "custom":
            // For custom filters, determine what's "before" based on filter type
            if (customFilter.type === "dateRange") {
              isBeforePeriod = effectiveDate < customFilter.dateRange.start;
            } else if (customFilter.type === "daysBack") {
              const daysAgo = new Date(now);
              daysAgo.setDate(now.getDate() - customFilter.daysBack);
              daysAgo.setHours(0, 0, 0, 0);
              isBeforePeriod = tradeDate < daysAgo;
            } else if (customFilter.type === "tradesBack") {
              // For tradesBack, check if this trade is NOT in the filtered set
              isBeforePeriod = !filteredTrades.some(ft => ft.id === trade.id);
            }
            break;
        }

        if (isBeforePeriod) {
          periodStartEquity += trade.pnl;
        }
      });
    }

    const startingEquity = periodStartEquity;
    let cumulative = startingEquity;
    let peak = startingEquity;

    // For WTD, show each individual trade; for YTD aggregate by week; otherwise aggregate by day
    if (equityPeriod === "wtd") {
      // Show each individual trade for WTD
      sortedTrades.forEach((t, index) => {
        cumulative += t.pnl;
        peak = Math.max(peak, cumulative);
        const drawdown = peak - cumulative;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

        curve.push({
          date: t.closeDate || t.date, // Use closeDate for swing trades
          pnl: t.pnl,
          cumulative,
          drawdown,
          drawdownPercent,
          tradeCount: 1,
          winCount: t.pnl > 0 ? 1 : 0,
          lossCount: t.pnl < 0 ? 1 : 0,
          tradeIndex: index + 1, // 1-based index for display
        });
      });
    } else {
      // Aggregate by day for all periods (removed weekly aggregation for YTD)
      const shouldAggregateByWeek = false;
      const pnlByPeriod: Record<string, { pnl: number; count: number; winCount: number; lossCount: number }> = {};
      sortedTrades.forEach(t => {
        const effectiveDate = t.closeDate || t.date;
        const key = shouldAggregateByWeek ? getWeekStart(effectiveDate) : effectiveDate;
        if (!pnlByPeriod[key]) {
          pnlByPeriod[key] = { pnl: 0, count: 0, winCount: 0, lossCount: 0 };
        }
        pnlByPeriod[key].pnl += t.pnl;
        pnlByPeriod[key].count += 1;
        if (t.pnl > 0) pnlByPeriod[key].winCount += 1;
        else if (t.pnl < 0) pnlByPeriod[key].lossCount += 1;
      });

      Object.keys(pnlByPeriod).sort().forEach(date => {
        cumulative += pnlByPeriod[date].pnl;
        peak = Math.max(peak, cumulative);
        const drawdown = peak - cumulative;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

        curve.push({
          date,
          dateEnd: shouldAggregateByWeek ? getWeekEnd(date) : undefined,
          pnl: pnlByPeriod[date].pnl,
          cumulative,
          drawdown,
          drawdownPercent,
          tradeCount: pnlByPeriod[date].count,
          winCount: pnlByPeriod[date].winCount,
          lossCount: pnlByPeriod[date].lossCount,
        });
      });
    }

    return { data: curve, dateRange, period: equityPeriod, tradeCount: filteredTrades.length, startingEquity };
  }, [tradingStats, closedTrades, equityPeriod, equityTagFilter, equityAssetFilter, effectiveStartingEquity, customFilter]);

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

  // Get month abbreviations
  const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return (
    <div className="h-full overflow-y-auto space-y-6 pb-6">
      {/* EQUITY CURVE - Full Width Top Section */}
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
              <BarChart3 className="w-5 h-5 text-accent-light" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Performance</h2>
              <p className="text-xs text-muted">
                {equityPeriod === "custom"
                  ? customFilter.type === "dateRange"
                    ? customFilter.dateRange.start && customFilter.dateRange.end
                      ? (() => {
                          const [sy, sm, sd] = customFilter.dateRange.start.split("-").map(Number);
                          const [ey, em, ed] = customFilter.dateRange.end.split("-").map(Number);
                          const start = new Date(sy, sm - 1, sd);
                          const end = new Date(ey, em - 1, ed);
                          const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          return `${formatDate(start)} - ${formatDate(end)}`;
                        })()
                      : "Select date range"
                    : customFilter.type === "daysBack"
                      ? `Last ${customFilter.daysBack} days`
                      : `Last ${customFilter.tradesBack} trades`
                  : equityPeriod === "all" && filteredEquityCurve.dateRange
                      ? (() => {
                          const start = new Date(filteredEquityCurve.dateRange.start);
                          start.setDate(start.getDate() + 1);
                          const end = new Date(filteredEquityCurve.dateRange.end);
                          const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          return `${formatDate(start)} - ${formatDate(end)}`;
                        })()
                      : equityPeriod === "ytd"
                        ? `${new Date().getFullYear()} Year to Date`
                        : equityPeriod === "mtd"
                          ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : equityPeriod === "wtd"
                            ? (() => {
                                const now = new Date();
                                const startOfWeek = new Date(now);
                                startOfWeek.setDate(now.getDate() - now.getDay());
                                const endOfWeek = new Date(startOfWeek);
                                endOfWeek.setDate(startOfWeek.getDate() + 6);
                                const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
                              })()
                            : "All Time"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-card/80 rounded-lg p-1 border border-border/50">
                {[
                  { value: "all", label: "All Time" },
                  { value: "ytd", label: "YTD" },
                  { value: "mtd", label: "MTD" },
                  { value: "wtd", label: "WTD" },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setEquityPeriod(p.value as typeof equityPeriod);
                      setShowCustomMenu(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      equityPeriod === p.value
                        ? "bg-accent text-white shadow-sm"
                        : "text-muted hover:text-foreground hover:bg-card-hover"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                {/* Custom with dropdown */}
                <div className="relative" ref={customMenuRef}>
                  <button
                    onClick={() => {
                      if (equityPeriod === "custom") {
                        setShowCustomMenu(!showCustomMenu);
                      } else {
                        setEquityPeriod("custom");
                        setShowCustomMenu(true);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                      equityPeriod === "custom"
                        ? "bg-accent text-white shadow-sm"
                        : "text-muted hover:text-foreground hover:bg-card-hover"
                    }`}
                  >
                    Custom
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Custom Filter Dropdown */}
                  {showCustomMenu && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-30 overflow-hidden">
                      {/* Filter Type Tabs */}
                      <div className="flex border-b border-border">
                        {[
                          { type: "dateRange" as const, label: "Date Range", icon: Calendar },
                          { type: "daysBack" as const, label: "Days", icon: Clock },
                          { type: "tradesBack" as const, label: "Trades", icon: BarChart3 },
                        ].map(({ type, label, icon: Icon }) => (
                          <button
                            key={type}
                            onClick={() => setCustomFilter(prev => ({ ...prev, type }))}
                            className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                              customFilter.type === type
                                ? "bg-accent/10 text-accent-light border-b-2 border-accent"
                                : "text-muted hover:text-foreground hover:bg-card-hover"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Filter Content */}
                      <div className="p-4">
                        {customFilter.type === "dateRange" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted w-10">From</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={startDateInputs.month}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                                  updateStartDate(val, startDateInputs.day, startDateInputs.year);
                                }}
                                placeholder="MM"
                                className="w-10 px-1 py-2 bg-card-hover border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                              />
                              <span className="text-muted">/</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={startDateInputs.day}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                                  updateStartDate(startDateInputs.month, val, startDateInputs.year);
                                }}
                                placeholder="DD"
                                className="w-10 px-1 py-2 bg-card-hover border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                              />
                              <span className="text-muted">/</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={startDateInputs.year}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  updateStartDate(startDateInputs.month, startDateInputs.day, val);
                                }}
                                placeholder="YYYY"
                                className="w-14 px-1 py-2 bg-card-hover border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted w-10">To</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={endDateInputs.month}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                                  updateEndDate(val, endDateInputs.day, endDateInputs.year);
                                }}
                                placeholder="MM"
                                className="w-10 px-1 py-2 bg-card-hover border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                              />
                              <span className="text-muted">/</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={endDateInputs.day}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                                  updateEndDate(endDateInputs.month, val, endDateInputs.year);
                                }}
                                placeholder="DD"
                                className="w-10 px-1 py-2 bg-card-hover border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                              />
                              <span className="text-muted">/</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={endDateInputs.year}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  updateEndDate(endDateInputs.month, endDateInputs.day, val);
                                }}
                                placeholder="YYYY"
                                className="w-14 px-1 py-2 bg-card-hover border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                              />
                            </div>
                          </div>
                        )}

                        {customFilter.type === "daysBack" && (
                          <div>
                            <label className="text-xs text-muted block mb-1.5">Number of Days</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={customFilter.daysBack === 0 ? "" : customFilter.daysBack}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  setCustomFilter(prev => ({
                                    ...prev,
                                    daysBack: val === "" ? 0 : parseInt(val)
                                  }));
                                }}
                                placeholder="Enter days"
                                className="flex-1 px-3 py-2 bg-card-hover border border-border rounded-lg text-sm"
                              />
                              <span className="text-sm text-muted">days back</span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              {[7, 14, 30, 60, 90].map(days => (
                                <button
                                  key={days}
                                  onClick={() => setCustomFilter(prev => ({ ...prev, daysBack: days }))}
                                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                    customFilter.daysBack === days
                                      ? "bg-accent text-white"
                                      : "bg-card-hover text-muted hover:text-foreground"
                                  }`}
                                >
                                  {days}d
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {customFilter.type === "tradesBack" && (
                          <div>
                            <label className="text-xs text-muted block mb-1.5">Number of Trades</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={customFilter.tradesBack === 0 ? "" : customFilter.tradesBack}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  setCustomFilter(prev => ({
                                    ...prev,
                                    tradesBack: val === "" ? 0 : parseInt(val)
                                  }));
                                }}
                                placeholder="Enter trades"
                                className="flex-1 px-3 py-2 bg-card-hover border border-border rounded-lg text-sm"
                              />
                              <span className="text-sm text-muted">recent trades</span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              {[10, 25, 50, 100, 200].map(count => (
                                <button
                                  key={count}
                                  onClick={() => setCustomFilter(prev => ({ ...prev, tradesBack: count }))}
                                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                    customFilter.tradesBack === count
                                      ? "bg-accent text-white"
                                      : "bg-card-hover text-muted hover:text-foreground"
                                  }`}
                                >
                                  {count}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tag Filter */}
            {tagSettings.sections.length > 0 && (
              <div ref={tagDropdownRef} className="relative">
                <button
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    equityTagFilter.length > 0
                      ? "bg-accent/20 border-accent/50 text-accent-light"
                      : "bg-card/80 border-border/50 text-muted hover:text-foreground hover:border-border"
                  }`}
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  {equityTagFilter.length > 0 ? `${equityTagFilter.length} Tags` : "Filter"}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showTagDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-20 py-2 backdrop-blur-xl max-h-80 overflow-y-auto">
                    {tagSettings.sections
                      .sort((a, b) => a.order - b.order)
                      .map((section) => {
                        const colors = TAG_COLORS[section.color] || TAG_COLORS.blue;
                        return (
                          <div key={section.id} className="mb-2">
                            <div className={`px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider ${colors.text}`}>
                              {section.name}
                            </div>
                            <div className="px-2">
                              {section.tags
                                .sort((a, b) => a.order - b.order)
                                .map((tag) => {
                                  const isSelected = equityTagFilter.includes(tag.name);
                                  return (
                                    <button
                                      key={tag.id}
                                      onClick={() => {
                                        setEquityTagFilter((prev) =>
                                          prev.includes(tag.name)
                                            ? prev.filter((t) => t !== tag.name)
                                            : [...prev, tag.name]
                                        );
                                      }}
                                      className="w-full px-2 py-1.5 text-xs text-left hover:bg-card-hover rounded-lg flex items-center gap-2"
                                    >
                                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                        isSelected
                                          ? `${colors.bg} ${colors.border}`
                                          : "border-border"
                                      }`}>
                                        {isSelected && (
                                          <Check className={`w-2.5 h-2.5 ${colors.text}`} />
                                        )}
                                      </div>
                                      <span className={isSelected ? colors.text : "text-foreground"}>{tag.name}</span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Asset Class Filter */}
            <div ref={assetDropdownRef} className="relative">
              <button
                onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  equityAssetFilter.length > 0
                    ? "bg-accent/20 border-accent/50 text-accent-light"
                    : "bg-card/80 border-border/50 text-muted hover:text-foreground hover:border-border"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {equityAssetFilter.length > 0 ? `${equityAssetFilter.length} Assets` : "Asset"}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showAssetDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-20 py-2 backdrop-blur-xl">
                  {ASSET_TYPES.map((asset) => {
                    const colors = TAG_COLORS[asset.color] || TAG_COLORS.blue;
                    const isSelected = equityAssetFilter.includes(asset.value);
                    return (
                      <button
                        key={asset.value}
                        onClick={() => {
                          setEquityAssetFilter((prev) =>
                            prev.includes(asset.value)
                              ? prev.filter((a) => a !== asset.value)
                              : [...prev, asset.value]
                          );
                        }}
                        className="w-full px-4 py-2 text-xs text-left hover:bg-card-hover flex items-center gap-2"
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isSelected
                            ? `${colors.bg} ${colors.border}`
                            : "border-border"
                        }`}>
                          {isSelected && (
                            <Check className={`w-2.5 h-2.5 ${colors.text}`} />
                          )}
                        </div>
                        <span className={isSelected ? colors.text : "text-foreground"}>{asset.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <EquityCurveChart
          data={
            equityPeriod === "wtd" || equityPeriod === "daily"
              ? filteredEquityCurve.data
              : filteredEquityCurve.data.length > 0
                ? filteredEquityCurve.data
                : tradingStats.equityCurve
          }
          dateRange={filteredEquityCurve.dateRange}
          period={filteredEquityCurve.period}
          startingEquity={
            equityPeriod === "wtd" || equityPeriod === "daily"
              ? filteredEquityCurve.startingEquity
              : filteredEquityCurve.data.length > 0
                ? filteredEquityCurve.startingEquity
                : effectiveStartingEquity
          }
          onDayClick={(date, dateEnd) => {
            // Find trades for this date or date range (for YTD, dates represent weeks)
            const dayTrades = closedTrades.filter(t => {
              const effectiveDate = t.closeDate || t.date;
              if (dateEnd) {
                // Date range (weekly aggregation) - find trades within the week
                return effectiveDate >= date && effectiveDate <= dateEnd;
              }
              // Single date
              return effectiveDate === date;
            });
            if (dayTrades.length > 0) {
              const displayDate = dateEnd ? `${date} to ${dateEnd}` : date;
              setSelectedDayTrades({ date: displayDate, trades: dayTrades });
            }
          }}
          selectedTags={selectedTagPills}
          onRemoveTag={(pillId) => {
            if (pillId.startsWith("asset-")) {
              const assetType = pillId.replace("asset-", "");
              setEquityAssetFilter(prev => prev.filter(a => a !== assetType));
            } else if (pillId.startsWith("tag-")) {
              const tagName = pillId.replace("tag-", "");
              setEquityTagFilter(prev => prev.filter(t => t !== tagName));
            }
          }}
        />
      </div>

      {/* GOALS & PROGRESS HERO SECTION */}
      <div className="relative rounded-2xl overflow-hidden border border-border/50">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-purple-500/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400/5 via-transparent to-transparent"></div>

        <div className="relative p-6">
          {/* Hero Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Goals & Progress</h2>
                <p className="text-xs text-muted">Track your trading targets</p>
              </div>
            </div>
            <button
              onClick={() => setShowGoalSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-card-hover border border-border transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              Set Goals
            </button>
          </div>

          {goals.yearlyPnlGoal > 0 || goals.monthlyPnlGoal > 0 ? (
            <>
              {/* Goals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Yearly Goal Card */}
                <div className="flex items-center gap-6 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <CircularProgress
                    percentage={goalProgress?.yearlyProgress || 0}
                    size={100}
                    strokeWidth={8}
                    color="#34d399"
                    label="Yearly"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Yearly Goal</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        goalProgress?.onTrack
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {goalProgress?.onTrack ? "On Track" : "Behind Pace"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${tradingStats.ytdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${tradingStats.ytdPnl.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted">/ ${goals.yearlyPnlGoal.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span>Daily target: <span className="text-foreground font-medium">${(goalProgress?.dailyTarget || 0).toFixed(0)}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Goal Card */}
                <div className="flex items-center gap-6 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <CircularProgress
                    percentage={goalProgress?.monthlyProgress || 0}
                    size={100}
                    strokeWidth={8}
                    color="#60a5fa"
                    label="Monthly"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Monthly Goal</span>
                      <span className="text-xs text-muted">
                        {new Date().toLocaleString('default', { month: 'short' })} {new Date().getFullYear()}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${tradingStats.mtdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${tradingStats.mtdPnl.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted">/ ${goals.monthlyPnlGoal.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        <span>Remaining: <span className="text-foreground font-medium">${Math.max(0, goals.monthlyPnlGoal - tradingStats.mtdPnl).toFixed(0)}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Progress & Monthly Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today's Progress */}
                <div className="p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="text-xs text-muted mb-2">Today's Progress</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-xl font-bold ${(goalProgress?.todayPnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {(goalProgress?.todayPnl || 0) >= 0 ? "+" : ""}${(goalProgress?.todayPnl || 0).toFixed(0)}
                      </div>
                      <div className="text-[11px] text-muted">
                        vs ${(goalProgress?.dailyTarget || 0).toFixed(0)} target
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${
                      (goalProgress?.todayVsTarget || 0) >= 100 ? "text-emerald-400" :
                      (goalProgress?.todayVsTarget || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {(goalProgress?.todayVsTarget || 0).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Monthly Breakdown - spans 2 columns */}
                <div className="md:col-span-2 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="text-xs text-muted mb-3">Monthly Breakdown ({tradingStats.currentYear})</div>
                  <div className="flex items-end justify-between gap-1 h-12">
                    {goalProgress?.monthlyPnl.map((pnl, i) => {
                      const maxPnl = Math.max(...(goalProgress?.monthlyPnl.map(Math.abs) || [1]));
                      const height = maxPnl > 0 ? (Math.abs(pnl) / maxPnl) * 100 : 0;
                      const isCurrentMonth = i === new Date().getMonth();
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full max-w-[20px] rounded-t transition-all ${
                              pnl >= 0 ? "bg-emerald-500" : "bg-red-500"
                            } ${isCurrentMonth ? "ring-2 ring-white/50" : ""}`}
                            style={{ height: `${Math.max(height, 4)}%`, opacity: pnl === 0 ? 0.2 : 0.8 }}
                          />
                          <span className={`text-[9px] mt-1 ${isCurrentMonth ? "text-foreground font-bold" : "text-muted"}`}>
                            {monthNames[i]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Projection Banner */}
              <div className={`mt-4 p-3 rounded-xl flex items-center justify-between ${
                goalProgress?.onTrack
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-yellow-500/10 border border-yellow-500/30"
              }`}>
                <div className="flex items-center gap-3">
                  {goalProgress?.onTrack ? (
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {goalProgress?.onTrack ? "On Track to Hit Yearly Goal!" : "Behind Yearly Pace"}
                    </div>
                    <div className="text-[11px] text-muted">
                      Projected year-end: ${(goalProgress?.projectedYearEnd || 0).toFixed(0)}
                      {" "}({goalProgress?.tradingDaysRemaining} trading days left)
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${goalProgress?.onTrack ? "text-emerald-400" : "text-yellow-400"}`}>
                  {((goalProgress?.projectedYearEnd || 0) / goals.yearlyPnlGoal * 100).toFixed(0)}%
                </div>
              </div>
            </>
          ) : (
            /* No Goals Set State */
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/30 mb-4">
                <Target className="w-8 h-8 text-accent-light" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Set Your Trading Goals</h3>
              <p className="text-sm text-muted mb-4 max-w-md mx-auto">
                Define yearly and monthly P&L targets to track your progress with visual indicators and daily targets.
              </p>
              <button
                onClick={() => setShowGoalSettings(true)}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
              >
                Set Goals Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OPEN TRADES SECTION */}
      {openTrades.length > 0 && (
        <div className="glass rounded-xl border border-amber-500/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowOpenTrades(!showOpenTrades)}
              className="flex items-center gap-2 text-sm font-semibold hover:text-accent transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/20">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              Open Positions ({openTrades.length})
              {showOpenTrades ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <span className="text-xs text-amber-400">Not included in stats until closed</span>
          </div>

          {showOpenTrades && (
            <div className="space-y-2">
              {openTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                      {trade.assetType || "STOCK"}
                    </span>
                    <span className="font-bold">{trade.ticker}</span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      trade.direction === "LONG"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {trade.direction === "LONG" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trade.direction}
                    </span>
                    <span className="text-xs text-muted">Opened {trade.date}</span>
                    {trade.entryPrice && (
                      <span className="text-xs text-muted">@ ${trade.entryPrice.toFixed(2)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setClosingTrade(trade);
                      const today = new Date();
                      const todayStr = today.toISOString().split("T")[0];
                      setCloseTradeForm({
                        exitPrice: "",
                        pnl: "",
                        closeDate: todayStr,
                      });
                      setCloseDateMonth((today.getMonth() + 1).toString());
                      setCloseDateDay(today.getDate().toString());
                      setCloseDateYear(today.getFullYear().toString());
                    }}
                    className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors text-xs font-medium"
                  >
                    Close Trade
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Close Trade Modal */}
      {closingTrade && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl border border-border/50 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Close Trade</h3>
              <button onClick={() => setClosingTrade(null)} className="p-2 hover:bg-card-hover rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">{closingTrade.assetType}</span>
                <span className="font-bold">{closingTrade.ticker}</span>
                <span className={`text-xs ${closingTrade.direction === "LONG" ? "text-emerald-400" : "text-red-400"}`}>
                  {closingTrade.direction}
                </span>
              </div>
              <div className="text-xs text-muted">
                Entry: {closingTrade.entryPrice ? `$${closingTrade.entryPrice.toFixed(2)}` : "N/A"} |
                Size: {closingTrade.size || "N/A"}
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative" ref={closeDatePickerRef}>
                <label className="text-sm text-muted block mb-1">Close Date</label>
                <button
                  type="button"
                  onClick={() => setShowCloseDatePicker(!showCloseDatePicker)}
                  className={`w-full px-4 py-2.5 bg-card border border-border rounded-lg text-left text-sm ${!closeTradeForm.closeDate ? "text-muted" : ""}`}
                >
                  {formatCloseDateDisplay(closeTradeForm.closeDate) || "Select date"}
                </button>
                {showCloseDatePicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-xl z-50">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={closeDateMonth}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                          updateCloseDate(val, closeDateDay, closeDateYear);
                        }}
                        placeholder="MM"
                        className="w-10 px-1 py-1.5 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <span className="text-sm">/</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={closeDateDay}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                          updateCloseDate(closeDateMonth, val, closeDateYear);
                        }}
                        placeholder="DD"
                        className="w-10 px-1 py-1.5 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <span className="text-sm">/</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={closeDateYear}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                          updateCloseDate(closeDateMonth, closeDateDay, val);
                        }}
                        placeholder="YYYY"
                        className="w-14 px-1 py-1.5 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCloseDatePicker(false)}
                        className="ml-1 px-2 py-1.5 bg-accent text-white text-xs rounded hover:bg-accent/90"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Exit Price</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={closeTradeForm.exitPrice}
                  onChange={(e) => setCloseTradeForm(prev => ({ ...prev, exitPrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">P&L</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={closeTradeForm.pnl}
                  onChange={(e) => setCloseTradeForm(prev => ({ ...prev, pnl: e.target.value }))}
                  placeholder="+/- 0.00"
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setClosingTrade(null)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!closeTradeForm.pnl || !closeTradeForm.closeDate) return;
                  await closeTrade(
                    closingTrade.id,
                    closeTradeForm.closeDate,
                    closeTradeForm.exitPrice ? parseFloat(closeTradeForm.exitPrice) : null,
                    parseFloat(closeTradeForm.pnl)
                  );
                  setClosingTrade(null);
                }}
                disabled={!closeTradeForm.pnl || !closeTradeForm.closeDate}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                Close Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT SUMMARY BAR */}
      <div className="glass rounded-xl p-3 border border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 divide-x divide-border">
            <CompactStat label="All-Time" value={tradingStats.allTimePnl} count={tradingStats.allTimeTrades} />
            <div className="pl-4"><CompactStat label="YTD" value={tradingStats.ytdPnl} count={tradingStats.ytdTrades} /></div>
            <div className="pl-4"><CompactStat label="MTD" value={tradingStats.mtdPnl} count={tradingStats.mtdTrades} /></div>
            <div className="pl-4"><CompactStat label="WTD" value={tradingStats.wtdPnl} count={tradingStats.wtdTrades} /></div>
          </div>
          <div className="flex items-center gap-4 divide-x divide-border">
            {/* Consistency Grade */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted">Grade</span>
              <span className={`text-lg font-bold ${consistencyGrade.color}`}>{consistencyGrade.grade}</span>
            </div>
            {/* Current Streak */}
            <div className="pl-4 flex items-center gap-2">
              {tradingStats.currentStreakType === "win" ? (
                <Flame className="w-4 h-4 text-orange-400" />
              ) : tradingStats.currentStreakType === "loss" ? (
                <Snowflake className="w-4 h-4 text-blue-400" />
              ) : (
                <Activity className="w-4 h-4 text-muted" />
              )}
              <span className={`font-bold ${
                tradingStats.currentStreakType === "win" ? "text-emerald-400" :
                tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted"
              }`}>
                {tradingStats.currentStreak}{tradingStats.currentStreakType === "win" ? "W" : tradingStats.currentStreakType === "loss" ? "L" : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUPPORTING METRICS - 3 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Streak Tracker */}
        <div className="glass rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-orange-400" />
            Streak Tracker
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-card border border-border">
              <div className="text-[10px] text-muted mb-1">Current</div>
              <div className={`text-xl font-bold ${
                tradingStats.currentStreakType === "win" ? "text-emerald-400" :
                tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted"
              }`}>
                {tradingStats.currentStreak}
              </div>
              <div className="text-[9px] text-muted">
                {tradingStats.currentStreakType === "win" ? "Wins" : tradingStats.currentStreakType === "loss" ? "Losses" : "N/A"}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[10px] text-emerald-400 mb-1">Best</div>
              <div className="text-xl font-bold text-emerald-400">{tradingStats.longestWinStreak}</div>
              <div className="text-[9px] text-emerald-400/70">Wins</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="text-[10px] text-red-400 mb-1">Worst</div>
              <div className="text-xl font-bold text-red-400">{tradingStats.longestLossStreak}</div>
              <div className="text-[9px] text-red-400/70">Losses</div>
            </div>
          </div>
        </div>

        {/* YoY Comparison */}
        <div className="glass rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-accent-light" />
            Year over Year
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
              <div>
                <div className="text-sm font-medium">{tradingStats.currentYear}</div>
                <div className="text-[10px] text-muted">{tradingStats.ytdTrades} trades</div>
              </div>
              <div className={`text-lg font-bold ${tradingStats.ytdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {tradingStats.ytdPnl >= 0 ? "+" : ""}${tradingStats.ytdPnl.toFixed(0)}
              </div>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
              <div>
                <div className="text-sm font-medium">{tradingStats.lastYear}</div>
                <div className="text-[10px] text-muted">{tradingStats.lastYearTrades} trades</div>
              </div>
              <div className={`text-lg font-bold ${tradingStats.lastYearPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {tradingStats.lastYearPnl >= 0 ? "+" : ""}${tradingStats.lastYearPnl.toFixed(0)}
              </div>
            </div>
            {tradingStats.lastYearPnl !== 0 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                {tradingStats.ytdPnl >= tradingStats.lastYearPnl ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-xs font-medium ${tradingStats.ytdPnl >= tradingStats.lastYearPnl ? "text-emerald-400" : "text-red-400"}`}>
                  {(((tradingStats.ytdPnl - tradingStats.lastYearPnl) / Math.abs(tradingStats.lastYearPnl)) * 100).toFixed(0)}% vs last year
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Consistency Score */}
        <div className="glass rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-yellow-400" />
            Consistency Score
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Win Rate</span>
              <span className="text-xs font-bold">{tradingStats.winRateScore.toFixed(0)}/25</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(tradingStats.winRateScore / 25) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Profit Factor</span>
              <span className="text-xs font-bold">{tradingStats.profitFactorScore.toFixed(0)}/25</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(tradingStats.profitFactorScore / 25) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Drawdown</span>
              <span className="text-xs font-bold">{tradingStats.drawdownScore.toFixed(0)}/25</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(tradingStats.drawdownScore / 25) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Win Streaks</span>
              <span className="text-xs font-bold">{tradingStats.streakScore.toFixed(0)}/25</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(tradingStats.streakScore / 25) * 100}%` }} />
            </div>
            <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
              <span className="text-sm font-medium">Total Score</span>
              <span className={`text-lg font-bold ${consistencyGrade.color}`}>
                {tradingStats.consistencyScore}/100 ({consistencyGrade.grade})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED METRICS */}
      <div className="glass rounded-xl border border-border/50 p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-accent-light" />
          Advanced Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Expectancy */}
          <div className="p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Expectancy</div>
            <div className={`text-lg font-bold ${tradingStats.expectancy >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {tradingStats.expectancy >= 0 ? "+" : ""}${tradingStats.expectancy.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted mt-1">per trade</div>
          </div>

          {/* Risk/Reward Ratio */}
          <div className="p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Risk/Reward</div>
            <div className={`text-lg font-bold ${tradingStats.riskRewardRatio >= 1 ? "text-emerald-400" : "text-amber-400"}`}>
              {tradingStats.riskRewardRatio.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted mt-1">avg win / avg loss</div>
          </div>

          {/* Sharpe Ratio */}
          <div className="p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Sharpe Ratio</div>
            <div className={`text-lg font-bold ${
              tradingStats.sharpeRatio >= 2 ? "text-emerald-400" :
              tradingStats.sharpeRatio >= 1 ? "text-amber-400" : "text-red-400"
            }`}>
              {tradingStats.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted mt-1">annualized</div>
          </div>

          {/* Recovery Factor */}
          <div className="p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Recovery Factor</div>
            <div className={`text-lg font-bold ${
              tradingStats.recoveryFactor >= 3 ? "text-emerald-400" :
              tradingStats.recoveryFactor >= 1 ? "text-amber-400" : "text-red-400"
            }`}>
              {tradingStats.recoveryFactor >= 10 ? ">10" : tradingStats.recoveryFactor.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted mt-1">profit / max DD</div>
          </div>

          {/* Win/Loss Days */}
          <div className="p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Trading Days</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-400">{tradingStats.winDays}W</span>
              <span className="text-muted">/</span>
              <span className="text-lg font-bold text-red-400">{tradingStats.lossDays}L</span>
            </div>
            <div className="text-[10px] text-muted mt-1">
              {tradingStats.winDays + tradingStats.lossDays > 0
                ? `${((tradingStats.winDays / (tradingStats.winDays + tradingStats.lossDays)) * 100).toFixed(0)}% win days`
                : "no data"}
            </div>
          </div>

          {/* Current Streak */}
          <div className="p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Current Streak</div>
            <div className={`text-lg font-bold ${
              tradingStats.currentStreakType === "win" ? "text-emerald-400" :
              tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted"
            }`}>
              {tradingStats.currentStreak > 0 ? (
                <>
                  {tradingStats.currentStreak} {tradingStats.currentStreakType === "win" ? "wins" : "losses"}
                </>
              ) : (
                "—"
              )}
            </div>
            <div className="text-[10px] text-muted mt-1">
              best: {tradingStats.longestWinStreak}W / worst: {tradingStats.longestLossStreak}L
            </div>
          </div>
        </div>
      </div>

      {/* EVENT CORRELATION */}
      <div className="glass rounded-xl border border-border/50 p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-accent-light" />
          Trade-Event Correlation
        </h3>
        <EventCorrelation />
      </div>

      {/* RECENT TRADES - Collapsible */}
      <div className="glass rounded-xl border border-border/50">
        <button
          onClick={() => setShowRecentTrades(!showRecentTrades)}
          className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors rounded-xl"
        >
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-light" />
            Recent Trades
            <span className="text-xs text-muted font-normal">({tradingStats.sortedTrades.length} total)</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{showRecentTrades ? "Hide" : "Show"}</span>
            {showRecentTrades ? (
              <ChevronUp className="w-4 h-4 text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted" />
            )}
          </div>
        </button>

        {showRecentTrades && (
          <div className="px-5 pb-5">
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
        )}
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
                <label className="block text-sm font-medium mb-2">Starting Equity</label>
                <p className="text-xs text-muted mb-2">Your initial account balance before any trades</p>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="number"
                    value={goalInput.startingEquity}
                    onChange={(e) => setGoalInput({ ...goalInput, startingEquity: e.target.value })}
                    placeholder="e.g. 10000"
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <label className="block text-sm font-medium mb-2">Yearly P&L Goal</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="number"
                    value={goalInput.yearly}
                    onChange={(e) => setGoalInput({ ...goalInput, yearly: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

      {/* Day Trades Modal */}
      {selectedDayTrades && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDayTrades(null)}>
          <div className="w-full max-w-2xl glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent-light" />
                  Trades Closed {(() => {
                    const [y, m, d] = selectedDayTrades.date.split("-").map(Number);
                    const date = new Date(y, m - 1, d);
                    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                  })()}
                </h3>
                <p className="text-sm text-muted mt-0.5">
                  {selectedDayTrades.trades.length} trade{selectedDayTrades.trades.length !== 1 ? 's' : ''} •
                  Total P&L: <span className={selectedDayTrades.trades.reduce((sum, t) => sum + t.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {selectedDayTrades.trades.reduce((sum, t) => sum + t.pnl, 0) >= 0 ? '+' : ''}
                    ${selectedDayTrades.trades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}
                  </span>
                </p>
              </div>
              <button onClick={() => setSelectedDayTrades(null)} className="p-1.5 rounded-lg hover:bg-card-hover transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr className="text-xs text-muted">
                    <th className="text-left py-3 px-4 font-medium">Ticker</th>
                    <th className="text-left py-3 px-4 font-medium">Direction</th>
                    <th className="text-right py-3 px-4 font-medium">Entry $</th>
                    <th className="text-right py-3 px-4 font-medium">Exit $</th>
                    <th className="text-right py-3 px-4 font-medium">P&L</th>
                    <th className="text-left py-3 px-4 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDayTrades.trades.map((trade) => {
                    const isSwingTrade = trade.closeDate && trade.closeDate !== trade.date;
                    return (
                    <tr key={trade.id} className="border-b border-border/50 hover:bg-card-hover/50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">{trade.ticker}</span>
                        {isSwingTrade && (
                          <span className="block text-[10px] text-amber-400/80 mt-0.5">
                            Opened {(() => {
                              const [y, m, d] = trade.date.split("-").map(Number);
                              return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            })()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          trade.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {trade.direction === 'LONG' ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">${trade.entryPrice?.toFixed(2) ?? '-'}</td>
                      <td className="py-3 px-4 text-right text-sm">
                        {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {trade.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                              {tag}
                            </span>
                          ))}
                          {trade.tags.length > 3 && (
                            <span className="text-[10px] text-muted">+{trade.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Notes section if any trade has notes */}
              {selectedDayTrades.trades.some(t => t.notes) && (
                <div className="p-4 border-t border-border bg-card/50">
                  <h4 className="text-sm font-medium mb-3 text-muted">Notes</h4>
                  <div className="space-y-3">
                    {selectedDayTrades.trades.filter(t => t.notes).map((trade) => (
                      <div key={trade.id} className="text-sm">
                        <span className="font-medium text-foreground">{trade.ticker}:</span>{' '}
                        <span className="text-muted">{trade.notes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
