"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginView, setIsLoginView] = useState(true);

  const [holdings, setHoldings] = useState([]);
  const [news, setNews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fetchingNews, setFetchingNews] = useState(false);
  
  // Chat state
  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLoginView ? "/auth/login" : "/auth/register";
    
    try {
      let res;
      if (isLoginView) {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);
        res = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString()
        });
      } else {
        res = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
      }

      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        localStorage.setItem("token", data.access_token);
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (err) {
      console.error("Auth error", err);
    }
  };

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

  if (!token) {
    return (
      <div className="container mx-auto py-20 flex justify-center items-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>{isLoginView ? "Login" : "Sign Up"}</CardTitle>
            <CardDescription>Access your Adaptive Portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full">
                {isLoginView ? "Login" : "Sign Up"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => setIsLoginView(!isLoginView)}>
                {isLoginView ? "Need an account? Sign up" : "Already have an account? Login"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">T&T Dashboard</h1>
          <p className="text-muted-foreground mt-2">Adaptive Portfolio & News Intelligence</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Upload</CardTitle>
            <CardDescription>Upload your Groww CSV statement to analyze your holdings.</CardDescription>
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
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload CSV"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>News Engine</CardTitle>
            <CardDescription>Fetch latest market news and rate impact.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFetchNews} disabled={fetchingNews}>
              {fetchingNews ? "Fetching..." : "Fetch Latest News"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holdings found. Upload a CSV to get started.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                      <TableHead className="text-right">Live Price</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.symbol}</TableCell>
                        <TableCell>{h.company_name}</TableCell>
                        <TableCell className="text-right">{h.quantity}</TableCell>
                        <TableCell className="text-right">₹{h.average_price?.toFixed(2) || 0}</TableCell>
                        <TableCell className={`text-right ${h.current_price > h.average_price ? 'text-green-500' : h.current_price < h.average_price ? 'text-red-500' : ''}`}>
                          ₹{h.current_price?.toFixed(2) || "Loading..."}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{((h.current_price || h.average_price) * h.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="h-[300px] w-full">
                <h3 className="text-center font-semibold mb-2">Portfolio Allocation</h3>
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
                    <Tooltip formatter={(value: any) => `₹${Number(value || 0).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impact-Rated News</CardTitle>
        </CardHeader>
        <CardContent>
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">No news fetched yet. Click "Fetch Latest News" above.</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4">
              {news.map((n: any) => (
                <div key={n.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <a href={n.link} target="_blank" rel="noreferrer" className="text-lg font-semibold hover:underline">
                    {n.title}
                  </a>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className={`px-2 py-1 rounded ${n.impact_score > 6 ? 'bg-green-100 text-green-800' : n.impact_score < 4 ? 'bg-red-100 text-red-800' : 'bg-primary/10 text-primary'}`}>
                      Impact: {n.impact_score} / 10
                    </span>
                    <span className="text-muted-foreground">{n.impact_reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Portfolio Assistant</CardTitle>
          <CardDescription>Ask questions about your portfolio, market trends, or stock insights.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="bg-muted p-4 rounded-md min-h-[150px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
              {chatHistory.length === 0 ? (
                <p className="text-muted-foreground italic">Hello! I'm your AI portfolio assistant. How can I help you today?</p>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <span className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                      {msg.content}
                    </span>
                  </div>
                ))
              )}
              {isChatLoading && <p className="text-muted-foreground italic mt-2">AI is thinking...</p>}
            </div>
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <Input 
                value={chatQuery}
                onChange={e => setChatQuery(e.target.value)}
                placeholder="E.g., Which of my stocks is most risky right now?"
                disabled={isChatLoading}
              />
              <Button type="submit" disabled={isChatLoading || !chatQuery.trim()}>Send</Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
