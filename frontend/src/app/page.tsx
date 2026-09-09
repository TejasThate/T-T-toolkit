"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// Create a custom button component so we can use the hook inside the provider
function CustomGoogleLogin({ onSuccess, onError }: { onSuccess: (res: any) => void, onError: () => void }) {
  const login = useGoogleLogin({
    onSuccess: tokenResponse => onSuccess(tokenResponse),
    onError: () => onError(),
    scope: 'email profile https://www.googleapis.com/auth/gmail.readonly',
    flow: 'auth-code',
  });

  return (
    <Button 
      type="button" 
      variant="outline" 
      className="w-full h-12 rounded-full font-medium"
      onClick={() => login()}
    >
      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        <path d="M1 1h22v22H1z" fill="none"/>
      </svg>
      Continue with Google
    </Button>
  );
}

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
        try {
            const error = await res.json();
            alert(`Error: ${error.detail || "Database connection failed"}`);
        } catch(e) {
            alert(`Server Error (500). Please check if your DATABASE_URL is valid in Render!`);
        }
      }
    } catch (err) {
      console.error("Auth error", err);
      alert(`Network Error: Make sure your backend API is running at ${API_URL}`);
    }
  };

  const handleGoogleSuccess = async (tokenResponse: any) => {
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: tokenResponse.code })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        localStorage.setItem("token", data.access_token);
      } else {
        const error = await res.json();
        alert(`Google Login Error: ${error.detail}`);
      }
    } catch (err) {
      console.error("Google Auth error", err);
      alert("Network Error with Google Login");
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

  if (!token) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    return (
      <div className="container mx-auto min-h-screen py-20 flex flex-col justify-center items-center bg-[#F8F9FA] dark:bg-[#202124]">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tighter">
            <span className="text-[#4285F4]">T</span>
            <span className="text-[#EA4335]">&</span>
            <span className="text-[#FBBC05]">T</span>
            <span className="text-[#4285F4]"> Toolkit</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to continue</p>
        </div>
        <GoogleOAuthProvider clientId={clientId}>
          <Card className="w-[400px] shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardContent className="pt-8">
              <div className="mb-6 flex justify-center">
                <CustomGoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    alert('Google Login Failed');
                  }}
                />
              </div>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">Or</span>
                </div>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Email or phone"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="h-14 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    className="h-14 rounded-md"
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="link" onClick={() => setIsLoginView(!isLoginView)} className="px-0">
                    {isLoginView ? "Create account" : "Sign in instead"}
                  </Button>
                  <Button type="submit" className="rounded-full px-6">
                    {isLoginView ? "Next" : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </GoogleOAuthProvider>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#202124]">
      {/* Header / Navbar */}
      <header className="bg-white dark:bg-[#292A2D] border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="text-[#4285F4]">T</span>
            <span className="text-[#EA4335]">&</span>
            <span className="text-[#FBBC05]">T</span>
            <span className="text-[#4285F4]"> Toolkit</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden md:inline-block">Adaptive Portfolio & News</span>
          <Button variant="outline" className="rounded-full" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 space-y-6">

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-medium text-lg">Portfolio Sync</CardTitle>
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
              <Button variant="outline" className="rounded-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload CSV Manually"}
              </Button>
              <Button 
                onClick={handleGmailSync} 
                disabled={uploading}
                className="rounded-full bg-[#34A853] hover:bg-[#2E8B57] text-white"
              >
                {uploading ? "Syncing..." : "Sync via Gmail"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-medium text-lg">News Engine</CardTitle>
            <CardDescription>Fetch latest market news and rate impact.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="rounded-full" onClick={handleFetchNews} disabled={fetchingNews}>
              {fetchingNews ? "Fetching..." : "Fetch Latest News"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-medium text-lg">Your Holdings</CardTitle>
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

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-medium text-lg">Impact-Rated News</CardTitle>
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

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-medium text-lg">AI Portfolio Assistant</CardTitle>
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
                className="rounded-full bg-muted border-none h-12 px-6"
              />
              <Button type="submit" className="rounded-full h-12 px-6" disabled={isChatLoading || !chatQuery.trim()}>Send</Button>
            </form>
          </div>
        </CardContent>
      </Card>
      
      </main>
    </div>
  );
}
