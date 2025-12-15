export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  isPublished: boolean;
  color: string;
  defaultRiskPercent: number | null;
  maxDrawdownPercent: number | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  tradeCount?: number;
  subscriberCount?: number;
  signalCount?: number;
  isSubscribed?: boolean;
  isOwner?: boolean;
  subscription?: StrategySubscription | null;
}

export interface StrategyFormData {
  name: string;
  description: string;
  type: string;
  color: string;
  defaultRiskPercent: string;
  maxDrawdownPercent: string;
}

export interface StrategyTrade {
  id: string;
  strategyId: string;
  tradeId: string | null;
  date: string;
  time: string | null;
  ticker: string;
  direction: "LONG" | "SHORT";
  entryPrice: number | null;
  exitPrice: number | null;
  size: number | null;
  pnl: number;
  notes: string | null;
  isBacktest: boolean;
  createdAt: string;
  trade?: {
    id: string;
    tags?: { id: string; name: string; color: string }[];
  };
}

export interface StrategyTradeFormData {
  date: string;
  time: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  entryPrice: string;
  exitPrice: string;
  size: string;
  pnl: string;
  notes: string;
  isBacktest: boolean;
}

export interface StrategySignal {
  id: string;
  strategyId: string;
  type: "ENTRY" | "EXIT" | "ALERT";
  direction: "LONG" | "SHORT" | null;
  ticker: string;
  price: number | null;
  message: string;
  status: "PENDING" | "TRIGGERED" | "EXPIRED" | "CANCELLED";
  triggerAt: string | null;
  triggeredAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignalFormData {
  type: "ENTRY" | "EXIT" | "ALERT";
  direction: "LONG" | "SHORT" | "";
  ticker: string;
  price: string;
  message: string;
  triggerAt: string;
  expiresAt: string;
}

export interface StrategySubscription {
  id: string;
  strategyId: string;
  userId: string;
  inApp: boolean;
  email: boolean;
  push: boolean;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface StrategyStats {
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
  profitFactor: number | null;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  riskRewardRatio: number | null;
  avgHoldTime: string | null;
  tradeFrequency: number;
  tradingDays: number;
  backtestTrades: number;
  liveTrades: number;
  equityCurve: { date: string; equity: number }[];
}

export interface Notification {
  id: string;
  signalId: string;
  userId: string;
  type: "IN_APP" | "EMAIL" | "PUSH";
  status: "PENDING" | "SENT" | "FAILED" | "READ";
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  signal: StrategySignal & {
    strategy: {
      id: string;
      name: string;
      color: string;
    };
  };
}

export const STRATEGY_TYPES = [
  { value: "MOMENTUM", label: "Momentum" },
  { value: "BREAKOUT", label: "Breakout" },
  { value: "REVERSAL", label: "Reversal" },
  { value: "SCALPING", label: "Scalping" },
  { value: "SWING", label: "Swing" },
  { value: "TREND", label: "Trend Following" },
  { value: "RANGE", label: "Range Trading" },
  { value: "OTHER", label: "Other" },
] as const;

export const STRATEGY_COLORS = [
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
] as const;

export const DEFAULT_STRATEGY_FORM: StrategyFormData = {
  name: "",
  description: "",
  type: "MOMENTUM",
  color: "#3b82f6",
  defaultRiskPercent: "",
  maxDrawdownPercent: "",
};

export const DEFAULT_TRADE_FORM: StrategyTradeFormData = {
  date: new Date().toISOString().split("T")[0],
  time: "",
  ticker: "",
  direction: "LONG",
  entryPrice: "",
  exitPrice: "",
  size: "",
  pnl: "",
  notes: "",
  isBacktest: false,
};

export const DEFAULT_SIGNAL_FORM: SignalFormData = {
  type: "ALERT",
  direction: "",
  ticker: "",
  price: "",
  message: "",
  triggerAt: "",
  expiresAt: "",
};
