"use client";

import React, { useState } from "react";
import { TrendingUp, ShieldCheck, Search, Filter, PieChart, ArrowUpRight } from "lucide-react";
import { StockDrawer } from "@/components/StockDrawer";

interface ETFItem {
  symbol: string;
  name: string;
  category: "Index" | "Commodity" | "Sectoral" | "Global" | "Debt";
  nav: number;
  change: number;
  change_pct: number;
  aum: string;
  return_1y: number;
  expense_ratio: string;
}

const ETFS_DATA: ETFItem[] = [
  { symbol: "NIFTYBEES", name: "Nippon India ETF Nifty 50 BeES", category: "Index", nav: 264.80, change: 1.40, change_pct: 0.53, aum: "₹28,450 Cr", return_1y: 22.4, expense_ratio: "0.04%" },
  { symbol: "BANKBEES", name: "Nippon India ETF Bank BeES", category: "Index", nav: 532.10, change: 2.80, change_pct: 0.53, aum: "₹12,890 Cr", return_1y: 18.2, expense_ratio: "0.19%" },
  { symbol: "GOLDBEES", name: "Nippon India ETF Gold BeES", category: "Commodity", nav: 68.45, change: 0.85, change_pct: 1.25, aum: "₹14,200 Cr", return_1y: 28.6, expense_ratio: "0.82%" },
  { symbol: "SILVERBEES", name: "Nippon India ETF Silver BeES", category: "Commodity", nav: 92.15, change: 1.60, change_pct: 1.76, aum: "₹6,120 Cr", return_1y: 32.1, expense_ratio: "0.50%" },
  { symbol: "ITBEES", name: "Nippon India ETF Nifty IT", category: "Sectoral", nav: 44.20, change: 0.75, change_pct: 1.72, aum: "₹4,890 Cr", return_1y: 26.8, expense_ratio: "0.22%" },
  { symbol: "CPSEETF", name: "CPSE ETF (Maharatna PSUs)", category: "Sectoral", nav: 94.50, change: 1.80, change_pct: 1.94, aum: "₹39,400 Cr", return_1y: 48.5, expense_ratio: "0.05%" },
  { symbol: "MON100", name: "Motilal Oswal Nasdaq 100 ETF", category: "Global", nav: 168.20, change: 1.90, change_pct: 1.14, aum: "₹7,850 Cr", return_1y: 34.2, expense_ratio: "0.58%" },
  { symbol: "JUNIORBEES", name: "Nippon India Nifty Next 50", category: "Index", nav: 812.40, change: 8.50, change_pct: 1.05, aum: "₹8,940 Cr", return_1y: 44.1, expense_ratio: "0.15%" },
  { symbol: "PHARMABEES", name: "Nippon India Nifty Pharma", category: "Sectoral", nav: 22.80, change: -0.05, change_pct: -0.22, aum: "₹1,450 Cr", return_1y: 31.4, expense_ratio: "0.22%" },
  { symbol: "LIQUIDBEES", name: "Nippon India ETF Liquid BeES", category: "Debt", nav: 1000.00, change: 0.18, change_pct: 0.02, aum: "₹15,200 Cr", return_1y: 6.85, expense_ratio: "0.65%" }
];

export default function ETFsPage() {
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const filtered = ETFS_DATA.filter(e => {
    const matchesCat = filter === "All" || e.category === filter;
    const matchesSearch = e.symbol.toLowerCase().includes(search.toLowerCase()) || e.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <TrendingUp size={20} className="text-[#6C5CE7]" />
          Indian ETFs Market Hub
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search ETFs (Gold, Nifty, IT)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#141824] border border-white/5 rounded-lg text-xs text-white focus:outline-none focus:border-[#6C5CE7]"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            {["All", "Index", "Commodity", "Sectoral", "Global", "Debt"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  filter === cat 
                    ? "bg-[#6C5CE7] text-white shadow-lg shadow-[#6C5CE7]/20" 
                    : "bg-[#141824] text-slate-400 hover:text-white border border-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((etf) => {
              const isUp = etf.change >= 0;
              return (
                <div
                  key={etf.symbol}
                  onClick={() => setSelectedStock(`${etf.symbol}.NS`)}
                  className="bg-[#141824] border border-white/5 rounded-2xl p-5 hover:border-[#6C5CE7]/30 transition-all cursor-pointer group hover:scale-[1.01]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base group-hover:text-[#A29BFE] transition-colors">{etf.symbol}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-semibold">{etf.category}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{etf.name}</p>
                    </div>
                    <ArrowUpRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                  </div>

                  <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Live NAV</div>
                      <div className="text-lg font-mono font-bold text-white">₹{etf.nav.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">1Y Return</div>
                      <div className="text-sm font-mono font-bold text-emerald-400">+{etf.return_1y.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400">
                    <div>AUM: <span className="text-slate-200 font-semibold">{etf.aum}</span></div>
                    <div className="text-right">TER: <span className="text-slate-200 font-semibold">{etf.expense_ratio}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      <StockDrawer symbol={selectedStock} onClose={() => setSelectedStock(null)} />
    </div>
  );
}
