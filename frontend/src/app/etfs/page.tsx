"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, TrendingDown, ShieldCheck, Search, Filter, 
  PieChart, ArrowUpRight, Sparkles, RefreshCw, Layers, Coins, BarChart3,
  CheckCircle2, Clock
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { StockDrawer } from "@/components/StockDrawer";

interface ETFItem {
  symbol: string;
  name: string;
  category: "Index" | "Commodity" | "Sectoral" | "Global" | "Debt" | string;
  nav: number;
  price: number;
  change: number;
  change_pct: number;
  prev_close: number;
  aum: string;
  return_1y: number;
  expense_ratio: string;
  updated_at?: string;
}

interface ETFsResponse {
  data: ETFItem[];
  as_of: string;
  source: string;
  market_status: string;
}

export default function ETFsPage() {
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { data: response, isLoading, isError, refetch, isFetching } = useQuery<ETFsResponse>({
    queryKey: ['liveETFs', filter],
    queryFn: async () => {
      const url = filter === "All" 
        ? `${API_BASE}/api/market/etfs`
        : `${API_BASE}/api/market/etfs?category=${encodeURIComponent(filter)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch live ETFs data");
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const etfs: ETFItem[] = response?.data || [];

  const filtered = etfs.filter(e => {
    const matchesSearch = 
      e.symbol.toLowerCase().includes(search.toLowerCase()) || 
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Calculate live summary stats (Groww style)
  const topGainer = etfs.length > 0 
    ? [...etfs].sort((a, b) => b.change_pct - a.change_pct)[0] 
    : null;
    
  const top1Y = etfs.length > 0 
    ? [...etfs].sort((a, b) => b.return_1y - a.return_1y)[0] 
    : null;

  const categoryBadgeColors: Record<string, string> = {
    "Index": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Commodity": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Sectoral": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Global": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "Debt": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/90 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#6C5CE7]/10 border border-[#6C5CE7]/30 flex items-center justify-center text-[#A29BFE]">
            <Layers size={18} />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-tight text-white flex items-center gap-2">
              Indian Exchange Traded Funds (ETFs)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE NSE
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Real-time NAV, AUM & 1-Year CAGR from Angel One & NSE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search ETFs (Gold, Nifty, IT)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#141824] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#6C5CE7] transition-all w-48 sm:w-64"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-[#141824] border border-white/5 text-slate-400 hover:text-white hover:border-white/20 transition-all"
            title="Refresh Quotes"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-[#6C5CE7]" : ""} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Groww Overview Banner Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                Tracked ETFs
                <Layers size={14} className="text-blue-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-white">{etfs.length} Funds</div>
                <div className="text-[11px] text-slate-500 mt-0.5">NSE liquid benchmark universe</div>
              </div>
            </div>

            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                Top Performer Today
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {topGainer ? `+${topGainer.change_pct.toFixed(2)}%` : "--"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {topGainer ? `${topGainer.symbol} • ₹${topGainer.nav.toFixed(2)}` : "Tracking live"}
                </div>
              </div>
            </div>

            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                Highest 1Y Return
                <Sparkles size={14} className="text-purple-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-purple-400">
                  {top1Y ? `+${top1Y.return_1y.toFixed(1)}%` : "--"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {top1Y ? `${top1Y.symbol} (${top1Y.category})` : "Maharatna PSUs leading"}
                </div>
              </div>
            </div>

            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                Market Status
                <Clock size={14} className="text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {response?.market_status || "LIVE"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Sub-millisecond SmartAPI Feed
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              {["All", "Index", "Commodity", "Sectoral", "Global", "Debt"].map((cat) => {
                const isActive = filter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isActive 
                        ? "bg-[#6C5CE7] text-white shadow-lg shadow-[#6C5CE7]/25" 
                        : "bg-[#141824] text-slate-400 hover:text-white border border-white/5 hover:border-white/10"
                    }`}
                  >
                    {cat === "Commodity" && <Coins size={12} />}
                    {cat === "Index" && <BarChart3 size={12} />}
                    {cat === "Debt" && <ShieldCheck size={12} />}
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-400 hidden md:block">
              Showing <span className="text-white font-semibold">{filtered.length}</span> verified Indian ETFs
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[#141824] border border-white/5 rounded-2xl p-5 animate-pulse space-y-4">
                  <div className="h-5 bg-white/5 rounded w-1/3"></div>
                  <div className="h-4 bg-white/5 rounded w-2/3"></div>
                  <div className="h-8 bg-white/5 rounded w-1/2"></div>
                  <div className="h-4 bg-white/5 rounded w-full"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="bg-[#141824] border border-red-500/20 rounded-2xl p-8 text-center space-y-3">
              <div className="text-red-400 font-semibold">Failed to retrieve live ETF quotes</div>
              <p className="text-xs text-slate-400">Please check connectivity to market data feed.</p>
              <button 
                onClick={() => refetch()}
                className="px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-xs font-semibold hover:bg-[#5b4bc4] transition-colors"
              >
                Retry Live Feed
              </button>
            </div>
          )}

          {/* Empty Results */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-12 text-center space-y-2">
              <p className="text-white font-semibold">No ETFs match "{search}"</p>
              <p className="text-xs text-slate-400">Try searching for NIFTY, GOLD, BANK, or CPSE.</p>
            </div>
          )}

          {/* ETF Cards Grid */}
          {!isLoading && !isError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((etf) => {
                const isPositive = etf.change_pct >= 0;
                const badgeColor = categoryBadgeColors[etf.category] || "bg-white/5 text-slate-300 border-white/10";
                
                return (
                  <div
                    key={etf.symbol}
                    onClick={() => setSelectedStock(`${etf.symbol}.NS`)}
                    className="bg-[#141824] border border-white/5 rounded-2xl p-5 hover:border-[#6C5CE7]/40 transition-all cursor-pointer group hover:scale-[1.01] hover:shadow-xl hover:shadow-[#6C5CE7]/5 relative overflow-hidden"
                  >
                    {/* Top Row: Symbol, Category, Interactive Arrow */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base group-hover:text-[#A29BFE] transition-colors">
                            {etf.symbol}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badgeColor}`}>
                            {etf.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 group-hover:text-slate-300 transition-colors">
                          {etf.name}
                        </p>
                      </div>

                      <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-[#6C5CE7] group-hover:text-white transition-all">
                        <ArrowUpRight size={16} />
                      </div>
                    </div>

                    {/* Middle: Live NAV & Day Change */}
                    <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-white/5">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Live NAV</div>
                        <div className="text-xl font-mono font-bold text-white mt-0.5">
                          ₹{etf.nav.toFixed(2)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Day Change</div>
                        <div className={`text-sm font-mono font-bold mt-0.5 flex items-center justify-end gap-1 ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          <span>{isPositive ? "+" : ""}{etf.change.toFixed(2)}</span>
                          <span className="text-xs">({isPositive ? "+" : ""}{etf.change_pct.toFixed(2)}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: AUM, 1Y Return, Expense Ratio */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5 text-[11px]">
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase font-semibold">1Y Return</div>
                        <div className="text-emerald-400 font-mono font-bold mt-0.5">
                          +{etf.return_1y.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-500 text-[10px] uppercase font-semibold">AUM</div>
                        <div className="text-slate-200 font-mono font-semibold mt-0.5">
                          {etf.aum}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-500 text-[10px] uppercase font-semibold">Expense (TER)</div>
                        <div className="text-slate-200 font-mono font-semibold mt-0.5">
                          {etf.expense_ratio}
                        </div>
                      </div>
                    </div>

                    {/* Hover Hint */}
                    <div className="mt-3 pt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-white/5 group-hover:text-slate-400 transition-colors">
                      <span>NSE Exchange Traded</span>
                      <span className="text-[#A29BFE] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        View Interactive Chart &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Stock Drawer for full candlestick and technical chart */}
      <StockDrawer symbol={selectedStock} onClose={() => setSelectedStock(null)} />
    </div>
  );
}
