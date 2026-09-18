"use client";

import React, { useState } from "react";
import { Loader2, ArrowUpRight, ArrowDownRight, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ScreenerPage() {
  const { token } = useAuthStore();
  const [filter, setFilter] = useState("ALL"); // ALL, Bullish, Bearish

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['screenerSignals'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/screener/signals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch screener signals');
      }
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 mins
  });

  const signals = data?.signals || [];
  
  const filteredSignals = signals.filter((s: { direction: string }) => {
    if (filter === "ALL") return true;
    return s.direction === filter;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20 justify-between">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <Activity size={20} className="text-[#38BDF8]" />
          Technical Screener
        </h1>
        <div className="flex gap-2">
          {["ALL", "Bullish", "Bearish"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                filter === f 
                  ? f === 'Bullish' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : f === 'Bearish' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/30'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <section className="bg-[#141824] border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-200 mb-2">Algorithmic Signals</h2>
            <p className="text-sm text-slate-400 mb-6">
              Deterministic technical indicators computed daily based on historical OHLCV data. 
              Pure math, zero AI hallucination.
            </p>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8]" />
              </div>
            ) : isError ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-6 flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h3 className="font-bold mb-1">Signal Fetch Failed</h3>
                  <p className="text-sm opacity-90">{error?.message}</p>
                </div>
              </div>
            ) : filteredSignals.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                <p className="text-slate-500">No active {filter !== "ALL" ? filter.toLowerCase() : ""} signals detected for the current watchlist.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {filteredSignals.map((signal: { id: number, symbol: string, signal_type: string, direction: string, confidence: number, target_price?: number, stop_loss?: number }) => (
                  <div key={signal.id} className="bg-black/20 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-200 group-hover:text-[#38BDF8] transition-colors">{signal.symbol}</h3>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">{signal.signal_type}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1
                        ${signal.direction === 'Bullish' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}
                      `}>
                        {signal.direction === 'Bullish' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {signal.direction}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <ShieldCheck size={16} className={signal.direction === 'Bullish' ? 'text-emerald-500' : 'text-red-500'} />
                      <span>Confidence: {signal.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
