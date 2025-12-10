export interface Tag {
  id: string;
  userId: string | null;
  name: string;
  type: "SETUP" | "EMOTION" | "CUSTOM";
  color: string;
}

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
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
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
  tagIds: string[];
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
  byTag: Record<string, { count: number; pnl: number; wins: number; name: string; color: string }>;
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
  tagIds: [],
};
