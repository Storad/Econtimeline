"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

// Mock market data
const forexPairs = [
  { pair: "EUR/USD", price: 1.0892, change: 0.23, high: 1.0915, low: 1.0856, session: "london" },
  { pair: "GBP/USD", price: 1.2734, change: -0.15, high: 1.2780, low: 1.2701, session: "london" },
  { pair: "USD/JPY", price: 148.45, change: 0.42, high: 148.89, low: 147.92, session: "tokyo" },
  { pair: "USD/CHF", price: 0.8756, change: -0.08, high: 0.8789, low: 0.8732, session: "london" },
  { pair: "AUD/USD", price: 0.6589, change: 0.31, high: 0.6612, low: 0.6554, session: "sydney" },
  { pair: "USD/CAD", price: 1.3456, change: -0.12, high: 1.3489, low: 1.3421, session: "newyork" },
  { pair: "NZD/USD", price: 0.6123, change: 0.18, high: 0.6145, low: 0.6098, session: "sydney" },
  { pair: "EUR/GBP", price: 0.8554, change: 0.05, high: 0.8578, low: 0.8532, session: "london" },
];

const indices = [
  { name: "S&P 500", value: 4783.45, change: 0.56, region: "US" },
  { name: "Dow Jones", value: 37440.34, change: 0.43, region: "US" },
  { name: "Nasdaq", value: 15012.67, change: 0.78, region: "US" },
  { name: "FTSE 100", value: 7654.32, change: -0.23, region: "UK" },
  { name: "DAX", value: 16789.45, change: 0.34, region: "EU" },
  { name: "Nikkei 225", value: 35834.56, change: 1.12, region: "JP" },
];

const commodities = [
  { name: "Gold", symbol: "XAU/USD", price: 2045.67, change: 0.45, unit: "/oz" },
  { name: "Silver", symbol: "XAG/USD", price: 23.12, change: 0.89, unit: "/oz" },
  { name: "Crude Oil", symbol: "WTI", price: 72.34, change: -1.23, unit: "/bbl" },
  { name: "Natural Gas", symbol: "NG", price: 2.567, change: -2.15, unit: "/MMBtu" },
];

const marketSentiment = {
  overall: "bullish",
  usd: "neutral",
  eur: "bearish",
  gbp: "neutral",
  jpy: "bearish",
};

const sessionColors = {
  sydney: "text-purple-400",
  tokyo: "text-pink-400",
  london: "text-blue-400",
  newyork: "text-emerald-400",
};

export default function MarketBreakdownPage() {
  const [selectedTab, setSelectedTab] = useState<"forex" | "indices" | "commodities">("forex");

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-emerald-400";
    if (change < 0) return "text-red-400";
    return "text-muted";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Market Breakdown</h1>
          <p className="text-muted text-sm mt-1">Real-time market overview and analysis</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-card-hover transition-colors text-sm">
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      {/* Market Sessions Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: "Sydney", status: "Closed", color: "purple" },
          { name: "Tokyo", status: "Closed", color: "pink" },
          { name: "London", status: "Open", color: "blue" },
          { name: "New York", status: "Open", color: "emerald" },
        ].map((session) => (
          <div key={session.name} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium text-${session.color}-400`}>{session.name}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                session.status === "Open"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-muted/20 text-muted"
              }`}>
                {session.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Market Tabs */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          {[
            { id: "forex", label: "Forex Pairs" },
            { id: "indices", label: "Indices" },
            { id: "commodities", label: "Commodities" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? "bg-accent/10 text-accent-light border-b-2 border-accent"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Forex Tab */}
        {selectedTab === "forex" && (
          <div className="divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 px-4 py-3 text-xs font-medium text-muted bg-background/50">
              <div>Pair</div>
              <div className="text-right">Price</div>
              <div className="text-right">Change</div>
              <div className="text-right">High</div>
              <div className="text-right">Low</div>
              <div className="text-center">Session</div>
            </div>

            {/* Rows */}
            {forexPairs.map((pair) => (
              <div
                key={pair.pair}
                className="grid grid-cols-6 gap-4 px-4 py-4 items-center hover:bg-card-hover transition-colors"
              >
                <div className="font-semibold">{pair.pair}</div>
                <div className="text-right font-mono">{pair.price.toFixed(4)}</div>
                <div className={`text-right flex items-center justify-end gap-1 ${getChangeColor(pair.change)}`}>
                  {getTrendIcon(pair.change)}
                  {pair.change > 0 ? "+" : ""}{pair.change.toFixed(2)}%
                </div>
                <div className="text-right text-sm text-muted">{pair.high.toFixed(4)}</div>
                <div className="text-right text-sm text-muted">{pair.low.toFixed(4)}</div>
                <div className={`text-center text-xs font-medium capitalize ${sessionColors[pair.session as keyof typeof sessionColors]}`}>
                  {pair.session}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Indices Tab */}
        {selectedTab === "indices" && (
          <div className="divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 px-4 py-3 text-xs font-medium text-muted bg-background/50">
              <div>Index</div>
              <div className="text-right">Value</div>
              <div className="text-right">Change</div>
              <div className="text-center">Region</div>
            </div>

            {/* Rows */}
            {indices.map((index) => (
              <div
                key={index.name}
                className="grid grid-cols-4 gap-4 px-4 py-4 items-center hover:bg-card-hover transition-colors"
              >
                <div className="font-semibold">{index.name}</div>
                <div className="text-right font-mono">{index.value.toLocaleString()}</div>
                <div className={`text-right flex items-center justify-end gap-1 ${getChangeColor(index.change)}`}>
                  {getTrendIcon(index.change)}
                  {index.change > 0 ? "+" : ""}{index.change.toFixed(2)}%
                </div>
                <div className="text-center">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-card-hover">
                    {index.region}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Commodities Tab */}
        {selectedTab === "commodities" && (
          <div className="divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 px-4 py-3 text-xs font-medium text-muted bg-background/50">
              <div>Commodity</div>
              <div className="text-right">Price</div>
              <div className="text-right">Change</div>
              <div className="text-center">Symbol</div>
            </div>

            {/* Rows */}
            {commodities.map((commodity) => (
              <div
                key={commodity.name}
                className="grid grid-cols-4 gap-4 px-4 py-4 items-center hover:bg-card-hover transition-colors"
              >
                <div className="font-semibold">{commodity.name}</div>
                <div className="text-right">
                  <span className="font-mono">${commodity.price.toFixed(2)}</span>
                  <span className="text-xs text-muted ml-1">{commodity.unit}</span>
                </div>
                <div className={`text-right flex items-center justify-end gap-1 ${getChangeColor(commodity.change)}`}>
                  {getTrendIcon(commodity.change)}
                  {commodity.change > 0 ? "+" : ""}{commodity.change.toFixed(2)}%
                </div>
                <div className="text-center">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-card-hover">
                    {commodity.symbol}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market Sentiment */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium mb-4">Market Sentiment</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(marketSentiment).map(([currency, sentiment]) => (
            <div key={currency} className="text-center p-3 rounded-lg bg-background">
              <p className="text-xs text-muted uppercase mb-1">
                {currency === "overall" ? "Overall" : currency.toUpperCase()}
              </p>
              <p className={`text-sm font-semibold capitalize ${
                sentiment === "bullish" ? "text-emerald-400" :
                sentiment === "bearish" ? "text-red-400" :
                "text-yellow-400"
              }`}>
                {sentiment}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">DXY (Dollar Index)</p>
          <p className="text-xl font-bold">103.45</p>
          <p className="text-xs text-emerald-400">+0.12%</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">VIX (Volatility)</p>
          <p className="text-xl font-bold">12.89</p>
          <p className="text-xs text-red-400">-3.45%</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">10Y Treasury</p>
          <p className="text-xl font-bold">4.125%</p>
          <p className="text-xs text-emerald-400">+0.02</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">Bitcoin</p>
          <p className="text-xl font-bold">$43,567</p>
          <p className="text-xs text-emerald-400">+2.34%</p>
        </div>
      </div>
    </div>
  );
}
