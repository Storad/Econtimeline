"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Save,
  RefreshCw,
  Tag as TagIcon,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Trade, TradeFormData, DEFAULT_TRADE_FORM, AssetType } from "./types";
import { useTagSettings, TAG_COLORS } from "@/context/TagContext";

const MAX_TAGS = 5;

interface TradeFormProps {
  date: string;
  tags: string[]; // Preset tag suggestions
  editingTrade?: Trade | null;
  onSave: (trade: TradeFormData) => Promise<void>;
  onCancel: () => void;
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "STOCK", label: "Stock" },
  { value: "FUTURES", label: "Futures" },
  { value: "OPTIONS", label: "Options" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "FOREX", label: "Forex" },
];

// Asset type colors (warm to cool, left to right)
const ASSET_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; bgSelected: string }> = {
  STOCK: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", bgSelected: "bg-orange-500/20" },
  FUTURES: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", bgSelected: "bg-amber-500/20" },
  OPTIONS: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", bgSelected: "bg-cyan-500/20" },
  FOREX: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", bgSelected: "bg-indigo-500/20" },
  CRYPTO: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", bgSelected: "bg-purple-500/20" },
};

const LAST_ASSET_TYPE_KEY = "lastAssetType";

export default function TradeForm({
  date,
  tags,
  editingTrade,
  onSave,
  onCancel,
}: TradeFormProps) {
  const getLastAssetType = (): AssetType => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LAST_ASSET_TYPE_KEY);
      if (saved && ASSET_TYPES.some(t => t.value === saved)) {
        return saved as AssetType;
      }
    }
    return "STOCK";
  };

  const [formData, setFormData] = useState<TradeFormData>(() => {
    if (editingTrade) {
      return {
        ticker: editingTrade.ticker,
        direction: editingTrade.direction,
        time: editingTrade.time || "",
        entryPrice: editingTrade.entryPrice?.toString() || "",
        exitPrice: editingTrade.exitPrice?.toString() || "",
        size: editingTrade.size?.toString() || "",
        pnl: editingTrade.pnl.toString(),
        notes: editingTrade.notes || "",
        tags: editingTrade.tags || [],
        assetType: editingTrade.assetType || "STOCK",
        status: editingTrade.status || "CLOSED",
        closeDate: editingTrade.closeDate || "",
        optionType: editingTrade.optionType || "",
        strikePrice: editingTrade.strikePrice?.toString() || "",
        expirationDate: editingTrade.expirationDate || "",
        premium: editingTrade.premium?.toString() || "",
        underlyingTicker: editingTrade.underlyingTicker || "",
      };
    }
    return {
      ...DEFAULT_TRADE_FORM,
      assetType: getLastAssetType(),
    };
  });

  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const durationPickerRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Get tag settings from context
  const { tagSettings, getTagColor } = useTagSettings();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (durationPickerRef.current && !durationPickerRef.current.contains(e.target as Node)) {
        setShowDurationPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !editingTrade) {
      localStorage.setItem(LAST_ASSET_TYPE_KEY, formData.assetType);
    }
  }, [formData.assetType, editingTrade]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTicker = formData.assetType === "OPTIONS"
      ? formData.underlyingTicker
      : formData.ticker;

    if (!effectiveTicker) return;
    if (formData.status === "CLOSED" && !formData.pnl) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        ticker: effectiveTicker,
        closeDate: formData.status === "CLOSED" && !formData.closeDate ? date : formData.closeDate,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => {
      // If removing, always allow
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
      }
      // If adding, check max limit
      if (prev.tags.length >= MAX_TAGS) {
        return prev; // Don't add more than MAX_TAGS
      }
      return { ...prev, tags: [...prev.tags, tag] };
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOptions = formData.assetType === "OPTIONS";

  const canSubmit = () => {
    if (isOptions) {
      if (!formData.underlyingTicker || !formData.optionType) return false;
    } else {
      if (!formData.ticker) return false;
    }
    if (formData.status === "CLOSED" && !formData.pnl) return false;
    return true;
  };

  const numberInputClass = "w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  const updateDuration = (hours: string, minutes: string) => {
    setDurationHours(hours);
    setDurationMinutes(minutes);
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (h === 0 && m === 0) {
      setFormData((prev) => ({ ...prev, time: "" }));
    } else if (h === 0) {
      setFormData((prev) => ({ ...prev, time: `${m}m` }));
    } else if (m === 0) {
      setFormData((prev) => ({ ...prev, time: `${h}h` }));
    } else {
      setFormData((prev) => ({ ...prev, time: `${h}h ${m}m` }));
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (editingTrade?.expirationDate) {
      const parts = editingTrade.expirationDate.split("-");
      return parts[1] || "";
    }
    return "";
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    if (editingTrade?.expirationDate) {
      const parts = editingTrade.expirationDate.split("-");
      return parts[2] || "";
    }
    return "";
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    if (editingTrade?.expirationDate) {
      const parts = editingTrade.expirationDate.split("-");
      return parts[0] || "";
    }
    return "";
  });

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  const updateExpirationDate = (month: string, day: string, year: string) => {
    setSelectedMonth(month);
    setSelectedDay(day);
    setSelectedYear(year);
    if (month && day && year.length === 4) {
      const dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      setFormData((prev) => ({ ...prev, expirationDate: dateStr }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
        <div>
          <h3 className="font-bold text-lg">{editingTrade ? "Edit Trade" : "Log Trade"}</h3>
          <p className="text-sm text-muted">{formatDate(date)}</p>
        </div>
        <button type="button" onClick={onCancel} className="p-2 rounded-lg hover:bg-card-hover transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="p-5 overflow-y-auto flex-1 min-h-0">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Asset Type */}
            <div>
              <label className="text-xs font-medium text-muted mb-2 block">Asset Type</label>
              <div className="flex flex-wrap gap-1.5">
                {ASSET_TYPES.map((type) => {
                  const colors = ASSET_TYPE_COLORS[type.value];
                  const isSelected = formData.assetType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, assetType: type.value }))}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        isSelected
                          ? `${colors.bgSelected} ${colors.border} ${colors.text} font-medium`
                          : `${colors.bg} border-border ${colors.text} hover:${colors.border}`
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ticker & Direction */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted mb-2 block">
                  {formData.assetType === "FUTURES" ? "Contract" :
                   formData.assetType === "FOREX" ? "Currency Pair" :
                   formData.assetType === "CRYPTO" ? "Token / Coin" : "Ticker"}
                </label>
                <input
                  type="text"
                  value={isOptions ? formData.underlyingTicker : formData.ticker}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [isOptions ? "underlyingTicker" : "ticker"]: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={
                    formData.assetType === "FUTURES" ? "ES, GC..." :
                    formData.assetType === "FOREX" ? "EURUSD, USDJPY..." :
                    formData.assetType === "CRYPTO" ? "BTC, XRP..." : "SPY, AAPL..."
                  }
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-2 block">Direction</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, direction: "LONG" }))}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-all text-sm ${
                      formData.direction === "LONG"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-card border-border text-muted hover:border-emerald-500/50"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    {isOptions ? "Buy" : "Long"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, direction: "SHORT" }))}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-all text-sm ${
                      formData.direction === "SHORT"
                        ? "bg-red-500/20 border-red-500 text-red-400"
                        : "bg-card border-border text-muted hover:border-red-500/50"
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    {isOptions ? "Sell" : "Short"}
                  </button>
                </div>
              </div>
            </div>

            {/* Options: Call/Put & Strike */}
            {isOptions && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted mb-2 block">Option Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, optionType: "CALL" }))}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                        formData.optionType === "CALL"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-card border-border text-muted hover:border-emerald-500/50"
                      }`}
                    >
                      Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, optionType: "PUT" }))}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                        formData.optionType === "PUT"
                          ? "bg-red-500/20 border-red-500 text-red-400"
                          : "bg-card border-border text-muted hover:border-red-500/50"
                      }`}
                    >
                      Put
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted mb-2 block">Strike</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.strikePrice}
                    onChange={(e) => setFormData((prev) => ({ ...prev, strikePrice: e.target.value }))}
                    placeholder="450.00"
                    className={numberInputClass}
                  />
                </div>
              </div>
            )}

            {/* Options: Expiration */}
            {isOptions && (
              <div className="relative" ref={datePickerRef}>
                <label className="text-xs font-medium text-muted mb-2 block">Expiration</label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`${numberInputClass} text-left ${!formData.expirationDate ? "text-muted" : ""}`}
                >
                  {formatDateForDisplay(formData.expirationDate) || "Select date"}
                </button>
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-xl z-50">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={selectedMonth}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                          updateExpirationDate(val, selectedDay, selectedYear);
                        }}
                        placeholder="MM"
                        className="w-10 px-1 py-1.5 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <span className="text-sm">/</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={selectedDay}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                          updateExpirationDate(selectedMonth, val, selectedYear);
                        }}
                        placeholder="DD"
                        className="w-10 px-1 py-1.5 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <span className="text-sm">/</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={selectedYear}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                          updateExpirationDate(selectedMonth, selectedDay, val);
                        }}
                        placeholder="YYYY"
                        className="w-14 px-1 py-1.5 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="ml-1 px-2 py-1.5 bg-accent text-white text-xs rounded hover:bg-accent/90"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Entry & Exit Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted mb-2 block">Entry Price</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.entryPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, entryPrice: e.target.value }))}
                  placeholder="0.00"
                  className={numberInputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-2 block">Exit Price</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.exitPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, exitPrice: e.target.value }))}
                  placeholder="0.00"
                  className={numberInputClass}
                />
              </div>
            </div>

            {/* Size, Duration, P&L */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted mb-2 block">
                  {isOptions ? "Contracts" : "Size"}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.size}
                  onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
                  placeholder="Qty"
                  className={numberInputClass}
                />
              </div>
              <div className="relative" ref={durationPickerRef}>
                <label className="text-xs font-medium text-muted mb-2 block">Duration</label>
                <button
                  type="button"
                  onClick={() => setShowDurationPicker(!showDurationPicker)}
                  className={`${numberInputClass} text-left ${!formData.time ? "text-muted" : ""}`}
                >
                  {formData.time || "Select"}
                </button>
                {showDurationPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-xl z-50">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={durationHours}
                        onChange={(e) => updateDuration(e.target.value.replace(/\D/g, ""), durationMinutes)}
                        placeholder="H"
                        className="w-10 px-1 py-1.5 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <span className="text-sm font-bold">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={durationMinutes}
                        onChange={(e) => updateDuration(durationHours, e.target.value.replace(/\D/g, ""))}
                        placeholder="M"
                        className="w-10 px-1 py-1.5 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDurationPicker(false)}
                        className="ml-1 px-2 py-1.5 bg-accent text-white text-xs rounded hover:bg-accent/90"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-2 block">P&L</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.pnl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pnl: e.target.value }))}
                  placeholder="+/- 0.00"
                  className={numberInputClass}
                  required={formData.status === "CLOSED"}
                />
              </div>
            </div>

            {/* Trade Status */}
            <div>
              <label className="text-xs font-medium text-muted mb-2 block">Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, status: "CLOSED" }))}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                    formData.status === "CLOSED"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-card border-border text-muted hover:border-emerald-500/50"
                  }`}
                >
                  Closed
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, status: "OPEN" }))}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                    formData.status === "OPEN"
                      ? "bg-amber-500/20 border-amber-500 text-amber-400"
                      : "bg-card border-border text-muted hover:border-amber-500/50"
                  }`}
                >
                  Open
                </button>
              </div>
              {formData.status === "OPEN" && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>Open trades won&apos;t count toward stats until closed</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted flex items-center gap-1">
                  <TagIcon className="w-3.5 h-3.5" />
                  Tags
                </label>
                <span className={`text-[10px] ${formData.tags.length >= MAX_TAGS ? 'text-amber-400' : 'text-muted'}`}>
                  {formData.tags.length}/{MAX_TAGS}
                </span>
              </div>

              {/* Selected Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {formData.tags.map((tagName) => {
                    const colors = getTagColor(tagName);
                    return (
                      <button
                        key={tagName}
                        type="button"
                        onClick={() => toggleTag(tagName)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {tagName}
                        <X className="w-3 h-3" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tag Sections */}
              <div className="space-y-1.5">
                {tagSettings.sections
                  .sort((a, b) => a.order - b.order)
                  .map((section) => {
                    const colors = TAG_COLORS[section.color] || TAG_COLORS.blue;
                    const isExpanded = expandedSections.has(section.id);

                    return (
                      <div key={section.id} className={`rounded-lg border ${colors.border} overflow-hidden`}>
                        <button
                          type="button"
                          onClick={() => toggleSection(section.id)}
                          className={`w-full ${colors.bg} px-2.5 py-1.5 flex items-center justify-between text-xs`}
                        >
                          <span className={`font-medium ${colors.text}`}>{section.name}</span>
                          {isExpanded ? (
                            <ChevronDown className={`w-3.5 h-3.5 ${colors.text}`} />
                          ) : (
                            <ChevronRight className={`w-3.5 h-3.5 ${colors.text}`} />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="p-2 bg-card-hover/30 flex flex-wrap gap-1">
                            {section.tags
                              .sort((a, b) => a.order - b.order)
                              .map((tag) => {
                                const isSelected = formData.tags.includes(tag.name);
                                const isDisabled = !isSelected && formData.tags.length >= MAX_TAGS;
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => !isDisabled && toggleTag(tag.name)}
                                    disabled={isDisabled}
                                    className={`px-2 py-0.5 text-[11px] rounded border transition-all ${
                                      isSelected
                                        ? `${colors.bg} ${colors.border} ${colors.text}`
                                        : isDisabled
                                          ? "border-border bg-card text-muted/50 cursor-not-allowed"
                                          : `border-border bg-card hover:${colors.border} text-muted hover:${colors.text}`
                                    }`}
                                  >
                                    {tag.name}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted mb-2 block">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Trade reasoning, lessons learned..."
                rows={3}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/50 bg-card/50 flex items-center justify-end gap-3 flex-shrink-0">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !canSubmit()}
          className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editingTrade ? "Update" : "Save Trade"}
        </button>
      </div>
    </form>
  );
}
