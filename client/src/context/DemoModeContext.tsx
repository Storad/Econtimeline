"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useTagSettings } from "./TagContext";

// Asset types
type AssetType = "STOCK" | "FUTURES" | "OPTIONS" | "FOREX" | "CRYPTO";
type OptionType = "CALL" | "PUT";

// Demo trade type matching the real Trade type
export interface DemoTrade {
  id: string;
  date: string;
  closeDate?: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  notes: string;
  tags: string[];
  status: "OPEN" | "CLOSED";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  // Asset type fields
  assetType: AssetType;
  time?: string;
  size?: number;
  // Options-specific fields
  optionType?: OptionType;
  strikePrice?: number;
  expirationDate?: string;
  premium?: number;
  underlyingTicker?: string;
}

interface DemoModeContextType {
  isDemoMode: boolean;
  demoTrades: DemoTrade[];
  demoSettings: {
    tradeCount: number;
    monthsBack: number;
    startingEquity: number;
    profitable: boolean;
  };
  enableDemoMode: (settings: { tradeCount: number; monthsBack: number; startingEquity: number; profitable: boolean }) => void;
  disableDemoMode: () => void;
  regenerateDemoTrades: () => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

// Tickers by asset type
const ASSET_TICKERS: Record<AssetType, string[]> = {
  STOCK: ["SPY", "QQQ", "AAPL", "TSLA", "NVDA", "AMD", "META", "AMZN", "GOOGL", "MSFT", "NFLX", "BA", "JPM", "V", "DIS"],
  FUTURES: ["ES", "NQ", "MES", "MNQ", "GC", "CL", "SI", "ZB", "RTY", "YM"],
  OPTIONS: ["SPY", "QQQ", "AAPL", "TSLA", "NVDA", "AMD", "META", "AMZN", "GOOGL", "MSFT"],
  FOREX: ["EURUSD", "USDJPY", "GBPUSD", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY"],
  CRYPTO: ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "AVAX", "MATIC", "LINK", "DOT"],
};

// Asset type distribution (weighted)
const ASSET_WEIGHTS: { type: AssetType; weight: number }[] = [
  { type: "STOCK", weight: 50 },
  { type: "OPTIONS", weight: 25 },
  { type: "FUTURES", weight: 10 },
  { type: "CRYPTO", weight: 10 },
  { type: "FOREX", weight: 5 },
];

function getRandomAssetType(): AssetType {
  const totalWeight = ASSET_WEIGHTS.reduce((sum, a) => sum + a.weight, 0);
  let random = Math.random() * totalWeight;
  for (const asset of ASSET_WEIGHTS) {
    random -= asset.weight;
    if (random <= 0) return asset.type;
  }
  return "STOCK";
}

// Generate random demo trades
function generateDemoTrades(
  settings: { tradeCount: number; monthsBack: number; startingEquity: number; profitable: boolean },
  availableTags: string[]
): DemoTrade[] {
  const { tradeCount, monthsBack, startingEquity, profitable } = settings;

  // Set win rate based on profitable toggle
  // Profitable: 55-65% win rate, Unprofitable: 35-45% win rate
  const winRate = profitable
    ? 55 + Math.random() * 10  // 55-65%
    : 35 + Math.random() * 10; // 35-45%
  const trades: DemoTrade[] = [];

  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const totalDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Distribute trades across the time period
  const tradeDates: Date[] = [];
  for (let i = 0; i < tradeCount; i++) {
    const randomDaysFromStart = Math.floor(Math.random() * totalDays);
    const tradeDate = new Date(startDate);
    tradeDate.setDate(tradeDate.getDate() + randomDaysFromStart);
    // Skip weekends
    while (tradeDate.getDay() === 0 || tradeDate.getDay() === 6) {
      tradeDate.setDate(tradeDate.getDate() + 1);
    }
    tradeDates.push(new Date(tradeDate));
  }

  // Sort dates
  tradeDates.sort((a, b) => a.getTime() - b.getTime());

  let runningEquity = startingEquity;

  for (let i = 0; i < tradeCount; i++) {
    const tradeDate = tradeDates[i];
    // Use local date to avoid timezone shift issues
    const dateStr = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, "0")}-${String(tradeDate.getDate()).padStart(2, "0")}`;

    // Determine if this trade is a winner based on win rate
    const isWinner = Math.random() < winRate / 100;

    // Random asset type
    const assetType = getRandomAssetType();
    const assetTickers = ASSET_TICKERS[assetType];
    const ticker = assetTickers[Math.floor(Math.random() * assetTickers.length)];

    // Random direction (slightly favor LONG, except forex which is more balanced)
    const longBias = assetType === "FOREX" ? 0.5 : 0.65;
    const direction: "LONG" | "SHORT" = Math.random() < longBias ? "LONG" : "SHORT";

    // Generate realistic entry price based on asset type and ticker
    let basePrice: number;
    let quantity: number;
    let positionSize: number;

    switch (assetType) {
      case "STOCK":
        switch (ticker) {
          case "SPY": basePrice = 450 + Math.random() * 100; break;
          case "QQQ": basePrice = 350 + Math.random() * 100; break;
          case "AAPL": basePrice = 150 + Math.random() * 50; break;
          case "TSLA": basePrice = 200 + Math.random() * 150; break;
          case "NVDA": basePrice = 400 + Math.random() * 200; break;
          case "AMD": basePrice = 100 + Math.random() * 80; break;
          case "META": basePrice = 300 + Math.random() * 150; break;
          case "AMZN": basePrice = 140 + Math.random() * 60; break;
          case "GOOGL": basePrice = 130 + Math.random() * 50; break;
          case "MSFT": basePrice = 350 + Math.random() * 100; break;
          default: basePrice = 100 + Math.random() * 200;
        }
        positionSize = runningEquity * (0.05 + Math.random() * 0.15);
        quantity = Math.max(1, Math.floor(positionSize / basePrice));
        break;

      case "FUTURES":
        // Futures have point values
        switch (ticker) {
          case "ES": basePrice = 4800 + Math.random() * 400; break; // S&P 500 E-mini
          case "NQ": basePrice = 17000 + Math.random() * 2000; break; // Nasdaq E-mini
          case "MES": basePrice = 4800 + Math.random() * 400; break; // Micro S&P
          case "MNQ": basePrice = 17000 + Math.random() * 2000; break; // Micro Nasdaq
          case "GC": basePrice = 1900 + Math.random() * 200; break; // Gold
          case "CL": basePrice = 70 + Math.random() * 20; break; // Crude Oil
          case "SI": basePrice = 22 + Math.random() * 5; break; // Silver
          case "ZB": basePrice = 115 + Math.random() * 10; break; // 30-Year Treasury
          case "RTY": basePrice = 1900 + Math.random() * 200; break; // Russell 2000
          case "YM": basePrice = 35000 + Math.random() * 3000; break; // Dow E-mini
          default: basePrice = 100 + Math.random() * 100;
        }
        quantity = Math.max(1, Math.floor(1 + Math.random() * 4)); // 1-5 contracts
        positionSize = runningEquity * (0.05 + Math.random() * 0.15);
        break;

      case "OPTIONS":
        // Options have premium prices
        basePrice = 1 + Math.random() * 15; // Premium $1-$16
        positionSize = runningEquity * (0.02 + Math.random() * 0.08); // Smaller position sizes
        quantity = Math.max(1, Math.floor(positionSize / (basePrice * 100))); // Each contract = 100 shares
        break;

      case "FOREX":
        // Forex pairs trade in pips
        switch (ticker) {
          case "EURUSD": basePrice = 1.05 + Math.random() * 0.1; break;
          case "USDJPY": basePrice = 140 + Math.random() * 15; break;
          case "GBPUSD": basePrice = 1.2 + Math.random() * 0.1; break;
          case "AUDUSD": basePrice = 0.64 + Math.random() * 0.08; break;
          case "USDCAD": basePrice = 1.32 + Math.random() * 0.08; break;
          case "USDCHF": basePrice = 0.87 + Math.random() * 0.05; break;
          case "NZDUSD": basePrice = 0.58 + Math.random() * 0.06; break;
          case "EURJPY": basePrice = 155 + Math.random() * 15; break;
          default: basePrice = 1.0 + Math.random() * 0.5;
        }
        quantity = Math.max(1000, Math.floor((10000 + Math.random() * 90000) / 1000) * 1000); // Lot sizes
        positionSize = runningEquity * (0.02 + Math.random() * 0.08);
        break;

      case "CRYPTO":
        switch (ticker) {
          case "BTC": basePrice = 40000 + Math.random() * 30000; break;
          case "ETH": basePrice = 2000 + Math.random() * 1500; break;
          case "SOL": basePrice = 80 + Math.random() * 100; break;
          case "XRP": basePrice = 0.4 + Math.random() * 0.8; break;
          case "ADA": basePrice = 0.3 + Math.random() * 0.5; break;
          case "DOGE": basePrice = 0.06 + Math.random() * 0.1; break;
          case "AVAX": basePrice = 25 + Math.random() * 30; break;
          case "MATIC": basePrice = 0.6 + Math.random() * 0.8; break;
          case "LINK": basePrice = 10 + Math.random() * 15; break;
          case "DOT": basePrice = 5 + Math.random() * 8; break;
          default: basePrice = 1 + Math.random() * 100;
        }
        positionSize = runningEquity * (0.03 + Math.random() * 0.12);
        quantity = Math.max(0.001, Math.round((positionSize / basePrice) * 1000) / 1000);
        break;

      default:
        basePrice = 100;
        positionSize = runningEquity * 0.1;
        quantity = 1;
    }

    const entryPrice = Math.round(basePrice * 100) / 100;

    // Calculate P&L - bigger, more meaningful values
    let pnlPercent: number;
    if (isWinner) {
      // Winners: 2% to 15% gain (options can have bigger swings)
      pnlPercent = assetType === "OPTIONS"
        ? 0.1 + Math.random() * 0.9 // 10-100% for options
        : 0.02 + Math.random() * 0.13;
    } else {
      // Losers: 1% to 8% loss (options can lose more)
      pnlPercent = assetType === "OPTIONS"
        ? -(0.2 + Math.random() * 0.6) // 20-80% loss for options
        : -(0.01 + Math.random() * 0.07);
    }

    const pnl = Math.round(positionSize * pnlPercent * 100) / 100;

    // Calculate exit price
    const priceChange = quantity > 0 ? pnl / quantity : 0;
    const exitPrice = Math.round((direction === "LONG"
      ? entryPrice + priceChange
      : entryPrice - priceChange) * 100) / 100;

    // Update running equity
    runningEquity += pnl;

    // Random tags (1-3 tags, max 5)
    const maxTags = Math.min(5, availableTags.length);
    const tagCount = Math.min(1 + Math.floor(Math.random() * 3), maxTags);
    const shuffledTags = [...availableTags].sort(() => Math.random() - 0.5);
    const tags = shuffledTags.slice(0, tagCount);

    // Options-specific fields
    let optionType: OptionType | undefined;
    let strikePrice: number | undefined;
    let expirationDate: string | undefined;
    let premium: number | undefined;
    let underlyingTicker: string | undefined;

    if (assetType === "OPTIONS") {
      optionType = Math.random() < 0.5 ? "CALL" : "PUT";
      underlyingTicker = ticker;
      // Strike price near the money
      const underlyingPrice = (() => {
        switch (ticker) {
          case "SPY": return 480 + Math.random() * 40;
          case "QQQ": return 400 + Math.random() * 50;
          case "AAPL": return 175 + Math.random() * 25;
          case "TSLA": return 250 + Math.random() * 50;
          case "NVDA": return 500 + Math.random() * 100;
          default: return 150 + Math.random() * 50;
        }
      })();
      strikePrice = Math.round(underlyingPrice / 5) * 5; // Round to nearest $5
      premium = entryPrice;
      // Expiration 1-6 weeks out from trade date
      const expDate = new Date(tradeDate);
      expDate.setDate(expDate.getDate() + 7 + Math.floor(Math.random() * 35));
      // Set to Friday
      while (expDate.getDay() !== 5) {
        expDate.setDate(expDate.getDate() + 1);
      }
      expirationDate = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, "0")}-${String(expDate.getDate()).padStart(2, "0")}`;
    }

    // Some trades are swing trades (20% chance, spanning 1-5 days) - not for day trading assets
    let closeDate: string | undefined;
    if (assetType !== "FUTURES" && Math.random() < 0.20) {
      const closeDateObj = new Date(tradeDate);
      closeDateObj.setDate(closeDateObj.getDate() + 1 + Math.floor(Math.random() * 5));
      // Skip weekends
      while (closeDateObj.getDay() === 0 || closeDateObj.getDay() === 6) {
        closeDateObj.setDate(closeDateObj.getDate() + 1);
      }
      if (closeDateObj <= now) {
        // Use local date to avoid timezone shift issues
        closeDate = `${closeDateObj.getFullYear()}-${String(closeDateObj.getMonth() + 1).padStart(2, "0")}-${String(closeDateObj.getDate()).padStart(2, "0")}`;
      }
    }

    // Generate random trade duration
    const hours = Math.floor(Math.random() * 6);
    const minutes = Math.floor(Math.random() * 60);
    const time = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Generate notes for some trades
    const notes = Math.random() < 0.3
      ? generateDemoNote(isWinner, ticker, direction, tags)
      : "";

    trades.push({
      id: `demo-${i}-${Date.now()}`,
      date: dateStr,
      closeDate,
      ticker: assetType === "OPTIONS" ? underlyingTicker || ticker : ticker,
      direction,
      entryPrice,
      exitPrice,
      quantity,
      pnl,
      notes,
      tags,
      status: "CLOSED",
      userId: "demo-user",
      createdAt: tradeDate,
      updatedAt: tradeDate,
      // Asset type fields
      assetType,
      time,
      size: quantity,
      // Options-specific fields
      optionType,
      strikePrice,
      expirationDate,
      premium,
      underlyingTicker,
    });
  }

  return trades;
}

function generateDemoNote(isWinner: boolean, ticker: string, direction: string, tags: string[]): string {
  const winningNotes = [
    `Clean ${tags[0]} setup on ${ticker}. Entered on confirmation, took profits at target.`,
    `${direction} entry worked perfectly. Good R:R on this one.`,
    `Followed the plan, scaled out at resistance.`,
    `Nice ${tags[0]} play. Market conditions were favorable.`,
    `Textbook setup. Patience paid off.`,
  ];

  const losingNotes = [
    `Stopped out. Market reversed quickly.`,
    `Should have waited for better entry. Lesson learned.`,
    `Got chopped up in consolidation. Next time wait for breakout confirmation.`,
    `Position sized correctly, loss was manageable.`,
    `Thesis was wrong. Quick exit saved bigger loss.`,
  ];

  const notes = isWinner ? winningNotes : losingNotes;
  return notes[Math.floor(Math.random() * notes.length)];
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTrades, setDemoTrades] = useState<DemoTrade[]>([]);
  const [demoSettings, setDemoSettings] = useState({
    tradeCount: 50,
    monthsBack: 3,
    startingEquity: 10000,
    profitable: true,
  });

  // Get tags from TagContext
  const { tagSettings } = useTagSettings();

  // Get all tag names from sections
  const getAllTagNames = useCallback((): string[] => {
    const tags: string[] = [];
    tagSettings.sections.forEach(section => {
      section.tags.forEach(tag => {
        tags.push(tag.name);
      });
    });
    return tags;
  }, [tagSettings.sections]);

  const enableDemoMode = useCallback((settings: { tradeCount: number; monthsBack: number; startingEquity: number; profitable: boolean }) => {
    setDemoSettings(settings);
    const availableTags = getAllTagNames();
    const trades = generateDemoTrades(settings, availableTags);
    setDemoTrades(trades);
    setIsDemoMode(true);
  }, [getAllTagNames]);

  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setDemoTrades([]);
  }, []);

  const regenerateDemoTrades = useCallback(() => {
    const availableTags = getAllTagNames();
    const trades = generateDemoTrades(demoSettings, availableTags);
    setDemoTrades(trades);
  }, [demoSettings, getAllTagNames]);

  return (
    <DemoModeContext.Provider value={{
      isDemoMode,
      demoTrades,
      demoSettings,
      enableDemoMode,
      disableDemoMode,
      regenerateDemoTrades,
    }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}
