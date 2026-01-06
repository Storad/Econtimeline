"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";

export interface EquityDataPoint {
  date: string;
  dateEnd?: string;
  pnl: number;
  cumulative: number;
  drawdown: number;
  drawdownPercent: number;
  tradeCount: number;
  winCount?: number;
  lossCount?: number;
  tradeIndex?: number;
}

export interface TagPill {
  id: string;
  name: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface EquityCurveChartProps {
  data: EquityDataPoint[];
  dateRange?: { start: string; end: string } | null;
  period?: "all" | "ytd" | "mtd" | "wtd" | "daily" | "custom";
  startingEquity?: number;
  onDayClick?: (date: string, dateEnd?: string) => void;
  selectedTags?: TagPill[];
  onRemoveTag?: (tagId: string) => void;
}

export const EquityCurveChart = ({
  data,
  dateRange,
  period = "all",
  startingEquity = 0,
  onDayClick,
  selectedTags = [],
  onRemoveTag
}: EquityCurveChartProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredStart, setHoveredStart] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Chart configuration - more padding on left/right
  const chartHeight = 300;
  const drawdownHeight = 50;
  const padding = { top: 30, right: 20, bottom: 50, left: 70 };

  // Handle empty data
  const hasData = data.length > 0;
  const chartData = hasData ? data : [];

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: chartHeight + drawdownHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Find new highs
  const newHighs = useMemo(() => {
    if (!hasData) return [];
    const highs: number[] = [];
    let peak = startingEquity;
    chartData.forEach((d, i) => {
      if (d.cumulative > peak) {
        peak = d.cumulative;
        highs.push(i);
      }
    });
    return highs;
  }, [chartData, hasData, startingEquity]);

  // Calculate chart bounds with nice round numbers
  const chartBounds = useMemo(() => {
    if (!hasData) return { minY: startingEquity - 500, maxY: startingEquity + 500, range: 1000 };

    const values = chartData.map(d => d.cumulative);
    const minVal = Math.min(...values, startingEquity);
    const maxVal = Math.max(...values, startingEquity);
    const range = maxVal - minVal || 1;
    const paddingY = range * 0.15;

    return {
      minY: minVal - paddingY,
      maxY: maxVal + paddingY,
      range: range + paddingY * 2
    };
  }, [chartData, hasData, startingEquity]);

  // Calculate max drawdown for scaling
  const maxDrawdownPct = useMemo(() => {
    if (!hasData) return 10;
    return Math.max(...chartData.map(d => d.drawdownPercent), 1);
  }, [chartData, hasData]);

  // Get X position for a data point - with proper padding
  // Index 0 = starting equity point, Index 1+ = trade data points
  const getX = (index: number): number => {
    const usableWidth = dimensions.width - padding.left - padding.right;
    // We have chartData.length data points + 1 starting point = chartData.length + 1 total points
    // Starting point is at index 0 (padding.left), trades are at index 1 to chartData.length
    const totalPoints = chartData.length + 1;
    if (totalPoints <= 1) return padding.left + usableWidth / 2;
    return padding.left + ((index + 1) / (totalPoints - 1)) * usableWidth;
  };

  // Get X position for the starting equity point
  const getStartX = (): number => {
    return padding.left;
  };

  // Get Y position for equity value
  const getY = (value: number): number => {
    const usableHeight = chartHeight - padding.top - padding.bottom;
    const normalized = (chartBounds.maxY - value) / chartBounds.range;
    return padding.top + normalized * usableHeight;
  };

  // Get Y position for drawdown
  const getDrawdownY = (pct: number): number => {
    const normalized = pct / maxDrawdownPct;
    return chartHeight + 8 + (normalized * (drawdownHeight - 16));
  };

  // Generate line segments with colors
  const lineSegments = useMemo(() => {
    if (!hasData || chartData.length === 0) return [];

    const segments: { x1: number; y1: number; x2: number; y2: number; isGain: boolean }[] = [];

    // First segment from starting equity to first point
    const startX = getStartX();
    const firstX = getX(0);
    const firstY = getY(chartData[0].cumulative);
    const startY = getY(startingEquity);
    segments.push({
      x1: startX,
      y1: startY,
      x2: firstX,
      y2: firstY,
      isGain: chartData[0].cumulative >= startingEquity
    });

    // Segments between points
    for (let i = 1; i < chartData.length; i++) {
      const prevX = getX(i - 1);
      const prevY = getY(chartData[i - 1].cumulative);
      const currX = getX(i);
      const currY = getY(chartData[i].cumulative);
      const isGain = chartData[i].cumulative >= chartData[i - 1].cumulative;

      segments.push({ x1: prevX, y1: prevY, x2: currX, y2: currY, isGain });
    }

    return segments;
  }, [chartData, hasData, dimensions, chartBounds, startingEquity]);

  // Generate drawdown area path
  const drawdownAreaPath = useMemo(() => {
    if (!hasData || chartData.length === 0) return "";

    let runningPeak = startingEquity;
    const points: { x: number; peakY: number; actualY: number }[] = [];

    // Starting point
    points.push({
      x: getStartX(),
      peakY: getY(startingEquity),
      actualY: getY(startingEquity)
    });

    chartData.forEach((d, i) => {
      runningPeak = Math.max(runningPeak, d.cumulative);
      points.push({
        x: getX(i),
        peakY: getY(runningPeak),
        actualY: getY(d.cumulative)
      });
    });

    // Build the path - top edge is peak line, bottom is actual equity
    let path = `M ${points[0].x} ${points[0].peakY}`;
    points.forEach(p => {
      path += ` L ${p.x} ${p.peakY}`;
    });
    // Go back along the bottom
    for (let i = points.length - 1; i >= 0; i--) {
      path += ` L ${points[i].x} ${points[i].actualY}`;
    }
    path += ' Z';

    return path;
  }, [chartData, hasData, dimensions, chartBounds, startingEquity]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!hasData) {
      return {
        totalPnl: 0,
        totalReturn: 0,
        winRate: 0,
        trades: 0,
        maxDD: 0,
        currentEquity: startingEquity,
        peak: startingEquity,
        atPeak: true,
        winTrades: 0,
        lossTrades: 0,
        sessions: 0,
        winSessions: 0,
        lossSessions: 0
      };
    }

    const totalPnl = chartData.reduce((sum, d) => sum + d.pnl, 0);
    const totalTrades = chartData.reduce((sum, d) => sum + d.tradeCount, 0);
    const totalWinTrades = chartData.reduce((sum, d) => sum + (d.winCount || 0), 0);
    const totalLossTrades = chartData.reduce((sum, d) => sum + (d.lossCount || 0), 0);
    const winSessions = chartData.filter(d => d.pnl > 0).length;
    const lossSessions = chartData.filter(d => d.pnl < 0).length;
    const maxDD = Math.max(...chartData.map(d => d.drawdownPercent));
    const currentEquity = chartData[chartData.length - 1]?.cumulative || startingEquity;
    const peak = Math.max(...chartData.map(d => d.cumulative), startingEquity);

    return {
      totalPnl,
      totalReturn: startingEquity > 0 ? (totalPnl / startingEquity) * 100 : 0,
      winRate: totalTrades > 0 ? (totalWinTrades / totalTrades) * 100 : 0,
      trades: totalTrades,
      maxDD,
      currentEquity,
      peak,
      atPeak: currentEquity >= peak,
      winTrades: totalWinTrades,
      lossTrades: totalLossTrades,
      sessions: chartData.length,
      winSessions,
      lossSessions
    };
  }, [chartData, hasData, startingEquity]);

  // Handle mouse interaction
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !hasData) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Check distance to starting point
    const startX = getStartX();
    const startDist = Math.abs(startX - x);

    // Find closest data point
    let closestIdx = 0;
    let closestDist = Infinity;

    chartData.forEach((_, i) => {
      const pointX = getX(i);
      const dist = Math.abs(pointX - x);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    // If starting point is closer, show that instead
    if (startDist < closestDist) {
      setHoveredStart(true);
      setHoveredIndex(null);
    } else {
      setHoveredStart(false);
      setHoveredIndex(closestIdx);
    }
  };

  const hoveredData = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  // Format date for display
  const formatDate = (dateStr: string, full = false) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (full) {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Y-axis labels - nice round numbers
  const yAxisLabels = useMemo(() => {
    const labels: { value: number; y: number; label: string }[] = [];
    const range = chartBounds.maxY - chartBounds.minY;

    // Determine step size for nice numbers
    const rawStep = range / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let niceStep: number;
    if (normalized <= 1) niceStep = magnitude;
    else if (normalized <= 2) niceStep = 2 * magnitude;
    else if (normalized <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    const startVal = Math.ceil(chartBounds.minY / niceStep) * niceStep;
    for (let v = startVal; v <= chartBounds.maxY; v += niceStep) {
      const y = getY(v);
      if (y >= padding.top && y <= chartHeight - padding.bottom) {
        labels.push({
          value: v,
          y,
          label: v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
        });
      }
    }

    return labels;
  }, [chartBounds, dimensions]);

  // X-axis date labels
  const xAxisLabels = useMemo(() => {
    if (!hasData || chartData.length === 0) return [];

    const labels: { x: number; label: string }[] = [];
    const numLabels = Math.min(5, chartData.length);

    // Handle single data point case
    if (numLabels === 1) {
      labels.push({
        x: getX(0),
        label: formatDate(chartData[0].date)
      });
      return labels;
    }

    for (let i = 0; i < numLabels; i++) {
      const idx = Math.floor((i / (numLabels - 1)) * (chartData.length - 1));
      if (chartData[idx]) {
        labels.push({
          x: getX(idx),
          label: formatDate(chartData[idx].date)
        });
      }
    }

    return labels;
  }, [chartData, hasData, dimensions]);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-gradient-to-br from-card/80 to-card/40 rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Total P&L</div>
          <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
          </div>
          <div className={`text-xs mt-1 ${stats.totalReturn >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
            {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}% return
          </div>
        </div>

        <div className="bg-gradient-to-br from-card/80 to-card/40 rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Win Rate</div>
          <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {stats.winRate.toFixed(0)}%
          </div>
          <div className="text-xs text-muted mt-1">
            <span className="text-emerald-400">{stats.winTrades}W</span>
            <span className="mx-1">/</span>
            <span className="text-red-400">{stats.lossTrades}L</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-card/80 to-card/40 rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Trades</div>
          <div className="text-2xl font-bold text-foreground">{stats.trades}</div>
          <div className="text-xs text-muted mt-1">
            {stats.sessions} sessions (<span className="text-emerald-400">{stats.winSessions}W</span>/<span className="text-red-400">{stats.lossSessions}L</span>)
          </div>
        </div>

        <div className="bg-gradient-to-br from-card/80 to-card/40 rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Max Drawdown</div>
          <div className="text-2xl font-bold text-red-400">-{stats.maxDD.toFixed(1)}%</div>
          <div className="text-xs text-muted mt-1">from peak</div>
        </div>

        <div className="bg-gradient-to-br from-card/80 to-card/40 rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Current Equity</div>
          <div className="text-2xl font-bold text-foreground">
            ${stats.currentEquity.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
          <div className={`text-xs mt-1 flex items-center gap-1 ${stats.atPeak ? 'text-emerald-400' : 'text-muted'}`}>
            {stats.atPeak ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                New High!
              </>
            ) : (
              `Peak: $${stats.peak.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-card/80 to-card/40 rounded-xl p-4 border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Avg per Trade</div>
          <div className={`text-2xl font-bold ${stats.trades > 0 && stats.totalPnl / stats.trades >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.trades > 0 ? (stats.totalPnl / stats.trades >= 0 ? '+' : '') + '$' + Math.abs(stats.totalPnl / stats.trades).toFixed(0) : '$0'}
          </div>
          <div className="text-xs text-muted mt-1">expectancy</div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        {/* Hover Info Bar - Fixed at top */}
        <div className="px-4 py-2.5 bg-card/80 border-b border-border/30">
          {hoveredStart ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span className="font-medium text-foreground text-sm">Starting Point</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted text-xs">Starting Equity:</span>
                  <span className="font-bold text-foreground">
                    ${startingEquity.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          ) : hoveredData && hoveredIndex !== null ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${hoveredData.pnl >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="font-medium text-foreground text-sm">
                  {formatDate(hoveredData.date, true)}
                </span>
                {newHighs.includes(hoveredIndex) && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                    NEW HIGH
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted text-xs">P&L:</span>
                  <span className={`font-bold ${hoveredData.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {hoveredData.pnl >= 0 ? '+' : ''}${hoveredData.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted text-xs">Equity:</span>
                  <span className="font-bold text-foreground">
                    ${hoveredData.cumulative.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted text-xs">Drawdown:</span>
                  <span className={`font-bold ${hoveredData.drawdownPercent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hoveredData.drawdownPercent > 0 ? `-${hoveredData.drawdownPercent.toFixed(1)}%` : 'At Peak'}
                  </span>
                </div>
                {hoveredData.tradeCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-xs">Trades:</span>
                    <span className="font-medium text-foreground">{hoveredData.tradeCount}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Hover over the chart for details</span>
              <div className="flex items-center gap-6">
                <span>Latest: <span className="text-foreground font-medium">{chartData.length > 0 ? formatDate(chartData[chartData.length - 1].date) : '-'}</span></span>
                <span>Equity: <span className="text-foreground font-medium">${stats.currentEquity.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Chart Area */}
        <div
          ref={containerRef}
          className="relative bg-gradient-to-b from-card/50 to-card/20"
          style={{ height: chartHeight + drawdownHeight + 10 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHoveredIndex(null); setHoveredStart(false); }}
        >
          {/* Tag Pills Overlay */}
          {selectedTags.length > 0 && (
            <div className="absolute top-3 left-20 z-10 flex flex-wrap gap-1.5 max-w-[60%]">
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${tag.color.bg} ${tag.color.text} ${tag.color.border} border backdrop-blur-sm`}
                >
                  {tag.name}
                  {onRemoveTag && (
                    <button
                      onClick={() => onRemoveTag(tag.id)}
                      className="ml-0.5 hover:bg-black/20 rounded p-0.5 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

        {dimensions.width > 0 && (
          <svg width={dimensions.width} height={chartHeight + drawdownHeight + 10} className="absolute inset-0">
            <defs>
              {/* Gradient for drawdown area */}
              <linearGradient id="drawdownFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
              </linearGradient>

              {/* Glow filters */}
              <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Y-axis labels and grid */}
            {yAxisLabels.map((label, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={label.y}
                  x2={dimensions.width - padding.right}
                  y2={label.y}
                  stroke="currentColor"
                  strokeOpacity="0.06"
                />
                <text
                  x={padding.left - 10}
                  y={label.y + 4}
                  className="text-[11px] fill-muted"
                  textAnchor="end"
                >
                  {label.label}
                </text>
              </g>
            ))}

            {/* Starting equity baseline */}
            {hasData && (
              <line
                x1={padding.left}
                y1={getY(startingEquity)}
                x2={dimensions.width - padding.right}
                y2={getY(startingEquity)}
                stroke="#6b7280"
                strokeOpacity="0.4"
                strokeDasharray="6 3"
              />
            )}

            {/* Drawdown area (shaded region between peak and actual) */}
            {hasData && (
              <path
                d={drawdownAreaPath}
                fill="url(#drawdownFill)"
              />
            )}

            {/* Equity line segments with dynamic colors */}
            {lineSegments.map((seg, i) => (
              <line
                key={i}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={seg.isGain ? "#10b981" : "#ef4444"}
                strokeWidth="2.5"
                strokeLinecap="round"
                filter={seg.isGain ? "url(#glowGreen)" : "url(#glowRed)"}
              />
            ))}

            {/* Starting equity point - rendered after lines so it's on top */}
            {hasData && (
              <g>
                {/* Hover line */}
                {hoveredStart && (
                  <line
                    x1={getStartX()}
                    y1={padding.top}
                    x2={getStartX()}
                    y2={chartHeight}
                    stroke="#fff"
                    strokeOpacity={0.15}
                  />
                )}
                {/* Visible point */}
                <circle
                  cx={getStartX()}
                  cy={getY(startingEquity)}
                  r={hoveredStart ? 7 : 5}
                  fill="#6b7280"
                  stroke={hoveredStart ? "#fff" : "#374151"}
                  strokeWidth={2}
                  className="transition-all duration-100"
                />
              </g>
            )}

            {/* Data points */}
            {hasData && chartData.map((d, i) => {
              const x = getX(i);
              const y = getY(d.cumulative);
              const isHovered = hoveredIndex === i;
              const isWin = d.pnl >= 0;
              const isNewHigh = newHighs.includes(i);
              const isSelected = selectedDate === d.date;

              return (
                <g
                  key={i}
                  onClick={() => {
                    setSelectedDate(isSelected ? null : d.date);
                    if (!isSelected && onDayClick) {
                      onDayClick(d.date, d.dateEnd);
                    }
                  }}
                  style={{ cursor: onDayClick ? 'pointer' : 'default' }}
                >
                  {/* Hover line */}
                  {(isHovered || isSelected) && (
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={chartHeight}
                      stroke={isSelected ? "#3b82f6" : "#fff"}
                      strokeOpacity={isSelected ? 0.4 : 0.15}
                    />
                  )}

                  {/* Clickable area (invisible, larger hit target) */}
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill="transparent"
                  />

                  {/* Point */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 8 : isHovered ? 7 : isNewHigh ? 5 : 4}
                    fill={isSelected ? "#3b82f6" : isWin ? "#10b981" : "#ef4444"}
                    stroke={isSelected ? "#fff" : isHovered ? "#fff" : isNewHigh ? "#fbbf24" : "transparent"}
                    strokeWidth={isSelected ? 3 : isHovered ? 2 : isNewHigh ? 2 : 0}
                    className="transition-all duration-100"
                  />
                </g>
              );
            })}

            {/* X-axis labels */}
            {xAxisLabels.map((label, i) => (
              <text
                key={i}
                x={label.x}
                y={chartHeight - 8}
                className="text-[10px] fill-muted"
                textAnchor="middle"
              >
                {label.label}
              </text>
            ))}

            {/* Drawdown section - histogram */}
            <g>
              {/* Separator line */}
              <line
                x1={padding.left}
                y1={chartHeight}
                x2={dimensions.width - padding.right}
                y2={chartHeight}
                stroke="currentColor"
                strokeOpacity="0.1"
              />

              {/* Labels */}
              <text x={padding.left} y={chartHeight + 12} className="text-[9px] fill-muted uppercase tracking-wide">
                Drawdown
              </text>
              {maxDrawdownPct > 0 && (
                <text x={dimensions.width - padding.right} y={chartHeight + 12} className="text-[9px] fill-red-400" textAnchor="end">
                  Max: -{maxDrawdownPct.toFixed(1)}%
                </text>
              )}

              {/* Drawdown bars */}
              {hasData && chartData.map((d, i) => {
                if (d.drawdownPercent <= 0) return null;
                const x = getX(i);
                const barWidth = Math.max(4, (dimensions.width - padding.left - padding.right) / (chartData.length + 1) * 0.6);
                const barHeight = (d.drawdownPercent / maxDrawdownPct) * (drawdownHeight - 20);
                const isHovered = hoveredIndex === i;
                const isMaxDD = d.drawdownPercent === maxDrawdownPct;

                return (
                  <g key={i}>
                    <rect
                      x={x - barWidth / 2}
                      y={chartHeight + 16}
                      width={barWidth}
                      height={barHeight}
                      fill={isMaxDD ? "#dc2626" : "#ef4444"}
                      fillOpacity={isHovered ? 0.9 : isMaxDD ? 0.7 : 0.4}
                      rx="2"
                    />
                    {/* Show percentage on hover */}
                    {isHovered && (
                      <text
                        x={x}
                        y={chartHeight + 16 + barHeight + 10}
                        className="text-[8px] fill-red-400 font-medium"
                        textAnchor="middle"
                      >
                        -{d.drawdownPercent.toFixed(1)}%
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* No data state */}
            {!hasData && (
              <g>
                <rect
                  x={padding.left}
                  y={padding.top}
                  width={dimensions.width - padding.left - padding.right}
                  height={chartHeight - padding.top - padding.bottom}
                  fill="currentColor"
                  fillOpacity="0.02"
                  rx="8"
                />
                <text
                  x={dimensions.width / 2}
                  y={chartHeight / 2}
                  className="text-sm fill-muted"
                  textAnchor="middle"
                >
                  No trades in this period
                </text>
              </g>
            )}
          </svg>
        )}

        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span>Win</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-amber-400"></div>
          <span>New High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2.5 rounded bg-red-500/40"></div>
          <span>Drawdown</span>
        </div>
      </div>
    </div>
  );
};
