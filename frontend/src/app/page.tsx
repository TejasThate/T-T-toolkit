"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';

const GOOGLE_CLIENT_ID = "251614952431-j137o7u8qeu3b7n93846bi4e1h5auop3.apps.googleusercontent.com";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Dashboard() {
  const [token, setToken] = useState<string | null>("dummy-token");
  const [started, setStarted] = useState(false);

  const [holdings, setHoldings] = useState([]);
  const [news, setNews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fetchingNews, setFetchingNews] = useState(false);
  
  // Chat state
  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://t-t-toolkit.onrender.com";

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchPortfolio();
      fetchNews();
    }
  }, [token]);


  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setHoldings([]);
    setNews([]);
  };

  const getHeaders = () => {
    return {
      "Authorization": `Bearer ${token}`
    };
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`${API_URL}/portfolio`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHoldings(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch(`${API_URL}/news`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      } else {
        const err = await res.json();
        console.error("News fetch error:", err);
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/portfolio/upload`, {
        method: "POST",
        headers: getHeaders(),
        body: formData,
      });
      if (res.ok) {
        alert("Portfolio updated successfully!");
        fetchPortfolio();
      } else {
        const errData = await res.json();
        alert(`Failed to upload portfolio: ${errData.detail || 'Unknown Error'}`);
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert(`Network error uploading file.`);
    }
    setUploading(false);
  };

  const handleFetchNews = async () => {
    setFetchingNews(true);
    try {
      const res = await fetch(`${API_URL}/news/fetch`, { 
        method: "POST",
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        await fetchNews();
      } else {
        const errData = await res.json();
        alert(`Failed to fetch news: ${errData.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error("Failed to fetch latest news:", err);
      alert(`Network error fetching news.`);
    } finally {
      setFetchingNews(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    const userMessage = { role: "user", content: chatQuery };
    setChatHistory(prev => [...prev, userMessage]);
    setChatQuery("");
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: userMessage.content })
      });
      
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't reach the server." }]);
      }
    } catch (err) {
      console.error("Chat error", err);
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, an error occurred." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGmailSync = async () => {
    alert("Gmail Sync is currently disabled because Google Login was removed from the app.");
  };


  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] flex flex-col justify-center items-center text-slate-100 p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center space-y-8">
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">T&T Toolkit</span>
          </h1>
          <p className="text-slate-400 text-lg">Adaptive Portfolio Intelligence</p>
          <Button 
            onClick={() => setStarted(true)}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-lg shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all hover:scale-105"
          >
            Get Started
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111113] text-slate-200 selection:bg-cyan-500/30 font-inter">
      {/* Header / Navbar */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">T&T Toolkit</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-cyan-200/60 hidden md:inline-block">Adaptive Portfolio Intelligence</span>
          <Button variant="outline" className="rounded-full border-white/20 hover:bg-white/10 text-white" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="container mx-auto py-12 px-4 max-w-6xl space-y-16">
        
        {/* HERO SECTION: AI Assistant */}
        <div className="flex flex-col items-center text-center space-y-6 mt-4">
          <h2 className="text-3xl md:text-4xl font-light text-slate-300">Ask anything about</h2>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-rose-400 to-pink-500 pb-2">
            Markets, Stocks & Your Portfolio
          </h1>
          
          <div className="w-full max-w-3xl mt-8">
            <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-2xl rounded-3xl overflow-hidden">
              <div className="flex flex-col">
                <div className="bg-black/20 p-6 min-h-[120px] max-h-[300px] overflow-y-auto whitespace-pre-wrap text-left custom-scrollbar">
                  {chatHistory.length === 0 ? (
                    <div className="flex items-center text-cyan-200/60 italic h-full justify-center opacity-70">
                      <span>✨ Give me today's market summary or ask about your holdings...</span>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <span className={`inline-block p-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-sm' : 'bg-white/10 text-slate-100 border border-white/10 rounded-bl-sm'}`}>
                          {msg.content}
                        </span>
                      </div>
                    ))
                  )}
                  {isChatLoading && <p className="text-cyan-200/60 italic mt-2 animate-pulse text-left">AI is thinking...</p>}
                </div>
                <div className="p-4 bg-white/5 border-t border-white/10">
                  <form onSubmit={handleChatSubmit} className="flex gap-3">
                    <Input 
                      value={chatQuery}
                      onChange={e => setChatQuery(e.target.value)}
                      placeholder="Ask T&T Assistant..."
                      disabled={isChatLoading}
                      className="rounded-full bg-black/20 border-white/10 h-14 px-6 text-white placeholder:text-white/40 focus-visible:ring-indigo-500 text-lg shadow-inner"
                    />
                    <Button type="submit" className="rounded-full h-14 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-medium border-0 shadow-lg transition-transform active:scale-95" disabled={isChatLoading || !chatQuery.trim()}>
                      <span className="mr-2">✦</span> Ask
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* NEWS SECTION: 2x2 Grid Pills */}
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              What is impacting the market today...
            </p>
            <Button variant="ghost" className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full h-8 px-4" onClick={handleFetchNews} disabled={fetchingNews}>
              {fetchingNews ? "Fetching..." : "Refresh News"}
            </Button>
          </div>
          
          {news.length === 0 ? (
            <div className="text-center p-8 border border-white/5 rounded-3xl bg-white/5">
              <p className="text-slate-400 mb-4">No news fetched yet.</p>
              <Button onClick={handleFetchNews} className="rounded-full bg-white/10 hover:bg-white/20 text-white">Fetch Latest News</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {news.slice(0, 6).map((n: any) => (
                <a 
                  key={n.id} 
                  href={n.link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="group flex flex-col justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-all shadow-lg hover:shadow-indigo-500/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-[15px] font-medium text-slate-200 group-hover:text-indigo-300 leading-snug mb-2 transition-colors">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {n.impact_reason}
                      </p>
                    </div>
                    <span className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all mt-1 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${n.impact_score > 6 ? 'bg-emerald-500/20 text-emerald-400' : n.impact_score < 4 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-300'}`}>
                      Impact: {n.impact_score} / 10
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{n.affected_symbol !== 'MARKET' ? n.affected_symbol : 'General Market'}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Holdings & Sync */}
        <div className="max-w-6xl mx-auto pt-8 border-t border-white/10">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-xl rounded-3xl h-full">
                <CardHeader>
                  <CardTitle className="font-semibold text-xl text-cyan-100">Your Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                  {holdings.length === 0 ? (
                    <p className="text-sm text-cyan-200/60">No holdings found. Upload a CSV to get started.</p>
                  ) : (
                    <div className="flex flex-col gap-8">
                      <div className="overflow-x-auto custom-scrollbar pb-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-cyan-200/60">Symbol</TableHead>
                              <TableHead className="text-cyan-200/60">Company</TableHead>
                              <TableHead className="text-right text-cyan-200/60">Quantity</TableHead>
                              <TableHead className="text-right text-cyan-200/60">Avg Price</TableHead>
                              <TableHead className="text-right text-cyan-200/60">Live Price</TableHead>
                              <TableHead className="text-right text-cyan-200/60">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {holdings.map((h: any) => (
                              <TableRow key={h.id} className="border-white/10 hover:bg-white/5">
                                <TableCell className="font-medium text-cyan-100">{h.symbol}</TableCell>
                                <TableCell className="text-slate-300 whitespace-nowrap max-w-[150px] truncate" title={h.company_name}>{h.company_name}</TableCell>
                                <TableCell className="text-right text-slate-300">{h.quantity}</TableCell>
                                <TableCell className="text-right text-slate-300">₹{h.average_price?.toFixed(2) || 0}</TableCell>
                                <TableCell className={`text-right ${h.current_price > h.average_price ? 'text-emerald-400' : h.current_price < h.average_price ? 'text-rose-400' : 'text-slate-300'}`}>
                                  ₹{h.current_price?.toFixed(2) || "Loading..."}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-cyan-100">
                                  ₹{((h.current_price || h.average_price) * h.quantity).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="h-[250px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={holdings.map((h: any) => ({ name: h.symbol, value: h.quantity * (h.current_price || h.average_price) }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {holdings.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `₹${Number(value || 0).toFixed(2)}`} contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#4338ca', color: '#fff', borderRadius: '8px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-8">
              <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-xl rounded-3xl">
                <CardHeader>
                  <CardTitle className="font-semibold text-xl text-cyan-100">Portfolio Sync</CardTitle>
                  <CardDescription className="text-cyan-200/60">Upload your Groww CSV statement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Input 
                      type="file" 
                      accept=".csv" 
                      ref={fileInputRef}
                      onChange={handleFileUpload} 
                      disabled={uploading} 
                      className="hidden"
                    />
                    <Button variant="outline" className="w-full rounded-xl h-12 border-white/20 hover:bg-white/10 text-white" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? "Uploading..." : "Upload CSV Manually"}
                    </Button>
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-white/10"></div>
                      <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase">OR</span>
                      <div className="flex-grow border-t border-white/10"></div>
                    </div>
                    <Button 
                      onClick={handleGmailSync} 
                      disabled={uploading}
                      className="w-full rounded-xl h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    >
                      Sync via Gmail (Disabled)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      
      </main>
    </div>
  );
}
