"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// Tag and Section types
export interface Tag {
  id: string;
  name: string;
  order: number;
}

export interface TagSection {
  id: string;
  name: string;
  color: string; // Base color class (e.g., "blue", "red")
  order: number;
  tags: Tag[];
}

export interface TagSettings {
  sections: TagSection[];
  startingEquity: number;
}

// Default preset tags
const DEFAULT_TAG_SETTINGS: TagSettings = {
  sections: [
    {
      id: "strategy",
      name: "Strategy",
      color: "blue",
      order: 0,
      tags: [
        { id: "breakout", name: "Breakout", order: 0 },
        { id: "reversal", name: "Reversal", order: 1 },
        { id: "momentum", name: "Momentum", order: 2 },
        { id: "scalp", name: "Scalp", order: 3 },
        { id: "swing", name: "Swing", order: 4 },
        { id: "gap-play", name: "Gap Play", order: 5 },
        { id: "vwap", name: "VWAP", order: 6 },
        { id: "support-resistance", name: "Support/Resistance", order: 7 },
      ],
    },
    {
      id: "market",
      name: "Market Condition",
      color: "purple",
      order: 1,
      tags: [
        { id: "trending", name: "Trending", order: 0 },
        { id: "ranging", name: "Ranging", order: 1 },
        { id: "volatile", name: "Volatile", order: 2 },
        { id: "low-volume", name: "Low Volume", order: 3 },
        { id: "news-driven", name: "News Driven", order: 4 },
        { id: "earnings", name: "Earnings", order: 5 },
      ],
    },
    {
      id: "execution",
      name: "Execution",
      color: "emerald",
      order: 2,
      tags: [
        { id: "followed-plan", name: "Followed Plan", order: 0 },
        { id: "target-hit", name: "Target Hit", order: 1 },
        { id: "trailed-stop", name: "Trailed Stop", order: 2 },
        { id: "partial-exit", name: "Partial Exit", order: 3 },
        { id: "added-position", name: "Added Position", order: 4 },
      ],
    },
    {
      id: "mistakes",
      name: "Mistakes",
      color: "red",
      order: 3,
      tags: [
        { id: "fomo", name: "FOMO", order: 0 },
        { id: "revenge-trade", name: "Revenge Trade", order: 1 },
        { id: "overtraded", name: "Overtraded", order: 2 },
        { id: "chased", name: "Chased", order: 3 },
        { id: "hesitated", name: "Hesitated", order: 4 },
        { id: "early-exit", name: "Early Exit", order: 5 },
      ],
    },
    {
      id: "time",
      name: "Time of Day",
      color: "amber",
      order: 4,
      tags: [
        { id: "pre-market", name: "Pre-Market", order: 0 },
        { id: "market-open", name: "Market Open", order: 1 },
        { id: "mid-day", name: "Mid-Day", order: 2 },
        { id: "power-hour", name: "Power Hour", order: 3 },
        { id: "after-hours", name: "After Hours", order: 4 },
      ],
    },
  ],
  startingEquity: 0,
};

// Color variants for each section color (base + subtle variations)
export const TAG_COLORS: Record<string, { bg: string; text: string; border: string; bgHover: string }> = {
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    bgHover: "hover:bg-blue-500/30",
  },
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    bgHover: "hover:bg-purple-500/30",
  },
  emerald: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    bgHover: "hover:bg-emerald-500/30",
  },
  red: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
    bgHover: "hover:bg-red-500/30",
  },
  amber: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
    bgHover: "hover:bg-amber-500/30",
  },
  cyan: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    bgHover: "hover:bg-cyan-500/30",
  },
  pink: {
    bg: "bg-pink-500/20",
    text: "text-pink-400",
    border: "border-pink-500/30",
    bgHover: "hover:bg-pink-500/30",
  },
  indigo: {
    bg: "bg-indigo-500/20",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    bgHover: "hover:bg-indigo-500/30",
  },
};

interface TagContextType {
  tagSettings: TagSettings;
  // Section management
  addSection: (name: string, color: string) => void;
  removeSection: (sectionId: string) => void;
  updateSection: (sectionId: string, updates: Partial<Omit<TagSection, "id" | "tags">>) => void;
  reorderSections: (sectionIds: string[]) => void;
  // Tag management
  addTag: (sectionId: string, name: string) => void;
  removeTag: (sectionId: string, tagId: string) => void;
  updateTag: (sectionId: string, tagId: string, updates: Partial<Omit<Tag, "id">>) => void;
  reorderTags: (sectionId: string, tagIds: string[]) => void;
  // Settings
  setStartingEquity: (amount: number) => void;
  restoreDefaults: () => void;
  // Helpers
  getTagColor: (tagId: string) => { bg: string; text: string; border: string; bgHover: string };
  getTagById: (tagId: string) => { tag: Tag; section: TagSection } | null;
  getAllTags: () => { tag: Tag; section: TagSection }[];
}

const TagContext = createContext<TagContextType | undefined>(undefined);

const STORAGE_KEY = "tagSettings";

export function TagProvider({ children }: { children: React.ReactNode }) {
  const [tagSettings, setTagSettings] = useState<TagSettings>(DEFAULT_TAG_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTagSettings(parsed);
      } catch {
        // If parsing fails, use defaults
        setTagSettings(DEFAULT_TAG_SETTINGS);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when settings change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tagSettings));
    }
  }, [tagSettings, isLoaded]);

  // Generate unique ID
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Section management
  const addSection = useCallback((name: string, color: string) => {
    setTagSettings(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: generateId("section"),
          name,
          color,
          order: prev.sections.length,
          tags: [],
        },
      ],
    }));
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setTagSettings(prev => ({
      ...prev,
      sections: prev.sections
        .filter(s => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i })),
    }));
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<Omit<TagSection, "id" | "tags">>) => {
    setTagSettings(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  const reorderSections = useCallback((sectionIds: string[]) => {
    setTagSettings(prev => ({
      ...prev,
      sections: sectionIds
        .map((id, i) => {
          const section = prev.sections.find(s => s.id === id);
          return section ? { ...section, order: i } : null;
        })
        .filter((s): s is TagSection => s !== null),
    }));
  }, []);

  // Tag management
  const addTag = useCallback((sectionId: string, name: string) => {
    setTagSettings(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              tags: [
                ...s.tags,
                {
                  id: generateId("tag"),
                  name,
                  order: s.tags.length,
                },
              ],
            }
          : s
      ),
    }));
  }, []);

  const removeTag = useCallback((sectionId: string, tagId: string) => {
    setTagSettings(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              tags: s.tags
                .filter(t => t.id !== tagId)
                .map((t, i) => ({ ...t, order: i })),
            }
          : s
      ),
    }));
  }, []);

  const updateTag = useCallback((sectionId: string, tagId: string, updates: Partial<Omit<Tag, "id">>) => {
    setTagSettings(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              tags: s.tags.map(t =>
                t.id === tagId ? { ...t, ...updates } : t
              ),
            }
          : s
      ),
    }));
  }, []);

  const reorderTags = useCallback((sectionId: string, tagIds: string[]) => {
    setTagSettings(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              tags: tagIds
                .map((id, i) => {
                  const tag = s.tags.find(t => t.id === id);
                  return tag ? { ...tag, order: i } : null;
                })
                .filter((t): t is Tag => t !== null),
            }
          : s
      ),
    }));
  }, []);

  // Settings
  const setStartingEquity = useCallback((amount: number) => {
    setTagSettings(prev => ({ ...prev, startingEquity: amount }));
  }, []);

  const restoreDefaults = useCallback(() => {
    setTagSettings(DEFAULT_TAG_SETTINGS);
  }, []);

  // Helpers
  const getTagColor = useCallback((tagId: string): { bg: string; text: string; border: string; bgHover: string } => {
    for (const section of tagSettings.sections) {
      const tag = section.tags.find(t => t.id === tagId || t.name.toLowerCase() === tagId.toLowerCase());
      if (tag) {
        return TAG_COLORS[section.color] || TAG_COLORS.blue;
      }
    }
    return TAG_COLORS.blue; // Default color
  }, [tagSettings.sections]);

  const getTagById = useCallback((tagId: string): { tag: Tag; section: TagSection } | null => {
    for (const section of tagSettings.sections) {
      const tag = section.tags.find(t => t.id === tagId || t.name.toLowerCase() === tagId.toLowerCase());
      if (tag) {
        return { tag, section };
      }
    }
    return null;
  }, [tagSettings.sections]);

  const getAllTags = useCallback((): { tag: Tag; section: TagSection }[] => {
    const result: { tag: Tag; section: TagSection }[] = [];
    for (const section of tagSettings.sections.sort((a, b) => a.order - b.order)) {
      for (const tag of section.tags.sort((a, b) => a.order - b.order)) {
        result.push({ tag, section });
      }
    }
    return result;
  }, [tagSettings.sections]);

  return (
    <TagContext.Provider
      value={{
        tagSettings,
        addSection,
        removeSection,
        updateSection,
        reorderSections,
        addTag,
        removeTag,
        updateTag,
        reorderTags,
        setStartingEquity,
        restoreDefaults,
        getTagColor,
        getTagById,
        getAllTags,
      }}
    >
      {children}
    </TagContext.Provider>
  );
}

export function useTagSettings() {
  const context = useContext(TagContext);
  if (context === undefined) {
    throw new Error("useTagSettings must be used within a TagProvider");
  }
  return context;
}
