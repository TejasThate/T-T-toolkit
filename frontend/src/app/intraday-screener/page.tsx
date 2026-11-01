"use client";

import React, { useState } from "react";
import { Filter, Zap, ArrowUpRight, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { StockDrawer } from "@/components/StockDrawer";
import { formatINR, formatPercent } from "@/lib/format";

interface IntradayStock {
  symbol: string;
  name: string;
  strategy: string;
  ltp: number;
  change: number;
  change_pct: number;
  volume_multiple: string;
  vwap: number;
  signal_time: string;
  trend: "Bullish" | "Bearish";
}

const INTRADAY_CANDIDATES: IntradayStock[] = [
  { symbol: "ZOMATO", name: "Zomato Ltd", strategy: "Volume Shocker & ORB", ltp: 264.40, change: 11.80, change_pct: 4.67, volume_multiple: "3.4x", vwap: 258.10, signal_time: "09:30 AM", trend: "Bullish" },
  { symbol: "TRENT", name: "Trent Ltd", strategy: "Day High Breakout", ltp: 7412.50, change: 294.10, change_pct: 4.13, volume_multiple: "2.8x", vwap: 7280.00, signal_time: "09:45 AM", trend: "Bullish" },
  { symbol: "SUZLON", name: "Suzlon Energy", strategy: "Circuit Breakout", ltp: 68.35, change: 3.25, change_pct: 4.99, volume_multiple: "4.1x", vwap: 66.80, signal_time: "09:20 AM", trend: "Bullish" },
  { symbol: "BHEL", name: "BHEL Ltd", strategy: "VWAP Cross & 20 EMA Bounce", ltp: 238.15, change: 8.90, change_pct: 3.88, volume_multiple: "2.1x", vwap: 232.40, signal_time: "10:15 AM", trend: "Bullish" },
  { symbol: "MAZDOCK", name: "Mazagon Dock", strategy: "High Momentum Squeeze", ltp: 4380.00, change: 154.00, change_pct: 3.64, volume_multiple: "2.6x", vwap: 4290.00, signal_time: "10:30 AM", trend: "Bullish" },
  { symbol: "BEL", name: "Bharat Electronics", strategy: "Consolidation Breakout", ltp: 306.80, change: 8.40, change_pct: 2.82, volume_multiple: "1.9x", vwap: 301.20, signal_time: "11:00 AM", trend: "Bullish" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", strategy: "Institutional Accumulation", ltp: 1692.40, change: 38.70, change_pct: 2.34, volume_multiple: "1.8x", vwap: 1670.00, signal_time: "11:30 AM", trend: "Bullish" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", strategy: "Day Low Breakdown", ltp: 1048.20, change: -31.40, change_pct: -2.91, volume_multiple: "2.4x", vwap: 1062.00, signal_time: "09:25 AM", trend: "Bearish" }
];

export default function IntradayScreenerPage() {
  const [strategyFilter, setStrategyFilter] = useState("All");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const filtered = INTRADAY_CANDIDATES.filter(s => {
    if (strategyFilter === "All") return true;
    if (strategyFilter === "Bullish") return s.trend === "Bullish";
    if (strategyFilter === "Bearish") return s.trend === "Bearish";
    if (strategyFilter === "Volume Shockers") return parseFloat(s.volume_multiple) >= 2.5;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <Zap size={20} className="text-yellow-400" />
          Intraday Momentum & Breakout Screener
        </h1>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          REAL-TIME SCAN ENGINE
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Strategy Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            {["All", "Bullish", "Bearish", "Volume Shockers"].map((strat) => (
              <button
                key={strat}
                onClick={() => setStrategyFilter(strat)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  strategyFilter === strat 
                    ? "bg-yellow-400 text-slate-950 font-bold shadow-lg shadow-yellow-400/20" 
                    : "bg-[#141824] text-slate-400 hover:text-white border border-white/5"
                }`}
              >
                {strat}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-[#141824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase font-semibold">
                    <th className="py-3 px-5">Symbol</th>
                    <th className="py-3 px-4">Strategy Trigger</th>
                    <th className="py-3 px-4">LTP</th>
                    <th className="py-3 px-4">Day Change</th>
                    <th className="py-3 px-4">Volume Mult</th>
                    <th className="py-3 px-4">VWAP</th>
                    <th className="py-3 px-4">Signal Time</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filtered.map((stock) => {
                    const isUp = stock.change >= 0;
                    return (
                      <tr 
                        key={stock.symbol}
                        onClick={() => setSelectedStock(`${stock.symbol}.NS`)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-5 font-bold text-white group-hover:text-yellow-400 transition-colors">
                          {stock.symbol}
                          <span className="block text-[10px] text-slate-500 font-normal">{stock.name}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 font-medium text-[11px]">
                            {stock.strategy}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          ₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {stock.change >= 0 ? `+${stock.change.toFixed(2)}` : stock.change.toFixed(2)} ({formatPercent(stock.change_pct)})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-yellow-300">
                          {stock.volume_multiple}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          ₹{stock.vwap.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {stock.signal_time}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button className="px-2.5 py-1 rounded-md bg-[#6C5CE7]/20 hover:bg-[#6C5CE7]/40 text-[#A29BFE] text-xs font-semibold transition-colors">
                            Chart
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <StockDrawer symbol={selectedStock} onClose={() => setSelectedStock(null)} />
    </div>
  );
}
