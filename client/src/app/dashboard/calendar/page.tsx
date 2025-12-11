"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Info,
  ExternalLink,
  Activity,
  AlertTriangle,
  Flame,
  Calendar,
  Zap,
  Timer,
  Plus,
  FileText,
  DollarSign,
  BarChart3,
  Trash2,
  Save,
  StickyNote,
  Eye,
  EyeOff,
  Edit2,
  Hash,
  Tag as TagIcon,
} from "lucide-react";
import { useTradeJournal } from "@/hooks/useTradeJournal";
import { Trade, Tag, TradeFormData, DEFAULT_TRADE_FORM } from "@/components/TradeJournal/types";

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low" | "holiday" | "early_close";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  category: string;
  country?: string;
  source?: string;
  sourceUrl?: string;
  // Enriched metadata
  description?: string;
  whyItMatters?: string;
  frequency?: string;
  typicalReaction?: {
    higherThanExpected?: string;
    lowerThanExpected?: string;
    hawkish?: string;
    dovish?: string;
  };
  relatedAssets?: string[];
  historicalVolatility?: string;
  isEarlyClose?: boolean;
  closeTimeET?: string;
}

const impactColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-emerald-500",
  holiday: "bg-gray-500",
  early_close: "bg-gray-500",
};

// Keep old reference for type safety
const impactColorsLegacy = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-emerald-500",
  holiday: "bg-gray-500",
};

// Trade note interface
interface TradeNote {
  id: string;
  userId: string;
  date: string;
  trades: number | null;
  pnl: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const currencyFlags: Record<string, string> = {
  USD: "🇺🇸",
};

// Category labels for display
const categoryLabels: Record<string, string> = {
  bonds: "Bonds",
  central_bank: "Central Bank",
  consumer: "Consumer",
  employment: "Employment",
  fiscal: "Fiscal",
  growth: "Growth",
  housing: "Housing",
  inflation: "Inflation",
  manufacturing: "Manufacturing",
  sentiment: "Sentiment",
  services: "Services",
  trade: "Trade",
  energy: "Energy",
  holiday: "Holiday",
};

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [animatedDay, setAnimatedDay] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEvents, setShowEvents] = useState(true);
  const [showTenDayWindow, setShowTenDayWindow] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAllNotes, setDeletingAllNotes] = useState(false);
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [showDeleteAllTradesConfirm, setShowDeleteAllTradesConfirm] = useState(false);
  const [deletingAllTrades, setDeletingAllTrades] = useState(false);
  const [showWeekSummary, setShowWeekSummary] = useState<{ show: boolean; saturdayDate: Date | null }>({ show: false, saturdayDate: null });
  const [hoveredTrade, setHoveredTrade] = useState<{ index: number; x: number; y: number; trade: any } | null>(null);
  const [showProfitFactorTooltip, setShowProfitFactorTooltip] = useState<'weekly' | 'monthly' | null>(null);
  const [showBreakevenTooltip, setShowBreakevenTooltip] = useState<'weekly' | 'monthly' | null>(null);
  const [showRiskRewardTooltip, setShowRiskRewardTooltip] = useState<'weekly' | 'monthly' | null>(null);
  const [showExpectancyTooltip, setShowExpectancyTooltip] = useState<'weekly' | 'monthly' | null>(null);
  const [showAvgTradeTooltip, setShowAvgTradeTooltip] = useState<'weekly' | 'monthly' | null>(null);
  const [showAvgDayTooltip, setShowAvgDayTooltip] = useState<'weekly' | 'monthly' | null>(null);

  // Generic confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    confirmText?: string;
    isLoading?: boolean;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  // Filters (USD-only, no currency filter needed)
  const [filterImpacts, setFilterImpacts] = useState<Set<string>>(new Set(["high", "medium", "low"]));
  const [filterCategory, setFilterCategory] = useState("All");
  const [showHolidays, setShowHolidays] = useState(true);
  const [showPastEvents, setShowPastEvents] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Trade Notes State (legacy - for daily notes)
  const [tradeNotes, setTradeNotes] = useState<Record<string, TradeNote>>({});
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    trades: "",
    pnl: "",
    note: "",
  });
  const [savingNote, setSavingNote] = useState(false);

  // Trade Journal State (new - individual trades)
  const {
    trades,
    tags,
    stats,
    loading: tradesLoading,
    statsLoading,
    statsPeriod,
    createTrade,
    updateTrade,
    deleteTrade,
    createTag,
    deleteTag,
    changeStatsPeriod,
    getTradesByDate,
    getDailyPnL,
    getTradeCount,
  } = useTradeJournal();

  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [tradeFormData, setTradeFormData] = useState<TradeFormData>(DEFAULT_TRADE_FORM);
  const [savingTrade, setSavingTrade] = useState(false);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6b7280");
  const [modalTab, setModalTab] = useState<"events" | "trades">("events");

  // Fetch trade notes
  const fetchTradeNotes = async () => {
    try {
      const response = await fetch("/api/trade-notes");
      const data = await response.json();
      if (data.notes) {
        const notesMap: Record<string, TradeNote> = {};
        data.notes.forEach((note: TradeNote) => {
          notesMap[note.date] = note;
        });
        setTradeNotes(notesMap);
      }
    } catch (error) {
      console.error("Failed to fetch trade notes:", error);
    }
  };

  // Save trade note
  const saveTradeNote = async () => {
    if (!selectedDay) return;

    setSavingNote(true);
    try {
      const payload = {
        date: selectedDay,
        trades: noteFormData.trades ? parseInt(noteFormData.trades) : null,
        pnl: noteFormData.pnl ? parseFloat(noteFormData.pnl.replace(/[^0-9.-]/g, "")) : null,
        note: noteFormData.note || null,
      };

      const response = await fetch("/api/trade-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.note) {
        setTradeNotes((prev) => ({
          ...prev,
          [selectedDay]: data.note,
        }));
      }

      // Close both modals
      setShowNoteModal(false);
      setShowModal(false);
      setHighlightedDay(null);
      setNoteFormData({ trades: "", pnl: "", note: "" });
    } catch (error) {
      console.error("Failed to save trade note:", error);
    } finally {
      setSavingNote(false);
    }
  };

  // Delete trade note
  const deleteTradeNote = async () => {
    if (!selectedDay) return;

    setSavingNote(true);
    try {
      await fetch(`/api/trade-notes?date=${selectedDay}`, {
        method: "DELETE",
      });

      setTradeNotes((prev) => {
        const newNotes = { ...prev };
        delete newNotes[selectedDay];
        return newNotes;
      });

      setShowNoteModal(false);
      setShowModal(false);
      setHighlightedDay(null);
      setNoteFormData({ trades: "", pnl: "", note: "" });
    } catch (error) {
      console.error("Failed to delete trade note:", error);
    } finally {
      setSavingNote(false);
    }
  };

  // Delete all trade notes
  const deleteAllTradeNotes = async () => {
    setDeletingAllNotes(true);
    try {
      // Delete each note one by one
      const dates = Object.keys(tradeNotes);
      for (const date of dates) {
        await fetch(`/api/trade-notes?date=${date}`, {
          method: "DELETE",
        });
      }
      setTradeNotes({});
      setShowDeleteAllConfirm(false);
      setShowFilters(false);
    } catch (error) {
      console.error("Failed to delete all trade notes:", error);
    } finally {
      setDeletingAllNotes(false);
    }
  };

  // Open note modal with existing data
  const openNoteModal = () => {
    if (selectedDay && tradeNotes[selectedDay]) {
      const existingNote = tradeNotes[selectedDay];
      setNoteFormData({
        trades: existingNote.trades?.toString() || "",
        pnl: existingNote.pnl?.toString() || "",
        note: existingNote.note || "",
      });
    } else {
      setNoteFormData({ trades: "", pnl: "", note: "" });
    }
    setShowNoteModal(true);
  };

  // Trade Journal Functions
  const openTradeForm = (trade?: Trade) => {
    if (trade) {
      setEditingTrade(trade);
      setTradeFormData({
        ticker: trade.ticker,
        direction: trade.direction,
        time: trade.time || "",
        entryPrice: trade.entryPrice?.toString() || "",
        exitPrice: trade.exitPrice?.toString() || "",
        size: trade.size?.toString() || "",
        pnl: trade.pnl.toString(),
        notes: trade.notes || "",
        tagIds: trade.tags.map((t) => t.id),
      });
    } else {
      setEditingTrade(null);
      setTradeFormData(DEFAULT_TRADE_FORM);
    }
    setShowTradeForm(true);
  };

  const handleSaveTrade = async () => {
    if (!selectedDay || !tradeFormData.ticker || !tradeFormData.pnl) return;

    setSavingTrade(true);
    try {
      if (editingTrade) {
        await updateTrade(editingTrade.id, tradeFormData);
      } else {
        await createTrade(selectedDay, tradeFormData);
      }
      setShowTradeForm(false);
      setEditingTrade(null);
      setTradeFormData(DEFAULT_TRADE_FORM);
    } catch (error) {
      console.error("Failed to save trade:", error);
    } finally {
      setSavingTrade(false);
    }
  };

  const handleDeleteTrade = (tradeId: string, ticker: string) => {
    setConfirmModal({
      show: true,
      title: "Delete Trade?",
      message: `Are you sure you want to delete this ${ticker} trade? This action cannot be undone.`,
      confirmText: "Delete",
      onConfirm: async () => {
        await deleteTrade(tradeId);
        setConfirmModal((prev) => ({ ...prev, show: false }));
      },
    });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const tag = await createTag(newTagName.trim(), newTagColor);
    if (tag) {
      setTradeFormData((prev) => ({
        ...prev,
        tagIds: [...prev.tagIds, tag.id],
      }));
      setNewTagName("");
      setShowNewTagInput(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setTradeFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  // Get trades for selected day
  const selectedDayTrades = selectedDay ? getTradesByDate(selectedDay) : [];
  const selectedDayPnL = selectedDay ? getDailyPnL(selectedDay) : 0;

  // Fetch events and notes on mount
  useEffect(() => {
    fetchEvents();
    fetchTradeNotes();
  }, []);

  // Live clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilters]);

  // Helper to check if an event's release time has passed (in ET)
  const isEventReleased = (eventDate: string, eventTime: string): boolean => {
    // Get current time in US Eastern
    const now = new Date();
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = etFormatter.formatToParts(now);
    const nowET = {
      year: parts.find(p => p.type === 'year')?.value || '',
      month: parts.find(p => p.type === 'month')?.value || '',
      day: parts.find(p => p.type === 'day')?.value || '',
      hour: parts.find(p => p.type === 'hour')?.value || '00',
      minute: parts.find(p => p.type === 'minute')?.value || '00',
    };

    const currentDateET = `${nowET.year}-${nowET.month}-${nowET.day}`;
    const currentTimeET = `${nowET.hour}:${nowET.minute}`;

    // Compare dates first
    if (eventDate < currentDateET) return true;
    if (eventDate > currentDateET) return false;

    // Same day - compare times (event times are in ET)
    if (eventTime === 'All Day' || eventTime === 'TBD') return true;

    return eventTime <= currentTimeET;
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch calendar events and live data in parallel
      const [calendarResponse, liveDataResponse] = await Promise.all([
        fetch("/api/calendar"),
        fetch("/api/live-data").catch(() => null), // Don't fail if live data unavailable
      ]);

      const calendarData = await calendarResponse.json();
      let liveData: Record<string, { actual: string | null; previous: string | null }> = {};

      if (liveDataResponse?.ok) {
        const liveJson = await liveDataResponse.json();
        liveData = liveJson.data || {};
      }

      // Merge live data into events - ONLY for past events where release time has passed
      const eventsWithLiveData = (calendarData.events || []).map((event: EconomicEvent) => {
        const live = liveData[event.event];
        const hasReleased = isEventReleased(event.date, event.time);

        if (live && hasReleased) {
          // Event has been released - use live data
          return {
            ...event,
            actual: live.actual || event.actual,
            previous: live.previous || event.previous,
          };
        }
        // Future event or no live data - keep calendar API values (actual will be null for future)
        return event;
      });

      setEvents(eventsWithLiveData);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get next high-impact event
  const nextHighImpactEvent = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const futureHighImpact = events
      .filter((e) => e.impact === "high")
      .filter((e) => {
        if (e.date > todayKey) return true;
        if (e.date === todayKey) {
          const [hours, mins] = e.time.split(":").map(Number);
          const eventTime = new Date(now);
          eventTime.setHours(hours, mins, 0, 0);
          return eventTime > now;
        }
        return false;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });

    return futureHighImpact[0] || null;
  }, [events]);

  // Countdown timer
  useEffect(() => {
    if (!nextHighImpactEvent) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const [year, month, day] = nextHighImpactEvent.date.split("-").map(Number);
      const [hours, mins] = nextHighImpactEvent.time.split(":").map(Number);
      const eventTime = new Date(year, month - 1, day, hours, mins, 0, 0);

      const diff = eventTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Now!");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minsLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secsLeft = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hoursLeft}h ${minsLeft}m`);
      } else if (hoursLeft > 0) {
        setCountdown(`${hoursLeft}h ${minsLeft}m ${secsLeft}s`);
      } else {
        setCountdown(`${minsLeft}m ${secsLeft}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextHighImpactEvent]);

  // Get categories that have high-impact events
  const highImpactCategories = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    events
      .filter((e) => e.impact === "high")
      .forEach((e) => {
        if (e.category) {
          categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
        }
      });
    return Object.entries(categoryCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, count]) => ({ category, count }));
  }, [events]);

  // Quick stats
  const quickStats = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const todayEvents = events.filter((e) => e.date === todayKey);
    const todayHigh = todayEvents.filter((e) => e.impact === "high").length;
    const todayMedium = todayEvents.filter((e) => e.impact === "medium").length;

    // This week events
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const weekEvents = events.filter((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      const eventDate = new Date(y, m - 1, d);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
    const weekHigh = weekEvents.filter((e) => e.impact === "high").length;

    return { todayTotal: todayEvents.length, todayHigh, todayMedium, weekHigh };
  }, [events]);

  // Calculate weekly and monthly P&L summaries
  const pnlSummary = useMemo(() => {
    const now = new Date();

    // Current week (Sunday to Saturday)
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay());
    startOfCurrentWeek.setHours(0, 0, 0, 0);
    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);

    // Last week (in case current week has no data)
    const startOfLastWeek = new Date(startOfCurrentWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfCurrentWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);

    // Current month (based on displayed month)
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    let currentWeekPnL = 0;
    let currentWeekTrades = 0;
    let lastWeekPnL = 0;
    let lastWeekTrades = 0;
    let monthlyPnL = 0;
    let monthlyTrades = 0;

    const currentWeekDays = new Set<string>();
    const lastWeekDays = new Set<string>();
    const monthlyDaysSet = new Set<string>();

    // Use the new trade journal data
    trades.forEach((trade) => {
      const [y, m, d] = trade.date.split("-").map(Number);
      const tradeDate = new Date(y, m - 1, d);

      // Check if in current week
      if (tradeDate >= startOfCurrentWeek && tradeDate <= endOfCurrentWeek) {
        currentWeekPnL += trade.pnl;
        currentWeekTrades++;
        currentWeekDays.add(trade.date);
      }

      // Check if in last week
      if (tradeDate >= startOfLastWeek && tradeDate <= endOfLastWeek) {
        lastWeekPnL += trade.pnl;
        lastWeekTrades++;
        lastWeekDays.add(trade.date);
      }

      // Check if in currently displayed month
      if (tradeDate >= startOfMonth && tradeDate <= endOfMonth) {
        monthlyPnL += trade.pnl;
        monthlyTrades++;
        monthlyDaysSet.add(trade.date);
      }
    });

    // Use current week if it has data, otherwise show last week
    const hasCurrentWeekData = currentWeekDays.size > 0 || currentWeekTrades > 0;
    const weeklyPnL = hasCurrentWeekData ? currentWeekPnL : lastWeekPnL;
    const weeklyTrades = hasCurrentWeekData ? currentWeekTrades : lastWeekTrades;
    const weeklyDays = hasCurrentWeekData ? currentWeekDays.size : lastWeekDays.size;
    const weekLabel = hasCurrentWeekData ? "This Week" : "Last Week";

    return {
      weeklyPnL,
      weeklyTrades,
      weeklyDays,
      weekLabel,
      monthlyPnL,
      monthlyTrades,
      monthlyDays: monthlyDaysSet.size,
    };
  }, [trades, currentMonth]);

  // Detailed monthly breakdown for charts
  const monthlyBreakdown = useMemo(() => {
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Get individual trades in this month, sorted by date and time
    const periodTrades = trades
      .filter((trade) => {
        const [y, m] = trade.date.split("-").map(Number);
        return y === currentMonth.getFullYear() && m === currentMonth.getMonth() + 1;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      });

    // Group trades by date for daily stats
    const tradesByDate: Record<string, { pnl: number; trades: number }> = {};
    periodTrades.forEach((trade) => {
      if (!tradesByDate[trade.date]) {
        tradesByDate[trade.date] = { pnl: 0, trades: 0 };
      }
      tradesByDate[trade.date].pnl += trade.pnl;
      tradesByDate[trade.date].trades++;
    });

    const dailyData: { date: string; day: number; pnl: number; trades: number; dayName: string }[] = [];
    let winDays = 0;
    let lossDays = 0;
    let bestDay = { pnl: 0, date: "" };
    let worstDay = { pnl: 0, date: "" };

    // Iterate through all days in the month
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayData = tradesByDate[dateKey];

      if (dayData && dayData.trades > 0) {
        const pnl = dayData.pnl;
        const tradeCount = dayData.trades;

        dailyData.push({
          date: dateKey,
          day: d,
          pnl,
          trades: tradeCount,
          dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        });

        if (pnl > 0) winDays++;
        else if (pnl < 0) lossDays++;

        if (pnl > bestDay.pnl) bestDay = { pnl, date: dateKey };
        if (pnl < worstDay.pnl) worstDay = { pnl, date: dateKey };
      }
    }

    // Calculate trade-level statistics
    const winningTrades = periodTrades.filter(t => t.pnl > 0);
    const losingTradesArr = periodTrades.filter(t => t.pnl < 0);
    const totalPnL = periodTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalTrades = periodTrades.length;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTradesArr.reduce((sum, t) => sum + t.pnl, 0));

    const tradeWinRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const dayWinRate = (winDays + lossDays) > 0 ? (winDays / (winDays + lossDays)) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTradesArr.length > 0 ? grossLoss / losingTradesArr.length : 0;

    const largestWin = winningTrades.length > 0
      ? winningTrades.reduce((max, t) => t.pnl > max.pnl ? t : max, winningTrades[0])
      : null;
    const largestLoss = losingTradesArr.length > 0
      ? losingTradesArr.reduce((min, t) => t.pnl < min.pnl ? t : min, losingTradesArr[0])
      : null;

    // Calculate cumulative P&L data using individual trades
    let cumulative = 0;
    const tradeByTradeData = periodTrades.map((trade, index) => {
      cumulative += trade.pnl;
      return {
        index,
        ticker: trade.ticker,
        pnl: trade.pnl,
        cumulative,
        date: trade.date,
        time: trade.time,
        direction: trade.direction,
      };
    });

    const avgPnLPerDay = dailyData.length > 0 ? totalPnL / dailyData.length : 0;
    const avgTradesPerDay = dailyData.length > 0 ? totalTrades / dailyData.length : 0;

    return {
      dailyData,
      tradeByTradeData,
      periodTrades,
      winDays,
      lossDays,
      bestDay,
      worstDay,
      totalPnL,
      totalTrades,
      avgPnLPerDay,
      avgTradesPerDay,
      dayWinRate,
      tradeWinRate,
      profitFactor,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      winningTrades: winningTrades.length,
      losingTrades: losingTradesArr.length,
      tradingDays: dailyData.length,
    };
  }, [trades, currentMonth]);

  // Calculate weekly totals for a given Saturday date, bounded by the displayed month
  const getWeekTotals = useCallback((saturdayDate: Date, displayedMonth: Date) => {
    // Get the Sunday of this week (6 days before Saturday)
    const startOfWeek = new Date(saturdayDate);
    startOfWeek.setDate(saturdayDate.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(saturdayDate);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get the boundaries of the displayed month
    const monthStart = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Clamp the week boundaries to the displayed month
    const effectiveStart = startOfWeek < monthStart ? monthStart : startOfWeek;
    const effectiveEnd = endOfWeek > monthEnd ? monthEnd : endOfWeek;

    let weekPnL = 0;
    let weekTrades = 0;
    let weekDays = 0;

    // Use the new trade journal data
    trades.forEach((trade) => {
      const [y, m, d] = trade.date.split("-").map(Number);
      const tradeDate = new Date(y, m - 1, d);

      // Only count trades within the effective range (week bounded by month)
      if (tradeDate >= effectiveStart && tradeDate <= effectiveEnd) {
        weekPnL += trade.pnl;
        weekTrades++;
      }
    });

    // Count unique days with trades
    const daysWithTrades = new Set<string>();
    trades.forEach((trade) => {
      const [y, m, d] = trade.date.split("-").map(Number);
      const tradeDate = new Date(y, m - 1, d);
      if (tradeDate >= effectiveStart && tradeDate <= effectiveEnd) {
        daysWithTrades.add(trade.date);
      }
    });
    weekDays = daysWithTrades.size;

    return { weekPnL, weekTrades, weekDays };
  }, [trades]);

  // Get detailed weekly breakdown for the week summary popup, bounded by displayed month
  const getWeeklyBreakdown = useCallback((saturdayDate: Date, displayedMonth: Date) => {
    const startOfWeek = new Date(saturdayDate);
    startOfWeek.setDate(saturdayDate.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(saturdayDate);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get the boundaries of the displayed month
    const monthStart = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Clamp the week boundaries to the displayed month
    const effectiveStart = startOfWeek < monthStart ? monthStart : startOfWeek;
    const effectiveEnd = endOfWeek > monthEnd ? monthEnd : endOfWeek;

    // Get individual trades in this period, sorted by date and time
    const periodTrades = trades
      .filter((trade) => {
        const [y, m, d] = trade.date.split("-").map(Number);
        const tradeDate = new Date(y, m - 1, d);
        return tradeDate >= effectiveStart && tradeDate <= effectiveEnd;
      })
      .sort((a, b) => {
        // Sort by date first, then by time if available
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      });

    // Group trades by date for daily stats
    const tradesByDate: Record<string, { pnl: number; trades: number }> = {};
    periodTrades.forEach((trade) => {
      if (!tradesByDate[trade.date]) {
        tradesByDate[trade.date] = { pnl: 0, trades: 0 };
      }
      tradesByDate[trade.date].pnl += trade.pnl;
      tradesByDate[trade.date].trades++;
    });

    const dailyData: { date: string; day: number; pnl: number; trades: number; dayName: string }[] = [];
    let winDays = 0;
    let lossDays = 0;
    let bestDay = { pnl: 0, date: "" };
    let worstDay = { pnl: 0, date: "" };

    // Iterate through each day in the effective range (bounded by month)
    const currentDate = new Date(effectiveStart);
    while (currentDate <= effectiveEnd) {
      const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
      const dayData = tradesByDate[dateKey];

      if (dayData && dayData.trades > 0) {
        const pnl = dayData.pnl;
        const tradeCount = dayData.trades;

        dailyData.push({
          date: dateKey,
          day: currentDate.getDate(),
          pnl,
          trades: tradeCount,
          dayName: currentDate.toLocaleDateString("en-US", { weekday: "short" }),
        });

        if (pnl > 0) winDays++;
        else if (pnl < 0) lossDays++;

        if (pnl > bestDay.pnl) bestDay = { pnl, date: dateKey };
        if (pnl < worstDay.pnl) worstDay = { pnl, date: dateKey };
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate trade-level statistics
    const winningTrades = periodTrades.filter(t => t.pnl > 0);
    const losingTrades = periodTrades.filter(t => t.pnl < 0);
    const totalPnL = periodTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalTrades = periodTrades.length;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    const tradeWinRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const dayWinRate = (winDays + lossDays) > 0 ? (winDays / (winDays + lossDays)) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    const largestWin = winningTrades.length > 0
      ? winningTrades.reduce((max, t) => t.pnl > max.pnl ? t : max, winningTrades[0])
      : null;
    const largestLoss = losingTrades.length > 0
      ? losingTrades.reduce((min, t) => t.pnl < min.pnl ? t : min, losingTrades[0])
      : null;

    // Calculate cumulative P&L data using individual trades for the line chart
    let cumulative = 0;
    const tradeByTradeData = periodTrades.map((trade, index) => {
      cumulative += trade.pnl;
      return {
        index,
        ticker: trade.ticker,
        pnl: trade.pnl,
        cumulative,
        date: trade.date,
        time: trade.time,
        direction: trade.direction,
      };
    });

    return {
      dailyData,
      tradeByTradeData,
      periodTrades,
      winDays,
      lossDays,
      bestDay,
      worstDay,
      totalPnL,
      totalTrades,
      dayWinRate,
      tradeWinRate,
      profitFactor,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      tradingDays: dailyData.length,
      effectiveStart,
      effectiveEnd,
    };
  }, [trades]);

  // Filter events (USD-only)
  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayKey = `${year}-${month}-${day}`;

    return events.filter((event) => {
      // Holiday/early close events are controlled by their own toggle, not the impact filter
      const isHolidayEvent = event.impact === "holiday" || event.impact === "early_close";

      // Impact filter - check if event's impact is in the selected set (skip for holidays)
      const impactMatch = isHolidayEvent || filterImpacts.has(event.impact);

      // Category filter
      const categoryMatch =
        filterCategory === "All" || event.category === filterCategory;

      // Holiday filter (includes early close days)
      const holidayMatch = showHolidays || !isHolidayEvent;

      // Past events filter
      const pastMatch = showPastEvents || event.date >= todayKey;

      return impactMatch && categoryMatch && holidayMatch && pastMatch;
    });
  }, [events, filterImpacts, filterCategory, showHolidays, showPastEvents]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, EconomicEvent[]> = {};
    filteredEvents.forEach((event) => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => a.time.localeCompare(b.time));
    });
    return grouped;
  }, [filteredEvents]);

  // Get 10-day window (3 days back, today, 6 days forward)
  const tenDayWindow = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -3; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  // Get highest impact for a day
  const getHighestImpact = (date: string): EconomicEvent["impact"] | null => {
    const dayEvents = eventsByDate[date];
    if (!dayEvents || dayEvents.length === 0) return null;

    if (dayEvents.some((e) => e.impact === "high")) return "high";
    if (dayEvents.some((e) => e.impact === "medium")) return "medium";
    if (dayEvents.some((e) => e.impact === "low")) return "low";
    return "holiday";
  };

  // Get holiday name for a date (if any)
  const getHolidayName = (date: string): string | null => {
    const dayEvents = eventsByDate[date];
    if (!dayEvents) return null;

    const holidayEvent = dayEvents.find((e) => e.impact === "holiday");
    if (!holidayEvent) return null;

    // Extract holiday name from event title (remove "(Market Closed)" suffix)
    const name = holidayEvent.event.replace(/\s*\(Market Closed\)\s*/i, "").trim();
    return name || "Holiday";
  };

  // Get early close info for a date (if any)
  const getEarlyCloseInfo = (date: string): { closeTimeET: string; closeTimeLocal: string } | null => {
    const dayEvents = eventsByDate[date];
    if (!dayEvents) return null;

    const earlyCloseEvent = dayEvents.find((e) => e.impact === "early_close");
    if (!earlyCloseEvent) return null;

    // Convert 1:00 PM ET to user's local time
    const closeTimeET = earlyCloseEvent.closeTimeET || "13:00";

    // Create a date object for today at 1:00 PM ET
    const [hours, minutes] = closeTimeET.split(":").map(Number);
    const etDate = new Date();
    etDate.setHours(hours, minutes, 0, 0);

    // Format in local time
    const closeTimeLocal = etDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    return { closeTimeET, closeTimeLocal };
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    // Start slide-out animation
    setIsSliding(true);
    setSlideDirection(direction === "next" ? "left" : "right");

    // After slide-out completes, change month and slide-in from opposite direction
    setTimeout(() => {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      setCurrentMonth(newDate);

      // Slide in from opposite side
      setSlideDirection(direction === "next" ? "right" : "left");

      // Small delay then remove sliding state to trigger slide-in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideDirection(null);
          setIsSliding(false);
        });
      });
    }, 250);
  };

  const handleDayClick = (dateKey: string) => {
    setSelectedDay(dateKey);
    setHighlightedDay(dateKey);
    setShowModal(true);
  };

  // Handle clicking on the next high-impact countdown box
  const handleCountdownClick = () => {
    if (!nextHighImpactEvent) return;

    const eventDate = nextHighImpactEvent.date;
    const [year, month] = eventDate.split("-").map(Number);

    // Check if we need to navigate to a different month
    const eventMonth = new Date(year, month - 1, 1);
    const needsNavigation =
      currentMonth.getFullYear() !== eventMonth.getFullYear() ||
      currentMonth.getMonth() !== eventMonth.getMonth();

    if (needsNavigation) {
      // Determine slide direction based on whether going forward or backward
      const isForward =
        eventMonth.getFullYear() > currentMonth.getFullYear() ||
        (eventMonth.getFullYear() === currentMonth.getFullYear() &&
          eventMonth.getMonth() > currentMonth.getMonth());

      // Start slide-out animation
      setIsSliding(true);
      setSlideDirection(isForward ? "left" : "right");

      // After slide-out completes, change month and slide-in from opposite direction
      setTimeout(() => {
        setCurrentMonth(eventMonth);
        // Slide in from opposite side
        setSlideDirection(isForward ? "right" : "left");

        // Small delay then remove sliding state to trigger slide-in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSlideDirection(null);
            setIsSliding(false);

            // Trigger the border pulse animation after the slide completes
            setTimeout(() => {
              setAnimatedDay(eventDate);

              // Clear the animation after it completes
              setTimeout(() => {
                setAnimatedDay(null);
              }, 2000);
            }, 150);
          });
        });
      }, 250);
    } else {
      // Same month, just animate
      setAnimatedDay(eventDate);

      // Clear the animation after it completes (2s matches CSS duration)
      setTimeout(() => {
        setAnimatedDay(null);
      }, 2000);
    }
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  // Selected day events for modal
  // Filter out holidays and early close from the popup - they show as grid cell tags instead
  const selectedDayEvents = selectedDay
    ? (eventsByDate[selectedDay] || []).filter(e => e.impact !== "holiday" && e.impact !== "early_close")
    : [];

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="h-full flex flex-col gap-3 overflow-hidden animate-pulse">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="space-y-2">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-8 w-24 rounded-lg" />
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="skeleton h-24 rounded-xl" />
      <div className="grid grid-cols-10 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-lg" />
        ))}
      </div>
      <div className="skeleton flex-1 rounded-xl" />
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Quick Stats & Countdown Bar */}
      <div className="glass rounded-xl p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Live Time & Date */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-background/50 border border-border/50">
            <Clock className="w-4.5 h-4.5 text-accent-light" />
            <span className="text-base font-mono font-bold text-foreground">
              {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="text-muted">|</span>
            <span className="text-sm font-medium text-foreground">
              {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>

          {/* Toggle Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newShowEvents = !showEvents;
                setShowEvents(newShowEvents);
                // Sync with filter impacts
                if (newShowEvents) {
                  setFilterImpacts(new Set(["high", "medium", "low"]));
                } else {
                  setFilterImpacts(new Set());
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showEvents
                  ? "bg-red-500/20 border border-red-500/50 text-red-400"
                  : "bg-background/50 border border-border text-muted hover:text-foreground"
              }`}
              title={showEvents ? "Hide events" : "Show events"}
            >
              {showEvents ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Events</span>
            </button>
            <button
              onClick={() => setShowTenDayWindow(!showTenDayWindow)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showTenDayWindow
                  ? "bg-accent/20 border border-accent/50 text-accent-light"
                  : "bg-background/50 border border-border text-muted hover:text-foreground"
              }`}
              title={showTenDayWindow ? "Hide 10-day window" : "Show 10-day window"}
            >
              {showTenDayWindow ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">10-Day</span>
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showNotes
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
                  : "bg-background/50 border border-border text-muted hover:text-foreground"
              }`}
              title={showNotes ? "Hide trades" : "Show trades"}
            >
              {showNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Trades</span>
            </button>
          </div>
        </div>

        {/* Right Side - Legend, Filter, and Countdown */}
        <div className="flex items-center gap-4">
          {/* Impact Level Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[10px] text-muted">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              High
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Medium
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Low
            </div>
          </div>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                showFilters || filterImpacts.size < 3 || filterCategory !== "All" || !showHolidays || !showPastEvents
                  ? "bg-white/10 border border-white/30 text-white"
                  : "bg-background/50 hover:bg-card-hover text-muted hover:text-foreground"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {showFilters && (
              <div className="absolute top-full right-0 mt-2 z-50 w-80 bg-card rounded-xl border border-border shadow-xl p-4 space-y-4 animate-slide-in">
                {/* Impact Filter - Multi-select */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Impact Level (select multiple)</label>
                  <div className="flex gap-1.5">
                    {["high", "medium", "low"].map((impact) => {
                      const isSelected = filterImpacts.has(impact);
                      return (
                        <button
                          key={impact}
                          onClick={() => {
                            const newSet = new Set(filterImpacts);
                            if (isSelected) {
                              newSet.delete(impact);
                            } else {
                              newSet.add(impact);
                            }
                            setFilterImpacts(newSet);
                            // Sync with showEvents toggle
                            setShowEvents(newSet.size > 0);
                          }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                            isSelected
                              ? "bg-accent/20 border-accent/50 text-accent-light"
                              : "bg-card-hover border-border text-muted hover:text-foreground"
                          }`}
                        >
                          <span className={`inline-block w-2 h-2 rounded-full ${impactColors[impact]} mr-1.5`} />
                          {impact.charAt(0).toUpperCase() + impact.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category Filter - Only High Impact Categories */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">
                    High-Impact Categories
                    <span className="text-[10px] text-muted/70 ml-1">({highImpactCategories.length} available)</span>
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-card-hover border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="All">All Categories</option>
                    {highImpactCategories.map(({ category, count }) => (
                      <option key={category} value={category}>
                        {categoryLabels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ({count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Toggle Options */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted mb-2">Display Options</label>

                  {/* Show Holidays Toggle */}
                  <button
                    onClick={() => setShowHolidays(!showHolidays)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                      showHolidays
                        ? "bg-accent/10 border-accent/30 text-foreground"
                        : "bg-card-hover border-border text-muted"
                    }`}
                  >
                    <span className="text-xs font-medium">Show Holidays</span>
                    <div className={`w-9 h-5 rounded-full transition-colors relative ${showHolidays ? "bg-accent" : "bg-gray-600"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${showHolidays ? "left-[18px]" : "left-0.5"}`} />
                    </div>
                  </button>

                  {/* Show Past Events Toggle */}
                  <button
                    onClick={() => setShowPastEvents(!showPastEvents)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                      showPastEvents
                        ? "bg-accent/10 border-accent/30 text-foreground"
                        : "bg-card-hover border-border text-muted"
                    }`}
                  >
                    <span className="text-xs font-medium">Show Past Events</span>
                    <div className={`w-9 h-5 rounded-full transition-colors relative ${showPastEvents ? "bg-accent" : "bg-gray-600"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${showPastEvents ? "left-[18px]" : "left-0.5"}`} />
                    </div>
                  </button>
                </div>

                {/* Reset */}
                {(filterImpacts.size < 3 || filterCategory !== "All" || !showHolidays || !showPastEvents) && (
                  <div className="pt-2 border-t border-border">
                    <button
                      onClick={() => {
                        setFilterImpacts(new Set(["high", "medium", "low"]));
                        setFilterCategory("All");
                        setShowHolidays(true);
                        setShowPastEvents(true);
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Reset all
                    </button>
                  </div>
                )}

                {/* Delete All Trades */}
                {trades.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-border">
                    <button
                      onClick={() => {
                        setShowDeleteAllTradesConfirm(true);
                        setShowFilters(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete All Trades ({trades.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next High-Impact Countdown */}
          {showEvents && nextHighImpactEvent && (
            <button
              onClick={handleCountdownClick}
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 pulse-high-impact" />
                <Timer className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs text-red-400 font-medium">Next High-Impact</span>
                <span className="text-xs text-muted truncate max-w-[180px]">{nextHighImpactEvent.event}</span>
              </div>
              <div className="text-lg font-bold text-red-400 font-mono">
                {countdown}
              </div>
            </button>
          )}
        </div>
      </div>


      {/* 10-Day Window */}
      {showTenDayWindow && (
      <div className="glass rounded-xl p-3 flex-shrink-0">
        <h2 className="text-xs font-medium text-muted mb-3">10-Day Window</h2>
        <div className="grid grid-cols-10 gap-2">
          {tenDayWindow.map((date, dayIndex) => {
            const dateKey = formatDateKey(date);
            const dayEvents = eventsByDate[dateKey] || [];
            const highestImpact = getHighestImpact(dateKey);
            const isCurrentDay = isToday(date);
            const isPastDay = isPast(date) && !isCurrentDay;
            const isHighlighted = highlightedDay === dateKey;
            const isHovered = hoveredDay === dateKey;
            const isAnimated = animatedDay === dateKey;
            const highCount = dayEvents.filter((e) => e.impact === "high").length;
            const medCount = dayEvents.filter((e) => e.impact === "medium").length;
            const lowCount = dayEvents.filter((e) => e.impact === "low").length;

            // Determine popup alignment based on position
            // First 2 days: align left, Last 2 days: align right, Others: center
            const isFirstDays = dayIndex < 2;
            const isLastDays = dayIndex >= 8;

            return (
              <div key={dateKey} className="relative">
                <button
                  onClick={() => handleDayClick(dateKey)}
                  onMouseEnter={() => setHoveredDay(dateKey)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`relative w-full h-24 flex flex-col items-center justify-center p-2 rounded-lg transition-all glass-hover ${
                    isHighlighted
                      ? "bg-accent/20 ring-2 ring-accent/50 border border-accent/30"
                      : isCurrentDay
                      ? "today-glow bg-accent-light/10 border border-accent-light/50"
                      : isPastDay
                      ? "bg-background/30 border border-border/30 opacity-50"
                      : "bg-card-hover/50 border border-border/50 hover:border-accent/30"
                  } ${isAnimated ? "animate-border-pulse" : ""}`}
                >
                  {/* Impact indicator with pulse for high */}
                  {highestImpact && (
                    <div
                      className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${impactColors[highestImpact]} ${
                        highestImpact === "high" && !isPastDay ? "pulse-high-impact" : ""
                      }`}
                    />
                  )}

                  {/* Today label at top */}
                  {isCurrentDay && (
                    <div className="text-[8px] font-bold text-accent-light tracking-wider absolute top-1.5 left-1.5">TODAY</div>
                  )}

                  {/* Day of week */}
                  <div className={`text-[10px] uppercase ${isCurrentDay ? "text-accent-light font-semibold" : "text-muted/70"}`}>
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>

                  {/* Date */}
                  <div className={`text-lg font-bold ${isCurrentDay ? "text-accent-light" : ""}`}>
                    {date.getDate()}
                  </div>

                  {/* Event count with impact breakdown */}
                  <div className="flex items-center gap-0.5 mt-1 h-4">
                    {highCount > 0 && (
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-[9px] text-red-400 ml-0.5">{highCount}</span>
                      </div>
                    )}
                    {medCount > 0 && (
                      <div className="flex items-center ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        <span className="text-[9px] text-yellow-400 ml-0.5">{medCount}</span>
                      </div>
                    )}
                    {lowCount > 0 && (
                      <div className="flex items-center ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] text-emerald-400 ml-0.5">{lowCount}</span>
                      </div>
                    )}
                    {dayEvents.length === 0 && <span className="text-[10px] text-muted">—</span>}
                  </div>
                </button>

                {/* Hover Preview Tooltip - exclude holidays */}
                {(() => {
                  const nonHolidayEvents = dayEvents.filter(e => e.impact !== "holiday");
                  return isHovered && nonHolidayEvents.length > 0 && !showModal && (
                    <div className={`absolute top-full mt-2 z-50 w-56 bg-card rounded-lg p-2 shadow-xl border border-border animate-slide-in ${
                      isFirstDays
                        ? "left-0"
                        : isLastDays
                        ? "right-0"
                        : "left-1/2 -translate-x-1/2"
                    }`}>
                      <div className="text-[10px] text-muted mb-1.5 font-medium">
                        {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {nonHolidayEvents.slice(0, 4).map((event) => (
                          <div key={event.id} className="flex items-start gap-2 text-[10px]">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${impactColors[event.impact]}`} />
                            <div className="flex-1 min-w-0">
                              <span className="text-muted">{event.time}</span>
                              <span className="mx-1 text-border">•</span>
                              <span className="text-foreground truncate">{event.event}</span>
                            </div>
                          </div>
                        ))}
                        {nonHolidayEvents.length > 4 && (
                          <div className="text-[10px] text-accent-light">+{nonHolidayEvents.length - 4} more</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Month Calendar */}
      <div className={`bg-card rounded-xl border border-border flex-1 flex flex-col overflow-hidden min-h-0 transition-all ease-out ${
        isSliding ? "duration-250" : "duration-200"
      } ${
        slideDirection === "left" ? "translate-x-[-50%] opacity-0" :
        slideDirection === "right" ? "translate-x-[50%] opacity-0" :
        "translate-x-0 opacity-100"
      }`}>
        {/* Calendar Header with P&L Summary */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-1.5 rounded-lg hover:bg-card-hover transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Center: Month Title + Monthly P&L Summary */}
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-semibold">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>

            {/* Monthly P&L - Clickable */}
            {showNotes && (pnlSummary.monthlyDays > 0 || pnlSummary.monthlyTrades > 0) && (
              <button
                onClick={() => setShowMonthSummary(true)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border transition-all hover:scale-105 cursor-pointer ${
                  pnlSummary.monthlyPnL >= 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                }`}
              >
                <span className="text-muted text-[10px] uppercase tracking-wider">Month:</span>
                <span className="font-bold">
                  {pnlSummary.monthlyPnL >= 0 ? "+" : ""}${pnlSummary.monthlyPnL.toFixed(0)}
                </span>
                {pnlSummary.monthlyTrades > 0 && (
                  <span className="text-muted text-[10px]">
                    ({pnlSummary.monthlyTrades} trades)
                  </span>
                )}
                <BarChart3 className="w-3 h-3 ml-1 opacity-60" />
              </button>
            )}
          </div>

          <button
            onClick={() => navigateMonth("next")}
            className="p-1.5 rounded-lg hover:bg-card-hover transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2 flex-shrink-0">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <div
              key={day}
              className={`px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider ${
                index === 0 || index === 6 ? "text-muted/50" : "text-muted/70"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0 auto-rows-fr p-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDay }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-lg bg-background/20" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dateKey = formatDateKey(date);
            const dayEvents = eventsByDate[dateKey] || [];
            const isCurrentDay = isToday(date);
            const isPastDay = isPast(date) && !isCurrentDay;
            const isHighlighted = highlightedDay === dateKey;
            const isAnimated = animatedDay === dateKey;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            const highCount = dayEvents.filter((e) => e.impact === "high").length;
            const medCount = dayEvents.filter((e) => e.impact === "medium").length;
            const lowCount = dayEvents.filter((e) => e.impact === "low").length;
            const holidayName = getHolidayName(dateKey);
            const earlyCloseInfo = getEarlyCloseInfo(dateKey);
            const isMarketClosed = holidayName !== null;
            const isEarlyClose = earlyCloseInfo !== null;

            // Trade journal data for this day
            const dayPnL = getDailyPnL(dateKey);
            const dayTradeCount = getTradeCount(dateKey);
            const hasPnL = dayTradeCount > 0;
            const hasTrades = dayTradeCount > 0;
            const isProfit = hasPnL && dayPnL >= 0;
            const isLoss = hasPnL && dayPnL < 0;

            // Check if this is a Saturday (day 6) - show weekly totals
            const isSaturday = date.getDay() === 6;
            const weekTotals = isSaturday ? getWeekTotals(date, currentMonth) : null;
            const hasWeeklyData = weekTotals && weekTotals.weekDays > 0;
            const hasSaturdayTrade = hasPnL || hasTrades;

            // Format P&L display
            const formatPnL = (pnl: number) => {
              const formatted = Math.abs(pnl).toFixed(0);
              return pnl >= 0 ? `$${formatted}` : `-$${formatted}`;
            };

            // Saturday with weekly data gets two-column layout
            if (isSaturday && showNotes && hasWeeklyData) {
              return (
                <div
                  key={day}
                  className={`p-1.5 rounded-lg text-left transition-all duration-200 group relative hover:scale-[1.02] hover:-translate-y-0.5 hover:z-10 hover:shadow-md ${
                    isHighlighted
                      ? "bg-accent/15 ring-2 ring-accent/40 shadow-lg shadow-accent/20"
                      : showNotes && isProfit
                      ? "bg-emerald-500/20 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/10"
                      : showNotes && isLoss
                      ? "bg-red-500/20 ring-1 ring-red-500/30 shadow-md shadow-red-500/10"
                      : (isMarketClosed || isEarlyClose) && showHolidays
                      ? "bg-gray-500/15 ring-1 ring-gray-500/30 shadow-sm hover:scale-[1.02] hover:-translate-y-0.5 hover:z-10"
                      : "bg-card/50 ring-1 ring-border/50"
                  } ${isAnimated ? "animate-border-pulse" : ""}`}
                >
                  <div className="flex h-full">
                    {/* Left Column - Daily Data (Clickable) */}
                    <button
                      onClick={() => handleDayClick(dateKey)}
                      className={`flex-1 flex flex-col pr-2 mr-1 border-r-2 border-border/50 text-left transition-colors rounded-l ${isPastDay && !isProfit && !isLoss ? "opacity-60" : ""}`}
                    >
                      {/* Day Number with Event Indicators */}
                      <div className={`text-xs font-medium flex items-center gap-1.5 ${isPastDay ? "text-muted" : "text-muted/70"}`}>
                        {day}
                        {/* Event Indicators - inline with date */}
                        {showEvents && dayEvents.length > 0 && (
                          <div className="flex items-center gap-1">
                            {highCount > 0 && (
                              <div className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[9px] text-red-400 ml-0.5 font-medium">{highCount}</span>
                              </div>
                            )}
                            {medCount > 0 && (
                              <div className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                <span className="text-[9px] text-yellow-400 ml-0.5">{medCount}</span>
                              </div>
                            )}
                            {lowCount > 0 && (
                              <div className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[9px] text-emerald-400 ml-0.5">{lowCount}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Trade P&L Display */}
                      {showNotes && hasPnL && (
                        <div className={`text-sm font-bold mt-0.5 ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                          {formatPnL(dayPnL)}
                        </div>
                      )}

                      {/* Trades count */}
                      {showNotes && hasTrades && (
                        <div className="text-xs text-muted">
                          {dayTradeCount} Trade{dayTradeCount !== 1 ? "s" : ""}
                        </div>
                      )}
                    </button>

                    {/* Holiday Tag - Outside opacity div */}
                    {holidayName && showHolidays && (
                      <div className="absolute bottom-1 left-1 right-[47%] z-20">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-600/90 text-gray-100 border border-gray-500/50 truncate block">
                          {holidayName} - Closed
                        </span>
                      </div>
                    )}

                    {/* Early Close Tag - Outside opacity div */}
                    {earlyCloseInfo && showHolidays && !holidayName && (
                      <div className="absolute bottom-1 left-1 right-[47%] z-20">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-600/90 text-gray-100 border border-gray-500/50 truncate block">
                          Early Close - {earlyCloseInfo.closeTimeLocal}
                        </span>
                      </div>
                    )}

                    {/* Right Column - Weekly Summary (Clickable) */}
                    <button
                      onClick={() => setShowWeekSummary({ show: true, saturdayDate: date })}
                      className={`w-[45%] flex flex-col items-center justify-center pl-1 rounded-r relative z-10 border-l-2 hover:brightness-110 transition-all ${
                        weekTotals!.weekPnL >= 0
                          ? "bg-emerald-500/40 border-emerald-400/60"
                          : "bg-red-500/40 border-red-400/60"
                      }`}
                    >
                      <div className="text-[8px] text-white/80 uppercase tracking-wider font-semibold">Week</div>
                      <div className={`text-[13px] font-bold ${
                        weekTotals!.weekPnL >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {weekTotals!.weekPnL >= 0 ? "+" : ""}${weekTotals!.weekPnL.toFixed(0)}
                      </div>
                      {weekTotals!.weekTrades > 0 && (
                        <div className="text-[10px] text-white/70">
                          {weekTotals!.weekTrades} trades
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            // Regular day cell (non-Saturday or Saturday without weekly data)
            return (
              <button
                key={day}
                onClick={() => handleDayClick(dateKey)}
                className={`p-2 rounded-lg text-left transition-all duration-200 flex flex-col group relative ${
                  isHighlighted
                    ? "bg-accent/15 ring-2 ring-accent/40 shadow-lg shadow-accent/20"
                    : showNotes && isProfit
                    ? "bg-emerald-500/20 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] hover:-translate-y-0.5 hover:z-10"
                    : showNotes && isLoss
                    ? "bg-red-500/20 ring-1 ring-red-500/30 shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] hover:-translate-y-0.5 hover:z-10"
                    : (isMarketClosed || isEarlyClose) && showHolidays
                    ? "bg-gray-500/15 ring-1 ring-gray-500/30 shadow-sm hover:scale-[1.02] hover:-translate-y-0.5 hover:z-10"
                    : isCurrentDay
                    ? "bg-accent-light/15 ring-2 ring-accent-light/40 shadow-lg shadow-accent-light/20 hover:scale-[1.02] hover:-translate-y-0.5 hover:z-10"
                    : isPastDay
                    ? "bg-card/30 ring-1 ring-border/50 opacity-60"
                    : isWeekend
                    ? "bg-card/40 ring-1 ring-border/50 hover:bg-card/60 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 hover:z-10"
                    : "bg-card/50 ring-1 ring-border/50 hover:bg-card/80 hover:shadow-md hover:ring-border hover:scale-[1.02] hover:-translate-y-0.5 hover:z-10"
                } ${isAnimated ? "animate-border-pulse" : ""}`}
              >
                {/* Day Number Row with Event Indicators */}
                <div className={`text-xs font-medium flex items-center justify-between ${
                  isCurrentDay ? "text-accent-light" : isPastDay ? "text-muted" : isWeekend ? "text-muted/70" : ""
                }`}>
                  <div className="flex items-center gap-1.5">
                    {day}
                    {isCurrentDay && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-accent-light/20 text-accent-light font-bold">
                        TODAY
                      </span>
                    )}
                    {/* Event Indicators - inline with date */}
                    {showEvents && dayEvents.length > 0 && (
                      <div className="flex items-center gap-1">
                        {highCount > 0 && (
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full bg-red-500 ${!isPastDay && highCount > 0 ? "group-hover:scale-125 transition-transform" : ""}`} />
                            <span className="text-[9px] text-red-400 ml-0.5 font-medium">{highCount}</span>
                          </div>
                        )}
                        {medCount > 0 && (
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-[9px] text-yellow-400 ml-0.5">{medCount}</span>
                          </div>
                        )}
                        {lowCount > 0 && (
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[9px] text-emerald-400 ml-0.5">{lowCount}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Trade P&L Display */}
                {showNotes && hasPnL && (
                  <div className={`text-sm font-bold mt-0.5 ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPnL(dayPnL)}
                  </div>
                )}

                {/* Trades count */}
                {showNotes && hasTrades && (
                  <div className="text-xs text-muted">
                    {dayTradeCount} Trade{dayTradeCount !== 1 ? "s" : ""}
                  </div>
                )}

                {/* Holiday Tag - Always bright */}
                {holidayName && showHolidays && (
                  <div className="mt-auto pt-1">
                    <span className="text-[10px] font-medium px-2 py-1 rounded bg-gray-600/90 text-gray-100 border border-gray-500/50 truncate block">
                      {holidayName} - Market Closed
                    </span>
                  </div>
                )}

                {/* Early Close Tag - Always bright */}
                {earlyCloseInfo && showHolidays && !holidayName && (
                  <div className="mt-auto pt-1">
                    <span className="text-[10px] font-medium px-2 py-1 rounded bg-gray-600/90 text-gray-100 border border-gray-500/50 truncate block">
                      Early Close - {earlyCloseInfo.closeTimeLocal}
                    </span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Empty cells after month ends - with phantom Saturday weekly summaries */}
          {Array.from({ length: (7 - ((startingDay + daysInMonth) % 7)) % 7 }).map((_, i) => {
            // Calculate the day of week for this empty cell
            // startingDay is the day of week of the 1st, daysInMonth is how many days
            // So the last day of month is at position (startingDay + daysInMonth - 1)
            // This empty cell is at position (startingDay + daysInMonth + i)
            const cellDayOfWeek = (startingDay + daysInMonth + i) % 7;

            // If this is a Saturday (day 6), check for partial week data
            if (cellDayOfWeek === 6 && showNotes) {
              // Calculate the phantom Saturday date (next month)
              const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
              const daysUntilSaturday = i + 1; // i is 0-indexed, so add 1
              const phantomSaturdayDate = new Date(lastDayOfMonth);
              phantomSaturdayDate.setDate(lastDayOfMonth.getDate() + daysUntilSaturday);

              // Get week totals bounded by current month
              const weekTotals = getWeekTotals(phantomSaturdayDate, currentMonth);
              const hasWeeklyData = weekTotals && weekTotals.weekDays > 0;

              if (hasWeeklyData) {
                return (
                  <div
                    key={`empty-end-${i}`}
                    className="rounded-lg bg-background/20 p-1"
                  >
                    <div className="flex h-full">
                      {/* Left Column - Empty (no daily data for phantom day) */}
                      <div className="flex-1 flex flex-col pr-2 mr-1 border-r-2 border-border/50" />

                      {/* Right Column - Weekly Summary (Clickable) */}
                      <button
                        onClick={() => setShowWeekSummary({ show: true, saturdayDate: phantomSaturdayDate })}
                        className={`w-[45%] flex flex-col items-center justify-center pl-1 rounded-r relative z-10 border-l-2 hover:brightness-110 transition-all ${
                          weekTotals.weekPnL >= 0
                            ? "bg-emerald-500/40 border-emerald-400/60"
                            : "bg-red-500/40 border-red-400/60"
                        }`}
                      >
                        <div className="text-[8px] text-white/80 uppercase tracking-wider font-semibold">Week</div>
                        <div className={`text-[13px] font-bold ${
                          weekTotals.weekPnL >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {weekTotals.weekPnL >= 0 ? "+" : ""}${weekTotals.weekPnL.toFixed(0)}
                        </div>
                        {weekTotals.weekTrades > 0 && (
                          <div className="text-[10px] text-white/70">
                            {weekTotals.weekTrades} trades
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                );
              }
            }

            // Regular empty cell
            return (
              <div key={`empty-end-${i}`} className="rounded-lg bg-background/20" />
            );
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      {showModal && selectedDay && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowModal(false);
            setHighlightedDay(null);
            setExpandedEventId(null);
          }}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div>
                <h3 className="font-bold text-lg">
                  {(() => {
                    const [year, month, day] = selectedDay.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    });
                  })()}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-muted">
                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
                  </p>
                  {selectedDayTrades.length > 0 && (
                    <p className={`text-xs font-semibold ${selectedDayPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {selectedDayTrades.length} trade{selectedDayTrades.length !== 1 ? "s" : ""} • {selectedDayPnL >= 0 ? "+" : ""}${selectedDayPnL.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setHighlightedDay(null);
                  setShowNoteModal(false);
                  setShowTradeForm(false);
                  setModalTab("events");
                }}
                className="p-2 rounded-lg hover:bg-card-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-border/50">
              <button
                onClick={() => setModalTab("events")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  modalTab === "events"
                    ? "bg-accent/20 text-accent-light"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Events
                {selectedDayEvents.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-accent/30 rounded-full">{selectedDayEvents.length}</span>
                )}
              </button>
              <button
                onClick={() => setModalTab("trades")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  modalTab === "trades"
                    ? "bg-accent/20 text-accent-light"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Trades
                {selectedDayTrades.length > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${selectedDayPnL >= 0 ? "bg-emerald-500/30" : "bg-red-500/30"}`}>
                    {selectedDayTrades.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1">
              {/* Events Tab */}
              {modalTab === "events" && (
                <>
                  {selectedDayEvents.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-card-hover/50 flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-muted" />
                      </div>
                      <p className="text-muted">No events scheduled for this day</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {selectedDayEvents.map((event, index) => {
                        const isExpanded = expandedEventId === event.id;

                        return (
                          <div
                            key={event.id}
                            className={`rounded-lg overflow-hidden border border-border/50 animate-slide-in impact-border-${event.impact}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Event Header - Clickable */}
                        <button
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                          className="w-full px-4 py-3 hover:bg-card-hover/50 transition-colors text-left bg-card/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${impactColors[event.impact]} ${
                                event.impact === "high" ? "pulse-high-impact" : ""
                              }`} />
                              <div className="w-0.5 h-full bg-border/30 mt-1" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Time and Event Name Row */}
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono font-bold text-accent-light">{event.time}</span>
                                  <span className="text-[10px] text-muted capitalize px-1.5 py-0.5 bg-background/50 rounded">
                                    {event.category?.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <div className={`p-1 rounded transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                  <ChevronDown className="w-4 h-4 text-muted" />
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-foreground mb-2">{event.event}</p>

                              {/* Actual / Previous Row - Only show for events with data */}
                              {(event.actual || event.previous) && (
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-muted">Actual:</span>
                                    <span className={`font-semibold ${(() => {
                                      if (!event.actual) return "text-muted";
                                      if (!event.previous) return "text-foreground";

                                      // Parse numeric values, handling formats like "+0.1%", "-0.1%", "5.2M", etc.
                                      const actualNum = parseFloat(event.actual.replace(/[^0-9.-]/g, ''));
                                      const prevNum = parseFloat(event.previous.replace(/[^0-9.-]/g, ''));

                                      // Check if parsing was successful
                                      if (isNaN(actualNum) || isNaN(prevNum)) return "text-foreground";

                                      // Indicators where LOWER is better (red when higher, green when lower)
                                      const lowerIsBetter = [
                                        'Unemployment Rate',
                                        'Unemployment Claims',
                                      ].includes(event.event);

                                      if (lowerIsBetter) {
                                        // For unemployment-type indicators: lower = green, higher = red
                                        if (actualNum < prevNum) return "text-emerald-400";
                                        if (actualNum > prevNum) return "text-red-400";
                                      } else {
                                        // Default: higher = green, lower = red (most economic indicators)
                                        if (actualNum > prevNum) return "text-emerald-400";
                                        if (actualNum < prevNum) return "text-red-400";
                                      }
                                      return "text-foreground";
                                    })()}`}>
                                      {event.actual || "—"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-muted">Previous:</span>
                                    <span className="text-foreground">{event.previous || "—"}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-background/30 border-t border-border/30">
                            <div className="pl-6 pt-3 space-y-3">
                              {/* Description */}
                              {event.description && (
                                <div>
                                  <h4 className="text-xs font-semibold text-accent-light uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" />
                                    What it is
                                  </h4>
                                  <p className="text-sm text-foreground/90 leading-relaxed">{event.description}</p>
                                </div>
                              )}

                              {/* Typical Market Reaction - Condensed */}
                              {event.typicalReaction && (
                                <div className="flex items-center gap-3 text-xs py-2 px-3 bg-card/50 rounded-lg border border-border/30">
                                  {(event.typicalReaction.higherThanExpected || event.typicalReaction.hawkish) && (
                                    <div className="flex items-center gap-1.5">
                                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-400 font-semibold">
                                        {event.typicalReaction.hawkish ? 'Hawkish' : 'Higher'}
                                      </span>
                                      <span className="text-muted">=</span>
                                      <span className="text-foreground">Bullish USD</span>
                                    </div>
                                  )}
                                  {(event.typicalReaction.higherThanExpected || event.typicalReaction.hawkish) &&
                                   (event.typicalReaction.lowerThanExpected || event.typicalReaction.dovish) && (
                                    <span className="text-border">|</span>
                                  )}
                                  {(event.typicalReaction.lowerThanExpected || event.typicalReaction.dovish) && (
                                    <div className="flex items-center gap-1.5">
                                      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                      <span className="text-red-400 font-semibold">
                                        {event.typicalReaction.dovish ? 'Dovish' : 'Lower'}
                                      </span>
                                      <span className="text-muted">=</span>
                                      <span className="text-foreground">Bearish USD</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Frequency & Source */}
                              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                {event.frequency && (
                                  <span className="text-xs text-muted flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {event.frequency}
                                  </span>
                                )}
                                {event.sourceUrl && (
                                  <a
                                    href={event.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-accent-light hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors"
                                  >
                                    View Source
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                    </div>
                  )}
                </>
              )}

              {/* Trades Tab */}
              {modalTab === "trades" && (
                <div className="p-4">
                  {/* Add Trade Button */}
                  <button
                    onClick={() => openTradeForm()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 bg-accent/20 text-accent-light border border-accent/30 rounded-lg hover:bg-accent/30 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Log Trade
                  </button>

                  {/* Trade List */}
                  {selectedDayTrades.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No trades logged for this day</p>
                      <p className="text-xs mt-1">Click "Log Trade" to add your first trade</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Summary */}
                      <div className="flex items-center justify-between px-3 py-2 bg-card/50 rounded-lg border border-border/50 mb-3">
                        <span className="text-sm text-muted">
                          {selectedDayTrades.length} trade{selectedDayTrades.length !== 1 ? "s" : ""}
                        </span>
                        <span className={`text-sm font-bold ${selectedDayPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {selectedDayPnL >= 0 ? "+" : ""}${selectedDayPnL.toFixed(2)}
                        </span>
                      </div>

                      {/* Individual Trades */}
                      {selectedDayTrades.map((trade) => (
                        <div
                          key={trade.id}
                          className={`p-3 rounded-lg border transition-all ${
                            trade.pnl >= 0
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-red-500/5 border-red-500/20"
                          }`}
                        >
                          {/* Top Row */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{trade.ticker}</span>
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                trade.direction === "LONG"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}>
                                {trade.direction === "LONG" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {trade.direction}
                              </span>
                            </div>
                            <span className={`font-bold ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                            </span>
                          </div>

                          {/* Details Row */}
                          <div className="flex items-center gap-3 text-xs text-muted mb-2">
                            {trade.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {trade.time}
                              </span>
                            )}
                            {trade.entryPrice && trade.exitPrice && (
                              <span>{trade.entryPrice.toFixed(2)} → {trade.exitPrice.toFixed(2)}</span>
                            )}
                            {trade.size && <span>{trade.size} qty</span>}
                          </div>

                          {/* Tags */}
                          {trade.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                              {trade.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-0.5 text-[10px] rounded-full"
                                  style={{ backgroundColor: tag.color + "20", color: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Notes */}
                          {trade.notes && (
                            <p className="text-xs text-muted/80 italic mb-2 line-clamp-2">{trade.notes}</p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/30">
                            <button
                              onClick={() => openTradeForm(trade)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-accent transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTrade(trade.id, trade.ticker)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer - only show for events tab */}
            {modalTab === "events" && (
              <div className="px-5 py-3 border-t border-border/50 bg-card/50 flex-shrink-0">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Times shown in local time
                  </span>
                  <span className="text-accent-light">Click event to expand</span>
                </div>
              </div>
            )}
          </div>

          {/* Trade Entry Form - appears to the right */}
          {showTradeForm && (
            <div
              className="w-full max-w-md max-h-[80vh] glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden flex flex-col animate-slide-in ml-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Form Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div>
                  <h3 className="font-bold text-lg">{editingTrade ? "Edit Trade" : "Log Trade"}</h3>
                  <p className="text-xs text-muted">{selectedDay}</p>
                </div>
                <button
                  onClick={() => {
                    setShowTradeForm(false);
                    setEditingTrade(null);
                    setTradeFormData(DEFAULT_TRADE_FORM);
                  }}
                  className="p-2 rounded-lg hover:bg-card-hover transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Ticker & Direction */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                      <Hash className="w-4 h-4" />
                      Ticker
                    </label>
                    <input
                      type="text"
                      value={tradeFormData.ticker}
                      onChange={(e) => setTradeFormData((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                      placeholder="ES, NQ, SPY..."
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted mb-2 block">Direction</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTradeFormData((prev) => ({ ...prev, direction: "LONG" }))}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg border transition-all text-sm ${
                          tradeFormData.direction === "LONG"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-card border-border text-muted hover:border-emerald-500/50"
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Long
                      </button>
                      <button
                        type="button"
                        onClick={() => setTradeFormData((prev) => ({ ...prev, direction: "SHORT" }))}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg border transition-all text-sm ${
                          tradeFormData.direction === "SHORT"
                            ? "bg-red-500/20 border-red-500 text-red-400"
                            : "bg-card border-border text-muted hover:border-red-500/50"
                        }`}
                      >
                        <TrendingDown className="w-4 h-4" />
                        Short
                      </button>
                    </div>
                  </div>
                </div>

                {/* Entry & Exit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted mb-2 block">Entry Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeFormData.entryPrice}
                      onChange={(e) => setTradeFormData((prev) => ({ ...prev, entryPrice: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted mb-2 block">Exit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeFormData.exitPrice}
                      onChange={(e) => setTradeFormData((prev) => ({ ...prev, exitPrice: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                </div>

                {/* Size, Duration, P&L */}
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-sm font-medium text-muted mb-2 block">Size</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tradeFormData.size}
                      onChange={(e) => setTradeFormData((prev) => ({ ...prev, size: e.target.value }))}
                      placeholder="Qty"
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted mb-2 block">Duration</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={(() => {
                          const [h, m] = (tradeFormData.time || "00:00").split(":").map(Number);
                          const total = h * 60 + m;
                          return total > 0 ? String(total) : "";
                        })()}
                        onChange={(e) => {
                          const mins = parseInt(e.target.value.replace(/\D/g, "")) || 0;
                          const hours = Math.floor(mins / 60);
                          const minutes = mins % 60;
                          setTradeFormData((prev) => ({
                            ...prev,
                            time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
                          }));
                        }}
                        placeholder="mins"
                        className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 pr-16"
                      />
                      {(() => {
                        const [h, m] = (tradeFormData.time || "00:00").split(":").map(Number);
                        const total = h * 60 + m;
                        if (total >= 60) {
                          return (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                              {h}h{m > 0 ? ` ${m}m` : ""}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted mb-2 block">P&L</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tradeFormData.pnl}
                      onChange={(e) => setTradeFormData((prev) => ({ ...prev, pnl: e.target.value }))}
                      placeholder="+/-"
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                    <TagIcon className="w-4 h-4" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <div key={tag.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                            tradeFormData.tagIds.includes(tag.id)
                              ? "border-transparent"
                              : "border-border bg-card hover:border-border/80"
                          } ${tag.type === "CUSTOM" ? "pr-5" : ""}`}
                          style={
                            tradeFormData.tagIds.includes(tag.id)
                              ? { backgroundColor: tag.color + "30", color: tag.color, borderColor: tag.color }
                              : {}
                          }
                        >
                          {tag.name}
                        </button>
                        {tag.type === "CUSTOM" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({
                                show: true,
                                title: "Delete Tag?",
                                message: `Are you sure you want to delete the "${tag.name}" tag? This will remove it from all trades.`,
                                confirmText: "Delete",
                                onConfirm: async () => {
                                  await deleteTag(tag.id);
                                  setTradeFormData((prev) => ({
                                    ...prev,
                                    tagIds: prev.tagIds.filter((id) => id !== tag.id),
                                  }));
                                  setConfirmModal((prev) => ({ ...prev, show: false }));
                                },
                              });
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Add Custom Tag */}
                  {showNewTagInput ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Color options */}
                        {[
                          "#ef4444", // red
                          "#f97316", // orange
                          "#eab308", // yellow
                          "#22c55e", // green
                          "#3b82f6", // blue
                          "#6366f1", // indigo
                          "#a855f7", // violet
                          "#ffffff", // white
                        ].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewTagColor(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              newTagColor === color ? "border-accent scale-110" : "border-border hover:border-muted"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Tag name"
                          className="flex-1 px-3 py-1.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateTag(); } }}
                        />
                        <button onClick={handleCreateTag} className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90">Add</button>
                        <button onClick={() => setShowNewTagInput(false)} className="p-1.5 text-muted hover:text-foreground"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewTagInput(true)}
                      className="flex items-center gap-1.5 mt-2 text-xs text-accent hover:text-accent-light transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add custom tag
                    </button>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                    <FileText className="w-4 h-4" />
                    Notes
                  </label>
                  <textarea
                    value={tradeFormData.notes}
                    onChange={(e) => setTradeFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Trade reasoning, lessons..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                  />
                </div>
              </div>

              {/* Form Footer */}
              <div className="px-5 py-4 border-t border-border/50 bg-card/50 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowTradeForm(false);
                    setEditingTrade(null);
                    setTradeFormData(DEFAULT_TRADE_FORM);
                  }}
                  className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTrade}
                  disabled={savingTrade || !tradeFormData.ticker || !tradeFormData.pnl}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {savingTrade ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingTrade ? "Update" : "Save Trade"}
                </button>
              </div>
            </div>
          )}

          {/* Note Entry Modal - appears to the right */}
          {showNoteModal && (
            <div
              className="w-full max-w-sm max-h-[80vh] glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden flex flex-col animate-slide-in ml-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Note Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-light" />
                  <h3 className="font-bold text-lg">
                    {tradeNotes[selectedDay] ? "Edit Note" : "Add Note"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="p-2 rounded-lg hover:bg-card-hover transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Note Modal Content */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Trades Input */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                    <BarChart3 className="w-4 h-4" />
                    Number of Trades
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={noteFormData.trades}
                    onChange={(e) => setNoteFormData((prev) => ({ ...prev, trades: e.target.value }))}
                    placeholder="e.g., 3"
                    className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  />
                </div>

                {/* P&L Input */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                    <DollarSign className="w-4 h-4" />
                    Profit / Loss
                  </label>
                  <input
                    type="text"
                    value={noteFormData.pnl}
                    onChange={(e) => setNoteFormData((prev) => ({ ...prev, pnl: e.target.value }))}
                    placeholder="e.g., 150 or -75"
                    className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  />
                  <p className="text-[10px] text-muted mt-1">Use negative for losses (e.g., -75)</p>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                    <StickyNote className="w-4 h-4" />
                    Notes
                  </label>
                  <textarea
                    value={noteFormData.note}
                    onChange={(e) => setNoteFormData((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Trade notes, observations, lessons learned..."
                    rows={4}
                    className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 resize-none"
                  />
                </div>

                {/* Existing Note Preview */}
                {tradeNotes[selectedDay]?.note && (
                  <div className="p-3 bg-card/50 rounded-lg border border-border/50">
                    <p className="text-xs text-muted mb-1">Current Note:</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{tradeNotes[selectedDay].note}</p>
                  </div>
                )}
              </div>

              {/* Note Modal Footer */}
              <div className="px-5 py-4 border-t border-border/50 bg-card/50 flex items-center justify-between">
                {tradeNotes[selectedDay] && (
                  <button
                    onClick={deleteTradeNote}
                    disabled={savingNote}
                    className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
                <div className={`flex items-center gap-2 ${!tradeNotes[selectedDay] ? "ml-auto" : ""}`}>
                  <button
                    onClick={() => setShowNoteModal(false)}
                    className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTradeNote}
                    disabled={savingNote}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {savingNote ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Month Summary Modal */}
      {showMonthSummary && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowMonthSummary(false)}
        >
          <div
            className="w-full max-w-2xl glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-accent-light" />
                <h3 className="text-lg font-bold">
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })} Summary
                </h3>
              </div>
              <button
                onClick={() => setShowMonthSummary(false)}
                className="p-1.5 rounded-lg hover:bg-card-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {monthlyBreakdown.tradingDays === 0 ? (
                <div className="text-center py-8 text-muted">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No trading data for this month</p>
                  <p className="text-xs mt-1">Add trades to see your breakdown</p>
                </div>
              ) : (
                <>
                  {/* Hero Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Total P&L - Large */}
                    <div className={`p-4 rounded-xl border-2 ${monthlyBreakdown.totalPnL >= 0 ? "bg-emerald-500/10 border-emerald-500/40" : "bg-red-500/10 border-red-500/40"}`}>
                      <div className="text-xs text-muted uppercase tracking-wider mb-1">Total P&L</div>
                      <div className={`text-3xl font-bold ${monthlyBreakdown.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {monthlyBreakdown.totalPnL >= 0 ? "+" : ""}${monthlyBreakdown.totalPnL.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted mt-1">{monthlyBreakdown.totalTrades} trades over {monthlyBreakdown.tradingDays} days</div>
                    </div>

                    {/* Win Rate with breakdown */}
                    <div className={`p-4 rounded-xl border ${monthlyBreakdown.tradeWinRate >= 50 ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30"}`}>
                      <div className="text-xs text-muted uppercase tracking-wider mb-1">Win Rate</div>
                      <div className={`text-3xl font-bold ${monthlyBreakdown.tradeWinRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                        {monthlyBreakdown.tradeWinRate.toFixed(0)}%
                      </div>
                      <div className="text-xs mt-1">
                        <span className="text-emerald-400">{monthlyBreakdown.winningTrades}W</span>
                        <span className="text-muted mx-1">/</span>
                        <span className="text-red-400">{monthlyBreakdown.losingTrades}L</span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                      onMouseEnter={() => setShowProfitFactorTooltip('monthly')}
                      onMouseLeave={() => setShowProfitFactorTooltip(null)}
                    >
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        Profit Factor
                        <Info className="w-3 h-3 text-muted/50" />
                      </div>
                      <div className={`text-xl font-bold ${monthlyBreakdown.profitFactor >= 1 ? "text-emerald-400" : "text-red-400"}`}>
                        {monthlyBreakdown.profitFactor === Infinity ? "∞" : monthlyBreakdown.profitFactor.toFixed(2)}
                      </div>
                      {/* Custom Tooltip */}
                      {showProfitFactorTooltip === 'monthly' && (
                        <div className="absolute top-full left-0 mt-2 z-50 pointer-events-none">
                          <div className="absolute left-4 -top-1.5 w-3 h-3 bg-slate-900 border-l-2 border-t-2 border-accent/50 rotate-45"></div>
                          <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[220px]">
                            <div className="text-sm font-semibold text-foreground mb-1 text-left">Profit Factor</div>
                            <div className="text-[11px] text-muted mb-3 text-left">Gross Profit ÷ Gross Loss</div>
                            <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                              <span className="text-emerald-400 font-medium">${(monthlyBreakdown.avgWin * monthlyBreakdown.winningTrades).toFixed(0)}</span>
                              <span className="text-muted/70">÷</span>
                              <span className="text-red-400 font-medium">${(monthlyBreakdown.avgLoss * monthlyBreakdown.losingTrades).toFixed(0)}</span>
                              <span className="text-muted/70">=</span>
                              <span className={`font-bold text-lg ${monthlyBreakdown.profitFactor >= 1 ? "text-emerald-400" : "text-red-400"}`}>
                                {monthlyBreakdown.profitFactor === Infinity ? "∞" : monthlyBreakdown.profitFactor.toFixed(2)}
                              </span>
                            </div>
                            <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${monthlyBreakdown.profitFactor >= 1.5 ? "text-emerald-400/80" : monthlyBreakdown.profitFactor >= 1 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                              {monthlyBreakdown.profitFactor >= 2 ? "✓ Excellent! Above 2 is very strong" :
                               monthlyBreakdown.profitFactor >= 1.5 ? "✓ Good! Above 1.5 is solid" :
                               monthlyBreakdown.profitFactor >= 1 ? "○ Profitable, room to improve" :
                               "✗ Losing money - review strategy"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                      onMouseEnter={() => setShowAvgTradeTooltip('monthly')}
                      onMouseLeave={() => setShowAvgTradeTooltip(null)}
                    >
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        Avg / Trade
                        <Info className="w-3 h-3 text-muted/50" />
                      </div>
                      <div className={`text-xl font-bold ${(monthlyBreakdown.totalPnL / monthlyBreakdown.totalTrades) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {(monthlyBreakdown.totalPnL / monthlyBreakdown.totalTrades) >= 0 ? "+" : ""}${(monthlyBreakdown.totalPnL / monthlyBreakdown.totalTrades).toFixed(0)}
                      </div>
                      {/* Avg/Trade Tooltip */}
                      {showAvgTradeTooltip === 'monthly' && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none">
                          <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-slate-900 border-l-2 border-t-2 border-accent/50 rotate-45"></div>
                          <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[220px]">
                            <div className="text-sm font-semibold text-foreground mb-1">Average Per Trade</div>
                            <div className="text-[11px] text-muted mb-3">Your average profit or loss on each trade.</div>
                            <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                              <span className={`font-medium ${monthlyBreakdown.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${monthlyBreakdown.totalPnL.toFixed(0)}</span>
                              <span className="text-muted/70">÷</span>
                              <span className="text-muted font-medium">{monthlyBreakdown.totalTrades} trades</span>
                              <span className="text-muted/70">=</span>
                              <span className={`font-bold text-lg ${(monthlyBreakdown.totalPnL / monthlyBreakdown.totalTrades) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                ${(monthlyBreakdown.totalPnL / monthlyBreakdown.totalTrades).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                      onMouseEnter={() => setShowAvgDayTooltip('monthly')}
                      onMouseLeave={() => setShowAvgDayTooltip(null)}
                    >
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        Avg / Day
                        <Info className="w-3 h-3 text-muted/50" />
                      </div>
                      <div className={`text-xl font-bold ${monthlyBreakdown.avgPnLPerDay >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {monthlyBreakdown.avgPnLPerDay >= 0 ? "+" : ""}${monthlyBreakdown.avgPnLPerDay.toFixed(0)}
                      </div>
                      {/* Avg/Day Tooltip */}
                      {showAvgDayTooltip === 'monthly' && (
                        <div className="absolute top-full right-0 mt-2 z-50 pointer-events-none">
                          <div className="absolute right-4 -top-1.5 w-3 h-3 bg-slate-900 border-l-2 border-t-2 border-accent/50 rotate-45"></div>
                          <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[220px]">
                            <div className="text-sm font-semibold text-foreground mb-1 text-left">Average Per Day</div>
                            <div className="text-[11px] text-muted mb-3 text-left">Your average daily P&L on days you traded.</div>
                            <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                              <span className={`font-medium ${monthlyBreakdown.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${monthlyBreakdown.totalPnL.toFixed(0)}</span>
                              <span className="text-muted/70">÷</span>
                              <span className="text-muted font-medium">{monthlyBreakdown.tradingDays} days</span>
                              <span className="text-muted/70">=</span>
                              <span className={`font-bold text-lg ${monthlyBreakdown.avgPnLPerDay >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                ${monthlyBreakdown.avgPnLPerDay.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Equity Curve */}
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="text-xs font-medium text-muted mb-3">Equity Curve</div>
                    <div className="h-36 relative pr-16" onMouseLeave={() => setHoveredTrade(null)}>
                      {monthlyBreakdown.tradeByTradeData.length > 0 && (() => {
                        const dataWithStart = [{ cumulative: 0, pnl: 0 }, ...monthlyBreakdown.tradeByTradeData];
                        const values = dataWithStart.map(d => d.cumulative);
                        const min = Math.min(...values);
                        const max = Math.max(...values);
                        const range = max - min || 1;
                        const zeroY = ((max - 0) / range) * 100;

                        // Calculate nice grid lines (only top, middle, bottom)
                        const gridLines = [
                          { value: max, y: 0 },
                          { value: (max + min) / 2, y: 50 },
                          { value: min, y: 100 }
                        ];

                        return (
                          <>
                            <svg className="w-full h-full" style={{ overflow: 'visible' }}>
                              {/* Horizontal grid lines with labels inside */}
                              {gridLines.map((line, i) => (
                                <g key={`grid-${i}`}>
                                  <line
                                    x1="0"
                                    y1={`${line.y}%`}
                                    x2="100%"
                                    y2={`${line.y}%`}
                                    stroke="currentColor"
                                    strokeOpacity={Math.abs(line.value) < 0.01 ? "0.25" : "0.08"}
                                    strokeDasharray="3"
                                  />
                                  <text
                                    x="100%"
                                    y={`${line.y}%`}
                                    dx="8"
                                    dy={i === 0 ? "10" : i === 2 ? "-4" : "4"}
                                    className="text-[10px] fill-muted/70"
                                  >
                                    {line.value >= 0 ? '+' : ''}{Math.abs(line.value) >= 1000
                                      ? `$${(line.value / 1000).toFixed(1)}k`
                                      : `$${line.value.toFixed(0)}`}
                                  </text>
                                </g>
                              ))}

                              {/* Zero line if it's within range */}
                              {min < 0 && max > 0 && (
                                <line
                                  x1="0"
                                  y1={`${zeroY}%`}
                                  x2="100%"
                                  y2={`${zeroY}%`}
                                  stroke="currentColor"
                                  strokeOpacity="0.3"
                                  strokeDasharray="4"
                                />
                              )}

                              {/* Colored line segments - green for win, red for loss */}
                              {monthlyBreakdown.tradeByTradeData.map((trade, i) => {
                                const prevData = i === 0 ? { cumulative: 0 } : monthlyBreakdown.tradeByTradeData[i - 1];
                                const x1 = (i / monthlyBreakdown.tradeByTradeData.length) * 100;
                                const y1 = ((max - prevData.cumulative) / range) * 100;
                                const x2 = ((i + 1) / monthlyBreakdown.tradeByTradeData.length) * 100;
                                const y2 = ((max - trade.cumulative) / range) * 100;
                                const isWin = trade.pnl > 0;

                                return (
                                  <line
                                    key={`line-${i}`}
                                    x1={`${x1}%`}
                                    y1={`${y1}%`}
                                    x2={`${x2}%`}
                                    y2={`${y2}%`}
                                    stroke={isWin ? "#34d399" : "#f87171"}
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                  />
                                );
                              })}

                              {/* Trade dots - only show if not too many trades */}
                              {monthlyBreakdown.tradeByTradeData.length <= 50 && monthlyBreakdown.tradeByTradeData.map((trade, i) => {
                                const x = ((i + 1) / monthlyBreakdown.tradeByTradeData.length) * 100;
                                const y = ((max - trade.cumulative) / range) * 100;
                                const isWin = trade.pnl > 0;
                                const isHovered = hoveredTrade?.index === i + 1000; // offset to differentiate from weekly

                                return (
                                  <g key={`dot-${i}`} className="cursor-pointer">
                                    <circle
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r={isHovered ? 7 : 5}
                                      fill={isWin ? "#34d399" : "#f87171"}
                                      stroke="#1a1a2e"
                                      strokeWidth="2"
                                      onMouseEnter={(e) => {
                                        const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                        if (rect) {
                                          setHoveredTrade({
                                            index: i + 1000, // offset to differentiate from weekly
                                            x: (x / 100) * rect.width,
                                            y: (y / 100) * rect.height,
                                            trade
                                          });
                                        }
                                      }}
                                      className="transition-all duration-150"
                                    />
                                  </g>
                                );
                              })}

                              {/* Start dot */}
                              <circle cx="0%" cy={`${zeroY}%`} r="4" fill="#6b7280" stroke="#1a1a2e" strokeWidth="2" />
                            </svg>

                            {/* Custom Trade Tooltip */}
                            {hoveredTrade && hoveredTrade.index >= 1000 && (
                              <div
                                className="absolute z-50 pointer-events-none"
                                style={{
                                  left: `${hoveredTrade.x}px`,
                                  top: `${hoveredTrade.y}px`,
                                  transform: 'translate(-50%, -100%) translateY(-12px)'
                                }}
                              >
                                <div className={`rounded-lg shadow-xl border-2 overflow-hidden ${hoveredTrade.trade.pnl >= 0 ? 'bg-emerald-950 border-emerald-500/50' : 'bg-red-950 border-red-500/50'}`}>
                                  <div className={`px-3 py-1.5 flex items-center justify-between gap-3 ${hoveredTrade.trade.pnl >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                    <div className="text-sm font-bold text-foreground">Trade #{hoveredTrade.index - 999}</div>
                                    <div className="text-[11px] text-muted">
                                      {new Date(hoveredTrade.trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                  </div>
                                  <div className="px-3 py-2 space-y-1">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[11px] text-muted">P&L</span>
                                      <span className={`text-sm font-bold ${hoveredTrade.trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {hoveredTrade.trade.pnl >= 0 ? '+' : ''}${hoveredTrade.trade.pnl.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/10">
                                      <span className="text-[11px] text-muted">Running</span>
                                      <span className={`text-sm font-medium ${hoveredTrade.trade.cumulative >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {hoveredTrade.trade.cumulative >= 0 ? '+' : ''}${hoveredTrade.trade.cumulative.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 ${hoveredTrade.trade.pnl >= 0 ? 'bg-emerald-950 border-r-2 border-b-2 border-emerald-500/50' : 'bg-red-950 border-r-2 border-b-2 border-red-500/50'}`}></div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {monthlyBreakdown.tradeByTradeData.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-muted text-sm">No trades</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="space-y-3">
                    {/* Top Row - Winners & Losers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">Avg Win</span>
                          <span className="text-sm font-bold text-emerald-400">+${monthlyBreakdown.avgWin.toFixed(0)}</span>
                        </div>
                        {monthlyBreakdown.largestWin && (
                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-emerald-500/10">
                            <span className="text-xs text-muted">Best Trade</span>
                            <span className="text-sm font-medium text-emerald-400">+${monthlyBreakdown.largestWin.pnl.toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">Avg Loss</span>
                          <span className="text-sm font-bold text-red-400">-${monthlyBreakdown.avgLoss.toFixed(0)}</span>
                        </div>
                        {monthlyBreakdown.largestLoss && (
                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-red-500/10">
                            <span className="text-xs text-muted">Worst Trade</span>
                            <span className="text-sm font-medium text-red-400">${monthlyBreakdown.largestLoss.pnl.toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row - Key Ratios */}
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                        onMouseEnter={() => setShowRiskRewardTooltip('monthly')}
                        onMouseLeave={() => setShowRiskRewardTooltip(null)}
                      >
                        <div className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
                          Risk/Reward
                          <Info className="w-3 h-3 text-muted/50" />
                        </div>
                        <div className={`text-lg font-bold ${monthlyBreakdown.avgLoss > 0 ? (monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss >= 1 ? 'text-emerald-400' : 'text-red-400') : 'text-muted'}`}>
                          {monthlyBreakdown.avgLoss > 0 ? `1:${(monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss).toFixed(2)}` : 'N/A'}
                        </div>
                        <div className="text-[10px] text-muted mt-1">Avg Win ÷ Avg Loss</div>
                        {/* Risk/Reward Tooltip */}
                        {showRiskRewardTooltip === 'monthly' && (
                          <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
                            <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[240px]">
                              <div className="text-sm font-semibold text-foreground mb-1 text-left">Risk/Reward Ratio</div>
                              <div className="text-[11px] text-muted mb-3 text-left">How much you win on average compared to how much you lose. Higher is better.</div>
                              <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2 mb-3">
                                <span className="text-emerald-400 font-medium">${monthlyBreakdown.avgWin.toFixed(0)}</span>
                                <span className="text-muted/70">÷</span>
                                <span className="text-red-400 font-medium">${monthlyBreakdown.avgLoss.toFixed(0)}</span>
                                <span className="text-muted/70">=</span>
                                <span className={`font-bold text-lg ${monthlyBreakdown.avgLoss > 0 ? (monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss >= 1 ? 'text-emerald-400' : 'text-red-400') : 'text-muted'}`}>
                                  {monthlyBreakdown.avgLoss > 0 ? (monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss).toFixed(2) : 'N/A'}
                                </span>
                              </div>
                              <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${monthlyBreakdown.avgLoss > 0 && monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss >= 2 ? "text-emerald-400/80" : monthlyBreakdown.avgLoss > 0 && monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss >= 1 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                {monthlyBreakdown.avgLoss > 0 && monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss >= 2 ? "✓ Excellent! Wins are 2x+ your losses" :
                                 monthlyBreakdown.avgLoss > 0 && monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss >= 1.5 ? "✓ Good ratio, wins exceed losses" :
                                 monthlyBreakdown.avgLoss > 0 && monthlyBreakdown.avgWin / monthlyBreakdown.avgLoss >= 1 ? "○ Balanced, but aim higher" :
                                 "✗ Losses exceed wins - tighten stops"}
                              </div>
                            </div>
                            <div className="absolute left-4 -bottom-1.5 w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-accent/50 rotate-45"></div>
                          </div>
                        )}
                      </div>
                      <div
                        className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                        onMouseEnter={() => setShowExpectancyTooltip('monthly')}
                        onMouseLeave={() => setShowExpectancyTooltip(null)}
                      >
                        <div className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
                          Expectancy
                          <Info className="w-3 h-3 text-muted/50" />
                        </div>
                        {(() => {
                          const winRate = monthlyBreakdown.tradeWinRate / 100;
                          const expectancy = (winRate * monthlyBreakdown.avgWin) - ((1 - winRate) * monthlyBreakdown.avgLoss);
                          return (
                            <>
                              <div className={`text-lg font-bold ${expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {expectancy >= 0 ? '+' : ''}${expectancy.toFixed(0)}
                              </div>
                              <div className="text-[10px] text-muted mt-1">Expected $ per trade</div>
                              {/* Expectancy Tooltip */}
                              {showExpectancyTooltip === 'monthly' && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                                  <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[280px]">
                                    <div className="text-sm font-semibold text-foreground mb-1 text-left">Expectancy</div>
                                    <div className="text-[11px] text-muted mb-3 text-left">The average amount you can expect to win (or lose) per trade over time.</div>
                                    <div className="text-[11px] bg-slate-800/50 rounded-lg px-3 py-2 mb-3 text-left">
                                      <div className="text-muted mb-1">Formula:</div>
                                      <div className="font-mono text-xs">
                                        (<span className="text-emerald-400">{monthlyBreakdown.tradeWinRate.toFixed(0)}%</span> × <span className="text-emerald-400">${monthlyBreakdown.avgWin.toFixed(0)}</span>) − (<span className="text-red-400">{(100 - monthlyBreakdown.tradeWinRate).toFixed(0)}%</span> × <span className="text-red-400">${monthlyBreakdown.avgLoss.toFixed(0)}</span>)
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-white/10">
                                        <span className="text-muted">=</span> <span className={`font-bold ${expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}</span> <span className="text-muted">per trade</span>
                                      </div>
                                    </div>
                                    <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${expectancy >= 50 ? "text-emerald-400/80" : expectancy >= 0 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                      {expectancy >= 50 ? "✓ Strong edge! Keep trading this strategy" :
                                       expectancy >= 20 ? "✓ Positive expectancy, stay consistent" :
                                       expectancy >= 0 ? "○ Slightly profitable, room to improve" :
                                       "✗ Negative expectancy - review your strategy"}
                                    </div>
                                  </div>
                                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-accent/50 rotate-45"></div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div
                        className="p-3 rounded-xl bg-card border border-border relative cursor-help text-center"
                        onMouseEnter={() => setShowBreakevenTooltip('monthly')}
                        onMouseLeave={() => setShowBreakevenTooltip(null)}
                      >
                        <div className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
                          Breakeven Rate
                          <Info className="w-3 h-3 text-muted/50" />
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss > 0
                            ? `${((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100).toFixed(0)}%`
                            : 'N/A'}
                        </div>
                        <div className="text-[10px] text-muted mt-1">Min win rate to profit</div>
                        {/* Breakeven Rate Tooltip */}
                        {showBreakevenTooltip === 'monthly' && (
                          <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none">
                            <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[260px]">
                              <div className="text-sm font-semibold text-foreground mb-1 text-left">Breakeven Win Rate</div>
                              <div className="text-[11px] text-muted mb-3 text-left">The minimum win rate needed to break even given your average win and loss sizes.</div>
                              <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2 mb-3">
                                <span className="text-red-400 font-medium">${monthlyBreakdown.avgLoss.toFixed(0)}</span>
                                <span className="text-muted/70">÷</span>
                                <span className="text-muted font-medium">(${monthlyBreakdown.avgWin.toFixed(0)} + ${monthlyBreakdown.avgLoss.toFixed(0)})</span>
                                <span className="text-muted/70">=</span>
                                <span className="font-bold text-lg text-foreground">
                                  {monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss > 0
                                    ? `${((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100).toFixed(0)}%`
                                    : 'N/A'}
                                </span>
                              </div>
                              {/* Visual comparison bar */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-muted">Your Win Rate</span>
                                  <span className={monthlyBreakdown.tradeWinRate >= ((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100) ? 'text-emerald-400' : 'text-red-400'}>
                                    {monthlyBreakdown.tradeWinRate.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                                  {/* Breakeven marker */}
                                  <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
                                    style={{ left: `${Math.min((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100, 100)}%` }}
                                  />
                                  {/* Win rate fill */}
                                  <div
                                    className={`h-full rounded-full ${monthlyBreakdown.tradeWinRate >= ((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100) ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(monthlyBreakdown.tradeWinRate, 100)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-muted">Breakeven</span>
                                  <span className="text-yellow-400">
                                    {monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss > 0
                                      ? `${((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100).toFixed(0)}%`
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${monthlyBreakdown.tradeWinRate >= ((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100) ? "text-emerald-400/80" : "text-red-400/80"}`}>
                                {monthlyBreakdown.tradeWinRate >= ((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100)
                                  ? `✓ Above breakeven by ${(monthlyBreakdown.tradeWinRate - ((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100)).toFixed(0)}%`
                                  : `✗ Below breakeven by ${(((monthlyBreakdown.avgLoss / (monthlyBreakdown.avgWin + monthlyBreakdown.avgLoss)) * 100) - monthlyBreakdown.tradeWinRate).toFixed(0)}%`}
                              </div>
                            </div>
                            <div className="absolute right-4 -bottom-1.5 w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-accent/50 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Week Summary Modal */}
      {showWeekSummary.show && showWeekSummary.saturdayDate && (() => {
        const weeklyBreakdown = getWeeklyBreakdown(showWeekSummary.saturdayDate, currentMonth);
        return (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWeekSummary({ show: false, saturdayDate: null })}
          >
            <div
              className="w-full max-w-2xl glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden animate-slide-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-accent-light" />
                  <h3 className="text-lg font-bold">
                    {weeklyBreakdown.effectiveStart.getTime() === weeklyBreakdown.effectiveEnd.getTime()
                      ? weeklyBreakdown.effectiveStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : `${weeklyBreakdown.effectiveStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weeklyBreakdown.effectiveEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    }
                  </h3>
                </div>
                <button
                  onClick={() => setShowWeekSummary({ show: false, saturdayDate: null })}
                  className="p-1.5 rounded-lg hover:bg-card-hover transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {weeklyBreakdown.tradingDays === 0 ? (
                  <div className="text-center py-8 text-muted">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No trading data for this week</p>
                    <p className="text-xs mt-1">Add trades to see your weekly breakdown</p>
                  </div>
                ) : (
                  <>
                    {/* Hero Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Total P&L - Large */}
                      <div className={`p-4 rounded-xl border-2 ${weeklyBreakdown.totalPnL >= 0 ? "bg-emerald-500/10 border-emerald-500/40" : "bg-red-500/10 border-red-500/40"}`}>
                        <div className="text-xs text-muted uppercase tracking-wider mb-1">Total P&L</div>
                        <div className={`text-3xl font-bold ${weeklyBreakdown.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {weeklyBreakdown.totalPnL >= 0 ? "+" : ""}${weeklyBreakdown.totalPnL.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted mt-1">{weeklyBreakdown.totalTrades} trades over {weeklyBreakdown.tradingDays} days</div>
                      </div>

                      {/* Win Rate with breakdown */}
                      <div className={`p-4 rounded-xl border ${weeklyBreakdown.tradeWinRate >= 50 ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30"}`}>
                        <div className="text-xs text-muted uppercase tracking-wider mb-1">Win Rate</div>
                        <div className={`text-3xl font-bold ${weeklyBreakdown.tradeWinRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                          {weeklyBreakdown.tradeWinRate.toFixed(0)}%
                        </div>
                        <div className="text-xs mt-1">
                          <span className="text-emerald-400">{weeklyBreakdown.winningTrades}W</span>
                          <span className="text-muted mx-1">/</span>
                          <span className="text-red-400">{weeklyBreakdown.losingTrades}L</span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                        onMouseEnter={() => setShowProfitFactorTooltip('weekly')}
                        onMouseLeave={() => setShowProfitFactorTooltip(null)}
                      >
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                          Profit Factor
                          <Info className="w-3 h-3 text-muted/50" />
                        </div>
                        <div className={`text-xl font-bold ${weeklyBreakdown.profitFactor >= 1 ? "text-emerald-400" : "text-red-400"}`}>
                          {weeklyBreakdown.profitFactor === Infinity ? "∞" : weeklyBreakdown.profitFactor.toFixed(2)}
                        </div>
                        {/* Custom Tooltip */}
                        {showProfitFactorTooltip === 'weekly' && (
                          <div className="absolute top-full left-0 mt-2 z-50 pointer-events-none">
                            <div className="absolute left-4 -top-1.5 w-3 h-3 bg-slate-900 border-l-2 border-t-2 border-accent/50 rotate-45"></div>
                            <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[220px]">
                              <div className="text-sm font-semibold text-foreground mb-1 text-left">Profit Factor</div>
                              <div className="text-[11px] text-muted mb-3 text-left">Gross Profit ÷ Gross Loss</div>
                              <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                <span className="text-emerald-400 font-medium">${(weeklyBreakdown.avgWin * weeklyBreakdown.winningTrades).toFixed(0)}</span>
                                <span className="text-muted/70">÷</span>
                                <span className="text-red-400 font-medium">${(weeklyBreakdown.avgLoss * weeklyBreakdown.losingTrades).toFixed(0)}</span>
                                <span className="text-muted/70">=</span>
                                <span className={`font-bold text-lg ${weeklyBreakdown.profitFactor >= 1 ? "text-emerald-400" : "text-red-400"}`}>
                                  {weeklyBreakdown.profitFactor === Infinity ? "∞" : weeklyBreakdown.profitFactor.toFixed(2)}
                                </span>
                              </div>
                              <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${weeklyBreakdown.profitFactor >= 1.5 ? "text-emerald-400/80" : weeklyBreakdown.profitFactor >= 1 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                {weeklyBreakdown.profitFactor >= 2 ? "✓ Excellent! Above 2 is very strong" :
                                 weeklyBreakdown.profitFactor >= 1.5 ? "✓ Good! Above 1.5 is solid" :
                                 weeklyBreakdown.profitFactor >= 1 ? "○ Profitable, room to improve" :
                                 "✗ Losing money - review strategy"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div
                        className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                        onMouseEnter={() => setShowAvgTradeTooltip('weekly')}
                        onMouseLeave={() => setShowAvgTradeTooltip(null)}
                      >
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                          Avg / Trade
                          <Info className="w-3 h-3 text-muted/50" />
                        </div>
                        <div className={`text-xl font-bold ${(weeklyBreakdown.totalPnL / weeklyBreakdown.totalTrades) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {(weeklyBreakdown.totalPnL / weeklyBreakdown.totalTrades) >= 0 ? "+" : ""}${(weeklyBreakdown.totalPnL / weeklyBreakdown.totalTrades).toFixed(0)}
                        </div>
                        {/* Avg/Trade Tooltip */}
                        {showAvgTradeTooltip === 'weekly' && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none">
                            <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-slate-900 border-l-2 border-t-2 border-accent/50 rotate-45"></div>
                            <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[220px]">
                              <div className="text-sm font-semibold text-foreground mb-1">Average Per Trade</div>
                              <div className="text-[11px] text-muted mb-3">Your average profit or loss on each trade.</div>
                              <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                <span className={`font-medium ${weeklyBreakdown.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${weeklyBreakdown.totalPnL.toFixed(0)}</span>
                                <span className="text-muted/70">÷</span>
                                <span className="text-muted font-medium">{weeklyBreakdown.totalTrades} trades</span>
                                <span className="text-muted/70">=</span>
                                <span className={`font-bold text-lg ${(weeklyBreakdown.totalPnL / weeklyBreakdown.totalTrades) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  ${(weeklyBreakdown.totalPnL / weeklyBreakdown.totalTrades).toFixed(0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div
                        className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                        onMouseEnter={() => setShowAvgDayTooltip('weekly')}
                        onMouseLeave={() => setShowAvgDayTooltip(null)}
                      >
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                          Avg / Day
                          <Info className="w-3 h-3 text-muted/50" />
                        </div>
                        <div className={`text-xl font-bold ${(weeklyBreakdown.totalPnL / weeklyBreakdown.tradingDays) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {(weeklyBreakdown.totalPnL / weeklyBreakdown.tradingDays) >= 0 ? "+" : ""}${(weeklyBreakdown.totalPnL / weeklyBreakdown.tradingDays).toFixed(0)}
                        </div>
                        {/* Avg/Day Tooltip */}
                        {showAvgDayTooltip === 'weekly' && (
                          <div className="absolute top-full right-0 mt-2 z-50 pointer-events-none">
                            <div className="absolute right-4 -top-1.5 w-3 h-3 bg-slate-900 border-l-2 border-t-2 border-accent/50 rotate-45"></div>
                            <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[220px]">
                              <div className="text-sm font-semibold text-foreground mb-1 text-left">Average Per Day</div>
                              <div className="text-[11px] text-muted mb-3 text-left">Your average daily P&L on days you traded.</div>
                              <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
                                <span className={`font-medium ${weeklyBreakdown.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${weeklyBreakdown.totalPnL.toFixed(0)}</span>
                                <span className="text-muted/70">÷</span>
                                <span className="text-muted font-medium">{weeklyBreakdown.tradingDays} days</span>
                                <span className="text-muted/70">=</span>
                                <span className={`font-bold text-lg ${(weeklyBreakdown.totalPnL / weeklyBreakdown.tradingDays) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  ${(weeklyBreakdown.totalPnL / weeklyBreakdown.tradingDays).toFixed(0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Equity Curve */}
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <div className="text-xs font-medium text-muted mb-3">Equity Curve</div>
                      <div className="h-36 relative pr-16" onMouseLeave={() => setHoveredTrade(null)}>
                        {weeklyBreakdown.tradeByTradeData.length > 0 && (() => {
                          const dataWithStart = [{ cumulative: 0, pnl: 0 }, ...weeklyBreakdown.tradeByTradeData];
                          const values = dataWithStart.map(d => d.cumulative);
                          const min = Math.min(...values);
                          const max = Math.max(...values);
                          const range = max - min || 1;
                          const zeroY = ((max - 0) / range) * 100;

                          // Calculate nice grid lines (only top, middle, bottom)
                          const gridLines = [
                            { value: max, y: 0 },
                            { value: (max + min) / 2, y: 50 },
                            { value: min, y: 100 }
                          ];

                          return (
                            <>
                              <svg className="w-full h-full" style={{ overflow: 'visible' }}>
                                {/* Horizontal grid lines with labels inside */}
                                {gridLines.map((line, i) => (
                                  <g key={`grid-${i}`}>
                                    <line
                                      x1="0"
                                      y1={`${line.y}%`}
                                      x2="100%"
                                      y2={`${line.y}%`}
                                      stroke="currentColor"
                                      strokeOpacity={Math.abs(line.value) < 0.01 ? "0.25" : "0.08"}
                                      strokeDasharray="3"
                                    />
                                    <text
                                      x="100%"
                                      y={`${line.y}%`}
                                      dx="8"
                                      dy={i === 0 ? "10" : i === 2 ? "-4" : "4"}
                                      className="text-[10px] fill-muted/70"
                                    >
                                      {line.value >= 0 ? '+' : ''}{Math.abs(line.value) >= 1000
                                        ? `$${(line.value / 1000).toFixed(1)}k`
                                        : `$${line.value.toFixed(0)}`}
                                    </text>
                                  </g>
                                ))}

                                {/* Zero line if it's within range */}
                                {min < 0 && max > 0 && (
                                  <line
                                    x1="0"
                                    y1={`${zeroY}%`}
                                    x2="100%"
                                    y2={`${zeroY}%`}
                                    stroke="currentColor"
                                    strokeOpacity="0.3"
                                    strokeDasharray="4"
                                  />
                                )}

                                {/* Colored line segments - green for win, red for loss */}
                                {weeklyBreakdown.tradeByTradeData.map((trade, i) => {
                                  const prevData = i === 0 ? { cumulative: 0 } : weeklyBreakdown.tradeByTradeData[i - 1];
                                  const x1 = (i / weeklyBreakdown.tradeByTradeData.length) * 100;
                                  const y1 = ((max - prevData.cumulative) / range) * 100;
                                  const x2 = ((i + 1) / weeklyBreakdown.tradeByTradeData.length) * 100;
                                  const y2 = ((max - trade.cumulative) / range) * 100;
                                  const isWin = trade.pnl > 0;

                                  return (
                                    <line
                                      key={`line-${i}`}
                                      x1={`${x1}%`}
                                      y1={`${y1}%`}
                                      x2={`${x2}%`}
                                      y2={`${y2}%`}
                                      stroke={isWin ? "#34d399" : "#f87171"}
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                    />
                                  );
                                })}

                                {/* Trade dots */}
                                {weeklyBreakdown.tradeByTradeData.map((trade, i) => {
                                  const x = ((i + 1) / weeklyBreakdown.tradeByTradeData.length) * 100;
                                  const y = ((max - trade.cumulative) / range) * 100;
                                  const isWin = trade.pnl > 0;
                                  const isHovered = hoveredTrade?.index === i;

                                  return (
                                    <g key={`dot-${i}`} className="cursor-pointer">
                                      <circle
                                        cx={`${x}%`}
                                        cy={`${y}%`}
                                        r={isHovered ? 7 : 5}
                                        fill={isWin ? "#34d399" : "#f87171"}
                                        stroke="#1a1a2e"
                                        strokeWidth="2"
                                        onMouseEnter={(e) => {
                                          const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                          if (rect) {
                                            setHoveredTrade({
                                              index: i,
                                              x: (x / 100) * rect.width,
                                              y: (y / 100) * rect.height,
                                              trade
                                            });
                                          }
                                        }}
                                        className="transition-all duration-150"
                                      />
                                    </g>
                                  );
                                })}

                                {/* Start dot */}
                                <circle cx="0%" cy={`${zeroY}%`} r="4" fill="#6b7280" stroke="#1a1a2e" strokeWidth="2" />
                              </svg>

                              {/* Custom Trade Tooltip */}
                              {hoveredTrade && (
                                <div
                                  className="absolute z-50 pointer-events-none"
                                  style={{
                                    left: `${hoveredTrade.x}px`,
                                    top: `${hoveredTrade.y}px`,
                                    transform: 'translate(-50%, -100%) translateY(-12px)'
                                  }}
                                >
                                  <div className={`rounded-lg shadow-xl border-2 overflow-hidden ${hoveredTrade.trade.pnl >= 0 ? 'bg-emerald-950 border-emerald-500/50' : 'bg-red-950 border-red-500/50'}`}>
                                    <div className={`px-3 py-1.5 flex items-center justify-between gap-3 ${hoveredTrade.trade.pnl >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                      <div className="text-sm font-bold text-foreground">Trade #{hoveredTrade.index + 1}</div>
                                      <div className="text-[11px] text-muted">
                                        {new Date(hoveredTrade.trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </div>
                                    </div>
                                    <div className="px-3 py-2 space-y-1">
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="text-[11px] text-muted">P&L</span>
                                        <span className={`text-sm font-bold ${hoveredTrade.trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {hoveredTrade.trade.pnl >= 0 ? '+' : ''}${hoveredTrade.trade.pnl.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/10">
                                        <span className="text-[11px] text-muted">Running</span>
                                        <span className={`text-sm font-medium ${hoveredTrade.trade.cumulative >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {hoveredTrade.trade.cumulative >= 0 ? '+' : ''}${hoveredTrade.trade.cumulative.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 ${hoveredTrade.trade.pnl >= 0 ? 'bg-emerald-950 border-r-2 border-b-2 border-emerald-500/50' : 'bg-red-950 border-r-2 border-b-2 border-red-500/50'}`}></div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        {weeklyBreakdown.tradeByTradeData.length === 0 && (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-muted text-sm">No trades</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="space-y-3">
                      {/* Top Row - Winners & Losers */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted">Avg Win</span>
                            <span className="text-sm font-bold text-emerald-400">+${weeklyBreakdown.avgWin.toFixed(0)}</span>
                          </div>
                          {weeklyBreakdown.largestWin && (
                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-emerald-500/10">
                              <span className="text-xs text-muted">Best Trade</span>
                              <span className="text-sm font-medium text-emerald-400">+${weeklyBreakdown.largestWin.pnl.toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted">Avg Loss</span>
                            <span className="text-sm font-bold text-red-400">-${weeklyBreakdown.avgLoss.toFixed(0)}</span>
                          </div>
                          {weeklyBreakdown.largestLoss && (
                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-red-500/10">
                              <span className="text-xs text-muted">Worst Trade</span>
                              <span className="text-sm font-medium text-red-400">${weeklyBreakdown.largestLoss.pnl.toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row - Key Ratios */}
                      <div className="grid grid-cols-3 gap-3">
                        <div
                          className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                          onMouseEnter={() => setShowRiskRewardTooltip('weekly')}
                          onMouseLeave={() => setShowRiskRewardTooltip(null)}
                        >
                          <div className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
                            Risk/Reward
                            <Info className="w-3 h-3 text-muted/50" />
                          </div>
                          <div className={`text-lg font-bold ${weeklyBreakdown.avgLoss > 0 ? (weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss >= 1 ? 'text-emerald-400' : 'text-red-400') : 'text-muted'}`}>
                            {weeklyBreakdown.avgLoss > 0 ? `1:${(weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss).toFixed(2)}` : 'N/A'}
                          </div>
                          <div className="text-[10px] text-muted mt-1">Avg Win ÷ Avg Loss</div>
                          {/* Risk/Reward Tooltip */}
                          {showRiskRewardTooltip === 'weekly' && (
                            <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
                              <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[240px]">
                                <div className="text-sm font-semibold text-foreground mb-1 text-left">Risk/Reward Ratio</div>
                                <div className="text-[11px] text-muted mb-3 text-left">How much you win on average compared to how much you lose. Higher is better.</div>
                                <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2 mb-3">
                                  <span className="text-emerald-400 font-medium">${weeklyBreakdown.avgWin.toFixed(0)}</span>
                                  <span className="text-muted/70">÷</span>
                                  <span className="text-red-400 font-medium">${weeklyBreakdown.avgLoss.toFixed(0)}</span>
                                  <span className="text-muted/70">=</span>
                                  <span className={`font-bold text-lg ${weeklyBreakdown.avgLoss > 0 ? (weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss >= 1 ? 'text-emerald-400' : 'text-red-400') : 'text-muted'}`}>
                                    {weeklyBreakdown.avgLoss > 0 ? (weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss).toFixed(2) : 'N/A'}
                                  </span>
                                </div>
                                <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${weeklyBreakdown.avgLoss > 0 && weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss >= 2 ? "text-emerald-400/80" : weeklyBreakdown.avgLoss > 0 && weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss >= 1 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                  {weeklyBreakdown.avgLoss > 0 && weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss >= 2 ? "✓ Excellent! Wins are 2x+ your losses" :
                                   weeklyBreakdown.avgLoss > 0 && weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss >= 1.5 ? "✓ Good ratio, wins exceed losses" :
                                   weeklyBreakdown.avgLoss > 0 && weeklyBreakdown.avgWin / weeklyBreakdown.avgLoss >= 1 ? "○ Balanced, but aim higher" :
                                   "✗ Losses exceed wins - tighten stops"}
                                </div>
                              </div>
                              <div className="absolute left-4 -bottom-1.5 w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-accent/50 rotate-45"></div>
                            </div>
                          )}
                        </div>
                        <div
                          className="p-3 rounded-xl bg-card border border-border text-center relative cursor-help"
                          onMouseEnter={() => setShowExpectancyTooltip('weekly')}
                          onMouseLeave={() => setShowExpectancyTooltip(null)}
                        >
                          <div className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
                            Expectancy
                            <Info className="w-3 h-3 text-muted/50" />
                          </div>
                          {(() => {
                            const winRate = weeklyBreakdown.tradeWinRate / 100;
                            const expectancy = (winRate * weeklyBreakdown.avgWin) - ((1 - winRate) * weeklyBreakdown.avgLoss);
                            return (
                              <>
                                <div className={`text-lg font-bold ${expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {expectancy >= 0 ? '+' : ''}${expectancy.toFixed(0)}
                                </div>
                                <div className="text-[10px] text-muted mt-1">Expected $ per trade</div>
                                {/* Expectancy Tooltip */}
                                {showExpectancyTooltip === 'weekly' && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                                    <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[280px]">
                                      <div className="text-sm font-semibold text-foreground mb-1 text-left">Expectancy</div>
                                      <div className="text-[11px] text-muted mb-3 text-left">The average amount you can expect to win (or lose) per trade over time.</div>
                                      <div className="text-[11px] bg-slate-800/50 rounded-lg px-3 py-2 mb-3 text-left">
                                        <div className="text-muted mb-1">Formula:</div>
                                        <div className="font-mono text-xs">
                                          (<span className="text-emerald-400">{weeklyBreakdown.tradeWinRate.toFixed(0)}%</span> × <span className="text-emerald-400">${weeklyBreakdown.avgWin.toFixed(0)}</span>) − (<span className="text-red-400">{(100 - weeklyBreakdown.tradeWinRate).toFixed(0)}%</span> × <span className="text-red-400">${weeklyBreakdown.avgLoss.toFixed(0)}</span>)
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-white/10">
                                          <span className="text-muted">=</span> <span className={`font-bold ${expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}</span> <span className="text-muted">per trade</span>
                                        </div>
                                      </div>
                                      <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${expectancy >= 50 ? "text-emerald-400/80" : expectancy >= 0 ? "text-yellow-400/80" : "text-red-400/80"}`}>
                                        {expectancy >= 50 ? "✓ Strong edge! Keep trading this strategy" :
                                         expectancy >= 20 ? "✓ Positive expectancy, stay consistent" :
                                         expectancy >= 0 ? "○ Slightly profitable, room to improve" :
                                         "✗ Negative expectancy - review your strategy"}
                                      </div>
                                    </div>
                                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-accent/50 rotate-45"></div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div
                          className="p-3 rounded-xl bg-card border border-border relative cursor-help text-center"
                          onMouseEnter={() => setShowBreakevenTooltip('weekly')}
                          onMouseLeave={() => setShowBreakevenTooltip(null)}
                        >
                          <div className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
                            Breakeven Rate
                            <Info className="w-3 h-3 text-muted/50" />
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss > 0
                              ? `${((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100).toFixed(0)}%`
                              : 'N/A'}
                          </div>
                          <div className="text-[10px] text-muted mt-1">Min win rate to profit</div>
                          {/* Breakeven Rate Tooltip */}
                          {showBreakevenTooltip === 'weekly' && (
                            <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none">
                              <div className="bg-slate-900 border-2 border-accent/50 rounded-xl shadow-2xl shadow-accent/20 p-3 min-w-[260px]">
                                <div className="text-sm font-semibold text-foreground mb-1 text-left">Breakeven Win Rate</div>
                                <div className="text-[11px] text-muted mb-3 text-left">The minimum win rate needed to break even given your average win and loss sizes.</div>
                                <div className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2 mb-3">
                                  <span className="text-red-400 font-medium">${weeklyBreakdown.avgLoss.toFixed(0)}</span>
                                  <span className="text-muted/70">÷</span>
                                  <span className="text-muted font-medium">(${weeklyBreakdown.avgWin.toFixed(0)} + ${weeklyBreakdown.avgLoss.toFixed(0)})</span>
                                  <span className="text-muted/70">=</span>
                                  <span className="font-bold text-lg text-foreground">
                                    {weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss > 0
                                      ? `${((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100).toFixed(0)}%`
                                      : 'N/A'}
                                  </span>
                                </div>
                                {/* Visual comparison bar */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted">Your Win Rate</span>
                                    <span className={weeklyBreakdown.tradeWinRate >= ((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100) ? 'text-emerald-400' : 'text-red-400'}>
                                      {weeklyBreakdown.tradeWinRate.toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                                    {/* Breakeven marker */}
                                    <div
                                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
                                      style={{ left: `${Math.min((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100, 100)}%` }}
                                    />
                                    {/* Win rate fill */}
                                    <div
                                      className={`h-full rounded-full ${weeklyBreakdown.tradeWinRate >= ((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100) ? 'bg-emerald-500' : 'bg-red-500'}`}
                                      style={{ width: `${Math.min(weeklyBreakdown.tradeWinRate, 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted">Breakeven</span>
                                    <span className="text-yellow-400">
                                      {weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss > 0
                                        ? `${((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100).toFixed(0)}%`
                                        : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                <div className={`text-[10px] mt-2 pt-2 border-t border-white/10 text-left ${weeklyBreakdown.tradeWinRate >= ((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100) ? "text-emerald-400/80" : "text-red-400/80"}`}>
                                  {weeklyBreakdown.tradeWinRate >= ((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100)
                                    ? `✓ Above breakeven by ${(weeklyBreakdown.tradeWinRate - ((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100)).toFixed(0)}%`
                                    : `✗ Below breakeven by ${(((weeklyBreakdown.avgLoss / (weeklyBreakdown.avgWin + weeklyBreakdown.avgLoss)) * 100) - weeklyBreakdown.tradeWinRate).toFixed(0)}%`}
                                </div>
                              </div>
                              <div className="absolute right-4 -bottom-1.5 w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-accent/50 rotate-45"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete All Notes Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteAllConfirm(false)}
        >
          <div
            className="w-full max-w-sm glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete All Notes?</h3>
              <p className="text-sm text-muted mb-6">
                This will permanently delete all {Object.keys(tradeNotes).length} trade notes. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-card-hover border border-border rounded-lg text-sm font-medium hover:bg-card transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAllTradeNotes}
                  disabled={deletingAllNotes}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingAllNotes ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Trades Confirmation Modal */}
      {showDeleteAllTradesConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteAllTradesConfirm(false)}
        >
          <div
            className="w-full max-w-sm glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete All Trades?</h3>
              <p className="text-sm text-muted mb-6">
                This will permanently delete all {trades.length} trades from your journal. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteAllTradesConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-card-hover border border-border rounded-lg text-sm font-medium hover:bg-card transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeletingAllTrades(true);
                    for (const trade of trades) {
                      await deleteTrade(trade.id);
                    }
                    setDeletingAllTrades(false);
                    setShowDeleteAllTradesConfirm(false);
                  }}
                  disabled={deletingAllTrades}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingAllTrades ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      {confirmModal.show && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
        >
          <div
            className="w-full max-w-sm glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-muted mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-2.5 bg-card-hover border border-border rounded-lg text-sm font-medium hover:bg-card transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setConfirmModal((prev) => ({ ...prev, isLoading: true }));
                    await confirmModal.onConfirm();
                    setConfirmModal((prev) => ({ ...prev, isLoading: false }));
                  }}
                  disabled={confirmModal.isLoading}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirmModal.isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {confirmModal.confirmText || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
