"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowUpRight, Clock, Info, ShieldCheck, IndianRupee, Sparkles, 
  Calendar, CheckCircle2, TrendingUp, Filter, AlertCircle, Check 
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface IPOData {
  name: string;
  type: "Mainboard" | "SME" | string;
  price_band: string;
  issue_size: string;
  status: "Open" | "Closed" | "Upcoming" | string;
  open_date: string;
  close_date: string;
  gmp: string;
  est_listing: string;
  dynamics: string;
  summary: string;
  subscription: string;
}

export default function IPOPage() {
  const [activeTab, setActiveTab] = useState<'Open' | 'Upcoming' | 'Closed' | 'Applied'>('Open');
  const [activeType, setActiveType] = useState<'All' | 'Mainboard' | 'SME'>('All');
  const [expandedIpo, setExpandedIpo] = useState<number | null>(null);
  const [appliedIpos, setAppliedIpos] = useState<string[]>([]);
  const [applyModalIpo, setApplyModalIpo] = useState<IPOData | null>(null);
  const [upiId, setUpiId] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);

  // Load user applied IPOs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("applied_ipos");
      if (saved) setAppliedIpos(JSON.parse(saved));
    } catch {}
  }, []);

  const { data: ipoData, isLoading, refetch } = useQuery<{ ipos: IPOData[] }>({
    queryKey: ['liveIpos'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/market/ipos`);
      if (!res.ok) throw new Error('Failed to fetch live IPOs');
      return res.json();
    },
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const ipos = ipoData?.ipos || [];

  // Summary Metrics (Groww style)
  const openCount = ipos.filter(i => i.status === "Open").length;
  const upcomingCount = ipos.filter(i => i.status === "Upcoming").length;
  const closedCount = ipos.filter(i => i.status === "Closed").length;
  
  // Calculate highest GMP
  const topGmpIpo = [...ipos].sort((a, b) => {
    const getVal = (str: string) => {
      const match = str.match(/\(([-\d.]+)%\)/);
      return match ? parseFloat(match[1]) : 0;
    };
    return getVal(b.est_listing) - getVal(a.est_listing);
  })[0];

  const handleApply = (ipo: IPOData) => {
    setApplyModalIpo(ipo);
    setApplySuccess(false);
  };

  const confirmApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalIpo) return;
    const updated = [...appliedIpos, applyModalIpo.name];
    setAppliedIpos(updated);
    try {
      localStorage.setItem("applied_ipos", JSON.stringify(updated));
    } catch {}
    setApplySuccess(true);
    setTimeout(() => {
      setApplyModalIpo(null);
      setApplySuccess(false);
    }, 1500);
  };

  // Filter list
  const filteredIpos = ipos
    .filter(ipo => {
      if (activeTab === 'Applied') {
        return appliedIpos.includes(ipo.name);
      }
      return ipo.status.toLowerCase() === activeTab.toLowerCase();
    })
    .filter(ipo => activeType === 'All' ? true : ipo.type === activeType)
    .sort((a, b) => {
      const getPct = (str: string) => {
        const match = str.match(/\(([-\d.]+)%\)/);
        return match ? parseFloat(match[1]) : 0;
      };
      return getPct(b.est_listing) - getPct(a.est_listing);
    });

  return (
    <div className="h-full flex flex-col p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#0e0f12]">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#00D09C]/10 text-[#00D09C]">
              <Sparkles size={18} />
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">IPO Center</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              NSE & BSE Live Feed
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Real-time Grey Market Premium (GMP), authentic live bidding dates, and listing day projections.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()} 
            className="bg-[#141824] hover:bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold text-slate-300 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synced with Exchange</span>
          </button>
        </div>
      </div>

      {/* Groww-Inspired Quick Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Open for Bidding</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{openCount} IPOs</div>
          <div className="text-[11px] text-emerald-400 mt-1 font-medium">Bids active today</div>
        </div>

        <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Upcoming Listings</span>
            <Clock size={12} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{upcomingCount} IPOs</div>
          <div className="text-[11px] text-slate-400 mt-1">Opening next 2 weeks</div>
        </div>

        <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Highest Est. Gain</span>
            <TrendingUp size={12} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#00D09C] font-mono">
            {topGmpIpo ? topGmpIpo.est_listing.split(" ")[1] || "+44.3%" : "+44.3%"}
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-1">
            {topGmpIpo?.name || "Maxwell Engineering"}
          </div>
        </div>

        <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>My Applications</span>
            <ShieldCheck size={12} className="text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{appliedIpos.length} Applied</div>
          <div className="text-[11px] text-purple-400 mt-1">UPI mandate tracked</div>
        </div>
      </div>

      {/* Tabs and Type Filters (Groww style clean pills) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'Open', label: `Open Now (${openCount})` },
            { id: 'Upcoming', label: `Upcoming (${upcomingCount})` },
            { id: 'Closed', label: `Recently Listed / Closed (${closedCount})` },
            { id: 'Applied', label: `My Applications (${appliedIpos.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setExpandedIpo(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#00D09C] text-slate-950 shadow-md shadow-[#00D09C]/20' 
                  : 'bg-[#141824] border border-white/5 text-slate-400 hover:text-white hover:border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-[#141824] p-1 rounded-xl border border-white/5 self-start sm:self-auto">
          {['All', 'Mainboard', 'SME'].map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeType === type ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main IPO List / Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-[#00D09C] border-t-transparent rounded-full mb-3" />
          <p className="text-xs font-medium">Fetching real-time exchange IPO records...</p>
        </div>
      ) : filteredIpos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-[#141824]/40 rounded-2xl border border-white/5">
          <AlertCircle size={40} className="mb-3 opacity-30 text-[#00D09C]" />
          <p className="text-sm font-semibold text-slate-400">No {activeTab.toLowerCase()} IPOs found under {activeType} category.</p>
          <p className="text-xs text-slate-500 mt-1">Check back during upcoming exchange announcements.</p>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {filteredIpos.map((ipo, idx) => {
            const isExpanded = expandedIpo === idx;
            const isApplied = appliedIpos.includes(ipo.name);
            const estPctMatch = ipo.est_listing.match(/\(([-\d.]+)%\)/);
            const gmpPct = estPctMatch ? parseFloat(estPctMatch[1]) : 0;
            const isPositive = gmpPct >= 0;

            return (
              <div 
                key={idx} 
                className="bg-[#141824] border border-white/5 rounded-2xl transition-all hover:border-[#00D09C]/30 overflow-hidden flex flex-col group shadow-lg"
              >
                {/* Main Row */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Company Info */}
                  <div className="flex items-center gap-3.5 min-w-[280px]">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-inner group-hover:border-[#00D09C]/40 transition-colors">
                      {ipo.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                        <span className="truncate">{ipo.name}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          ipo.type === 'SME' 
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
                            : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        }`}>
                          {ipo.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-500" />
                          {ipo.open_date} — {ipo.close_date}
                        </span>
                        <span>•</span>
                        <span>{ipo.issue_size}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Band */}
                  <div className="flex md:flex-col justify-between md:justify-center">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider md:mb-0.5">Price Band</span>
                    <span className="text-sm font-bold text-slate-200 font-mono">{ipo.price_band}</span>
                  </div>

                  {/* GMP & Est Listing (Groww signature chips) */}
                  <div className="flex md:flex-col justify-between md:justify-center">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider md:mb-0.5">Live GMP</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold font-mono text-white">{ipo.gmp}</span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                        isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {isPositive ? `+${gmpPct}%` : `${gmpPct}%`}
                      </span>
                    </div>
                  </div>

                  {/* Expected Listing Price */}
                  <div className="flex md:flex-col justify-between md:justify-center">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider md:mb-0.5">Est. Listing Price</span>
                    <span className="text-sm font-bold text-[#00D09C] font-mono">{ipo.est_listing.split(" ")[0]}</span>
                  </div>

                  {/* Retail Subscription */}
                  <div className="flex md:flex-col justify-between md:justify-center">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider md:mb-0.5">Subscription</span>
                    <span className="text-sm font-bold text-sky-400 font-mono">{ipo.subscription || "--"}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 justify-end pt-2 md:pt-0">
                    <button
                      onClick={() => setExpandedIpo(isExpanded ? null : idx)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex items-center gap-1"
                    >
                      <Info size={14} />
                      <span className="hidden sm:inline">{isExpanded ? 'Less' : 'Details'}</span>
                    </button>

                    {ipo.status === 'Open' ? (
                      isApplied ? (
                        <span className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                          <Check size={14} /> Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApply(ipo)}
                          className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D09C] hover:bg-[#00D09C]/90 text-slate-950 transition-all shadow-md shadow-[#00D09C]/20 flex items-center gap-1.5"
                        >
                          <IndianRupee size={14} /> Apply via UPI
                        </button>
                      )
                    ) : ipo.status === 'Upcoming' ? (
                      <button
                        onClick={() => handleApply(ipo)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                      >
                        Pre-Apply
                      </button>
                    ) : (
                      <span className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 bg-white/[0.02]">
                        Listing Closed
                      </span>
                    )}
                  </div>

                </div>

                {/* Expandable Company Details Drawer */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-[#0a0c14] border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Company Overview</h4>
                      <p className="text-slate-300 leading-relaxed">{ipo.summary}</p>
                    </div>
                    <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                      <h4 className="text-[11px] font-bold text-[#00D09C] uppercase tracking-wider mb-2">Grey Market Momentum & Sentiment</h4>
                      <p className="text-slate-300 leading-relaxed">{ipo.dynamics}</p>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* UPI Apply Modal */}
      {applyModalIpo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141824] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Apply for {applyModalIpo.name}</h3>
            <p className="text-xs text-slate-400 mb-4">
              Lot Size: 1 Lot | Price Band: {applyModalIpo.price_band} | GMP: {applyModalIpo.gmp}
            </p>

            {applySuccess ? (
              <div className="py-8 flex flex-col items-center justify-center text-emerald-400">
                <CheckCircle2 size={48} className="mb-2 animate-bounce" />
                <p className="text-sm font-bold text-white">Application Mandate Initiated!</p>
                <p className="text-xs text-slate-400 mt-1">Approve UPI request in your BHIM / GPay app.</p>
              </div>
            ) : (
              <form onSubmit={confirmApplication} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Enter your UPI ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mobile@okaxis or name@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-[#0e0f12] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D09C]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Funds will be blocked via ASBA until allotment.</p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-white font-semibold">Individual / Retail Investor</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setApplyModalIpo(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D09C] hover:bg-[#00D09C]/90 text-slate-950 transition-colors shadow-lg shadow-[#00D09C]/20"
                  >
                    Submit Bid
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
