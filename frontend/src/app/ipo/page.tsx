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
  const filteredIpos = ipos.filter(ipo => ipo.status.toLowerCase() === activeTab.toLowerCase());

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

        {/* Tabs */}
        <div className="flex gap-3 mb-8 border-b border-white/5 pb-4">
          {['Open', 'Closed', 'Upcoming', 'Applied'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab 
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'bg-[#141824] border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredIpos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Info size={48} className="mb-4 opacity-20" />
            <p>No {activeTab.toLowerCase()} IPOs found at the moment.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <div className="w-1/4">Company</div>
              <div className="w-1/4">Closing Date & Price</div>
              <div className="w-1/6">Current GMP</div>
              <div className="w-1/6">Est. Listing</div>
              <div className="w-1/6 text-right pr-2">Action</div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-3 pb-20">
              {filteredIpos.map((ipo, idx) => (
                <div key={idx} className="bg-[#141824] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-white/10 transition-colors group">
                  
                  {/* Company */}
                  <div className="w-1/4 flex gap-4 items-center pr-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                      {ipo.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-200 flex items-center gap-2 truncate">
                        {ipo.name}
                        {ipo.type === 'SME' && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase shrink-0">SME</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5" title={ipo.summary}>{ipo.summary}</div>
                    </div>
                  </div>

                  {/* Dates & Price */}
                  <div className="w-1/4 pr-4">
                    <div className="text-sm font-medium text-slate-300">{ipo.close_date}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{ipo.price_band}</div>
                  </div>

                  {/* GMP */}
                  <div className="w-1/6 pr-4">
                    <div className="text-sm font-bold text-indigo-400">{ipo.gmp}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Premium</div>
                  </div>

                  {/* Est Listing */}
                  <div className="w-1/6 pr-4">
                    <div className="text-sm font-bold text-emerald-400">{ipo.est_listing}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Expected</div>
                  </div>

                  {/* Action */}
                  <div className="w-1/6 flex justify-end">
                    {ipo.status === 'Open' ? (
                      <button className="px-6 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors text-sm font-bold rounded-lg w-full max-w-[120px]">
                        Apply
                      </button>
                    ) : ipo.status === 'Upcoming' ? (
                      <button className="px-6 py-2 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold rounded-lg w-full max-w-[120px]">
                        Pre-apply
                      </button>
                    ) : (
                      <button disabled className="px-6 py-2 bg-black/20 text-slate-600 text-sm font-bold rounded-lg w-full max-w-[120px] cursor-not-allowed border border-white/5">
                        Closed
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
