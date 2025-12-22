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
  Eye,
  EyeOff,
  TrendingUp,
  Calendar,
  Palette,
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
  color: string;
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
function getCurrentHourInTimezone(timezone: string, currentTime: Date): number {
  const timeStr = currentTime.toLocaleTimeString("en-US", {
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
  timezone: string,
  currentTime: Date
): Date {
  // Get the current time in the target timezone
  const currentHourInTz = getCurrentHourInTimezone(timezone, currentTime);

  // Calculate how many hours from now until the target time
  let hoursFromNow = localHour - currentHourInTz;

  // Adjust baseDate offset (baseDate is relative to today in that timezone)
  const tzDateStr = currentTime.toLocaleDateString("en-CA", { timeZone: timezone });
  const baseDateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(baseDate.getDate()).padStart(2, "0")}`;

  if (baseDateStr < tzDateStr) {
    hoursFromNow -= 24; // Yesterday
  } else if (baseDateStr > tzDateStr) {
    hoursFromNow += 24; // Tomorrow
  }

  return new Date(currentTime.getTime() + hoursFromNow * 60 * 60 * 1000);
}

// Check if it's a weekend (Saturday or Sunday) in a specific timezone
function isWeekendInTimezone(timezone: string, currentTime: Date): boolean {
  // Get day of week: 0 = Sunday, 6 = Saturday
  const dayNum = new Date(currentTime.toLocaleString("en-US", { timeZone: timezone })).getDay();
  return dayNum === 0 || dayNum === 6;
}

// Check if a session is currently active
function isSessionActiveNow(
  session: MarketSession,
  currentTime: Date,
  type: "pre" | "regular" | "post"
): boolean {
  // Markets are closed on weekends
  if (isWeekendInTimezone(session.timezone, currentTime)) {
    return false;
  }

  let timeRange;
  if (type === "pre") timeRange = session.preMarket;
  else if (type === "post") timeRange = session.postMarket;
  else timeRange = session.regular;

  if (!timeRange) return false;

  // Get current hour in the session's timezone
  const currentHour = getCurrentHourInTimezone(session.timezone, currentTime);

  return currentHour >= timeRange.start && currentHour < timeRange.end;
}

// Check if any session type (pre, regular, post) is active for a market
function isMarketActive(session: MarketSession, currentTime: Date): boolean {
  return (
    isSessionActiveNow(session, currentTime, "pre") ||
    isSessionActiveNow(session, currentTime, "regular") ||
    isSessionActiveNow(session, currentTime, "post")
  );
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
  const currentHour = getCurrentHourInTimezone(session.timezone, currentTime);

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

  const sessionEnd = getSessionDateTime(baseDate, timeRange.end, session.timezone, currentTime);
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

  let sessionStart = getSessionDateTime(baseDate, timeRange.start, session.timezone, currentTime);

  // If session already passed today, look at tomorrow
  const sessionEnd = getSessionDateTime(baseDate, timeRange.end, session.timezone, currentTime);
  if (currentTime >= sessionEnd) {
    baseDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    sessionStart = getSessionDateTime(baseDate, timeRange.start, session.timezone, currentTime);
  }

  // Skip weekends - find the next trading day (max 7 iterations for safety)
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = getDayOfWeekInTimezone(sessionStart, session.timezone);
    if (dayOfWeek !== 0 && dayOfWeek !== 6) break; // Not a weekend
    baseDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    sessionStart = getSessionDateTime(baseDate, timeRange.start, session.timezone, currentTime);
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
  { name: "Gray", value: "#94A3B8" },
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

  // Expanded card state
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; alignBottom?: boolean } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!expandedCard) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is inside the popover
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }

      // Check if click is on a market session card (has data-market-card attribute)
      if (target.closest('[data-market-card]')) {
        return;
      }

      // Click was outside, close the popover
      setExpandedCard(null);
      setPopoverPosition(null);
    };

    // Use mousedown for immediate response
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedCard]);

  // Market session alerts state
  const [marketAlerts, setMarketAlerts] = useState<Set<string>>(new Set());
  const prevMarketStates = useRef<Map<string, { isOpen: boolean; sessionType: string | null }>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Economic Events Filter State
    const [filterImpacts, setFilterImpacts] = useState<Set<string>>(new Set(["high", "medium", "low"]));
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterCurrency, setFilterCurrency] = useState("All");
  const [showPastEvents, setShowPastEvents] = useState(true);
  const [showEventsListModal, setShowEventsListModal] = useState(false);

  // Custom Sessions & Alerts Card State
  
  // Custom lane tooltip state (for empty lane hover)
  const [showCustomLaneTooltip, setShowCustomLaneTooltip] = useState(false);
  const [customLaneTooltipPos, setCustomLaneTooltipPos] = useState({ x: 0, y: 0 });
  const customLaneHoverTimeout = useRef<NodeJS.Timeout | null>(null);

  // Custom session tooltip state (for hovering on session bars)
  const [hoveredCustomSession, setHoveredCustomSession] = useState<{
    session: CustomSession;
    x: number;
    y: number;
    isActive: boolean;
    progress: number;
    startTime: Date;
    endTime: Date;
  } | null>(null);

  // Visibility toggles
  const [visibleMarkets, setVisibleMarkets] = useState<Set<string>>(new Set(MARKET_SESSIONS.map(s => s.id)));
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [showEventsCard, setShowEventsCard] = useState(true);
  const [showCustomCard, setShowCustomCard] = useState(true);
  const [activeMarketsOnly, setActiveMarketsOnly] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('econtimeline-preferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);

        if (prefs.visibleMarkets) {
          setVisibleMarkets(new Set(prefs.visibleMarkets));
        }
        if (prefs.marketAlerts) {
          setMarketAlerts(new Set(prefs.marketAlerts));
        }
        if (typeof prefs.showEventsCard === 'boolean') {
          setShowEventsCard(prefs.showEventsCard);
        }
        if (typeof prefs.showCustomCard === 'boolean') {
          setShowCustomCard(prefs.showCustomCard);
        }
        if (typeof prefs.activeMarketsOnly === 'boolean') {
          setActiveMarketsOnly(prefs.activeMarketsOnly);
        }
        if (typeof prefs.showPastEvents === 'boolean') {
          setShowPastEvents(prefs.showPastEvents);
        }
        if (prefs.filterImpacts) {
          setFilterImpacts(new Set(prefs.filterImpacts));
        }
        if (prefs.filterCategory) {
          setFilterCategory(prefs.filterCategory);
        }
        if (prefs.filterCurrency) {
          setFilterCurrency(prefs.filterCurrency);
        }
      }
    } catch (e) {
      console.log('Failed to load preferences:', e);
    }
    setPreferencesLoaded(true);
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (!preferencesLoaded) return; // Don't save until initial load is complete

    try {
      const prefs = {
        visibleMarkets: Array.from(visibleMarkets),
        marketAlerts: Array.from(marketAlerts),
        showEventsCard,
        showCustomCard,
        activeMarketsOnly,
        showPastEvents,
        filterImpacts: Array.from(filterImpacts),
        filterCategory,
        filterCurrency,
      };
      localStorage.setItem('econtimeline-preferences', JSON.stringify(prefs));
    } catch (e) {
      console.log('Failed to save preferences:', e);
    }
  }, [preferencesLoaded, visibleMarkets, marketAlerts, showEventsCard, showCustomCard, activeMarketsOnly, showPastEvents, filterImpacts, filterCategory, filterCurrency]);

  // Toggle individual market visibility
  const toggleMarket = (marketId: string) => {
    setVisibleMarkets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(marketId)) {
        newSet.delete(marketId);
      } else {
        newSet.add(marketId);
      }
      return newSet;
    });
    // Disable active-only mode when manually toggling
    setActiveMarketsOnly(false);
  };

  // Toggle active markets only mode
  const toggleActiveMarketsOnly = () => {
    if (activeMarketsOnly) {
      // Turning off: show all markets
      setVisibleMarkets(new Set(MARKET_SESSIONS.map(s => s.id)));
      setActiveMarketsOnly(false);
    } else {
      // Turning on: show only active markets
      const time = currentTime ?? new Date();
      const activeMarkets = MARKET_SESSIONS.filter(s => isMarketActive(s, time)).map(s => s.id);
      setVisibleMarkets(new Set(activeMarkets));
      setActiveMarketsOnly(true);
    }
  };

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

  // Auto-update visible markets when in "active only" mode
  useEffect(() => {
    if (activeMarketsOnly && currentTime) {
      const activeMarkets = MARKET_SESSIONS.filter(s => isMarketActive(s, currentTime)).map(s => s.id);
      setVisibleMarkets(prev => {
        const newSet = new Set(activeMarkets);
        // Only update if different to avoid unnecessary re-renders
        if (prev.size !== newSet.size || ![...prev].every(id => newSet.has(id))) {
          return newSet;
        }
        return prev;
      });
    }
  }, [activeMarketsOnly, currentTime]);

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

  // Play market bell sound using Web Audio API and announce with speech
  const playAlertSound = useCallback((type: 'open' | 'close', marketName: string, sessionType: string | null) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      // Function to create a single bell ring
      const ringBell = (startTime: number) => {
        // Bell sound uses multiple harmonics for a metallic tone
        const frequencies = [880, 1760, 2640, 3520]; // Harmonics of A5
        const gains = [0.5, 0.3, 0.15, 0.1]; // Decreasing volume for each harmonic

        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.frequency.setValueAtTime(freq, startTime);
          osc.type = 'sine';

          // Sharp attack, long decay like a bell
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(gains[i] * 0.4, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

          osc.start(startTime);
          osc.stop(startTime + 0.8);
        });

        // Add a subtle low thump for the bell strike
        const thump = ctx.createOscillator();
        const thumpGain = ctx.createGain();
        thump.connect(thumpGain);
        thumpGain.connect(ctx.destination);
        thump.frequency.setValueAtTime(150, startTime);
        thump.type = 'sine';
        thumpGain.gain.setValueAtTime(0.2, startTime);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
        thump.start(startTime);
        thump.stop(startTime + 0.1);
      };

      // Ring the bell 3 times
      const now = ctx.currentTime;
      ringBell(now);
      ringBell(now + 0.5);
      ringBell(now + 1.0);

      // Text-to-speech announcement (after bells finish)
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          // Build the announcement message
          let message = marketName;
          if (type === 'open') {
            if (sessionType === 'pre') {
              message += ' Pre-market Open';
            } else if (sessionType === 'post') {
              message += ' After Hours Open';
            } else {
              message += ' Market Open';
            }
          } else {
            message += ' Market Closed';
          }

          // Cancel any ongoing speech
          window.speechSynthesis.cancel();

          // Create and speak the announcement
          const utterance = new SpeechSynthesisUtterance(message);

          // Try to find a professional male voice
          const voices = window.speechSynthesis.getVoices();
          const preferredVoices = [
            'Microsoft David',
            'Microsoft Mark',
            'Google US English Male',
            'Daniel',
            'James',
            'Alex',
            'Google UK English Male',
          ];

          let selectedVoice = null;
          // First try to find a preferred voice
          for (const preferred of preferredVoices) {
            selectedVoice = voices.find(v => v.name.includes(preferred));
            if (selectedVoice) break;
          }
          // Fallback: find any English male voice
          if (!selectedVoice) {
            selectedVoice = voices.find(v =>
              v.lang.startsWith('en') &&
              (v.name.toLowerCase().includes('male') ||
               v.name.includes('David') ||
               v.name.includes('Mark') ||
               v.name.includes('Daniel'))
            );
          }

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }

          utterance.rate = 0.95;
          utterance.pitch = 0.9;
          utterance.volume = 0.8;
          window.speechSynthesis.speak(utterance);
        }, 1500); // Wait for bells to finish
      }
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  // Market session alert detection
  useEffect(() => {
    if (marketAlerts.size === 0) return;

    MARKET_SESSIONS.forEach(session => {
      if (!marketAlerts.has(session.id)) return;

      const isPreActive = isSessionActiveNow(session, currentTime, "pre");
      const isRegularActive = isSessionActiveNow(session, currentTime, "regular");
      const isPostActive = isSessionActiveNow(session, currentTime, "post");
      const isOpen = isPreActive || isRegularActive || isPostActive;
      const currentSessionType = isRegularActive ? "regular" : isPreActive ? "pre" : isPostActive ? "post" : null;

      const prevState = prevMarketStates.current.get(session.id);

      if (prevState !== undefined) {
        // Detect market open (was closed, now open)
        if (!prevState.isOpen && isOpen) {
          playAlertSound('open', session.name, currentSessionType);
          console.log(`🔔 ${session.name} OPENED (${currentSessionType})`);
        }
        // Detect market close (was open, now closed)
        else if (prevState.isOpen && !isOpen) {
          playAlertSound('close', session.name, null);
          console.log(`🔔 ${session.name} CLOSED`);
        }
        // Detect session type change (e.g., pre-market to regular)
        else if (prevState.sessionType !== currentSessionType && currentSessionType !== null && prevState.sessionType !== null) {
          playAlertSound('open', session.name, currentSessionType);
          console.log(`🔔 ${session.name} transitioned to ${currentSessionType}`);
        }
      }

      // Update previous state
      prevMarketStates.current.set(session.id, { isOpen, sessionType: currentSessionType });
    });
  }, [currentTime, marketAlerts, playAlertSound]);

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
    setFormColor("#94A3B8"); // Gray for alerts
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
    setFormColor(alert.color || "#F97316");
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
        color: formColor,
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
  // Use timelineRef for accurate width - it's the actual timeline container
  const containerWidth = timelineRef.current?.clientWidth || 1200;
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

  // Filter events for today's full day (for the modal)
  const todayStr = currentTime.toISOString().split('T')[0]; // YYYY-MM-DD format
  const todaysEvents = events.filter((event) => {
    // Check if event is today
    if (event.date !== todayStr) {
      return false;
    }

    // Impact filter only
    if (!filterImpacts.has(event.impact)) {
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

          {/* Visibility Toggles */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-card/50 border border-border/50">
            {/* Market Sessions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                  visibleMarkets.size > 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-transparent text-muted hover:text-white/70'
                }`}
                title="Toggle Market Sessions"
              >
                <TrendingUp className="w-4 h-4" />
                <ChevronDown className={`w-3 h-3 transition-transform ${showMarketDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showMarketDropdown && (
                <div
                  className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
                  onMouseLeave={() => setShowMarketDropdown(false)}
                >
                  {/* Active Only Toggle */}
                  <button
                    onClick={toggleActiveMarketsOnly}
                    className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/5 transition-colors ${
                      activeMarketsOnly ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded border-2 flex items-center justify-center transition-colors ${
                        activeMarketsOnly
                          ? 'border-amber-400 bg-amber-400'
                          : 'border-white/30'
                      }`}
                    >
                      {activeMarketsOnly && (
                        <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-medium text-amber-400">
                      Active Only
                    </span>
                  </button>
                  {/* Divider */}
                  <div className="h-px bg-border/50 my-1" />
                  {/* Individual Market Toggles */}
                  {MARKET_SESSIONS.map(session => {
                    const isActive = isMarketActive(session, currentTime);
                    return (
                      <button
                        key={session.id}
                        onClick={() => toggleMarket(session.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/5 transition-colors"
                      >
                        <div
                          className={`w-3 h-3 rounded border-2 flex items-center justify-center transition-colors ${
                            visibleMarkets.has(session.id)
                              ? 'border-emerald-400 bg-emerald-400'
                              : 'border-white/30'
                          }`}
                        >
                          {visibleMarkets.has(session.id) && (
                            <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: session.color }}
                        >
                          {session.shortName}
                        </span>
                        {/* Active indicator dot */}
                        {isActive && (
                          <div
                            className="w-1.5 h-1.5 rounded-full ml-auto animate-pulse"
                            style={{ backgroundColor: session.color }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEventsCard(!showEventsCard)}
              className={`p-1.5 rounded transition-colors ${
                showEventsCard
                  ? 'bg-slate-500/20 text-slate-300'
                  : 'bg-transparent text-muted hover:text-white/70'
              }`}
              title={showEventsCard ? "Hide Events" : "Show Events"}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCustomCard(!showCustomCard)}
              className={`p-1.5 rounded transition-colors ${
                showCustomCard
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-transparent text-muted hover:text-white/70'
              }`}
              title={showCustomCard ? "Hide Custom" : "Show Custom"}
            >
              <Palette className="w-4 h-4" />
            </button>
          </div>

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
        <div className="absolute top-0 left-60 right-0 bottom-0 pointer-events-none overflow-hidden">
          {/* Hour gridlines - snapped to actual clock times like the time scale */}
          {(() => {
            const timelineWidth = containerWidth - 240; // Same as session bars
            const elements: React.ReactNode[] = [];

            // Start from current time snapped to the hour, minus HOURS_IN_PAST (same as time scale)
            const startTime = new Date(currentTime);
            startTime.setMinutes(0, 0, 0);
            startTime.setHours(startTime.getHours() - HOURS_IN_PAST);

            // Generate gridlines for each 30-minute increment (same as time scale)
            for (let i = 0; i <= TOTAL_HOURS * 2 + 2; i++) {
              const lineTime = new Date(startTime.getTime() + i * 30 * 60 * 1000);
              const xPos = getTimePosition(lineTime, currentTime, timelineWidth) + scrollOffset;
              const isHourLine = lineTime.getMinutes() === 0;

              if (xPos < 0 || xPos > timelineWidth) continue;

              elements.push(
                <div
                  key={`grid-${lineTime.getTime()}`}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: xPos,
                    width: 1,
                    backgroundColor: isHourLine ? "rgba(51, 65, 85, 0.5)" : "rgba(51, 65, 85, 0.25)",
                  }}
                />
              );
            }
            return elements;
          })()}
        </div>

        {/* Sidebar Header Label */}
        <div className="absolute top-0 left-0 w-60 h-10 border-b border-r border-border bg-background flex items-center justify-center z-10">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Market Overview</span>
        </div>

        {/* Time Scale / Ruler - starts after sidebar */}
        <div className="absolute top-0 left-60 right-0 h-10 border-b border-border bg-background flex items-end z-10 overflow-hidden">
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
        <div className="absolute top-10 left-0 bottom-0 w-60 bg-background border-r border-border flex flex-col p-1.5 gap-1 overflow-y-auto overflow-x-visible">
          {/* Market Session Cards */}
          {MARKET_SESSIONS.filter(s => visibleMarkets.has(s.id)).map((session) => {
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
                  data-market-card
                  className={`relative rounded-xl cursor-pointer transition-all duration-200 overflow-visible ${isAnyActive ? 'animate-pulse-subtle' : ''} ${isExpanded ? 'ring-2' : ''}`}
                  style={{
                    flex: '1 1 0',
                    minHeight: 0,
                    background: isAnyActive
                      ? `linear-gradient(135deg, ${session.color}35 0%, ${session.color}15 50%, ${session.color}25 100%)`
                      : `linear-gradient(135deg, ${session.color}15 0%, ${session.color}08 100%)`,
                    border: `2px solid ${session.color}${isAnyActive ? "70" : "30"}`,
                    boxShadow: isAnyActive
                        ? `0 0 20px ${session.color}40, 0 0 40px ${session.color}20, 0 8px 32px ${session.color}30, inset 0 1px 0 ${session.color}30`
                        : `0 2px 8px ${session.color}10, inset 0 1px 0 ${session.color}10`,
                    ringColor: isExpanded ? session.color : 'transparent',
                  }}
                  onClick={(e) => {
                    if (isExpanded) {
                      setExpandedCard(null);
                      setPopoverPosition(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const popoverHeight = 280; // Approximate popover height
                      const wouldOverflow = rect.top + popoverHeight > window.innerHeight;

                      setPopoverPosition({
                        top: wouldOverflow ? rect.bottom : rect.top,
                        left: rect.right + 8,
                        alignBottom: wouldOverflow
                      });
                      setExpandedCard(session.id);
                    }
                  }}
                >
                  {/* Alert badge - corner indicator */}
                  {marketAlerts.has(session.id) && (
                    <div
                      className="absolute -top-1 -right-1 z-10 flex items-center justify-center w-5 h-5 rounded-full"
                      style={{
                        backgroundColor: session.color,
                        boxShadow: `0 0 8px ${session.color}80`,
                      }}
                    >
                      <Bell className="w-3 h-3 text-black" />
                    </div>
                  )}

                  {/* Header row */}
                  <div className="px-2.5 py-1.5 flex items-center justify-between relative">
                    <div className="flex items-center gap-1.5">
                      {/* Pulsing dot for active */}
                      {isAnyActive && (
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: session.color }}
                          />
                          <div
                            className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                            style={{ backgroundColor: session.color, opacity: 0.6 }}
                          />
                        </div>
                      )}
                      <span className="text-sm font-bold" style={{ color: session.color }}>
                        {session.shortName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isAnyActive ? 'animate-pulse' : ''}`}
                        style={{
                          backgroundColor: isAnyActive ? session.color : `${session.color}20`,
                          color: isAnyActive ? '#000' : `${session.color}90`,
                          boxShadow: isAnyActive ? `0 0 8px ${session.color}60` : 'none',
                        }}
                      >
                        {isRegularActive ? "LIVE" : isPreActive ? "PRE" : isPostActive ? "POST" : "CLOSED"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono font-bold" style={{ color: session.color }}>
                        {getTimeInTimezone(session.timezone).replace(/:(\d{2}):\d{2}/, ":$1")}
                      </span>
                      <span className="text-[10px] text-muted">{getTimezoneAbbr(session.timezone)}</span>
                      <svg
                        className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                        style={{ color: isExpanded ? session.color : `${session.color}60` }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress/countdown row - compact view */}
                  <div className="px-2.5 pb-2 relative">
                      {isAnyActive ? (
                        <div className="space-y-1">
                          {/* Progress bar with time remaining */}
                          <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                            <span style={{ color: `${session.color}90` }}>
                              {isRegularActive ? "Regular" : isPreActive ? "Pre-Market" : "After-Hours"}
                            </span>
                            <span className="font-mono font-bold" style={{ color: session.color }}>
                              {currentSessionType ? getTimeRemainingNow(session, currentTime, currentSessionType) : ""}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="relative h-2">
                            <div
                              className="h-full rounded-full overflow-hidden relative"
                              style={{ backgroundColor: `${session.color}20` }}
                            >
                              {/* Progress fill */}
                              <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                  width: `${progress}%`,
                                  background: `linear-gradient(90deg, ${session.color}80 0%, ${session.color} 100%)`,
                                  boxShadow: `0 0 6px ${session.color}60`,
                                }}
                              />
                              {/* Animated shine */}
                              <div
                                className="absolute inset-y-0 left-0 pointer-events-none"
                                style={{
                                  width: `${progress}%`,
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '200%',
                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                                    animation: 'shimmer 2s ease-in-out infinite',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          {/* Progress percentage */}
                          <div className="text-right">
                            <span className="text-[11px] font-mono font-bold" style={{ color: session.color }}>
                              {Math.round(progress)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-[11px]" style={{ color: `${session.color}70` }}>
                            {getTimeUntilOpenNow(session, currentTime)}
                          </span>
                          {/* Closed state mini chart - flat line */}
                          <svg className="w-12 h-3 opacity-40" viewBox="0 0 48 12">
                            <line x1="0" y1="6" x2="48" y2="6" stroke={session.color} strokeWidth="1" strokeDasharray="2,2" />
                          </svg>
                        </div>
                      )}
                    </div>

                </div>
              );
            })}

          {/* Economic Events Filter Card */}
          {showEventsCard && (() => {
            // Check for high-impact event within the next hour
            const highImpactSoon = filteredVisibleEvents.some(e => {
              if (e.impact !== "high") return false;
              const eventTime = new Date(`${e.date}T${e.time || "00:00"}:00`);
              const timeDiff = eventTime.getTime() - currentTime.getTime();
              return timeDiff > 0 && timeDiff < 60 * 60 * 1000; // Within next hour
            });

            return (
          <div
            className={`rounded-xl transition-all duration-200 overflow-hidden ${highImpactSoon ? 'animate-pulse-subtle' : ''}`}
            style={{
              flex: '1 1 0',
              minHeight: 0,
              background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.15) 0%, rgba(148, 163, 184, 0.08) 100%)',
              border: highImpactSoon ? '2px solid rgba(239, 68, 68, 0.6)' : '2px solid rgba(148, 163, 184, 0.3)',
              boxShadow: highImpactSoon
                ? '0 0 20px rgba(239, 68, 68, 0.3), 0 0 40px rgba(239, 68, 68, 0.15), 0 2px 8px rgba(148, 163, 184, 0.1)'
                : '0 2px 8px rgba(148, 163, 184, 0.1)',
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {highImpactSoon && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-300">Events</span>
                {highImpactSoon && (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold bg-red-500/20 text-red-400 rounded border border-red-500/30 animate-pulse">
                    HIGH IMPACT
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted">
                {todaysEvents.length} today
              </span>
            </div>

            {/* Impact Level Filter */}
            <div className="px-3 pb-2">
              <div className="flex gap-1">
                {(["high", "medium", "low"] as const).map((impact) => {
                  const isSelected = filterImpacts.has(impact);
                  const colors = { high: "#EF4444", medium: "#F59E0B", low: "#10B981" };
                  return (
                    <button
                      key={impact}
                      onClick={() => {
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

            {/* View Today's Events Button */}
            <div className="px-3 pb-3">
              <button
                onClick={() => setShowEventsListModal(true)}
                className="w-full flex items-center justify-center gap-2 text-[11px] font-medium text-slate-300 py-2 border border-slate-400/30 rounded hover:bg-slate-400/10 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                View Today's Events
              </button>
            </div>
          </div>
            );
          })()}

          {/* Custom Sessions & Alerts Card */}
          {showCustomCard && (() => {
            // Check for active custom sessions
            const currentTimeStr = currentTime.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
            const currentMinutes = parseInt(currentTimeStr.split(":")[0]) * 60 + parseInt(currentTimeStr.split(":")[1]);

            const activeSession = customSessions.find(session => {
              const [startH, startM] = session.startTime.split(":").map(Number);
              const [endH, endM] = session.endTime.split(":").map(Number);
              const startMinutes = startH * 60 + startM;
              const endMinutes = endH * 60 + endM;
              // Handle overnight sessions
              if (endMinutes < startMinutes) {
                return currentMinutes >= startMinutes || currentMinutes < endMinutes;
              }
              return currentMinutes >= startMinutes && currentMinutes < endMinutes;
            });

            // Calculate active session progress
            const getSessionProgress = (session: CustomSession) => {
              const [startH, startM] = session.startTime.split(":").map(Number);
              const [endH, endM] = session.endTime.split(":").map(Number);
              const startMinutes = startH * 60 + startM;
              let endMinutes = endH * 60 + endM;
              if (endMinutes < startMinutes) endMinutes += 24 * 60;
              let current = currentMinutes;
              if (current < startMinutes) current += 24 * 60;
              const duration = endMinutes - startMinutes;
              const elapsed = current - startMinutes;
              return Math.min(100, Math.max(0, (elapsed / duration) * 100));
            };

            // Find next alert
            const upcomingAlerts = customAlerts
              .map(alert => {
                const [h, m] = alert.time.split(":").map(Number);
                const alertMinutes = h * 60 + m;
                let diff = alertMinutes - currentMinutes;
                if (diff < 0) diff += 24 * 60; // Next day
                return { ...alert, minutesUntil: diff };
              })
              .sort((a, b) => a.minutesUntil - b.minutesUntil);
            const nextAlert = upcomingAlerts[0];

            // Format minutes to countdown
            const formatMinutes = (mins: number) => {
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              if (h > 0) return `${h}h ${m}m`;
              return `${m}m`;
            };

            const hasActiveSession = !!activeSession;
            const sessionProgress = activeSession ? getSessionProgress(activeSession) : 0;

            return (
          <div
            className={`rounded-xl transition-all duration-200 overflow-hidden ${hasActiveSession ? 'animate-pulse-subtle' : ''}`}
            style={{
              flex: '1 1 0',
              minHeight: 0,
              background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)',
              border: hasActiveSession ? '2px solid rgba(168, 85, 247, 0.7)' : '2px solid rgba(168, 85, 247, 0.35)',
              boxShadow: hasActiveSession
                ? '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2), 0 2px 8px rgba(168, 85, 247, 0.15)'
                : '0 2px 8px rgba(168, 85, 247, 0.15)',
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Settings className="w-4 h-4 text-purple-400" style={hasActiveSession ? { animation: 'spin 8s linear infinite' } : undefined} />
                  {hasActiveSession && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className="text-sm font-semibold text-purple-400">Custom</span>
                {hasActiveSession && (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                    ACTIVE
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted">
                {customSessions.length + customAlerts.length} items
              </span>
            </div>

            {/* Action buttons */}
            <div className="px-3 pb-2 flex gap-2">
              <button
                onClick={() => openNewSessionModal()}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Session
              </button>
              <button
                onClick={() => openNewAlertModal()}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 transition-colors"
              >
                <Bell className="w-3 h-3" />
                Alert
              </button>
            </div>

            {/* Sessions list */}
            {customSessions.length > 0 && (
              <div className="px-3 pb-2">
                <div className="space-y-1">
                  {customSessions.map((session) => {
                    const isActive = session.id === activeSession?.id;
                    const progress = isActive ? getSessionProgress(session) : 0;
                    return (
                      <button
                        key={session.id}
                        onClick={() => editSession(session)}
                        className={`w-full flex flex-col gap-1 px-2 py-1.5 rounded border transition-colors text-left ${
                          isActive ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: session.color }} />
                            <span className="text-[11px] text-white/90 truncate max-w-[100px]">{session.name}</span>
                            {isActive && <span className="text-[8px] text-purple-400 font-bold">LIVE</span>}
                          </div>
                          <span className="text-[9px] text-white/50 font-mono">{session.startTime}-{session.endTime}</span>
                        </div>
                        {isActive && (
                          <div className="h-1 rounded-full overflow-hidden bg-white/10 w-full">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${progress}%`, backgroundColor: session.color }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Alerts list */}
            {customAlerts.length > 0 && (
              <div className="px-3 pb-2">
                <div className="space-y-1">
                  {customAlerts.map((alert) => {
                    const alertInfo = upcomingAlerts.find(a => a.id === alert.id);
                    return (
                      <button
                        key={alert.id}
                        onClick={() => editAlert(alert)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded border border-orange-500/20 hover:bg-orange-500/10 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-3 h-3 text-orange-400" />
                          <span className="text-[11px] text-white/90 truncate max-w-[100px]">{alert.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-orange-400/70 font-mono">{alert.time}</span>
                          {alertInfo && (
                            <span className="text-[8px] text-orange-400/50">in {formatMinutes(alertInfo.minutesUntil)}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
            );
          })()}
        </div>

        {/* Market Session Popover - renders outside sidebar to avoid clipping */}
        {expandedCard && popoverPosition && MARKET_SESSIONS.find(s => s.id === expandedCard) && (() => {
          const session = MARKET_SESSIONS.find(s => s.id === expandedCard)!;

          const isPreActive = isSessionActiveNow(session, currentTime, "pre");
          const isRegularActive = isSessionActiveNow(session, currentTime, "regular");
          const isPostActive = isSessionActiveNow(session, currentTime, "post");
          const isAnyActive = isPreActive || isRegularActive || isPostActive;
          const currentSessionType = isRegularActive ? "regular" : isPreActive ? "pre" : isPostActive ? "post" : null;
          const progress = currentSessionType ? getSessionProgressNow(session, currentTime, currentSessionType) : 0;

          return (
            <div
              ref={popoverRef}
              className="fixed z-50 animate-in slide-in-from-left-2 fade-in duration-200"
              style={{
                left: popoverPosition.left,
                top: popoverPosition.top,
                width: '220px',
                transform: popoverPosition.alignBottom ? 'translateY(-100%)' : 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Arrow pointing left */}
              <div
                className={`absolute left-0 -translate-x-full ${popoverPosition.alignBottom ? 'bottom-4' : 'top-4'}`}
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  borderRight: `6px solid ${session.color}40`,
                }}
              />
              <div
                className="rounded-xl p-3"
                style={{
                  background: `linear-gradient(135deg, ${session.color}20 0%, rgba(0,0,0,0.95) 100%)`,
                  border: `1px solid ${session.color}40`,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${session.color}20`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${session.color}30` }}>
                  <span className="text-sm font-bold" style={{ color: session.color }}>{session.name}</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isAnyActive ? session.color : `${session.color}20`,
                      color: isAnyActive ? '#000' : `${session.color}90`,
                    }}
                  >
                    {isRegularActive ? "LIVE" : isPreActive ? "PRE" : isPostActive ? "POST" : "CLOSED"}
                  </span>
                </div>

                {/* Session Times */}
                <div className="space-y-1.5 text-[10px]">
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


                {/* Alerts Toggle */}
                <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${session.color}20` }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMarketAlerts(prev => {
                        const next = new Set(prev);
                        if (next.has(session.id)) {
                          next.delete(session.id);
                        } else {
                          next.add(session.id);
                        }
                        return next;
                      });
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors hover:brightness-110"
                    style={{
                      backgroundColor: marketAlerts.has(session.id) ? `${session.color}25` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${marketAlerts.has(session.id) ? session.color : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-3 h-3" style={{ color: marketAlerts.has(session.id) ? session.color : 'rgba(255,255,255,0.5)' }} />
                      <span className="text-[10px]" style={{ color: marketAlerts.has(session.id) ? session.color : 'rgba(255,255,255,0.6)' }}>
                        Open/Close Alerts
                      </span>
                    </div>
                    <div
                      className="w-8 h-4 rounded-full p-0.5 transition-colors"
                      style={{
                        backgroundColor: marketAlerts.has(session.id) ? session.color : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full bg-white transition-transform duration-200"
                        style={{
                          transform: marketAlerts.has(session.id) ? 'translateX(16px)' : 'translateX(0)',
                        }}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Unified Right Timeline Area - Below Time Scale */}
        <div className="absolute top-10 left-60 right-0 bottom-0 flex flex-col overflow-hidden">
          {/* Each market session gets its own lane */}
          {MARKET_SESSIONS.filter(s => visibleMarkets.has(s.id)).map((session) => {
            const isPreActive = isSessionActiveNow(session, currentTime, "pre");
            const isRegularActive = isSessionActiveNow(session, currentTime, "regular");
            const isPostActive = isSessionActiveNow(session, currentTime, "post");

            return (
              <div
                key={session.id}
                className="flex-1 relative min-h-0 border-b border-border/20 overflow-hidden"
              >
                {/* Alert indicator on timeline lane */}
                {marketAlerts.has(session.id) && (
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${session.color}30`,
                      border: `1px solid ${session.color}`,
                      boxShadow: `0 0 10px ${session.color}50`,
                    }}
                  >
                    <Bell className="w-3.5 h-3.5" style={{ color: session.color }} />
                    <span className="text-[10px] font-bold" style={{ color: session.color }}>ALERTS ON</span>
                  </div>
                )}

                {/* Session Bars - render for visible time range */}
                {(() => {
                  const elements: React.ReactNode[] = [];
                  const timelineWidth = containerWidth - 240; // Timeline area width (minus sidebar)

                  // Check if today is a weekend in this market's timezone
                  const todayIsWeekend = isWeekendInTimezone(session.timezone, currentTime);

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
                      const preStart = getSessionDateTime(baseDate, session.preMarket.start, session.timezone, currentTime);
                      const preEnd = getSessionDateTime(baseDate, session.preMarket.end, session.timezone, currentTime);

                      const preStartX = getTimePosition(preStart, currentTime, timelineWidth) + scrollOffset;
                      const preEndX = getTimePosition(preEnd, currentTime, timelineWidth) + scrollOffset;

                      // Clip to visible area
                      const clippedStartX = Math.max(0, preStartX);
                      const clippedEndX = Math.min(timelineWidth, preEndX);
                      const clippedWidth = clippedEndX - clippedStartX;

                      if (clippedWidth > 20) {
                        const barIsActive = isPreActive && dayOffset === 0;

                        // Calculate TRUE progress based on full session duration
                        const fullSessionWidth = preEndX - preStartX;
                        const sessionDuration = preEnd.getTime() - preStart.getTime();
                        const elapsed = currentTime.getTime() - preStart.getTime();
                        const trueProgress = barIsActive ? Math.max(0, Math.min(100, (elapsed / sessionDuration) * 100)) : 0;
                        const clipStartOffset = clippedStartX - preStartX;

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
                          >
                            {/* Progress fill - dims the passed portion (left of NOW) */}
                            {barIsActive && (
                              <div
                                className="absolute inset-y-0 transition-all duration-300"
                                style={{
                                  left: -clipStartOffset,
                                  width: fullSessionWidth * (trueProgress / 100),
                                  background: `linear-gradient(90deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.4) 90%, transparent 100%)`,
                                }}
                              />
                            )}
                            {/* Progress tick markers - positioned relative to FULL session */}
                            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((percent) => {
                              const markerPosInFull = fullSessionWidth * (percent / 100);
                              const markerPosInClipped = markerPosInFull - clipStartOffset;
                              if (markerPosInClipped < 0 || markerPosInClipped > clippedWidth) return null;

                              // Check if session has completely ended (for today's session)
                              const sessionEnded = dayOffset === 0 && currentTime.getTime() > preEnd.getTime();
                              // Check if this is a past day's session
                              const sessionInPast = dayOffset < 0;
                              const isPassed = (barIsActive && trueProgress >= percent) || sessionEnded || sessionInPast;

                              return (
                                <div
                                  key={percent}
                                  className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                                  style={{
                                    left: markerPosInClipped,
                                    transform: 'translateX(-50%)',
                                  }}
                                >
                                  {/* Label above tick - bright when ahead, dim when passed */}
                                  <span
                                    className="text-[9px] font-mono font-semibold"
                                    style={{
                                      color: isPassed ? `${session.color}40` : session.color,
                                    }}
                                  >
                                    {percent}
                                  </span>
                                  {/* Short tick mark connected to bottom edge */}
                                  <div
                                    style={{
                                      width: 2,
                                      height: 6,
                                      backgroundColor: isPassed ? `${session.color}30` : session.color,
                                      borderRadius: 1,
                                    }}
                                  />
                                </div>
                              );
                            })}
                            {/* Content - centered */}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 px-2">
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wide"
                                style={{ color: `${session.color}${barIsActive ? "" : "90"}` }}
                              >
                                {session.id === "tokyo" ? "AM" : session.id === "sydney" ? "PRE" : "PRE"}
                              </span>
                              {barIsActive && (
                                <span className="text-[9px] font-mono" style={{ color: session.color }}>
                                  {Math.round(trueProgress)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }

                    // Regular session
                    const regularStart = getSessionDateTime(baseDate, session.regular.start, session.timezone, currentTime);
                    const regularEnd = getSessionDateTime(baseDate, session.regular.end, session.timezone, currentTime);

                    const regularStartX = getTimePosition(regularStart, currentTime, timelineWidth) + scrollOffset;
                    const regularEndX = getTimePosition(regularEnd, currentTime, timelineWidth) + scrollOffset;

                    // Clip to visible area
                    const clippedStartX = Math.max(0, regularStartX);
                    const clippedEndX = Math.min(timelineWidth, regularEndX);
                    const clippedWidth = clippedEndX - clippedStartX;

                    if (clippedWidth > 20) {
                      const barIsActive = isRegularActive && dayOffset === 0;
                      const activeColor = session.color;

                      // Calculate TRUE progress based on full session duration (not clipped)
                      const fullSessionWidth = regularEndX - regularStartX;
                      const sessionDuration = regularEnd.getTime() - regularStart.getTime();
                      const elapsed = currentTime.getTime() - regularStart.getTime();
                      const trueProgress = barIsActive ? Math.max(0, Math.min(100, (elapsed / sessionDuration) * 100)) : 0;

                      // Calculate where the clipped area starts relative to full session (for positioning markers)
                      const clipStartOffset = clippedStartX - regularStartX; // How much of the start is cut off

                      // Check if session start is visible (accent line will be shown)
                      const startIsVisible = regularStartX >= 0 && regularStartX <= timelineWidth;
                      // Offset the bar to connect with accent line when start is visible
                      const barLeftOffset = startIsVisible ? 2 : 0;

                      elements.push(
                        <div
                          key={`${session.id}-regular-${dayOffset}`}
                          className={`absolute cursor-pointer transition-all duration-300 hover:brightness-110 hover:z-10 overflow-hidden ${startIsVisible ? 'rounded-r-lg' : 'rounded-lg'}`}
                          style={{
                            left: clippedStartX + barLeftOffset,
                            width: clippedWidth - barLeftOffset,
                            height: "calc(100% - 8px)",
                            top: 4,
                            background: barIsActive
                              ? `linear-gradient(135deg, ${activeColor}35 0%, ${activeColor}20 50%, ${activeColor}30 100%)`
                              : `linear-gradient(135deg, ${session.color}18 0%, ${session.color}12 100%)`,
                            borderTop: `1px solid ${barIsActive ? activeColor : session.color}${barIsActive ? "70" : "30"}`,
                            borderRight: `1px solid ${barIsActive ? activeColor : session.color}${barIsActive ? "70" : "30"}`,
                            borderBottom: `1px solid ${barIsActive ? activeColor : session.color}${barIsActive ? "70" : "30"}`,
                            borderLeft: startIsVisible ? 'none' : `1px solid ${barIsActive ? activeColor : session.color}${barIsActive ? "70" : "30"}`,
                            boxShadow: barIsActive
                              ? `0 0 20px ${activeColor}40, inset 0 1px 0 ${activeColor}30`
                              : `inset 0 1px 0 ${session.color}15`,
                          }}
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
                          {/* Progress fill - dims the passed portion (left of NOW) */}
                          {barIsActive && (
                            <div
                              className="absolute inset-y-0 transition-all duration-300"
                              style={{
                                left: -clipStartOffset,
                                width: fullSessionWidth * (trueProgress / 100),
                                background: `linear-gradient(90deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.5) 90%, transparent 100%)`,
                              }}
                            />
                          )}
                          {/* Progress tick markers at 10%, 20%, 30%, etc. - positioned relative to FULL session */}
                          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((percent) => {
                            // Calculate marker position relative to the clipped view
                            const markerPosInFull = fullSessionWidth * (percent / 100);
                            const markerPosInClipped = markerPosInFull - clipStartOffset;

                            // Only render if marker is within the visible clipped area
                            if (markerPosInClipped < 0 || markerPosInClipped > clippedWidth) return null;

                            // Check if session has completely ended (for today's session)
                            const sessionEnded = dayOffset === 0 && currentTime.getTime() > regularEnd.getTime();
                            // Check if this is a past day's session
                            const sessionInPast = dayOffset < 0;
                            const isPassed = (barIsActive && trueProgress >= percent) || sessionEnded || sessionInPast;

                            return (
                              <div
                                key={percent}
                                className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                                style={{
                                  left: markerPosInClipped,
                                  transform: 'translateX(-50%)',
                                }}
                              >
                                {/* Label above tick - bright when ahead, dim when passed */}
                                <span
                                  className="text-[10px] font-mono font-semibold mb-0.5"
                                  style={{
                                    color: isPassed ? `${session.color}40` : activeColor,
                                  }}
                                >
                                  {percent}
                                </span>
                                {/* Short tick mark connected to bottom edge */}
                                <div
                                  style={{
                                    width: 2,
                                    height: 8,
                                    backgroundColor: isPassed ? `${session.color}30` : activeColor,
                                    borderRadius: 1,
                                  }}
                                />
                              </div>
                            );
                          })}
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
                            {/* Session name and TRUE progress */}
                            <span
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{
                                color: barIsActive ? activeColor : session.color,
                                textShadow: barIsActive ? `0 0 10px ${activeColor}50` : 'none',
                              }}
                            >
                              {session.shortName}
                            </span>
                            {/* Show TRUE progress percentage */}
                            {barIsActive && (
                              <span
                                className="text-xs font-mono font-bold"
                                style={{ color: activeColor }}
                              >
                                {Math.round(trueProgress)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );

                      // Session start accent line - centered on session start time
                      if (regularStartX >= 0 && regularStartX <= timelineWidth) {
                        elements.push(
                          <div
                            key={`${session.id}-regular-start-line-${dayOffset}`}
                            className="absolute pointer-events-none"
                            style={{
                              left: regularStartX - 2, // Center the 4px line
                              width: 4,
                              height: "calc(100% - 8px)",
                              top: 4,
                              backgroundColor: barIsActive ? activeColor : session.color,
                              borderRadius: 2,
                              boxShadow: barIsActive ? `0 0 8px ${activeColor}` : 'none',
                            }}
                          />
                        );
                      }
                    }

                    // Post-market (US only)
                    if (session.postMarket) {
                      const postStart = getSessionDateTime(baseDate, session.postMarket.start, session.timezone, currentTime);
                      const postEnd = getSessionDateTime(baseDate, session.postMarket.end, session.timezone, currentTime);

                      const postStartX = getTimePosition(postStart, currentTime, timelineWidth) + scrollOffset;
                      const postEndX = getTimePosition(postEnd, currentTime, timelineWidth) + scrollOffset;

                      const clippedStartX = Math.max(0, postStartX);
                      const clippedEndX = Math.min(timelineWidth, postEndX);
                      const clippedWidth = clippedEndX - clippedStartX;

                      if (clippedWidth > 20) {
                        const barIsActive = isPostActive && dayOffset === 0;

                        // Calculate TRUE progress based on full session duration
                        const fullSessionWidth = postEndX - postStartX;
                        const sessionDuration = postEnd.getTime() - postStart.getTime();
                        const elapsed = currentTime.getTime() - postStart.getTime();
                        const trueProgress = barIsActive ? Math.max(0, Math.min(100, (elapsed / sessionDuration) * 100)) : 0;
                        const clipStartOffset = clippedStartX - postStartX;

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
                          >
                            {/* Progress fill - dims the passed portion (left of NOW) */}
                            {barIsActive && (
                              <div
                                className="absolute inset-y-0 transition-all duration-300"
                                style={{
                                  left: -clipStartOffset,
                                  width: fullSessionWidth * (trueProgress / 100),
                                  background: `linear-gradient(90deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.4) 90%, transparent 100%)`,
                                }}
                              />
                            )}
                            {/* Progress tick markers - positioned relative to FULL session */}
                            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((percent) => {
                              const markerPosInFull = fullSessionWidth * (percent / 100);
                              const markerPosInClipped = markerPosInFull - clipStartOffset;
                              if (markerPosInClipped < 0 || markerPosInClipped > clippedWidth) return null;

                              // Check if session has completely ended (for today's session)
                              const sessionEnded = dayOffset === 0 && currentTime.getTime() > postEnd.getTime();
                              // Check if this is a past day's session
                              const sessionInPast = dayOffset < 0;
                              const isPassed = (barIsActive && trueProgress >= percent) || sessionEnded || sessionInPast;

                              return (
                                <div
                                  key={percent}
                                  className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                                  style={{
                                    left: markerPosInClipped,
                                    transform: 'translateX(-50%)',
                                  }}
                                >
                                  {/* Label above tick - bright when ahead, dim when passed */}
                                  <span
                                    className="text-[9px] font-mono font-semibold"
                                    style={{
                                      color: isPassed ? `${session.color}40` : session.color,
                                    }}
                                  >
                                    {percent}
                                  </span>
                                  {/* Short tick mark connected to bottom edge */}
                                  <div
                                    style={{
                                      width: 2,
                                      height: 6,
                                      backgroundColor: isPassed ? `${session.color}30` : session.color,
                                      borderRadius: 1,
                                    }}
                                  />
                                </div>
                              );
                            })}
                            {/* Content - centered */}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 px-2">
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wide"
                                style={{ color: `${session.color}${barIsActive ? "" : "90"}` }}
                              >
                                POST
                              </span>
                              {barIsActive && (
                                <span className="text-[9px] font-mono" style={{ color: session.color }}>
                                  {Math.round(trueProgress)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }
                  }

                  // Add alert transition markers if alerts are enabled for this market
                  if (marketAlerts.has(session.id)) {
                    const today = new Date(currentTime);
                    const tzDateStr = today.toLocaleDateString("en-CA", { timeZone: session.timezone });
                    const [year, month, day] = tzDateStr.split("-").map(Number);
                    const baseDate = new Date(year, month - 1, day);

                    // Skip weekends
                    const dayOfWeek = getDayOfWeekInTimezone(baseDate, session.timezone);
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                      // Collect all transition times for this market
                      const transitions: { time: Date; label: string; type: 'open' | 'close' }[] = [];

                      if (session.preMarket) {
                        const preStart = getSessionDateTime(baseDate, session.preMarket.start, session.timezone, currentTime);
                        transitions.push({ time: preStart, label: 'PRE OPEN', type: 'open' });
                      }

                      const regularStart = getSessionDateTime(baseDate, session.regular.start, session.timezone, currentTime);
                      transitions.push({ time: regularStart, label: 'OPEN', type: 'open' });

                      if (session.postMarket) {
                        const postStart = getSessionDateTime(baseDate, session.postMarket.start, session.timezone, currentTime);
                        const postEnd = getSessionDateTime(baseDate, session.postMarket.end, session.timezone, currentTime);
                        transitions.push({ time: postStart, label: 'POST OPEN', type: 'open' });
                        transitions.push({ time: postEnd, label: 'CLOSE', type: 'close' });
                      } else {
                        const regularEnd = getSessionDateTime(baseDate, session.regular.end, session.timezone, currentTime);
                        transitions.push({ time: regularEnd, label: 'CLOSE', type: 'close' });
                      }

                      // Render transition markers
                      transitions.forEach((transition, idx) => {
                        const xPos = getTimePosition(transition.time, currentTime, timelineWidth) + scrollOffset;

                        // Only render if visible
                        if (xPos >= -30 && xPos <= timelineWidth + 30) {
                          const isPast = currentTime > transition.time;

                          const isOpen = transition.type === 'open';

                          elements.push(
                            <div
                              key={`${session.id}-alert-${idx}`}
                              className="absolute z-30 pointer-events-none"
                              style={{
                                left: xPos,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                              }}
                            >
                              {/* Bell icon - centered on xPos */}
                              <div
                                className={`flex items-center justify-center rounded-full ${isPast ? 'bg-background' : ''}`}
                                style={{
                                  width: 18,
                                  height: 18,
                                  backgroundColor: isPast ? undefined : session.color,
                                  border: `1px solid ${isPast ? session.color + '40' : session.color}`,
                                  boxShadow: isPast ? 'none' : `0 0 10px ${session.color}80`,
                                }}
                              >
                                <Bell
                                  className="w-2.5 h-2.5"
                                  style={{ color: isPast ? `${session.color}60` : '#0f172a' }}
                                />
                              </div>
                              {/* Label - positioned left for opens, right for closes */}
                              <span
                                className={`absolute text-[8px] font-bold tracking-wider whitespace-nowrap px-1 rounded ${isPast ? 'bg-background' : ''}`}
                                style={{
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  left: isOpen ? undefined : 'calc(100% + 4px)',
                                  right: isOpen ? 'calc(100% + 4px)' : undefined,
                                  color: isPast ? `${session.color}60` : session.color,
                                  textShadow: isPast ? 'none' : `0 0 6px ${session.color}80`,
                                }}
                              >
                                {transition.label}
                              </span>
                            </div>
                          );
                        }
                      });
                    }
                  }

                  return elements;
                })()}
              </div>
            );
          })}

        {/* Custom Session Tooltip */}
        {hoveredCustomSession && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: Math.min(hoveredCustomSession.x + 12, window.innerWidth - 280),
              top: hoveredCustomSession.y + 12,
            }}
          >
            <div
              className="bg-card border-2 rounded-lg shadow-2xl p-3 min-w-[220px] max-w-[260px]"
              style={{ borderColor: hoveredCustomSession.session.color }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: hoveredCustomSession.session.color }}
                />
                <div>
                  <span className="font-bold text-sm">{hoveredCustomSession.session.name}</span>
                  <div className="text-[10px] text-muted">Custom Session</div>
                </div>
              </div>

              {/* Time range */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted">Time</span>
                <span className="text-sm font-mono font-bold" style={{ color: hoveredCustomSession.session.color }}>
                  {hoveredCustomSession.session.startTime} - {hoveredCustomSession.session.endTime}
                </span>
              </div>

              {/* Recurring info */}
              {hoveredCustomSession.session.recurring && hoveredCustomSession.session.days && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted">Repeats</span>
                  <span className="text-xs font-medium">
                    {hoveredCustomSession.session.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                  </span>
                </div>
              )}

              {/* Progress section (if active) */}
              {hoveredCustomSession.isActive && (
                <>
                  <div className="border-t border-border my-2" />
                  {(() => {
                    const progress = hoveredCustomSession.progress;
                    const remaining = hoveredCustomSession.endTime.getTime() - currentTime.getTime();
                    const hours = Math.floor(remaining / (1000 * 60 * 60));
                    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    const color = hoveredCustomSession.session.color;

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted">Progress</span>
                          <span className="font-bold" style={{ color }}>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-card-hover overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progress}%`, backgroundColor: color }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted">Remaining</span>
                          <span className="font-medium" style={{ color }}>
                            {hours > 0 ? `${hours}h ` : ''}{minutes}m
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Status when not active */}
              {!hoveredCustomSession.isActive && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Status</span>
                    <span className="font-medium" style={{ color: hoveredCustomSession.session.color }}>
                      {currentTime < hoveredCustomSession.startTime ? 'Upcoming' : 'Ended'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

          {/* Economic Events Timeline - Middle Third */}
          {showEventsCard && (
          <div className="flex-1 relative min-h-0 border-b border-border/20 overflow-hidden">
            {/* Empty state when no events */}
            {filteredVisibleEvents.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-500/10 border border-slate-500/20">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-500">No events in next {HOURS_IN_FUTURE} hours</span>
                </div>
              </div>
            )}
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
                  className="absolute flex flex-col items-center transition-opacity"
                  style={{
                    left: xPos,
                    top: yOffset,
                    opacity: isPast ? 0.35 : 1,
                  }}
                >
                  {/* Marker line */}
                  <div
                    className="w-0.5 h-4"
                    style={{ backgroundColor: IMPACT_COLORS[event.impact] }}
                  />

                  {/* Event Card */}
                  <div
                    className="w-44 rounded-lg border shadow-lg p-2 transition-all"
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
          )}

          {/* Custom Sessions & Alerts Timeline - Bottom */}
          {showCustomCard && (
          <div
            className="flex-1 relative min-h-0 border-b border-border/20 overflow-hidden"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setCustomLaneTooltipPos({ x: e.clientX, y: rect.top });
              customLaneHoverTimeout.current = setTimeout(() => {
                setShowCustomLaneTooltip(true);
              }, 3000);
            }}
            onMouseMove={(e) => {
              if (!showCustomLaneTooltip) {
                setCustomLaneTooltipPos({ x: e.clientX, y: e.currentTarget.getBoundingClientRect().top });
              }
            }}
            onMouseLeave={() => {
              if (customLaneHoverTimeout.current) {
                clearTimeout(customLaneHoverTimeout.current);
                customLaneHoverTimeout.current = null;
              }
              setShowCustomLaneTooltip(false);
            }}
          >
            {/* Custom Lane Tooltip */}
            {showCustomLaneTooltip && (
              <div
                className="fixed z-50 px-3 py-2 rounded-lg bg-card border border-purple-500/40 shadow-lg pointer-events-none"
                style={{
                  left: customLaneTooltipPos.x,
                  top: Math.max(50, customLaneTooltipPos.y - 45),
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="text-xs font-medium text-purple-400">
                  Custom: {customSessions.length} session{customSessions.length !== 1 ? 's' : ''}, {customAlerts.length} alert{customAlerts.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
            {/* Custom Sessions */}
            {customSessions.flatMap((session) => {
              const today = new Date(currentTime);
              const todayDay = today.getDay();
              const yesterdayDay = (todayDay + 6) % 7; // Previous day (0-6)

              // Calculate session bar position
              const [startHour, startMin] = session.startTime.split(":").map(Number);
              const [endHour, endMin] = session.endTime.split(":").map(Number);

              const timelineWidth = containerWidth - 240;
              const sessionsToRender: { start: Date; end: Date; key: string }[] = [];

              // Check if this is an overnight session (end time is before start time)
              const isOvernight = endHour < startHour || (endHour === startHour && endMin < startMin);

              if (isOvernight) {
                // For overnight sessions, check each instance separately based on start day
                // 1. Yesterday's start to today's end - check if yesterday was an active day
                const isYesterdayActive = !session.recurring || (session.days?.includes(yesterdayDay) ?? false);
                if (isYesterdayActive) {
                  const yesterdayStart = new Date(today);
                  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                  yesterdayStart.setHours(startHour, startMin, 0, 0);
                  const todayEnd = new Date(today);
                  todayEnd.setHours(endHour, endMin, 0, 0);
                  sessionsToRender.push({ start: yesterdayStart, end: todayEnd, key: `${session.id}-yesterday` });
                }

                // 2. Today's start to tomorrow's end - check if today is an active day
                const isTodayActive = !session.recurring || (session.days?.includes(todayDay) ?? false);
                if (isTodayActive) {
                  const todayStart = new Date(today);
                  todayStart.setHours(startHour, startMin, 0, 0);
                  const tomorrowEnd = new Date(today);
                  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
                  tomorrowEnd.setHours(endHour, endMin, 0, 0);
                  sessionsToRender.push({ start: todayStart, end: tomorrowEnd, key: `${session.id}-today` });
                }
              } else {
                // Regular same-day session - check if today is active
                const isActiveToday = !session.recurring || (session.days?.includes(todayDay) ?? false);
                if (isActiveToday) {
                  const sessionStart = new Date(today);
                  sessionStart.setHours(startHour, startMin, 0, 0);
                  const sessionEnd = new Date(today);
                  sessionEnd.setHours(endHour, endMin, 0, 0);
                  sessionsToRender.push({ start: sessionStart, end: sessionEnd, key: session.id });
                }
              }

              return sessionsToRender.map(({ start: sessionStart, end: sessionEnd, key }) => {
                const startX = getTimePosition(sessionStart, currentTime, timelineWidth) + scrollOffset;
                const endX = getTimePosition(sessionEnd, currentTime, timelineWidth) + scrollOffset;
                const width = endX - startX;

                // Widen visibility range for custom sessions - show if any part could be visible
                // This ensures user-created sessions are more likely to appear
                if (endX < -timelineWidth || startX > timelineWidth * 2) return null;

                const isActive = currentTime >= sessionStart && currentTime <= sessionEnd;
                const progress = isActive
                  ? ((currentTime.getTime() - sessionStart.getTime()) / (sessionEnd.getTime() - sessionStart.getTime())) * 100
                  : 0;

              return (
                <div
                  key={key}
                  className="absolute cursor-pointer group z-10"
                  style={{
                    left: Math.max(0, startX),
                    top: 4,
                    bottom: 4,
                    width: Math.max(80, Math.min(width, timelineWidth - Math.max(0, startX))),
                  }}
                  onClick={() => editSession(session)}
                  onMouseEnter={(e) => {
                    setHoveredCustomSession({
                      session,
                      x: e.clientX,
                      y: e.clientY,
                      isActive,
                      progress,
                      startTime: sessionStart,
                      endTime: sessionEnd,
                    });
                  }}
                  onMouseMove={(e) => {
                    if (hoveredCustomSession?.session.id === session.id) {
                      setHoveredCustomSession(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                    }
                  }}
                  onMouseLeave={() => setHoveredCustomSession(null)}
                >
                  {/* Session bar - fills lane height */}
                  {(() => {
                    // Calculate clipped dimensions for tick markers
                    const clippedStartX = Math.max(0, startX);
                    const clippedEndX = Math.min(timelineWidth, endX);
                    const clippedWidth = clippedEndX - clippedStartX;
                    const fullSessionWidth = endX - startX;
                    const clipStartOffset = clippedStartX - startX;

                    // Check if session has completely ended
                    const sessionEnded = currentTime.getTime() > sessionEnd.getTime();

                    return (
                      <div
                        className="h-full rounded-lg overflow-hidden transition-all group-hover:brightness-110"
                        style={{
                          backgroundColor: `${session.color}20`,
                          border: `1px solid ${session.color}${isActive ? "60" : "40"}`,
                          boxShadow: isActive ? `0 0 12px ${session.color}40` : undefined,
                        }}
                      >
                        {/* Progress dim overlay - dims passed portion */}
                        {isActive && (
                          <div
                            className="absolute inset-y-0 left-0 transition-all"
                            style={{
                              width: `${progress}%`,
                              background: `linear-gradient(90deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.4) 90%, transparent 100%)`,
                            }}
                          />
                        )}
                        {/* Left accent bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                          style={{ backgroundColor: session.color }}
                        />
                        {/* Progress tick markers */}
                        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((percent) => {
                          const markerPosInFull = fullSessionWidth * (percent / 100);
                          const markerPosInClipped = markerPosInFull - clipStartOffset;
                          if (markerPosInClipped < 0 || markerPosInClipped > clippedWidth) return null;

                          const isPassed = (isActive && progress >= percent) || sessionEnded;

                          return (
                            <div
                              key={percent}
                              className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                              style={{
                                left: markerPosInClipped,
                                transform: 'translateX(-50%)',
                              }}
                            >
                              <span
                                className="text-[9px] font-mono font-semibold"
                                style={{
                                  color: isPassed ? `${session.color}40` : session.color,
                                }}
                              >
                                {percent}
                              </span>
                              <div
                                style={{
                                  width: 2,
                                  height: 6,
                                  backgroundColor: isPassed ? `${session.color}30` : session.color,
                                  borderRadius: 1,
                                }}
                              />
                            </div>
                          );
                        })}
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
                    );
                  })()}
                </div>
              );
            });
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

              // Widen visibility range for custom alerts
              if (xPos < -timelineWidth || xPos > timelineWidth * 2) return null;

              const isPast = currentTime > alertTime;
              const alertColor = alert.color || "#a855f7";

              return (
                <div
                  key={alert.id}
                  className="absolute cursor-pointer z-30"
                  style={{
                    left: xPos,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => editAlert(alert)}
                >
                  {/* Bell icon - centered on xPos */}
                  <div
                    className={`flex items-center justify-center rounded-full ${isPast ? 'bg-background' : ''}`}
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: isPast ? undefined : alertColor,
                      border: `2px solid ${isPast ? alertColor + '40' : alertColor}`,
                      boxShadow: isPast ? 'none' : `0 0 10px ${alertColor}80`,
                    }}
                  >
                    <Bell
                      className="w-3 h-3"
                      style={{ color: isPast ? `${alertColor}60` : '#0f172a' }}
                    />
                  </div>
                  {/* Label - positioned to the right */}
                  <span
                    className={`absolute text-[9px] font-bold tracking-wide whitespace-nowrap px-1.5 py-0.5 rounded ${isPast ? 'bg-background' : ''}`}
                    style={{
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: 'calc(100% + 4px)',
                      color: isPast ? `${alertColor}60` : alertColor,
                      textShadow: isPast ? 'none' : `0 0 6px ${alertColor}80`,
                    }}
                  >
                    {alert.name}
                  </span>
                </div>
              );
            })}

            {/* Empty state for timeline area */}
            {customSessions.length === 0 && customAlerts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Settings className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-purple-500">Add sessions or alerts using the Custom card</span>
                </div>
              </div>
            )}
            {/* Message when sessions/alerts exist but none visible in current time window */}
            {(customSessions.length > 0 || customAlerts.length > 0) && (() => {
              // Count how many are actually rendered (visible in time window)
              const timelineWidth = containerWidth - 240;
              const today = new Date(currentTime);
              const todayDay = today.getDay();
              const yesterdayDay = (todayDay + 6) % 7;

              let hasVisibleSession = false;
              for (const session of customSessions) {
                const [startHour, startMin] = session.startTime.split(":").map(Number);
                const [endHour, endMin] = session.endTime.split(":").map(Number);
                const isOvernight = endHour < startHour || (endHour === startHour && endMin < startMin);

                if (isOvernight) {
                  // Check yesterday→today instance
                  const isYesterdayActive = !session.recurring || (session.days?.includes(yesterdayDay) ?? false);
                  if (isYesterdayActive) {
                    const yesterdayStart = new Date(today);
                    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                    yesterdayStart.setHours(startHour, startMin, 0, 0);
                    const todayEnd = new Date(today);
                    todayEnd.setHours(endHour, endMin, 0, 0);
                    const startX = getTimePosition(yesterdayStart, currentTime, timelineWidth) + scrollOffset;
                    const endX = getTimePosition(todayEnd, currentTime, timelineWidth) + scrollOffset;
                    if (!(endX < -timelineWidth || startX > timelineWidth * 2)) {
                      hasVisibleSession = true;
                      break;
                    }
                  }
                  // Check today→tomorrow instance
                  const isTodayActive = !session.recurring || (session.days?.includes(todayDay) ?? false);
                  if (isTodayActive) {
                    const todayStart = new Date(today);
                    todayStart.setHours(startHour, startMin, 0, 0);
                    const tomorrowEnd = new Date(today);
                    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
                    tomorrowEnd.setHours(endHour, endMin, 0, 0);
                    const startX = getTimePosition(todayStart, currentTime, timelineWidth) + scrollOffset;
                    const endX = getTimePosition(tomorrowEnd, currentTime, timelineWidth) + scrollOffset;
                    if (!(endX < -timelineWidth || startX > timelineWidth * 2)) {
                      hasVisibleSession = true;
                      break;
                    }
                  }
                } else {
                  const isActiveToday = !session.recurring || (session.days?.includes(todayDay) ?? false);
                  if (isActiveToday) {
                    const sessionStart = new Date(today);
                    sessionStart.setHours(startHour, startMin, 0, 0);
                    const sessionEnd = new Date(today);
                    sessionEnd.setHours(endHour, endMin, 0, 0);
                    const startX = getTimePosition(sessionStart, currentTime, timelineWidth) + scrollOffset;
                    const endX = getTimePosition(sessionEnd, currentTime, timelineWidth) + scrollOffset;
                    if (!(endX < -timelineWidth || startX > timelineWidth * 2)) {
                      hasVisibleSession = true;
                      break;
                    }
                  }
                }
              }

              let hasVisibleAlert = false;
              if (!hasVisibleSession) {
                for (const alert of customAlerts) {
                  const isActiveToday = !alert.recurring || (alert.days?.includes(todayDay) ?? false);
                  if (!isActiveToday) continue;

                  const [alertHour, alertMin] = alert.time.split(":").map(Number);
                  const alertTime = new Date(today);
                  alertTime.setHours(alertHour, alertMin, 0, 0);
                  const xPos = getTimePosition(alertTime, currentTime, timelineWidth) + scrollOffset;
                  if (!(xPos < -timelineWidth || xPos > timelineWidth * 2)) {
                    hasVisibleAlert = true;
                    break;
                  }
                }
              }

              if (!hasVisibleSession && !hasVisibleAlert) {
                return (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Clock className="w-4 h-4 text-purple-500/60" />
                      <span className="text-sm text-purple-500/60">
                        {customSessions.length} session{customSessions.length !== 1 ? 's' : ''}, {customAlerts.length} alert{customAlerts.length !== 1 ? 's' : ''} — none in visible time window
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          )}

          {/* NOW Line - tech style pointers at session boundaries */}
          {(() => {
            const timelineWidth = containerWidth - 240;
            const nowX = getTimePosition(currentTime, currentTime, timelineWidth) + scrollOffset;
            const visibleSessions = MARKET_SESSIONS.filter(s => visibleMarkets.has(s.id));
            const marketLaneCount = visibleSessions.length;
            // Total flex lanes = market sessions + events lane (if visible) + custom lane (if visible)
            const totalLanes = marketLaneCount + (showEventsCard ? 1 : 0) + (showCustomCard ? 1 : 0);
            // Each market session takes up 1/totalLanes of the height
            const laneHeightPercent = 100 / totalLanes;

            return (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: nowX }}
              >
                {/* NOW label */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-accent text-white text-xs font-bold whitespace-nowrap">
                  NOW
                </div>

                {/* Tech pointers for each market session lane */}
                {visibleSessions.map((session, index) => {
                  const isPreActive = isSessionActiveNow(session, currentTime, "pre");
                  const isRegularActive = isSessionActiveNow(session, currentTime, "regular");
                  const isPostActive = isSessionActiveNow(session, currentTime, "post");
                  const isAnyActive = isPreActive || isRegularActive || isPostActive;
                  const pointerColor = session.color;

                  return (
                    <div
                      key={`now-segment-${session.id}`}
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{
                        top: `calc(${index * laneHeightPercent}% + 8px)`,
                        height: `calc(${laneHeightPercent}% - 16px)`,
                        width: 24,
                      }}
                    >
                      {/* Top dot */}
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          backgroundColor: pointerColor,
                          boxShadow: isAnyActive ? `0 0 6px ${pointerColor}` : undefined,
                        }}
                      />

                      {/* Top bracket pointing down (below dot) */}
                      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 7 }}>
                        <svg width="14" height="8" viewBox="0 0 14 8">
                          <path
                            d="M0 0 L0 3 L7 8 L14 3 L14 0"
                            fill="none"
                            stroke={pointerColor}
                            strokeWidth={isAnyActive ? 2 : 1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: isAnyActive ? `drop-shadow(0 0 3px ${pointerColor})` : undefined }}
                          />
                        </svg>
                      </div>

                      {/* Connecting line - between top and bottom arrows */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          top: 18,
                          bottom: 38,
                          width: isAnyActive ? 2 : 1,
                          background: `linear-gradient(180deg, ${pointerColor} 0%, ${pointerColor}30 50%, ${pointerColor} 100%)`,
                          borderRadius: 1,
                        }}
                      />

                      {/* Bottom dot - matches top dot spacing */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 rounded-full"
                        style={{
                          bottom: 29,
                          width: 6,
                          height: 6,
                          backgroundColor: pointerColor,
                          boxShadow: isAnyActive ? `0 0 6px ${pointerColor}` : undefined,
                        }}
                      />

                      {/* Bottom bracket pointing down (matches top bracket) */}
                      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 20 }}>
                        <svg width="14" height="8" viewBox="0 0 14 8">
                          <path
                            d="M0 0 L0 3 L7 8 L14 3 L14 0"
                            fill="none"
                            stroke={pointerColor}
                            strokeWidth={isAnyActive ? 2 : 1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: isAnyActive ? `drop-shadow(0 0 3px ${pointerColor})` : undefined }}
                          />
                        </svg>
                      </div>

                      {/* Line from arrow down towards progress markers */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          bottom: 7,
                          height: 10,
                          width: isAnyActive ? 2 : 1,
                          backgroundColor: pointerColor,
                          opacity: 0.6,
                          borderRadius: 1,
                        }}
                      />
                    </div>
                  );
                })}

                {/* Tech pointers for Events lane */}
                {showEventsCard && (() => {
                  const eventsColor = "#64748b";
                  return (
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{
                        top: `calc(${marketLaneCount * laneHeightPercent}% + 8px)`,
                        height: `calc(${laneHeightPercent}% - 16px)`,
                        width: 24,
                      }}
                    >
                      {/* Top dot */}
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                        style={{ width: 6, height: 6, backgroundColor: eventsColor }}
                      />
                      {/* Top bracket pointing down */}
                      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 7 }}>
                        <svg width="14" height="8" viewBox="0 0 14 8">
                          <path d="M0 0 L0 3 L7 8 L14 3 L14 0" fill="none" stroke={eventsColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      {/* Connecting line */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          top: 18,
                          bottom: 18,
                          width: 1,
                          background: `linear-gradient(180deg, ${eventsColor} 0%, ${eventsColor}30 50%, ${eventsColor} 100%)`,
                          borderRadius: 1,
                        }}
                      />
                      {/* Bottom bracket pointing up */}
                      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 7 }}>
                        <svg width="14" height="8" viewBox="0 0 14 8">
                          <path d="M0 8 L0 5 L7 0 L14 5 L14 8" fill="none" stroke={eventsColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      {/* Bottom dot */}
                      <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                        style={{ width: 6, height: 6, backgroundColor: eventsColor }}
                      />
                    </div>
                  );
                })()}

                {/* Tech pointers for Custom lane */}
                {showCustomCard && (() => {
                  const customColor = "#a855f7";
                  const customLaneIndex = marketLaneCount + (showEventsCard ? 1 : 0);

                  // Check if any custom session is currently active
                  const hasActiveCustomSession = customSessions.some(session => {
                    const today = new Date(currentTime);
                    const todayDay = today.getDay();
                    const isActiveToday = !session.recurring || (session.days?.includes(todayDay) ?? false);
                    if (!isActiveToday) return false;

                    const [startHour, startMin] = session.startTime.split(":").map(Number);
                    const [endHour, endMin] = session.endTime.split(":").map(Number);
                    const sessionStart = new Date(today);
                    sessionStart.setHours(startHour, startMin, 0, 0);
                    const sessionEnd = new Date(today);
                    sessionEnd.setHours(endHour, endMin, 0, 0);

                    return currentTime >= sessionStart && currentTime <= sessionEnd;
                  });

                  return (
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{
                        top: `calc(${customLaneIndex * laneHeightPercent}% + 8px)`,
                        height: `calc(${laneHeightPercent}% - 16px)`,
                        width: 24,
                      }}
                    >
                      {/* Top dot */}
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          backgroundColor: customColor,
                          boxShadow: hasActiveCustomSession ? `0 0 6px ${customColor}` : undefined,
                        }}
                      />
                      {/* Top bracket pointing down */}
                      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 7 }}>
                        <svg width="14" height="8" viewBox="0 0 14 8">
                          <path
                            d="M0 0 L0 3 L7 8 L14 3 L14 0"
                            fill="none"
                            stroke={customColor}
                            strokeWidth={hasActiveCustomSession ? 2 : 1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: hasActiveCustomSession ? `drop-shadow(0 0 3px ${customColor})` : undefined }}
                          />
                        </svg>
                      </div>
                      {/* Connecting line - between top and bottom arrows */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          top: 18,
                          bottom: 38,
                          width: hasActiveCustomSession ? 2 : 1,
                          background: `linear-gradient(180deg, ${customColor} 0%, ${customColor}30 50%, ${customColor} 100%)`,
                          borderRadius: 1,
                        }}
                      />
                      {/* Bottom dot - matches top dot spacing */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 rounded-full"
                        style={{
                          bottom: 29,
                          width: 6,
                          height: 6,
                          backgroundColor: customColor,
                          boxShadow: hasActiveCustomSession ? `0 0 6px ${customColor}` : undefined,
                        }}
                      />
                      {/* Bottom bracket pointing down (matches top bracket) */}
                      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 20 }}>
                        <svg width="14" height="8" viewBox="0 0 14 8">
                          <path
                            d="M0 0 L0 3 L7 8 L14 3 L14 0"
                            fill="none"
                            stroke={customColor}
                            strokeWidth={hasActiveCustomSession ? 2 : 1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: hasActiveCustomSession ? `drop-shadow(0 0 3px ${customColor})` : undefined }}
                          />
                        </svg>
                      </div>
                      {/* Line from arrow down towards progress markers */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          bottom: 7,
                          height: 10,
                          width: hasActiveCustomSession ? 2 : 1,
                          backgroundColor: customColor,
                          opacity: 0.6,
                          borderRadius: 1,
                        }}
                      />
                    </div>
                  );
                })()}
              </div>
            );
          })()}
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

              {/* Color picker */}
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
                        boxShadow: formColor === color.value
                          ? `0 0 0 2px var(--card), 0 0 0 4px ${color.value}`
                          : undefined,
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

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

      {/* Events List Modal */}
      {showEventsListModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowEventsListModal(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <h2 className="text-lg font-semibold">Today's Events</h2>
                  <p className="text-xs text-muted">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEventsListModal(false)}
                className="p-1 rounded hover:bg-card-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto p-4">
              {todaysEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-muted">No events found for today</p>
                  <p className="text-xs text-muted/60 mt-1">Try adjusting your impact filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysEvents
                    .sort((a, b) => {
                      const timeA = new Date(`${a.date}T${a.time || "00:00"}:00`).getTime();
                      const timeB = new Date(`${b.date}T${b.time || "00:00"}:00`).getTime();
                      return timeA - timeB;
                    })
                    .map((event, index) => {
                      const eventTime = new Date(`${event.date}T${event.time || "00:00"}:00`);
                      const isPast = eventTime < currentTime;
                      const impactColor = event.impact === "high" ? "#EF4444" : event.impact === "medium" ? "#F59E0B" : "#10B981";

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border transition-colors ${
                            isPast
                              ? 'bg-white/5 border-white/10 opacity-60'
                              : 'bg-white/10 border-white/20 hover:bg-white/15'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Impact indicator */}
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: impactColor }}
                            />

                            {/* Event details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{event.title}</span>
                                <span
                                  className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase"
                                  style={{
                                    backgroundColor: `${impactColor}20`,
                                    color: impactColor,
                                  }}
                                >
                                  {event.impact}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {event.time || "All Day"}
                                </span>
                                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                                  {event.currency}
                                </span>
                                {event.category && (
                                  <span className="text-[10px] text-white/50">{event.category}</span>
                                )}
                              </div>

                              {/* Forecast/Previous if available */}
                              {(event.forecast || event.previous) && (
                                <div className="flex gap-4 mt-2 text-[10px]">
                                  {event.forecast && (
                                    <span className="text-white/60">
                                      Forecast: <span className="text-white/80 font-mono">{event.forecast}</span>
                                    </span>
                                  )}
                                  {event.previous && (
                                    <span className="text-white/60">
                                      Previous: <span className="text-white/80 font-mono">{event.previous}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Time until/since */}
                            <div className="text-right flex-shrink-0">
                              {isPast ? (
                                <span className="text-[10px] text-white/40">Past</span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-300">
                                  {(() => {
                                    const diff = eventTime.getTime() - currentTime.getTime();
                                    const hours = Math.floor(diff / (1000 * 60 * 60));
                                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                    if (hours > 0) return `${hours}h ${minutes}m`;
                                    return `${minutes}m`;
                                  })()}
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

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50 flex-shrink-0">
              <div className="text-xs text-muted">
                {filteredVisibleEvents.length} event{filteredVisibleEvents.length !== 1 ? 's' : ''} total
              </div>
              <button
                onClick={() => setShowEventsListModal(false)}
                className="px-4 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-card-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
