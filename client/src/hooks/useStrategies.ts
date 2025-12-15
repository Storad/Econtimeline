"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Strategy,
  StrategyFormData,
  StrategyTrade,
  StrategyTradeFormData,
  StrategySignal,
  SignalFormData,
  StrategyStats,
} from "@/components/Strategies/types";

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all strategies
  const fetchStrategies = useCallback(async (includePublic = false) => {
    try {
      const url = includePublic
        ? "/api/strategies?includePublic=true"
        : "/api/strategies";
      const response = await fetch(url);
      const data = await response.json();
      if (data.strategies) {
        setStrategies(data.strategies);
      }
    } catch (error) {
      console.error("Failed to fetch strategies:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a single strategy
  const fetchStrategy = useCallback(async (id: string): Promise<Strategy | null> => {
    try {
      const response = await fetch(`/api/strategies/${id}`);
      const data = await response.json();
      return data.strategy || null;
    } catch (error) {
      console.error("Failed to fetch strategy:", error);
      return null;
    }
  }, []);

  // Create a new strategy
  const createStrategy = useCallback(
    async (formData: StrategyFormData): Promise<Strategy | null> => {
      try {
        const response = await fetch("/api/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            type: formData.type,
            color: formData.color,
            defaultRiskPercent: formData.defaultRiskPercent
              ? parseFloat(formData.defaultRiskPercent)
              : null,
            maxDrawdownPercent: formData.maxDrawdownPercent
              ? parseFloat(formData.maxDrawdownPercent)
              : null,
          }),
        });

        const data = await response.json();
        if (data.strategy) {
          setStrategies((prev) => [data.strategy, ...prev]);
          return data.strategy;
        }
        return null;
      } catch (error) {
        console.error("Failed to create strategy:", error);
        return null;
      }
    },
    []
  );

  // Update a strategy
  const updateStrategy = useCallback(
    async (id: string, formData: Partial<StrategyFormData> & { isPublished?: boolean; status?: string }): Promise<Strategy | null> => {
      try {
        const response = await fetch(`/api/strategies/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            type: formData.type,
            color: formData.color,
            isPublished: formData.isPublished,
            status: formData.status,
            defaultRiskPercent: formData.defaultRiskPercent
              ? parseFloat(formData.defaultRiskPercent)
              : undefined,
            maxDrawdownPercent: formData.maxDrawdownPercent
              ? parseFloat(formData.maxDrawdownPercent)
              : undefined,
          }),
        });

        const data = await response.json();
        if (data.strategy) {
          setStrategies((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...data.strategy } : s))
          );
          return data.strategy;
        }
        return null;
      } catch (error) {
        console.error("Failed to update strategy:", error);
        return null;
      }
    },
    []
  );

  // Delete a strategy
  const deleteStrategy = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/strategies/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStrategies((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to delete strategy:", error);
      return false;
    }
  }, []);

  // Fetch strategy stats
  const fetchStrategyStats = useCallback(
    async (strategyId: string): Promise<StrategyStats | null> => {
      try {
        const response = await fetch(`/api/strategies/${strategyId}/stats`);
        const data = await response.json();
        return data.stats || null;
      } catch (error) {
        console.error("Failed to fetch strategy stats:", error);
        return null;
      }
    },
    []
  );

  // Fetch strategy trades
  const fetchStrategyTrades = useCallback(
    async (strategyId: string, isBacktest?: boolean): Promise<StrategyTrade[]> => {
      try {
        let url = `/api/strategies/${strategyId}/trades`;
        if (isBacktest !== undefined) {
          url += `?isBacktest=${isBacktest}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data.trades || [];
      } catch (error) {
        console.error("Failed to fetch strategy trades:", error);
        return [];
      }
    },
    []
  );

  // Add a trade to a strategy
  const addStrategyTrade = useCallback(
    async (
      strategyId: string,
      formData: StrategyTradeFormData
    ): Promise<StrategyTrade | null> => {
      try {
        const response = await fetch(`/api/strategies/${strategyId}/trades`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: formData.date,
            time: formData.time || null,
            ticker: formData.ticker,
            direction: formData.direction,
            entryPrice: formData.entryPrice ? parseFloat(formData.entryPrice) : null,
            exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
            size: formData.size ? parseFloat(formData.size) : null,
            pnl: parseFloat(formData.pnl),
            notes: formData.notes || null,
            isBacktest: formData.isBacktest,
          }),
        });

        const data = await response.json();
        return data.trade || null;
      } catch (error) {
        console.error("Failed to add strategy trade:", error);
        return null;
      }
    },
    []
  );

  // Link an existing trade to a strategy
  const linkTradeToStrategy = useCallback(
    async (strategyId: string, tradeId: string): Promise<StrategyTrade | null> => {
      try {
        const response = await fetch(`/api/strategies/${strategyId}/trades`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tradeId }),
        });

        const data = await response.json();
        return data.trade || null;
      } catch (error) {
        console.error("Failed to link trade:", error);
        return null;
      }
    },
    []
  );

  // Remove a trade from a strategy
  const removeStrategyTrade = useCallback(
    async (strategyId: string, tradeId: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/strategies/${strategyId}/trades?tradeId=${tradeId}`,
          { method: "DELETE" }
        );
        return response.ok;
      } catch (error) {
        console.error("Failed to remove strategy trade:", error);
        return false;
      }
    },
    []
  );

  // Fetch strategy signals
  const fetchStrategySignals = useCallback(
    async (strategyId: string, status?: string): Promise<StrategySignal[]> => {
      try {
        let url = `/api/strategies/${strategyId}/signals`;
        if (status) {
          url += `?status=${status}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data.signals || [];
      } catch (error) {
        console.error("Failed to fetch strategy signals:", error);
        return [];
      }
    },
    []
  );

  // Create a new signal
  const createSignal = useCallback(
    async (strategyId: string, formData: SignalFormData): Promise<StrategySignal | null> => {
      try {
        const response = await fetch(`/api/strategies/${strategyId}/signals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: formData.type,
            direction: formData.direction || null,
            ticker: formData.ticker,
            price: formData.price ? parseFloat(formData.price) : null,
            message: formData.message,
            triggerAt: formData.triggerAt || null,
            expiresAt: formData.expiresAt || null,
          }),
        });

        const data = await response.json();
        return data.signal || null;
      } catch (error) {
        console.error("Failed to create signal:", error);
        return null;
      }
    },
    []
  );

  // Update signal status
  const updateSignalStatus = useCallback(
    async (strategyId: string, signalId: string, status: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/strategies/${strategyId}/signals`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signalId, status }),
        });
        return response.ok;
      } catch (error) {
        console.error("Failed to update signal status:", error);
        return false;
      }
    },
    []
  );

  // Delete a signal
  const deleteSignal = useCallback(
    async (strategyId: string, signalId: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/strategies/${strategyId}/signals?signalId=${signalId}`,
          { method: "DELETE" }
        );
        return response.ok;
      } catch (error) {
        console.error("Failed to delete signal:", error);
        return false;
      }
    },
    []
  );

  // Subscribe to a strategy
  const subscribeToStrategy = useCallback(
    async (
      strategyId: string,
      preferences: { inApp?: boolean; email?: boolean; push?: boolean }
    ): Promise<boolean> => {
      try {
        const response = await fetch("/api/strategies/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyId,
            ...preferences,
          }),
        });

        const data = await response.json();
        return data.subscribed === true;
      } catch (error) {
        console.error("Failed to subscribe:", error);
        return false;
      }
    },
    []
  );

  // Unsubscribe from a strategy
  const unsubscribeFromStrategy = useCallback(
    async (strategyId: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/strategies/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyId,
            action: "unsubscribe",
          }),
        });
        return response.ok;
      } catch (error) {
        console.error("Failed to unsubscribe:", error);
        return false;
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  return {
    // State
    strategies,
    loading,

    // Strategy CRUD
    fetchStrategies,
    fetchStrategy,
    createStrategy,
    updateStrategy,
    deleteStrategy,

    // Stats
    fetchStrategyStats,

    // Trades
    fetchStrategyTrades,
    addStrategyTrade,
    linkTradeToStrategy,
    removeStrategyTrade,

    // Signals
    fetchStrategySignals,
    createSignal,
    updateSignalStatus,
    deleteSignal,

    // Subscriptions
    subscribeToStrategy,
    unsubscribeFromStrategy,
  };
}
