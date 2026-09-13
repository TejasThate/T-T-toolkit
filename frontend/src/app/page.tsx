/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AmbientBackground from "@/components/AmbientBackground";
import { LayoutDashboard, Briefcase, TrendingUp, Filter, Bell, Newspaper, MessageSquare, ChevronDown, LogOut, Loader2, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useMarketDataSync } from "@/hooks/useMarketDataSync";
import { usePortfolioStore } from "@/store/usePortfolioStore";

const API_BASE = "/api";

export default function Page() {
  const [started, setStarted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Check auth
    const t = localStorage.getItem("token");
    setToken(t);
  }, []);

  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const setHoldings = usePortfolioStore(state => state.setHoldings);
  
  // Market Data Hook
  const { data: marketRes, isFetching: marketLoading } = useMarketDataSync();
  const marketData = marketRes?.data || {};

  // News Query
  const { data: news = [] } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/news`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('News fetch failed');
      return res.json();
    },
    enabled: !!token && started
  });

  // Portfolio Query
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Portfolio fetch failed');
      return res.json();
    },
    enabled: !!token && started
  });

  useEffect(() => {
    if (portfolioData) {
      setHoldings(portfolioData);
    }
  }, [portfolioData, setHoldings]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  const submitMessage = async (message: string) => {
    if (!message.trim() || isChatLoading) return;
    
    setChatHistory(prev => [...prev, { role: "user", content: message }]);
    setIsChatLoading(true);

    try {
      const token = localStorage.getItem("token") || "dummy_token";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: message }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: "assistant", content: data.reply || "No response received." }]);
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", content: "Error communicating with AI backend. Please check if the server is running." }]);
      }
    } catch (err) {
      console.error("Chat error", err);
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, an error occurred while connecting to the AI backend. It might be offline." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const msg = chatQuery;
    setChatQuery("");
    await submitMessage(msg);
  };

  const sendQuickAction = (action: string) => {
    submitMessage(action);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-[#0e0f12] flex flex-col justify-center items-center text-slate-100 p-8 relative overflow-hidden">
        <div className="z-10 max-w-md text-center space-y-8">
          <div className="flex justify-center mb-4">
            {/* Custom SVG Logo */}
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="10" width="35" height="15" rx="4" fill="#6C5CE7" />
              <rect x="20" y="25" width="15" height="40" rx="4" fill="#6C5CE7" />
              <rect x="55" y="35" width="35" height="15" rx="4" fill="#6C5CE7" fillOpacity="0.7" />
              <rect x="65" y="50" width="15" height="40" rx="4" fill="#6C5CE7" fillOpacity="0.7" />
              <circle cx="50" cy="50" r="40" stroke="white" strokeOpacity="0.1" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-white">T&T Toolkit</span>
          </h1>
          <p className="text-slate-400 text-lg">Adaptive Trading Intelligence</p>
          <Button 
            onClick={() => setStarted(true)}
            className="w-full h-14 rounded-xl bg-[#6C5CE7] hover:bg-[#5a4cd1] text-white font-bold text-lg shadow-[0_0_20px_rgba(108,92,231,0.3)] transition-all"
          >
            Launch Terminal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0e0f12] text-slate-200 overflow-hidden font-sans relative">
      <AmbientBackground />
      
      {/* LEFT SIDEBAR (Nav) */}
      <aside className="w-[260px] flex-shrink-0 border-r border-white/5 bg-[#0e0f12]/80 backdrop-blur-xl flex flex-col z-10 hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="10" width="35" height="15" rx="4" fill="#6C5CE7" />
            <rect x="20" y="25" width="15" height="40" rx="4" fill="#6C5CE7" />
            <rect x="55" y="35" width="35" height="15" rx="4" fill="#6C5CE7" fillOpacity="0.7" />
            <rect x="65" y="50" width="15" height="40" rx="4" fill="#6C5CE7" fillOpacity="0.7" />
          </svg>
          <span className="font-bold text-lg tracking-tight">T&T Toolkit</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu</div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#6C5CE7]/10 text-[#6C5CE7] font-medium transition-colors">
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            <MessageSquare size={18} /> Terminal AI
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            <Briefcase size={18} /> Portfolio
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            <TrendingUp size={18} /> Market Trends
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            <Filter size={18} /> Screener
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            <Newspaper size={18} /> Top News
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors relative">
            <Bell size={18} /> Alerts
            <span className="absolute right-2 w-2 h-2 rounded-full bg-[#EF4444]"></span>
          </button>
          
          <div className="mt-8">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Recent Chats</div>
            <button className="w-full text-left text-sm text-slate-400 hover:text-slate-200 truncate px-3 py-1.5 transition-colors">
              Portfolio review - Sept
            </button>
            <button className="w-full text-left text-sm text-slate-400 hover:text-slate-200 truncate px-3 py-1.5 transition-colors">
              HDFC Bank earnings...
            </button>
          </div>
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={handleLogout}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs">
                PRO
              </div>
              <div>
                <p className="text-sm font-medium">T&T Account</p>
                <p className="text-xs text-slate-500">Pro Plan Active</p>
              </div>
            </div>
            <LogOut size={16} className="text-slate-500" />
          </div>
        </div>
      </aside>

      {/* CENTER CONTENT (Main AI Chat) */}
      <main className="flex-1 flex flex-col z-10 bg-[#0e0f12] relative min-w-0">
        <header className="h-[73px] flex-shrink-0 flex items-center px-8 border-b border-white/5">
          <h2 className="text-sm font-medium text-slate-400">
            Adaptive Portfolio Intelligence
          </h2>
        </header>
        
        <ErrorBoundary>
        <div className="flex-1 overflow-y-auto p-6 pb-40 custom-scrollbar flex flex-col relative">
          {chatHistory.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto w-full mt-10">
              <div className="mb-8 p-4 rounded-full bg-white/5 border border-white/10">
                <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="10" width="35" height="15" rx="4" fill="#6C5CE7" />
                  <rect x="20" y="25" width="15" height="40" rx="4" fill="#6C5CE7" />
                  <rect x="55" y="35" width="35" height="15" rx="4" fill="#6C5CE7" fillOpacity="0.7" />
                  <rect x="65" y="50" width="15" height="40" rx="4" fill="#6C5CE7" fillOpacity="0.7" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-200 mb-10">
                How can I help you today?
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
                {[
                  { title: "Analyze my portfolio", icon: <Briefcase size={18} className="text-[#6C5CE7]" />, query: "Analyze my portfolio" },
                  { title: "Top gainers today", icon: <TrendingUp size={18} className="text-[#22C55E]" />, query: "Today's top gainers" },
                  { title: "IPO GMP updates", icon: <Newspaper size={18} className="text-orange-400" />, query: "IPO GMP today" },
                  { title: "Market movers", icon: <Activity size={18} className="text-pink-500" />, query: "What's moving the market" }
                ].map((action, i) => (
                  <button 
                    key={i}
                    onClick={() => sendQuickAction(action.query)}
                    className="flex flex-col items-start p-4 bg-[#141824] hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all text-left group"
                  >
                    <div className="mb-3 p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{action.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto w-full pt-4">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user' 
                      ? 'bg-[#2a2b32] text-white rounded-br-sm shadow-md' 
                      : 'bg-transparent text-slate-200 shadow-sm prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#141824] prose-pre:border prose-pre:border-white/10 font-inter'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6C5CE7] flex items-center justify-center mt-1">
                          <Activity size={14} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-transparent px-5 py-4 text-slate-400 flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center border border-[#6C5CE7]/30">
                      <Loader2 className="animate-spin w-4 h-4 text-[#6C5CE7]" />
                    </div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
        </ErrorBoundary>
        
        {/* STICKY BOTTOM INPUT */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0e0f12] via-[#0e0f12] to-transparent flex flex-col items-center justify-end z-20">
          <div className="w-full max-w-3xl relative">
            <form id="chat-form-active" onSubmit={handleChatSubmit} className="relative flex items-center w-full bg-[#1e1f25] border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10 transition-all">
              <Input 
                value={chatQuery}
                onChange={e => setChatQuery(e.target.value)}
                placeholder="Message T&T Assistant..."
                disabled={isChatLoading}
                className="w-full bg-transparent border-0 h-16 pl-6 pr-16 rounded-2xl text-slate-200 placeholder:text-slate-500 focus-visible:ring-0 text-base shadow-none"
              />
              <button 
                type="submit" 
                disabled={isChatLoading || !chatQuery.trim()}
                className="absolute right-3 w-10 h-10 rounded-xl bg-white hover:bg-slate-200 text-black flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white transition-all"
              >
                <ArrowUpRight size={20} strokeWidth={2.5} />
              </button>
            </form>
            <p className="text-[10.5px] text-slate-500 mt-3 text-center">AI can make mistakes. Consider verifying critical financial information.</p>
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR (Live Widgets) */}
      <aside className="w-[320px] flex-shrink-0 border-l border-white/5 bg-[#0e0f12]/80 backdrop-blur-xl flex flex-col z-10 hidden lg:flex">
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
          
          {/* Market Overview Widget */}
          <ErrorBoundary>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Live Markets</h3>
              {marketLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
            </div>
            
            <div className="space-y-3">
              {Object.values(marketData).length > 0 ? (
                (Object.values(marketData) as any[]).map((item: any) => {
                  const isUp = item.change >= 0;
                  return (
                    <div key={item.symbol} className="bg-[#141824] border border-white/5 rounded-xl p-3 flex justify-between items-center group hover:border-white/10 transition-colors">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{item.symbol.replace('.NS', '').replace('^', '')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-slate-200">{item.price.toFixed(2)}</div>
                        <div className={`text-xs font-mono font-medium flex items-center justify-end gap-1 ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                          {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {Math.abs(item.change_percent).toFixed(2)}%
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
          </ErrorBoundary>

          {/* Top News Widget */}
          <ErrorBoundary>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Trending Impact</h3>
            </div>
            <div className="space-y-3">
              {news.slice(0, 3).map((n: Record<string, any>) => {
                const isPositive = n.impact_score > 5;
                const isNeutral = n.impact_score > 4 && n.impact_score < 6;
                const symbol = n.affected_symbol !== 'NONE' && n.affected_symbol !== 'MARKET' ? n.affected_symbol : 'MKT';
                return (
                  <a key={n.id} href={n.link} target="_blank" rel="noreferrer" className="block bg-[#141824] border border-white/5 rounded-xl p-3 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-slate-300">{symbol}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-[#22C55E]/10 text-[#22C55E]' : isNeutral ? 'bg-slate-500/10 text-slate-400' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                        IMPACT: {n.impact_score}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{n.title}</p>
                  </a>
                );
              })}
              {news.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-4 bg-[#141824] rounded-xl border border-white/5">
                  No news available.
                </div>
              )}
            </div>
          </section>
          </ErrorBoundary>
          
          {/* Portfolio Overview Widget */}
          <ErrorBoundary>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">My Portfolio</h3>
              {portfolioLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
            </div>
            <div className="bg-[#141824] border border-white/5 rounded-xl p-4">
              <div className="flex flex-col gap-1 mb-4">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Value</div>
                <div className="text-2xl font-mono font-bold text-slate-200">
                  ₹{usePortfolioStore(s => s.totalValue).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Overall P&L</div>
                {(() => {
                  const pnl = usePortfolioStore(s => s.overallPnl);
                  const isUp = pnl >= 0;
                  return (
                    <div className={`text-sm font-mono font-bold flex items-center gap-1 ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      ₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
          </ErrorBoundary>

        </div>
      </aside>
    </div>
  );
}
