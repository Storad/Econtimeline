export type AssetType = "STOCK" | "FUTURES" | "OPTIONS" | "FOREX" | "CRYPTO";
export type TradeStatus = "OPEN" | "CLOSED";
export type OptionType = "CALL" | "PUT";

export interface Trade {
  id: string;
  userId: string;
  date: string;
  time: string | null;
  ticker: string;
  direction: "LONG" | "SHORT";
  entryPrice: number | null;
  exitPrice: number | null;
  size: number | null;
  pnl: number;
  notes: string | null;
  tags: string[]; // Simple string array
  createdAt: string;
  updatedAt: string;
  // Asset type and status
  assetType: AssetType;
  status: TradeStatus;
  closeDate: string | null;
  // Options-specific fields
  optionType: OptionType | null;
  strikePrice: number | null;
  expirationDate: string | null;
  premium: number | null;
  underlyingTicker: string | null;
}

export interface TradeFormData {
  ticker: string;
  direction: "LONG" | "SHORT";
  time: string;
  entryPrice: string;
  exitPrice: string;
  size: string;
  pnl: string;
  notes: string;
  tags: string[]; // Simple string array
  // Asset type and status
  assetType: AssetType;
  status: TradeStatus;
  closeDate: string;
  // Options-specific fields
  optionType: "CALL" | "PUT" | "";
  strikePrice: string;
  expirationDate: string;
  premium: string;
  underlyingTicker: string;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalPnl: number;
  averagePnl: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  tradingDays: number;
  byTicker: Record<string, { count: number; pnl: number; wins: number }>;
  byDirection: {
    LONG: { count: number; pnl: number; wins: number };
    SHORT: { count: number; pnl: number; wins: number };
  };
  byTag: Record<string, { count: number; pnl: number; wins: number }>;
  dailyPnl: { date: string; pnl: number }[];
}

export const DEFAULT_TRADE_FORM: TradeFormData = {
  ticker: "",
  direction: "LONG",
  time: "",
  entryPrice: "",
  exitPrice: "",
  size: "",
  pnl: "",
  notes: "",
  tags: [],
  // Asset type and status
  assetType: "STOCK",
  status: "CLOSED",
  closeDate: "",
  // Options-specific fields
  optionType: "",
  strikePrice: "",
  expirationDate: "",
  premium: "",
  underlyingTicker: "",
};
