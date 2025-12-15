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
  Filter,
  ChevronDown,
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
  currency?: string;
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

// Market sessions with local trading hours (will be converted to UTC dynamically)
// Verified from official sources: NYSE, LSE, JPX, ASX websites
const MARKET_SESSIONS: MarketSession[] = [
  {
    id: "us",
    name: "New York Stock Exchange",
    shortName: "NYSE",
    color: "#22c55e", // Green
    // Local times in ET: Pre 4:00-9:30, Regular 9:30-16:00, Post 16:00-20:00
    // Source: stockanalysis.com - Pre-market 4:00 AM, After-hours until 8:00 PM
    preMarket: { start: 4, end: 9.5 },
    regular: { start: 9.5, end: 16 },
    postMarket: { start: 16, end: 20 },
    timezone: "America/New_York",
  },
  {
    id: "london",
    name: "London Stock Exchange",
    shortName: "LSE",
    color: "#3B82F6", // Blue
    // Local times in GMT/BST: Pre 5:05-7:50, Regular 8:00-16:30, Post 16:40-17:15
    // Source: xtb.com - Pre-trading 5:05-7:50, Regular 8:00-16:30, Post 16:40-17:15
    preMarket: { start: 5.083, end: 7.833 }, // 5:05 AM - 7:50 AM
    regular: { start: 8, end: 16.5 }, // 8:00 AM - 4:30 PM
    postMarket: { start: 16.667, end: 17.25 }, // 4:40 PM - 5:15 PM
    timezone: "Europe/London",
  },
  {
    id: "tokyo",
    name: "Tokyo Stock Exchange",
    shortName: "TSE",
    color: "#EF4444", // Red
    // Local times in JST: Morning 9:00-11:30, Afternoon 12:30-15:30
    // Source: jpx.co.jp - Morning session 9:00-11:30, Afternoon 12:30-15:30
    // Note: Has lunch break 11:30-12:30, showing as two sessions
    preMarket: { start: 9, end: 11.5 }, // Morning session 9:00 AM - 11:30 AM
    regular: { start: 12.5, end: 15.5 }, // Afternoon session 12:30 PM - 3:30 PM
    timezone: "Asia/Tokyo",
  },
  {
    id: "sydney",
    name: "Australian Securities Exchange",
    shortName: "ASX",
    color: "#EAB308", // Yellow
    // Local times in AEST/AEDT: Pre-open 7:00-10:00, Regular 10:00-16:00, Post 16:10-18:50
    // Source: asx.com.au - Pre-open 7:00, Normal trading ~10:00-16:00, Adjust phase until 18:50
    preMarket: { start: 7, end: 10 }, // Pre-open 7:00 AM - 10:00 AM
    regular: { start: 10, end: 16 }, // Normal trading 10:00 AM - 4:00 PM
    postMarket: { start: 16.167, end: 18.833 }, // Post-close/Adjust 4:10 PM - 6:50 PM
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

// Event categories for filtering
const EVENT_CATEGORIES = [
  { value: "All", label: "All Categories" },
  { value: "central_bank", label: "Central Bank" },
  { value: "employment", label: "Employment" },
  { value: "inflation", label: "Inflation" },
  { value: "growth", label: "Growth" },
  { value: "consumer", label: "Consumer" },
  { value: "housing", label: "Housing" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "trade", label: "Trade" },
];

// Currency options for filtering
const CURRENCY_OPTIONS = ["All", "USD"];

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

// Convert UTC hours to local time string
function utcHoursToLocalTime(utcHours: number): string {
  const now = new Date();
  const utcDate = new Date(now);
  utcDate.setUTCHours(Math.floor(utcHours), (utcHours % 1) * 60, 0, 0);
  return utcDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Get time remaining in session
function getTimeRemaining(session: MarketSession, currentHourUTC: number, type: "pre" | "regular" | "post"): string {
  let timeRange;
  if (type === "pre") timeRange = session.preMarket;
  else if (type === "post") timeRange = session.postMarket;
  else timeRange = session.regular;

  if (!timeRange) return "";

  let end = timeRange.end;
  let current = currentHourUTC;

  // Handle sessions that cross midnight
  if (end > 24) {
    if (current < timeRange.start) current += 24;
  }

  const hoursRemaining = end - current;
  if (hoursRemaining <= 0) return "Closed";

  const hours = Math.floor(hoursRemaining);
  const minutes = Math.round((hoursRemaining % 1) * 60);

  if (hours === 0) return `${minutes}m remaining`;
  if (minutes === 0) return `${hours}h remaining`;
  return `${hours}h ${minutes}m remaining`;
}

// Get time until session opens
function getTimeUntilOpen(session: MarketSession, currentHourUTC: number, type: "pre" | "regular" | "post"): string {
  let timeRange;
  if (type === "pre") timeRange = session.preMarket;
  else if (type === "post") timeRange = session.postMarket;
  else timeRange = session.regular;

  if (!timeRange) return "";

  let start = timeRange.start;
  let current = currentHourUTC;

  // Handle sessions that cross midnight
  if (start < current && timeRange.end > 24) {
    // Session already started (wraps midnight)
    return "";
  }

  let hoursUntil = start - current;
  if (hoursUntil < 0) hoursUntil += 24;

  const hours = Math.floor(hoursUntil);
  const minutes = Math.round((hoursUntil % 1) * 60);

  if (hours === 0) return `Opens in ${minutes}m`;
  if (minutes === 0) return `Opens in ${hours}h`;
  return `Opens in ${hours}h ${minutes}m`;
}

// Get current time in a specific timezone
function getTimeInTimezone(timezone: string): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// Get timezone abbreviation (dynamic based on DST)
function getTimezoneAbbr(timezone: string): string {
  // Map of timezone to common abbreviations
  const tzAbbreviations: Record<string, { standard: string; dst?: string }> = {
    "America/New_York": { standard: "EST", dst: "EDT" },
    "Europe/London": { standard: "GMT", dst: "BST" },
    "Asia/Tokyo": { standard: "JST" }, // Japan doesn't observe DST
    "Australia/Sydney": { standard: "AEST", dst: "AEDT" },
  };

  const mapping = tzAbbreviations[timezone];
  if (mapping) {
    // Check if DST is in effect
    const now = new Date();
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);

    const getOffset = (date: Date) => {
      const str = date.toLocaleString("en-US", { timeZone: timezone, timeZoneName: "longOffset" });
      const match = str.match(/GMT([+-]\d{1,2})/);
      return match ? parseInt(match[1]) : 0;
    };

    const janOffset = getOffset(jan);
    const julOffset = getOffset(jul);
    const nowOffset = getOffset(now);

    // If current offset differs from January, DST is likely in effect (Northern hemisphere)
    // For Southern hemisphere (Sydney), DST is in effect when offset differs from July
    const isDST = timezone === "Australia/Sydney"
      ? nowOffset !== julOffset
      : nowOffset !== janOffset;

    return isDST && mapping.dst ? mapping.dst : mapping.standard;
  }

  // Fallback to browser's abbreviation
  try {
    const formatted = new Date().toLocaleString("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const match = formatted.match(/[A-Z]{2,5}$/);
    return match ? match[0] : timezone.split("/").pop() || timezone;
  } catch {
    return timezone.split("/").pop() || timezone;
  }
}

// Get current hour (as decimal) in a specific timezone
function getCurrentHourInTimezone(timezone: string): number {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + minutes / 60;
}

// Convert a local hour in a timezone to a Date object for positioning on timeline
function getSessionDateTime(
  baseDate: Date,
  localHour: number,
  timezone: string
): Date {
  // Get the current time in the target timezone
  const now = new Date();
  const currentHourInTz = getCurrentHourInTimezone(timezone);

  // Calculate how many hours from now until the target time
  let hoursFromNow = localHour - currentHourInTz;

  // Adjust baseDate offset (baseDate is relative to today in that timezone)
  const tzDateStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const baseDateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(baseDate.getDate()).padStart(2, "0")}`;

  if (baseDateStr < tzDateStr) {
    hoursFromNow -= 24; // Yesterday
  } else if (baseDateStr > tzDateStr) {
    hoursFromNow += 24; // Tomorrow
  }

  return new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
}

// Check if it's a weekend (Saturday or Sunday) in a specific timezone
function isWeekendInTimezone(timezone: string): boolean {
  const now = new Date();
  // Get day of week: 0 = Sunday, 6 = Saturday
  const dayNum = new Date(now.toLocaleString("en-US", { timeZone: timezone })).getDay();
  return dayNum === 0 || dayNum === 6;
}

// Check if a session is currently active
function isSessionActiveNow(
  session: MarketSession,
  currentTime: Date,
  type: "pre" | "regular" | "post"
): boolean {
  // Markets are closed on weekends
  if (isWeekendInTimezone(session.timezone)) {
    return false;
  }

  let timeRange;
  if (type === "pre") timeRange = session.preMarket;
  else if (type === "post") timeRange = session.postMarket;
  else timeRange = session.regular;

  if (!timeRange) return false;

  // Get current hour in the session's timezone
  const currentHour = getCurrentHourInTimezone(session.timezone);

  return currentHour >= timeRange.start && currentHour < timeRange.end;
}

// Get session progress percentage
function getSessionProgressNow(
  session: MarketSession,
  currentTime: Date,
  type: "pre" | "regular" | "post"
): number {
  let timeRange;
  if (type === "pre") timeRange = session.preMarket;
  else if (type === "post") timeRange = session.postMarket;
  else timeRange = session.regular;

  if (!timeRange) return 0;

  // Get current hour in the session's timezone
  const currentHour = getCurrentHourInTimezone(session.timezone);

  if (currentHour < timeRange.start) return 0;
  if (currentHour >= timeRange.end) return 100;

  const total = timeRange.end - timeRange.start;
  const elapsed = currentHour - timeRange.start;

  return (elapsed / total) * 100;
}

// Format local time for display (e.g., "9:30 AM")
function formatLocalHour(hour: number): string {
  const hours = Math.floor(hour);
  const minutes = Math.round((hour % 1) * 60);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Get time remaining in session
function getTimeRemainingNow(
  session: MarketSession,
  currentTime: Date,
  type: "pre" | "regular" | "post"
): string {
  let timeRange;
  if (type === "pre") timeRange = session.preMarket;
  else if (type === "post") timeRange = session.postMarket;
  else timeRange = session.regular;

  if (!timeRange) return "";

  const tzDateStr = currentTime.toLocaleDateString("en-CA", { timeZone: session.timezone });
  const [year, month, day] = tzDateStr.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);

  const sessionEnd = getSessionDateTime(baseDate, timeRange.end, session.timezone);
  const remaining = sessionEnd.getTime() - currentTime.getTime();

  if (remaining <= 0) return "Closed";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) return `${minutes}m left`;
  if (minutes === 0) return `${hours}h left`;
  return `${hours}h ${minutes}m left`;
}

// Get day of week in a timezone (0 = Sunday, 6 = Saturday)
function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  return new Date(date.toLocaleString("en-US", { timeZone: timezone })).getDay();
}

// Get time until session opens
function getTimeUntilOpenNow(
  session: MarketSession,
  currentTime: Date
): string {
  const timeRange = session.regular;

  const tzDateStr = currentTime.toLocaleDateString("en-CA", { timeZone: session.timezone });
  const [year, month, day] = tzDateStr.split("-").map(Number);
  let baseDate = new Date(year, month - 1, day);

  let sessionStart = getSessionDateTime(baseDate, timeRange.start, session.timezone);

  // If session already passed today, look at tomorrow
  const sessionEnd = getSessionDateTime(baseDate, timeRange.end, session.timezone);
  if (currentTime >= sessionEnd) {
    baseDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    sessionStart = getSessionDateTime(baseDate, timeRange.start, session.timezone);
  }

  // Skip weekends - find the next trading day (max 7 iterations for safety)
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = getDayOfWeekInTimezone(sessionStart, session.timezone);
    if (dayOfWeek !== 0 && dayOfWeek !== 6) break; // Not a weekend
    baseDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    sessionStart = getSessionDateTime(baseDate, timeRange.start, session.timezone);
  }

  const until = sessionStart.getTime() - currentTime.getTime();

  if (until <= 0) return "Open";

  const hours = Math.floor(until / (1000 * 60 * 60));
  const minutes = Math.floor((until % (1000 * 60 * 60)) / (1000 * 60));

  // Show days if more than 24 hours
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `Opens in ${days}d`;
    return `Opens in ${days}d ${remainingHours}h`;
  }

  if (hours === 0) return `Opens in ${minutes}m`;
  if (minutes === 0) return `Opens in ${hours}h`;
  return `Opens in ${hours}h ${minutes}m`;
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

// Time picker helpers
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ... 55

function parse24hTo12h(time24: string): { hour: number; minute: number; period: "AM" | "PM" } {
  const [h, m] = time24.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, period };
}

function format12hTo24h(hour: number, minute: number, period: "AM" | "PM"): string {
  let h = hour;
  if (period === "AM" && hour === 12) h = 0;
  else if (period === "PM" && hour !== 12) h = hour + 12;
  return `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// Parse time string to 24h format
function parseTimeInput(input: string): string | null {
  const cleaned = input.trim().toLowerCase();
  if (!cleaned) return null;

  // Try various formats
  // Format: "9:30 am", "9:30am", "09:30 AM"
  const match12h = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm|a|p)?$/);
  if (match12h) {
    let hour = parseInt(match12h[1], 10);
    const minute = match12h[2] ? parseInt(match12h[2], 10) : 0;
    const period = match12h[3];

    if (minute > 59) return null;

    // If period specified, convert to 24h
    if (period) {
      if (hour > 12 || hour < 1) return null;
      if ((period === "pm" || period === "p") && hour !== 12) hour += 12;
      if ((period === "am" || period === "a") && hour === 12) hour = 0;
    } else {
      // No period - assume 24h format or make smart guess
      if (hour > 23) return null;
    }

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  // Format: "930", "0930", "1430"
  const matchCompact = cleaned.match(/^(\d{3,4})\s*(am|pm|a|p)?$/);
  if (matchCompact) {
    const num = matchCompact[1];
    const period = matchCompact[2];
    let hour = parseInt(num.length === 3 ? num[0] : num.slice(0, 2), 10);
    const minute = parseInt(num.length === 3 ? num.slice(1) : num.slice(2), 10);

    if (minute > 59) return null;

    if (period) {
      if (hour > 12 || hour < 1) return null;
      if ((period === "pm" || period === "p") && hour !== 12) hour += 12;
      if ((period === "am" || period === "a") && hour === 12) hour = 0;
    } else if (hour > 23) {
      return null;
    }

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  return null;
}

// Format 24h time to display string
function formatTimeDisplay(time24: string): string {
  const parsed = parse24hTo12h(time24);
  return `${parsed.hour}:${parsed.minute.toString().padStart(2, "0")} ${parsed.period}`;
}

// Custom TimePicker Component - Simple Text Input
function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [inputValue, setInputValue] = useState(formatTimeDisplay(value || "12:00"));
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Update display when value prop changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatTimeDisplay(value || "12:00"));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse and update parent
    const parsed = parseTimeInput(newValue);
    if (parsed) {
      setIsValid(true);
      onChange(parsed);
    } else {
      setIsValid(newValue === "" || newValue.length < 3);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // On blur, format the display nicely if valid
    const parsed = parseTimeInput(inputValue);
    if (parsed) {
      setInputValue(formatTimeDisplay(parsed));
      setIsValid(true);
    } else {
      // Reset to last valid value
      setInputValue(formatTimeDisplay(value || "12:00"));
      setIsValid(true);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-muted mb-2">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder="9:30 AM"
          className={`w-full px-3 py-2.5 rounded-lg bg-background border text-sm font-medium focus:ring-1 outline-none transition-colors ${
            isValid
              ? "border-border focus:border-accent focus:ring-accent"
              : "border-red-500 focus:border-red-500 focus:ring-red-500"
          }`}
        />
        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      </div>
      <p className="text-[10px] text-muted mt-1">e.g. 9:30 AM, 2:00 PM, 14:30</p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DashboardPage() {
  // State
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
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

  // Tooltip state for market sessions
  const [hoveredSession, setHoveredSession] = useState<{
    session: MarketSession;
    type: "pre" | "regular" | "post" | "card";
    x: number;
    y: number;
  } | null>(null);

  // Expanded card state
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Economic Events Filter State
  const [eventsFilterExpanded, setEventsFilterExpanded] = useState(false);
  const [filterImpacts, setFilterImpacts] = useState<Set<string>>(new Set(["high", "medium", "low"]));
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterCurrency, setFilterCurrency] = useState("All");
  const [showPastEvents, setShowPastEvents] = useState(true);

  // Custom Sessions & Alerts Card State
  const [customCardExpanded, setCustomCardExpanded] = useState(false);

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
  const lastTimeRef = useRef<number>(0);

  // Initialize on client only to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date());
    lastTimeRef.current = Date.now();
    setIsMounted(true);
  }, []);

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

  // Real-time clock update - use setInterval instead of requestAnimationFrame
  // to avoid 60fps re-renders which cause slow page transitions
  useEffect(() => {
    if (!isMounted) return;

    // Update immediately
    setCurrentTime(new Date());

    // Then update every second
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isMounted]);

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

  // Check if timeline is live (no offset)
  const isLive = scrollOffset === 0;

  // Loading state - render placeholder until client-side hydration
  if (!isMounted || !currentTime) {
    return (
      <div className="h-full flex flex-col select-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Timeline</h1>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted/20 text-muted border border-muted/30">
              Loading...
            </span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-mono font-bold tracking-wider text-muted">
              --:--:-- --
            </div>
            <div className="text-xs text-muted">
              Loading...
            </div>
          </div>
          <div className="w-24" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted">Initializing timeline...</div>
        </div>
      </div>
    );
  }

  // Calculate visible time range
  const containerWidth = containerRef.current?.clientWidth || 1200;
  const visibleStartTime = new Date(currentTime.getTime() - HOURS_IN_PAST * 60 * 60 * 1000);
  const visibleEndTime = new Date(currentTime.getTime() + HOURS_IN_FUTURE * 60 * 60 * 1000);

  // Get current hour in UTC for session calculations
  const currentHourUTC = currentTime.getUTCHours() + currentTime.getUTCMinutes() / 60;

  // Filter events by visibility and user-selected filters
  const filteredVisibleEvents = events.filter((event) => {
    const eventDateTime = new Date(`${event.date}T${event.time || "00:00"}:00`);

    // Time window check
    if (eventDateTime < visibleStartTime || eventDateTime > visibleEndTime) {
      return false;
    }

    // Impact filter
    if (!filterImpacts.has(event.impact)) {
      return false;
    }

    // Category filter
    if (filterCategory !== "All" && event.category !== filterCategory) {
      return false;
    }

    // Currency filter
    if (filterCurrency !== "All" && event.currency !== filterCurrency) {
      return false;
    }

    // Past events filter
    if (!showPastEvents && eventDateTime < currentTime) {
      return false;
    }

    return true;
  });

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
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing border-2 border-border/50 rounded-lg m-2"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Vertical Gridlines - extending through entire timeline */}
        <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none overflow-hidden">
          {/* Hour gridlines */}
          {Array.from({ length: TOTAL_HOURS * 2 + 2 }).map((_, i) => {
            const minuteOffset = (i - HOURS_IN_PAST * 2) * 30; // Every 30 minutes
            const lineTime = new Date(currentTime.getTime() + minuteOffset * 60 * 1000);
            const xPos = getTimePosition(lineTime, currentTime, containerWidth) + scrollOffset;
            const isHourLine = minuteOffset % 60 === 0;

            if (xPos < 0 || xPos > containerWidth) return null;

            return (
              <div
                key={`grid-${i}`}
                className="absolute top-8 bottom-0"
                style={{
                  left: xPos,
                  width: isHourLine ? 1 : 1,
                  backgroundColor: isHourLine ? "rgba(51, 65, 85, 0.5)" : "rgba(51, 65, 85, 0.25)",
                }}
              />
            );
          })}
        </div>

        {/* Sidebar Header Label */}
        <div className="absolute top-0 left-0 w-60 h-10 border-b border-r border-border bg-card/80 backdrop-blur-sm flex items-center justify-center z-10">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Market Overview</span>
        </div>

        {/* Time Scale / Ruler - starts after sidebar */}
        <div className="absolute top-0 left-60 right-0 h-10 border-b border-border bg-card/80 backdrop-blur-sm flex items-end z-10">
          {(() => {
            const timelineWidth = containerWidth - 240; // Subtract sidebar width
            const markers: React.ReactNode[] = [];

            // Start from HOURS_IN_PAST hours ago, snapped to the hour
            const startTime = new Date(currentTime);
            startTime.setMinutes(0, 0, 0);
            startTime.setHours(startTime.getHours() - HOURS_IN_PAST);

            // Generate markers for each 30-minute increment
            for (let i = 0; i <= TOTAL_HOURS * 2; i++) {
              const markerTime = new Date(startTime.getTime() + i * 30 * 60 * 1000);
              const xPos = getTimePosition(markerTime, currentTime, timelineWidth) + scrollOffset;
              const isHourLine = markerTime.getMinutes() === 0;

              if (xPos < -50 || xPos > timelineWidth + 50) continue;

              markers.push(
                <div
                  key={markerTime.getTime()}
                  className="absolute flex flex-col items-center"
                  style={{ left: xPos, transform: "translateX(-50%)" }}
                >
                  {isHourLine ? (
                    <>
                      <span className="text-xs text-foreground font-mono font-medium mb-0.5">
                        {markerTime.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}
                      </span>
                      <div className="w-0.5 h-3 bg-border rounded-full" />
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-muted font-mono">
                        {markerTime.getHours() % 12 || 12}:30 {markerTime.getHours() >= 12 ? "PM" : "AM"}
                      </span>
                      <div className="w-px h-2 bg-border/50" />
                    </>
                  )}
                </div>
              );
            }
            return markers;
          })()}
        </div>

        {/* Unified Left Sidebar - Below Time Scale */}
        <div className="absolute top-10 left-0 bottom-0 w-60 bg-card/20 border-r border-border/30 flex flex-col p-1.5 gap-1 overflow-hidden">
          {/* All cards in single flex container - each gets equal space */}
          {MARKET_SESSIONS.map((session) => {
              const isPreActive = isSessionActiveNow(session, currentTime, "pre");
              const isRegularActive = isSessionActiveNow(session, currentTime, "regular");
              const isPostActive = isSessionActiveNow(session, currentTime, "post");
              const isAnyActive = isPreActive || isRegularActive || isPostActive;
              const isExpanded = expandedCard === session.id;

              // Determine current session type and get progress
              const currentSessionType = isRegularActive ? "regular" : isPreActive ? "pre" : isPostActive ? "post" : null;
              const progress = currentSessionType ? getSessionProgressNow(session, currentTime, currentSessionType) : 0;

              return (
                <div
                  key={`info-${session.id}`}
                  className={`rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${isExpanded ? 'relative z-50' : ''}`}
                  style={{
                    flex: '1 1 0',
                    minHeight: 0,
                    background: isAnyActive
                      ? `linear-gradient(180deg, ${session.color}30 0%, ${session.color}15 100%)`
                      : `linear-gradient(180deg, ${session.color}20 0%, ${session.color}10 100%)`,
                    border: `2px solid ${session.color}${isAnyActive ? "60" : "35"}`,
                    boxShadow: isExpanded
                      ? `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${session.color}40`
                      : isAnyActive
                        ? `0 8px 32px ${session.color}35, 0 0 0 1px ${session.color}20, inset 0 2px 0 ${session.color}20`
                        : `0 2px 8px ${session.color}15, inset 0 1px 0 ${session.color}15`,
                  }}
                  onClick={() => setExpandedCard(isExpanded ? null : session.id)}
                >
                  {/* Header row */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: session.color }}>
                        {session.shortName}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: isExpanded ? "rgba(255,255,255,0.2)" : (isAnyActive ? `${session.color}30` : `${session.color}20`),
                          color: isExpanded ? "#ffffff" : (isAnyActive ? session.color : `${session.color}80`),
                        }}
                      >
                        {isRegularActive ? "OPEN" : isPreActive ? "PRE" : isPostActive ? "POST" : "CLOSED"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-mono font-bold" style={{ color: session.color }}>
                        {getTimeInTimezone(session.timezone).replace(/:(\d{2}):\d{2}/, ":$1")}
                      </span>
                      <span className="text-[9px]" style={{ color: isExpanded ? "rgba(255,255,255,0.7)" : undefined }}>{getTimezoneAbbr(session.timezone)}</span>
                      <svg
                        className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        style={{ color: isExpanded ? "rgba(255,255,255,0.6)" : `${session.color}60` }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress/countdown row - compact view */}
                  {!isExpanded && (
                    <div className="px-3 pb-2">
                      {isAnyActive ? (
                        <>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span style={{ color: `${session.color}90` }}>
                              {isRegularActive ? "Regular" : isPreActive ? "Pre-Market" : "Post-Market"}
                            </span>
                            <span className="font-mono" style={{ color: session.color }}>
                              {Math.round(progress)}% · {currentSessionType ? getTimeRemainingNow(session, currentTime, currentSessionType) : ""}
                            </span>
                          </div>
                          <div
                            className="h-[3px] rounded-full overflow-hidden"
                            style={{ backgroundColor: `${session.color}25` }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${progress}%`, backgroundColor: session.color }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px]" style={{ color: `${session.color}80` }}>
                          {getTimeUntilOpenNow(session, currentTime)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="px-3 pb-2">
                      <div className="space-y-1 text-[10px]">
                        {session.preMarket && (
                          <div className="flex justify-between">
                            <span style={{ color: isPreActive ? "#ffffff" : "rgba(255,255,255,0.6)" }}>
                              {session.id === "tokyo" ? "Morning" : session.id === "sydney" ? "Pre-Open" : "Pre-Market"}
                            </span>
                            <span className="font-mono" style={{ color: isPreActive ? "#ffffff" : "rgba(255,255,255,0.6)" }}>
                              {formatLocalHour(session.preMarket.start)} - {formatLocalHour(session.preMarket.end)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span style={{ color: isRegularActive ? "#ffffff" : "rgba(255,255,255,0.6)" }}>
                            {session.id === "tokyo" ? "Afternoon" : "Regular"}
                          </span>
                          <span className="font-mono" style={{ color: isRegularActive ? "#ffffff" : "rgba(255,255,255,0.6)" }}>
                            {formatLocalHour(session.regular.start)} - {formatLocalHour(session.regular.end)}
                          </span>
                        </div>
                        {session.postMarket && (
                          <div className="flex justify-between">
                            <span style={{ color: isPostActive ? "#ffffff" : "rgba(255,255,255,0.6)" }}>
                              Post-Market
                            </span>
                            <span className="font-mono" style={{ color: isPostActive ? "#ffffff" : "rgba(255,255,255,0.6)" }}>
                              {formatLocalHour(session.postMarket.start)} - {formatLocalHour(session.postMarket.end)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                        {isAnyActive ? (
                          <>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span style={{ color: session.color }}>
                                {isRegularActive
                                  ? getTimeRemainingNow(session, currentTime, "regular")
                                  : isPreActive
                                  ? getTimeRemainingNow(session, currentTime, "pre")
                                  : getTimeRemainingNow(session, currentTime, "post")}
                              </span>
                              <span className="font-mono font-bold" style={{ color: session.color }}>
                                {Math.round(progress)}%
                              </span>
                            </div>
                            <div
                              className="h-[3px] rounded-full overflow-hidden"
                              style={{ backgroundColor: `${session.color}25` }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%`, backgroundColor: session.color }}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                            {getTimeUntilOpenNow(session, currentTime)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Economic Events Filter Card */}
          <div
            className={`rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${eventsFilterExpanded ? 'relative z-50' : ''}`}
            style={{
              flex: '1 1 0',
              minHeight: 0,
              background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.35)',
              boxShadow: eventsFilterExpanded
                  ? '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(239, 68, 68, 0.4)'
                  : '0 2px 8px rgba(239, 68, 68, 0.15)',
              }}
              onClick={() => setEventsFilterExpanded(!eventsFilterExpanded)}
            >
              {/* Header */}
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-red-400">Filters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted">
                    {filteredVisibleEvents.length} events
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform text-red-400/60 ${eventsFilterExpanded ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Quick filter summary when collapsed */}
              {!eventsFilterExpanded && (
                <div className="px-3 pb-2">
                  <div className="flex gap-1.5 items-center">
                    {filterImpacts.has("high") && <span className="w-2 h-2 rounded-full bg-red-500" title="High" />}
                    {filterImpacts.has("medium") && <span className="w-2 h-2 rounded-full bg-yellow-500" title="Medium" />}
                    {filterImpacts.has("low") && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Low" />}
                    {filterCategory !== "All" && (
                      <span className="text-[9px] text-muted ml-1">{filterCategory}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded filter controls */}
              {eventsFilterExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Impact Level Multi-select */}
                  <div>
                    <label className="block text-[10px] text-white/70 mb-1.5">Impact Level</label>
                    <div className="flex gap-1">
                      {(["high", "medium", "low"] as const).map((impact) => {
                        const isSelected = filterImpacts.has(impact);
                        const colors = { high: "#EF4444", medium: "#F59E0B", low: "#10B981" };
                        return (
                          <button
                            key={impact}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newSet = new Set(filterImpacts);
                              if (isSelected) newSet.delete(impact);
                              else newSet.add(impact);
                              setFilterImpacts(newSet);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded border transition-colors ${
                              isSelected
                                ? "bg-white/10 border-white/30"
                                : "bg-transparent border-white/10 opacity-40"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[impact] }} />
                            {impact.charAt(0).toUpperCase() + impact.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category Dropdown */}
                  <div>
                    <label className="block text-[10px] text-white/70 mb-1.5">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => { e.stopPropagation(); setFilterCategory(e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1.5 text-[11px] bg-black/30 border border-white/20 rounded text-white appearance-none cursor-pointer"
                    >
                      {EVENT_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value} className="bg-gray-900">{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Currency Dropdown */}
                  <div>
                    <label className="block text-[10px] text-white/70 mb-1.5">Currency</label>
                    <select
                      value={filterCurrency}
                      onChange={(e) => { e.stopPropagation(); setFilterCurrency(e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1.5 text-[11px] bg-black/30 border border-white/20 rounded text-white appearance-none cursor-pointer"
                    >
                      {CURRENCY_OPTIONS.map(curr => (
                        <option key={curr} value={curr} className="bg-gray-900">{curr}</option>
                      ))}
                    </select>
                  </div>

                  {/* Show Past Events Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowPastEvents(!showPastEvents); }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded border transition-colors ${
                      showPastEvents ? "bg-white/10 border-white/30" : "bg-transparent border-white/10"
                    }`}
                  >
                    <span className="text-[10px] text-white/80">Show Past Events</span>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${showPastEvents ? "bg-red-400" : "bg-gray-600"}`}>
                      <div className={`w-3 h-3 rounded-full bg-white shadow absolute top-0.5 transition-all ${showPastEvents ? "left-[18px]" : "left-0.5"}`} />
                    </div>
                  </button>

                  {/* Reset Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterImpacts(new Set(["high", "medium", "low"]));
                      setFilterCategory("All");
                      setFilterCurrency("All");
                      setShowPastEvents(true);
                    }}
                    className="w-full text-[10px] text-red-400 hover:text-red-300 py-1 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
          </div>

          {/* Custom Sessions & Alerts Card */}
          <div
            className={`rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${customCardExpanded ? 'relative z-50' : ''}`}
            style={{
              flex: '1 1 0',
              minHeight: 0,
              background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
              border: '2px solid rgba(59, 130, 246, 0.35)',
              boxShadow: customCardExpanded
                  ? '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(59, 130, 246, 0.4)'
                  : '0 2px 8px rgba(59, 130, 246, 0.15)',
              }}
              onClick={() => setCustomCardExpanded(!customCardExpanded)}
            >
              {/* Header */}
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">Custom</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted">
                    {customSessions.length + customAlerts.length} items
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform text-blue-400/60 ${customCardExpanded ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Action buttons - always visible */}
              <div className="px-3 pb-2 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); openNewSessionModal(); }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Session
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openNewAlertModal(); }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 transition-colors"
                >
                  <Bell className="w-3 h-3" />
                  Alert
                </button>
              </div>

              {/* Expanded list of custom items */}
              {customCardExpanded && (
                <div className="px-3 pb-3 space-y-2 max-h-[200px] overflow-y-auto">
                  {/* Sessions list */}
                  {customSessions.length > 0 && (
                    <div>
                      <label className="block text-[10px] text-white/70 mb-1.5">Sessions</label>
                      <div className="space-y-1">
                        {customSessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={(e) => { e.stopPropagation(); editSession(session); }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded border border-white/10 hover:bg-white/10 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: session.color }} />
                              <span className="text-[11px] text-white/90 truncate max-w-[100px]">{session.name}</span>
                            </div>
                            <span className="text-[9px] text-white/50 font-mono">{session.startTime}-{session.endTime}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alerts list */}
                  {customAlerts.length > 0 && (
                    <div>
                      <label className="block text-[10px] text-white/70 mb-1.5">Alerts</label>
                      <div className="space-y-1">
                        {customAlerts.map((alert) => (
                          <button
                            key={alert.id}
                            onClick={(e) => { e.stopPropagation(); editAlert(alert); }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded border border-orange-500/20 hover:bg-orange-500/10 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Bell className="w-3 h-3 text-orange-400" />
                              <span className="text-[11px] text-white/90 truncate max-w-[100px]">{alert.name}</span>
                            </div>
                            <span className="text-[9px] text-orange-400/70 font-mono">{alert.time}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state in expanded view */}
                  {customSessions.length === 0 && customAlerts.length === 0 && (
                    <div className="text-center py-3">
                      <span className="text-[10px] text-white/50">No custom items yet</span>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* Unified Right Timeline Area - Below Time Scale */}
        <div className="absolute top-10 left-60 right-0 bottom-0 flex flex-col">
          {/* Each market session gets its own lane */}
          {MARKET_SESSIONS.map((session) => {
            const isPreActive = isSessionActiveNow(session, currentTime, "pre");
            const isRegularActive = isSessionActiveNow(session, currentTime, "regular");
            const isPostActive = isSessionActiveNow(session, currentTime, "post");

            return (
              <div
                key={session.id}
                className="flex-1 relative min-h-0 border-b border-border/20"
              >

                {/* Session Bars - render for visible time range */}
                {(() => {
                  const elements: React.ReactNode[] = [];
                  const timelineWidth = containerWidth - 240; // Timeline area width (minus sidebar)

                  // Check if today is a weekend in this market's timezone
                  const todayIsWeekend = isWeekendInTimezone(session.timezone);

                  // Show "WEEKEND CLOSED" indicator if today is Saturday or Sunday
                  if (todayIsWeekend) {
                    return (
                      <div
                        key={`${session.id}-weekend-closed`}
                        className="absolute rounded flex items-center justify-center"
                        style={{
                          left: 16,
                          right: 16,
                          height: "calc(100% - 8px)",
                          top: 4,
                          background: `linear-gradient(90deg, ${session.color}08 0%, transparent 50%, ${session.color}08 100%)`,
                          borderTop: `1px dashed ${session.color}20`,
                          borderBottom: `1px dashed ${session.color}20`,
                        }}
                      >
                        <span
                          className="text-[10px] font-medium tracking-widest uppercase"
                          style={{ color: `${session.color}60` }}
                        >
                          Weekend
                        </span>
                      </div>
                    );
                  }

                  // Get the date in the session's timezone for today, yesterday, and tomorrow
                  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
                    const tzDateStr = currentTime.toLocaleDateString("en-CA", { timeZone: session.timezone });
                    const [year, month, day] = tzDateStr.split("-").map(Number);
                    const baseDate = new Date(year, month - 1, day + dayOffset);

                    // Skip weekend days
                    const dayOfWeek = getDayOfWeekInTimezone(baseDate, session.timezone);
                    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

                    // Pre-market (US only)
                    if (session.preMarket) {
                      const preStart = getSessionDateTime(baseDate, session.preMarket.start, session.timezone);
                      const preEnd = getSessionDateTime(baseDate, session.preMarket.end, session.timezone);

                      const preStartX = getTimePosition(preStart, currentTime, timelineWidth) + scrollOffset;
                      const preEndX = getTimePosition(preEnd, currentTime, timelineWidth) + scrollOffset;

                      // Clip to visible area
                      const clippedStartX = Math.max(0, preStartX);
                      const clippedEndX = Math.min(timelineWidth, preEndX);
                      const clippedWidth = clippedEndX - clippedStartX;

                      if (clippedWidth > 20) {
                        const barIsActive = isPreActive && dayOffset === 0;
                        const preProgress = barIsActive ? getSessionProgressNow(session, currentTime, "pre") : 0;
                        elements.push(
                          <div
                            key={`${session.id}-pre-${dayOffset}`}
                            className="absolute rounded cursor-pointer transition-all duration-300 hover:brightness-110 hover:z-10 overflow-hidden"
                            style={{
                              left: clippedStartX,
                              width: clippedWidth,
                              height: "calc(100% - 12px)",
                              top: 6,
                              background: barIsActive
                                ? `linear-gradient(90deg, ${session.color}20 0%, ${session.color}12 100%)`
                                : `linear-gradient(90deg, ${session.color}10 0%, ${session.color}06 100%)`,
                              border: `1px dashed ${session.color}${barIsActive ? "50" : "25"}`,
                            }}
                            onMouseEnter={(e) => setHoveredSession({ session, type: "pre", x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHoveredSession(null)}
                            onMouseMove={(e) => setHoveredSession({ session, type: "pre", x: e.clientX, y: e.clientY })}
                          >
                            {/* Progress fill */}
                            {barIsActive && (
                              <div
                                className="absolute inset-y-0 left-0 transition-all duration-500"
                                style={{
                                  width: `${preProgress}%`,
                                  background: `${session.color}25`,
                                }}
                              />
                            )}
                            {/* Content - centered */}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 px-2">
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wide"
                                style={{ color: `${session.color}${barIsActive ? "" : "90"}` }}
                              >
                                {session.id === "tokyo" ? "AM" : session.id === "sydney" ? "PRE" : "PRE"}
                              </span>
                              {barIsActive && clippedWidth > 60 && (
                                <span className="text-[10px] font-mono" style={{ color: session.color }}>
                                  {Math.round(preProgress)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }

                    // Regular session
                    const regularStart = getSessionDateTime(baseDate, session.regular.start, session.timezone);
                    const regularEnd = getSessionDateTime(baseDate, session.regular.end, session.timezone);

                    const regularStartX = getTimePosition(regularStart, currentTime, timelineWidth) + scrollOffset;
                    const regularEndX = getTimePosition(regularEnd, currentTime, timelineWidth) + scrollOffset;

                    // Clip to visible area
                    const clippedStartX = Math.max(0, regularStartX);
                    const clippedEndX = Math.min(timelineWidth, regularEndX);
                    const clippedWidth = clippedEndX - clippedStartX;

                    if (clippedWidth > 20) {
                      const barIsActive = isRegularActive && dayOffset === 0;
                      const barProgress = barIsActive ? getSessionProgressNow(session, currentTime, "regular") : 0;
                      const activeColor = session.color;

                      elements.push(
                        <div
                          key={`${session.id}-regular-${dayOffset}`}
                          className="absolute rounded-lg cursor-pointer transition-all duration-300 hover:brightness-110 hover:z-10 overflow-hidden"
                          style={{
                            left: clippedStartX,
                            width: clippedWidth,
                            height: "calc(100% - 8px)",
                            top: 4,
                            background: barIsActive
                              ? `linear-gradient(135deg, ${activeColor}35 0%, ${activeColor}20 50%, ${activeColor}30 100%)`
                              : `linear-gradient(135deg, ${session.color}18 0%, ${session.color}12 100%)`,
                            border: `1px solid ${barIsActive ? activeColor : session.color}${barIsActive ? "70" : "30"}`,
                            boxShadow: barIsActive
                              ? `0 0 20px ${activeColor}40, inset 0 1px 0 ${activeColor}30`
                              : `inset 0 1px 0 ${session.color}15`,
                          }}
                          onMouseEnter={(e) => setHoveredSession({ session, type: "regular", x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredSession(null)}
                          onMouseMove={(e) => setHoveredSession({ session, type: "regular", x: e.clientX, y: e.clientY })}
                        >
                          {/* Shimmer effect for active sessions */}
                          {barIsActive && (
                            <div
                              className="absolute inset-0 overflow-hidden"
                              style={{
                                background: `linear-gradient(90deg, transparent 0%, ${activeColor}15 50%, transparent 100%)`,
                                animation: "shimmer 2s ease-in-out infinite",
                              }}
                            />
                          )}
                          {/* Progress fill with glow */}
                          {barIsActive && (
                            <div
                              className="absolute inset-y-0 left-0 transition-all duration-500"
                              style={{
                                width: `${barProgress}%`,
                                background: `linear-gradient(90deg, ${activeColor}50 0%, ${activeColor}35 100%)`,
                              }}
                            >
                              {/* Glowing edge */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-0.5"
                                style={{
                                  background: activeColor,
                                  boxShadow: `0 0 8px ${activeColor}, 0 0 16px ${activeColor}`,
                                }}
                              />
                            </div>
                          )}
                          {/* Left accent bar */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                            style={{
                              backgroundColor: barIsActive ? activeColor : session.color,
                              boxShadow: barIsActive ? `0 0 8px ${activeColor}` : 'none',
                            }}
                          />
                          {/* Content - centered */}
                          <div className="absolute inset-0 flex items-center justify-center gap-3 px-3">
                            {/* Pulsing dot for active */}
                            {barIsActive && (
                              <div className="relative">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: activeColor }}
                                />
                                <div
                                  className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                                  style={{ backgroundColor: activeColor, opacity: 0.5 }}
                                />
                              </div>
                            )}
                            {/* Session name */}
                            <span
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{
                                color: barIsActive ? activeColor : session.color,
                                textShadow: barIsActive ? `0 0 10px ${activeColor}50` : 'none',
                              }}
                            >
                              {session.shortName}
                            </span>
                            {/* Progress percentage */}
                            {barIsActive && clippedWidth > 100 && (
                              <span
                                className="text-xs font-mono font-bold"
                                style={{ color: activeColor }}
                              >
                                {Math.round(barProgress)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Post-market (US only)
                    if (session.postMarket) {
                      const postStart = getSessionDateTime(baseDate, session.postMarket.start, session.timezone);
                      const postEnd = getSessionDateTime(baseDate, session.postMarket.end, session.timezone);

                      const postStartX = getTimePosition(postStart, currentTime, timelineWidth) + scrollOffset;
                      const postEndX = getTimePosition(postEnd, currentTime, timelineWidth) + scrollOffset;

                      const clippedStartX = Math.max(0, postStartX);
                      const clippedEndX = Math.min(timelineWidth, postEndX);
                      const clippedWidth = clippedEndX - clippedStartX;

                      if (clippedWidth > 20) {
                        const barIsActive = isPostActive && dayOffset === 0;
                        const postProgress = barIsActive ? getSessionProgressNow(session, currentTime, "post") : 0;
                        elements.push(
                          <div
                            key={`${session.id}-post-${dayOffset}`}
                            className="absolute rounded cursor-pointer transition-all duration-300 hover:brightness-110 hover:z-10 overflow-hidden"
                            style={{
                              left: clippedStartX,
                              width: clippedWidth,
                              height: "calc(100% - 12px)",
                              top: 6,
                              background: barIsActive
                                ? `linear-gradient(90deg, ${session.color}20 0%, ${session.color}12 100%)`
                                : `linear-gradient(90deg, ${session.color}10 0%, ${session.color}06 100%)`,
                              border: `1px dashed ${session.color}${barIsActive ? "50" : "25"}`,
                            }}
                            onMouseEnter={(e) => setHoveredSession({ session, type: "post", x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHoveredSession(null)}
                            onMouseMove={(e) => setHoveredSession({ session, type: "post", x: e.clientX, y: e.clientY })}
                          >
                            {/* Progress fill */}
                            {barIsActive && (
                              <div
                                className="absolute inset-y-0 left-0 transition-all duration-500"
                                style={{
                                  width: `${postProgress}%`,
                                  background: `${session.color}25`,
                                }}
                              />
                            )}
                            {/* Content - centered */}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 px-2">
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wide"
                                style={{ color: `${session.color}${barIsActive ? "" : "90"}` }}
                              >
                                POST
                              </span>
                              {barIsActive && clippedWidth > 60 && (
                                <span className="text-[10px] font-mono" style={{ color: session.color }}>
                                  {Math.round(postProgress)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }
                  }

                  return elements;
                })()}
              </div>
            );
          })}

        {/* Session Overlap Zones */}
        {(() => {
          const overlaps: React.ReactNode[] = [];

          // London/NY overlap: London 8:00-16:30 UTC, NY Regular 14:30-21:00 UTC
          // Overlap is 14:30-16:30 UTC (2 hours)
          const londonNYOverlapStart = 14.5; // 14:30 UTC
          const londonNYOverlapEnd = 16.5; // 16:30 UTC

          for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
            const dayStart = new Date(currentTime);
            dayStart.setUTCHours(0, 0, 0, 0);
            dayStart.setUTCDate(dayStart.getUTCDate() + dayOffset);

            const overlapStart = new Date(dayStart.getTime() + londonNYOverlapStart * 60 * 60 * 1000);
            const overlapEnd = new Date(dayStart.getTime() + londonNYOverlapEnd * 60 * 60 * 1000);

            const timelineWidth = containerWidth - 240;
            const overlapStartX = getTimePosition(overlapStart, currentTime, timelineWidth) + scrollOffset;
            const overlapEndX = getTimePosition(overlapEnd, currentTime, timelineWidth) + scrollOffset;
            const overlapWidth = overlapEndX - overlapStartX;

            if (overlapEndX > 0 && overlapStartX < timelineWidth) {
              const isActive = currentHourUTC >= londonNYOverlapStart && currentHourUTC < londonNYOverlapEnd;

              overlaps.push(
                <div
                  key={`overlap-london-ny-${dayOffset}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: Math.max(0, overlapStartX),
                    width: Math.min(overlapWidth, timelineWidth - Math.max(0, overlapStartX)),
                    top: 10,
                    bottom: 0,
                    background: isActive
                      ? "linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 50%, transparent 100%)"
                      : "linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0.02) 50%, transparent 100%)",
                    borderLeft: "1px dashed rgba(168, 85, 247, 0.3)",
                    borderRight: "1px dashed rgba(168, 85, 247, 0.3)",
                  }}
                >
                  {/* Overlap label at top */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-b-md text-[10px] font-medium whitespace-nowrap"
                    style={{
                      backgroundColor: isActive ? "rgba(168, 85, 247, 0.3)" : "rgba(168, 85, 247, 0.15)",
                      color: isActive ? "#A855F7" : "#A855F780",
                    }}
                  >
                    {isActive ? "PRIME TRADING" : "LSE/NYSE OVERLAP"}
                  </div>
                </div>
              );
            }
          }

          return overlaps;
        })()}

        {/* Session Tooltip */}
        {hoveredSession && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: Math.min(hoveredSession.x + 12, window.innerWidth - 280),
              top: hoveredSession.y + 12,
            }}
          >
            <div
              className="bg-card border-2 rounded-lg shadow-2xl p-3 min-w-[250px] max-w-[280px]"
              style={{ borderColor: hoveredSession.session.color }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: hoveredSession.session.color }}
                />
                <div>
                  <span className="font-bold text-sm">{hoveredSession.session.name}</span>
                  <div className="text-[10px] text-muted">{getTimezoneAbbr(hoveredSession.session.timezone)} Time Zone</div>
                </div>
              </div>

              {/* Current time in market's timezone */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted">{getTimezoneAbbr(hoveredSession.session.timezone)} Time</span>
                <span className="text-sm font-mono font-bold" style={{ color: hoveredSession.session.color }}>
                  {getTimeInTimezone(hoveredSession.session.timezone)}
                </span>
              </div>

              {/* All sessions for this market */}
              <div className="space-y-1.5 text-xs">
                {hoveredSession.session.preMarket && (
                  <div className={`flex justify-between p-1.5 rounded ${hoveredSession.type === "pre" ? "bg-card-hover" : ""}`}>
                    <span className={isSessionActiveNow(hoveredSession.session, currentTime, "pre") ? "text-foreground font-medium" : "text-muted"}>
                      {hoveredSession.session.id === "tokyo" ? "Morning Session" : hoveredSession.session.id === "sydney" ? "Pre-Open" : "Pre-Market"}
                    </span>
                    <span className="font-mono" style={{ color: isSessionActiveNow(hoveredSession.session, currentTime, "pre") ? hoveredSession.session.color : undefined }}>
                      {formatLocalHour(hoveredSession.session.preMarket.start)} - {formatLocalHour(hoveredSession.session.preMarket.end)}
                    </span>
                  </div>
                )}
                <div className={`flex justify-between p-1.5 rounded ${hoveredSession.type === "regular" ? "bg-card-hover" : ""}`}>
                  <span className={isSessionActiveNow(hoveredSession.session, currentTime, "regular") ? "text-foreground font-medium" : "text-muted"}>
                    {hoveredSession.session.id === "tokyo" ? "Afternoon Session" : "Regular Hours"}
                  </span>
                  <span className="font-mono" style={{ color: isSessionActiveNow(hoveredSession.session, currentTime, "regular") ? hoveredSession.session.color : undefined }}>
                    {formatLocalHour(hoveredSession.session.regular.start)} - {formatLocalHour(hoveredSession.session.regular.end)}
                  </span>
                </div>
                {hoveredSession.session.postMarket && (
                  <div className={`flex justify-between p-1.5 rounded ${hoveredSession.type === "post" ? "bg-card-hover" : ""}`}>
                    <span className={isSessionActiveNow(hoveredSession.session, currentTime, "post") ? "text-foreground font-medium" : "text-muted"}>
                      Post-Market
                    </span>
                    <span className="font-mono" style={{ color: isSessionActiveNow(hoveredSession.session, currentTime, "post") ? hoveredSession.session.color : undefined }}>
                      {formatLocalHour(hoveredSession.session.postMarket.start)} - {formatLocalHour(hoveredSession.session.postMarket.end)}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress section (if any session active) */}
              {(isSessionActiveNow(hoveredSession.session, currentTime, "pre") ||
                isSessionActiveNow(hoveredSession.session, currentTime, "regular") ||
                isSessionActiveNow(hoveredSession.session, currentTime, "post")) && (
                <>
                  <div className="border-t border-border my-2" />
                  {(() => {
                    const activeType = isSessionActiveNow(hoveredSession.session, currentTime, "regular")
                      ? "regular"
                      : isSessionActiveNow(hoveredSession.session, currentTime, "pre")
                      ? "pre"
                      : "post";
                    const progress = getSessionProgressNow(hoveredSession.session, currentTime, activeType);
                    const remaining = getTimeRemainingNow(hoveredSession.session, currentTime, activeType);
                    const color = hoveredSession.session.color;

                    return (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted">Session Progress</span>
                          <span className="font-bold" style={{ color }}>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${color}20` }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${progress}%`, backgroundColor: color }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted">Time Remaining</span>
                          <span className="font-medium" style={{ color }}>{remaining}</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Next open (if closed) */}
              {!isSessionActiveNow(hoveredSession.session, currentTime, "pre") &&
               !isSessionActiveNow(hoveredSession.session, currentTime, "regular") &&
               !isSessionActiveNow(hoveredSession.session, currentTime, "post") && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Market Status</span>
                    <span className="font-medium" style={{ color: hoveredSession.session.color }}>
                      {getTimeUntilOpenNow(hoveredSession.session, currentTime)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

          {/* Economic Events Timeline - Middle Third */}
          <div className="flex-1 relative min-h-0 border-b border-border/20">
            {filteredVisibleEvents.map((event, index) => {
              const eventTime = new Date(`${event.date}T${event.time || "00:00"}:00`);
              const timelineWidth = containerWidth - 240;
              const xPos = getTimePosition(eventTime, currentTime, timelineWidth) + scrollOffset;

              if (xPos < -100 || xPos > timelineWidth) return null;

              // Stagger vertically based on index to avoid overlap
              const yOffset = 20 + (index % 3) * 90;
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
                    className={`w-44 rounded-lg border shadow-lg p-2 transition-all ${
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
                        <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          Released
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div className="text-xs font-medium text-foreground truncate">
                      {event.title}
                    </div>

                    {/* Values */}
                    {(event.actual || event.forecast || event.previous) && (
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
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

          {/* Custom Sessions & Alerts Timeline - Bottom */}
          <div className="flex-1 relative min-h-0">
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

              const timelineWidth = containerWidth - 240;
              const startX = getTimePosition(sessionStart, currentTime, timelineWidth) + scrollOffset;
              const endX = getTimePosition(sessionEnd, currentTime, timelineWidth) + scrollOffset;
              const width = endX - startX;

              // Only render if visible
              if (endX < -100 || startX > timelineWidth) return null;

              const isActive = currentTime >= sessionStart && currentTime <= sessionEnd;
              const progress = isActive
                ? ((currentTime.getTime() - sessionStart.getTime()) / (sessionEnd.getTime() - sessionStart.getTime())) * 100
                : 0;

              return (
                <div
                  key={session.id}
                  className="absolute cursor-pointer group"
                  style={{
                    left: Math.max(0, startX),
                    top: 4,
                    bottom: 4,
                    width: Math.max(80, Math.min(width, timelineWidth - Math.max(0, startX))),
                  }}
                  onClick={() => editSession(session)}
                >
                  {/* Session bar - fills lane height */}
                  <div
                    className="h-full rounded-lg overflow-hidden transition-all group-hover:brightness-110"
                    style={{
                      backgroundColor: `${session.color}20`,
                      border: `1px solid ${session.color}${isActive ? "60" : "40"}`,
                      boxShadow: isActive ? `0 0 12px ${session.color}40` : undefined,
                    }}
                  >
                    {/* Progress fill */}
                    {isActive && (
                      <div
                        className="absolute inset-y-0 left-0 transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: `${session.color}35`,
                        }}
                      />
                    )}
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                      style={{ backgroundColor: session.color }}
                    />
                    {/* Session info - centered */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 px-3">
                      {isActive && (
                        <div className="relative">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: session.color }} />
                          <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: session.color, opacity: 0.5 }} />
                        </div>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: session.color }}>
                        {session.name}
                      </span>
                      {isActive && width > 120 && (
                        <span className="text-[10px] font-mono" style={{ color: session.color }}>
                          {Math.round(progress)}%
                        </span>
                      )}
                    </div>
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

              const timelineWidth = containerWidth - 240; // Timeline area width (minus sidebar)
              const xPos = getTimePosition(alertTime, currentTime, timelineWidth) + scrollOffset;

              // Only render if visible
              if (xPos < -50 || xPos > timelineWidth) return null;

              const isPast = currentTime > alertTime;

              return (
                <div
                  key={alert.id}
                  className="absolute cursor-pointer top-1/2 -translate-y-1/2"
                  style={{ left: xPos }}
                  onClick={() => editAlert(alert)}
                >
                  {/* Alert marker - compact design */}
                  <div className="flex items-center gap-2 -translate-x-1/2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isPast ? "opacity-50" : ""
                      }`}
                      style={{
                        backgroundColor: "#F9731620",
                        border: "2px solid #F97316",
                        boxShadow: !isPast ? "0 0 12px rgba(249, 115, 22, 0.4)" : undefined,
                      }}
                    >
                      {!isPast && (
                        <div
                          className="absolute w-6 h-6 rounded-full animate-ping"
                          style={{ backgroundColor: "#F9731630" }}
                        />
                      )}
                      <Bell className="w-3 h-3 text-orange-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-orange-400 whitespace-nowrap font-medium leading-tight">
                        {alert.name}
                      </span>
                      <span className="text-[9px] text-orange-400/60 font-mono leading-tight">
                        {formatTimeDisplay(alert.time)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty state for timeline area */}
            {customSessions.length === 0 && customAlerts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-muted">
                  Add sessions or alerts using the sidebar
                </span>
              </div>
            )}
          </div>

          {/* NOW Line - spans full height of timeline area */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-accent z-20 pointer-events-none"
            style={{
              left: `${NOW_LINE_POSITION * 100}%`,
              transform: `translateX(${scrollOffset}px)`,
              boxShadow: "0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)",
            }}
          >
            {/* NOW label */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-accent text-white text-xs font-bold">
              NOW
            </div>
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
                <div className="grid grid-cols-2 gap-6">
                  <TimePicker
                    label="Start Time"
                    value={formStartTime}
                    onChange={setFormStartTime}
                  />
                  <TimePicker
                    label="End Time"
                    value={formEndTime}
                    onChange={setFormEndTime}
                  />
                </div>
              ) : (
                <TimePicker
                  label="Alert Time"
                  value={formAlertTime}
                  onChange={setFormAlertTime}
                />
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
                          boxShadow: formColor === color.value ? `0 0 0 2px var(--card), 0 0 0 4px ${color.value}` : undefined,
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
