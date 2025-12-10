"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Tag, Trade, TradeFormData, DEFAULT_TRADE_FORM } from "./types";

interface TradeFormProps {
  date: string;
  tags: Tag[];
  editingTrade?: Trade | null;
  onSave: (trade: TradeFormData) => Promise<void>;
  onCancel: () => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
}

export default function TradeForm({
  date,
  tags,
  editingTrade,
  onSave,
  onCancel,
  onCreateTag,
}: TradeFormProps) {
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
      };
    }
    return DEFAULT_TRADE_FORM;
  });

  const [saving, setSaving] = useState(false);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6b7280");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker || !formData.pnl) return;

    setSaving(true);
    try {
      await onSave(formData);
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
              placeholder="ES, NQ, SPY..."
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
              Size
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
              P&L
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.pnl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, pnl: e.target.value }))
              }
              placeholder="+/- 0.00"
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
              required
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
          disabled={saving || !formData.ticker || !formData.pnl}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {editingTrade ? "Update" : "Save Trade"}
        </button>
      </div>
    </form>
  );
}
