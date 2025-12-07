"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Mock economic events data (US only)
const economicEvents = [
  {
    id: 1,
    time: "08:30",
    currency: "USD",
    event: "Core CPI (MoM)",
    impact: "high",
    forecast: "0.3%",
    previous: "0.2%",
    actual: null,
  },
  {
    id: 2,
    time: "08:30",
    currency: "USD",
    event: "CPI (YoY)",
    impact: "high",
    forecast: "2.9%",
    previous: "2.7%",
    actual: null,
  },
  {
    id: 3,
    time: "10:00",
    currency: "USD",
    event: "Wholesale Inventories",
    impact: "low",
    forecast: "0.2%",
    previous: "0.1%",
    actual: "0.2%",
  },
  {
    id: 4,
    time: "10:30",
    currency: "USD",
    event: "EIA Natural Gas Storage",
    impact: "medium",
    forecast: "-50B",
    previous: "-45B",
    actual: "-52B",
  },
  {
    id: 5,
    time: "13:30",
    currency: "USD",
    event: "Initial Jobless Claims",
    impact: "medium",
    forecast: "215K",
    previous: "211K",
    actual: null,
  },
  {
    id: 6,
    time: "15:00",
    currency: "USD",
    event: "Crude Oil Inventories",
    impact: "low",
    forecast: "-1.2M",
    previous: "-2.0M",
    actual: null,
  },
  {
    id: 7,
    time: "19:00",
    currency: "USD",
    event: "FOMC Member Waller Speaks",
    impact: "medium",
    forecast: "-",
    previous: "-",
    actual: null,
  },
];

const impactColors = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-emerald-500",
};

const currencyFlags: Record<string, string> = {
  USD: "🇺🇸",
};

export default function TimelinePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Timeline</h1>
          <p className="text-muted text-sm mt-1">Real-time view of today's economic events</p>
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
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Today's Events</h2>
        </div>

        {/* Timeline view */}
        <div className="relative">
          {economicEvents.map((event, index) => {
            const isPast = event.actual !== null;
            const isNext = !isPast && index === economicEvents.findIndex((e) => e.actual === null);

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
                  {index < economicEvents.length - 1 && (
                    <div className="flex-1 w-px bg-border mt-2" />
                  )}
                </div>

                {/* Event dot */}
                <div className="flex items-start pt-1">
                  <div
                    className={`w-3 h-3 rounded-full ${impactColors[event.impact as keyof typeof impactColors]} ${
                      isNext ? "ring-4 ring-accent/20" : ""
                    }`}
                  />
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-card-hover text-xs font-medium">
                      <span>{currencyFlags[event.currency] || "🏳️"}</span>
                      {event.currency}
                    </span>
                    {isNext && (
                      <span className="px-2 py-0.5 rounded bg-accent/20 text-accent-light text-xs font-medium">
                        Up Next
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-foreground">{event.event}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted">
                    <span>Forecast: <span className="text-foreground">{event.forecast}</span></span>
                    <span>Previous: <span className="text-foreground">{event.previous}</span></span>
                    {event.actual && (
                      <span>
                        Actual:{" "}
                        <span
                          className={`font-semibold ${
                            parseFloat(event.actual) > parseFloat(event.forecast.replace(/[%KM]/g, ""))
                              ? "text-emerald-400"
                              : parseFloat(event.actual) < parseFloat(event.forecast.replace(/[%KM]/g, ""))
                              ? "text-red-400"
                              : "text-foreground"
                          }`}
                        >
                          {event.actual}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
