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
        alert("Failed to upload portfolio");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
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
        await fetchNews();
      }
    } catch (err) {
      console.error("Failed to fetch latest news:", err);
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
    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/portfolio/sync-gmail`, {
        method: "POST",
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchPortfolio();
      } else {
        alert(`Sync Failed: ${data.detail}`);
      }
    } catch (err) {
      console.error("Gmail sync error:", err);
      alert("Failed to connect to sync engine.");
    } finally {
      setUploading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-slate-100 selection:bg-cyan-500/30">
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

      <main className="container mx-auto py-8 px-4 space-y-8">

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="font-semibold text-xl text-cyan-100">Portfolio Sync</CardTitle>
            <CardDescription className="text-cyan-200/60">Upload your Groww CSV statement to analyze your holdings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef}
                onChange={handleFileUpload} 
                disabled={uploading} 
                className="hidden"
              />
              <Button variant="outline" className="rounded-full border-white/20 hover:bg-white/10 text-white" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload CSV Manually"}
              </Button>
              <Button 
                onClick={handleGmailSync} 
                disabled={uploading}
                className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-white border-0 shadow-lg shadow-emerald-500/20"
              >
                {uploading ? "Syncing..." : "Sync via Gmail"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="font-semibold text-xl text-cyan-100">News Engine</CardTitle>
            <CardDescription className="text-cyan-200/60">Fetch latest market news and rate impact.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/20" onClick={handleFetchNews} disabled={fetchingNews}>
              {fetchingNews ? "Fetching..." : "Fetch Latest News"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="font-semibold text-xl text-cyan-100">Your Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {holdings.length === 0 ? (
              <p className="text-sm text-cyan-200/60">No holdings found. Upload a CSV to get started.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-8 items-start">
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-cyan-200/60">Symbol</TableHead>
                        <TableHead className="text-cyan-200/60">Company</TableHead>
                        <TableHead className="text-right text-cyan-200/60">Quantity</TableHead>
                        <TableHead className="text-right text-cyan-200/60">Avg Price</TableHead>
                        <TableHead className="text-right text-cyan-200/60">Live Price</TableHead>
                        <TableHead className="text-right text-cyan-200/60">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdings.map((h: any) => (
                        <TableRow key={h.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium text-cyan-100">{h.symbol}</TableCell>
                          <TableCell className="text-slate-300">{h.company_name}</TableCell>
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
                <div className="h-[300px] w-full">
                  <h3 className="text-center font-semibold mb-2 text-cyan-100">Portfolio Allocation</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={holdings.map((h: any) => ({ name: h.symbol, value: h.quantity * (h.current_price || h.average_price) }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
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
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="font-semibold text-xl text-cyan-100">Impact-Rated News</CardTitle>
          </CardHeader>
          <CardContent>
            {news.length === 0 ? (
              <p className="text-sm text-cyan-200/60">No news fetched yet. Click "Fetch Latest News" above.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {news.map((n: any) => (
                  <div key={n.id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0 hover:bg-white/5 p-4 rounded-xl transition-colors">
                    <a href={n.link} target="_blank" rel="noreferrer" className="text-lg font-semibold text-cyan-50 hover:text-cyan-300">
                      {n.title}
                    </a>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className={`px-2 py-1 rounded-md font-medium ${n.impact_score > 6 ? 'bg-emerald-500/20 text-emerald-300' : n.impact_score < 4 ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                        Impact: {n.impact_score} / 10
                      </span>
                      <span className="text-cyan-200/60">{n.impact_reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-xl rounded-3xl mb-8">
          <CardHeader>
            <CardTitle className="font-semibold text-xl text-cyan-100">AI Portfolio Assistant</CardTitle>
            <CardDescription className="text-cyan-200/60">Ask questions about your portfolio, market trends, or stock insights.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="bg-black/20 p-6 rounded-2xl min-h-[150px] max-h-[300px] overflow-y-auto whitespace-pre-wrap shadow-inner border border-white/5">
                {chatHistory.length === 0 ? (
                  <p className="text-cyan-200/60 italic">Hello! I'm your AI portfolio assistant. How can I help you today?</p>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <span className={`inline-block p-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-sm' : 'bg-white/10 text-slate-100 border border-white/10 rounded-bl-sm'}`}>
                        {msg.content}
                      </span>
                    </div>
                  ))
                )}
                {isChatLoading && <p className="text-cyan-200/60 italic mt-2 animate-pulse">AI is thinking...</p>}
            </div>
              <form onSubmit={handleChatSubmit} className="flex gap-3">
                <Input 
                  value={chatQuery}
                  onChange={e => setChatQuery(e.target.value)}
                  placeholder="E.g., Which of my stocks is most risky right now?"
                  disabled={isChatLoading}
                  className="rounded-full bg-white/5 border-white/10 h-14 px-6 text-white placeholder:text-white/40 focus-visible:ring-cyan-500"
                />
                <Button type="submit" className="rounded-full h-14 px-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 border-0 shadow-lg" disabled={isChatLoading || !chatQuery.trim()}>Send</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      </main>
    </div>
  );
}
