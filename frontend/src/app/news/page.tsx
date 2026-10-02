"use client";

import React, { useState } from "react";
import { Newspaper, Flame, TrendingUp, TrendingDown, Clock, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { StockDrawer } from "@/components/StockDrawer";

export default function NewsPage() {
  const [filter, setFilter] = useState("All");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { data: newsData, isLoading } = useQuery({
    queryKey: ['marketNews', filter],
    queryFn: () => fetchApi<any>(`/api/news${filter !== 'All' ? '?category=' + filter : ''}`),
    
  });

  const news = newsData?.data || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl max-md:backdrop-blur-none max-md:bg-[#0e0f12] z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <Newspaper size={20} className="text-[#EC4899]" />
          Market Intelligence
        </h1>
        <div className="flex items-center gap-2 bg-[#141824] p-1 rounded-lg border border-white/5 overflow-x-auto hide-scrollbar">
          {['All', 'Earnings', 'Macro', 'M&A', 'Regulatory'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === cat ? 'bg-[#EC4899]/20 text-[#EC4899]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              AI Analyzed Feed
            </h2>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Flame size={14} className="text-[#EC4899]" /> Live from Moneycontrol & Mint
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-[#141824] rounded-2xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-20 text-slate-500 bg-[#141824] rounded-2xl border border-white/5">
              <Search size={32} className="mx-auto mb-3 opacity-20" />
              <p>No news found for this category.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {news.map((item: any) => {
                const isBullish = item.sentiment > 0.3;
                const isBearish = item.sentiment < -0.3;
                
                return (
                  <a 
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-[#141824] border border-white/5 rounded-2xl p-5 hover:border-[#EC4899]/30 transition-colors group relative"
                  >
                    {/* Source Tag */}
                    <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-[#1c2130] text-[10px] uppercase font-bold text-slate-400 rounded-full border border-white/10 group-hover:border-[#EC4899]/30">
                      {item.source}
                    </div>

                    <div className="flex flex-col md:flex-row gap-5">
                      
                      {/* Left: AI Assessment */}
                      <div className="w-full md:w-48 shrink-0 flex flex-row md:flex-col gap-3 justify-between md:justify-start md:border-r md:border-white/5 md:pr-5">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Sentiment</div>
                          {isBullish ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded w-fit text-sm">
                              <TrendingUp size={14} /> Bullish ({(item.sentiment * 100).toFixed(0)}%)
                            </div>
                          ) : isBearish ? (
                            <div className="flex items-center gap-1.5 text-rose-400 font-semibold bg-rose-500/10 px-2 py-1 rounded w-fit text-sm">
                              <TrendingDown size={14} /> Bearish ({(item.sentiment * 100).toFixed(0)}%)
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-300 font-semibold bg-slate-500/10 px-2 py-1 rounded w-fit text-sm">
                              Neutral
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Impact</div>
                          <div className="text-2xl font-bold text-white">
                            {item.impact ? item.impact.toFixed(1) : '-'}<span className="text-sm text-slate-500 font-medium">/10</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.symbols?.map((sym: string) => (
                            <button
                              key={sym}
                              onClick={(e) => {
                                e.preventDefault(); // Prevent link click
                                setSelectedStock(sym);
                              }}
                              className="px-2 py-0.5 bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20 text-[#A29BFE] text-xs font-bold rounded cursor-pointer transition-colors"
                            >
                              ${sym}
                            </button>
                          ))}
                          <span className="px-2 py-0.5 bg-white/5 text-slate-400 text-xs font-medium rounded">
                            {item.category || 'General'}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-200 group-hover:text-[#EC4899] transition-colors leading-snug mb-2">
                          {item.title}
                        </h3>
                        
                        <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                          {item.snippet}
                        </p>
                        
                        {item.reason && (
                          <div className="bg-[#0e0f12] rounded-lg p-3 border border-white/5">
                            <div className="flex gap-2">
                              <div className="shrink-0 mt-0.5"><Filter size={14} className="text-[#38BDF8]" /></div>
                              <p className="text-xs text-slate-300 font-medium">
                                <span className="text-slate-500">AI Reasoning:</span> {item.reason}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-4">
                          <Clock size={12} />
                          {new Date(item.published_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

        </div>
      </div>
      
      <StockDrawer symbol={selectedStock} onClose={() => setSelectedStock(null)} />
    </div>
  );
}
