"use client";

import React, { useState } from "react";
import { ShieldCheck, IndianRupee, Clock, ArrowUpRight, Award, Search } from "lucide-react";

interface BondItem {
  id: string;
  name: string;
  type: "Sovereign (G-Sec)" | "SGB (Gold)" | "PSU Corporate" | "Tax Free";
  coupon: string;
  yield_pct: number;
  rating: string;
  price: number;
  face_value: number;
  maturity: string;
  interest_payment: string;
}

const BONDS_DATA: BondItem[] = [
  { id: "IN0020230085", name: "7.18% GS 2033 (10Y Benchmark GOI)", type: "Sovereign (G-Sec)", coupon: "7.18%", yield_pct: 6.94, rating: "SOVEREIGN", price: 101.45, face_value: 100, maturity: "Aug 2033", interest_payment: "Semi-Annual" },
  { id: "IN0020240019", name: "7.10% GS 2034 (New 10Y Benchmark)", type: "Sovereign (G-Sec)", coupon: "7.10%", yield_pct: 6.98, rating: "SOVEREIGN", price: 100.80, face_value: 100, maturity: "Apr 2034", interest_payment: "Semi-Annual" },
  { id: "SGB2028IX", name: "SGB 2028 Series IX (Sovereign Gold)", type: "SGB (Gold)", coupon: "2.50% + Gold", yield_pct: 12.80, rating: "SOVEREIGN", price: 7850.00, face_value: 5400, maturity: "Dec 2028", interest_payment: "Half-Yearly" },
  { id: "INE020B08DF6", name: "REC Ltd 7.75% 2029 (Navratna PSU)", type: "PSU Corporate", coupon: "7.75%", yield_pct: 7.42, rating: "CRISIL AAA", price: 101.20, face_value: 100, maturity: "Oct 2029", interest_payment: "Annual" },
  { id: "INE134E08MZ8", name: "PFC Ltd 7.68% 2030 (Maharatna PSU)", type: "PSU Corporate", coupon: "7.68%", yield_pct: 7.48, rating: "ICRA AAA", price: 100.90, face_value: 100, maturity: "Feb 2030", interest_payment: "Annual" },
  { id: "INE261F08DX9", name: "NABARD 7.55% 2028 (Govt Refinance)", type: "PSU Corporate", coupon: "7.55%", yield_pct: 7.35, rating: "CRISIL AAA", price: 100.65, face_value: 100, maturity: "May 2028", interest_payment: "Annual" },
  { id: "INE906B07DE2", name: "NHAI 7.39% Tax Free Bond 2031", type: "Tax Free", coupon: "7.39% Tax-Free", yield_pct: 5.45, rating: "CARE AAA", price: 114.50, face_value: 1000, maturity: "Jan 2031", interest_payment: "Annual" }
];

export default function BondsPage() {
  const [filter, setFilter] = useState<string>("All");

  const filtered = BONDS_DATA.filter(b => filter === "All" || b.type.includes(filter));

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <ShieldCheck size={20} className="text-emerald-400" />
          Government & Corporate Bonds
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Direct RBI Retail & NSE Debt Market
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            {["All", "Sovereign", "Gold", "PSU", "Tax Free"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  filter === cat 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                    : "bg-[#141824] text-slate-400 hover:text-white border border-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((bond) => (
              <div
                key={bond.id}
                className="bg-[#141824] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">{bond.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">{bond.rating}</span>
                      <span className="text-[10px] text-slate-400">ISIN: {bond.id}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/5">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Annual Yield (YTM)</div>
                    <div className="text-xl font-mono font-bold text-emerald-400">{bond.yield_pct.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Coupon Rate</div>
                    <div className="text-sm font-mono font-semibold text-white mt-1">{bond.coupon}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Maturity</div>
                    <div className="text-sm font-mono font-semibold text-slate-300 mt-1">{bond.maturity}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs text-slate-400">
                  <div>Price: <span className="text-white font-semibold font-mono">₹{bond.price.toFixed(2)}</span></div>
                  <div>Payout: <span className="text-slate-300 font-semibold">{bond.interest_payment}</span></div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

