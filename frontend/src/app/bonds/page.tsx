"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ShieldCheck, IndianRupee, Clock, ArrowUpRight, Award, 
  Search, RefreshCw, Copy, Check, Info, Sparkles, Building2, Coins, ChevronRight
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface BondItem {
  id: string;
  symbol: string;
  name: string;
  type: "Sovereign (G-Sec)" | "SGB (Gold)" | "PSU Corporate" | "Tax Free" | string;
  coupon: string;
  yield_pct: number;
  rating: string;
  price: number;
  face_value: number;
  maturity: string;
  interest_payment: string;
  change?: number;
  change_pct?: number;
  updated_at?: string;
}

interface BondsResponse {
  data: BondItem[];
  as_of: string;
  source: string;
  market_status: string;
}

export default function BondsPage() {
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [investModalBond, setInvestModalBond] = useState<BondItem | null>(null);
  const [investQty, setInvestQty] = useState<number>(10);
  const [investSuccess, setInvestSuccess] = useState<boolean>(false);

  const { data: response, isLoading, isError, refetch, isFetching } = useQuery<BondsResponse>({
    queryKey: ['liveBonds', filter],
    queryFn: async () => {
      const url = filter === "All" 
        ? `${API_BASE}/api/market/bonds`
        : `${API_BASE}/api/market/bonds?type=${encodeURIComponent(filter)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch live bonds data");
      return res.json();
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const bonds: BondItem[] = response?.data || [];

  const filtered = bonds.filter(b => {
    const matchesSearch = 
      b.name.toLowerCase().includes(search.toLowerCase()) || 
      b.symbol.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.type.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleCopyISIN = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenInvest = (bond: BondItem) => {
    setInvestModalBond(bond);
    setInvestQty(bond.type.includes("SGB") ? 1 : 10);
    setInvestSuccess(false);
  };

  const ratingBadgeColors: Record<string, string> = {
    "SOVEREIGN": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "CRISIL AAA": "bg-blue-500/10 text-blue-400 border-blue-500/30",
    "ICRA AAA": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    "CARE AAA": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/90 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-tight text-white flex items-center gap-2">
              Government & Corporate Bonds Hub
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                RBI RETAIL DIRECT & NSE
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Sovereign G-Secs, SGBs, AAA Navratna PSUs & Tax-Free Indian Bonds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Bonds (GS2033, REC, NHAI, SGB)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#141824] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all w-48 sm:w-64"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-[#141824] border border-white/5 text-slate-400 hover:text-white hover:border-white/20 transition-all"
            title="Refresh Quotes"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-emerald-400" : ""} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Groww Institutional Debt Benchmark Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                10Y Benchmark G-Sec
                <ShieldCheck size={14} className="text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-emerald-400">6.82%</div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">7.18% GS 2033 • Sovereign</div>
              </div>
            </div>

            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                Sovereign Gold (SGB)
                <Coins size={14} className="text-amber-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-amber-400">14.20%</div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">Gold rally + 2.50% P.A. Tax Free</div>
              </div>
            </div>

            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                AAA PSU Corporate
                <Building2 size={14} className="text-blue-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-blue-400">7.48%</div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">REC / PFC / NABARD Highest Safety</div>
              </div>
            </div>

            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                Tax-Free Govt Bonds
                <Sparkles size={14} className="text-purple-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-purple-400">5.45%</div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">Sec 10(15) • ~8.0% Pre-tax Equiv</div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              {[
                { key: "All", label: "All Instruments" },
                { key: "Sovereign", label: "G-Secs (Central Govt)" },
                { key: "Gold", label: "SGBs (Gold)" },
                { key: "PSU", label: "PSU Corporates (AAA)" },
                { key: "Tax Free", label: "Tax Free Bonds" }
              ].map((tab) => {
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isActive 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" 
                        : "bg-[#141824] text-slate-400 hover:text-white border border-white/5 hover:border-white/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-400 hidden md:block">
              Showing <span className="text-white font-semibold">{filtered.length}</span> live debt securities
            </div>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#141824] border border-white/5 rounded-2xl p-5 animate-pulse space-y-4">
                  <div className="h-5 bg-white/5 rounded w-1/2"></div>
                  <div className="h-4 bg-white/5 rounded w-1/3"></div>
                  <div className="h-8 bg-white/5 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="bg-[#141824] border border-red-500/20 rounded-2xl p-8 text-center space-y-3">
              <div className="text-red-400 font-semibold">Failed to retrieve live Bond rates</div>
              <p className="text-xs text-slate-400">Please check RBI / NSE market feed connectivity.</p>
              <button 
                onClick={() => refetch()}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition-colors"
              >
                Retry Debt Feed
              </button>
            </div>
          )}

          {/* Empty Search */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-12 text-center space-y-2">
              <p className="text-white font-semibold">No bonds found matching "{search}"</p>
              <p className="text-xs text-slate-400">Try searching for GS2033, REC, NHAI, or SGB.</p>
            </div>
          )}

          {/* Bonds Grid */}
          {!isLoading && !isError && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((bond) => {
                const isSgb = bond.type.includes("SGB");
                const isTaxFree = bond.type.includes("Tax Free");
                const badgeColor = ratingBadgeColors[bond.rating] || "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

                return (
                  <div
                    key={bond.id}
                    className="bg-[#141824] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header: Name, Rating, ISIN */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                              {bond.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${badgeColor}`}>
                              <ShieldCheck size={11} />
                              {bond.rating}
                            </span>

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-semibold">
                              {bond.type}
                            </span>

                            {isTaxFree && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold">
                                100% Tax-Free (Sec 10)
                              </span>
                            )}

                            <button
                              onClick={(e) => handleCopyISIN(bond.id, e)}
                              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-mono bg-white/5 px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors"
                              title="Copy ISIN"
                            >
                              {copiedId === bond.id ? (
                                <>
                                  <Check size={10} className="text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={10} />
                                  <span>{bond.id}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenInvest(bond)}
                          className="h-8 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all flex-shrink-0"
                        >
                          Invest
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Main Financials: Annual Yield (YTM), Coupon, Maturity */}
                      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            Annual Yield (YTM)
                          </div>
                          <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                            {bond.yield_pct.toFixed(2)}%
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            Coupon Rate
                          </div>
                          <div className="text-sm font-mono font-semibold text-white mt-1">
                            {bond.coupon}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            Maturity
                          </div>
                          <div className="text-sm font-mono font-semibold text-slate-200 mt-1">
                            {bond.maturity}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Details: Price, Face Value, Interest Frequency */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>Clean Price:</span>
                        <span className="text-white font-mono font-bold">
                          ₹{bond.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          (FV: ₹{bond.face_value.toLocaleString('en-IN')})
                        </span>
                      </div>

                      <div className="text-right text-[11px] text-slate-400">
                        Payout: <span className="text-slate-200 font-semibold">{bond.interest_payment}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Direct ASBA / RBI Retail Direct Investment Modal */}
      {investModalBond && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                  {investModalBond.type}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  {investModalBond.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ISIN: {investModalBond.id} • Rating: {investModalBond.rating}
                </p>
              </div>
              <button
                onClick={() => setInvestModalBond(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                ✕
              </button>
            </div>

            {investSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>
                <h4 className="text-base font-bold text-white">Investment Mandate Generated</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your bid of ₹{(investQty * investModalBond.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been logged. ASBA block request routed to your linked bank via RBI Retail Direct.
                </p>
                <button
                  onClick={() => setInvestModalBond(null)}
                  className="w-full mt-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Specs overview */}
                <div className="grid grid-cols-2 gap-3 bg-[#0e0f12] p-3 rounded-xl border border-white/5 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Annual Yield</span>
                    <div className="text-emerald-400 font-bold font-mono text-base">{investModalBond.yield_pct.toFixed(2)}%</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Coupon</span>
                    <div className="text-white font-semibold font-mono text-base">{investModalBond.coupon}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Market Price</span>
                    <div className="text-white font-semibold font-mono">₹{investModalBond.price.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Interest Payout</span>
                    <div className="text-white font-semibold">{investModalBond.interest_payment}</div>
                  </div>
                </div>

                {/* Units selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Quantity ({investModalBond.type.includes("SGB") ? "Grams of Gold" : "Units"})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInvestQty(Math.max(1, investQty - (investModalBond.type.includes("SGB") ? 1 : 10)))}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={investQty}
                      onChange={(e) => setInvestQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 py-2 px-3 bg-[#0e0f12] border border-white/10 rounded-xl text-center text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => setInvestQty(investQty + (investModalBond.type.includes("SGB") ? 1 : 10))}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total investment calculation */}
                <div className="flex items-baseline justify-between pt-2 border-t border-white/5">
                  <span className="text-xs text-slate-400">Total Bid Amount</span>
                  <span className="text-xl font-mono font-bold text-white">
                    ₹{(investQty * investModalBond.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Action CTA */}
                <button
                  onClick={() => setInvestSuccess(true)}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5"
                >
                  Confirm ASBA Bid via RBI Retail Direct
                  <ArrowUpRight size={15} />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
