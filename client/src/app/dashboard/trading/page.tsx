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
  GripVertical,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp as TrendUp,
  Shield,
  Brain,
  Lightbulb,
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  getValue?: (stats: TradingStatsType) => number;
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

// Sortable wrapper for metric cards
interface SortableMetricProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function SortableMetric({ id, children, className }: SortableMetricProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={className}
    >
      {children}
    </div>
  );
}

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
  const [goalInput, setGoalInput] = useState({ yearly: "", startingEquity: "" });

  // Consistency settings - customizable thresholds
  const [showConsistencySettings, setShowConsistencySettings] = useState(false);
  const [showTradingAudit, setShowTradingAudit] = useState(false);
  const [consistencySettings, setConsistencySettings] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("consistencySettings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Default values
        }
      }
    }
    return {
      winRateTarget: 60,      // Target win rate for max score (default 60%)
      profitFactorTarget: 2,  // Target profit factor for max score (default 2.0)
      maxDrawdownLimit: 25,   // Max acceptable drawdown (default 25%)
      streakTarget: 10,       // Target win streak for max score (default 10)
    };
  });
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

  // Drag and drop sensors for Key Metrics
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering metrics
  const handleMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedMetrics((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem("tradingMetrics", JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

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
      const yearlyGoal = parsed.yearlyPnlGoal || 0;
      setGoals({
        yearlyPnlGoal: yearlyGoal,
        monthlyPnlGoal: yearlyGoal / 12, // Always derive from yearly
        startingEquity: parsed.startingEquity || 0,
      });
      setGoalInput({
        yearly: yearlyGoal > 0 ? yearlyGoal.toString() : "",
        startingEquity: parsed.startingEquity > 0 ? parsed.startingEquity.toString() : "",
      });
    }
  }, []);

  // Save goals
  const saveGoals = () => {
    const yearlyGoal = parseFloat(goalInput.yearly) || 0;
    const newGoals = {
      yearlyPnlGoal: yearlyGoal,
      monthlyPnlGoal: yearlyGoal / 12, // Auto-calculate from yearly
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

    // Consistency factors - using customizable thresholds
    const { winRateTarget, profitFactorTarget, maxDrawdownLimit, streakTarget } = consistencySettings;
    const winRateScore = Math.min((winRate / winRateTarget) * 25, 25); // Max 25 points at target win rate
    const profitFactorScore = Math.min((profitFactor / profitFactorTarget) * 25, 25); // Max 25 points at target PF
    const drawdownScore = Math.max(25 - (maxDrawdownPercent / maxDrawdownLimit * 25), 0); // Lose points for high drawdown
    const streakScore = Math.min((longestWinStreak / streakTarget) * 25, 25); // Max 25 at target streak

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
  }, [trades, effectiveStartingEquity, consistencySettings]);

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

      {/* GOALS & PERFORMANCE */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/30 to-transparent p-5 space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Goals & Performance</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGoalSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors"
            >
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Goals</span>
            </button>
            <button
              onClick={() => setShowTradingAudit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition-colors"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">Audit</span>
            </button>
          </div>
        </div>

        {/* Main Grid - P&L and Stats left, Consistency right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Side - P&L + Stats (2 cols) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {/* P&L Card */}
            <div className="p-4 rounded-xl bg-card/50 border border-border/30">
              <div className="text-xs text-muted uppercase tracking-wide mb-2">Total P&L</div>
              <div className={`text-2xl font-bold mb-2 ${tradingStats.allTimePnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {tradingStats.allTimePnl >= 0 ? '+' : ''}${tradingStats.allTimePnl.toLocaleString()}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">YTD</span>
                  <span className={tradingStats.ytdPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>${tradingStats.ytdPnl.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">MTD</span>
                  <span className={tradingStats.mtdPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>${tradingStats.mtdPnl.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Trades</span>
                  <span>{tradingStats.allTimeTrades}</span>
                </div>
              </div>
            </div>

            {/* Key Stats Card */}
            <div className="p-4 rounded-xl bg-card/50 border border-border/30">
              <div className="text-xs text-muted uppercase tracking-wide mb-2">Key Stats</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted">Win Rate</span>
                  <span className={`text-sm font-bold ${tradingStats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {tradingStats.winRate.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted">Profit Factor</span>
                  <span className={`text-sm font-bold ${tradingStats.profitFactor >= 1.5 ? 'text-emerald-400' : tradingStats.profitFactor >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                    {tradingStats.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted">Expectancy</span>
                  <span className={`text-sm font-bold ${tradingStats.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${tradingStats.expectancy.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted">Max Drawdown</span>
                  <span className={`text-sm font-bold ${tradingStats.maxDrawdownPercent <= 15 ? 'text-emerald-400' : tradingStats.maxDrawdownPercent <= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                    {tradingStats.maxDrawdownPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Goals Progress (if set) - spans both columns */}
            {(goals.yearlyPnlGoal > 0 || goals.monthlyPnlGoal > 0) && (
              <div className="col-span-2 p-4 rounded-xl bg-card/50 border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Goal Progress</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${goalProgress?.onTrack ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {goalProgress?.onTrack ? "On Track" : "Behind Pace"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted">Yearly</span>
                      <span className={tradingStats.ytdPnl >= 0 ? "text-foreground" : "text-red-400"}>
                        {tradingStats.ytdPnl < 0 ? "-" : ""}${Math.abs(tradingStats.ytdPnl).toFixed(0)} / ${goals.yearlyPnlGoal.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-2 bg-card rounded-full overflow-hidden relative">
                      {tradingStats.ytdPnl >= 0 ? (
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(goalProgress?.yearlyProgress || 0, 100)}%` }} />
                      ) : (
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(Math.abs(tradingStats.ytdPnl) / goals.yearlyPnlGoal * 100, 100)}%` }} />
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted">Monthly</span>
                      <span className={tradingStats.mtdPnl >= 0 ? "text-foreground" : "text-red-400"}>
                        {tradingStats.mtdPnl < 0 ? "-" : ""}${Math.abs(tradingStats.mtdPnl).toFixed(0)} / ${goals.monthlyPnlGoal.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-2 bg-card rounded-full overflow-hidden relative">
                      {tradingStats.mtdPnl >= 0 ? (
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(goalProgress?.monthlyProgress || 0, 100)}%` }} />
                      ) : (
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(Math.abs(tradingStats.mtdPnl) / goals.monthlyPnlGoal * 100, 100)}%` }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Consistency Score */}
          <div className="p-4 rounded-xl bg-card/50 border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted uppercase tracking-wide">Consistency Score</span>
              <button
                onClick={() => setShowConsistencySettings(true)}
                className="p-1 rounded hover:bg-card-hover transition-colors"
                title="Customize thresholds"
              >
                <Settings className="w-3.5 h-3.5 text-muted/50 hover:text-muted" />
              </button>
            </div>

            {/* Score Circle */}
            <div className="flex justify-center mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-card"
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
                  <span className={`text-2xl font-bold ${consistencyGrade.color}`}>{consistencyGrade.grade}</span>
                  <span className="text-[10px] text-muted">{tradingStats.consistencyScore}/100</span>
                </div>
              </div>
            </div>

            {/* Metric Breakdown Bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted">Win Rate</span>
                  <span className={tradingStats.winRate >= consistencySettings.winRateTarget * 0.8 ? "text-emerald-400" : "text-amber-400"}>
                    {tradingStats.winRate.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 bg-card rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(tradingStats.winRateScore / 25) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted">Profit Factor</span>
                  <span className={tradingStats.profitFactor >= 1.5 ? "text-emerald-400" : "text-amber-400"}>
                    {tradingStats.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="h-1.5 bg-card rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(tradingStats.profitFactorScore / 25) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted">Drawdown</span>
                  <span className={tradingStats.maxDrawdownPercent <= 15 ? "text-emerald-400" : "text-amber-400"}>
                    {tradingStats.maxDrawdownPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-card rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(tradingStats.drawdownScore / 25) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted">Win Streak</span>
                  <span className="text-purple-400">{tradingStats.longestWinStreak}W</span>
                </div>
                <div className="h-1.5 bg-card rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(tradingStats.streakScore / 25) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADDITIONAL METRICS */}
      <div className="glass rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">Additional Metrics</span>
          <button
            onClick={() => setShowMetricsSettings(true)}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            Customize
          </button>
        </div>
        <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleMetricDragEnd}
            >
              <SortableContext items={selectedMetrics} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {selectedMetrics.map((metricId, index) => {
                    const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                    if (!metric) return null;

                    const numCols = 5;
                    const row = Math.floor(index / numCols);
                    const col = index % numCols;
                    const isTopRow = row === 0;
                    const isLeftEdge = col === 0;
                    const isRightEdge = col === numCols - 1;

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

                    let bgClass = "bg-card/50 border-border/50";
                    if (metric.colorLogic === "positive" && typeof value === "number") {
                      bgClass = value >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20";
                    } else if (metric.colorLogic === "negative") {
                      bgClass = "bg-amber-500/5 border-amber-500/20";
                    }

                    // Build calculation breakdown for this metric
                    const getCalculationBreakdown = () => {
                      switch (metricId) {
                        case "winRate":
                          return {
                            left: { value: tradingStats.winningTrades.toString(), label: "Wins", color: "text-emerald-400" },
                            right: { value: tradingStats.allTimeTrades.toString(), label: "Total", color: "text-foreground" },
                            operator: "÷",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        case "profitFactor":
                          const grossProfit = tradingStats.avgWin * tradingStats.winningTrades;
                          const grossLoss = tradingStats.avgLoss * tradingStats.losingTrades;
                          return {
                            left: { value: `$${grossProfit.toFixed(0)}`, label: "Gross Profit", color: "text-emerald-400" },
                            right: { value: `$${grossLoss.toFixed(0)}`, label: "Gross Loss", color: "text-red-400" },
                            operator: "÷",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        case "expectancy":
                          return {
                            left: { value: `${tradingStats.winRate.toFixed(0)}% × $${tradingStats.avgWin.toFixed(0)}`, label: "Win Side", color: "text-emerald-400" },
                            right: { value: `${(100 - tradingStats.winRate).toFixed(0)}% × $${tradingStats.avgLoss.toFixed(0)}`, label: "Loss Side", color: "text-red-400" },
                            operator: "−",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        case "riskReward":
                          return {
                            left: { value: `$${tradingStats.avgWin.toFixed(0)}`, label: "Avg Win", color: "text-emerald-400" },
                            right: { value: `$${tradingStats.avgLoss.toFixed(0)}`, label: "Avg Loss", color: "text-red-400" },
                            operator: "÷",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        case "maxDrawdown":
                        case "currentDrawdown":
                          return {
                            left: { value: "Peak − Trough", label: "Decline", color: "text-red-400" },
                            right: { value: "Peak", label: "From High", color: "text-foreground" },
                            operator: "÷",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        case "recoveryFactor":
                          return {
                            left: { value: `$${tradingStats.allTimePnl.toFixed(0)}`, label: "Net Profit", color: tradingStats.allTimePnl >= 0 ? "text-emerald-400" : "text-red-400" },
                            right: { value: `${tradingStats.maxDrawdownPercent.toFixed(1)}%`, label: "Max DD", color: "text-red-400" },
                            operator: "÷",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        case "avgWin":
                          return {
                            left: { value: `$${(tradingStats.avgWin * tradingStats.winningTrades).toFixed(0)}`, label: "Total Wins", color: "text-emerald-400" },
                            right: { value: tradingStats.winningTrades.toString(), label: "# Wins", color: "text-foreground" },
                            operator: "÷",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        case "avgLoss":
                          return {
                            left: { value: `$${(tradingStats.avgLoss * tradingStats.losingTrades).toFixed(0)}`, label: "Total Losses", color: "text-red-400" },
                            right: { value: tradingStats.losingTrades.toString(), label: "# Losses", color: "text-foreground" },
                            operator: "÷",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        case "avgTrade":
                          return {
                            left: { value: `$${tradingStats.allTimePnl.toFixed(0)}`, label: "Net P&L", color: tradingStats.allTimePnl >= 0 ? "text-emerald-400" : "text-red-400" },
                            right: { value: tradingStats.allTimeTrades.toString(), label: "Trades", color: "text-foreground" },
                            operator: "÷",
                            result: displayValue,
                            resultColor: colorClass
                          };
                        default:
                          return null;
                      }
                    };

                    // Get contextual feedback
                    const getFeedback = () => {
                      switch (metricId) {
                        case "winRate":
                          return tradingStats.winRate >= 60 ? { icon: "✓", text: "Excellent win rate!", color: "text-emerald-400/80" } :
                                 tradingStats.winRate >= 50 ? { icon: "✓", text: "Good! Above 50% threshold", color: "text-emerald-400/80" } :
                                 tradingStats.winRate >= 40 ? { icon: "○", text: "Acceptable if R:R is high", color: "text-yellow-400/80" } :
                                 { icon: "✗", text: "Below optimal - review setups", color: "text-red-400/80" };
                        case "profitFactor":
                          return tradingStats.profitFactor >= 2 ? { icon: "✓", text: "Excellent! Above 2 is very strong", color: "text-emerald-400/80" } :
                                 tradingStats.profitFactor >= 1.5 ? { icon: "✓", text: "Good! Above 1.5 is solid", color: "text-emerald-400/80" } :
                                 tradingStats.profitFactor >= 1 ? { icon: "○", text: "Profitable, room to improve", color: "text-yellow-400/80" } :
                                 { icon: "✗", text: "Losing money - review strategy", color: "text-red-400/80" };
                        case "expectancy":
                          return typeof value === "number" && value >= 100 ? { icon: "✓", text: "Strong positive expectancy!", color: "text-emerald-400/80" } :
                                 typeof value === "number" && value >= 0 ? { icon: "✓", text: "Positive - strategy is profitable", color: "text-emerald-400/80" } :
                                 { icon: "✗", text: "Negative - losing money per trade", color: "text-red-400/80" };
                        case "riskReward":
                          return tradingStats.riskRewardRatio >= 2 ? { icon: "✓", text: "Excellent! Wins are 2x+ losses", color: "text-emerald-400/80" } :
                                 tradingStats.riskRewardRatio >= 1.5 ? { icon: "✓", text: "Good ratio, wins exceed losses", color: "text-emerald-400/80" } :
                                 tradingStats.riskRewardRatio >= 1 ? { icon: "○", text: "Balanced, aim higher", color: "text-yellow-400/80" } :
                                 { icon: "✗", text: "Losses exceed wins - tighten stops", color: "text-red-400/80" };
                        case "maxDrawdown":
                          return tradingStats.maxDrawdownPercent <= 10 ? { icon: "✓", text: "Excellent risk management!", color: "text-emerald-400/80" } :
                                 tradingStats.maxDrawdownPercent <= 20 ? { icon: "○", text: "Acceptable, monitor closely", color: "text-yellow-400/80" } :
                                 { icon: "✗", text: "High risk - reduce position sizes", color: "text-red-400/80" };
                        case "currentDrawdown":
                          return tradingStats.currentDrawdownPercent <= 5 ? { icon: "✓", text: "Near equity highs!", color: "text-emerald-400/80" } :
                                 tradingStats.currentDrawdownPercent <= 15 ? { icon: "○", text: "In drawdown, stay disciplined", color: "text-yellow-400/80" } :
                                 { icon: "✗", text: "Deep drawdown - review risk", color: "text-red-400/80" };
                        case "sharpe":
                          return tradingStats.sharpeRatio >= 2 ? { icon: "✓", text: "Excellent risk-adjusted returns!", color: "text-emerald-400/80" } :
                                 tradingStats.sharpeRatio >= 1 ? { icon: "✓", text: "Good risk-adjusted performance", color: "text-emerald-400/80" } :
                                 { icon: "○", text: "Returns may not justify risk", color: "text-yellow-400/80" };
                        case "recoveryFactor":
                          return tradingStats.recoveryFactor >= 5 ? { icon: "✓", text: "Excellent recovery ability!", color: "text-emerald-400/80" } :
                                 tradingStats.recoveryFactor >= 3 ? { icon: "✓", text: "Good profit vs drawdown", color: "text-emerald-400/80" } :
                                 { icon: "○", text: "Work on limiting drawdowns", color: "text-yellow-400/80" };
                        default:
                          return null;
                      }
                    };

                    const calcBreakdown = getCalculationBreakdown();
                    const feedback = getFeedback();

                    return (
                      <SortableMetric
                        key={metricId}
                        id={metricId}
                        className={`relative group text-center p-2.5 rounded-lg border ${bgClass} hover:border-accent/50 transition-colors`}
                      >
                        <GripVertical className="w-3 h-3 absolute top-1 left-1 text-muted/30 group-hover:text-muted/60 transition-colors" />
                        <div className="flex items-center justify-center gap-1 text-[9px] text-muted uppercase mb-0.5">
                          <span>{metric.shortName}</span>
                          <Info className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 cursor-help transition-opacity" />
                        </div>

                        {/* Tooltip - Above for top row, below for bottom rows */}
                        <div className={`absolute ${isTopRow ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-[9999] pointer-events-none`}>
                          <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[240px]">
                            {/* Title */}
                            <div className="text-sm font-semibold text-foreground mb-1 text-left">{metric.name}</div>
                            {/* Description */}
                            <div className="text-[11px] text-muted mb-3 text-left">{metric.tooltip.split('.')[0]}.</div>

                            {/* Calculation Breakdown Box */}
                            {calcBreakdown && (
                              <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2 mb-2">
                                <span className={`font-medium ${calcBreakdown.left.color}`}>{calcBreakdown.left.value}</span>
                                <span className="text-muted/70">{calcBreakdown.operator}</span>
                                <span className={`font-medium ${calcBreakdown.right.color}`}>{calcBreakdown.right.value}</span>
                                <span className="text-muted/70">=</span>
                                <span className={`font-bold text-lg ${calcBreakdown.resultColor}`}>{calcBreakdown.result}</span>
                              </div>
                            )}

                            {/* Contextual Feedback */}
                            {feedback && (
                              <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${feedback.color}`}>
                                {feedback.icon} {feedback.text}
                              </div>
                            )}
                          </div>
                          {/* Arrow - points down when tooltip is above, points up when tooltip is below */}
                          <div className={`absolute left-4 w-3 h-3 bg-slate-900 border-accent/50 ${
                            isTopRow
                              ? '-bottom-1.5 border-r-2 border-b-2 rotate-45'
                              : '-top-1.5 border-l-2 border-t-2 rotate-45'
                          }`}></div>
                        </div>

                        <div className={`text-base font-bold ${colorClass}`}>
                          {displayValue}
                        </div>
                      </SortableMetric>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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

              {goalInput.yearly && parseFloat(goalInput.yearly) > 0 && (
                <div className="p-3 bg-card/50 rounded-lg border border-border/50">
                  <div className="text-xs text-muted mb-1">Monthly Target (auto-calculated)</div>
                  <div className="text-lg font-bold text-foreground">
                    ${(parseFloat(goalInput.yearly) / 12).toFixed(0)}/mo
                  </div>
                </div>
              )}

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

      {/* Consistency Settings Modal */}
      {showConsistencySettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConsistencySettings(false)}>
          <div className="w-full max-w-2xl glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                Consistency Rules
              </h3>
              <button onClick={() => setShowConsistencySettings(false)} className="p-1.5 rounded-lg hover:bg-card-hover transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-muted mb-2">
                Customize thresholds for your trading strategy. Each factor contributes 25 points to your consistency score.
              </p>

              <div className="grid grid-cols-2 gap-4">
              {/* Win Rate Target */}
              <div className="p-4 bg-card/30 rounded-lg border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-medium flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Win Rate Target
                  </label>
                  <span className="text-base font-bold text-emerald-400">{consistencySettings.winRateTarget}%</span>
                </div>
                <p className="text-xs text-muted mb-3">
                  You earn max points when your win rate reaches this target. <span className="text-emerald-400">Higher targets</span> are harder to achieve but reward consistent winning strategies.
                </p>
                <div className="relative h-2.5 mb-1">
                  <div className="absolute inset-0 bg-background rounded-full" />
                  <div
                    className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${((consistencySettings.winRateTarget - 30) / 60) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="30"
                    max="90"
                    value={consistencySettings.winRateTarget}
                    onChange={(e) => setConsistencySettings({ ...consistencySettings, winRateTarget: parseInt(e.target.value) })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all"
                    style={{ left: `calc(${((consistencySettings.winRateTarget - 30) / 60) * 100}% - 10px)` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted">
                  <span>30%</span>
                  <span>60%</span>
                  <span>90%</span>
                </div>
                <p className="text-[11px] text-muted/70 mt-2 italic">
                  💡 To improve: Focus on quality setups, avoid overtrading, wait for high-probability entries.
                </p>
              </div>

              {/* Profit Factor Target */}
              <div className="p-4 bg-card/30 rounded-lg border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-medium flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Profit Factor Target
                  </label>
                  <span className="text-base font-bold text-blue-400">{consistencySettings.profitFactorTarget.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted mb-3">
                  Ratio of gross profits to gross losses. <span className="text-blue-400">Above 1.0</span> means profitable. Set your target based on strategy style—scalpers aim for 1.5, swing traders for 2.0+.
                </p>
                <div className="relative h-2.5 mb-1">
                  <div className="absolute inset-0 bg-background rounded-full" />
                  <div
                    className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${((consistencySettings.profitFactorTarget - 1) / 4) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={consistencySettings.profitFactorTarget * 10}
                    onChange={(e) => setConsistencySettings({ ...consistencySettings, profitFactorTarget: parseInt(e.target.value) / 10 })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all"
                    style={{ left: `calc(${((consistencySettings.profitFactorTarget - 1) / 4) * 100}% - 10px)` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted">
                  <span>1.0</span>
                  <span>3.0</span>
                  <span>5.0</span>
                </div>
                <p className="text-[11px] text-muted/70 mt-2 italic">
                  💡 To improve: Let winners run longer, cut losers faster, maintain strict risk/reward on entries.
                </p>
              </div>

              {/* Max Drawdown Limit */}
              <div className="p-4 bg-card/30 rounded-lg border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-medium flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    Max Drawdown Tolerance
                  </label>
                  <span className="text-base font-bold text-red-400">{consistencySettings.maxDrawdownLimit}%</span>
                </div>
                <p className="text-xs text-muted mb-3">
                  Your acceptable peak-to-trough decline. <span className="text-red-400">Lower tolerance</span> rewards tighter risk management. Score decreases as drawdown approaches this limit.
                </p>
                <div className="relative h-2.5 mb-1">
                  <div className="absolute inset-0 bg-background rounded-full" />
                  <div
                    className="absolute left-0 top-0 h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${((consistencySettings.maxDrawdownLimit - 5) / 45) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={consistencySettings.maxDrawdownLimit}
                    onChange={(e) => setConsistencySettings({ ...consistencySettings, maxDrawdownLimit: parseInt(e.target.value) })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all"
                    style={{ left: `calc(${((consistencySettings.maxDrawdownLimit - 5) / 45) * 100}% - 10px)` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted">
                  <span>5%</span>
                  <span>27%</span>
                  <span>50%</span>
                </div>
                <p className="text-[11px] text-muted/70 mt-2 italic">
                  💡 To improve: Use smaller position sizes, set stop-losses, avoid revenge trading after losses.
                </p>
              </div>

              {/* Streak Target */}
              <div className="p-4 bg-card/30 rounded-lg border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-medium flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    Win Streak Target
                  </label>
                  <span className="text-base font-bold text-yellow-400">{consistencySettings.streakTarget}</span>
                </div>
                <p className="text-xs text-muted mb-3">
                  Consecutive winning trades to aim for. <span className="text-yellow-400">Longer streaks</span> indicate consistent execution. Realistic targets depend on your win rate.
                </p>
                <div className="relative h-2.5 mb-1">
                  <div className="absolute inset-0 bg-background rounded-full" />
                  <div
                    className="absolute left-0 top-0 h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${((consistencySettings.streakTarget - 3) / 17) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={consistencySettings.streakTarget}
                    onChange={(e) => setConsistencySettings({ ...consistencySettings, streakTarget: parseInt(e.target.value) })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-yellow-500 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all"
                    style={{ left: `calc(${((consistencySettings.streakTarget - 3) / 17) * 100}% - 10px)` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted">
                  <span>3</span>
                  <span>11</span>
                  <span>20</span>
                </div>
                <p className="text-[11px] text-muted/70 mt-2 italic">
                  💡 To improve: Trade your best setups only, follow your rules, stay patient between trades.
                </p>
              </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-card/50 rounded-lg border border-border/50">
                <div className="text-sm text-muted mb-2">Current Score Preview</div>
                <div className="flex items-center gap-3">
                  <span className={`text-3xl font-bold ${
                    tradingStats.consistencyScore >= 80 ? "text-emerald-400" :
                    tradingStats.consistencyScore >= 60 ? "text-blue-400" :
                    tradingStats.consistencyScore >= 40 ? "text-yellow-400" : "text-red-400"
                  }`}>{tradingStats.consistencyScore}</span>
                  <span className="text-base text-muted">/ 100</span>
                  <span className={`ml-auto px-3 py-1 rounded text-sm font-bold ${
                    consistencyGrade.grade === "A+" || consistencyGrade.grade === "A" ? "bg-emerald-500/20 text-emerald-400" :
                    consistencyGrade.grade === "B+" || consistencyGrade.grade === "B" ? "bg-blue-500/20 text-blue-400" :
                    consistencyGrade.grade === "C+" || consistencyGrade.grade === "C" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>{consistencyGrade.grade}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setConsistencySettings({
                      winRateTarget: 60,
                      profitFactorTarget: 2,
                      maxDrawdownLimit: 25,
                      streakTarget: 10,
                    });
                  }}
                  className="flex-1 py-2.5 bg-card hover:bg-card-hover border border-border rounded-lg font-medium transition-colors text-base"
                >
                  Reset Defaults
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("consistencySettings", JSON.stringify(consistencySettings));
                    setShowConsistencySettings(false);
                  }}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-base"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Audit Modal */}
      {showTradingAudit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTradingAudit(false)}>
          <div className="w-full max-w-4xl glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Trading Performance Audit</span>
                </h3>
                <p className="text-sm text-muted mt-1">Comprehensive analysis of your trading data</p>
              </div>
              <button onClick={() => setShowTradingAudit(false)} className="p-2 rounded-lg hover:bg-card-hover transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Executive Summary */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-border/50">
                <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Executive Summary
                </h4>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-card/50">
                    <div className={`text-2xl font-bold ${tradingStats.allTimePnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tradingStats.allTimePnl >= 0 ? '+' : ''}${tradingStats.allTimePnl.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted">Total P&L</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card/50">
                    <div className="text-2xl font-bold text-foreground">{tradingStats.allTimeTrades}</div>
                    <div className="text-xs text-muted">Total Trades</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card/50">
                    <div className={`text-2xl font-bold ${tradingStats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {tradingStats.winRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted">Win Rate</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card/50">
                    <div className={`text-2xl font-bold ${consistencyGrade.color}`}>{consistencyGrade.grade}</div>
                    <div className="text-xs text-muted">Grade</div>
                  </div>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {tradingStats.allTimeTrades < 10
                    ? "⚠️ Limited data available. Complete at least 30 trades for statistically meaningful analysis."
                    : tradingStats.allTimeTrades < 30
                    ? `Based on ${tradingStats.allTimeTrades} trades, your data is beginning to show patterns but more trades will improve reliability.`
                    : `Based on ${tradingStats.allTimeTrades} trades, your trading shows ${
                        tradingStats.consistencyScore >= 70 ? 'strong consistency and disciplined execution' :
                        tradingStats.consistencyScore >= 50 ? 'moderate consistency with room for improvement' :
                        'developing patterns that need focused attention'
                      }. ${tradingStats.allTimePnl >= 0 ? 'You are net profitable.' : 'Currently in a drawdown phase.'}`
                  }
                </p>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <h4 className="text-base font-bold mb-3 flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                    Strengths
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {tradingStats.winRate >= 50 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Win rate above 50%</strong> - Your trade selection is better than random</span>
                      </li>
                    )}
                    {tradingStats.profitFactor >= 1.5 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Profit factor of {tradingStats.profitFactor.toFixed(2)}</strong> - Strong reward vs risk ratio</span>
                      </li>
                    )}
                    {tradingStats.riskRewardRatio >= 1.5 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span><strong>R:R ratio of {tradingStats.riskRewardRatio.toFixed(2)}</strong> - Winners are larger than losers</span>
                      </li>
                    )}
                    {tradingStats.maxDrawdownPercent <= 15 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Max drawdown under 15%</strong> - Good risk management</span>
                      </li>
                    )}
                    {tradingStats.longestWinStreak >= 5 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span><strong>{tradingStats.longestWinStreak} trade win streak</strong> - Capable of sustained performance</span>
                      </li>
                    )}
                    {tradingStats.expectancy > 0 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Positive expectancy (${tradingStats.expectancy.toFixed(0)}/trade)</strong> - Strategy has an edge</span>
                      </li>
                    )}
                    {tradingStats.winRate < 50 && tradingStats.profitFactor < 1.5 && tradingStats.riskRewardRatio < 1.5 && tradingStats.maxDrawdownPercent > 15 && tradingStats.expectancy <= 0 && (
                      <li className="flex items-start gap-2 text-muted">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Continue building your track record to identify strengths</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20">
                  <h4 className="text-base font-bold mb-3 flex items-center gap-2 text-red-400">
                    <XCircle className="w-5 h-5" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {tradingStats.winRate < 45 && (
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Win rate of {tradingStats.winRate.toFixed(1)}%</strong> - Review entry criteria and setup quality</span>
                      </li>
                    )}
                    {tradingStats.profitFactor < 1 && (
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Profit factor below 1.0</strong> - Losing more than winning overall</span>
                      </li>
                    )}
                    {tradingStats.riskRewardRatio < 1 && (
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span><strong>R:R below 1:1</strong> - Average loss exceeds average win</span>
                      </li>
                    )}
                    {tradingStats.maxDrawdownPercent > 25 && (
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Max drawdown of {tradingStats.maxDrawdownPercent.toFixed(1)}%</strong> - Position sizing may be too aggressive</span>
                      </li>
                    )}
                    {tradingStats.longestLossStreak >= 5 && (
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span><strong>{tradingStats.longestLossStreak} trade losing streak</strong> - Consider circuit breakers</span>
                      </li>
                    )}
                    {tradingStats.expectancy < 0 && (
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Negative expectancy</strong> - Strategy is losing money per trade on average</span>
                      </li>
                    )}
                    {tradingStats.winRate >= 45 && tradingStats.profitFactor >= 1 && tradingStats.riskRewardRatio >= 1 && tradingStats.maxDrawdownPercent <= 25 && tradingStats.expectancy >= 0 && (
                      <li className="flex items-start gap-2 text-muted">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>No critical weaknesses detected. Focus on consistency.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Risk Analysis */}
              <div className="p-5 rounded-xl bg-card/30 border border-border/50">
                <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Risk Management Analysis
                </h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-card/50 border border-border/30">
                    <div className="text-xs text-muted mb-1">Max Drawdown</div>
                    <div className={`text-xl font-bold ${tradingStats.maxDrawdownPercent <= 10 ? 'text-emerald-400' : tradingStats.maxDrawdownPercent <= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                      {tradingStats.maxDrawdownPercent.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted mt-1">
                      {tradingStats.maxDrawdownPercent <= 10 ? 'Excellent' : tradingStats.maxDrawdownPercent <= 20 ? 'Acceptable' : 'High risk'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-card/50 border border-border/30">
                    <div className="text-xs text-muted mb-1">Current Drawdown</div>
                    <div className={`text-xl font-bold ${tradingStats.currentDrawdownPercent <= 5 ? 'text-emerald-400' : tradingStats.currentDrawdownPercent <= 15 ? 'text-amber-400' : 'text-red-400'}`}>
                      {tradingStats.currentDrawdownPercent.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted mt-1">
                      {tradingStats.currentDrawdownPercent <= 5 ? 'Near highs' : tradingStats.currentDrawdownPercent <= 15 ? 'In drawdown' : 'Deep drawdown'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-card/50 border border-border/30">
                    <div className="text-xs text-muted mb-1">Recovery Factor</div>
                    <div className={`text-xl font-bold ${tradingStats.recoveryFactor >= 3 ? 'text-emerald-400' : tradingStats.recoveryFactor >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                      {tradingStats.recoveryFactor >= 10 ? '>10' : tradingStats.recoveryFactor.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-muted mt-1">
                      {tradingStats.recoveryFactor >= 3 ? 'Strong recovery' : tradingStats.recoveryFactor >= 1 ? 'Moderate' : 'Needs improvement'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted leading-relaxed">
                  {tradingStats.maxDrawdownPercent <= 15
                    ? `✓ Your risk management is solid with a max drawdown of ${tradingStats.maxDrawdownPercent.toFixed(1)}%. This suggests appropriate position sizing.`
                    : tradingStats.maxDrawdownPercent <= 25
                    ? `⚠️ Your max drawdown of ${tradingStats.maxDrawdownPercent.toFixed(1)}% is within acceptable limits but approaching concerning levels. Consider reducing position sizes by 20-30%.`
                    : `❌ A ${tradingStats.maxDrawdownPercent.toFixed(1)}% max drawdown indicates excessive risk. Immediately reduce position sizes and implement stricter stop-losses.`
                  }
                </div>
              </div>

              {/* Trade Quality Analysis */}
              <div className="p-5 rounded-xl bg-card/30 border border-border/50">
                <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Trade Quality Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted">Win/Loss Distribution</span>
                      <span className="text-sm font-medium">{tradingStats.winningTrades}W / {tradingStats.losingTrades}L</span>
                    </div>
                    <div className="h-3 bg-background rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${tradingStats.allTimeTrades > 0 ? (tradingStats.winningTrades / tradingStats.allTimeTrades) * 100 : 0}%` }}
                      />
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${tradingStats.allTimeTrades > 0 ? (tradingStats.losingTrades / tradingStats.allTimeTrades) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted mt-1">
                      <span className="text-emerald-400">{tradingStats.allTimeTrades > 0 ? ((tradingStats.winningTrades / tradingStats.allTimeTrades) * 100).toFixed(1) : 0}% wins</span>
                      <span className="text-red-400">{tradingStats.allTimeTrades > 0 ? ((tradingStats.losingTrades / tradingStats.allTimeTrades) * 100).toFixed(1) : 0}% losses</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted">Avg Win vs Avg Loss</span>
                      <span className="text-sm font-medium">${tradingStats.avgWin.toFixed(0)} / ${tradingStats.avgLoss.toFixed(0)}</span>
                    </div>
                    <div className="h-3 bg-background rounded-full overflow-hidden flex">
                      {(() => {
                        const total = tradingStats.avgWin + tradingStats.avgLoss;
                        const winPct = total > 0 ? (tradingStats.avgWin / total) * 100 : 50;
                        return (
                          <>
                            <div className="h-full bg-emerald-500" style={{ width: `${winPct}%` }} />
                            <div className="h-full bg-red-500" style={{ width: `${100 - winPct}%` }} />
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted mt-1">
                      <span className="text-emerald-400">Avg win: ${tradingStats.avgWin.toFixed(0)}</span>
                      <span className="text-red-400">Avg loss: ${tradingStats.avgLoss.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-border/30">
                  <div className="text-sm">
                    <strong>Edge Analysis:</strong>{' '}
                    {tradingStats.expectancy > 0
                      ? <span className="text-emerald-400">You have a positive edge of ${tradingStats.expectancy.toFixed(2)} per trade. Over 100 trades, you'd expect to make ~${(tradingStats.expectancy * 100).toFixed(0)}.</span>
                      : <span className="text-red-400">Your current expectancy is negative (${tradingStats.expectancy.toFixed(2)}/trade). Focus on either improving win rate or increasing R:R ratio.</span>
                    }
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20">
                <h4 className="text-base font-bold mb-4 flex items-center gap-2 text-amber-400">
                  <Lightbulb className="w-5 h-5" />
                  Personalized Recommendations
                </h4>
                <div className="space-y-3">
                  {/* Generate dynamic recommendations based on stats */}
                  {tradingStats.winRate < 50 && tradingStats.riskRewardRatio < 1.5 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-card/30">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-red-400">1</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Critical: Fix Your Risk/Reward</div>
                        <div className="text-xs text-muted mt-1">With a {tradingStats.winRate.toFixed(0)}% win rate and {tradingStats.riskRewardRatio.toFixed(2)} R:R, you need either higher win rate OR better R:R. Target minimum 1.5 R:R on entries.</div>
                      </div>
                    </div>
                  )}
                  {tradingStats.maxDrawdownPercent > 20 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-card/30">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-amber-400">2</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Reduce Position Sizes</div>
                        <div className="text-xs text-muted mt-1">Your {tradingStats.maxDrawdownPercent.toFixed(1)}% max drawdown suggests oversized positions. Consider risking no more than 1-2% per trade.</div>
                      </div>
                    </div>
                  )}
                  {tradingStats.longestLossStreak >= 4 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-card/30">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-400">3</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Implement a Circuit Breaker</div>
                        <div className="text-xs text-muted mt-1">After {tradingStats.longestLossStreak} consecutive losses, take a mandatory break. This prevents emotional trading and bigger drawdowns.</div>
                      </div>
                    </div>
                  )}
                  {tradingStats.profitFactor >= 1.5 && tradingStats.winRate >= 50 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-card/30">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-400">✓</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Scale Up Carefully</div>
                        <div className="text-xs text-muted mt-1">Your edge is proven. Consider gradually increasing position sizes while maintaining your discipline.</div>
                      </div>
                    </div>
                  )}
                  {tradingStats.allTimeTrades < 30 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-card/30">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-purple-400">!</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Build Your Sample Size</div>
                        <div className="text-xs text-muted mt-1">With only {tradingStats.allTimeTrades} trades, statistical significance is limited. Keep trading your system and re-evaluate at 50+ trades.</div>
                      </div>
                    </div>
                  )}
                  {tradingStats.avgWin < tradingStats.avgLoss && tradingStats.winRate < 60 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-card/30">
                      <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-orange-400">!</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Let Winners Run</div>
                        <div className="text-xs text-muted mt-1">Your avg win (${tradingStats.avgWin.toFixed(0)}) is smaller than avg loss (${tradingStats.avgLoss.toFixed(0)}). Hold winners longer or move stops to breakeven faster.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Goal Progress (if set) */}
              {(goals.yearlyPnlGoal > 0 || goals.monthlyPnlGoal > 0) && goalProgress && (
                <div className="p-5 rounded-xl bg-card/30 border border-border/50">
                  <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" />
                    Goal Progress Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-card/50 border border-border/30">
                      <div className="text-sm text-muted mb-2">Yearly Goal</div>
                      <div className="flex items-end gap-2">
                        <span className={`text-2xl font-bold ${tradingStats.ytdPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${tradingStats.ytdPnl.toFixed(0)}
                        </span>
                        <span className="text-muted text-sm mb-1">/ ${goals.yearlyPnlGoal.toFixed(0)}</span>
                      </div>
                      <div className="h-2 bg-background rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${goalProgress.onTrack ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(goalProgress.yearlyProgress, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted mt-2">
                        {goalProgress.onTrack
                          ? `✓ On track! ${goalProgress.yearlyProgress.toFixed(1)}% complete`
                          : `⚠️ Behind pace. Need $${(goalProgress.dailyTarget).toFixed(0)}/day to catch up`
                        }
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-card/50 border border-border/30">
                      <div className="text-sm text-muted mb-2">Required Daily Average</div>
                      <div className="text-2xl font-bold text-foreground">${goalProgress.dailyTarget.toFixed(0)}</div>
                      <div className="text-xs text-muted mt-2">
                        Based on {goalProgress.tradingDaysRemaining} trading days remaining this year
                      </div>
                      <div className="text-xs mt-2">
                        {(tradingStats.allTimeTrades > 0 ? tradingStats.allTimePnl / tradingStats.allTimeTrades : 0) >= goalProgress.dailyTarget
                          ? <span className="text-emerald-400">✓ Your avg trade exceeds daily target</span>
                          : <span className="text-amber-400">⚠️ Avg trade below daily target</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Score Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-emerald-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold mb-1">Overall Trading Score</h4>
                    <p className="text-sm text-muted">Based on all analyzed metrics</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-5xl font-bold ${consistencyGrade.color}`}>
                      {tradingStats.consistencyScore}
                    </div>
                    <div className="text-sm text-muted">out of 100</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-sm text-muted">
                    {tradingStats.consistencyScore >= 80
                      ? "🏆 Elite Performance - You're trading at a professional level. Maintain discipline and continue refining your edge."
                      : tradingStats.consistencyScore >= 60
                      ? "📈 Good Progress - You have a solid foundation. Focus on the recommendations above to reach elite status."
                      : tradingStats.consistencyScore >= 40
                      ? "📊 Developing Trader - You're building experience. Prioritize risk management and consistency over profits."
                      : "🎯 Learning Phase - Focus on process over results. Paper trade or use small sizes while developing your system."
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex-shrink-0 flex items-center justify-between bg-card/30">
              <div className="text-xs text-muted">
                Analysis based on {tradingStats.allTimeTrades} trades • Last updated: {new Date().toLocaleDateString()}
              </div>
              <button
                onClick={() => setShowTradingAudit(false)}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Close Audit
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
