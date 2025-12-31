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

// Tooltip content type for structured tooltips
interface TooltipContent {
  title: string;
  description: string;
  details?: { label: string; value: string; color?: string }[];
  formula?: string;
  tip?: string;
}

// Tooltip Component - clean, visual design
const Tooltip = ({ children, content }: { children: React.ReactNode; content: TooltipContent }) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 240;
    const tooltipHeight = 200;
    const padding = 12;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.bottom + padding;

    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = rect.top - tooltipHeight - padding;
    }

    setTooltipStyle({ left, top, position: 'fixed' });
    setIsVisible(true);
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div
        style={tooltipStyle}
        className={`fixed w-[240px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden transition-all duration-200 z-[9999] pointer-events-none ${
          isVisible ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {/* Title */}
        <div className="px-3 py-2 border-b border-border/50">
          <h4 className="text-sm font-semibold text-foreground">{content.title}</h4>
        </div>

        {/* Body */}
        <div className="p-3">
          <p className="text-xs text-muted leading-relaxed mb-3">{content.description}</p>

          {/* Details - card style */}
          {content.details && content.details.length > 0 && (
            <div className="space-y-2">
              {content.details.map((detail, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{detail.label}</span>
                  <span className={`text-sm font-semibold ${detail.color || "text-foreground"}`}>{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          {content.tip && (
            <div className="mt-3 pt-2 border-t border-border/50">
              <p className="text-[11px] text-muted/80">{content.tip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Info icon button for tooltips
const InfoTip = ({ content }: { content: TooltipContent }) => (
  <Tooltip content={content}>
    <HelpCircle className="w-3.5 h-3.5 text-muted/50 hover:text-accent-light cursor-help ml-1 flex-shrink-0 transition-colors" />
  </Tooltip>
);

// Circular Progress Ring Component
interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
  label: string;
}

const CircularProgress = ({
  percentage,
  size = 120,
  strokeWidth = 10,
  color,
  bgColor = "rgba(255,255,255,0.1)",
  label
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{clampedPercentage.toFixed(0)}%</span>
        <span className="text-[10px] text-muted">{label}</span>
      </div>
    </div>
  );
};

// Compact Stat Component for summary bar
const CompactStat = ({ label, value, count }: { label: string; value: number; count?: number }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-muted">{label}</span>
    <span className={`font-bold ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
      {value >= 0 ? "+" : ""}${value.toFixed(0)}
    </span>
    {count !== undefined && <span className="text-[10px] text-muted">({count})</span>}
  </div>
);

// Goal settings interface
interface TradingGoals {
  yearlyPnlGoal: number;
  monthlyPnlGoal: number;
  startingEquity: number;
}

// Equity curve data point type
interface EquityDataPoint {
  date: string;
  dateEnd?: string; // For weekly aggregation, the end date of the week
  pnl: number;
  cumulative: number;
  drawdown: number;
  drawdownPercent: number;
  tradeCount: number; // Number of trades in this period
  tradeIndex?: number; // For WTD individual trade display
}

// Equity Curve Chart Component with hover info panel
interface EquityCurveChartProps {
  data: EquityDataPoint[];
  dateRange?: { start: string; end: string } | null;
  period?: "all" | "ytd" | "mtd" | "wtd" | "daily";
  startingEquity?: number;
}

const EquityCurveChart = ({ data, dateRange, period = "all", startingEquity = 0 }: EquityCurveChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const chartRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  // Helper to get day number from a date string (YYYY-MM-DD)
  const getDayOfRange = (dateStr: string): number => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  // Helper to get the start of week (Sunday) for a date
  const getWeekStartFromDate = (date: Date): Date => {
    const result = new Date(date);
    result.setDate(date.getDate() - date.getDay());
    return result;
  };

  // Calculate total days/weeks in range for calendar-based positioning
  const hasCalendarRange = dateRange !== null && dateRange !== undefined;
  const rangeStartTime = hasCalendarRange ? getDayOfRange(dateRange.start) : 0;
  const rangeEndTime = hasCalendarRange ? getDayOfRange(dateRange.end) : 0;
  const totalRangeDays = hasCalendarRange ? Math.round((rangeEndTime - rangeStartTime) / (1000 * 60 * 60 * 24)) + 1 : data.length;

  // For YTD, calculate week-based positioning
  const isYtdWeekly = period === 'ytd';
  const weekStartTime = isYtdWeekly && hasCalendarRange
    ? getWeekStartFromDate(new Date(dateRange.start)).getTime()
    : rangeStartTime;
  const weekEndTime = isYtdWeekly && hasCalendarRange
    ? getDayOfRange(dateRange.end)
    : rangeEndTime;
  const totalRangeWeeks = isYtdWeekly && hasCalendarRange
    ? Math.ceil((weekEndTime - weekStartTime) / (7 * 24 * 60 * 60 * 1000)) + 1
    : 1;

  // Get X position as percentage (0-100) for a given date
  const getXPercent = (dateStr: string, index: number): number => {
    if (hasCalendarRange) {
      if (isYtdWeekly) {
        // For YTD with weekly aggregation, position based on week number
        const dateTime = getDayOfRange(dateStr);
        const weekIndex = Math.floor((dateTime - weekStartTime) / (7 * 24 * 60 * 60 * 1000));
        return ((weekIndex + 0.5) / totalRangeWeeks) * 100;
      }
      if (period === 'wtd') {
        // For WTD, simple sequential positioning - each trade gets equal space
        return ((index + 0.5) / data.length) * 100;
      }
      const dateTime = getDayOfRange(dateStr);
      const dayIndex = Math.round((dateTime - rangeStartTime) / (1000 * 60 * 60 * 24));
      // Position at the day within the range (0 to totalRangeDays-1), centered in each day slot
      return ((dayIndex + 0.5) / totalRangeDays) * 100;
    }
    // Original behavior: position based on index
    return ((index + 1) / data.length) * 100;
  };

  // Update chart dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartAreaRef.current) {
        setChartDimensions({
          width: chartAreaRef.current.offsetWidth,
          height: chartAreaRef.current.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (data.length === 0) return null;

  const values = data.map(d => d.cumulative);
  // Use startingEquity as the baseline (zero point)
  const minVal = Math.min(...values, startingEquity);
  const maxVal = Math.max(...values, startingEquity);
  const range = maxVal - minVal || 1;

  // Calculate nice round numbers for the grid
  const niceNum = (value: number, round: boolean): number => {
    const exp = Math.floor(Math.log10(Math.abs(value) || 1));
    const fraction = value / Math.pow(10, exp);
    let niceFraction: number;
    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }
    return niceFraction * Math.pow(10, exp);
  };

  // Find nice min/max and step
  const niceRange = niceNum(range || 1, false);
  const gridStep = niceNum(niceRange / 5, true);
  const niceMin = Math.floor(minVal / gridStep) * gridStep;
  const niceMax = Math.ceil(maxVal / gridStep) * gridStep;

  // Use nice values for the chart bounds
  const min = niceMin - gridStep * 0.5;
  const max = niceMax + gridStep * 0.5;
  const totalRange = max - min;

  // Generate grid values from nice numbers
  const gridValues: number[] = [];
  for (let v = niceMax; v >= niceMin; v -= gridStep) {
    gridValues.push(v);
  }

  // Get date labels (first, middle, last)
  const dateLabels = data.length >= 3
    ? [data[0].date, data[Math.floor(data.length / 2)].date, data[data.length - 1].date]
    : data.map(d => d.date);

  // Chart margins for labels
  const marginLeft = 55;
  const marginRight = 10;
  const marginBottom = 24;
  const marginTop = 10;

  // Find peaks (new all-time highs)
  const peakIndices: number[] = [];
  let runningPeak = -Infinity;
  data.forEach((d, i) => {
    if (d.cumulative > runningPeak) {
      runningPeak = d.cumulative;
      peakIndices.push(i);
    }
  });

  // Find troughs - the lowest point between two consecutive peaks
  // A trough is the minimum equity point before making a new all-time high
  const troughIndices: number[] = [];
  for (let p = 1; p < peakIndices.length; p++) {
    const prevPeakIdx = peakIndices[p - 1];
    const currPeakIdx = peakIndices[p];

    // Find the lowest point between these two peaks
    let minIdx = prevPeakIdx;
    let minValue = data[prevPeakIdx].cumulative;

    for (let i = prevPeakIdx + 1; i < currPeakIdx; i++) {
      if (data[i].cumulative < minValue) {
        minValue = data[i].cumulative;
        minIdx = i;
      }
    }

    // Only mark as trough if it's actually lower than the previous peak
    // (there was a real drawdown, not just flat)
    if (minIdx !== prevPeakIdx && data[minIdx].cumulative < data[prevPeakIdx].cumulative) {
      troughIndices.push(minIdx);
    }
  }

  // Find max drawdown point
  const maxDDIndex = data.reduce((maxIdx, d, i, arr) =>
    d.drawdownPercent > arr[maxIdx].drawdownPercent ? i : maxIdx, 0);
  const maxDDPoint = data[maxDDIndex];

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!chartRef.current || data.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const chartLeft = marginLeft;
    const chartWidth = rect.width - marginLeft - marginRight;
    const relativeX = e.clientX - rect.left - chartLeft;

    if (relativeX < 0 || relativeX > chartWidth) {
      setHoveredIndex(null);
      return;
    }

    const xPercent = (relativeX / chartWidth) * 100;

    // Find the closest data point to the mouse position
    let closestIndex = 0;
    let closestDistance = Infinity;
    data.forEach((d, i) => {
      const pointX = getXPercent(d.date, i);
      const distance = Math.abs(pointX - xPercent);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });

    setHoveredIndex(closestIndex);
  };

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;
  const lastData = data[data.length - 1];
  const displayData = hoveredData || lastData;
  const isHovering = hoveredIndex !== null;

  // Calculate pixel position for a data point
  const getPixelPos = (index: number, d: EquityDataPoint) => {
    const xPct = getXPercent(d.date, index) / 100;
    const yPercent = (max - d.cumulative) / totalRange;
    return {
      x: xPct * chartDimensions.width,
      y: yPercent * chartDimensions.height,
    };
  };

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div
        ref={chartRef}
        className="h-52 relative cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <div className="w-full h-full">
          {/* Y-axis labels */}
          <div className="absolute left-0 w-[50px] text-[10px] text-muted" style={{ top: marginTop, bottom: marginBottom }}>
            {gridValues.map((val, i) => {
              const yPercent = ((max - val) / totalRange) * 100;
              return (
                <span
                  key={i}
                  className="absolute right-0 pr-2 -translate-y-1/2"
                  style={{ top: `${yPercent}%` }}
                >
                  {val >= 0 ? "$" : "-$"}{Math.abs(val).toFixed(0)}
                </span>
              );
            })}
          </div>

          {/* Chart area container for measuring */}
          <div
            ref={chartAreaRef}
            className="absolute"
            style={{ left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }}
          >
            {/* SVG for lines and areas */}
            <svg
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <defs>
                {/* Gradient for drawdown area */}
                <linearGradient id="drawdownGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#ef4444" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                </linearGradient>
                {/* Gradient for equity fill */}
                <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {gridValues.map((val, i) => {
                const yPercent = ((max - val) / totalRange) * 100;
                return (
                  <line
                    key={`h${i}`}
                    x1="0"
                    y1={`${yPercent}`}
                    x2="100"
                    y2={`${yPercent}`}
                    stroke="currentColor"
                    strokeOpacity="0.15"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {/* Vertical grid lines - calendar-based for MTD/WTD/YTD */}
              {hasCalendarRange ? (
                isYtdWeekly ? (
                  // For YTD, show grid lines for each week
                  Array.from({ length: totalRangeWeeks }, (_, i) => {
                    const xPos = ((i + 0.5) / totalRangeWeeks) * 100;
                    // Show every 4th week more prominently
                    const isEvery4th = i % 4 === 0;
                    return (
                      <line
                        key={`v${i}`}
                        x1={xPos}
                        y1="0"
                        x2={xPos}
                        y2="100"
                        stroke="currentColor"
                        strokeOpacity={isEvery4th ? "0.12" : "0.04"}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })
                ) : period === 'wtd' ? (
                  // For WTD, simple grid - line per trade + day separators
                  (() => {
                    const elements: React.ReactNode[] = [];
                    let lastDate = '';

                    data.forEach((d, i) => {
                      const xPos = ((i + 0.5) / data.length) * 100;

                      // Day separator line when date changes
                      if (lastDate && d.date !== lastDate) {
                        const sepX = (i / data.length) * 100;
                        elements.push(
                          <line
                            key={`sep${i}`}
                            x1={sepX}
                            y1="0"
                            x2={sepX}
                            y2="100"
                            stroke="currentColor"
                            strokeOpacity="0.25"
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      }

                      // Light line for each trade
                      elements.push(
                        <line
                          key={`trade${i}`}
                          x1={xPos}
                          y1="0"
                          x2={xPos}
                          y2="100"
                          stroke="currentColor"
                          strokeOpacity="0.08"
                          vectorEffect="non-scaling-stroke"
                        />
                      );

                      lastDate = d.date;
                    });

                    return elements;
                  })()
                ) : (
                  // Show grid lines for each day in the range (MTD, All)
                  Array.from({ length: totalRangeDays }, (_, i) => {
                    const xPos = ((i + 0.5) / totalRangeDays) * 100;
                    return (
                      <line
                        key={`v${i}`}
                        x1={xPos}
                        y1="0"
                        x2={xPos}
                        y2="100"
                        stroke="currentColor"
                        strokeOpacity="0.06"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })
                )
              ) : (
                [0, 25, 50, 75, 100].map((x) => (
                  <line
                    key={`v${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="100"
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    vectorEffect="non-scaling-stroke"
                  />
                ))
              )}

              {/* Baseline (starting equity) line */}
              {minVal < startingEquity && maxVal > startingEquity && (
                <line
                  x1="0"
                  y1={`${((max - startingEquity) / totalRange) * 100}`}
                  x2="100"
                  y2={`${((max - startingEquity) / totalRange) * 100}`}
                  stroke="#888"
                  strokeOpacity="0.5"
                  strokeDasharray="4 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Equity fill area - angled lines from previous period to trade */}
              <path
                d={(() => {
                  const baselineY = ((max - startingEquity) / totalRange) * 100;
                  let path = `M 0 ${baselineY}`;
                  let lastY = baselineY;

                  data.forEach((d, i) => {
                    const currX = getXPercent(d.date, i);
                    const currY = ((max - d.cumulative) / totalRange) * 100;

                    if (period === 'wtd') {
                      // For WTD, draw directly from previous trade to current trade
                      path += ` L ${currX} ${currY}`;
                    } else {
                      // For other periods, do horizontal step then diagonal
                      let prevPeriodX: number;
                      if (hasCalendarRange && dateRange) {
                        const tradeDateMs = getDayOfRange(d.date);
                        if (isYtdWeekly) {
                          const prevWeekMs = tradeDateMs - (7 * 24 * 60 * 60 * 1000);
                          const prevWeekIndex = Math.floor((prevWeekMs - weekStartTime) / (7 * 24 * 60 * 60 * 1000));
                          prevPeriodX = ((Math.max(0, prevWeekIndex) + 0.5) / totalRangeWeeks) * 100;
                        } else {
                          const prevDayMs = tradeDateMs - (24 * 60 * 60 * 1000);
                          const prevDayIndex = Math.round((prevDayMs - rangeStartTime) / (1000 * 60 * 60 * 24));
                          prevPeriodX = ((Math.max(0, prevDayIndex) + 0.5) / totalRangeDays) * 100;
                        }
                      } else {
                        prevPeriodX = i === 0 ? 0 : getXPercent(data[i - 1].date, i - 1);
                      }
                      path += ` L ${prevPeriodX} ${lastY}`;
                      path += ` L ${currX} ${currY}`;
                    }
                    lastY = currY;
                  });

                  // Extend to end of chart (flat line from last trade)
                  path += ` L 100 ${lastY}`;
                  // Close the path for fill
                  path += ` L 100 100 L 0 100 Z`;
                  return path;
                })()}
                fill="url(#equityGradient)"
              />

              {/* Drawdown area - between peak line and equity line */}
              <path
                d={(() => {
                  const baselineY = ((max - startingEquity) / totalRange) * 100;
                  // Build the top edge (peak line)
                  let topPath = `M 0 ${baselineY}`;
                  let runningPeak = startingEquity;
                  let lastPeakY = baselineY;

                  data.forEach((d, i) => {
                    const currX = getXPercent(d.date, i);
                    runningPeak = Math.max(runningPeak, d.cumulative);
                    const peakY = ((max - runningPeak) / totalRange) * 100;

                    if (period === 'wtd') {
                      // For WTD, draw directly to current position
                      topPath += ` L ${currX} ${peakY}`;
                    } else {
                      // For other periods, do horizontal step then diagonal
                      let prevPeriodX: number;
                      if (hasCalendarRange && dateRange) {
                        const tradeDateMs = getDayOfRange(d.date);
                        if (isYtdWeekly) {
                          const prevWeekMs = tradeDateMs - (7 * 24 * 60 * 60 * 1000);
                          const prevWeekIndex = Math.floor((prevWeekMs - weekStartTime) / (7 * 24 * 60 * 60 * 1000));
                          prevPeriodX = ((Math.max(0, prevWeekIndex) + 0.5) / totalRangeWeeks) * 100;
                        } else {
                          const prevDayMs = tradeDateMs - (24 * 60 * 60 * 1000);
                          const prevDayIndex = Math.round((prevDayMs - rangeStartTime) / (1000 * 60 * 60 * 24));
                          prevPeriodX = ((Math.max(0, prevDayIndex) + 0.5) / totalRangeDays) * 100;
                        }
                      } else {
                        prevPeriodX = i === 0 ? 0 : getXPercent(data[i - 1].date, i - 1);
                      }
                      topPath += ` L ${prevPeriodX} ${lastPeakY}`;
                      topPath += ` L ${currX} ${peakY}`;
                    }
                    lastPeakY = peakY;
                  });

                  topPath += ` L 100 ${lastPeakY}`;

                  // Build the bottom edge (equity line, reversed)
                  let bottomPath = '';
                  const lastEquityY = data.length > 0 ? ((max - data[data.length - 1].cumulative) / totalRange) * 100 : baselineY;
                  bottomPath += ` L 100 ${lastEquityY}`;

                  for (let i = data.length - 1; i >= 0; i--) {
                    const d = data[i];
                    const currX = getXPercent(d.date, i);
                    const currY = ((max - d.cumulative) / totalRange) * 100;
                    const prevCumulative = i === 0 ? startingEquity : data[i - 1].cumulative;
                    const prevY = ((max - prevCumulative) / totalRange) * 100;

                    // Calculate previous position
                    let prevPeriodX: number;
                    if (period === 'wtd') {
                      prevPeriodX = i === 0 ? 0 : getXPercent(data[i - 1].date, i - 1);
                    } else if (hasCalendarRange && dateRange) {
                      const tradeDateMs = getDayOfRange(d.date);
                      if (isYtdWeekly) {
                        const prevWeekMs = tradeDateMs - (7 * 24 * 60 * 60 * 1000);
                        const prevWeekIndex = Math.floor((prevWeekMs - weekStartTime) / (7 * 24 * 60 * 60 * 1000));
                        prevPeriodX = ((Math.max(0, prevWeekIndex) + 0.5) / totalRangeWeeks) * 100;
                      } else {
                        const prevDayMs = tradeDateMs - (24 * 60 * 60 * 1000);
                        const prevDayIndex = Math.round((prevDayMs - rangeStartTime) / (1000 * 60 * 60 * 24));
                        prevPeriodX = ((Math.max(0, prevDayIndex) + 0.5) / totalRangeDays) * 100;
                      }
                    } else {
                      prevPeriodX = i === 0 ? 0 : getXPercent(data[i - 1].date, i - 1);
                    }

                    if (period === 'wtd') {
                      // For WTD, draw directly between trades
                      bottomPath += ` L ${currX} ${currY}`;
                    } else {
                      bottomPath += ` L ${currX} ${currY}`;
                      bottomPath += ` L ${prevPeriodX} ${prevY}`;
                    }
                  }
                  bottomPath += ` L 0 ${baselineY}`;

                  return topPath + bottomPath + ' Z';
                })()}
                fill="url(#drawdownGradient)"
              />

              {/* Initial flat gray line from start to first trade */}
              {hasCalendarRange && period !== 'wtd' && data.length > 0 && (() => {
                const firstTradeDateMs = getDayOfRange(data[0].date);
                let prevPeriodX: number;

                if (isYtdWeekly) {
                  const prevWeekMs = firstTradeDateMs - (7 * 24 * 60 * 60 * 1000);
                  const prevWeekIndex = Math.floor((prevWeekMs - weekStartTime) / (7 * 24 * 60 * 60 * 1000));
                  prevPeriodX = ((Math.max(0, prevWeekIndex) + 0.5) / totalRangeWeeks) * 100;
                } else {
                  const prevDayMs = firstTradeDateMs - (24 * 60 * 60 * 1000);
                  const prevDayIndex = Math.round((prevDayMs - rangeStartTime) / (1000 * 60 * 60 * 24));
                  prevPeriodX = ((Math.max(0, prevDayIndex) + 0.5) / totalRangeDays) * 100;
                }
                const baselineY = ((max - startingEquity) / totalRange) * 100;

                return prevPeriodX > 0 ? (
                  <line
                    x1="0"
                    y1={baselineY}
                    x2={prevPeriodX}
                    y2={baselineY}
                    stroke="#6b7280"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null;
              })()}

              {/* Flat gray lines between trades + colored diagonal lines to trades */}
              {data.map((d, i) => {
                const prevCumulative = i === 0 ? startingEquity : data[i - 1].cumulative;
                const currX = getXPercent(d.date, i);
                const currY = ((max - d.cumulative) / totalRange) * 100;
                const prevY = ((max - prevCumulative) / totalRange) * 100;
                const isUp = d.pnl >= 0;

                // Calculate previous period's X position (day or week before the trade)
                let prevPeriodX: number;
                // Calculate previous trade's X position (or 0 for first trade)
                let prevTradeX: number;

                if (period === 'wtd') {
                  // For WTD, draw directly from previous trade to current trade
                  prevPeriodX = i === 0 ? 0 : getXPercent(data[i - 1].date, i - 1);
                  prevTradeX = prevPeriodX;
                } else if (hasCalendarRange && dateRange) {
                  const tradeDateMs = getDayOfRange(d.date);

                  if (isYtdWeekly) {
                    // For YTD with weekly aggregation, get the previous week
                    const prevWeekMs = tradeDateMs - (7 * 24 * 60 * 60 * 1000);
                    const prevWeekIndex = Math.floor((prevWeekMs - weekStartTime) / (7 * 24 * 60 * 60 * 1000));
                    prevPeriodX = ((Math.max(0, prevWeekIndex) + 0.5) / totalRangeWeeks) * 100;
                  } else {
                    // For other periods, get the day before
                    const prevDayMs = tradeDateMs - (24 * 60 * 60 * 1000);
                    const prevDayIndex = Math.round((prevDayMs - rangeStartTime) / (1000 * 60 * 60 * 24));
                    prevPeriodX = ((Math.max(0, prevDayIndex) + 0.5) / totalRangeDays) * 100;
                  }
                  prevTradeX = i === 0 ? 0 : getXPercent(data[i - 1].date, i - 1);
                } else {
                  prevPeriodX = i === 0 ? 0 : getXPercent(data[i - 1].date, i - 1);
                  prevTradeX = prevPeriodX;
                }

                return (
                  <g key={`seg-${i}`}>
                    {/* Flat gray line from previous trade to period before this trade */}
                    {hasCalendarRange && prevTradeX < prevPeriodX && (
                      <line
                        x1={prevTradeX}
                        y1={prevY}
                        x2={prevPeriodX}
                        y2={prevY}
                        stroke="#6b7280"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    {/* Diagonal colored line from previous period to trade */}
                    <line
                      x1={prevPeriodX}
                      y1={prevY}
                      x2={currX}
                      y2={currY}
                      stroke={isUp ? "#34d399" : "#ef4444"}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}

              {/* Trailing flat gray line from last trade to end of chart */}
              {period !== 'wtd' && data.length > 0 && (
                <line
                  x1={getXPercent(data[data.length - 1].date, data.length - 1)}
                  y1={((max - data[data.length - 1].cumulative) / totalRange) * 100}
                  x2="100"
                  y2={((max - data[data.length - 1].cumulative) / totalRange) * 100}
                  stroke="#6b7280"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Hover indicator line */}
              {hoveredIndex !== null && (
                <line
                  x1={`${getXPercent(data[hoveredIndex].date, hoveredIndex)}`}
                  y1="0"
                  x2={`${getXPercent(data[hoveredIndex].date, hoveredIndex)}`}
                  y2="100"
                  stroke="#fff"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* Data point dots - rendered as divs to avoid stretching */}
            {chartDimensions.width > 0 && data.map((d, i) => {
              const pos = getPixelPos(i, d);
              const isUp = d.pnl >= 0;
              const isPeak = peakIndices.includes(i);
              const isTrough = troughIndices.includes(i);
              const isHovered = hoveredIndex === i;

              return (
                <div
                  key={`dot-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Regular dot */}
                  <div
                    className={`rounded-full ${isHovered ? 'ring-2 ring-white' : ''}`}
                    style={{
                      width: isHovered ? 10 : 7,
                      height: isHovered ? 10 : 7,
                      backgroundColor: isUp ? '#34d399' : '#ef4444',
                      opacity: isHovered ? 1 : 0.9,
                    }}
                  />

                  {/* Peak marker (triangle above) */}
                  {isPeak && !isTrough && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{ bottom: '100%', marginBottom: 2 }}
                    >
                      <div
                        className="w-0 h-0"
                        style={{
                          borderLeft: '4px solid transparent',
                          borderRight: '4px solid transparent',
                          borderBottom: '6px solid #fbbf24',
                        }}
                      />
                    </div>
                  )}

                  {/* Trough marker (triangle below) */}
                  {isTrough && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{ top: '100%', marginTop: 2 }}
                    >
                      <div
                        className="w-0 h-0"
                        style={{
                          borderLeft: '4px solid transparent',
                          borderRight: '4px solid transparent',
                          borderTop: '6px solid #f97316',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X-axis date labels */}
          <div className="absolute left-[55px] right-[10px] bottom-0 h-6 text-[10px] text-muted">
            {hasCalendarRange && dateRange ? (
              // Calendar-based labels for all periods
              (() => {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const getOrdinal = (n: number) => {
                  const s = ['th', 'st', 'nd', 'rd'];
                  const v = n % 100;
                  return n + (s[(v - 20) % 10] || s[v] || s[0]);
                };
                const labels: { date: string; label: string; xPos: number }[] = [];

                if (period === 'wtd') {
                  // For WTD, show day label centered over each day's trades
                  const dayGroups: { date: string; startIdx: number; endIdx: number }[] = [];
                  let currentDate = '';
                  let startIdx = 0;

                  data.forEach((d, i) => {
                    if (d.date !== currentDate) {
                      if (currentDate) {
                        dayGroups.push({ date: currentDate, startIdx, endIdx: i - 1 });
                      }
                      currentDate = d.date;
                      startIdx = i;
                    }
                  });
                  if (currentDate) {
                    dayGroups.push({ date: currentDate, startIdx, endIdx: data.length - 1 });
                  }

                  dayGroups.forEach(group => {
                    const centerIdx = (group.startIdx + group.endIdx) / 2;
                    const xPos = ((centerIdx + 0.5) / data.length) * 100;
                    const [y, m, d] = group.date.split("-").map(Number);
                    const date = new Date(y, m - 1, d);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = date.getDate();
                    labels.push({ date: '', label: `${dayName} ${dayNum}`, xPos });
                  });
                } else if (period === 'mtd') {
                  // For MTD, show every other day starting from 1st
                  for (let i = 0; i < totalRangeDays; i++) {
                    const dayDate = new Date(rangeStartTime + i * 24 * 60 * 60 * 1000);
                    const dayNum = dayDate.getDate();
                    const xPos = ((i + 0.5) / totalRangeDays) * 100;
                    if (dayNum % 2 === 1) {
                      labels.push({ date: '', label: getOrdinal(dayNum), xPos });
                    }
                  }
                } else if (period === 'ytd') {
                  // For YTD with weekly aggregation, show week numbers with month context
                  for (let w = 0; w < totalRangeWeeks; w++) {
                    const weekDate = new Date(weekStartTime + w * 7 * 24 * 60 * 60 * 1000);
                    const xPos = ((w + 0.5) / totalRangeWeeks) * 100;
                    // Show every 4th week to avoid crowding, plus first week
                    if (w === 0 || w % 4 === 0) {
                      const monthIdx = weekDate.getMonth();
                      const dayNum = weekDate.getDate();
                      // Show "Jan 1" format for clarity
                      labels.push({ date: '', label: `${monthNames[monthIdx]} ${dayNum}`, xPos });
                    }
                  }
                } else if (period === 'all') {
                  // For All, show months or quarters depending on span
                  const totalMonths = totalRangeDays / 30;
                  let lastLabel = '';
                  for (let i = 0; i < totalRangeDays; i++) {
                    const dayDate = new Date(rangeStartTime + i * 24 * 60 * 60 * 1000);
                    const monthIdx = dayDate.getMonth();
                    const year = dayDate.getFullYear();
                    const dayNum = dayDate.getDate();
                    const xPos = ((i + 0.5) / totalRangeDays) * 100;

                    if (totalMonths > 24) {
                      // Show quarters for spans > 2 years
                      const quarter = Math.floor(monthIdx / 3) + 1;
                      const label = `Q${quarter} ${year}`;
                      if (label !== lastLabel && dayNum <= 7 && (monthIdx % 3 === 0)) {
                        labels.push({ date: '', label, xPos });
                        lastLabel = label;
                      }
                    } else if (totalMonths > 6) {
                      // Show month + year for spans > 6 months
                      const label = `${monthNames[monthIdx]} ${year.toString().slice(-2)}`;
                      if (label !== lastLabel && dayNum <= 7) {
                        labels.push({ date: '', label, xPos });
                        lastLabel = label;
                      }
                    } else {
                      // Show just months for shorter spans
                      if (monthIdx.toString() !== lastLabel && dayNum <= 7) {
                        labels.push({ date: '', label: monthNames[monthIdx], xPos });
                        lastLabel = monthIdx.toString();
                      }
                    }
                  }
                }

                return labels.map((l, idx) => (
                  <span
                    key={idx}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${l.xPos}%` }}
                  >
                    {l.label}
                  </span>
                ));
              })()
            ) : data.length >= 3 ? (
              <>
                {/* First label */}
                <span
                  className="absolute -translate-x-1/2"
                  style={{ left: `${getXPercent(data[0].date, 0)}%` }}
                >
                  {data[0].date}
                </span>
                {/* Middle label */}
                <span
                  className="absolute -translate-x-1/2"
                  style={{ left: `${getXPercent(data[Math.floor(data.length / 2)].date, Math.floor(data.length / 2))}%` }}
                >
                  {data[Math.floor(data.length / 2)].date}
                </span>
                {/* Last label */}
                <span
                  className="absolute right-0"
                >
                  {data[data.length - 1].date}
                </span>
              </>
            ) : (
              dateLabels.map((date, i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${getXPercent(date, i)}%` }}
                >
                  {date}
                </span>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Info Panel - Shows hovered or latest data */}
      <div className={`p-3 rounded-lg border transition-colors ${
        isHovering
          ? "bg-card border-accent/30"
          : "bg-background/50 border-border/50"
      }`}>
        {/* Legend row */}
        <div className="flex items-center justify-center gap-6 pb-3 mb-3 border-b border-border/50">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            <span>Win Day</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <span>Loss Day</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <div className="w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '6px solid #fbbf24' }}></div>
            <span>New High</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <div className="w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #f97316' }}></div>
            <span>Bottom</span>
          </div>
        </div>

        {/* Data row */}
        <div className="grid grid-cols-5 gap-2">
          {/* Date / Trade # */}
          <div className="text-center">
            <div className="text-[10px] text-muted mb-1">
              {isHovering ? "Selected" : "Latest"}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {period === 'wtd' && displayData.tradeIndex ? (
                // WTD individual trade view - show trade number
                `Trade #${displayData.tradeIndex}`
              ) : displayData.dateEnd ? (
                // Weekly view - show date range
                (() => {
                  const formatShort = (dateStr: string) => {
                    const [y, m, d] = dateStr.split("-").map(Number);
                    const date = new Date(y, m - 1, d);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  };
                  return `${formatShort(displayData.date)} - ${formatShort(displayData.dateEnd)}`;
                })()
              ) : (
                (() => {
                  const [y, m, d] = displayData.date.split("-").map(Number);
                  const date = new Date(y, m - 1, d);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                })()
              )}
            </div>
          </div>

          {/* Period P&L */}
          <div className="text-center">
            <div className="text-[10px] text-muted mb-1">
              {period === 'wtd' ? "Trade P&L" : displayData.dateEnd ? "Weekly P&L" : "Daily P&L"}
            </div>
            <div className={`text-sm font-bold ${displayData.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {displayData.pnl >= 0 ? "+" : ""}${displayData.pnl.toFixed(2)}
            </div>
          </div>

          {/* Total P&L */}
          <div className="text-center">
            <div className="text-[10px] text-muted mb-1">Total P&L</div>
            {(() => {
              const totalPnl = displayData.cumulative - startingEquity;
              return (
                <div className={`text-sm font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
                </div>
              );
            })()}
          </div>

          {/* Trade Count (for weekly) or Drawdown */}
          <div className="text-center">
            <div className="text-[10px] text-muted mb-1">
              {displayData.dateEnd ? "Trades" : "Drawdown"}
            </div>
            {displayData.dateEnd ? (
              <div className="text-sm font-bold text-accent-light">
                {displayData.tradeCount}
              </div>
            ) : displayData.drawdown > 0 ? (
              <div>
                <div className="text-sm font-bold text-red-400">
                  -${displayData.drawdown.toFixed(2)} ({displayData.drawdownPercent.toFixed(2)}%)
                </div>
                <div className="text-[9px] text-muted mt-0.5">
                  Peak: ${(displayData.cumulative + displayData.drawdown).toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="text-sm font-bold text-emerald-400">At Peak</div>
            )}
          </div>

          {/* Status */}
          <div className="text-center">
            <div className="text-[10px] text-muted mb-1">
              {period === 'wtd' ? "Trade Result" : displayData.dateEnd ? "Week Result" : "Day Result"}
            </div>
            <div className={`text-xs font-medium px-2 py-0.5 rounded inline-block ${
              displayData.pnl >= 0
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}>
              {displayData.pnl >= 0 ? "WIN" : "LOSS"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TradingPage() {
  const { trades, tags, loading, closeTrade } = useTradeJournal();
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [goals, setGoals] = useState<TradingGoals>({ yearlyPnlGoal: 0, monthlyPnlGoal: 0, startingEquity: 0 });
  const [goalInput, setGoalInput] = useState({ yearly: "", monthly: "", startingEquity: "" });
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showRecentTrades, setShowRecentTrades] = useState(false);
  const [showOpenTrades, setShowOpenTrades] = useState(true);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [closeTradeForm, setCloseTradeForm] = useState({ exitPrice: "", pnl: "", closeDate: "" });
  const [showCloseDatePicker, setShowCloseDatePicker] = useState(false);
  const [closeDateMonth, setCloseDateMonth] = useState("");
  const [closeDateDay, setCloseDateDay] = useState("");
  const [closeDateYear, setCloseDateYear] = useState("");
  const closeDatePickerRef = useRef<HTMLDivElement>(null);

  // Equity curve filters
  const [equityPeriod, setEquityPeriod] = useState<"all" | "ytd" | "mtd" | "wtd" | "daily">("all");
  const [equityTagFilter, setEquityTagFilter] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // Filter trades: open vs closed
  const openTrades = useMemo(() => trades.filter(t => t.status === "OPEN"), [trades]);
  const closedTrades = useMemo(() => trades.filter(t => t.status !== "OPEN"), [trades]);

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
    const tradesByDate: Record<string, number> = {};
    closedTrades.forEach((t) => {
      tradesByDate[t.date] = (tradesByDate[t.date] || 0) + t.pnl;
    });

    const sortedDates = Object.keys(tradesByDate).sort();
    let currentStreak = 0;
    let currentStreakType: "win" | "loss" | null = null;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    sortedDates.forEach((date) => {
      const dailyPnl = tradesByDate[date];
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
      const dailyPnl = tradesByDate[sortedDates[i]];
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
    const startingEquity = goals.startingEquity || 0;
    let runningEquity = startingEquity;
    let peak = startingEquity;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let currentDrawdown = 0;
    let drawdownStart: string | null = null;
    let maxDrawdownStart: string | null = null;
    let maxDrawdownEnd: string | null = null;
    let inDrawdown = false;

    const equityCurve: { date: string; pnl: number; cumulative: number; drawdown: number; drawdownPercent: number; tradeCount: number }[] = [];

    sortedDates.forEach((date) => {
      runningEquity += tradesByDate[date];

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
        pnl: tradesByDate[date],
        cumulative: runningEquity,
        drawdown: currentDrawdown,
        drawdownPercent,
        tradeCount: 1,
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
      // YoY data
      monthlyByYear,
      currentYear,
      lastYear,
      // Sorted trades for table
      sortedTrades,
    };
  }, [trades, goals.startingEquity]);

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
    if (!tradingStats) return { data: [], dateRange: null, period: equityPeriod };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const today = now.toISOString().split("T")[0];

    // First filter by tags if any selected
    let filteredTrades = closedTrades;
    if (equityTagFilter.length > 0) {
      filteredTrades = closedTrades.filter(trade =>
        trade.tags.some(tag => equityTagFilter.includes(tag.id))
      );
    }

    // Determine date range based on period
    let dateRange: { start: string; end: string } | null = null;

    // Then filter by time period
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
          default:
            return true;
        }
      });

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
    const startingEquity = goals.startingEquity || 0;
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
          tradeIndex: index + 1, // 1-based index for display
        });
      });
    } else {
      // Aggregate by week (YTD) or by day (all, mtd)
      const pnlByPeriod: Record<string, { pnl: number; count: number }> = {};
      sortedTrades.forEach(t => {
        const effectiveDate = t.closeDate || t.date;
        const key = equityPeriod === "ytd" ? getWeekStart(effectiveDate) : effectiveDate;
        if (!pnlByPeriod[key]) {
          pnlByPeriod[key] = { pnl: 0, count: 0 };
        }
        pnlByPeriod[key].pnl += t.pnl;
        pnlByPeriod[key].count += 1;
      });

      Object.keys(pnlByPeriod).sort().forEach(date => {
        cumulative += pnlByPeriod[date].pnl;
        peak = Math.max(peak, cumulative);
        const drawdown = peak - cumulative;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

        curve.push({
          date,
          dateEnd: equityPeriod === "ytd" ? getWeekEnd(date) : undefined,
          pnl: pnlByPeriod[date].pnl,
          cumulative,
          drawdown,
          drawdownPercent,
          tradeCount: pnlByPeriod[date].count,
        });
      });
    }

    return { data: curve, dateRange, period: equityPeriod, tradeCount: filteredTrades.length, startingEquity };
  }, [tradingStats, closedTrades, equityPeriod, equityTagFilter, goals.startingEquity]);

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
      <div className="glass rounded-xl border border-border/50 p-5">
          <div className="relative flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent-light" />
              Equity Curve
              <InfoTip content={{
                title: "Equity Curve",
                description: "Your account value over time. Green shows growth, red shows losses from peaks.",
                tip: "Smooth upward = consistent trading."
              }} />
            </h3>

            {/* Period indicator - centered */}
            <span className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-foreground">
              {equityPeriod === "all" && filteredEquityCurve.dateRange
                ? (() => {
                    const start = new Date(filteredEquityCurve.dateRange.start);
                    start.setDate(start.getDate() + 1); // Adjust for day before first trade
                    const end = new Date(filteredEquityCurve.dateRange.end);
                    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return `${formatDate(start)} - ${formatDate(end)}`;
                  })()
                : equityPeriod === "ytd"
                  ? `${new Date().getFullYear()} YTD`
                  : equityPeriod === "mtd"
                    ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : equityPeriod === "wtd"
                      ? (() => {
                          const now = new Date();
                          const startOfWeek = new Date(now);
                          startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
                          const endOfWeek = new Date(startOfWeek);
                          endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
                          const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const startYear = startOfWeek.getFullYear();
                          const endYear = endOfWeek.getFullYear();
                          if (startYear !== endYear) {
                            return `${formatDate(startOfWeek)}, ${startYear} - ${formatDate(endOfWeek)}, ${endYear}`;
                          }
                          return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}, ${endYear}`;
                        })()
                      : null
              }
            </span>

            <div className="flex items-center gap-3">
              {/* Period Filter */}
              <div className="flex items-center gap-1 bg-card rounded-lg p-1">
                {[
                  { value: "all", label: "All" },
                  { value: "ytd", label: "YTD" },
                  { value: "mtd", label: "MTD" },
                  { value: "wtd", label: "WTD" },
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setEquityPeriod(period.value as typeof equityPeriod)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      equityPeriod === period.value
                        ? "bg-accent text-white"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* Tag Filter */}
              {tags.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      equityTagFilter.length > 0
                        ? "bg-accent/20 border-accent text-accent"
                        : "bg-card border-border text-muted hover:border-accent/50"
                    }`}
                  >
                    <TagIcon className="w-3 h-3" />
                    {equityTagFilter.length > 0 ? `${equityTagFilter.length} Tags` : "Filter by Tag"}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showTagDropdown && (
                    <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-20 py-1">
                      {equityTagFilter.length > 0 && (
                        <button
                          onClick={() => {
                            setEquityTagFilter([]);
                            setShowTagDropdown(false);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-card-hover"
                        >
                          Clear All
                        </button>
                      )}
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            setEquityTagFilter((prev) =>
                              prev.includes(tag.id)
                                ? prev.filter((id) => id !== tag.id)
                                : [...prev, tag.id]
                            );
                          }}
                          className="w-full px-3 py-1.5 text-xs text-left hover:bg-card-hover flex items-center gap-2"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1">{tag.name}</span>
                          {equityTagFilter.includes(tag.id) && (
                            <Check className="w-3 h-3 text-accent" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs border-l border-border pl-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1 bg-emerald-500 rounded"></div>
                  <span className="text-muted">Equity</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1 bg-red-500/50 rounded"></div>
                  <span className="text-muted">Drawdown</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <EquityCurveChart
            data={filteredEquityCurve.data.length > 0 ? filteredEquityCurve.data : tradingStats.equityCurve}
            dateRange={filteredEquityCurve.dateRange}
            period={filteredEquityCurve.period}
            startingEquity={filteredEquityCurve.startingEquity}
          />

          {/* Drawdown Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-[10px] text-muted flex items-center justify-center">
                Max Drawdown
                <InfoTip content={{
                  title: "Max Drawdown",
                  description: "Your largest loss from a peak - the worst decline before recovering.",
                  details: [
                    { label: "Peak was", value: `$${tradingStats.peak.toFixed(0)}`, color: "text-emerald-400" },
                    { label: "Dropped to", value: `$${(tradingStats.peak - tradingStats.maxDrawdown).toFixed(0)}`, color: "text-red-400" },
                  ],
                  tip: "Pro traders keep this under 20%."
                }} />
              </div>
              <div className="text-lg font-bold text-red-400">
                -${tradingStats.maxDrawdown.toFixed(2)} <span className="text-sm">({tradingStats.maxDrawdownPercent.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-muted flex items-center justify-center">
                Current Drawdown
                <InfoTip content={{
                  title: "Current Drawdown",
                  description: "How far you are below your all-time high right now.",
                  details: [
                    { label: "Peak", value: `$${tradingStats.peak.toFixed(0)}`, color: "text-emerald-400" },
                    { label: "Now", value: `$${(tradingStats.peak - tradingStats.currentDrawdown).toFixed(0)}`, color: "text-foreground" },
                  ],
                  tip: "At $0 means you're at a new all-time high."
                }} />
              </div>
              <div className={`text-lg font-bold ${tradingStats.currentDrawdown > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {tradingStats.currentDrawdown > 0 ? `-$${tradingStats.currentDrawdown.toFixed(2)} (${tradingStats.currentDrawdownPercent.toFixed(2)}%)` : "At Peak"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-muted flex items-center justify-center">
                Peak Equity
                <InfoTip content={{
                  title: "Peak Equity",
                  description: "Your highest account value ever - the high water mark.",
                  details: [
                    { label: "Started with", value: `$${(goals.startingEquity || 0).toFixed(0)}`, color: "text-blue-400" },
                    { label: "Profit", value: `+$${(tradingStats.peak - (goals.startingEquity || 0)).toFixed(0)}`, color: "text-emerald-400" },
                  ],
                  tip: "Drawdown is measured from this level."
                }} />
              </div>
              <div className="text-lg font-bold text-emerald-400">${tradingStats.peak.toFixed(2)}</div>
            </div>
          </div>
        </div>

      {/* GOALS & PROGRESS HERO SECTION */}
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
                <h2 className="text-lg font-bold">Goals & Progress</h2>
                <p className="text-xs text-muted">Track your trading targets</p>
              </div>
            </div>
            <button
              onClick={() => setShowGoalSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-card-hover border border-border transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              Set Goals
            </button>
          </div>

          {goals.yearlyPnlGoal > 0 || goals.monthlyPnlGoal > 0 ? (
            <>
              {/* Goals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Yearly Goal Card */}
                <div className="flex items-center gap-6 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <CircularProgress
                    percentage={goalProgress?.yearlyProgress || 0}
                    size={100}
                    strokeWidth={8}
                    color="#34d399"
                    label="Yearly"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Yearly Goal</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        goalProgress?.onTrack
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {goalProgress?.onTrack ? "On Track" : "Behind Pace"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${tradingStats.ytdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${tradingStats.ytdPnl.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted">/ ${goals.yearlyPnlGoal.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span>Daily target: <span className="text-foreground font-medium">${(goalProgress?.dailyTarget || 0).toFixed(0)}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Goal Card */}
                <div className="flex items-center gap-6 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <CircularProgress
                    percentage={goalProgress?.monthlyProgress || 0}
                    size={100}
                    strokeWidth={8}
                    color="#60a5fa"
                    label="Monthly"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Monthly Goal</span>
                      <span className="text-xs text-muted">
                        {new Date().toLocaleString('default', { month: 'short' })} {new Date().getFullYear()}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${tradingStats.mtdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${tradingStats.mtdPnl.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted">/ ${goals.monthlyPnlGoal.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        <span>Remaining: <span className="text-foreground font-medium">${Math.max(0, goals.monthlyPnlGoal - tradingStats.mtdPnl).toFixed(0)}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Progress & Monthly Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today's Progress */}
                <div className="p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="text-xs text-muted mb-2">Today's Progress</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-xl font-bold ${(goalProgress?.todayPnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {(goalProgress?.todayPnl || 0) >= 0 ? "+" : ""}${(goalProgress?.todayPnl || 0).toFixed(0)}
                      </div>
                      <div className="text-[11px] text-muted">
                        vs ${(goalProgress?.dailyTarget || 0).toFixed(0)} target
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${
                      (goalProgress?.todayVsTarget || 0) >= 100 ? "text-emerald-400" :
                      (goalProgress?.todayVsTarget || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {(goalProgress?.todayVsTarget || 0).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Monthly Breakdown - spans 2 columns */}
                <div className="md:col-span-2 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="text-xs text-muted mb-3">Monthly Breakdown ({tradingStats.currentYear})</div>
                  <div className="flex items-end justify-between gap-1 h-12">
                    {goalProgress?.monthlyPnl.map((pnl, i) => {
                      const maxPnl = Math.max(...(goalProgress?.monthlyPnl.map(Math.abs) || [1]));
                      const height = maxPnl > 0 ? (Math.abs(pnl) / maxPnl) * 100 : 0;
                      const isCurrentMonth = i === new Date().getMonth();
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full max-w-[20px] rounded-t transition-all ${
                              pnl >= 0 ? "bg-emerald-500" : "bg-red-500"
                            } ${isCurrentMonth ? "ring-2 ring-white/50" : ""}`}
                            style={{ height: `${Math.max(height, 4)}%`, opacity: pnl === 0 ? 0.2 : 0.8 }}
                          />
                          <span className={`text-[9px] mt-1 ${isCurrentMonth ? "text-foreground font-bold" : "text-muted"}`}>
                            {monthNames[i]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Projection Banner */}
              <div className={`mt-4 p-3 rounded-xl flex items-center justify-between ${
                goalProgress?.onTrack
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-yellow-500/10 border border-yellow-500/30"
              }`}>
                <div className="flex items-center gap-3">
                  {goalProgress?.onTrack ? (
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {goalProgress?.onTrack ? "On Track to Hit Yearly Goal!" : "Behind Yearly Pace"}
                    </div>
                    <div className="text-[11px] text-muted">
                      Projected year-end: ${(goalProgress?.projectedYearEnd || 0).toFixed(0)}
                      {" "}({goalProgress?.tradingDaysRemaining} trading days left)
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
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/30 mb-4">
                <Target className="w-8 h-8 text-accent-light" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Set Your Trading Goals</h3>
              <p className="text-sm text-muted mb-4 max-w-md mx-auto">
                Define yearly and monthly P&L targets to track your progress with visual indicators and daily targets.
              </p>
              <button
                onClick={() => setShowGoalSettings(true)}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
              >
                Set Goals Now
              </button>
            </div>
          )}
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

      {/* COMPACT SUMMARY BAR */}
      <div className="glass rounded-xl p-3 border border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 divide-x divide-border">
            <CompactStat label="All-Time" value={tradingStats.allTimePnl} count={tradingStats.allTimeTrades} />
            <div className="pl-4"><CompactStat label="YTD" value={tradingStats.ytdPnl} count={tradingStats.ytdTrades} /></div>
            <div className="pl-4"><CompactStat label="MTD" value={tradingStats.mtdPnl} count={tradingStats.mtdTrades} /></div>
            <div className="pl-4"><CompactStat label="WTD" value={tradingStats.wtdPnl} count={tradingStats.wtdTrades} /></div>
          </div>
          <div className="flex items-center gap-4 divide-x divide-border">
            {/* Consistency Grade */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted">Grade</span>
              <span className={`text-lg font-bold ${consistencyGrade.color}`}>{consistencyGrade.grade}</span>
            </div>
            {/* Current Streak */}
            <div className="pl-4 flex items-center gap-2">
              {tradingStats.currentStreakType === "win" ? (
                <Flame className="w-4 h-4 text-orange-400" />
              ) : tradingStats.currentStreakType === "loss" ? (
                <Snowflake className="w-4 h-4 text-blue-400" />
              ) : (
                <Activity className="w-4 h-4 text-muted" />
              )}
              <span className={`font-bold ${
                tradingStats.currentStreakType === "win" ? "text-emerald-400" :
                tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted"
              }`}>
                {tradingStats.currentStreak}{tradingStats.currentStreakType === "win" ? "W" : tradingStats.currentStreakType === "loss" ? "L" : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUPPORTING METRICS - 3 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Streak Tracker */}
        <div className="glass rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-orange-400" />
            Streak Tracker
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-card border border-border">
              <div className="text-[10px] text-muted mb-1">Current</div>
              <div className={`text-xl font-bold ${
                tradingStats.currentStreakType === "win" ? "text-emerald-400" :
                tradingStats.currentStreakType === "loss" ? "text-red-400" : "text-muted"
              }`}>
                {tradingStats.currentStreak}
              </div>
              <div className="text-[9px] text-muted">
                {tradingStats.currentStreakType === "win" ? "Wins" : tradingStats.currentStreakType === "loss" ? "Losses" : "N/A"}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[10px] text-emerald-400 mb-1">Best</div>
              <div className="text-xl font-bold text-emerald-400">{tradingStats.longestWinStreak}</div>
              <div className="text-[9px] text-emerald-400/70">Wins</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="text-[10px] text-red-400 mb-1">Worst</div>
              <div className="text-xl font-bold text-red-400">{tradingStats.longestLossStreak}</div>
              <div className="text-[9px] text-red-400/70">Losses</div>
            </div>
          </div>
        </div>

        {/* YoY Comparison */}
        <div className="glass rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-accent-light" />
            Year over Year
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
              <div>
                <div className="text-sm font-medium">{tradingStats.currentYear}</div>
                <div className="text-[10px] text-muted">{tradingStats.ytdTrades} trades</div>
              </div>
              <div className={`text-lg font-bold ${tradingStats.ytdPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {tradingStats.ytdPnl >= 0 ? "+" : ""}${tradingStats.ytdPnl.toFixed(0)}
              </div>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
              <div>
                <div className="text-sm font-medium">{tradingStats.lastYear}</div>
                <div className="text-[10px] text-muted">{tradingStats.lastYearTrades} trades</div>
              </div>
              <div className={`text-lg font-bold ${tradingStats.lastYearPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {tradingStats.lastYearPnl >= 0 ? "+" : ""}${tradingStats.lastYearPnl.toFixed(0)}
              </div>
            </div>
            {tradingStats.lastYearPnl !== 0 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                {tradingStats.ytdPnl >= tradingStats.lastYearPnl ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-xs font-medium ${tradingStats.ytdPnl >= tradingStats.lastYearPnl ? "text-emerald-400" : "text-red-400"}`}>
                  {(((tradingStats.ytdPnl - tradingStats.lastYearPnl) / Math.abs(tradingStats.lastYearPnl)) * 100).toFixed(0)}% vs last year
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Consistency Score */}
        <div className="glass rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-yellow-400" />
            Consistency Score
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Win Rate</span>
              <span className="text-xs font-bold">{tradingStats.winRateScore.toFixed(0)}/25</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(tradingStats.winRateScore / 25) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Profit Factor</span>
              <span className="text-xs font-bold">{tradingStats.profitFactorScore.toFixed(0)}/25</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(tradingStats.profitFactorScore / 25) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Drawdown</span>
              <span className="text-xs font-bold">{tradingStats.drawdownScore.toFixed(0)}/25</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(tradingStats.drawdownScore / 25) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Win Streaks</span>
              <span className="text-xs font-bold">{tradingStats.streakScore.toFixed(0)}/25</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(tradingStats.streakScore / 25) * 100}%` }} />
            </div>
            <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
              <span className="text-sm font-medium">Total Score</span>
              <span className={`text-lg font-bold ${consistencyGrade.color}`}>
                {tradingStats.consistencyScore}/100 ({consistencyGrade.grade})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT TRADES - Collapsible */}
      <div className="glass rounded-xl border border-border/50">
        <button
          onClick={() => setShowRecentTrades(!showRecentTrades)}
          className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors rounded-xl"
        >
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-light" />
            Recent Trades
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs text-muted font-medium">Date</th>
                    <th className="text-left py-2 px-3 text-xs text-muted font-medium">Time</th>
                    <th className="text-left py-2 px-3 text-xs text-muted font-medium">Ticker</th>
                    <th className="text-left py-2 px-3 text-xs text-muted font-medium">Direction</th>
                    <th className="text-right py-2 px-3 text-xs text-muted font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {tradingStats.sortedTrades.slice(-20).reverse().map((trade) => (
                    <tr key={trade.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                      <td className="py-2 px-3">{trade.date}</td>
                      <td className="py-2 px-3 text-muted">{trade.time || "-"}</td>
                      <td className="py-2 px-3 font-medium">{trade.ticker}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className={`py-2 px-3 text-right font-medium ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}
