"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Clock } from "lucide-react";

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

export default function TimelinePage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch events from API
  useEffect(() => {
    async function fetchEvents() {
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
    }
    fetchEvents();
  }, []);

  // Filter events for selected date
  const dayEvents = useMemo(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    return events
      .filter((e) => e.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [events, selectedDate]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  };

  // Get current hour for timeline position
  const currentHour = new Date().getHours();
  const timelinePosition = Math.min(Math.max((currentHour / 24) * 100, 0), 100);

  // Check if selected date is today
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Timeline</h1>
          <p className="text-muted text-sm mt-1">Real-time view of economic events</p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateDate("prev")}
            className="p-2 rounded-lg bg-card border border-border hover:bg-card-hover transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[180px]">
            <p className="text-sm font-medium">{formatDate(selectedDate)}</p>
            <p className="text-xs text-muted">Local Time</p>
          </div>
          <button
            onClick={() => navigateDate("next")}
            className="p-2 rounded-lg bg-card border border-border hover:bg-card-hover transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-2 text-sm font-medium bg-accent/10 text-accent-light rounded-lg hover:bg-accent/20 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Market Sessions Timeline */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Market Sessions</h2>
          <span className="text-xs text-accent-light font-medium">
            {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* 24-hour timeline */}
        <div className="relative">
          {/* Hour markers */}
          <div className="flex justify-between text-[10px] text-muted mb-2">
            {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"].map((time) => (
              <span key={time}>{time}</span>
            ))}
          </div>

          {/* Sessions container */}
          <div className="relative h-24 bg-background rounded-lg overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 flex">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-1 border-r border-border/30 last:border-r-0" />
              ))}
            </div>

            {/* Sydney Session: 5pm-2am EST (17:00-02:00) */}
            <div
              className="absolute h-5 top-2 bg-purple-500/30 border-l-2 border-purple-500 rounded-r"
              style={{ left: "70.83%", width: "29.17%" }}
            >
              <span className="text-[10px] text-purple-400 ml-1 font-medium">Sydney</span>
            </div>
            <div
              className="absolute h-5 top-2 bg-purple-500/30 rounded-r"
              style={{ left: "0%", width: "8.33%" }}
            />

            {/* Tokyo Session: 7pm-4am EST (19:00-04:00) */}
            <div
              className="absolute h-5 top-8 bg-pink-500/30 border-l-2 border-pink-500 rounded-r"
              style={{ left: "79.17%", width: "20.83%" }}
            >
              <span className="text-[10px] text-pink-400 ml-1 font-medium">Tokyo</span>
            </div>
            <div
              className="absolute h-5 top-8 bg-pink-500/30 rounded-r"
              style={{ left: "0%", width: "16.67%" }}
            />

            {/* London Session: 3am-12pm EST (03:00-12:00) */}
            <div
              className="absolute h-5 top-14 bg-blue-500/30 border-l-2 border-blue-500 rounded-r"
              style={{ left: "12.5%", width: "37.5%" }}
            >
              <span className="text-[10px] text-blue-400 ml-1 font-medium">London</span>
            </div>

            {/* New York Session: 8am-5pm EST (08:00-17:00) */}
            <div
              className="absolute h-5 top-20 bg-emerald-500/30 border-l-2 border-emerald-500 rounded-r"
              style={{ left: "33.33%", width: "37.5%" }}
            >
              <span className="text-[10px] text-emerald-400 ml-1 font-medium">New York</span>
            </div>

            {/* Current time indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent z-10"
              style={{ left: `${timelinePosition}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-accent text-[10px] font-medium text-white whitespace-nowrap">
                NOW
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium">
            {isToday ? "Today's Events" : `Events for ${formatDate(selectedDate)}`}
          </h2>
          <span className="text-xs text-muted">{dayEvents.length} events</span>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : dayEvents.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-8 h-8 mx-auto mb-3 text-muted" />
            <p className="text-muted text-sm">No events scheduled for this day</p>
          </div>
        ) : (
          /* Timeline view */
          <div className="relative">
            {dayEvents.map((event, index) => {
              const isPast = event.actual !== null;
              const isNext = !isPast && index === dayEvents.findIndex((e) => e.actual === null);

              return (
                <div
                  key={event.id}
                  className={`relative flex gap-4 p-4 border-b border-border last:border-b-0 transition-colors hover:bg-card-hover ${
                    isNext ? "bg-accent/5" : ""
                  } ${isPast ? "opacity-60" : ""}`}
                >
                  {/* Time column with line */}
                  <div className="flex flex-col items-center w-16 shrink-0">
                    <span className="text-sm font-mono font-medium">{event.time}</span>
                    {index < dayEvents.length - 1 && (
                      <div className="flex-1 w-px bg-border mt-2" />
                    )}
                  </div>

                  {/* Event dot */}
                  <div className="flex items-start pt-1">
                    <div
                      className={`w-3 h-3 rounded-full ${impactColors[event.impact]} ${
                        isNext ? "ring-4 ring-accent/20" : ""
                      }`}
                    />
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isNext && (
                        <span className="px-2 py-0.5 rounded bg-accent/20 text-accent-light text-xs font-medium">
                          Up Next
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-foreground">{event.event}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted">
                      {event.previous && (
                        <span>Previous: <span className="text-foreground">{event.previous}</span></span>
                      )}
                      {event.forecast && (
                        <span>Forecast: <span className="text-foreground">{event.forecast}</span></span>
                      )}
                      {event.actual && (
                        <span>
                          Actual: <span className="text-foreground font-semibold">{event.actual}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          High Impact
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          Medium Impact
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          Low Impact
        </div>
      </div>
    </div>
  );
}
