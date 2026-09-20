"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock, Info, ShieldCheck, IndianRupee } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IPOData {
  name: string;
  type: string;
  price_band: string;
  issue_size: string;
  status: string;
  open_date: string;
  close_date: string;
  gmp: string;
  est_listing: string;
  dynamics: string;
  summary: string;
  subscription: string;
}

export default function IPOPage() {
  const [activeTab, setActiveTab] = React.useState('Open');
  
  const { data: ipoData, isLoading } = useQuery<{ ipos: IPOData[] }>({
    queryKey: ['ipos'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/market/ipos`);
      if (!res.ok) throw new Error('Failed to fetch IPOs');
      return res.json();
    },
    refetchInterval: 60 * 1000 // Refresh every minute
  });

  const ipos = ipoData?.ipos || [];
  
  // Sort by highest expected listing gain (proxy for subscription demand)
  const sortedIpos = ipos
    .filter(ipo => ipo.status.toLowerCase() === activeTab.toLowerCase())
    .filter(ipo => activeType === 'All' ? true : ipo.type === activeType)
    .sort((a, b) => {
      const getPct = (str: string) => {
        const match = str.match(/\(([-\d.]+)%\)/);
        return match ? parseFloat(match[1]) : 0;
      };
      return getPct(b.est_listing) - getPct(a.est_listing);
    });

  return (
    <>
      <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">IPO Dashboard</h1>
            <p className="text-slate-400">Live Grey Market Premium (GMP) & Expected Listing Gains</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[#141824] border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-300">Live Data Sync</span>
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div className="flex gap-3">
            {['Open', 'Closed', 'Upcoming', 'Applied'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setExpandedIpo(null); }}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'bg-[#141824] border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex bg-[#141824] rounded-lg p-1 border border-white/5">
            {['All', 'Mainboard', 'SME'].map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeType === type ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : sortedIpos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Info size={48} className="mb-4 opacity-20" />
            <p>No {activeTab.toLowerCase()} IPOs found for {activeType} category.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <div className="w-[25%]">Company</div>
              <div className="w-[15%]">Dates & Price</div>
              <div className="w-[15%]">Retail Subscription</div>
              <div className="w-[15%]">Current GMP</div>
              <div className="w-[15%]">Est. Listing</div>
              <div className="w-[15%] text-right pr-2">Action</div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-3 pb-20">
              {sortedIpos.map((ipo, idx) => {
                const estPctMatch = ipo.est_listing.match(/\(([-\d.]+)%\)/);
                const gmpPct = estPctMatch ? estPctMatch[1] : "0";
                const isExpanded = expandedIpo === idx;
                
                return (
                <div key={idx} className="bg-[#141824] border border-white/5 rounded-xl transition-all hover:border-indigo-500/30 overflow-hidden flex flex-col group">
                  <div className="p-4 flex items-center justify-between">
                    
                    {/* Company */}
                    <div className="w-[25%] flex gap-4 items-center pr-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 flex items-center justify-center text-white font-bold shrink-0">
                        {ipo.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white flex items-center gap-2 truncate">
                          {ipo.name}
                          {ipo.type === 'SME' && (
                            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded uppercase shrink-0">SME</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5" title={ipo.type}>{ipo.type} IPO</div>
                      </div>
                    </div>

                    {/* Dates & Price */}
                    <div className="w-[15%] pr-4">
                      <div className="text-sm font-medium text-slate-200">{ipo.close_date}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{ipo.price_band}</div>
                    </div>

                    {/* Subscription */}
                    <div className="w-[15%] pr-4">
                      <div className="text-sm font-bold text-sky-400">{ipo.subscription || "--"}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Retail Sub</div>
                    </div>

                    {/* GMP */}
                    <div className="w-[15%] pr-4">
                      <div className="text-sm font-bold text-indigo-400">{ipo.gmp} <span className="text-xs font-medium text-indigo-500/70">({gmpPct}%)</span></div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Premium</div>
                    </div>

                    {/* Est Listing */}
                    <div className="w-[15%] pr-4">
                      <div className="text-sm font-bold text-emerald-400">{ipo.est_listing}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Expected</div>
                    </div>

                    {/* Action */}
                    <div className="w-[15%] flex justify-end">
                      <button 
                        onClick={() => setExpandedIpo(isExpanded ? null : idx)}
                        className={`px-5 py-2 flex gap-2 items-center justify-center transition-colors text-xs font-semibold rounded-lg w-full max-w-[140px] ${
                          isExpanded ? 'bg-indigo-500 text-white' : 'bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-indigo-200 border border-white/10'
                        }`}
                      >
                        <Info size={14} />
                        {isExpanded ? 'Hide Details' : 'Summary & News'}
                      </button>
                    </div>

                  </div>
                  
                  {/* Expandable Section */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-[#0a0c14] border-t border-white/5 flex flex-col gap-4">
                      <div className="flex gap-4">
                        <div className="w-1/2 bg-white/5 rounded-lg p-4">
                          <h4 className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2">Company Summary</h4>
                          <p className="text-sm text-slate-300 leading-relaxed">{ipo.summary}</p>
                        </div>
                        <div className="w-1/2 bg-white/5 rounded-lg p-4">
                          <h4 className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">Market Dynamics & Sentinel</h4>
                          <p className="text-sm text-slate-300 leading-relaxed">{ipo.dynamics}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-2">
                        {ipo.status === 'Open' ? (
                           <button className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-600 transition-colors">Apply Now</button>
                        ) : ipo.status === 'Upcoming' ? (
                           <button className="px-6 py-2 bg-white/10 text-white font-bold text-sm rounded-lg hover:bg-white/20 transition-colors border border-white/10">Pre-apply</button>
                        ) : null}
                      </div>
                    </div>
                  )}

                </div>
              )})}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
