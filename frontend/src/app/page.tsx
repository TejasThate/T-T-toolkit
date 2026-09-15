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
import { LayoutDashboard, Briefcase, TrendingUp, Filter, Bell, Newspaper, MessageSquare, ChevronDown, LogOut, Loader2, ArrowUpRight, ArrowDownRight, Activity, Terminal, Lock, AlertCircle, ArrowRight, Search, Send, Clock, PlayCircle, Settings, Shield, Trash2, AlertTriangle } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useMarketDataSync } from "@/hooks/useMarketDataSync";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { PredictionChart } from "@/components/PredictionChart";
import { PredictionStatsWidget } from "@/components/PredictionStatsWidget";
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';

const API_BASE = "";

export default function Page() {
  const [started, setStarted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Check auth
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      setStarted(true);
    }
  }, []);

  const login = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async codeResponse => {
      try {
        const res = await fetch(`${API_BASE}/auth/google/code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Login failed");
        }
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        setToken(data.access_token);
        setStarted(true);
        toast.success("Logged in successfully");
      } catch (e: any) {
        toast.error(`Error: ${e.message}`);
      }
    },
    onError: error => toast.error("Google Login Failed")
  });

  const syncGmail = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    onSuccess: async tokenResponse => {
      try {
        toast.info("Scanning Gmail for CAS statements...");
        const res = await fetch(`${API_BASE}/api/portfolio/sync`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({ google_access_token: tokenResponse.access_token })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Gmail Sync failed");
        }
        toast.success(data.message);
        setIsGmailConsentOpen(false);
        refetchProfile();
      } catch (e: any) {
        toast.error(`Error: ${e.message}`);
      }
    },
    onError: error => toast.error("Gmail Sync Failed")
  });

  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [panInput, setPanInput] = useState("");
  const [isGmailConsentOpen, setIsGmailConsentOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const setHoldings = usePortfolioStore(state => state.setHoldings);
  const totalValue = usePortfolioStore(state => state.totalValue);
  const overallPnl = usePortfolioStore(state => state.overallPnl);
  
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

  // Top Gainers Query
  const { data: topGainers = [], isFetching: gainersLoading } = useQuery({
    queryKey: ['topGainers'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/market/top-gainers?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Top gainers fetch failed');
      return res.json();
    },
    enabled: !!token && started,
    refetchInterval: 60 * 1000
  });

  // Auth Query
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['authMe'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Auth fetch failed');
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

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Chat failed");
      
      setChatHistory(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: "assistant", content: `Error: ${err.message}. Ensure your GEMINI_API_KEY is configured on the backend.` }]);
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

  const handlePanSubmit = async () => {
    if (!panInput) return;
    try {
      const res = await fetch(`${API_BASE}/auth/pan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pan_number: panInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save PAN");
      alert(data.message);
      setPanInput("");
      refetchProfile();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteData = async () => {
    const confirmed = window.confirm("Are you sure? This will permanently delete your portfolio, PAN, and Google tokens.");
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/auth/delete-data`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete data");
      alert(data.message);
      refetchProfile();
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    }
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
            onClick={() => login()}
            className="w-full h-14 rounded-xl bg-[#6C5CE7] hover:bg-[#5a4cd1] text-white font-bold text-lg shadow-[0_0_20px_rgba(108,92,231,0.3)] transition-all"
          >
            Log In with Google
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
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs">
                PRO
              </div>
              <div>
                <p className="text-sm font-medium">T&T Account</p>
                <p className="text-xs text-slate-500">Data Privacy</p>
              </div>
            </div>
            <Settings size={16} className="text-slate-500" />
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
              {Object.keys(marketData).length > 0 ? (
                Object.entries(marketData).map(([symbol, item]: [string, any]) => {
                  const isUp = item.change_pct >= 0;
                  return (
                    <div key={symbol} className="bg-[#141824] border border-white/5 rounded-xl p-3 flex justify-between items-center group hover:border-white/10 transition-colors">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{symbol.replace('.NS', '').replace('^', '')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-slate-200">{item.price.toFixed(2)}</div>
                        <div className={`text-xs font-mono font-medium flex items-center justify-end gap-1 ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                          {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {Math.abs(item.change_pct).toFixed(2)}%
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

          {/* Top Gainers Widget */}
          <ErrorBoundary>
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
                        <div className="text-sm font-mono text-slate-200">{item.price.toFixed(2)}</div>
                        <div className="text-xs font-mono font-medium flex items-center justify-end gap-1 text-[#22C55E]">
                          <ArrowUpRight size={12} />
                          {item.change_pct.toFixed(2)}%
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
                  ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex flex-col gap-1 mb-5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Overall P&L</div>
                {(() => {
                  const isUp = overallPnl >= 0;
                  return (
                    <div className={`text-sm font-mono font-bold flex items-center gap-1 ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      ₹{Math.abs(overallPnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  );
                })()}
              </div>

              {portfolioData && portfolioData.length > 0 && (
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
                onClick={() => setIsGmailConsentOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-slate-300"
              >
                <Lock size={14} className="text-[#6C5CE7]" />
                Sync via Gmail
              </button>
            </div>
          </section>
          </ErrorBoundary>

          {/* AI Prediction Widget */}
          <ErrorBoundary>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Activity size={14} className="text-[#6C5CE7]" /> AI Engine Forecast
              </h3>
            </div>
            <div className="space-y-4">
              <PredictionChart symbol="RELIANCE" token={token || ''} />
              <PredictionStatsWidget />
            </div>
          </section>
          </ErrorBoundary>

        </div>
      </aside>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0e0f12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings size={18} className="text-[#6C5CE7]" /> Data Privacy & Settings
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* PAN Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Shield size={16} className="text-emerald-500" /> KYC Verification (DPDP Act)
                </h3>
                <p className="text-xs text-slate-400">
                  To securely fetch your holdings, we require a valid PAN. It is stored encrypted at rest.
                </p>
                {userProfile?.masked_pan ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-400 font-medium mb-0.5">Verified PAN linked</p>
                      <p className="text-sm font-mono text-slate-200">{userProfile.masked_pan}</p>
                    </div>
                    <Shield size={20} className="text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="ABCDE1234F" 
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm uppercase outline-none focus:border-[#6C5CE7] transition-colors"
                      value={panInput}
                      onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                      maxLength={10}
                    />
                    <button 
                      onClick={handlePanSubmit}
                      className="px-4 py-2 bg-[#6C5CE7] hover:bg-[#5a4cd1] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>
              
              <div className="h-px w-full bg-white/5"></div>
              
              {/* Danger Zone */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-rose-500 flex items-center gap-2">
                  <AlertTriangle size={16} /> Danger Zone
                </h3>
                <p className="text-xs text-slate-400">
                  Permanently wipe all your data, including Google tokens, PAN, and portfolio records.
                </p>
                <button 
                  onClick={handleDeleteData}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 size={16} /> Delete My Data
                </button>
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GMAIL CONSENT MODAL */}
      {isGmailConsentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0e0f12] border border-[#6C5CE7]/30 rounded-2xl shadow-[0_0_40px_rgba(108,92,231,0.15)] overflow-hidden flex flex-col relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-[#6C5CE7]/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-[#6C5CE7]/20">
                <Shield size={32} className="text-[#6C5CE7]" />
              </div>
              
              <div>
                <h2 className="text-xl font-bold mb-2">Secure Gmail Sync</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  To automatically import your holdings, we request strictly limited <strong>read-only</strong> access to your Gmail.
                </p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 text-left border border-white/5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div></div>
                  <p className="text-xs text-slate-300">We only read emails from specific broker domains (e.g. Zerodha, Groww).</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div></div>
                  <p className="text-xs text-slate-300">Your emails are never stored, only processed for portfolio extraction.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div></div>
                  <p className="text-xs text-slate-300">You can revoke access and delete all data at any time via Settings.</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => {
                    syncGmail();
                  }}
                  className="w-full h-12 rounded-xl bg-[#6C5CE7] hover:bg-[#5a4cd1] text-white font-semibold text-sm transition-colors"
                >
                  I Understand, Continue
                </button>
                <button 
                  onClick={() => setIsGmailConsentOpen(false)}
                  className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
