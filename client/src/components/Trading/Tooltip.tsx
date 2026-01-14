"use client";

import React, { useState, useRef } from "react";
import { HelpCircle } from "lucide-react";

// Tooltip content type for structured tooltips
export interface TooltipContent {
  title: string;
  description: string;
  details?: { label: string; value: string; color?: string }[];
  formula?: string;
  tip?: string;
}

// Tooltip Component - clean, visual design
export const Tooltip = ({ children, content }: { children: React.ReactNode; content: TooltipContent }) => {
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
        <div className="px-3 py-2 border-b border-border/40">
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
            <div className="mt-3 pt-2 border-t border-border/40">
              <p className="text-[11px] text-muted/80">{content.tip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Info icon button for tooltips
export const InfoTip = ({ content }: { content: TooltipContent }) => (
  <Tooltip content={content}>
    <HelpCircle className="w-3.5 h-3.5 text-muted/50 hover:text-accent-light cursor-help ml-1 flex-shrink-0 transition-colors" />
  </Tooltip>
);
