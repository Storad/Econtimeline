"use client";

import { useState } from "react";
import { useStrategies, Strategy, StrategyFormData } from "@/hooks/useStrategies";
import { Plus, BarChart3, Edit2, Trash2, X } from "lucide-react";

const STRATEGY_TYPES = [
  { value: "MOMENTUM", label: "Momentum" },
  { value: "BREAKOUT", label: "Breakout" },
  { value: "REVERSAL", label: "Reversal" },
  { value: "SCALPING", label: "Scalping" },
  { value: "SWING", label: "Swing" },
  { value: "TREND", label: "Trend Following" },
  { value: "RANGE", label: "Range Trading" },
];

const STRATEGY_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

const DEFAULT_FORM: StrategyFormData = {
  name: "",
  description: "",
  type: "MOMENTUM",
  color: "#3b82f6",
  defaultRiskPercent: "",
  maxDrawdownPercent: "",
};

export default function StrategiesPage() {
  const { strategies, loading, createStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const [showModal, setShowModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [formData, setFormData] = useState<StrategyFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleOpenModal = (strategy?: Strategy) => {
    if (strategy) {
      setEditingStrategy(strategy);
      setFormData({
        name: strategy.name,
        description: strategy.description || "",
        type: strategy.type,
        color: strategy.color,
        defaultRiskPercent: strategy.defaultRiskPercent?.toString() || "",
        maxDrawdownPercent: strategy.maxDrawdownPercent?.toString() || "",
      });
    } else {
      setEditingStrategy(null);
      setFormData(DEFAULT_FORM);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStrategy(null);
    setFormData(DEFAULT_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingStrategy) {
        await updateStrategy(editingStrategy.id, formData);
      } else {
        await createStrategy(formData);
      }
      handleCloseModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteStrategy(id);
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Strategies</h1>
          <p className="text-sm text-muted mt-1">
            Create and manage your trading strategies
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Strategy
        </button>
      </div>

      {/* Strategies Grid */}
      <div className="flex-1 overflow-auto">
        {strategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BarChart3 className="w-12 h-12 text-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No strategies yet
            </h3>
            <p className="text-sm text-muted mb-4">
              Create your first strategy to start tracking performance
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Strategy
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-card rounded-xl border border-border p-4 hover:border-accent/50 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${strategy.color}20` }}
                    >
                      <BarChart3 className="w-5 h-5" style={{ color: strategy.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{strategy.name}</h3>
                      <p className="text-xs text-muted">{strategy.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(strategy)}
                      className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(strategy.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {strategy.description && (
                  <p className="text-sm text-muted mb-3 line-clamp-2">
                    {strategy.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted">
                    <span className="text-foreground font-medium">{strategy.tradeCount || 0}</span> trades
                  </span>
                  {strategy.defaultRiskPercent && (
                    <span className="text-muted">
                      <span className="text-foreground font-medium">{strategy.defaultRiskPercent}%</span> risk
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      strategy.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : strategy.status === "PAUSED"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {strategy.status}
                  </span>
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === strategy.id && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400 mb-2">Delete this strategy?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(strategy.id)}
                        className="flex-1 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-3 py-1.5 bg-card text-foreground text-xs rounded-lg hover:bg-card-hover transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editingStrategy ? "Edit Strategy" : "New Strategy"}
              </h2>
              <button onClick={handleCloseModal} className="p-1 rounded-lg hover:bg-card-hover transition-colors">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="e.g., Momentum Breakout"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {STRATEGY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                  rows={3}
                  placeholder="Describe your strategy..."
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Color</label>
                <div className="flex gap-2">
                  {STRATEGY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Risk Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Default Risk %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.defaultRiskPercent}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultRiskPercent: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="e.g., 1.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Max Drawdown %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.maxDrawdownPercent}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxDrawdownPercent: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="e.g., 10.0"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-card-hover text-foreground rounded-lg hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : editingStrategy ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
