'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AmbientBackground from "@/components/AmbientBackground";
import { LayoutDashboard, Briefcase, TrendingUp, Filter, Bell, Newspaper, MessageSquare, ChevronDown, LogOut, Loader2, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const API_BASE = "https://tt-toolkit-backend.onrender.com"; // Adjust if testing locally

export default function Page() {
  const [started, setStarted] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [news, setNews] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>({});
  const [marketLoading, setMarketLoading] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started) {
      fetchNews();
      fetchMarketData();
      
      // Auto-refresh market data every 60 seconds
      const interval = setInterval(fetchMarketData, 60000);
      return () => clearInterval(interval);
    }
  }, [started]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  const fetchNews = async () => {
    try {
      const res = await fetch(`${API_BASE}/news`);
      if (res.ok) {
        const data = await res.json();
        setNews(data.news || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMarketData = async () => {
    try {
      setMarketLoading(true);
      const res = await fetch(`${API_BASE}/market/live`);
      if (res.ok) {
        const data = await res.json();
        setMarketData(data.data || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMarketLoading(false);
    }
  };

  const handleChatSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!chatQuery.trim()) return;

    const userMessage = chatQuery.trim();
    setChatQuery("");
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const token = localStorage.getItem("token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: userMessage, context: "general" }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", content: "Error communicating with AI backend." }]);
      }
    } catch (err) {
      console.error("Chat error", err);
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, an error occurred." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const sendQuickAction = (action: string) => {
    setChatQuery(action);
    // Note: React state is async, so we use a small timeout to submit the form after setting query
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex flex-col justify-center items-center text-slate-100 p-8 relative overflow-hidden">
        <AmbientBackground />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 max-w-md text-center space-y-8">
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
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0B0E14] text-slate-200 overflow-hidden font-sans relative">
      <AmbientBackground />
      
      {/* LEFT SIDEBAR (Nav) */}
      <aside className="w-[260px] flex-shrink-0 border-r border-white/5 bg-[#0B0E14]/80 backdrop-blur-xl flex flex-col z-10 hidden md:flex">
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
      <main className="flex-1 flex flex-col z-10 bg-[#0B0E14]/40 backdrop-blur-sm min-w-0">
        <header className="h-[73px] flex-shrink-0 flex items-center px-6 border-b border-white/5 backdrop-blur-md bg-[#0B0E14]/80">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Terminal Intelligence <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] uppercase tracking-wider ml-2">Live</span>
          </h2>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col">
          {chatHistory.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl">
                <Activity className="text-[#6C5CE7]" size={32} />
              </div>
              <h2 className="text-2xl font-semibold mb-2">How can I help you analyze the market?</h2>
              <p className="text-slate-400 max-w-md">Ask about your portfolio, technical indicators, breaking news, or scan the market for opportunities.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user' 
                      ? 'bg-[#6C5CE7] text-white rounded-br-sm shadow-md' 
                      : 'bg-[#141824] border border-white/10 text-slate-200 rounded-bl-sm shadow-sm prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 font-inter'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#141824] border border-white/10 rounded-2xl rounded-bl-sm px-5 py-4 text-slate-400 flex items-center gap-3">
                    <Loader2 className="animate-spin w-4 h-4 text-[#6C5CE7]" />
                    <span className="text-sm">Analyzing market data...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
        
        <div className="p-6 pt-2 bg-gradient-to-t from-[#0B0E14] to-transparent">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["Analyze my portfolio", "Today's top gainers", "IPO GMP today", "What's moving the market"].map(action => (
              <button 
                key={action}
                onClick={() => sendQuickAction(action)}
                className="text-xs font-medium bg-[#141824] hover:bg-white/10 border border-white/10 text-slate-300 rounded-full px-4 py-2 transition-colors whitespace-nowrap"
              >
                {action}
              </button>
            ))}
          </div>
          
          <form id="chat-form" onSubmit={handleChatSubmit} className="relative flex items-center">
            <Input 
              value={chatQuery}
              onChange={e => setChatQuery(e.target.value)}
              placeholder="Ask the Terminal..."
              disabled={isChatLoading}
              className="w-full bg-[#141824] border border-white/10 h-14 pl-6 pr-16 rounded-2xl text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-[#6C5CE7] shadow-inner text-base"
            />
            <button 
              type="submit" 
              disabled={isChatLoading || !chatQuery.trim()}
              className="absolute right-2 w-10 h-10 rounded-xl bg-[#6C5CE7] hover:bg-[#5a4cd1] text-white flex items-center justify-center disabled:opacity-50 disabled:hover:bg-[#6C5CE7] transition-colors"
            >
              <ArrowUpRight size={20} />
            </button>
          </form>
        </div>
      </main>

      {/* RIGHT SIDEBAR (Live Widgets) */}
      <aside className="w-[320px] flex-shrink-0 border-l border-white/5 bg-[#0B0E14]/80 backdrop-blur-xl flex flex-col z-10 hidden lg:flex">
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
          
          {/* Market Overview Widget */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Live Markets</h3>
              {marketLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
            </div>
            
            <div className="space-y-3">
              {Object.values(marketData).length > 0 ? (
                Object.values(marketData).map((item: any) => {
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

          {/* Top News Widget */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Trending Impact</h3>
            </div>
            <div className="space-y-3">
              {news.slice(0, 3).map((n: any) => {
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
          
          {/* Portfolio Health Widget */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Portfolio Health</h3>
            </div>
            <div className="bg-[#141824] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center">
                  <Activity className="text-[#6C5CE7]" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-mono font-bold text-slate-200">A+</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">AI Score</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Diversification is strong. Consider hedging tech exposure ahead of US Fed rate decisions next week.
              </p>
            </div>
          </section>

        </div>
      </aside>
    </div>
  );
}
