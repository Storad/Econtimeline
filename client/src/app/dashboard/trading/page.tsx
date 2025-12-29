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

// Tooltip Component - uses fixed positioning to stay in viewport
const Tooltip = ({ children, content }: { children: React.ReactNode; content: TooltipContent }) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 160;
    const padding = 12;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.bottom + padding;

    // Keep tooltip within horizontal bounds
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }

    // If tooltip would go below viewport, show above instead
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
        className={`fixed w-[280px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden transition-all duration-200 z-[9999] pointer-events-none ${
          isVisible ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {/* Header */}
        <div className="px-3 py-2 bg-accent/10 border-b border-border">
          <h4 className="text-xs font-semibold text-accent-light flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            {content.title}
          </h4>
        </div>

        {/* Body */}
        <div className="p-3 space-y-2">
          <p className="text-xs text-muted leading-relaxed">{content.description}</p>

          {/* Details list */}
          {content.details && content.details.length > 0 && (
            <div className="space-y-1 pt-1">
              {content.details.map((detail, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted">{detail.label}</span>
                  <span className={`font-medium ${detail.color || "text-foreground"}`}>{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Formula */}
          {content.formula && (
            <div className="mt-2 px-2 py-1.5 bg-background rounded-md border border-border/50">
              <code className="text-[10px] text-accent-light font-mono">{content.formula}</code>
            </div>
          )}

          {/* Tip */}
          {content.tip && (
            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border/50">
              <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted italic">{content.tip}</p>
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
        <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
};

// Compact Stat Component for summary bar
const CompactStat = ({ label, value, count }: { label: string; value: number; count?: number }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
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
}

// Equity curve data point type
interface EquityDataPoint {
  date: string;
  pnl: number;
  cumulative: number;
  drawdown: number;
  drawdownPercent: number;
}

// Equity Curve Chart Component with hover info panel
const EquityCurveChart = ({ data }: { data: EquityDataPoint[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const chartRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

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
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values);
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
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const chartLeft = marginLeft;
    const chartWidth = rect.width - marginLeft - marginRight;
    const relativeX = e.clientX - rect.left - chartLeft;

    if (relativeX < 0 || relativeX > chartWidth) {
      setHoveredIndex(null);
      return;
    }

    // Account for origin at x=0, trades at x=(i+1)/n
    const xPercent = relativeX / chartWidth;
    const index = Math.round(xPercent * data.length - 1);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    setHoveredIndex(clampedIndex);
  };

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;
  const lastData = data[data.length - 1];
  const displayData = hoveredData || lastData;
  const isHovering = hoveredIndex !== null;

  // Calculate pixel position for a data point (shifted right - origin at x=0, trades at x=(i+1)/n)
  const getPixelPos = (index: number, d: EquityDataPoint) => {
    const xPercent = (index + 1) / data.length;
    const yPercent = (max - d.cumulative) / totalRange;
    return {
      x: xPercent * chartDimensions.width,
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

              {/* Vertical grid lines */}
              {[0, 25, 50, 75, 100].map((x) => (
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
              ))}

              {/* Zero line */}
              {minVal < 0 && maxVal > 0 && (
                <line
                  x1="0"
                  y1={`${((max - 0) / totalRange) * 100}`}
                  x2="100"
                  y2={`${((max - 0) / totalRange) * 100}`}
                  stroke="#888"
                  strokeOpacity="0.5"
                  strokeDasharray="4 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Equity fill area (subtle) - starts from origin at $0 */}
              <path
                d={`M 0 ${((max - 0) / totalRange) * 100} ${data.map((d, i) => {
                  const x = ((i + 1) / data.length) * 100;
                  const y = ((max - d.cumulative) / totalRange) * 100;
                  return `L ${x} ${y}`;
                }).join(" ")} L 100 100 L 0 100 Z`}
                fill="url(#equityGradient)"
              />

              {/* Drawdown area with gradient - between equity line and peak line */}
              <path
                d={`M 0 ${((max - 0) / totalRange) * 100} ${data.map((d, i) => {
                  const x = ((i + 1) / data.length) * 100;
                  const y = ((max - d.cumulative + d.drawdown) / totalRange) * 100;
                  return `L ${x} ${Math.min(y, 100)}`;
                }).join(" ")} L ${100} ${((max - data[data.length - 1].cumulative) / totalRange) * 100} ${[...data].reverse().map((d, i) => {
                  const x = ((data.length - i) / data.length) * 100;
                  const y = ((max - d.cumulative) / totalRange) * 100;
                  return `L ${x} ${y}`;
                }).join(" ")} L 0 ${((max - 0) / totalRange) * 100} Z`}
                fill="url(#drawdownGradient)"
              />

              {/* Colored line segments - starting from origin at $0 */}
              {data.map((d, i) => {
                // Origin is at x=0, trades are at x = (i+1) / data.length
                const prevCumulative = i === 0 ? 0 : data[i - 1].cumulative;
                const x1 = (i / data.length) * 100;
                const y1 = ((max - prevCumulative) / totalRange) * 100;
                const x2 = ((i + 1) / data.length) * 100;
                const y2 = ((max - d.cumulative) / totalRange) * 100;
                const isUp = d.pnl >= 0;
                return (
                  <line
                    key={`seg-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isUp ? "#34d399" : "#ef4444"}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {/* Hover indicator line */}
              {hoveredIndex !== null && (
                <line
                  x1={`${((hoveredIndex + 1) / data.length) * 100}`}
                  y1="0"
                  x2={`${((hoveredIndex + 1) / data.length) * 100}`}
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
          <div className="absolute left-[55px] right-[10px] bottom-0 h-6 flex justify-between items-center text-[10px] text-muted">
            {dateLabels.map((date, i) => (
              <span key={i}>{date}</span>
            ))}
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
          {/* Date */}
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
              {isHovering ? "Selected" : "Latest"}
            </div>
            <div className="text-sm font-semibold text-foreground">{displayData.date}</div>
          </div>

          {/* Daily P&L */}
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Daily P&L</div>
            <div className={`text-sm font-bold ${displayData.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {displayData.pnl >= 0 ? "+" : ""}${displayData.pnl.toFixed(2)}
            </div>
          </div>

          {/* Cumulative */}
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Total Equity</div>
            <div className={`text-sm font-bold ${displayData.cumulative >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {displayData.cumulative >= 0 ? "+" : ""}${displayData.cumulative.toFixed(2)}
            </div>
          </div>

          {/* Drawdown */}
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Drawdown</div>
            {displayData.drawdown > 0 ? (
              <div className="text-sm font-bold text-red-400">
                -{displayData.drawdownPercent.toFixed(1)}%
              </div>
            ) : (
              <div className="text-sm font-bold text-yellow-400">At Peak</div>
            )}
          </div>

          {/* Status */}
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Day Result</div>
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
  const [goals, setGoals] = useState<TradingGoals>({ yearlyPnlGoal: 0, monthlyPnlGoal: 0 });
  const [goalInput, setGoalInput] = useState({ yearly: "", monthly: "" });
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
      setGoals(parsed);
      setGoalInput({
        yearly: parsed.yearlyPnlGoal > 0 ? parsed.yearlyPnlGoal.toString() : "",
        monthly: parsed.monthlyPnlGoal > 0 ? parsed.monthlyPnlGoal.toString() : "",
      });
    }
  }, []);

  // Save goals
  const saveGoals = () => {
    const newGoals = {
      yearlyPnlGoal: parseFloat(goalInput.yearly) || 0,
      monthlyPnlGoal: parseFloat(goalInput.monthly) || 0,
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

    // Calculate equity curve with drawdown
    let runningPnl = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let currentDrawdown = 0;
    let drawdownStart: string | null = null;
    let maxDrawdownStart: string | null = null;
    let maxDrawdownEnd: string | null = null;
    let inDrawdown = false;

    const equityCurve: { date: string; pnl: number; cumulative: number; drawdown: number; drawdownPercent: number }[] = [];

    sortedDates.forEach((date) => {
      runningPnl += tradesByDate[date];

      if (runningPnl > peak) {
        peak = runningPnl;
        inDrawdown = false;
        drawdownStart = null;
      }

      currentDrawdown = peak - runningPnl;
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
        cumulative: runningPnl,
        drawdown: currentDrawdown,
        drawdownPercent,
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
  }, [trades]);

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
    if (!tradingStats) return [];

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

    // Then filter by time period
    if (equityPeriod !== "all") {
      filteredTrades = filteredTrades.filter(trade => {
        const [y, m, d] = trade.date.split("-").map(Number);
        const tradeDate = new Date(y, m - 1, d);

        switch (equityPeriod) {
          case "ytd":
            return y === currentYear;
          case "mtd":
            return y === currentYear && m === currentMonth + 1;
          case "wtd":
            return tradeDate >= startOfWeek;
          case "daily":
            return trade.date === today;
          default:
            return true;
        }
      });
    }

    // Build equity curve from filtered trades
    const sortedTrades = [...filteredTrades].sort((a, b) => a.date.localeCompare(b.date));
    const dailyPnl: Record<string, number> = {};
    sortedTrades.forEach(t => {
      dailyPnl[t.date] = (dailyPnl[t.date] || 0) + t.pnl;
    });

    const curve: { date: string; pnl: number; cumulative: number; drawdown: number; drawdownPercent: number }[] = [];
    let cumulative = 0;
    let peak = 0;

    Object.keys(dailyPnl).sort().forEach(date => {
      cumulative += dailyPnl[date];
      peak = Math.max(peak, cumulative);
      const drawdown = peak - cumulative;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

      curve.push({
        date,
        pnl: dailyPnl[date],
        cumulative,
        drawdown,
        drawdownPercent,
      });
    });

    return curve;
  }, [tradingStats, closedTrades, equityPeriod, equityTagFilter]);

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent-light" />
              Equity Curve
              <InfoTip content={{
                title: "Equity Curve Chart",
                description: "Visual representation of your cumulative P&L over time.",
                details: [
                  { label: "Green line", value: "Your equity growth", color: "text-emerald-400" },
                  { label: "Red area", value: "Drawdown periods", color: "text-red-400" }
                ],
                tip: "A smooth upward curve indicates consistent, disciplined trading."
              }} />
            </h3>
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
          <EquityCurveChart data={filteredEquityCurve.length > 0 ? filteredEquityCurve : tradingStats.equityCurve} />

          {/* Drawdown Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider flex items-center">
                Max Drawdown
                <InfoTip content={{
                  title: "Maximum Drawdown",
                  description: "The largest peak-to-trough decline in your equity - your worst losing streak from a high point.",
                  details: [
                    { label: "Pro target", value: "< 20%", color: "text-emerald-400" },
                    { label: "Warning zone", value: "> 30%", color: "text-yellow-400" },
                    { label: "Danger zone", value: "> 50%", color: "text-red-400" }
                  ],
                  tip: "Lower is better - this measures your worst-case loss scenario."
                }} />
              </div>
              <div className="text-lg font-bold text-red-400">
                -${tradingStats.maxDrawdown.toFixed(0)} <span className="text-sm">({tradingStats.maxDrawdownPercent.toFixed(1)}%)</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider flex items-center">
                Current Drawdown
                <InfoTip content={{
                  title: "Current Drawdown",
                  description: "How far below your peak equity you currently are.",
                  details: [
                    { label: "At Peak", value: "No drawdown", color: "text-emerald-400" },
                    { label: "In Drawdown", value: "Below your high", color: "text-red-400" }
                  ],
                  tip: "Shows how much you need to recover to reach a new all-time high."
                }} />
              </div>
              <div className={`text-lg font-bold ${tradingStats.currentDrawdown > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {tradingStats.currentDrawdown > 0 ? `-$${tradingStats.currentDrawdown.toFixed(0)}` : "At Peak"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted uppercase tracking-wider flex items-center">
                Peak Equity
                <InfoTip content={{
                  title: "Peak Equity (High Water Mark)",
                  description: "The highest cumulative P&L you've ever reached - your all-time high.",
                  tip: "New profits push this higher. Losses create drawdown measured from this level."
                }} />
              </div>
              <div className="text-lg font-bold text-emerald-400">${tradingStats.peak.toFixed(0)}</div>
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
                  <div className="text-xs text-muted uppercase tracking-wider mb-2">Today's Progress</div>
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
                  <div className="text-xs text-muted uppercase tracking-wider mb-3">Monthly Breakdown ({tradingStats.currentYear})</div>
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
              <span className="text-[10px] text-muted uppercase tracking-wider">Grade</span>
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
              <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Current</div>
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
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Best</div>
              <div className="text-xl font-bold text-emerald-400">{tradingStats.longestWinStreak}</div>
              <div className="text-[9px] text-emerald-400/70">Wins</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Worst</div>
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
                <label className="block text-sm font-medium mb-2">Yearly P&L Goal</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="number"
                    value={goalInput.yearly}
                    onChange={(e) => setGoalInput({ ...goalInput, yearly: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
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
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
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
