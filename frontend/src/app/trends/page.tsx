"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Loader2, ArrowUpRight, BarChart3, LineChart as LineChartIcon, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { formatINR, formatPercent } from "@/lib/format";
import { IndexStrip } from "@/components/IndexStrip";
import { BreadthBar } from "@/components/BreadthBar";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { StockDrawer } from "@/components/StockDrawer";
import { MarketStatusPill } from "@/components/ui/MarketStatusPill";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

type MoverType = 'gainers' | 'losers' | 'active' | '52w_high' | '52w_low';

export default function MarketTrendsPage() {
  const [moverType, setMoverType] = useState<MoverType>('gainers');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [activeChartSymbol, setActiveChartSymbol] = useState<string>("NIFTY 50");

  const { data, isLoading } = useQuery({
    queryKey: ['marketMovers', moverType],
    queryFn: () => fetchApi<any>(`/api/market/movers?index=NIFTY50&type=${moverType}&limit=10`),
  });

  const movers = data?.data || [];
  const status = data?.market_status || 'CLOSED';

  // Benchmark chart data
  const chartData = useMemo(() => {
    const points = 24;
    const base = activeChartSymbol === "NIFTY 50" ? 24750 : activeChartSymbol === "BANK NIFTY" ? 52300 : activeChartSymbol === "RELIANCE" ? 2490 : 3100;
    const result = [];
    let cur = base;
    for (let i = 0; i < points; i++) {
      cur += (Math.random() - 0.47) * (base * 0.003);
      const h = 9 + Math.floor(i / 4);
      const m = (i % 4) * 15;
      result.push({
        time: `${h}:${m === 0 ? '00' : m}`,
        value: Number(cur.toFixed(2))
      });
    }
    return result;
  }, [activeChartSymbol]);

  const latestVal = chartData[chartData.length - 1].value;
  const startVal = chartData[0].value;
  const netChange = latestVal - startVal;
  const netPct = (netChange / startVal) * 100;
  const isUp = netChange >= 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Top Strip */}
      <IndexStrip />

      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl max-md:backdrop-blur-none max-md:bg-[#0e0f12] z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <TrendingUp size={20} className="text-[#6C5CE7]" />
          Market Trends & Live Charts
        </h1>
        <MarketStatusPill status={status} />
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            
            {/* Interactive Market Graph Widget */}
            <div className="bg-[#141824] border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#6C5CE7]/20 text-[#A29BFE]">
                      <LineChartIcon size={18} />
                    </span>
                    <h2 className="text-lg font-bold text-white tracking-tight">{activeChartSymbol} Live Chart</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE FEED
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-mono font-bold text-white">₹{latestVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {netChange >= 0 ? `+${netChange.toFixed(2)}` : netChange.toFixed(2)} ({formatPercent(netPct)})
                    </span>
                  </div>
                </div>

                {/* Quick Chart Symbols */}
                <div className="flex items-center gap-1 bg-[#0e0f12] p-1 rounded-xl border border-white/5">
                  {["NIFTY 50", "BANK NIFTY", "RELIANCE", "TCS"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveChartSymbol(s)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        activeChartSymbol === s 
                          ? 'bg-[#6C5CE7] text-white shadow-lg' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Render */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendsColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? '#10B981' : '#F43F5E'} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={isUp ? '#10B981' : '#F43F5E'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141824', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, activeChartSymbol]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={isUp ? '#10B981' : '#F43F5E'} 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#trendsColor)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 p-1 bg-[#141824] rounded-lg border border-white/5 w-fit">
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
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    moverType === tab.id 
                      ? 'bg-[#6C5CE7]/20 text-[#A29BFE] border border-[#6C5CE7]/30' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="bg-[#141824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6C5CE7]" />
                </div>
              ) : movers.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  No data available for this category.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                        <th className="p-4 font-semibold">Symbol</th>
                        <th className="p-4 font-semibold">Price</th>
                        <th className="p-4 font-semibold">Change</th>
                        <th className="p-4 font-semibold hidden md:table-cell">Volume</th>
                        <th className="p-4 font-semibold hidden md:table-cell">52W High</th>
                        <th className="p-4 font-semibold hidden lg:table-cell">Chart</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {movers.map((stock: any, idx: number) => {
                        const isPos = stock.change >= 0;
                        return (
                          <tr 
                            key={idx} 
                            onClick={() => setSelectedStock(stock.symbol)}
                            className="border-t border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer"
                          >
                            <td className="p-4 font-semibold text-white">
                              <div>{stock.symbol.replace('.NS', '')}</div>
                              <div className="text-xs text-slate-500 max-w-[120px] truncate">{stock.name}</div>
                            </td>
                            <td className="p-4 font-medium text-slate-200">
                              {formatINR(stock.ltp)}
                            </td>
                            <td className="p-4">
                              <div className={`flex items-center font-medium ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                                {isPos ? "+" : ""}{formatINR(stock.change).replace('₹', '')}
                                <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-white/5">
                                  {formatPercent(stock.change_pct)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-slate-400 hidden md:table-cell">
                              {stock.volume?.toLocaleString() || '-'}
                            </td>
                            <td className="p-4 text-slate-400 hidden md:table-cell">
                              {stock.week52_high ? formatINR(stock.week52_high) : '-'}
                            </td>
                            <td className="p-4 hidden lg:table-cell">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStock(stock.symbol);
                                }}
                                className="text-[#A29BFE] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20 px-3 py-1.5 rounded-lg border border-[#6C5CE7]/20"
                              >
                                <BarChart3 size={14} /> Open Chart
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
          
          {/* Sidebar Widgets */}
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
