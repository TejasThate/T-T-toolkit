"use client";

import React, { useState } from "react";
import { TrendingUp, Loader2, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { formatINR, formatPercent } from "@/lib/format";
import { IndexStrip } from "@/components/IndexStrip";
import { BreadthBar } from "@/components/BreadthBar";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { StockDrawer } from "@/components/StockDrawer";
import { MarketStatusPill } from "@/components/ui/MarketStatusPill";

type MoverType = 'gainers' | 'losers' | 'active' | '52w_high' | '52w_low';

export default function MarketTrendsPage() {
  const [moverType, setMoverType] = useState<MoverType>('gainers');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['marketMovers', moverType],
    queryFn: () => fetchApi<any>(`/api/market/movers?index=NIFTY50&type=${moverType}&limit=10`),
    
  });

  const movers = data?.data || [];
  const status = data?.market_status || 'CLOSED';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Top Strip */}
      <IndexStrip />

      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl max-md:backdrop-blur-none max-md:bg-[#0e0f12] z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <TrendingUp size={20} className="text-[#6C5CE7]" />
          Market Trends
        </h1>
        <MarketStatusPill status={status} />
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            
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
                        <th className="p-4 font-semibold hidden lg:table-cell">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {movers.map((stock: any, idx: number) => {
                        const isPos = stock.change >= 0;
                        return (
                          <tr 
                            key={idx} 
                            className="border-t border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer"
                            onClick={() => setSelectedStock(stock.symbol)}
                          >
                            <td className="p-4">
                              <div className="font-semibold text-slate-200">{stock.symbol.replace('.NS', '')}</div>
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
                              <button className="text-[#A29BFE] hover:text-white transition-colors flex items-center gap-1 text-xs font-medium bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20 px-2 py-1 rounded">
                                Analyze <ArrowUpRight size={14} />
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
