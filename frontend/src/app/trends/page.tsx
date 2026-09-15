"use client";

import React from "react";
import { TrendingUp, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MarketTrendsPage() {
  const { token } = useAuthStore();

  const { data: gainers = [], isLoading: gainersLoading } = useQuery({
    queryKey: ['topGainersFull'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/market/top-gainers?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Top gainers fetch failed');
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 60 * 1000
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <TrendingUp size={20} className="text-[#F59E0B]" />
          Market Trends
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-slate-200 mb-4">Top Gainers (NSE)</h2>
            <p className="text-sm text-slate-400 mb-6">Real-time top performing stocks in the NIFTY 50 index.</p>
            
            {gainersLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
              </div>
            ) : gainers.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                Failed to fetch market trends. Market might be closed.
              </div>
            ) : (
              <div className="bg-[#141824] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                      <th className="p-4 font-semibold">Symbol</th>
                      <th className="p-4 font-semibold">Price</th>
                      <th className="p-4 font-semibold">Change</th>
                      <th className="p-4 font-semibold">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {gainers.map((g: any) => (
                      <tr key={g.symbol} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-slate-200">{g.symbol}</span>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          ₹{g.price?.toFixed(2)}
                        </td>
                        <td className="p-4 font-mono text-emerald-500">
                          +{g.change?.toFixed(2)}
                        </td>
                        <td className="p-4">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 font-mono text-sm font-bold">
                            <ArrowUpRight size={14} />
                            {g.change_pct?.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
