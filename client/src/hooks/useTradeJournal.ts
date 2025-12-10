"use client";

import { useState, useEffect, useCallback } from "react";
import { Trade, Tag, TradeStats, TradeFormData } from "@/components/TradeJournal/types";

export function useTradeJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("month");

  // Fetch all tags
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/tags");
      const data = await response.json();
      if (data.tags) {
        setTags(data.tags);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  // Fetch all trades
  const fetchTrades = useCallback(async () => {
    try {
      const response = await fetch("/api/trades");
      const data = await response.json();
      if (data.trades) {
        setTrades(data.trades);
      }
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trades for a specific date
  const fetchTradesForDate = useCallback(async (date: string): Promise<Trade[]> => {
    try {
      const response = await fetch(`/api/trades?date=${date}`);
      const data = await response.json();
      return data.trades || [];
    } catch (error) {
      console.error("Failed to fetch trades for date:", error);
      return [];
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async (period: string) => {
    setStatsLoading(true);
    try {
      const response = await fetch(`/api/trades/stats?period=${period}`);
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Create a new trade
  const createTrade = useCallback(
    async (date: string, formData: TradeFormData): Promise<Trade | null> => {
      try {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            time: formData.time || null,
            ticker: formData.ticker,
            direction: formData.direction,
            entryPrice: formData.entryPrice ? parseFloat(formData.entryPrice) : null,
            exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
            size: formData.size ? parseFloat(formData.size) : null,
            pnl: parseFloat(formData.pnl),
            notes: formData.notes || null,
            tagIds: formData.tagIds,
          }),
        });

        const data = await response.json();
        if (data.trade) {
          setTrades((prev) => [data.trade, ...prev]);
          // Refresh stats
          fetchStats(statsPeriod);
          return data.trade;
        }
        return null;
      } catch (error) {
        console.error("Failed to create trade:", error);
        return null;
      }
    },
    [fetchStats, statsPeriod]
  );

  // Update a trade
  const updateTrade = useCallback(
    async (id: string, formData: TradeFormData): Promise<Trade | null> => {
      try {
        const response = await fetch("/api/trades", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            time: formData.time || null,
            ticker: formData.ticker,
            direction: formData.direction,
            entryPrice: formData.entryPrice ? parseFloat(formData.entryPrice) : null,
            exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
            size: formData.size ? parseFloat(formData.size) : null,
            pnl: parseFloat(formData.pnl),
            notes: formData.notes || null,
            tagIds: formData.tagIds,
          }),
        });

        const data = await response.json();
        if (data.trade) {
          setTrades((prev) =>
            prev.map((t) => (t.id === id ? data.trade : t))
          );
          // Refresh stats
          fetchStats(statsPeriod);
          return data.trade;
        }
        return null;
      } catch (error) {
        console.error("Failed to update trade:", error);
        return null;
      }
    },
    [fetchStats, statsPeriod]
  );

  // Delete a trade
  const deleteTrade = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/trades?id=${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setTrades((prev) => prev.filter((t) => t.id !== id));
          // Refresh stats
          fetchStats(statsPeriod);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to delete trade:", error);
        return false;
      }
    },
    [fetchStats, statsPeriod]
  );

  // Create a custom tag
  const createTag = useCallback(
    async (name: string, color: string): Promise<Tag | null> => {
      try {
        const response = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color }),
        });

        const data = await response.json();
        if (data.tag) {
          setTags((prev) => [...prev, data.tag]);
          return data.tag;
        }
        return null;
      } catch (error) {
        console.error("Failed to create tag:", error);
        return null;
      }
    },
    []
  );

  // Delete a custom tag
  const deleteTag = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tags?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTags((prev) => prev.filter((t) => t.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to delete tag:", error);
      return false;
    }
  }, []);

  // Get trades by date (from local state)
  const getTradesByDate = useCallback(
    (date: string): Trade[] => {
      return trades.filter((t) => t.date === date);
    },
    [trades]
  );

  // Get daily P&L summary
  const getDailyPnL = useCallback(
    (date: string): number => {
      return trades
        .filter((t) => t.date === date)
        .reduce((sum, t) => sum + t.pnl, 0);
    },
    [trades]
  );

  // Get trade count for date
  const getTradeCount = useCallback(
    (date: string): number => {
      return trades.filter((t) => t.date === date).length;
    },
    [trades]
  );

  // Change stats period
  const changeStatsPeriod = useCallback(
    (period: string) => {
      setStatsPeriod(period);
      fetchStats(period);
    },
    [fetchStats]
  );

  // Initial fetch
  useEffect(() => {
    fetchTags();
    fetchTrades();
  }, [fetchTags, fetchTrades]);

  // Fetch stats when period changes or trades update
  useEffect(() => {
    if (!loading) {
      fetchStats(statsPeriod);
    }
  }, [loading, statsPeriod, fetchStats]);

  return {
    // State
    trades,
    tags,
    stats,
    loading,
    statsLoading,
    statsPeriod,

    // Actions
    createTrade,
    updateTrade,
    deleteTrade,
    createTag,
    deleteTag,
    fetchTradesForDate,
    changeStatsPeriod,

    // Helpers
    getTradesByDate,
    getDailyPnL,
    getTradeCount,
  };
}
