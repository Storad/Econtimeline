"use client";

import { useState, useEffect, useCallback } from "react";

// Simplified strategy types
export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  color: string;
  defaultRiskPercent: number | null;
  maxDrawdownPercent: number | null;
  createdAt: string;
  updatedAt: string;
  tradeCount?: number;
}

export interface StrategyFormData {
  name: string;
  description?: string;
  type: string;
  color?: string;
  defaultRiskPercent?: string;
  maxDrawdownPercent?: string;
}

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all strategies
  const fetchStrategies = useCallback(async () => {
    try {
      const response = await fetch("/api/strategies");
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
            color: formData.color || "#3b82f6",
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
    async (id: string, formData: Partial<StrategyFormData> & { status?: string }): Promise<Strategy | null> => {
      try {
        const response = await fetch(`/api/strategies/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            type: formData.type,
            color: formData.color,
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

  // Initial fetch
  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  return {
    strategies,
    loading,
    fetchStrategies,
    createStrategy,
    updateStrategy,
    deleteStrategy,
  };
}
