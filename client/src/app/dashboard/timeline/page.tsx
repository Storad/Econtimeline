"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Clock,
  X,
  Bell,
  Plus,
  Settings,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface MarketSession {
  id: string;
  name: string;
  shortName: string;
  color: string;
  preMarket?: { start: number; end: number }; // Hours in UTC
  regular: { start: number; end: number };
  postMarket?: { start: number; end: number };
  timezone: string;
}

interface CalendarEvent {
  date: string;
  time: string;
  title: string;
  impact: "high" | "medium" | "low";
  category: string;
  actual?: string;
  previous?: string;
  forecast?: string;
  description?: string;
}

interface CustomSession {
  id: string;
  name: string;
  startTime: string; // HH:MM format
  endTime: string;
  color: string;
  recurring: boolean;
  days?: number[]; // 0-6, Sunday-Saturday
}

interface CustomAlert {
  id: string;
  name: string;
  time: string; // HH:MM format
  sound: string;
  recurring: boolean;
  days?: number[];
}

// ============================================
// CONSTANTS
// ============================================

// Market sessions in UTC hours
const MARKET_SESSIONS: MarketSession[] = [
  {
    id: "us",
    name: "New York Stock Exchange",
    shortName: "NYSE",
    color: "#3B82F6", // Blue
    preMarket: { start: 9, end: 14.5 }, // 4:00 AM - 9:30 AM ET = 9:00 - 14:30 UTC
    regular: { start: 14.5, end: 21 }, // 9:30 AM - 4:00 PM ET = 14:30 - 21:00 UTC
    postMarket: { start: 21, end: 25 }, // 4:00 PM - 8:00 PM ET = 21:00 - 01:00 UTC (next day)
    timezone: "America/New_York",
  },
  {
    id: "london",
    name: "London Stock Exchange",
    shortName: "LSE",
    color: "#EF4444", // Red
    regular: { start: 8, end: 16.5 }, // 8:00 AM - 4:30 PM GMT = 8:00 - 16:30 UTC
    timezone: "Europe/London",
  },
  {
    id: "tokyo",
    name: "Tokyo Stock Exchange",
    shortName: "TSE",
    color: "#F59E0B", // Amber
    regular: { start: 0, end: 6.5 }, // 9:00 AM - 3:30 PM JST = 0:00 - 6:30 UTC
    timezone: "Asia/Tokyo",
  },
  {
    id: "sydney",
    name: "Australian Securities Exchange",
    shortName: "ASX",
    color: "#10B981", // Emerald
    regular: { start: 23, end: 29 }, // 10:00 AM - 4:00 PM AEDT = 23:00 - 05:00 UTC (next day)
    timezone: "Australia/Sydney",
  },
];

// View window: 3 hours past, 8 hours future = 11 hours total
const HOURS_IN_PAST = 3;
const HOURS_IN_FUTURE = 8;
const TOTAL_HOURS = HOURS_IN_PAST + HOURS_IN_FUTURE;

// Pixels per hour (determines zoom level)
const PIXELS_PER_HOUR = 200;
const PIXELS_PER_SECOND = PIXELS_PER_HOUR / 3600;

// NOW line position (left of center, about 27% from left for 3/11 ratio)
const NOW_LINE_POSITION = HOURS_IN_PAST / TOTAL_HOURS;

// Impact colors
const IMPACT_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getTimePosition(targetTime: Date, currentTime: Date, containerWidth: number): number {
  const diffMs = targetTime.getTime() - currentTime.getTime();
  const diffSeconds = diffMs / 1000;
  const diffPixels = diffSeconds * PIXELS_PER_SECOND;

  // NOW line is at NOW_LINE_POSITION of container width
  const nowLinePixels = containerWidth * NOW_LINE_POSITION;

  return nowLinePixels + diffPixels;
}

function isSessionActive(session: MarketSession, currentHourUTC: number, type: "pre" | "regular" | "post"): boolean {
  let timeRange;
  if (type === "pre") timeRange = session.preMarket;
  else if (type === "post") timeRange = session.postMarket;
  else timeRange = session.regular;

  if (!timeRange) return false;

  // Handle sessions that cross midnight
  if (timeRange.end > 24) {
    return currentHourUTC >= timeRange.start || currentHourUTC < (timeRange.end - 24);
  }

  return currentHourUTC >= timeRange.start && currentHourUTC < timeRange.end;
}

function getSessionProgress(session: MarketSession, currentHourUTC: number, type: "pre" | "regular" | "post"): number {
  let timeRange;
  if (type === "pre") timeRange = session.preMarket;
  else if (type === "post") timeRange = session.postMarket;
  else timeRange = session.regular;

  if (!timeRange) return 0;

  let start = timeRange.start;
  let end = timeRange.end;
  let current = currentHourUTC;

  // Handle sessions that cross midnight
  if (end > 24) {
    if (current < start) current += 24;
    end = end; // Keep as is for calculation
  }

  if (current < start) return 0;
  if (current >= end) return 100;

  return ((current - start) / (end - start)) * 100;
}

// ============================================
// COLOR OPTIONS FOR CUSTOM SESSIONS
// ============================================

const COLOR_OPTIONS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Green", value: "#22C55E" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
];

const DAY_OPTIONS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function TimelinePage() {
  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenX, setShowFullscreenX] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0); // Pixels offset from live
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [customSessions, setCustomSessions] = useState<CustomSession[]>([]);
  const [customAlerts, setCustomAlerts] = useState<CustomAlert[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"session" | "alert">("session");
  const [editingItem, setEditingItem] = useState<CustomSession | CustomAlert | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formAlertTime, setFormAlertTime] = useState("09:00");
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0].value);
  const [formRecurring, setFormRecurring] = useState(false);
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays by default

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());

  // Load calendar events
  useEffect(() => {
    fetch("/calendar-data.json")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
      })
      .catch((err) => console.error("Failed to load calendar data:", err));
  }, []);

  // Load custom sessions and alerts from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("timeline-custom-sessions");
    const savedAlerts = localStorage.getItem("timeline-custom-alerts");

    if (savedSessions) {
      try {
        setCustomSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to load custom sessions:", e);
      }
    }

    if (savedAlerts) {
      try {
        setCustomAlerts(JSON.parse(savedAlerts));
      } catch (e) {
        console.error("Failed to load custom alerts:", e);
      }
    }
  }, []);

  // Save custom sessions to localStorage when changed
  useEffect(() => {
    if (customSessions.length > 0) {
      localStorage.setItem("timeline-custom-sessions", JSON.stringify(customSessions));
    }
  }, [customSessions]);

  // Save custom alerts to localStorage when changed
  useEffect(() => {
    if (customAlerts.length > 0) {
      localStorage.setItem("timeline-custom-alerts", JSON.stringify(customAlerts));
    }
  }, [customAlerts]);

  // Real-time clock update (1 second = 1 second)
  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const elapsed = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setCurrentTime(new Date(now));

      // If not dragging and has offset, keep offset stable
      // (timeline scrolls, offset stays the same)

      animationRef.current = requestAnimationFrame(updateTime);
    };

    animationRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Mouse handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartOffset(scrollOffset);
  }, [scrollOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    setScrollOffset(dragStartOffset + deltaX);
  }, [isDragging, dragStartX, dragStartOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset to live
  const handleReset = useCallback(() => {
    setScrollOffset(0);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Open modal for new session
  const openNewSessionModal = useCallback(() => {
    setModalMode("session");
    setEditingItem(null);
    setFormName("");
    setFormStartTime("09:00");
    setFormEndTime("17:00");
    setFormColor(COLOR_OPTIONS[0].value);
    setFormRecurring(false);
    setFormDays([1, 2, 3, 4, 5]);
    setShowModal(true);
  }, []);

  // Open modal for new alert
  const openNewAlertModal = useCallback(() => {
    setModalMode("alert");
    setEditingItem(null);
    setFormName("");
    setFormAlertTime("09:00");
    setFormColor(COLOR_OPTIONS[4].value); // Orange for alerts
    setFormRecurring(false);
    setFormDays([1, 2, 3, 4, 5]);
    setShowModal(true);
  }, []);

  // Open modal to edit session
  const editSession = useCallback((session: CustomSession) => {
    setModalMode("session");
    setEditingItem(session);
    setFormName(session.name);
    setFormStartTime(session.startTime);
    setFormEndTime(session.endTime);
    setFormColor(session.color);
    setFormRecurring(session.recurring);
    setFormDays(session.days || [1, 2, 3, 4, 5]);
    setShowModal(true);
  }, []);

  // Open modal to edit alert
  const editAlert = useCallback((alert: CustomAlert) => {
    setModalMode("alert");
    setEditingItem(alert);
    setFormName(alert.name);
    setFormAlertTime(alert.time);
    setFormColor("#F97316");
    setFormRecurring(alert.recurring);
    setFormDays(alert.days || [1, 2, 3, 4, 5]);
    setShowModal(true);
  }, []);

  // Toggle day selection
  const toggleDay = useCallback((day: number) => {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }, []);

  // Save session or alert
  const handleSave = useCallback(() => {
    if (!formName.trim()) return;

    if (modalMode === "session") {
      const newSession: CustomSession = {
        id: editingItem?.id || `session-${Date.now()}`,
        name: formName.trim(),
        startTime: formStartTime,
        endTime: formEndTime,
        color: formColor,
        recurring: formRecurring,
        days: formRecurring ? formDays : undefined,
      };

      if (editingItem) {
        setCustomSessions((prev) =>
          prev.map((s) => (s.id === editingItem.id ? newSession : s))
        );
      } else {
        setCustomSessions((prev) => [...prev, newSession]);
      }
    } else {
      const newAlert: CustomAlert = {
        id: editingItem?.id || `alert-${Date.now()}`,
        name: formName.trim(),
        time: formAlertTime,
        sound: "default",
        recurring: formRecurring,
        days: formRecurring ? formDays : undefined,
      };

      if (editingItem) {
        setCustomAlerts((prev) =>
          prev.map((a) => (a.id === editingItem.id ? newAlert : a))
        );
      } else {
        setCustomAlerts((prev) => [...prev, newAlert]);
      }
    }

    setShowModal(false);
  }, [modalMode, editingItem, formName, formStartTime, formEndTime, formAlertTime, formColor, formRecurring, formDays]);

  // Delete session or alert
  const handleDelete = useCallback(() => {
    if (!editingItem) return;

    if (modalMode === "session") {
      setCustomSessions((prev) => prev.filter((s) => s.id !== editingItem.id));
      localStorage.setItem(
        "timeline-custom-sessions",
        JSON.stringify(customSessions.filter((s) => s.id !== editingItem.id))
      );
    } else {
      setCustomAlerts((prev) => prev.filter((a) => a.id !== editingItem.id));
      localStorage.setItem(
        "timeline-custom-alerts",
        JSON.stringify(customAlerts.filter((a) => a.id !== editingItem.id))
      );
    }

    setShowModal(false);
  }, [modalMode, editingItem, customSessions, customAlerts]);

  // Fullscreen X visibility
  const handleFullscreenMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isFullscreen) return;

    // Show X when cursor is near top-right corner
    const threshold = 100;
    const nearTopRight = e.clientX > window.innerWidth - threshold && e.clientY < threshold;
    setShowFullscreenX(nearTopRight);
  }, [isFullscreen]);

  // Calculate visible time range
  const containerWidth = containerRef.current?.clientWidth || 1200;
  const visibleStartTime = new Date(currentTime.getTime() - HOURS_IN_PAST * 60 * 60 * 1000);
  const visibleEndTime = new Date(currentTime.getTime() + HOURS_IN_FUTURE * 60 * 60 * 1000);

  // Get current hour in UTC for session calculations
  const currentHourUTC = currentTime.getUTCHours() + currentTime.getUTCMinutes() / 60;

  // Filter events in visible range
  const visibleEvents = events.filter((event) => {
    const eventDateTime = new Date(`${event.date}T${event.time || "00:00"}:00`);
    return eventDateTime >= visibleStartTime && eventDateTime <= visibleEndTime;
  });

  // Check if timeline is live (no offset)
  const isLive = scrollOffset === 0;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`${
        isFullscreen
          ? "fixed inset-0 z-50 bg-background"
          : "h-full"
      } flex flex-col select-none`}
      onMouseMove={handleFullscreenMouseMove}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        {/* Left - Title & Status */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Timeline</h1>
          {!isLive && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              PAUSED
            </span>
          )}
          {isLive && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {/* Center - Clock */}
        <div className="flex flex-col items-center">
          <div className="text-2xl font-mono font-bold tracking-wider">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-muted">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Right - Controls */}
        <div className="flex items-center gap-2">
          {!isLive && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent-light border border-accent/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">Reset to Live</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-card-hover transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Fullscreen X Button */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className={`fixed top-4 right-4 z-[60] p-2 rounded-lg bg-card/80 hover:bg-card border border-border transition-all ${
            showFullscreenX ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Main Timeline Container */}
      <div
        ref={timelineRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Time Scale / Ruler */}
        <div className="absolute top-0 left-0 right-0 h-8 border-b border-border bg-card/50 flex items-end">
          {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
            const hourOffset = i - HOURS_IN_PAST;
            const hourTime = new Date(currentTime.getTime() + hourOffset * 60 * 60 * 1000);
            const xPos = getTimePosition(hourTime, currentTime, containerWidth) + scrollOffset;

            if (xPos < -50 || xPos > containerWidth + 50) return null;

            return (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{ left: xPos, transform: "translateX(-50%)" }}
              >
                <span className="text-xs text-muted font-mono">
                  {hourTime.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}
                </span>
                <div className="w-px h-2 bg-border" />
              </div>
            );
          })}
        </div>

        {/* Top Lane - Market Sessions */}
        <div className="absolute top-10 left-0 right-0 h-32 border-b border-border">
          <div className="absolute left-2 top-1 text-xs text-muted font-medium uppercase tracking-wider">
            Market Sessions
          </div>

          {MARKET_SESSIONS.map((session, sessionIndex) => {
            const yPos = 20 + sessionIndex * 26;

            return (
              <div
                key={session.id}
                className="absolute left-0 right-0"
                style={{ top: yPos }}
              >
                {/* Session Label */}
                <div
                  className="absolute left-2 text-xs font-medium z-10 px-1.5 py-0.5 rounded"
                  style={{ color: session.color, backgroundColor: `${session.color}20` }}
                >
                  {session.shortName}
                </div>

                {/* Session Bars - render for visible time range */}
                {(() => {
                  const bars = [];

                  // Calculate bar positions for current day and adjacent days
                  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
                    const dayStart = new Date(currentTime);
                    dayStart.setUTCHours(0, 0, 0, 0);
                    dayStart.setUTCDate(dayStart.getUTCDate() + dayOffset);

                    // Regular session
                    const regularStart = new Date(dayStart.getTime() + session.regular.start * 60 * 60 * 1000);
                    let regularEnd = new Date(dayStart.getTime() + session.regular.end * 60 * 60 * 1000);
                    if (session.regular.end > 24) {
                      regularEnd = new Date(dayStart.getTime() + (session.regular.end - 24) * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
                    }

                    const regularStartX = getTimePosition(regularStart, currentTime, containerWidth) + scrollOffset;
                    const regularEndX = getTimePosition(regularEnd, currentTime, containerWidth) + scrollOffset;
                    const regularWidth = regularEndX - regularStartX;

                    if (regularEndX > 0 && regularStartX < containerWidth) {
                      const isActive = isSessionActive(session, currentHourUTC, "regular");
                      const progress = getSessionProgress(session, currentHourUTC, "regular");

                      bars.push(
                        <div
                          key={`${session.id}-regular-${dayOffset}`}
                          className="absolute h-5 rounded-full overflow-hidden"
                          style={{
                            left: Math.max(60, regularStartX),
                            width: Math.min(regularWidth, containerWidth - Math.max(60, regularStartX)),
                            backgroundColor: `${session.color}30`,
                            border: `1px solid ${session.color}50`,
                          }}
                        >
                          {/* Progress fill */}
                          {isActive && (
                            <div
                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: `${session.color}60`,
                              }}
                            />
                          )}
                        </div>
                      );
                    }

                    // Pre-market (US only)
                    if (session.preMarket) {
                      const preStart = new Date(dayStart.getTime() + session.preMarket.start * 60 * 60 * 1000);
                      const preEnd = new Date(dayStart.getTime() + session.preMarket.end * 60 * 60 * 1000);

                      const preStartX = getTimePosition(preStart, currentTime, containerWidth) + scrollOffset;
                      const preEndX = getTimePosition(preEnd, currentTime, containerWidth) + scrollOffset;
                      const preWidth = preEndX - preStartX;

                      if (preEndX > 0 && preStartX < containerWidth) {
                        bars.push(
                          <div
                            key={`${session.id}-pre-${dayOffset}`}
                            className="absolute h-5 rounded-full"
                            style={{
                              left: Math.max(60, preStartX),
                              width: Math.min(preWidth, containerWidth - Math.max(60, preStartX)),
                              backgroundColor: `${session.color}15`,
                              border: `1px dashed ${session.color}30`,
                            }}
                          />
                        );
                      }
                    }

                    // Post-market (US only)
                    if (session.postMarket) {
                      const postStart = new Date(dayStart.getTime() + session.postMarket.start * 60 * 60 * 1000);
                      let postEnd = new Date(dayStart.getTime() + session.postMarket.end * 60 * 60 * 1000);
                      if (session.postMarket.end > 24) {
                        postEnd = new Date(dayStart.getTime() + (session.postMarket.end - 24) * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
                      }

                      const postStartX = getTimePosition(postStart, currentTime, containerWidth) + scrollOffset;
                      const postEndX = getTimePosition(postEnd, currentTime, containerWidth) + scrollOffset;
                      const postWidth = postEndX - postStartX;

                      if (postEndX > 0 && postStartX < containerWidth) {
                        bars.push(
                          <div
                            key={`${session.id}-post-${dayOffset}`}
                            className="absolute h-5 rounded-full"
                            style={{
                              left: Math.max(60, postStartX),
                              width: Math.min(postWidth, containerWidth - Math.max(60, postStartX)),
                              backgroundColor: `${session.color}15`,
                              border: `1px dashed ${session.color}30`,
                            }}
                          />
                        );
                      }
                    }
                  }

                  return bars;
                })()}
              </div>
            );
          })}
        </div>

        {/* Middle - Events Lane */}
        <div className="absolute top-44 left-0 right-0 bottom-32 border-b border-border">
          <div className="absolute left-2 top-1 text-xs text-muted font-medium uppercase tracking-wider">
            Economic Events
          </div>

          {/* Event Cards */}
          {visibleEvents.map((event, index) => {
            const eventTime = new Date(`${event.date}T${event.time || "00:00"}:00`);
            const xPos = getTimePosition(eventTime, currentTime, containerWidth) + scrollOffset;

            if (xPos < -100 || xPos > containerWidth + 100) return null;

            // Stagger vertically based on index to avoid overlap
            const yOffset = 30 + (index % 4) * 80;
            const isPast = eventTime < currentTime;

            return (
              <div
                key={`${event.date}-${event.time}-${event.title}`}
                className="absolute flex flex-col items-center"
                style={{ left: xPos, top: yOffset }}
              >
                {/* Marker line */}
                <div
                  className="w-0.5 h-4"
                  style={{ backgroundColor: IMPACT_COLORS[event.impact] }}
                />

                {/* Event Card */}
                <div
                  className={`w-48 rounded-lg border shadow-lg p-2 transition-all ${
                    isPast ? "opacity-60" : "opacity-100"
                  }`}
                  style={{
                    backgroundColor: `${IMPACT_COLORS[event.impact]}10`,
                    borderColor: `${IMPACT_COLORS[event.impact]}40`,
                  }}
                >
                  {/* Impact dot and time */}
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: IMPACT_COLORS[event.impact] }}
                    />
                    <span className="text-xs text-muted font-mono">
                      {event.time}
                    </span>
                    {isPast && event.actual && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        Released
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="text-sm font-medium text-foreground truncate">
                    {event.title}
                  </div>

                  {/* Values */}
                  {(event.actual || event.forecast || event.previous) && (
                    <div className="mt-1 flex gap-2 text-xs">
                      {event.actual && (
                        <span className="text-emerald-400">
                          Act: {event.actual}
                        </span>
                      )}
                      {event.forecast && (
                        <span className="text-muted">
                          Exp: {event.forecast}
                        </span>
                      )}
                      {event.previous && (
                        <span className="text-muted">
                          Prev: {event.previous}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Lane - Custom Sessions */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-card/30">
          <div className="absolute left-2 top-1 flex items-center gap-3">
            <span className="text-xs text-muted font-medium uppercase tracking-wider">
              Custom Sessions & Alerts
            </span>
            <div className="flex gap-1">
              <button
                onClick={openNewSessionModal}
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-accent/10 hover:bg-accent/20 text-accent-light border border-accent/30 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Session
              </button>
              <button
                onClick={openNewAlertModal}
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-colors"
              >
                <Bell className="w-3 h-3" />
                Alert
              </button>
            </div>
          </div>

          {/* Custom Sessions */}
          {customSessions.map((session) => {
            const today = new Date(currentTime);
            const todayDay = today.getDay();

            // Check if session is active today
            const isActiveToday = !session.recurring || (session.days?.includes(todayDay) ?? false);
            if (!isActiveToday) return null;

            // Calculate session bar position
            const [startHour, startMin] = session.startTime.split(":").map(Number);
            const [endHour, endMin] = session.endTime.split(":").map(Number);

            const sessionStart = new Date(today);
            sessionStart.setHours(startHour, startMin, 0, 0);

            const sessionEnd = new Date(today);
            sessionEnd.setHours(endHour, endMin, 0, 0);

            // Handle sessions that cross midnight
            if (sessionEnd <= sessionStart) {
              sessionEnd.setDate(sessionEnd.getDate() + 1);
            }

            const startX = getTimePosition(sessionStart, currentTime, containerWidth) + scrollOffset;
            const endX = getTimePosition(sessionEnd, currentTime, containerWidth) + scrollOffset;
            const width = endX - startX;

            // Only render if visible
            if (endX < 0 || startX > containerWidth) return null;

            const isActive = currentTime >= sessionStart && currentTime <= sessionEnd;
            const progress = isActive
              ? ((currentTime.getTime() - sessionStart.getTime()) / (sessionEnd.getTime() - sessionStart.getTime())) * 100
              : 0;

            return (
              <div
                key={session.id}
                className="absolute cursor-pointer group"
                style={{
                  left: Math.max(60, startX),
                  top: 24,
                  width: Math.min(width, containerWidth - Math.max(60, startX)),
                }}
                onClick={() => editSession(session)}
              >
                {/* Session bar */}
                <div
                  className="h-8 rounded-lg overflow-hidden transition-all group-hover:ring-2"
                  style={{
                    backgroundColor: `${session.color}25`,
                    border: `1px solid ${session.color}50`,
                    boxShadow: isActive ? `0 0 8px ${session.color}40` : undefined,
                  }}
                >
                  {/* Progress fill */}
                  {isActive && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg transition-all"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: `${session.color}50`,
                      }}
                    />
                  )}
                  {/* Session name */}
                  <div className="absolute inset-0 flex items-center px-2">
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: session.color }}
                    >
                      {session.name}
                    </span>
                  </div>
                </div>
                {/* Time labels */}
                <div className="flex justify-between mt-0.5 px-1">
                  <span className="text-[10px] text-muted">{session.startTime}</span>
                  <span className="text-[10px] text-muted">{session.endTime}</span>
                </div>
              </div>
            );
          })}

          {/* Custom Alerts */}
          {customAlerts.map((alert) => {
            const today = new Date(currentTime);
            const todayDay = today.getDay();

            // Check if alert is active today
            const isActiveToday = !alert.recurring || (alert.days?.includes(todayDay) ?? false);
            if (!isActiveToday) return null;

            // Calculate alert position
            const [alertHour, alertMin] = alert.time.split(":").map(Number);
            const alertTime = new Date(today);
            alertTime.setHours(alertHour, alertMin, 0, 0);

            const xPos = getTimePosition(alertTime, currentTime, containerWidth) + scrollOffset;

            // Only render if visible
            if (xPos < 0 || xPos > containerWidth) return null;

            const isPast = currentTime > alertTime;

            return (
              <div
                key={alert.id}
                className="absolute cursor-pointer"
                style={{ left: xPos, top: 70 }}
                onClick={() => editAlert(alert)}
              >
                {/* Alert marker */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isPast ? "opacity-50" : "animate-pulse"
                    }`}
                    style={{
                      backgroundColor: "#F9731630",
                      border: "2px solid #F97316",
                    }}
                  >
                    <Bell className="w-3 h-3 text-orange-400" />
                  </div>
                  <span className="text-[10px] text-orange-400 mt-0.5 whitespace-nowrap">
                    {alert.name}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {customSessions.length === 0 && customAlerts.length === 0 && (
            <div className="absolute inset-x-0 top-8 bottom-2 flex items-center justify-center">
              <span className="text-xs text-muted">
                Click + Session or + Alert above to add custom markers
              </span>
            </div>
          )}
        </div>

        {/* NOW Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent z-20 pointer-events-none"
          style={{
            left: `${NOW_LINE_POSITION * 100}%`,
            transform: `translateX(${scrollOffset}px)`,
            boxShadow: "0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)",
          }}
        >
          {/* NOW label */}
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-accent text-white text-xs font-bold">
            NOW
          </div>
        </div>
      </div>

      {/* Modal for Custom Session/Alert */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingItem
                  ? `Edit ${modalMode === "session" ? "Session" : "Alert"}`
                  : `New ${modalMode === "session" ? "Session" : "Alert"}`}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-card-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={modalMode === "session" ? "e.g., Morning Routine" : "e.g., Market Open"}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                />
              </div>

              {/* Time inputs */}
              {modalMode === "session" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    Alert Time
                  </label>
                  <input
                    type="time"
                    value={formAlertTime}
                    onChange={(e) => setFormAlertTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                  />
                </div>
              )}

              {/* Color picker (for sessions) */}
              {modalMode === "session" && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormColor(color.value)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          formColor === color.value
                            ? "ring-2 ring-offset-2 ring-offset-card scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{
                          backgroundColor: color.value,
                          ringColor: color.value,
                        }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecurring}
                    onChange={(e) => setFormRecurring(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-accent"
                  />
                  <span className="text-sm font-medium">
                    Repeat on specific days
                  </span>
                </label>
              </div>

              {/* Day selection */}
              {formRecurring && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Repeat on
                  </label>
                  <div className="flex gap-1">
                    {DAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                          formDays.includes(day.value)
                            ? "bg-accent text-white"
                            : "bg-background border border-border text-muted hover:text-foreground"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50">
              {editingItem ? (
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formName.trim()}
                  className="px-4 py-1.5 text-sm font-medium rounded-lg bg-accent hover:bg-accent/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingItem ? "Save Changes" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
