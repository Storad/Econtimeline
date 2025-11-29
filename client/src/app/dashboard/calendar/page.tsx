"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Clock,
  RefreshCw,
} from "lucide-react";

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low" | "holiday";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  category: string;
}

const impactColors = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-emerald-500",
  holiday: "bg-gray-500",
};

const currencyFlags: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  CHF: "🇨🇭",
  NZD: "🇳🇿",
  CNY: "🇨🇳",
};

const currencies = ["All", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD", "CNY"];
const impactLevels = ["All", "High", "Medium", "Low"];
const categories = [
  "All",
  "Interest Rates",
  "Employment",
  "Inflation",
  "GDP",
  "Consumer",
  "Manufacturing",
  "Trade",
  "Housing",
  "Speeches",
  "Energy",
  "Sentiment",
  "Other",
];

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null);

  // Filters
  const [filterCurrency, setFilterCurrency] = useState("All");
  const [filterImpact, setFilterImpact] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/calendar");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const currencyMatch =
        filterCurrency === "All" || event.currency === filterCurrency;
      const impactMatch =
        filterImpact === "All" || event.impact === filterImpact.toLowerCase();
      const categoryMatch =
        filterCategory === "All" || event.category === filterCategory;
      return currencyMatch && impactMatch && categoryMatch;
    });
  }, [events, filterCurrency, filterImpact, filterCategory]);

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
    return date.toISOString().split("T")[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return formatDateKey(date) === formatDateKey(today);
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentMonth(newDate);
  };

  const handleDayClick = (dateKey: string) => {
    setSelectedDay(dateKey);
    setHighlightedDay(dateKey);
    setShowModal(true);
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  // Selected day events for modal
  const selectedDayEvents = selectedDay ? eventsByDate[selectedDay] || [] : [];

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold">Economic Calendar</h1>
          <p className="text-xs text-muted">Upcoming economic events and releases</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              showFilters
                ? "bg-accent/20 border-accent/50 text-accent-light"
                : "bg-card border-border hover:bg-card-hover"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterCurrency !== "All" ||
              filterImpact !== "All" ||
              filterCategory !== "All") && (
              <span className="w-2 h-2 rounded-full bg-accent-light" />
            )}
          </button>

          <button
            onClick={fetchEvents}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-card-hover transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {/* Legend */}
          <div className="hidden md:flex items-center gap-4 ml-2 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              High
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              Medium
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Low
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card rounded-xl border border-border p-4 flex-shrink-0">
          <div className="flex flex-wrap gap-6 items-end">
            {/* Currency Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-muted mb-2">Currency</label>
              <div className="flex flex-wrap gap-1.5">
                {currencies.slice(0, 7).map((currency) => (
                  <button
                    key={currency}
                    onClick={() => setFilterCurrency(currency)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      filterCurrency === currency
                        ? "bg-accent/20 border-accent/50 text-accent-light"
                        : "bg-card-hover border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {currency !== "All" && currencyFlags[currency]} {currency}
                  </button>
                ))}
              </div>
            </div>

            {/* Impact Filter */}
            <div>
              <label className="block text-xs font-medium text-muted mb-2">Impact</label>
              <div className="flex gap-1.5">
                {impactLevels.map((impact) => (
                  <button
                    key={impact}
                    onClick={() => setFilterImpact(impact)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      filterImpact === impact
                        ? "bg-accent/20 border-accent/50 text-accent-light"
                        : "bg-card-hover border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {impact !== "All" && (
                      <span className={`inline-block w-2 h-2 rounded-full ${impactColors[impact.toLowerCase() as keyof typeof impactColors]} mr-1.5`} />
                    )}
                    {impact}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium text-muted mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1 text-xs bg-card-hover border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Clear */}
            {(filterCurrency !== "All" || filterImpact !== "All" || filterCategory !== "All") && (
              <button
                onClick={() => {
                  setFilterCurrency("All");
                  setFilterImpact("All");
                  setFilterCategory("All");
                }}
                className="text-xs text-accent-light hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* 10-Day Window */}
      <div className="bg-card rounded-xl border border-border p-3 flex-shrink-0">
        <h2 className="text-xs font-medium text-muted mb-2">10-Day Window</h2>
        <div className="grid grid-cols-10 gap-2">
          {tenDayWindow.map((date) => {
            const dateKey = formatDateKey(date);
            const dayEvents = eventsByDate[dateKey] || [];
            const highestImpact = getHighestImpact(dateKey);
            const isCurrentDay = isToday(date);
            const isPastDay = isPast(date) && !isCurrentDay;
            const isHighlighted = highlightedDay === dateKey;

            return (
              <button
                key={dateKey}
                onClick={() => handleDayClick(dateKey)}
                className={`relative flex flex-col items-center p-2 rounded-lg border transition-all ${
                  isHighlighted
                    ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                    : isCurrentDay
                    ? "border-accent-light bg-accent-light/10"
                    : isPastDay
                    ? "border-border/50 bg-card-hover/30 opacity-50"
                    : "border-border bg-card-hover hover:bg-card-hover/80 hover:border-border"
                }`}
              >
                {/* Impact indicator */}
                {highestImpact && (
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${impactColors[highestImpact]}`} />
                )}

                {/* Day of week */}
                <div className="text-[10px] text-muted uppercase">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>

                {/* Date */}
                <div className={`text-base font-bold ${isCurrentDay ? "text-accent-light" : ""}`}>
                  {date.getDate()}
                </div>

                {/* Event count */}
                <div className="text-[10px] text-muted">
                  {dayEvents.length > 0 ? `${dayEvents.length} events` : "—"}
                </div>

                {/* Today label */}
                {isCurrentDay && (
                  <div className="text-[8px] font-bold text-accent-light mt-0.5">TODAY</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Month Calendar */}
      <div className="bg-card rounded-xl border border-border flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-1.5 rounded-lg hover:bg-card-hover transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <button
            onClick={() => navigateMonth("next")}
            className="p-1.5 rounded-lg hover:bg-card-hover transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="px-2 py-1.5 text-center text-xs font-medium text-muted">
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

            const highCount = dayEvents.filter((e) => e.impact === "high").length;
            const medCount = dayEvents.filter((e) => e.impact === "medium").length;
            const lowCount = dayEvents.filter((e) => e.impact === "low").length;

            return (
              <button
                key={day}
                onClick={() => handleDayClick(dateKey)}
                className={`p-1.5 border-b border-r border-border text-left transition-colors flex flex-col ${
                  isHighlighted
                    ? "bg-accent/10 ring-2 ring-inset ring-accent/30"
                    : isCurrentDay
                    ? "bg-accent-light/5"
                    : isPastDay
                    ? "bg-background/30 opacity-50"
                    : "hover:bg-card-hover"
                }`}
              >
                {/* Day Number */}
                <div className={`text-xs font-medium ${isCurrentDay ? "text-accent-light" : isPastDay ? "text-muted" : ""}`}>
                  {day}
                  {isCurrentDay && <span className="ml-1 text-[9px] text-accent-light">TODAY</span>}
                </div>

                {/* Event Indicators */}
                {dayEvents.length > 0 && (
                  <div className="flex items-center gap-1 mt-auto flex-wrap">
                    {highCount > 0 && (
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[9px] text-muted ml-0.5">{highCount}</span>
                      </div>
                    )}
                    {medCount > 0 && (
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-[9px] text-muted ml-0.5">{medCount}</span>
                      </div>
                    )}
                    {lowCount > 0 && (
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[9px] text-muted ml-0.5">{lowCount}</span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          {/* Empty cells after month ends */}
          {Array.from({ length: (7 - ((startingDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} className="border-b border-r border-border bg-background/30" />
          ))}
        </div>
      </div>

      {/* Day Detail Modal */}
      {showModal && selectedDay && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowModal(false);
            setHighlightedDay(null);
          }}
        >
          <div
            className="bg-card rounded-xl border border-border max-w-lg w-full max-h-[70vh] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold">
                {new Date(selectedDay).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setHighlightedDay(null);
                }}
                className="p-1.5 rounded-lg hover:bg-card-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[50vh]">
              {selectedDayEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">No events scheduled for this day</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {selectedDayEvents.map((event) => (
                    <div key={event.id} className="px-4 py-3 hover:bg-card-hover transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${impactColors[event.impact]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted">{event.time}</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-card-hover text-xs font-medium">
                              {currencyFlags[event.currency]} {event.currency}
                            </span>
                            <span className="text-[10px] text-muted px-1.5 py-0.5 rounded bg-background">
                              {event.category}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{event.event}</p>
                          <div className="flex gap-4 mt-1.5 text-xs">
                            {event.forecast && (
                              <span className="text-muted">
                                Forecast: <span className="text-foreground">{event.forecast}</span>
                              </span>
                            )}
                            {event.previous && (
                              <span className="text-muted">
                                Previous: <span className="text-foreground">{event.previous}</span>
                              </span>
                            )}
                            {event.actual && (
                              <span className="text-muted">
                                Actual: <span className="font-semibold text-accent-light">{event.actual}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 border-t border-border bg-card-hover/30">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}</span>
                <span>Times shown in local time</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
