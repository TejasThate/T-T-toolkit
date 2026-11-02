"use client";

import React, { useState, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, Loader2, ArrowUpRight, ArrowDownRight, 
  BarChart3, LineChart as LineChartIcon, Activity, Sparkles, RefreshCw, Zap
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi, API_BASE } from "@/lib/api";
import { formatINR, formatPercent } from "@/lib/format";
import { IndexStrip } from "@/components/IndexStrip";
import { BreadthBar } from "@/components/BreadthBar";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { StockDrawer } from "@/components/StockDrawer";
import { MarketStatusPill } from "@/components/ui/MarketStatusPill";
import { FlashingPrice } from "@/components/ui/FlashingPrice";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

type MoverType = 'gainers' | 'losers' | 'active' | '52w_high' | '52w_low';

const POPULAR_INDIAN_ASSETS = [
  "NIFTY 50", "BANK NIFTY", "SENSEX", "RELIANCE", "TCS", "HDFCBANK", 
  "INFY", "TRENT", "SUZLON", "BHEL", "BEL", "HAL", "DIXON"
];

export default function MarketTrendsPage() {
  const [moverType, setMoverType] = useState<MoverType>('gainers');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [activeChartSymbol, setActiveChartSymbol] = useState<string>("NIFTY 50");
  const [timeframe, setTimeframe] = useState<string>("1D");

  // 1. Fetch Today's Trending Indian Movers (1-2 ms response from memory cache)
  const { data: moversRes, isLoading: moversLoading, refetch: refetchMovers } = useQuery({
    queryKey: ['marketMovers', moverType],
    queryFn: () => fetchApi<any>(`/api/market/movers?index=NIFTY50&type=${moverType}&limit=12`),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // 2. Fetch Live Chart Data from Backend (Exact LTP and Intraday trajectory)
  const { data: chartRes, isLoading: chartLoading } = useQuery({
    queryKey: ['marketChart', activeChartSymbol, timeframe],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/market/chart/${encodeURIComponent(activeChartSymbol)}?timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Chart fetch failed');
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 8000,
  });

  const movers = moversRes?.data || [];
  const status = moversRes?.market_status || 'CLOSED';

  const chartPayload = chartRes?.data;
  const chartPoints = chartPayload?.points || [];
  const currentPrice = chartPayload?.current_price || 24020.80;
  const prevClose = chartPayload?.prev_close || currentPrice;
  const dayHigh = chartPayload?.day_high || (currentPrice * 1.01);
  const dayLow = chartPayload?.day_low || (currentPrice * 0.99);
  const netChange = chartPayload?.change ?? (currentPrice - prevClose);
  const netPct = chartPayload?.change_pct ?? ((netChange / prevClose) * 100);
  const isUp = netChange >= 0;

  // Day range slider percentage calculation
  const rangeSpan = Math.max(dayHigh - dayLow, 0.01);
  const currentPosPct = Math.min(Math.max(((currentPrice - dayLow) / rangeSpan) * 100, 2), 98);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Top Benchmark Index Strip */}
      <IndexStrip />

      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[#00D09C]/10 text-[#00D09C]">
            <TrendingUp size={20} />
          </span>
          <div>
            <h1 className="font-extrabold text-base md:text-lg tracking-tight text-white flex items-center gap-2">
              Indian Market Live Intelligence
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                NSE / BSE
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MarketStatusPill status={status} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          
          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            
            {/* Groww-Inspired Interactive Market Graph Widget */}
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              
              {/* Top Controls & Asset Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-white tracking-tight">
                      {chartPayload?.name || activeChartSymbol}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE
                    </span>
                  </div>
                  
                  {/* Big Bold Live Price */}
                  <div className="flex items-baseline gap-3 mt-1.5">
                    <span className="text-3xl font-mono font-extrabold text-white tracking-tight">
                      ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-sm font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                      isUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {isUp ? `+${netChange.toFixed(2)}` : netChange.toFixed(2)} ({formatPercent(netPct)})
                    </span>
                  </div>
                </div>

                {/* Quick Asset Selector Pills */}
                <div className="flex items-center gap-1 bg-[#0e0f12] p-1 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar max-w-full">
                  {POPULAR_INDIAN_ASSETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveChartSymbol(s)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                        activeChartSymbol === s 
                          ? 'bg-[#00D09C] text-slate-950 font-extrabold shadow-md shadow-[#00D09C]/20' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Groww Signature Day Range Slider Bar */}
              <div className="bg-[#0e0f12]/60 rounded-xl p-3 border border-white/5 mb-5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Day Low:</span>
                    <span className="font-mono font-bold text-slate-300">₹{dayLow.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Today's Trading Range</div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Day High:</span>
                    <span className="font-mono font-bold text-slate-300">₹{dayHigh.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-visible">
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500/40 to-emerald-400 rounded-full"
                    style={{ width: `${currentPosPct}%` }}
                  />
                  {/* Current Position Pin */}
                  <div 
                    className="absolute -top-1 w-4 h-4 bg-[#00D09C] rounded-full border-2 border-slate-900 shadow-md transform -translate-x-1/2 transition-all duration-300"
                    style={{ left: `${currentPosPct}%` }}
                    title={`LTP: ₹${currentPrice}`}
                  />
                </div>
              </div>

              {/* Timeframe Selector Pills (Groww style) */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-1 bg-[#0e0f12] p-1 rounded-lg border border-white/5">
                  {["1D", "1W", "1M", "1Y", "ALL"].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                        timeframe === tf 
                          ? 'bg-white/10 text-[#00D09C] font-extrabold' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Trading Hours: 09:15 AM - 03:30 PM IST
                </div>
              </div>

              {/* Chart Render */}
              <div className="h-64 w-full">
                {chartLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00D09C] mr-2" />
                    <span className="text-xs">Loading live ticks...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="growwColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isUp ? '#00D09C' : '#EF4444'} stopOpacity={0.35}/>
                          <stop offset="95%" stopColor={isUp ? '#00D09C' : '#EF4444'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="time" 
                        stroke="#475569" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} 
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={11} 
                        domain={['dataMin - 5', 'dataMax + 5']} 
                        tickLine={false} 
                        axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                        tickFormatter={(val) => `₹${Math.round(val)}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#141824', 
                          borderColor: 'rgba(255,255,255,0.1)', 
                          borderRadius: '12px', 
                          color: '#fff', 
                          fontSize: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                        }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Price']}
                        labelFormatter={(label) => `Time: ${label} IST`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke={isUp ? '#00D09C' : '#EF4444'} 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#growwColor)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            
            {/* Category Tabs for Today's Trending Stocks */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#141824] rounded-xl border border-white/5">
                {[
                  { id: 'gainers', label: 'Top Gainers' },
                  { id: 'losers', label: 'Top Losers' },
                  { id: 'active', label: 'Most Active' },
                  { id: '52w_high', label: '52W High' },
                  { id: '52w_low', label: '52W Low' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMoverType(tab.id as MoverType)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      moverType === tab.id 
                        ? 'bg-[#00D09C] text-slate-950 font-extrabold shadow-md shadow-[#00D09C]/20' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Sorted by today's price momentum</span>
              </div>
            </div>

            {/* Groww-Inspired Table of Today's Real Trending Stocks */}
            <div className="bg-[#141824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              {moversLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <Loader2 className="w-7 h-7 animate-spin text-[#00D09C] mb-2" />
                  <span className="text-xs">Streaming real-time Indian stock quotes...</span>
                </div>
              ) : movers.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  No stocks match this filter right now.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="p-4">Company / Symbol</th>
                        <th className="p-4">Sector</th>
                        <th className="p-4">Market Price (LTP)</th>
                        <th className="p-4">Today's Change</th>
                        <th className="p-4 hidden md:table-cell">Day High / Low</th>
                        <th className="p-4 hidden lg:table-cell">52W High</th>
                        <th className="p-4 text-right">Quick Chart</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-white/5">
                      {movers.map((stock: any, idx: number) => {
                        const isPos = stock.change_pct >= 0;
                        const sym = stock.ticker || stock.symbol.replace('.NS', '');
                        
                        return (
                          <tr 
                            key={idx} 
                            onClick={() => {
                              setActiveChartSymbol(sym);
                              setSelectedStock(stock.symbol);
                            }}
                            className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                          >
                            <td className="p-4">
                              <div className="font-extrabold text-white text-sm group-hover:text-[#00D09C] transition-colors">
                                {sym}
                              </div>
                              <div className="text-[11px] text-slate-400 max-w-[160px] truncate">{stock.name}</div>
                            </td>

                            <td className="p-4">
                              <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                {stock.sector}
                              </span>
                            </td>

                            <td className="p-4 font-mono font-bold text-sm text-white">
                              <FlashingPrice price={stock.ltp} className="text-white" />
                            </td>

                            <td className="p-4 font-mono font-bold">
                              <div className={`flex items-center gap-1.5 ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                                {isPos ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                <span>{isPos ? "+" : ""}{stock.change?.toFixed(2)}</span>
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                  isPos ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
                                }`}>
                                  {formatPercent(stock.change_pct)}
                                </span>
                              </div>
                            </td>

                            <td className="p-4 text-slate-400 font-mono hidden md:table-cell">
                              <span className="text-emerald-400">₹{stock.day_high?.toLocaleString('en-IN')}</span> / 
                              <span className="text-rose-400 ml-1">₹{stock.day_low?.toLocaleString('en-IN')}</span>
                            </td>

                            <td className="p-4 text-slate-400 font-mono hidden lg:table-cell">
                              ₹{stock.week52_high?.toLocaleString('en-IN')}
                            </td>

                            <td className="p-4 text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveChartSymbol(sym);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="text-[#00D09C] hover:text-white transition-colors inline-flex items-center gap-1 text-xs font-bold bg-[#00D09C]/10 hover:bg-[#00D09C] hover:text-slate-950 px-3 py-1.5 rounded-lg border border-[#00D09C]/20"
                              >
                                <LineChartIcon size={13} /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
          
          {/* Right Column Intelligence Widgets */}
          <div className="w-full lg:w-80 space-y-6">
            <BreadthBar />
            <SectorHeatmap />
          </div>

        </div>
      </div>

      <StockDrawer symbol={selectedStock} onClose={() => setSelectedStock(null)} />
    </div>
  );
}
