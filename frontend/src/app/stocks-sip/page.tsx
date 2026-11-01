"use client";

import React, { useState } from "react";
import { Terminal, ShieldCheck, CheckCircle2, IndianRupee, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface SIPBasket {
  id: string;
  name: string;
  tagline: string;
  risk: "Low" | "Moderate" | "High";
  cagr: string;
  min_sip: number;
  stocks: { symbol: string; weight: string }[];
  description: string;
}

const SIP_BASKETS: SIPBasket[] = [
  {
    id: "bluechips",
    name: "Bluechip Compounders",
    tagline: "India's bedrock monopolies with consistent dividend & capital growth",
    risk: "Low",
    cagr: "16.8% CAGR (5Y)",
    min_sip: 5000,
    stocks: [
      { symbol: "RELIANCE", weight: "25%" },
      { symbol: "TCS", weight: "20%" },
      { symbol: "HDFCBANK", weight: "25%" },
      { symbol: "BHARTIARTL", weight: "15%" },
      { symbol: "LT", weight: "15%" }
    ],
    description: "Built for long-term wealth compounding with lowest maximum drawdown during market corrections."
  },
  {
    id: "defense",
    name: "Defense & Strategic CapEx",
    tagline: "Capitalizing on indigenous procurement & record order books",
    risk: "Moderate",
    cagr: "34.2% CAGR (3Y)",
    min_sip: 8000,
    stocks: [
      { symbol: "BEL", weight: "30%" },
      { symbol: "HAL", weight: "30%" },
      { symbol: "MAZDOCK", weight: "25%" },
      { symbol: "BHEL", weight: "15%" }
    ],
    description: "Multi-year visibility driven by MoD indigenization mandates and export approvals."
  },
  {
    id: "digital-consumer",
    name: "Digital Consumer & New India",
    tagline: "High-growth consumer discretionary and scalable internet platforms",
    risk: "High",
    cagr: "28.5% CAGR (3Y)",
    min_sip: 6000,
    stocks: [
      { symbol: "ZOMATO", weight: "35%" },
      { symbol: "TRENT", weight: "35%" },
      { symbol: "DIXON", weight: "20%" },
      { symbol: "SWIGGY", weight: "10%" }
    ],
    description: "Fastest-growing revenue engines riding India's consumption boom and quick-commerce revolution."
  },
  {
    id: "green-energy",
    name: "Clean Energy & Renewable Transition",
    tagline: "Powering India's 500GW renewable target by 2030",
    risk: "High",
    cagr: "24.6% CAGR (3Y)",
    min_sip: 5000,
    stocks: [
      { symbol: "SUZLON", weight: "30%" },
      { symbol: "NTPC", weight: "30%" },
      { symbol: "TATAPOWER", weight: "25%" },
      { symbol: "IREDA", weight: "15%" }
    ],
    description: "Comprehensive exposure across wind turbine manufacturing, solar parks, and green financing."
  }
];

export default function StocksSIPPage() {
  const [selectedBasket, setSelectedBasket] = useState<SIPBasket | null>(null);

  const startSIP = (basket: SIPBasket) => {
    toast.success(`SIP Schedule created for ${basket.name} (₹${basket.min_sip.toLocaleString('en-IN')}/mo)`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <Terminal size={20} className="text-[#6C5CE7]" />
          Curated Indian Stocks SIP Baskets
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles size={14} className="text-yellow-400" />
          Automated Monthly Wealth Compounding
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SIP_BASKETS.map((basket) => (
              <div
                key={basket.id}
                className="bg-[#141824] border border-white/5 rounded-2xl p-6 hover:border-[#6C5CE7]/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">{basket.name}</h2>
                      <p className="text-xs text-slate-400 mt-1">{basket.tagline}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      basket.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      basket.risk === 'Moderate' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {basket.risk} Risk
                    </span>
                  </div>

                  <div className="flex items-baseline gap-4 my-4 py-3 border-y border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Historical CAGR</div>
                      <div className="text-lg font-mono font-bold text-emerald-400">{basket.cagr}</div>
                    </div>
                    <div className="border-l border-white/5 pl-4">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Min Monthly SIP</div>
                      <div className="text-lg font-mono font-bold text-white">₹{basket.min_sip.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Constituents & Weighting</div>
                    <div className="flex flex-wrap gap-2">
                      {basket.stocks.map((s) => (
                        <span key={s.symbol} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-slate-200">
                          <strong className="text-white">{s.symbol}</strong> ({s.weight})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => startSIP(basket)}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] hover:opacity-95 text-white font-semibold text-sm shadow-lg shadow-[#6C5CE7]/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Start Monthly SIP</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
