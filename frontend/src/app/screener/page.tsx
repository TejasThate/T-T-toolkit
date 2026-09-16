"use client";

import React, { useState } from "react";
import { Search, Loader2, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ScreenerPage() {
  const { token } = useAuthStore();
  const [symbol, setSymbol] = useState("AAPL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSymbol(searchQuery.toUpperCase().trim());
      setSearchQuery("");
    }
  };

  const { data: prediction, isLoading, isError, error } = useQuery({
    queryKey: ['prediction', symbol],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/predict/${symbol}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Prediction failed');
      }
      return res.json();
    },
    enabled: !!token && !!symbol,
    retry: false
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <Search size={20} className="text-[#38BDF8]" />
          AI Screener
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <section className="bg-[#141824] border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-200 mb-4">Stock Prediction Engine</h2>
            <p className="text-sm text-slate-400 mb-6">
              Enter a stock ticker (e.g., AAPL, RELIANCE.NS) to run an on-the-fly XGBoost ML model prediction for tomorrow's closing price.
            </p>
            
            <form onSubmit={handleSearch} className="flex gap-4">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Ticker Symbol..." 
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="bg-[#38BDF8] text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#38BDF8]/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Predict
              </button>
            </form>
          </section>

          {isError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-6 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="font-bold mb-1">Prediction Failed</h3>
                <p className="text-sm opacity-90">{error?.message || "Failed to run model."}</p>
              </div>
            </div>
          )}

          {prediction && !isLoading && !isError && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Main Prediction Card */}
                <div className="bg-[#141824] border border-[#38BDF8]/20 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#38BDF8] to-emerald-500" />
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-200">{prediction.symbol}</h2>
                      <p className="text-slate-400 text-sm">Tomorrow's Prediction</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1
                      ${prediction.sentiment === 'Bullish' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}
                    `}>
                      {prediction.sentiment === 'Bullish' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {prediction.sentiment}
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-4 mb-2">
                    <span className="text-4xl font-mono text-slate-200">
                      ${prediction.predicted_price?.toFixed(2)}
                    </span>
                    <span className={`text-lg font-mono mb-1
                      ${prediction.predicted_change_pct > 0 ? 'text-emerald-500' : 'text-red-500'}
                    `}>
                      {prediction.predicted_change_pct > 0 ? '+' : ''}{prediction.predicted_change_pct?.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">Current Price: ${prediction.current_price?.toFixed(2)}</p>
                </div>

                {/* Model Confidence */}
                <div className="bg-[#141824] border border-white/5 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#F59E0B]" />
                    Model Confidence
                  </h3>
                  <div className="flex items-end gap-3 mb-4">
                    <span className="text-3xl font-mono text-slate-200">{prediction.confidence_score}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div 
                      className="bg-[#F59E0B] h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${prediction.confidence_score}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                    Confidence is calculated inversely to recent rolling volatility. High volatility reduces prediction certainty.
                  </p>
                </div>

              </div>

              {/* Feature Importance Waterfall */}
              <div className="bg-[#141824] border border-white/5 rounded-2xl p-6">
                <h3 className="font-bold text-slate-300 mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Key Technical Drivers
                </h3>
                <div className="space-y-4">
                  {prediction.top_features?.map((feature: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="w-24 text-sm font-mono text-slate-400 text-right">{feature.feature}</span>
                      <div className="flex-1 bg-white/5 rounded-full h-3">
                        <div 
                          className="bg-[#38BDF8]/60 h-3 rounded-full" 
                          style={{ width: `${feature.importance * 100}%` }}
                        />
                      </div>
                      <span className="w-12 text-xs font-mono text-slate-500">{(feature.importance * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
