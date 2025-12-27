"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Tag, Trade, TradeFormData, DEFAULT_TRADE_FORM, AssetType, TradeStatus } from "./types";

interface TradeFormProps {
  date: string;
  tags: Tag[];
  editingTrade?: Trade | null;
  onSave: (trade: TradeFormData) => Promise<void>;
  onCancel: () => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
}

const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: "STOCK", label: "Stock", icon: "S" },
  { value: "FUTURES", label: "Futures", icon: "F" },
  { value: "OPTIONS", label: "Options", icon: "O" },
  { value: "FOREX", label: "Forex", icon: "FX" },
  { value: "CRYPTO", label: "Crypto", icon: "C" },
];

const LAST_ASSET_TYPE_KEY = "lastAssetType";

export default function TradeForm({
  date,
  tags,
  editingTrade,
  onSave,
  onCancel,
  onCreateTag,
}: TradeFormProps) {
  // Get last used asset type from localStorage
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
        // New fields
        assetType: editingTrade.assetType || "STOCK",
        status: editingTrade.status || "CLOSED",
        closeDate: editingTrade.closeDate || "",
        // Options fields
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

  // Save asset type to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && !editingTrade) {
      localStorage.setItem(LAST_ASSET_TYPE_KEY, formData.assetType);
    }
  }, [formData.assetType, editingTrade]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // For options, ticker is derived from underlying
    const effectiveTicker = formData.assetType === "OPTIONS"
      ? formData.underlyingTicker
      : formData.ticker;

    // Validate required fields
    if (!effectiveTicker) return;
    // P&L only required for closed trades
    if (formData.status === "CLOSED" && !formData.pnl) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        ticker: effectiveTicker,
        // If closing today, set closeDate to current date
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

  const setupTags = tags.filter((t) => t.type === "SETUP");
  const emotionTags = tags.filter((t) => t.type === "EMOTION");
  const customTags = tags.filter((t) => t.type === "CUSTOM");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isOptions = formData.assetType === "OPTIONS";

  // Determine if form can be submitted
  const canSubmit = () => {
    if (isOptions) {
      if (!formData.underlyingTicker || !formData.optionType) return false;
    } else {
      if (!formData.ticker) return false;
    }
    if (formData.status === "CLOSED" && !formData.pnl) return false;
    return true;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div>
          <h3 className="font-bold text-lg">
            {editingTrade ? "Edit Trade" : "Log Trade"}
          </h3>
          <p className="text-xs text-muted">{formatDate(date)}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-card-hover transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* Asset Type Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
            <BarChart3 className="w-4 h-4" />
            Asset Type
          </label>
          <div className="flex gap-1.5">
            {ASSET_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, assetType: type.value }))}
                className={`flex-1 px-2 py-2 text-xs rounded-lg border transition-all ${
                  formData.assetType === type.value
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-card border-border text-muted hover:border-accent/50"
                }`}
              >
                <div className="font-bold">{type.icon}</div>
                <div className="text-[10px] mt-0.5">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Trade Status Toggle */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
            <CircleDot className="w-4 h-4" />
            Trade Status
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, status: "CLOSED" }))}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                formData.status === "CLOSED"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                  : "bg-card border-border text-muted hover:border-emerald-500/50"
              }`}
            >
              Closed Trade
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, status: "OPEN" }))}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                formData.status === "OPEN"
                  ? "bg-amber-500/20 border-amber-500 text-amber-400"
                  : "bg-card border-border text-muted hover:border-amber-500/50"
              }`}
            >
              Open Trade
            </button>
          </div>
          {formData.status === "OPEN" && (
            <p className="text-xs text-amber-400 mt-2">
              Open trades won&apos;t count toward your stats until closed.
            </p>
          )}
        </div>

        {/* Options-specific fields */}
        {isOptions && (
          <>
            {/* Option Type (Call/Put) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                Option Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, optionType: "CALL" }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    formData.optionType === "CALL"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-card border-border text-muted hover:border-emerald-500/50"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Call
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, optionType: "PUT" }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    formData.optionType === "PUT"
                      ? "bg-red-500/20 border-red-500 text-red-400"
                      : "bg-card border-border text-muted hover:border-red-500/50"
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Put
                </button>
              </div>
            </div>

            {/* Underlying Ticker & Strike */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                  <Hash className="w-4 h-4" />
                  Underlying
                </label>
                <input
                  type="text"
                  value={formData.underlyingTicker}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      underlyingTicker: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SPY, AAPL..."
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                  Strike Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.strikePrice}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, strikePrice: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                />
              </div>
            </div>

            {/* Expiration & Premium */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                  <Calendar className="w-4 h-4" />
                  Expiration
                </label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, expirationDate: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                  <DollarSign className="w-4 h-4" />
                  Premium
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.premium}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, premium: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                />
              </div>
            </div>
          </>
        )}

        {/* Standard fields for non-options */}
        {!isOptions && (
          <>
            {/* Row 1: Ticker & Direction */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                  <Hash className="w-4 h-4" />
                  Ticker
                </label>
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ticker: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={
                    formData.assetType === "FUTURES" ? "ES, NQ, CL..." :
                    formData.assetType === "FOREX" ? "EUR/USD, GBP/JPY..." :
                    formData.assetType === "CRYPTO" ? "BTC, ETH, SOL..." :
                    "SPY, AAPL, MSFT..."
                  }
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                  Direction
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, direction: "LONG" }))
                    }
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                      formData.direction === "LONG"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-card border-border text-muted hover:border-emerald-500/50"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Long
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, direction: "SHORT" }))
                    }
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                      formData.direction === "SHORT"
                        ? "bg-red-500/20 border-red-500 text-red-400"
                        : "bg-card border-border text-muted hover:border-red-500/50"
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Short
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Direction for Options */}
        {isOptions && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
              Position
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, direction: "LONG" }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                  formData.direction === "LONG"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-card border-border text-muted hover:border-emerald-500/50"
                }`}
              >
                Buy (Long)
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, direction: "SHORT" }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                  formData.direction === "SHORT"
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-card border-border text-muted hover:border-red-500/50"
                }`}
              >
                Sell (Short)
              </button>
            </div>
          </div>
        )}

        {/* Row 2: Entry & Exit Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
              Entry Price
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.entryPrice}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, entryPrice: e.target.value }))
              }
              placeholder="0.00"
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
              Exit Price
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.exitPrice}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, exitPrice: e.target.value }))
              }
              placeholder="0.00"
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
            />
          </div>
        </div>

        {/* Row 3: Size, Time & P&L */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
              {isOptions ? "Contracts" : "Size"}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.size}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, size: e.target.value }))
              }
              placeholder="Qty"
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
              <Clock className="w-4 h-4" />
              Time
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, time: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
              <DollarSign className="w-4 h-4" />
              P&L {formData.status === "OPEN" && <span className="text-amber-400 text-xs">(optional)</span>}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.pnl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, pnl: e.target.value }))
              }
              placeholder={formData.status === "OPEN" ? "Unrealized" : "+/- 0.00"}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
              required={formData.status === "CLOSED"}
            />
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
            <TagIcon className="w-4 h-4" />
            Tags
          </label>

          {/* Setup Tags */}
          {setupTags.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
                Setup
              </p>
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
            <div className="mb-2">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
                Emotion
              </p>
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
          {customTags.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
                Custom
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customTags.map((tag) => (
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

          {/* Add Custom Tag */}
          {showNewTagInput ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="flex-1 px-3 py-1.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleCreateTag}
                className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowNewTagInput(false)}
                className="p-1.5 text-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewTagInput(true)}
              className="flex items-center gap-1.5 mt-2 text-xs text-accent hover:text-accent-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add custom tag
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
            <FileText className="w-4 h-4" />
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Trade reasoning, lessons learned..."
            rows={3}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/50 bg-card/50 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !canSubmit()}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {editingTrade ? "Update" : formData.status === "OPEN" ? "Log Open Trade" : "Save Trade"}
        </button>
      </div>
    </form>
  );
}
