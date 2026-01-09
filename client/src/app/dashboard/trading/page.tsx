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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

// Metric configuration for customizable Key Metrics section
interface MetricConfig {
  id: string;
  name: string;
  shortName: string;
  tooltip: string;
  category: "performance" | "risk" | "trade" | "streak";
  format: "currency" | "percent" | "ratio" | "number";
  colorLogic: "positive" | "negative" | "neutral" | "threshold";
  getValue: (stats: ReturnType<typeof useTradingStats>) => number;
}

// Helper type for stats
type TradingStatsType = {
  expectancy: number;
  riskRewardRatio: number;
  profitFactor: number;
  sharpeRatio: number;
  recoveryFactor: number;
  winDays: number;
  lossDays: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdownPercent: number;
  currentDrawdownPercent: number;
  winRate: number;
  allTimePnl: number;
  allTimeTrades: number;
  winningTrades: number;
  losingTrades: number;
  currentStreak: number;
  currentStreakType: "win" | "loss" | null;
  longestWinStreak: number;
  longestLossStreak: number;
  sortedTrades: { pnl: number }[];
  consistencyScore: number;
};

const AVAILABLE_METRICS: Omit<MetricConfig, "getValue">[] = [
  // Performance Metrics
  {
    id: "winRate",
    name: "Win Rate",
    shortName: "Win Rate",
    tooltip: "Percentage of profitable trades. Formula: (Winning Trades ÷ Total Trades) × 100. Above 50% is good, but must be paired with adequate R:R ratio.",
    category: "performance",
    format: "percent",
    colorLogic: "threshold",
  },
  {
    id: "profitFactor",
    name: "Profit Factor",
    shortName: "Profit Factor",
    tooltip: "Ratio of gross profits to gross losses. Formula: Gross Profits ÷ Gross Losses. Above 1.0 is profitable, 1.5+ is good, 2.0+ is excellent.",
    category: "performance",
    format: "ratio",
    colorLogic: "threshold",
  },
  {
    id: "expectancy",
    name: "Expectancy",
    shortName: "Expectancy",
    tooltip: "Average profit expected per trade. Formula: (Win% × Avg Win) − (Loss% × Avg Loss). Positive value means strategy is profitable over time.",
    category: "performance",
    format: "currency",
    colorLogic: "positive",
  },
  {
    id: "riskReward",
    name: "Risk/Reward Ratio",
    shortName: "R:R Ratio",
    tooltip: "Average win size compared to average loss. Formula: Average Win ÷ Average Loss. 1.5+ is good, 2.0+ is excellent. Higher allows lower win rate.",
    category: "performance",
    format: "ratio",
    colorLogic: "threshold",
  },
  {
    id: "sharpe",
    name: "Sharpe Ratio",
    shortName: "Sharpe",
    tooltip: "Risk-adjusted return measure. Formula: (Return − Risk-free Rate) ÷ Standard Deviation. Above 1.0 is acceptable, 2.0+ is very good, 3.0+ is excellent.",
    category: "performance",
    format: "ratio",
    colorLogic: "threshold",
  },
  {
    id: "avgTrade",
    name: "Average Trade",
    shortName: "Avg Trade",
    tooltip: "Average P&L per trade. Formula: Net P&L ÷ Total Trades. Shows expected value of each trade regardless of outcome.",
    category: "performance",
    format: "currency",
    colorLogic: "positive",
  },
  // Risk Metrics
  {
    id: "maxDrawdown",
    name: "Maximum Drawdown",
    shortName: "Max DD",
    tooltip: "Largest peak-to-trough decline. Formula: (Peak − Trough) ÷ Peak × 100. Under 20% is good, under 10% is excellent. Critical for risk management.",
    category: "risk",
    format: "percent",
    colorLogic: "negative",
  },
  {
    id: "currentDrawdown",
    name: "Current Drawdown",
    shortName: "Current DD",
    tooltip: "Current decline from peak equity. Formula: (Peak − Current) ÷ Peak × 100. Shows how far you are from your high-water mark.",
    category: "risk",
    format: "percent",
    colorLogic: "negative",
  },
  {
    id: "recoveryFactor",
    name: "Recovery Factor",
    shortName: "Recovery",
    tooltip: "Profit relative to max drawdown. Formula: Net Profit ÷ Max Drawdown. Above 3.0 is good, above 5.0 is excellent. Higher means faster recovery from losses.",
    category: "risk",
    format: "ratio",
    colorLogic: "threshold",
  },
  {
    id: "winDays",
    name: "Win/Loss Days",
    shortName: "Win Days",
    tooltip: "Ratio of profitable to unprofitable trading days. Shows consistency across sessions. Green/red numbers show winning vs losing days.",
    category: "risk",
    format: "number",
    colorLogic: "neutral",
  },
  // Trade Metrics
  {
    id: "avgWin",
    name: "Average Win",
    shortName: "Avg Win",
    tooltip: "Mean profit from winning trades. Formula: Total Profit from Wins ÷ Number of Wins. Compare with Avg Loss to assess R:R.",
    category: "trade",
    format: "currency",
    colorLogic: "positive",
  },
  {
    id: "avgLoss",
    name: "Average Loss",
    shortName: "Avg Loss",
    tooltip: "Mean loss from losing trades. Formula: Total Losses ÷ Number of Losses. Should be smaller than Avg Win for positive expectancy.",
    category: "trade",
    format: "currency",
    colorLogic: "negative",
  },
  {
    id: "bestTrade",
    name: "Best Trade",
    shortName: "Best Trade",
    tooltip: "Largest single winning trade. Identifies outlier wins. If much larger than average, strategy may rely on rare big wins.",
    category: "trade",
    format: "currency",
    colorLogic: "positive",
  },
  {
    id: "worstTrade",
    name: "Worst Trade",
    shortName: "Worst Trade",
    tooltip: "Largest single losing trade. Reveals risk exposure. If much larger than average loss, review position sizing and stop-losses.",
    category: "trade",
    format: "currency",
    colorLogic: "negative",
  },
  {
    id: "totalTrades",
    name: "Total Trades",
    shortName: "Total Trades",
    tooltip: "Number of completed trades. More trades = more statistical significance. At least 30+ trades needed for reliable metrics.",
    category: "trade",
    format: "number",
    colorLogic: "neutral",
  },
  {
    id: "winningTrades",
    name: "Winning Trades",
    shortName: "Winners",
    tooltip: "Count of profitable trades. Use alongside Total Trades to calculate win rate manually.",
    category: "trade",
    format: "number",
    colorLogic: "positive",
  },
  {
    id: "losingTrades",
    name: "Losing Trades",
    shortName: "Losers",
    tooltip: "Count of unprofitable trades. Compare with Winners to see the balance of your trading outcomes.",
    category: "trade",
    format: "number",
    colorLogic: "negative",
  },
  {
    id: "netPnl",
    name: "Net P&L",
    shortName: "Net P&L",
    tooltip: "Total profit or loss from all trades. The bottom line of your trading performance after all wins and losses.",
    category: "trade",
    format: "currency",
    colorLogic: "positive",
  },
  // Streak Metrics
  {
    id: "currentStreak",
    name: "Current Streak",
    shortName: "Streak",
    tooltip: "Current consecutive wins or losses. Helps identify momentum and potential regression to mean. Don't get overconfident on win streaks.",
    category: "streak",
    format: "number",
    colorLogic: "neutral",
  },
  {
    id: "bestStreak",
    name: "Best Win Streak",
    shortName: "Best Streak",
    tooltip: "Longest consecutive winning trades. Know this to avoid overconfidence and excessive risk-taking during winning runs.",
    category: "streak",
    format: "number",
    colorLogic: "positive",
  },
  {
    id: "worstStreak",
    name: "Worst Loss Streak",
    shortName: "Worst Streak",
    tooltip: "Longest consecutive losing trades. Know this to prevent panic during normal drawdowns. All strategies have losing streaks.",
    category: "streak",
    format: "number",
    colorLogic: "negative",
  },
  {
    id: "consistencyScore",
    name: "Consistency Score",
    shortName: "Consistency",
    tooltip: "Overall consistency rating (0-100). Combines win rate, profit factor, drawdown, and streaks into a single score. 70+ is good.",
    category: "performance",
    format: "number",
    colorLogic: "threshold",
  },
];

// Default 10 metrics to display (most important for traders)
const DEFAULT_METRIC_IDS = [
  "winRate",
  "profitFactor",
  "expectancy",
  "riskReward",
  "sharpe",
  "recoveryFactor",
  "avgWin",
  "avgLoss",
  "maxDrawdown",
  "currentDrawdown",
];

// Goal settings interface
interface TradingGoals {
  yearlyPnlGoal: number;
  monthlyPnlGoal: number;
  startingEquity: number;
}

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
  const [recentTradesPage, setRecentTradesPage] = useState(1);
  const tradesPerPage = 20;
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

  // Key Metrics customization
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tradingMetrics");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_METRIC_IDS;
        }
      }
    }
    return DEFAULT_METRIC_IDS;
  });
  const [showMetricsSettings, setShowMetricsSettings] = useState(false);

  // Save metrics selection to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tradingMetrics", JSON.stringify(selectedMetrics));
    }
  }, [selectedMetrics]);

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

  // Count trades per tag for filter dropdown
  const tagTradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    closedTrades.forEach(trade => {
      const tradeTags = (trade as any).tags || [];
      tradeTags.forEach((tagName: string) => {
        counts[tagName] = (counts[tagName] || 0) + 1;
      });
    });
    return counts;
  }, [closedTrades]);

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
                                      <span className="ml-auto text-[10px] text-muted">{tagTradeCounts[tag.name] || 0}</span>
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

      {/* GOALS, PROGRESS & CONSISTENCY SECTION */}
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
                <h2 className="text-lg font-bold">Goals & Performance</h2>
                <p className="text-xs text-muted">Track targets and trading consistency</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Consistency Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                consistencyGrade.grade === "A+" || consistencyGrade.grade === "A" ? "bg-emerald-500/10 border-emerald-500/30" :
                consistencyGrade.grade === "B+" || consistencyGrade.grade === "B" ? "bg-blue-500/10 border-blue-500/30" :
                consistencyGrade.grade === "C+" || consistencyGrade.grade === "C" ? "bg-yellow-500/10 border-yellow-500/30" :
                "bg-red-500/10 border-red-500/30"
              }`}>
                <Award className="w-4 h-4 text-yellow-400" />
                <span className={`text-sm font-bold ${consistencyGrade.color}`}>{consistencyGrade.grade}</span>
                <span className="text-xs text-muted">({tradingStats.consistencyScore}/100)</span>
              </div>
              <button
                onClick={() => setShowGoalSettings(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-card-hover border border-border transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                Set Goals
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Goals (2/3 width on large screens) */}
            <div className="lg:col-span-2 space-y-4">
              {goals.yearlyPnlGoal > 0 || goals.monthlyPnlGoal > 0 ? (
                <>
                  {/* Goals Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Yearly Goal Card */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                      <CircularProgress
                        percentage={goalProgress?.yearlyProgress || 0}
                        size={80}
                        strokeWidth={6}
                        color="#34d399"
                        label="Yearly"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">Yearly Goal</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            goalProgress?.onTrack
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {goalProgress?.onTrack ? "On Track" : "Behind"}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl font-bold ${tradingStats.ytdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${tradingStats.ytdPnl.toFixed(0)}
                          </span>
                          <span className="text-xs text-muted">/ ${goals.yearlyPnlGoal.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <span>Daily: <span className="text-foreground font-medium">${(goalProgress?.dailyTarget || 0).toFixed(0)}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Goal Card */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                      <CircularProgress
                        percentage={goalProgress?.monthlyProgress || 0}
                        size={80}
                        strokeWidth={6}
                        color="#60a5fa"
                        label="Monthly"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">Monthly Goal</span>
                          <span className="text-[10px] text-muted">
                            {new Date().toLocaleString('default', { month: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl font-bold ${tradingStats.mtdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${tradingStats.mtdPnl.toFixed(0)}
                          </span>
                          <span className="text-xs text-muted">/ ${goals.monthlyPnlGoal.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          <span>Left: <span className="text-foreground font-medium">${Math.max(0, goals.monthlyPnlGoal - tradingStats.mtdPnl).toFixed(0)}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Today + Monthly Breakdown Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Today's Progress */}
                    <div className="p-3 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                      <div className="text-[10px] text-muted mb-1">Today</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-bold ${(goalProgress?.todayPnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {(goalProgress?.todayPnl || 0) >= 0 ? "+" : ""}${(goalProgress?.todayPnl || 0).toFixed(0)}
                        </span>
                        <span className={`text-sm font-bold ${
                          (goalProgress?.todayVsTarget || 0) >= 100 ? "text-emerald-400" :
                          (goalProgress?.todayVsTarget || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                        }`}>
                          {(goalProgress?.todayVsTarget || 0).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Monthly Breakdown - Enhanced */}
                    <div className="md:col-span-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] text-muted">{tradingStats.currentYear} Monthly P&L</div>
                        <div className="flex items-center gap-3 text-[9px]">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                            <span className="text-muted">Profit</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-sm bg-red-500" />
                            <span className="text-muted">Loss</span>
                          </div>
                        </div>
                      </div>

                      {/* Chart Area */}
                      <div className="relative">
                        {/* Zero line */}
                        <div className="absolute left-0 right-0 top-1/2 h-px bg-border/50 z-0" />

                        {/* Bars */}
                        <div className="flex items-center justify-between gap-1.5 h-24 relative z-10">
                          {goalProgress?.monthlyPnl.map((pnl, i) => {
                            const maxPnl = Math.max(...(goalProgress?.monthlyPnl.map(Math.abs) || [1]), 1);
                            const heightPercent = maxPnl > 0 ? (Math.abs(pnl) / maxPnl) * 45 : 0;
                            const isCurrentMonth = i === new Date().getMonth();
                            const isPastMonth = i < new Date().getMonth();
                            const isFutureMonth = i > new Date().getMonth();

                            // Calculate cumulative P&L up to this month
                            const cumulativePnl = goalProgress?.monthlyPnl.slice(0, i + 1).reduce((sum, p) => sum + p, 0) || 0;

                            return (
                              <div key={i} className="flex-1 flex flex-col items-center h-full justify-center group relative">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 pointer-events-none">
                                  <div className="bg-slate-900 border border-accent/50 rounded-lg shadow-xl p-2 min-w-[100px]">
                                    <div className="text-[10px] font-medium text-foreground mb-1">
                                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i]}
                                    </div>
                                    <div className={`text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
                                    </div>
                                    <div className="text-[9px] text-muted mt-1 pt-1 border-t border-white/10">
                                      YTD: <span className={cumulativePnl >= 0 ? "text-emerald-400" : "text-red-400"}>${cumulativePnl.toFixed(0)}</span>
                                    </div>
                                  </div>
                                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-900 border-r border-b border-accent/50 rotate-45" />
                                </div>

                                {/* Bar */}
                                <div className="w-full flex flex-col items-center justify-center h-full">
                                  {pnl >= 0 ? (
                                    <div className="w-full flex flex-col items-center">
                                      <div
                                        className={`w-full max-w-[20px] rounded-t transition-all cursor-pointer ${
                                          isCurrentMonth ? "bg-gradient-to-t from-emerald-600 to-emerald-400 ring-2 ring-emerald-400/50" :
                                          isPastMonth ? "bg-gradient-to-t from-emerald-600 to-emerald-500" : "bg-emerald-500/30"
                                        } group-hover:brightness-110`}
                                        style={{ height: `${Math.max(heightPercent, pnl !== 0 ? 4 : 2)}px`, opacity: isFutureMonth && pnl === 0 ? 0.3 : 1 }}
                                      />
                                      <div className="h-12" />
                                    </div>
                                  ) : (
                                    <div className="w-full flex flex-col items-center">
                                      <div className="h-12" />
                                      <div
                                        className={`w-full max-w-[20px] rounded-b transition-all cursor-pointer ${
                                          isCurrentMonth ? "bg-gradient-to-b from-red-600 to-red-400 ring-2 ring-red-400/50" :
                                          isPastMonth ? "bg-gradient-to-b from-red-600 to-red-500" : "bg-red-500/30"
                                        } group-hover:brightness-110`}
                                        style={{ height: `${Math.max(heightPercent, 4)}px` }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Month label */}
                                <span className={`text-[9px] mt-1 ${
                                  isCurrentMonth ? "text-foreground font-bold" :
                                  isPastMonth ? "text-muted" : "text-muted/50"
                                }`}>
                                  {monthNames[i]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary Row */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30 text-[10px]">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-muted">Best: </span>
                            <span className="text-emerald-400 font-medium">
                              ${Math.max(...(goalProgress?.monthlyPnl || [0])).toFixed(0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted">Worst: </span>
                            <span className="text-red-400 font-medium">
                              ${Math.min(...(goalProgress?.monthlyPnl || [0])).toFixed(0)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted">Avg: </span>
                          <span className={`font-medium ${
                            ((goalProgress?.monthlyPnl || []).filter((_, i) => i <= new Date().getMonth()).reduce((a, b) => a + b, 0) / (new Date().getMonth() + 1)) >= 0
                              ? "text-emerald-400" : "text-red-400"
                          }`}>
                            ${((goalProgress?.monthlyPnl || []).filter((_, i) => i <= new Date().getMonth()).reduce((a, b) => a + b, 0) / (new Date().getMonth() + 1)).toFixed(0)}/mo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Projection Banner */}
                  <div className={`p-3 rounded-xl flex items-center justify-between ${
                    goalProgress?.onTrack
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : "bg-yellow-500/10 border border-yellow-500/30"
                  }`}>
                    <div className="flex items-center gap-2">
                      {goalProgress?.onTrack ? (
                        <Trophy className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <div>
                        <div className="text-xs font-medium">
                          {goalProgress?.onTrack ? "On Track!" : "Behind Pace"}
                        </div>
                        <div className="text-[10px] text-muted">
                          Projected: ${(goalProgress?.projectedYearEnd || 0).toFixed(0)} • {goalProgress?.tradingDaysRemaining} days left
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
                <div className="text-center py-12 px-4 rounded-xl bg-card/30 border border-border/30">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 border border-accent/30 mb-3">
                    <Target className="w-6 h-6 text-accent-light" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Set Your Trading Goals</h3>
                  <p className="text-xs text-muted mb-3 max-w-sm mx-auto">
                    Define yearly and monthly P&L targets to track progress with daily targets.
                  </p>
                  <button
                    onClick={() => setShowGoalSettings(true)}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors"
                  >
                    Set Goals Now
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Consistency Score (1/3 width on large screens) */}
            <div className="space-y-3">
              {/* Score Header with Visual Gauge */}
              <div className="p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-4">
                  {/* Circular Score Gauge */}
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-background"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="3"
                        strokeDasharray={`${tradingStats.consistencyScore}, 100`}
                        strokeLinecap="round"
                        className={
                          tradingStats.consistencyScore >= 80 ? "stroke-emerald-500" :
                          tradingStats.consistencyScore >= 60 ? "stroke-blue-500" :
                          tradingStats.consistencyScore >= 40 ? "stroke-yellow-500" : "stroke-red-500"
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-xl font-bold ${consistencyGrade.color}`}>{tradingStats.consistencyScore}</span>
                      <span className="text-[8px] text-muted">/ 100</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-lg font-bold px-2 py-0.5 rounded ${
                        consistencyGrade.grade === "A+" || consistencyGrade.grade === "A" ? "bg-emerald-500/20 text-emerald-400" :
                        consistencyGrade.grade === "B+" || consistencyGrade.grade === "B" ? "bg-blue-500/20 text-blue-400" :
                        consistencyGrade.grade === "C+" || consistencyGrade.grade === "C" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>{consistencyGrade.grade}</span>
                    </div>
                    <div className="text-[10px] text-muted">
                      {tradingStats.consistencyScore >= 80 ? "Elite trader consistency" :
                       tradingStats.consistencyScore >= 60 ? "Above average discipline" :
                       tradingStats.consistencyScore >= 40 ? "Developing consistency" : "Needs focused improvement"}
                    </div>
                  </div>
                </div>

                {/* Detailed Metric Breakdown */}
                <div className="space-y-2.5">
                  {/* Win Rate */}
                  <div className="group">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${tradingStats.winRateScore >= 20 ? "bg-emerald-500" : tradingStats.winRateScore >= 12 ? "bg-yellow-500" : "bg-red-500"}`} />
                        <span className="text-muted">Win Rate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={tradingStats.winRate >= 50 ? "text-emerald-400" : "text-amber-400"}>{tradingStats.winRate.toFixed(0)}%</span>
                        <span className="text-muted/50">→</span>
                        <span className="text-muted/70">50%+</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden relative">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(tradingStats.winRateScore / 25) * 100}%` }} />
                      <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: '80%' }} title="Target: 50%" />
                    </div>
                  </div>

                  {/* Profit Factor */}
                  <div className="group">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${tradingStats.profitFactorScore >= 20 ? "bg-emerald-500" : tradingStats.profitFactorScore >= 12 ? "bg-yellow-500" : "bg-red-500"}`} />
                        <span className="text-muted">Profit Factor</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={tradingStats.profitFactor >= 1.5 ? "text-emerald-400" : tradingStats.profitFactor >= 1 ? "text-amber-400" : "text-red-400"}>{tradingStats.profitFactor.toFixed(2)}</span>
                        <span className="text-muted/50">→</span>
                        <span className="text-muted/70">1.5+</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden relative">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(tradingStats.profitFactorScore / 25) * 100}%` }} />
                      <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: '60%' }} title="Target: 1.5" />
                    </div>
                  </div>

                  {/* Drawdown */}
                  <div className="group">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${tradingStats.drawdownScore >= 20 ? "bg-emerald-500" : tradingStats.drawdownScore >= 12 ? "bg-yellow-500" : "bg-red-500"}`} />
                        <span className="text-muted">Max Drawdown</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={tradingStats.maxDrawdownPercent <= 10 ? "text-emerald-400" : tradingStats.maxDrawdownPercent <= 20 ? "text-amber-400" : "text-red-400"}>{tradingStats.maxDrawdownPercent.toFixed(1)}%</span>
                        <span className="text-muted/50">→</span>
                        <span className="text-muted/70">&lt;15%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden relative">
                      <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${(tradingStats.drawdownScore / 25) * 100}%` }} />
                      <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: '60%' }} title="Target: <15%" />
                    </div>
                  </div>

                  {/* Streaks */}
                  <div className="group">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${tradingStats.streakScore >= 20 ? "bg-emerald-500" : tradingStats.streakScore >= 12 ? "bg-yellow-500" : "bg-red-500"}`} />
                        <span className="text-muted">Streak Balance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">{tradingStats.longestWinStreak}W</span>
                        <span className="text-muted/50">/</span>
                        <span className="text-red-400">{tradingStats.longestLossStreak}L</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(tradingStats.streakScore / 25) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Insights */}
              {(() => {
                const insights = [
                  {
                    name: "Win Rate",
                    score: tradingStats.winRateScore,
                    value: tradingStats.winRate,
                    status: tradingStats.winRate >= 55 ? "excellent" : tradingStats.winRate >= 50 ? "good" : tradingStats.winRate >= 45 ? "fair" : "poor",
                    action: tradingStats.winRate < 45 ? "Review your entry criteria - you may be entering too early or at poor levels" :
                            tradingStats.winRate < 50 ? "Focus on higher probability setups only" : "Maintain current selection criteria"
                  },
                  {
                    name: "Profit Factor",
                    score: tradingStats.profitFactorScore,
                    value: tradingStats.profitFactor,
                    status: tradingStats.profitFactor >= 2 ? "excellent" : tradingStats.profitFactor >= 1.5 ? "good" : tradingStats.profitFactor >= 1 ? "fair" : "poor",
                    action: tradingStats.profitFactor < 1 ? `Cut losses faster - your avg loss ($${tradingStats.avgLoss.toFixed(0)}) exceeds avg win ($${tradingStats.avgWin.toFixed(0)})` :
                            tradingStats.profitFactor < 1.5 ? "Let winners run longer or tighten stop losses" : "Great risk/reward management"
                  },
                  {
                    name: "Drawdown",
                    score: tradingStats.drawdownScore,
                    value: tradingStats.maxDrawdownPercent,
                    status: tradingStats.maxDrawdownPercent <= 10 ? "excellent" : tradingStats.maxDrawdownPercent <= 15 ? "good" : tradingStats.maxDrawdownPercent <= 25 ? "fair" : "poor",
                    action: tradingStats.maxDrawdownPercent > 25 ? "Reduce position sizes to 1-2% risk per trade" :
                            tradingStats.maxDrawdownPercent > 15 ? "Consider scaling out of losing positions earlier" : "Solid risk management"
                  },
                  {
                    name: "Streaks",
                    score: tradingStats.streakScore,
                    value: tradingStats.longestLossStreak,
                    status: tradingStats.longestWinStreak > tradingStats.longestLossStreak + 2 ? "excellent" :
                            tradingStats.longestWinStreak >= tradingStats.longestLossStreak ? "good" : "fair",
                    action: tradingStats.longestLossStreak > 5 ? "Take a break after 3 consecutive losses to reset" :
                            tradingStats.longestLossStreak > tradingStats.longestWinStreak ? "Analyze what's causing extended losing streaks" : "Good emotional control"
                  },
                ];

                const weakest = insights.reduce((a, b) => a.score < b.score ? a : b);
                const strongest = insights.reduce((a, b) => a.score > b.score ? a : b);

                return (
                  <div className="space-y-2">
                    {/* Weakest Area */}
                    {weakest.score < 20 && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[11px] font-semibold text-amber-400">Priority: {weakest.name}</span>
                        </div>
                        <p className="text-[10px] text-muted leading-relaxed">{weakest.action}</p>
                      </div>
                    )}

                    {/* Strongest Area */}
                    {strongest.score >= 20 && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[11px] font-semibold text-emerald-400">Strength: {strongest.name}</span>
                        </div>
                        <p className="text-[10px] text-muted leading-relaxed">{strongest.action}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
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

      {/* KEY METRICS */}
      <div className="glass rounded-xl border border-border/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Key Metrics
            </h3>
            <button
              onClick={() => setShowMetricsSettings(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted hover:text-foreground rounded-md hover:bg-card-hover transition-colors"
            >
              <Settings className="w-3 h-3" />
              Customize
            </button>
          </div>

          {/* Dynamic Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {selectedMetrics.map((metricId, index) => {
              const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
              if (!metric) return null;

              // Calculate position for tooltip placement
              const numCols = 5; // md:grid-cols-5
              const row = Math.floor(index / numCols);
              const col = index % numCols;
              const isTopRow = row === 0;
              const isLeftEdge = col === 0;
              const isRightEdge = col === numCols - 1;

              // Get metric value
              let value: number | string = 0;
              let displayValue = "—";
              let colorClass = "text-foreground";

              switch (metricId) {
                case "winRate":
                  value = tradingStats.winRate;
                  displayValue = `${value.toFixed(1)}%`;
                  colorClass = value >= 50 ? "text-emerald-400" : "text-amber-400";
                  break;
                case "profitFactor":
                  value = tradingStats.profitFactor;
                  displayValue = value.toFixed(2);
                  colorClass = value >= 1.5 ? "text-emerald-400" : value >= 1 ? "text-amber-400" : "text-red-400";
                  break;
                case "expectancy":
                  value = tradingStats.expectancy;
                  displayValue = `$${value.toFixed(0)}`;
                  colorClass = value >= 0 ? "text-emerald-400" : "text-red-400";
                  break;
                case "riskReward":
                  value = tradingStats.riskRewardRatio;
                  displayValue = value.toFixed(2);
                  colorClass = value >= 1.5 ? "text-emerald-400" : value >= 1 ? "text-amber-400" : "text-red-400";
                  break;
                case "sharpe":
                  value = tradingStats.sharpeRatio;
                  displayValue = value.toFixed(2);
                  colorClass = value >= 2 ? "text-emerald-400" : value >= 1 ? "text-amber-400" : "text-red-400";
                  break;
                case "avgTrade":
                  value = tradingStats.allTimeTrades > 0 ? tradingStats.allTimePnl / tradingStats.allTimeTrades : 0;
                  displayValue = `$${value.toFixed(0)}`;
                  colorClass = value >= 0 ? "text-emerald-400" : "text-red-400";
                  break;
                case "maxDrawdown":
                  value = tradingStats.maxDrawdownPercent;
                  displayValue = `${value.toFixed(1)}%`;
                  colorClass = value <= 10 ? "text-emerald-400" : value <= 20 ? "text-amber-400" : "text-red-400";
                  break;
                case "currentDrawdown":
                  value = tradingStats.currentDrawdownPercent;
                  displayValue = `${value.toFixed(1)}%`;
                  colorClass = value <= 5 ? "text-foreground" : value <= 15 ? "text-amber-400" : "text-red-400";
                  break;
                case "recoveryFactor":
                  value = tradingStats.recoveryFactor;
                  displayValue = value >= 10 ? ">10" : value.toFixed(1);
                  colorClass = value >= 3 ? "text-emerald-400" : value >= 1 ? "text-amber-400" : "text-red-400";
                  break;
                case "winDays":
                  displayValue = `${tradingStats.winDays}/${tradingStats.lossDays}`;
                  colorClass = "text-foreground";
                  break;
                case "avgWin":
                  value = tradingStats.avgWin;
                  displayValue = `$${value.toFixed(0)}`;
                  colorClass = "text-emerald-400";
                  break;
                case "avgLoss":
                  value = tradingStats.avgLoss;
                  displayValue = `$${value.toFixed(0)}`;
                  colorClass = "text-red-400";
                  break;
                case "bestTrade":
                  value = tradingStats.sortedTrades.length > 0 ? Math.max(...tradingStats.sortedTrades.map(t => t.pnl)) : 0;
                  displayValue = `$${value.toFixed(0)}`;
                  colorClass = "text-emerald-400";
                  break;
                case "worstTrade":
                  value = tradingStats.sortedTrades.length > 0 ? Math.min(...tradingStats.sortedTrades.map(t => t.pnl)) : 0;
                  displayValue = `$${value.toFixed(0)}`;
                  colorClass = "text-red-400";
                  break;
                case "totalTrades":
                  value = tradingStats.allTimeTrades;
                  displayValue = value.toString();
                  colorClass = "text-foreground";
                  break;
                case "winningTrades":
                  value = tradingStats.winningTrades;
                  displayValue = value.toString();
                  colorClass = "text-emerald-400";
                  break;
                case "losingTrades":
                  value = tradingStats.losingTrades;
                  displayValue = value.toString();
                  colorClass = "text-red-400";
                  break;
                case "netPnl":
                  value = tradingStats.allTimePnl;
                  displayValue = `$${value.toFixed(0)}`;
                  colorClass = value >= 0 ? "text-emerald-400" : "text-red-400";
                  break;
                case "currentStreak":
                  value = tradingStats.currentStreak;
                  displayValue = value > 0 ? `${value}${tradingStats.currentStreakType === "win" ? "W" : "L"}` : "—";
                  colorClass = tradingStats.currentStreakType === "win" ? "text-emerald-400" : tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted";
                  break;
                case "bestStreak":
                  value = tradingStats.longestWinStreak;
                  displayValue = `${value}W`;
                  colorClass = "text-emerald-400";
                  break;
                case "worstStreak":
                  value = tradingStats.longestLossStreak;
                  displayValue = `${value}L`;
                  colorClass = "text-red-400";
                  break;
                case "consistencyScore":
                  value = tradingStats.consistencyScore;
                  displayValue = value.toFixed(0);
                  colorClass = value >= 70 ? "text-emerald-400" : value >= 50 ? "text-amber-400" : "text-red-400";
                  break;
              }

              // Determine background based on colorLogic
              let bgClass = "bg-card/50 border-border/50";
              if (metric.colorLogic === "positive" && typeof value === "number") {
                bgClass = value >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20";
              } else if (metric.colorLogic === "negative") {
                bgClass = "bg-amber-500/5 border-amber-500/20";
              }

              return (
                <div
                  key={metricId}
                  className={`relative group text-center p-2.5 rounded-lg border ${bgClass}`}
                >
                  <div className="flex items-center justify-center gap-1 text-[9px] text-muted uppercase mb-0.5">
                    <span>{metric.shortName}</span>
                    <Info className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 cursor-help transition-opacity" />
                  </div>

                  {/* Tooltip - positioned relative to the metric card */}
                  <div className={`absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 pointer-events-none ${
                    isTopRow ? "bottom-full mb-2" : "top-full mt-2"
                  } ${
                    isLeftEdge ? "left-0" : isRightEdge ? "right-0" : "left-1/2 -translate-x-1/2"
                  }`}>
                    {/* Arrow */}
                    <div className={`absolute w-3 h-3 bg-slate-900 border-accent/50 ${
                      isTopRow
                        ? "-bottom-1.5 border-r-2 border-b-2 rotate-45"
                        : "-top-1.5 border-l-2 border-t-2 rotate-45"
                    } ${
                      isLeftEdge ? "left-4" : isRightEdge ? "right-4" : "left-1/2 -translate-x-1/2"
                    }`}></div>
                    <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[200px]">
                          <div className="text-sm font-semibold text-foreground mb-1">{metric.name}</div>
                          {(() => {
                            // Render metric-specific visual tooltip
                            switch (metricId) {
                              case "winRate":
                                const wins = tradingStats.winningTrades;
                                const total = tradingStats.allTimeTrades;
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">Wins ÷ Total Trades × 100</div>
                                    <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className="text-emerald-400 font-medium">{wins}</span>
                                      <span className="text-muted/70">÷</span>
                                      <span className="text-muted font-medium">{total}</span>
                                      <span className="text-muted/70">=</span>
                                      <span className={`font-bold text-lg ${tradingStats.winRate >= 50 ? "text-emerald-400" : "text-amber-400"}`}>{tradingStats.winRate.toFixed(1)}%</span>
                                    </div>
                                    <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 ${tradingStats.winRate >= 55 ? "text-emerald-400/80" : tradingStats.winRate >= 45 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                      {tradingStats.winRate >= 55 ? "✓ Strong win rate" : tradingStats.winRate >= 45 ? "○ Average, check R:R" : "✗ Low - needs improvement"}
                                    </div>
                                  </>
                                );
                              case "profitFactor":
                                const grossProfit = tradingStats.avgWin * tradingStats.winningTrades;
                                const grossLoss = tradingStats.avgLoss * tradingStats.losingTrades;
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">Gross Profit ÷ Gross Loss</div>
                                    <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className="text-emerald-400 font-medium">${grossProfit.toFixed(0)}</span>
                                      <span className="text-muted/70">÷</span>
                                      <span className="text-red-400 font-medium">${grossLoss.toFixed(0)}</span>
                                      <span className="text-muted/70">=</span>
                                      <span className={`font-bold text-lg ${tradingStats.profitFactor >= 1 ? "text-emerald-400" : "text-red-400"}`}>{tradingStats.profitFactor.toFixed(2)}</span>
                                    </div>
                                    <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 ${tradingStats.profitFactor >= 1.5 ? "text-emerald-400/80" : tradingStats.profitFactor >= 1 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                      {tradingStats.profitFactor >= 2 ? "✓ Excellent! Above 2.0" : tradingStats.profitFactor >= 1.5 ? "✓ Good! Above 1.5" : tradingStats.profitFactor >= 1 ? "○ Profitable" : "✗ Losing money"}
                                    </div>
                                  </>
                                );
                              case "expectancy":
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">(Win% × AvgWin) − (Loss% × AvgLoss)</div>
                                    <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2 gap-2">
                                      <span className="text-emerald-400 font-medium">${tradingStats.avgWin.toFixed(0)}</span>
                                      <span className="text-muted/70">−</span>
                                      <span className="text-red-400 font-medium">${tradingStats.avgLoss.toFixed(0)}</span>
                                      <span className="text-muted/70">→</span>
                                      <span className={`font-bold text-lg ${tradingStats.expectancy >= 0 ? "text-emerald-400" : "text-red-400"}`}>${tradingStats.expectancy.toFixed(0)}</span>
                                    </div>
                                    <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 ${tradingStats.expectancy > 50 ? "text-emerald-400/80" : tradingStats.expectancy > 0 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                      {tradingStats.expectancy > 50 ? "✓ Strong edge per trade" : tradingStats.expectancy > 0 ? "○ Positive expectancy" : "✗ Negative - losing strategy"}
                                    </div>
                                  </>
                                );
                              case "riskReward":
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">Avg Win ÷ Avg Loss</div>
                                    <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className="text-emerald-400 font-medium">${tradingStats.avgWin.toFixed(0)}</span>
                                      <span className="text-muted/70">÷</span>
                                      <span className="text-red-400 font-medium">${tradingStats.avgLoss.toFixed(0)}</span>
                                      <span className="text-muted/70">=</span>
                                      <span className={`font-bold text-lg ${tradingStats.riskRewardRatio >= 1 ? "text-emerald-400" : "text-amber-400"}`}>{tradingStats.riskRewardRatio.toFixed(2)}</span>
                                    </div>
                                    <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 ${tradingStats.riskRewardRatio >= 2 ? "text-emerald-400/80" : tradingStats.riskRewardRatio >= 1 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                      {tradingStats.riskRewardRatio >= 2 ? "✓ Great! 2:1 or better" : tradingStats.riskRewardRatio >= 1 ? "○ Acceptable ratio" : "✗ Risking more than reward"}
                                    </div>
                                  </>
                                );
                              case "sharpe":
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">Risk-adjusted returns</div>
                                    <div className="flex items-center justify-center text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className={`font-bold text-xl ${tradingStats.sharpeRatio >= 1 ? "text-emerald-400" : "text-amber-400"}`}>{tradingStats.sharpeRatio.toFixed(2)}</span>
                                    </div>
                                    <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 ${tradingStats.sharpeRatio >= 2 ? "text-emerald-400/80" : tradingStats.sharpeRatio >= 1 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                      {tradingStats.sharpeRatio >= 2 ? "✓ Excellent risk-adjusted" : tradingStats.sharpeRatio >= 1 ? "○ Acceptable" : "✗ High risk for returns"}
                                    </div>
                                  </>
                                );
                              case "maxDrawdown":
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">Largest peak-to-trough drop</div>
                                    <div className="flex items-center justify-center text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className={`font-bold text-xl ${tradingStats.maxDrawdownPercent <= 15 ? "text-emerald-400" : tradingStats.maxDrawdownPercent <= 25 ? "text-amber-400" : "text-red-400"}`}>{tradingStats.maxDrawdownPercent.toFixed(1)}%</span>
                                    </div>
                                    <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 ${tradingStats.maxDrawdownPercent <= 15 ? "text-emerald-400/80" : tradingStats.maxDrawdownPercent <= 25 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                      {tradingStats.maxDrawdownPercent <= 10 ? "✓ Excellent risk control" : tradingStats.maxDrawdownPercent <= 20 ? "○ Manageable drawdown" : "✗ High risk exposure"}
                                    </div>
                                  </>
                                );
                              case "avgWin":
                              case "avgLoss":
                                const isWin = metricId === "avgWin";
                                const avgVal = isWin ? tradingStats.avgWin : tradingStats.avgLoss;
                                const count = isWin ? tradingStats.winningTrades : tradingStats.losingTrades;
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">Total {isWin ? "profit" : "loss"} ÷ {isWin ? "winners" : "losers"}</div>
                                    <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className="text-muted font-medium">{count} trades</span>
                                      <span className="text-muted/70">→</span>
                                      <span className={`font-bold text-lg ${isWin ? "text-emerald-400" : "text-red-400"}`}>${avgVal.toFixed(0)}</span>
                                    </div>
                                  </>
                                );
                              case "bestTrade":
                              case "worstTrade":
                                const isBest = metricId === "bestTrade";
                                const tradeVal = tradingStats.sortedTrades.length > 0
                                  ? (isBest ? Math.max(...tradingStats.sortedTrades.map(t => t.pnl)) : Math.min(...tradingStats.sortedTrades.map(t => t.pnl)))
                                  : 0;
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">{isBest ? "Largest single win" : "Largest single loss"}</div>
                                    <div className="flex items-center justify-center text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className={`font-bold text-xl ${isBest ? "text-emerald-400" : "text-red-400"}`}>${tradeVal.toFixed(0)}</span>
                                    </div>
                                  </>
                                );
                              case "recoveryFactor":
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">Net Profit ÷ Max Drawdown</div>
                                    <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className="text-emerald-400 font-medium">${tradingStats.allTimePnl.toFixed(0)}</span>
                                      <span className="text-muted/70">÷</span>
                                      <span className="text-red-400 font-medium">${(tradingStats.maxDrawdownPercent * tradingStats.allTimePnl / 100).toFixed(0)}</span>
                                      <span className="text-muted/70">=</span>
                                      <span className={`font-bold text-lg ${tradingStats.recoveryFactor >= 3 ? "text-emerald-400" : "text-amber-400"}`}>{tradingStats.recoveryFactor >= 10 ? ">10" : tradingStats.recoveryFactor.toFixed(1)}</span>
                                    </div>
                                    <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 ${tradingStats.recoveryFactor >= 3 ? "text-emerald-400/80" : tradingStats.recoveryFactor >= 1 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                      {tradingStats.recoveryFactor >= 5 ? "✓ Excellent recovery" : tradingStats.recoveryFactor >= 2 ? "○ Good recovery" : "✗ Slow recovery"}
                                    </div>
                                  </>
                                );
                              default:
                                // Simple tooltip for other metrics
                                return (
                                  <>
                                    <div className="text-[11px] text-muted mb-3">{metric.tooltip.split('.')[0]}.</div>
                                    <div className="flex items-center justify-center text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                      <span className={`font-bold text-xl ${colorClass}`}>{displayValue}</span>
                                    </div>
                                  </>
                                );
                            }
                          })()}
                    </div>
                  </div>

                  <div className={`text-base font-bold ${colorClass}`}>
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Streaks & YoY Row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Streaks */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card/30 border border-border/30">
              <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div className="flex items-center gap-3 text-xs">
                <div>
                  <span className="text-muted">Current: </span>
                  <span className={`font-bold ${tradingStats.currentStreakType === "win" ? "text-emerald-400" : tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted"}`}>
                    {tradingStats.currentStreak > 0 ? `${tradingStats.currentStreak}${tradingStats.currentStreakType === "win" ? "W" : "L"}` : "—"}
                  </span>
                </div>
                <span className="text-border">|</span>
                <div>
                  <span className="text-muted">Best: </span>
                  <span className="font-bold text-emerald-400">{tradingStats.longestWinStreak}W</span>
                </div>
                <span className="text-border">|</span>
                <div>
                  <span className="text-muted">Worst: </span>
                  <span className="font-bold text-red-400">{tradingStats.longestLossStreak}L</span>
                </div>
              </div>
            </div>
            {/* YoY */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card/30 border border-border/30">
              <Calendar className="w-4 h-4 text-accent-light flex-shrink-0" />
              <div className="flex items-center gap-2 text-xs">
                <div>
                  <span className="text-muted">{tradingStats.currentYear}: </span>
                  <span className={`font-bold ${tradingStats.ytdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${tradingStats.ytdPnl.toFixed(0)}
                  </span>
                </div>
                <span className="text-border">vs</span>
                <div>
                  <span className="text-muted">{tradingStats.lastYear}: </span>
                  <span className={`font-bold ${tradingStats.lastYearPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${tradingStats.lastYearPnl.toFixed(0)}
                  </span>
                </div>
                {tradingStats.lastYearPnl !== 0 && (
                  <span className={`font-medium ${tradingStats.ytdPnl >= tradingStats.lastYearPnl ? "text-emerald-400" : "text-red-400"}`}>
                    ({tradingStats.ytdPnl >= tradingStats.lastYearPnl ? "+" : ""}{(((tradingStats.ytdPnl - tradingStats.lastYearPnl) / Math.abs(tradingStats.lastYearPnl)) * 100).toFixed(0)}%)
                  </span>
                )}
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
        <EventCorrelation trades={trades} />
      </div>

      {/* TRADE HISTORY - Collapsible with Pagination */}
      <div className="glass rounded-xl border border-border/50">
        <button
          onClick={() => setShowRecentTrades(!showRecentTrades)}
          className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors rounded-xl"
        >
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-light" />
            Trade History
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
            {/* Pagination Controls - Top */}
            {tradingStats.sortedTrades.length > tradesPerPage && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                <div className="text-xs text-muted">
                  Showing trades {Math.min((recentTradesPage - 1) * tradesPerPage + 1, tradingStats.sortedTrades.length)}-{Math.min(recentTradesPage * tradesPerPage, tradingStats.sortedTrades.length)} of {tradingStats.sortedTrades.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRecentTradesPage(1)}
                    disabled={recentTradesPage === 1}
                    className="p-1.5 rounded hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRecentTradesPage(p => Math.max(1, p - 1))}
                    disabled={recentTradesPage === 1}
                    className="p-1.5 rounded hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs px-2">
                    Page {recentTradesPage} of {Math.ceil(tradingStats.sortedTrades.length / tradesPerPage)}
                  </span>
                  <button
                    onClick={() => setRecentTradesPage(p => Math.min(Math.ceil(tradingStats.sortedTrades.length / tradesPerPage), p + 1))}
                    disabled={recentTradesPage >= Math.ceil(tradingStats.sortedTrades.length / tradesPerPage)}
                    className="p-1.5 rounded hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRecentTradesPage(Math.ceil(tradingStats.sortedTrades.length / tradesPerPage))}
                    disabled={recentTradesPage >= Math.ceil(tradingStats.sortedTrades.length / tradesPerPage)}
                    className="p-1.5 rounded hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-xs text-muted font-medium w-12">#</th>
                    <th className="text-left py-2 px-2 text-xs text-muted font-medium">Date</th>
                    <th className="text-left py-2 px-2 text-xs text-muted font-medium">Ticker</th>
                    <th className="text-left py-2 px-2 text-xs text-muted font-medium">Type</th>
                    <th className="text-left py-2 px-2 text-xs text-muted font-medium">Side</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium">Entry</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium">Exit</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium">P&L</th>
                    <th className="text-center py-2 px-2 text-xs text-muted font-medium w-10">W/L</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Sort trades newest first and paginate
                    const sortedDesc = [...tradingStats.sortedTrades].reverse();
                    const startIdx = (recentTradesPage - 1) * tradesPerPage;
                    const paginatedTrades = sortedDesc.slice(startIdx, startIdx + tradesPerPage);
                    const totalTrades = tradingStats.sortedTrades.length;

                    return paginatedTrades.map((trade, idx) => {
                      const tradeNumber = totalTrades - startIdx - idx;
                      const assetColors: Record<string, string> = {
                        STOCK: "bg-blue-500/20 text-blue-400",
                        OPTIONS: "bg-purple-500/20 text-purple-400",
                        FUTURES: "bg-amber-500/20 text-amber-400",
                        FOREX: "bg-emerald-500/20 text-emerald-400",
                        CRYPTO: "bg-orange-500/20 text-orange-400",
                      };

                      return (
                        <tr key={trade.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                          <td className="py-2 px-2 text-muted text-xs">{tradeNumber}</td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            <div className="text-sm">{trade.date}</div>
                            {trade.time && <div className="text-xs text-muted">{trade.time}</div>}
                          </td>
                          <td className="py-2 px-2 font-medium">{trade.ticker}</td>
                          <td className="py-2 px-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${assetColors[trade.assetType] || "bg-gray-500/20 text-gray-400"}`}>
                              {trade.assetType}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            }`}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-muted">
                            {trade.entryPrice ? `$${trade.entryPrice.toFixed(2)}` : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-muted">
                            {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : "-"}
                          </td>
                          <td className={`py-2 px-2 text-right font-medium ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {trade.pnl > 0 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">W</span>
                            ) : trade.pnl < 0 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">L</span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Bottom */}
            {tradingStats.sortedTrades.length > tradesPerPage && (
              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border/50">
                <button
                  onClick={() => setRecentTradesPage(1)}
                  disabled={recentTradesPage === 1}
                  className="p-1.5 rounded hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRecentTradesPage(p => Math.max(1, p - 1))}
                  disabled={recentTradesPage === 1}
                  className="px-3 py-1.5 rounded hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <span className="text-sm px-3">
                  {recentTradesPage} / {Math.ceil(tradingStats.sortedTrades.length / tradesPerPage)}
                </span>
                <button
                  onClick={() => setRecentTradesPage(p => Math.min(Math.ceil(tradingStats.sortedTrades.length / tradesPerPage), p + 1))}
                  disabled={recentTradesPage >= Math.ceil(tradingStats.sortedTrades.length / tradesPerPage)}
                  className="px-3 py-1.5 rounded hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
                <button
                  onClick={() => setRecentTradesPage(Math.ceil(tradingStats.sortedTrades.length / tradesPerPage))}
                  disabled={recentTradesPage >= Math.ceil(tradingStats.sortedTrades.length / tradesPerPage)}
                  className="p-1.5 rounded hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
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

      {/* Metrics Settings Modal */}
      {showMetricsSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMetricsSettings(false)}>
          <div className="w-full max-w-2xl glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent-light" />
                  Customize Key Metrics
                </h3>
                <p className="text-xs text-muted mt-0.5">Select up to 15 metrics to display. Drag to reorder.</p>
              </div>
              <button onClick={() => setShowMetricsSettings(false)} className="p-1.5 rounded-lg hover:bg-card-hover transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Selected Metrics */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Selected Metrics ({selectedMetrics.length}/10)</h4>
                  <button
                    onClick={() => setSelectedMetrics(DEFAULT_METRIC_IDS)}
                    className="text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedMetrics.map((metricId) => {
                    const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                    if (!metric) return null;
                    return (
                      <button
                        key={metricId}
                        onClick={() => setSelectedMetrics(prev => prev.filter(id => id !== metricId))}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 transition-colors group"
                      >
                        {metric.shortName}
                        <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                  {selectedMetrics.length === 0 && (
                    <span className="text-xs text-muted italic">No metrics selected</span>
                  )}
                </div>
              </div>

              {/* Available Metrics by Category */}
              {(["performance", "risk", "trade", "streak"] as const).map((category) => {
                const categoryMetrics = AVAILABLE_METRICS.filter(m => m.category === category);
                const categoryNames = {
                  performance: "Performance Metrics",
                  risk: "Risk Metrics",
                  trade: "Trade Metrics",
                  streak: "Streak Metrics",
                };
                return (
                  <div key={category} className="mb-4">
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{categoryNames[category]}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categoryMetrics.map((metric) => {
                        const isSelected = selectedMetrics.includes(metric.id);
                        return (
                          <button
                            key={metric.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedMetrics(prev => prev.filter(id => id !== metric.id));
                              } else if (selectedMetrics.length < 10) {
                                setSelectedMetrics(prev => [...prev, metric.id]);
                              }
                            }}
                            disabled={!isSelected && selectedMetrics.length >= 10}
                            className={`relative p-2.5 rounded-lg border text-left transition-all ${
                              isSelected
                                ? "bg-accent/10 border-accent/30 text-foreground"
                                : selectedMetrics.length >= 10
                                  ? "bg-card/30 border-border/30 text-muted cursor-not-allowed opacity-50"
                                  : "bg-card/50 border-border/50 text-foreground hover:bg-card-hover hover:border-border"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">{metric.shortName}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-accent" />
                              )}
                            </div>
                            <p className="text-[10px] text-muted mt-1 line-clamp-2 leading-relaxed">
                              {metric.tooltip.split('.')[0]}.
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => setShowMetricsSettings(false)}
                className="w-full py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Done
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
