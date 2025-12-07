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
} from "lucide-react";

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

  // Filters (USD-only, no currency filter needed)
  const [filterImpacts, setFilterImpacts] = useState<Set<string>>(new Set(["high", "medium", "low"]));
  const [filterCategory, setFilterCategory] = useState("All");
  const [showHolidays, setShowHolidays] = useState(true);
  const [showPastEvents, setShowPastEvents] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Trade Notes State
  const [tradeNotes, setTradeNotes] = useState<Record<string, TradeNote>>({});
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    trades: "",
    pnl: "",
    note: "",
  });
  const [savingNote, setSavingNote] = useState(false);

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

      // Merge live data into events
      const eventsWithLiveData = (calendarData.events || []).map((event: EconomicEvent) => {
        const live = liveData[event.event];
        if (live) {
          return {
            ...event,
            actual: live.actual || event.actual,
            previous: live.previous || event.previous,
          };
        }
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
    let currentWeekDays = 0;
    let lastWeekPnL = 0;
    let lastWeekTrades = 0;
    let lastWeekDays = 0;
    let monthlyPnL = 0;
    let monthlyTrades = 0;
    let monthlyDays = 0;

    Object.entries(tradeNotes).forEach(([dateStr, note]) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const noteDate = new Date(y, m - 1, d);

      // Check if in current week
      if (noteDate >= startOfCurrentWeek && noteDate <= endOfCurrentWeek) {
        if (note.pnl !== null && note.pnl !== undefined) {
          currentWeekPnL += note.pnl;
          currentWeekDays++;
        }
        if (note.trades !== null && note.trades !== undefined) {
          currentWeekTrades += note.trades;
        }
      }

      // Check if in last week
      if (noteDate >= startOfLastWeek && noteDate <= endOfLastWeek) {
        if (note.pnl !== null && note.pnl !== undefined) {
          lastWeekPnL += note.pnl;
          lastWeekDays++;
        }
        if (note.trades !== null && note.trades !== undefined) {
          lastWeekTrades += note.trades;
        }
      }

      // Check if in currently displayed month
      if (noteDate >= startOfMonth && noteDate <= endOfMonth) {
        if (note.pnl !== null && note.pnl !== undefined) {
          monthlyPnL += note.pnl;
          monthlyDays++;
        }
        if (note.trades !== null && note.trades !== undefined) {
          monthlyTrades += note.trades;
        }
      }
    });

    // Use current week if it has data, otherwise show last week
    const hasCurrentWeekData = currentWeekDays > 0 || currentWeekTrades > 0;
    const weeklyPnL = hasCurrentWeekData ? currentWeekPnL : lastWeekPnL;
    const weeklyTrades = hasCurrentWeekData ? currentWeekTrades : lastWeekTrades;
    const weeklyDays = hasCurrentWeekData ? currentWeekDays : lastWeekDays;
    const weekLabel = hasCurrentWeekData ? "This Week" : "Last Week";

    return {
      weeklyPnL,
      weeklyTrades,
      weeklyDays,
      weekLabel,
      monthlyPnL,
      monthlyTrades,
      monthlyDays,
    };
  }, [tradeNotes, currentMonth]);

  // Detailed monthly breakdown for charts
  const monthlyBreakdown = useMemo(() => {
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const dailyData: { date: string; day: number; pnl: number; trades: number; dayName: string }[] = [];
    let winDays = 0;
    let lossDays = 0;
    let bestDay = { pnl: 0, date: "" };
    let worstDay = { pnl: 0, date: "" };
    let totalPnL = 0;
    let totalTrades = 0;
    let cumulativePnL = 0;
    const cumulativeData: { day: number; cumulative: number }[] = [];

    // Iterate through all days in the month
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const note = tradeNotes[dateKey];

      if (note && (note.pnl !== null || note.trades !== null)) {
        const pnl = note.pnl ?? 0;
        const trades = note.trades ?? 0;

        dailyData.push({
          date: dateKey,
          day: d,
          pnl,
          trades,
          dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        });

        if (pnl > 0) winDays++;
        else if (pnl < 0) lossDays++;

        if (pnl > bestDay.pnl) bestDay = { pnl, date: dateKey };
        if (pnl < worstDay.pnl) worstDay = { pnl, date: dateKey };

        totalPnL += pnl;
        totalTrades += trades;
        cumulativePnL += pnl;
        cumulativeData.push({ day: d, cumulative: cumulativePnL });
      }
    }

    const avgPnLPerDay = dailyData.length > 0 ? totalPnL / dailyData.length : 0;
    const avgTradesPerDay = dailyData.length > 0 ? totalTrades / dailyData.length : 0;
    const winRate = (winDays + lossDays) > 0 ? (winDays / (winDays + lossDays)) * 100 : 0;

    return {
      dailyData,
      cumulativeData,
      winDays,
      lossDays,
      bestDay,
      worstDay,
      totalPnL,
      totalTrades,
      avgPnLPerDay,
      avgTradesPerDay,
      winRate,
      tradingDays: dailyData.length,
    };
  }, [tradeNotes, currentMonth]);

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

    Object.entries(tradeNotes).forEach(([dateStr, note]) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const noteDate = new Date(y, m - 1, d);

      // Only count notes within the effective range (week bounded by month)
      if (noteDate >= effectiveStart && noteDate <= effectiveEnd) {
        if (note.pnl !== null && note.pnl !== undefined) {
          weekPnL += note.pnl;
          weekDays++;
        }
        if (note.trades !== null && note.trades !== undefined) {
          weekTrades += note.trades;
        }
      }
    });

    return { weekPnL, weekTrades, weekDays };
  }, [tradeNotes]);

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
              title={showNotes ? "Hide notes" : "Show notes"}
            >
              {showNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Notes</span>
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
              <div className="absolute top-full left-0 mt-2 z-50 w-80 bg-card rounded-xl border border-border shadow-xl p-4 space-y-4 animate-slide-in">
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

                {/* Delete All Notes */}
                {Object.keys(tradeNotes).length > 0 && (
                  <div className="pt-3 mt-3 border-t border-border">
                    <button
                      onClick={() => setShowDeleteAllConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete All Notes ({Object.keys(tradeNotes).length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next High-Impact Countdown */}
          {showTenDayWindow && nextHighImpactEvent && (
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
                  <div className={`text-[10px] uppercase ${isCurrentDay ? "text-accent-light font-semibold" : "text-muted"}`}>
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
        <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <div
              key={day}
              className={`px-2 py-1.5 text-center text-xs font-medium ${
                index === 0 || index === 6 ? "text-muted/60 bg-background/30" : "text-muted"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 min-h-0 auto-rows-fr">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-border bg-background/30" />
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

            // Trade note data for this day
            const dayNote = tradeNotes[dateKey];
            const hasPnL = dayNote?.pnl !== null && dayNote?.pnl !== undefined;
            const hasTrades = dayNote?.trades !== null && dayNote?.trades !== undefined;
            const hasOnlyNote = dayNote?.note && !hasPnL && !hasTrades;
            const isProfit = hasPnL && (dayNote?.pnl || 0) >= 0;
            const isLoss = hasPnL && (dayNote?.pnl || 0) < 0;

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
                <button
                  key={day}
                  onClick={() => handleDayClick(dateKey)}
                  className={`p-1 border-b border-r text-left transition-all group relative ${
                    isHighlighted
                      ? "bg-accent/10 ring-2 ring-inset ring-accent/30 border-accent/30"
                      : showNotes && isProfit
                      ? "bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/20"
                      : showNotes && isLoss
                      ? "bg-red-500/15 border-red-500/40 hover:bg-red-500/20"
                      : (isMarketClosed || isEarlyClose) && showHolidays
                      ? "bg-gray-500/20 border-gray-500/40 hover:bg-gray-500/25"
                      : "border-border hover:bg-card-hover/30"
                  } ${isAnimated ? "animate-border-pulse" : ""}`}
                >
                  <div className="flex h-full">
                    {/* Left Column - Daily Data */}
                    <div className={`flex-1 flex flex-col pr-2 mr-1 border-r-2 border-border/50 ${isPastDay && !isProfit && !isLoss ? "opacity-60" : ""}`}>
                      {/* Day Number with Event Indicators */}
                      <div className={`text-xs font-medium flex items-center gap-1.5 ${isPastDay ? "text-muted" : "text-muted/70"}`}>
                        {day}
                        {showNotes && hasOnlyNote && <StickyNote className="w-3 h-3 text-accent-light" />}
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
                          {formatPnL(dayNote.pnl!)}
                        </div>
                      )}

                      {/* Trades count */}
                      {showNotes && hasTrades && (
                        <div className="text-xs text-muted">
                          {dayNote.trades} Trade{dayNote.trades !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

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

                    {/* Right Column - Weekly Summary */}
                    <div className={`w-[45%] flex flex-col items-center justify-center pl-1 rounded-r relative z-10 border-l-2 ${
                      weekTotals!.weekPnL >= 0
                        ? "bg-emerald-500/40 border-emerald-400/60"
                        : "bg-red-500/40 border-red-400/60"
                    }`}>
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
                    </div>
                  </div>
                </button>
              );
            }

            // Regular day cell (non-Saturday or Saturday without weekly data)
            return (
              <button
                key={day}
                onClick={() => handleDayClick(dateKey)}
                className={`p-1.5 border-b border-r text-left transition-all flex flex-col group relative ${
                  isHighlighted
                    ? "bg-accent/10 ring-2 ring-inset ring-accent/30 border-accent/30"
                    : showNotes && isProfit
                    ? "bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/20"
                    : showNotes && isLoss
                    ? "bg-red-500/15 border-red-500/40 hover:bg-red-500/20"
                    : (isMarketClosed || isEarlyClose) && showHolidays
                    ? "bg-gray-500/20 border-gray-500/40 hover:bg-gray-500/25"
                    : isCurrentDay
                    ? "bg-accent-light/10 border-accent-light/30"
                    : isPastDay
                    ? "bg-background/30 border-border opacity-50"
                    : isWeekend
                    ? "bg-background/20 border-border hover:bg-card-hover/50"
                    : "border-border hover:bg-card-hover"
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
                  {/* Note-only indicator */}
                  {showNotes && hasOnlyNote && (
                    <StickyNote className="w-3 h-3 text-accent-light" />
                  )}
                </div>

                {/* Trade P&L Display */}
                {showNotes && hasPnL && (
                  <div className={`text-sm font-bold mt-0.5 ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPnL(dayNote.pnl!)}
                  </div>
                )}

                {/* Trades count */}
                {showNotes && hasTrades && (
                  <div className="text-xs text-muted">
                    {dayNote.trades} Trade{dayNote.trades !== 1 ? "s" : ""}
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
                    className="border-b border-r border-border bg-background/30 p-1"
                  >
                    <div className="flex h-full">
                      {/* Left Column - Empty (no daily data for phantom day) */}
                      <div className="flex-1 flex flex-col pr-2 mr-1 border-r-2 border-border/50" />

                      {/* Right Column - Weekly Summary */}
                      <div className={`w-[45%] flex flex-col items-center justify-center pl-1 rounded-r relative z-10 border-l-2 ${
                        weekTotals.weekPnL >= 0
                          ? "bg-emerald-500/40 border-emerald-400/60"
                          : "bg-red-500/40 border-red-400/60"
                      }`}>
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
                      </div>
                    </div>
                  </div>
                );
              }
            }

            // Regular empty cell
            return (
              <div key={`empty-end-${i}`} className="border-b border-r border-border bg-background/30" />
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
                <p className="text-xs text-muted mt-0.5">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Add/Edit Note Button */}
                <button
                  onClick={openNoteModal}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    tradeNotes[selectedDay]
                      ? "bg-accent/20 text-accent-light border border-accent/30 hover:bg-accent/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                  }`}
                >
                  {tradeNotes[selectedDay] ? (
                    <>
                      <FileText className="w-4 h-4" />
                      View Note
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Note
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setHighlightedDay(null);
                    setShowNoteModal(false);
                  }}
                  className="p-2 rounded-lg hover:bg-card-hover transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1">
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
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-sm font-mono font-bold text-accent-light">{event.time}</span>
                                {event.historicalVolatility && event.historicalVolatility !== 'Very High' && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    event.historicalVolatility === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    event.historicalVolatility === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}>
                                    <Activity className="w-3 h-3" />
                                    {event.historicalVolatility}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">{event.event}</p>
                                <div className={`p-1 rounded transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                  <ChevronDown className="w-4 h-4 text-muted" />
                                </div>
                              </div>
                              <span className="text-[10px] text-muted capitalize mt-1 inline-block">
                                {event.category?.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-background/30 border-t border-border/30">
                            <div className="pl-6 pt-3 space-y-4">
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

                              {/* Why It Matters */}
                              {event.whyItMatters && (
                                <div>
                                  <h4 className="text-xs font-semibold text-accent-light uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Why it matters
                                  </h4>
                                  <p className="text-sm text-foreground/90 leading-relaxed">{event.whyItMatters}</p>
                                </div>
                              )}

                              {/* Typical Market Reaction */}
                              {event.typicalReaction && (
                                <div>
                                  <h4 className="text-xs font-semibold text-accent-light uppercase tracking-wide mb-2">
                                    Typical Market Reaction
                                  </h4>
                                  <div className="grid gap-2">
                                    {(event.typicalReaction.higherThanExpected || event.typicalReaction.hawkish) && (
                                      <div className="flex items-start gap-2 text-sm p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                          <span className="text-emerald-400 font-medium">
                                            {event.typicalReaction.hawkish ? 'Hawkish:' : 'Higher than expected:'}
                                          </span>
                                          <span className="text-foreground/80 ml-1">
                                            {event.typicalReaction.higherThanExpected || event.typicalReaction.hawkish}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {(event.typicalReaction.lowerThanExpected || event.typicalReaction.dovish) && (
                                      <div className="flex items-start gap-2 text-sm p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                          <span className="text-red-400 font-medium">
                                            {event.typicalReaction.dovish ? 'Dovish:' : 'Lower than expected:'}
                                          </span>
                                          <span className="text-foreground/80 ml-1">
                                            {event.typicalReaction.lowerThanExpected || event.typicalReaction.dovish}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Related Assets */}
                              {event.relatedAssets && event.relatedAssets.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-accent-light uppercase tracking-wide mb-2">
                                    Related Assets
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {event.relatedAssets.map((asset) => (
                                      <span
                                        key={asset}
                                        className="px-2.5 py-1 bg-accent/20 text-accent-light text-xs rounded-full border border-accent/30"
                                      >
                                        {asset}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Frequency & Source */}
                              <div className="flex items-center justify-between pt-3 border-t border-border/30">
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
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border/50 bg-card/50 flex-shrink-0">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Times shown in local time
                </span>
                <span className="text-accent-light">Click event to expand</span>
              </div>
            </div>
          </div>

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
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {monthlyBreakdown.tradingDays === 0 ? (
                <div className="text-center py-8 text-muted">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No trading data for this month</p>
                  <p className="text-xs mt-1">Add trade notes to see your breakdown</p>
                </div>
              ) : (
                <>
                  {/* Key Stats Row */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className={`p-3 rounded-xl border ${monthlyBreakdown.totalPnL >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Total P&L</div>
                      <div className={`text-xl font-bold ${monthlyBreakdown.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {monthlyBreakdown.totalPnL >= 0 ? "+" : ""}${monthlyBreakdown.totalPnL.toFixed(0)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-card-hover border border-border">
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Total Trades</div>
                      <div className="text-xl font-bold text-foreground">{monthlyBreakdown.totalTrades}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-card-hover border border-border">
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Trading Days</div>
                      <div className="text-xl font-bold text-foreground">{monthlyBreakdown.tradingDays}</div>
                    </div>
                    <div className={`p-3 rounded-xl border ${monthlyBreakdown.winRate >= 50 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Win Rate</div>
                      <div className={`text-xl font-bold ${monthlyBreakdown.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                        {monthlyBreakdown.winRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Win/Loss Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Winning Days</div>
                          <div className="text-lg font-bold text-emerald-400">{monthlyBreakdown.winDays}</div>
                        </div>
                        {monthlyBreakdown.bestDay.date && (
                          <div className="text-right">
                            <div className="text-[10px] text-muted">Best Day</div>
                            <div className="text-sm font-medium text-emerald-400">+${monthlyBreakdown.bestDay.pnl.toFixed(0)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Losing Days</div>
                          <div className="text-lg font-bold text-red-400">{monthlyBreakdown.lossDays}</div>
                        </div>
                        {monthlyBreakdown.worstDay.date && (
                          <div className="text-right">
                            <div className="text-[10px] text-muted">Worst Day</div>
                            <div className="text-sm font-medium text-red-400">${monthlyBreakdown.worstDay.pnl.toFixed(0)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Daily P&L Bar Chart */}
                  <div className="p-4 rounded-xl bg-card-hover border border-border">
                    <div className="text-xs font-medium text-muted mb-3">Daily P&L</div>
                    <div className="h-32 flex items-end gap-1">
                      {monthlyBreakdown.dailyData.map((day, i) => {
                        const maxAbs = Math.max(
                          ...monthlyBreakdown.dailyData.map(d => Math.abs(d.pnl)),
                          1
                        );
                        const heightPercent = Math.abs(day.pnl) / maxAbs * 100;
                        const isPositive = day.pnl >= 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                            <div
                              className={`w-full rounded-t transition-all hover:opacity-80 ${isPositive ? "bg-emerald-500" : "bg-red-500"}`}
                              style={{ height: `${Math.max(heightPercent, 2)}%` }}
                              title={`${day.dayName} ${day.day}: ${day.pnl >= 0 ? "+" : ""}$${day.pnl.toFixed(0)}`}
                            />
                            <span className="text-[8px] text-muted mt-1">{day.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cumulative P&L Line Chart */}
                  <div className="p-4 rounded-xl bg-card-hover border border-border">
                    <div className="text-xs font-medium text-muted mb-3">Cumulative P&L</div>
                    <div className="h-24 relative">
                      {monthlyBreakdown.cumulativeData.length > 1 && (() => {
                        const values = monthlyBreakdown.cumulativeData.map(d => d.cumulative);
                        const min = Math.min(...values, 0);
                        const max = Math.max(...values, 0);
                        const range = max - min || 1;
                        const zeroY = ((max - 0) / range) * 100;

                        return (
                          <svg className="w-full h-full" preserveAspectRatio="none">
                            {/* Zero line */}
                            <line
                              x1="0"
                              y1={`${zeroY}%`}
                              x2="100%"
                              y2={`${zeroY}%`}
                              stroke="currentColor"
                              strokeOpacity="0.2"
                              strokeDasharray="4"
                            />
                            {/* Line */}
                            <polyline
                              fill="none"
                              stroke={monthlyBreakdown.totalPnL >= 0 ? "#34d399" : "#f87171"}
                              strokeWidth="2"
                              points={monthlyBreakdown.cumulativeData.map((d, i) => {
                                const x = (i / (monthlyBreakdown.cumulativeData.length - 1)) * 100;
                                const y = ((max - d.cumulative) / range) * 100;
                                return `${x}%,${y}%`;
                              }).join(" ")}
                            />
                            {/* End dot */}
                            {(() => {
                              const last = monthlyBreakdown.cumulativeData[monthlyBreakdown.cumulativeData.length - 1];
                              const x = 100;
                              const y = ((max - last.cumulative) / range) * 100;
                              return (
                                <circle
                                  cx={`${x}%`}
                                  cy={`${y}%`}
                                  r="4"
                                  fill={monthlyBreakdown.totalPnL >= 0 ? "#34d399" : "#f87171"}
                                />
                              );
                            })()}
                          </svg>
                        );
                      })()}
                      <div className="absolute bottom-0 right-0 text-xs">
                        <span className={monthlyBreakdown.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {monthlyBreakdown.totalPnL >= 0 ? "+" : ""}${monthlyBreakdown.totalPnL.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Averages */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-card-hover border border-border flex items-center justify-between">
                      <span className="text-muted">Avg P&L / Day</span>
                      <span className={`font-medium ${monthlyBreakdown.avgPnLPerDay >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {monthlyBreakdown.avgPnLPerDay >= 0 ? "+" : ""}${monthlyBreakdown.avgPnLPerDay.toFixed(0)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-card-hover border border-border flex items-center justify-between">
                      <span className="text-muted">Avg Trades / Day</span>
                      <span className="font-medium text-foreground">{monthlyBreakdown.avgTradesPerDay.toFixed(1)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
