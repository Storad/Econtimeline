"use client";

import {
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Clock,
  Tag as TagIcon,
} from "lucide-react";
import { Trade } from "./types";

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
}

export default function TradeList({ trades, onEdit, onDelete }: TradeListProps) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-6 text-muted">
        <p className="text-sm">No trades logged for this day</p>
      </div>
    );
  }

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  return (
    <div className="space-y-2">
      {/* Summary Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-card/50 rounded-lg border border-border/50">
        <span className="text-sm text-muted">
          {trades.length} trade{trades.length !== 1 ? "s" : ""}
        </span>
        <span
          className={`text-sm font-bold ${
            totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
        </span>
      </div>

      {/* Trade List */}
      {trades.map((trade) => (
        <div
          key={trade.id}
          className={`p-3 rounded-lg border transition-all hover:border-border ${
            trade.pnl >= 0
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          }`}
        >
          {/* Top Row: Ticker, Direction, P&L */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{trade.ticker}</span>
              <span
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  trade.direction === "LONG"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {trade.direction === "LONG" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trade.direction}
              </span>
            </div>
            <span
              className={`font-bold ${
                trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
            </span>
          </div>

          {/* Middle Row: Details */}
          <div className="flex items-center gap-3 text-xs text-muted mb-2">
            {trade.time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {trade.time}
              </span>
            )}
            {trade.entryPrice && trade.exitPrice && (
              <span>
                {trade.entryPrice.toFixed(2)} → {trade.exitPrice.toFixed(2)}
              </span>
            )}
            {trade.size && <span>{trade.size} contracts</span>}
          </div>

          {/* Tags */}
          {trade.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <TagIcon className="w-3 h-3 text-muted" />
              {trade.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-[10px] rounded-full"
                  style={{
                    backgroundColor: tag.color + "20",
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          {trade.notes && (
            <p className="text-xs text-muted/80 italic mb-2 line-clamp-2">
              {trade.notes}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/30">
            <button
              onClick={() => onEdit(trade)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-accent transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => onDelete(trade.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
