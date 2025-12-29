"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Hash,
  FileText,
  Save,
  RefreshCw,
  Tag as TagIcon,
  Plus,
  BarChart3,
  CircleDot,
  Calendar,
  Info,
} from "lucide-react";
import { Tag, Trade, TradeFormData, DEFAULT_TRADE_FORM, AssetType, TradeStatus } from "./types";

interface TradeFormProps {
  date: string;
  tags: Tag[];
  editingTrade?: Trade | null;
  onSave: (trade: TradeFormData) => Promise<void>;
  onCancel: () => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
  onDeleteTag?: (id: string) => Promise<boolean>;
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "STOCK", label: "Stock" },
  { value: "FUTURES", label: "Futures" },
  { value: "OPTIONS", label: "Options" },
  { value: "FOREX", label: "Forex" },
  { value: "CRYPTO", label: "Crypto" },
];

const LAST_ASSET_TYPE_KEY = "lastAssetType";

export default function TradeForm({
  date,
  tags,
  editingTrade,
  onSave,
  onCancel,
  onCreateTag,
  onDeleteTag,
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
        tagIds: editingTrade.tags.map((t) => t.id),
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
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6b7280");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Preset colors for custom tags
  const TAG_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff", "#6b7280",
  ];
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const durationPickerRef = useRef<HTMLDivElement>(null);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (durationPickerRef.current && !durationPickerRef.current.contains(e.target as Node)) {
        setShowDurationPicker(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
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

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const tag = await onCreateTag(newTagName.trim(), newTagColor);
    if (tag) {
      setFormData((prev) => ({
        ...prev,
        tagIds: [...prev.tagIds, tag.id],
      }));
      setNewTagName("");
      setShowNewTagInput(false);
    }
  };

  // Organize tags by type
  const setupTags = tags.filter((t) => t.type === "SETUP");
  const emotionTags = tags.filter((t) => t.type === "EMOTION");
  const customTags = tags.filter((t) => t.type === "CUSTOM");

  const handleDeleteTag = async (tagId: string) => {
    if (!onDeleteTag) return;
    // Remove from selected if it was selected
    if (formData.tagIds.includes(tagId)) {
      setFormData((prev) => ({
        ...prev,
        tagIds: prev.tagIds.filter((id) => id !== tagId),
      }));
    }
    await onDeleteTag(tagId);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
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

  // Common input class to hide number spinners
  const numberInputClass = "w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  // Duration state (hours and minutes)
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  // Update form time when duration changes
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

  // Date picker state - initialize from existing expiration date if editing
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

      {/* Form Content - Two Column Layout */}
      <div className="p-5 overflow-y-auto flex-1 min-h-0">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">

          {/* LEFT COLUMN - Trade Entry Info */}
          <div className="space-y-4">
            {/* Asset Type */}
            <div>
              <label className="text-xs font-medium text-muted mb-2 block">Asset Type</label>
              <div className="flex flex-wrap gap-1.5">
                {ASSET_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, assetType: type.value }))}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      formData.assetType === type.value
                        ? "bg-accent/20 border-accent text-accent font-medium"
                        : "bg-card border-border text-muted hover:border-accent/50"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticker & Direction Row */}
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

          {/* RIGHT COLUMN - Tags & Notes */}
          <div className="space-y-4">
            {/* Tags - Organized by Type */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted block">Tags</label>

              {/* Setup Tags */}
              {setupTags.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted/70 mb-1 block">Setup</span>
                  <div className="flex flex-wrap gap-1.5">
                    {setupTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          formData.tagIds.includes(tag.id)
                            ? "border-transparent"
                            : "border-border bg-card hover:border-border/80"
                        }`}
                        style={
                          formData.tagIds.includes(tag.id)
                            ? { backgroundColor: tag.color + "30", color: tag.color, borderColor: tag.color }
                            : {}
                        }
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Emotion Tags */}
              {emotionTags.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted/70 mb-1 block">Emotion</span>
                  <div className="flex flex-wrap gap-1.5">
                    {emotionTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          formData.tagIds.includes(tag.id)
                            ? "border-transparent"
                            : "border-border bg-card hover:border-border/80"
                        }`}
                        style={
                          formData.tagIds.includes(tag.id)
                            ? { backgroundColor: tag.color + "30", color: tag.color, borderColor: tag.color }
                            : {}
                        }
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Tags */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted/70 mb-1 block">Custom</span>
                <div className="flex flex-wrap gap-1.5">
                  {customTags.map((tag) => (
                    <div key={tag.id} className="group relative flex items-center">
                      <button
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          formData.tagIds.includes(tag.id)
                            ? "border-transparent pr-6"
                            : "border-border bg-card hover:border-border/80 group-hover:pr-6"
                        }`}
                        style={
                          formData.tagIds.includes(tag.id)
                            ? { backgroundColor: tag.color + "30", color: tag.color, borderColor: tag.color }
                            : {}
                        }
                      >
                        {tag.name}
                      </button>
                      {onDeleteTag && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTag(tag.id);
                          }}
                          className="absolute right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-red-500/20 text-red-400 transition-all"
                          title="Delete tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!showNewTagInput && (
                    <button
                      type="button"
                      onClick={() => setShowNewTagInput(true)}
                      className="px-2.5 py-1 text-xs rounded-full border border-dashed border-accent/50 text-accent hover:bg-accent/10"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {showNewTagInput && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative" ref={colorPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-7 h-7 rounded-lg border border-border hover:border-accent/50 transition-colors"
                        style={{ backgroundColor: newTagColor }}
                      />
                      {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-xl z-50">
                          <div className="flex items-center gap-1.5">
                            {TAG_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => {
                                  setNewTagColor(color);
                                  setShowColorPicker(false);
                                }}
                                className={`w-4 h-4 rounded flex-shrink-0 border transition-all hover:scale-110 ${
                                  newTagColor === color ? "border-white" : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag name"
                      className="flex-1 px-2 py-1.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                    />
                    <button type="button" onClick={handleCreateTag} className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg">
                      Add
                    </button>
                    <button type="button" onClick={() => setShowNewTagInput(false)} className="p-1 text-muted hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
