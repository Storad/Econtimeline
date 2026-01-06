"use client";

import { useState, useEffect, useCallback } from "react";
import { Trade, TradeStats, TradeFormData } from "@/components/TradeJournal/types";

export function useTradeJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tags, setTags] = useState<string[]>([]); // Preset tag suggestions
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("month");

  // Fetch preset tag suggestions
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
            pnl: formData.pnl ? parseFloat(formData.pnl) : 0,
            notes: formData.notes || null,
            tags: formData.tags, // Simple string array
            assetType: formData.assetType,
            status: formData.status,
            closeDate: formData.closeDate || null,
            optionType: formData.optionType || null,
            strikePrice: formData.strikePrice ? parseFloat(formData.strikePrice) : null,
            expirationDate: formData.expirationDate || null,
            premium: formData.premium ? parseFloat(formData.premium) : null,
            underlyingTicker: formData.underlyingTicker || null,
          }),
        });

        const data = await response.json();
        if (data.trade) {
          setTrades((prev) => [data.trade, ...prev]);
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
            pnl: formData.pnl ? parseFloat(formData.pnl) : 0,
            notes: formData.notes || null,
            tags: formData.tags, // Simple string array
            assetType: formData.assetType,
            status: formData.status,
            closeDate: formData.closeDate || null,
            optionType: formData.optionType || null,
            strikePrice: formData.strikePrice ? parseFloat(formData.strikePrice) : null,
            expirationDate: formData.expirationDate || null,
            premium: formData.premium ? parseFloat(formData.premium) : null,
            underlyingTicker: formData.underlyingTicker || null,
          }),
        });

        const data = await response.json();
        if (data.trade) {
          setTrades((prev) =>
            prev.map((t) => (t.id === id ? data.trade : t))
          );
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

  // Close an open trade
  const closeTrade = useCallback(
    async (id: string, closeDate: string, exitPrice: number | null, pnl: number): Promise<Trade | null> => {
      try {
        const response = await fetch("/api/trades", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status: "CLOSED",
            closeDate,
            exitPrice,
            pnl,
          }),
        });

        const data = await response.json();
        if (data.trade) {
          setTrades((prev) =>
            prev.map((t) => (t.id === id ? data.trade : t))
          );
          fetchStats(statsPeriod);
          return data.trade;
        }
        return null;
      } catch (error) {
        console.error("Failed to close trade:", error);
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

  // Get trades by date (from local state)
  const getTradesByDate = useCallback(
    (date: string): Trade[] => {
      return trades.filter((t) => {
        if (t.status === "OPEN" && t.date === date) return true;
        if (t.status === "CLOSED") {
          const closeDate = t.closeDate || t.date;
          const isSwingTrade = closeDate !== t.date;
          if (isSwingTrade) {
            return t.date === date || closeDate === date;
          } else {
            return t.date === date;
          }
        }
        return false;
      });
    },
    [trades]
  );

  // Get daily P&L summary
  const getDailyPnL = useCallback(
    (date: string): number => {
      return trades
        .filter((t) => {
          if (t.status !== "CLOSED") return false;
          const pnlDate = t.closeDate || t.date;
          return pnlDate === date;
        })
        .reduce((sum, t) => sum + t.pnl, 0);
    },
    [trades]
  );

  // Check if date has open trades
  const hasOpenTrades = useCallback(
    (date: string): boolean => {
      return trades.some((t) => t.date === date && t.status === "OPEN");
    },
    [trades]
  );

  // Get count of open trades for date
  const getOpenTradeCount = useCallback(
    (date: string): number => {
      return trades.filter((t) => t.date === date && t.status === "OPEN").length;
    },
    [trades]
  );

  // Get count of closed trades for date
  const getClosedTradeCount = useCallback(
    (date: string): number => {
      return trades.filter((t) => {
        if (t.status !== "CLOSED") return false;
        const pnlDate = t.closeDate || t.date;
        return pnlDate === date;
      }).length;
    },
    [trades]
  );

  // Get trade count for date
  const getTradeCount = useCallback(
    (date: string): number => {
      const openCount = trades.filter((t) => t.date === date && t.status === "OPEN").length;
      const closedCount = trades.filter((t) => {
        if (t.status !== "CLOSED") return false;
        const pnlDate = t.closeDate || t.date;
        return pnlDate === date;
      }).length;
      return openCount + closedCount;
    },
    [trades]
  );

  // Get swing trades that were OPENED on this date
  const getClosedTradesOpenedOnDate = useCallback(
    (date: string): Trade[] => {
      return trades.filter((t) => {
        if (t.status !== "CLOSED") return false;
        if (t.date !== date) return false;
        const closeDate = t.closeDate || t.date;
        return closeDate !== t.date;
      });
    },
    [trades]
  );

  // Get swing trades that were CLOSED on this date
  const getTradesClosedOnDate = useCallback(
    (date: string): Trade[] => {
      return trades.filter((t) => {
        if (t.status !== "CLOSED") return false;
        const closeDate = t.closeDate || t.date;
        if (closeDate !== date) return false;
        return closeDate !== t.date;
      });
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
    tags, // Now string[] of preset suggestions
    stats,
    loading,
    statsLoading,
    statsPeriod,

    // Actions
    createTrade,
    updateTrade,
    deleteTrade,
    closeTrade,
    fetchTradesForDate,
    changeStatsPeriod,

    // Helpers
    getTradesByDate,
    getDailyPnL,
    getTradeCount,
    hasOpenTrades,
    getOpenTradeCount,
    getClosedTradeCount,
    getClosedTradesOpenedOnDate,
    getTradesClosedOnDate,
  };
}
