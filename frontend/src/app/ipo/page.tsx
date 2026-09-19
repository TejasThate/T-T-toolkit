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

  return (
    <>
      <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">IPO Tracker (India)</h1>
            <p className="text-slate-400">Live Grey Market Premium (GMP) & Expected Listing Gains</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[#141824] border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-300">Live Data Sync</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 pb-20">
            {ipos.map((ipo, idx) => (
              <div key={idx} className="bg-[#141824] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                      {ipo.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        {ipo.name}
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/10 text-slate-300">
                          {ipo.type}
                        </span>
                      </h3>
                      <p className="text-sm text-slate-400 max-w-xl">{ipo.summary}</p>
                    </div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5
                    ${ipo.status === 'Open' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      ipo.status === 'Upcoming' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'}
                  `}>
                    <Clock size={14} />
                    {ipo.status}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <IndianRupee size={16} />
                      <span className="text-xs uppercase tracking-wider font-semibold">Price Band</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-white">{ipo.price_band}</div>
                    <div className="text-xs text-slate-500 mt-1">Issue Size: {ipo.issue_size}</div>
                  </div>

                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Clock size={16} />
                      <span className="text-xs uppercase tracking-wider font-semibold">Subscription</span>
                    </div>
                    <div className="text-sm font-medium text-white">{ipo.open_date}</div>
                    <div className="text-xs text-slate-500 mt-1">To {ipo.close_date}</div>
                  </div>

                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                      <ArrowUpRight size={16} />
                      <span className="text-xs uppercase tracking-wider font-semibold">Current GMP</span>
                    </div>
                    <div className="text-xl font-mono font-bold text-indigo-400">{ipo.gmp}</div>
                    <div className="text-xs text-slate-500 mt-1">Subject to change</div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-4 border border-emerald-500/20 relative overflow-hidden">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2 relative z-10">
                      <ShieldCheck size={16} />
                      <span className="text-xs uppercase tracking-wider font-semibold">Est. Listing</span>
                    </div>
                    <div className="text-xl font-mono font-bold text-emerald-400 relative z-10">{ipo.est_listing}</div>
                  </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-3">
                  <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">Company Dynamics & Market Sentiment</h4>
                    <p className="text-sm text-slate-400">{ipo.dynamics}</p>
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
