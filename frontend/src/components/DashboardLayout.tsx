"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "sonner";
import { Bot, Terminal, TrendingUp, Filter, Newspaper, Bell, LayoutDashboard, Brain, PieChart, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import { useMarketDataSync } from "../hooks/useMarketDataSync";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuthStore();
  const pathname = usePathname();

  // Auth Query
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['authMe'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) logout();
        throw new Error('Not authenticated');
      }
      return res.json();
    },
    enabled: !!token,
    retry: false
  });

  // Portfolio Query
  const { data: portfolioData = [], refetch: refetchPortfolio } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token
  });

  // Market Data Hook (WebSocket)
  const { data: marketRes, isFetching: marketLoading } = useMarketDataSync();
  const marketData = marketRes || {};
  const topGainers = marketRes?.gainers || [];
  const gainersLoading = marketLoading;

  // AI Forecast Query
  const { data: aiForecast, isFetching: forecastLoading } = useQuery({
    queryKey: ['aiForecast'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/ai/forecast`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Forecast fetch failed');
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 5 * 60 * 1000 
  });

  // Market Data Hook is already defined above
  let totalPortfolioValue = 0;
  let overallPnl = 0;
  
  if (portfolioData.length > 0) {
    portfolioData.forEach((h: any) => {
      const liveData = marketData[h.symbol + ".NS"]; // Assuming Indian stocks
      const livePrice = liveData?.price || h.average_price;
      const currentValue = h.quantity * livePrice;
      const investedValue = h.quantity * h.average_price;
      
      totalPortfolioValue += currentValue;
      overallPnl += (currentValue - investedValue);
    });
  }

  const navItems = [
    { name: "Terminal AI", icon: <Terminal size={18} />, path: "/" },
    { name: "Market Trends", icon: <TrendingUp size={18} />, path: "/trends" },
    { name: "Screener", icon: <Filter size={18} />, path: "/screener" },
    { name: "Top News", icon: <Newspaper size={18} />, path: "/news" },
    { name: "Alerts", icon: <Bell size={18} />, path: "/alerts" },
    { name: "Portfolio", icon: <LayoutDashboard size={18} />, path: "/portfolio" },
  ];

  return (
    <div className="flex h-screen bg-[#0e0f12] text-slate-200 overflow-hidden font-sans relative">
      {/* LEFT SIDEBAR (Nav) */}
      <aside className="w-[260px] flex-shrink-0 border-r border-white/5 bg-[#0e0f12]/80 backdrop-blur-xl flex flex-col z-10 hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <BrandLogo size="sm" />
          <span className="font-bold text-lg tracking-tight">T&T Toolkit</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu</div>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-[#6C5CE7]/10 text-[#6C5CE7]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between px-2 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6C5CE7] to-[#A29BFE] flex items-center justify-center text-white font-bold text-xs">
                {userProfile?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">{userProfile?.email || "User"}</span>
                <span className="text-[10px] text-slate-500">Pro Plan</span>
              </div>
            </div>
          </div>
          <button onClick={logout} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300">
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 bg-black/20">
        {children}
      </main>

      {/* RIGHT SIDEBAR (Widgets) */}
      <aside className="w-[320px] flex-shrink-0 border-l border-white/5 bg-[#0e0f12]/80 backdrop-blur-xl flex flex-col z-10 hidden lg:flex">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-slate-200">Dashboard</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono text-emerald-500">SYSTEM ONLINE</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
          
          {/* Portfolio Overview */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={16} className="text-[#6C5CE7]" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Portfolio Overview</h3>
            </div>
            
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#6C5CE7]/10 rounded-full blur-2xl"></div>
              
              <div className="flex flex-col gap-1 mb-5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Value</div>
                <div className="text-2xl font-mono font-bold text-white tracking-tight">
                  ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div className="flex flex-col gap-1 mb-5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Overall P&L</div>
                <div className={`text-sm font-mono font-bold flex items-center gap-1 ${overallPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {overallPnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  ₹{Math.abs(overallPnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>

              {portfolioData.length > 0 && (
                <div className="mb-5 space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">My Holdings</div>
                  {portfolioData.map((h: any) => (
                    <div key={h.symbol} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">{h.symbol}</span>
                      <span className="font-mono text-slate-400">{h.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => window.location.href = `${API_BASE}/api/broker/login?provider=upstox`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 transition-colors text-sm font-medium text-[#8B5CF6]"
              >
                <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">U</span>
                </div>
                Connect Upstox
              </button>
            </div>
          </section>

          {/* AI Engine Forecast Widget */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 text-purple-400">AI Engine Forecast</h3>
              {forecastLoading ? <Loader2 className="w-3 h-3 animate-spin text-slate-500" /> : <Bot size={14} className="text-purple-400" />}
            </div>
            <div className="bg-[#141824] border border-purple-500/10 rounded-xl p-4 group hover:border-purple-500/30 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
              
              <div className="relative z-10 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {aiForecast?.forecast || "Waiting for market data to generate forecast..."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Market Overview */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Live Markets</h3>
              {marketLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
            </div>
            
            <div className="space-y-3">
              {Object.keys(marketData).length > 0 ? (
                Object.entries(marketData).map(([symbol, item]: [string, any]) => {
                  const isUp = item.change_pct >= 0;
                  return (
                    <div key={symbol} className="bg-[#141824] border border-white/5 rounded-xl p-3 flex justify-between items-center group hover:border-white/10 transition-colors">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{symbol.replace('.NS', '').replace('^', '')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-slate-200">{item.price?.toFixed(2)}</div>
                        <div className={`text-xs font-mono font-medium flex items-center justify-end gap-1 ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                          {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {Math.abs(item.change_pct || 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-xs text-slate-500 text-center py-4 bg-[#141824] rounded-xl border border-white/5">
                  Fetching live data...
                </div>
              )}
            </div>
          </section>

          {/* Top Gainers Widget */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 text-[#22C55E]">Top Gainers</h3>
              {gainersLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
            </div>
            
            <div className="space-y-3">
              {topGainers.length > 0 ? (
                topGainers.map((item: any) => {
                  return (
                    <div key={item.symbol} className="bg-[#141824] border border-[#22C55E]/10 rounded-xl p-3 flex justify-between items-center group hover:border-[#22C55E]/30 transition-colors">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{item.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-slate-200">{item.price?.toFixed(2)}</div>
                        <div className="text-xs font-mono font-medium flex items-center justify-end gap-1 text-[#22C55E]">
                          <ArrowUpRight size={12} />
                          {item.change_pct?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-xs text-slate-500 text-center py-4 bg-[#141824] rounded-xl border border-white/5">
                  Fetching top gainers...
                </div>
              )}
            </div>
          </section>

        </div>
      </aside>

    </div>
  );
}
