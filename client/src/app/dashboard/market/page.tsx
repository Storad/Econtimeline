"use client";

import { Construction, TrendingUp, BarChart3, DollarSign } from "lucide-react";

export default function MarketBreakdownPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Coming Soon Icon */}
      <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
        <Construction className="w-10 h-10 text-accent-light" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold mb-3">Market Breakdown</h1>
      <p className="text-muted text-sm max-w-md mb-8">
        Real-time market data, forex pairs, indices, and commodities coming soon.
        Stay tuned for live quotes and analysis.
      </p>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        <div className="bg-card rounded-xl border border-border p-4 text-left">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="font-medium text-sm mb-1">Forex Pairs</h3>
          <p className="text-xs text-muted">Live quotes for major currency pairs</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 text-left">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="font-medium text-sm mb-1">Indices</h3>
          <p className="text-xs text-muted">S&P 500, Nasdaq, and more</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 text-left">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="font-medium text-sm mb-1">Commodities</h3>
          <p className="text-xs text-muted">Gold, oil, and other commodities</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-8 px-4 py-2 bg-accent/10 rounded-full border border-accent/30">
        <span className="text-xs font-medium text-accent-light">In Development</span>
      </div>
    </div>
  );
}
