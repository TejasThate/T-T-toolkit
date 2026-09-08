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
  const [holdings, setHoldings] = useState([]);
  const [news, setNews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fetchingNews, setFetchingNews] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPortfolio = async () => {
    const res = await fetch("http://localhost:8000/portfolio");
    if (res.ok) {
      setHoldings(await res.json());
    }
  };

  const fetchNews = async () => {
    const res = await fetch("http://localhost:8000/news");
    if (res.ok) {
      setNews(await res.json());
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchNews();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/portfolio/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("Portfolio uploaded successfully!");
      fetchPortfolio();
    } else {
      alert("Failed to upload portfolio.");
    }
    setUploading(false);
  };

  const triggerNewsFetch = async () => {
    setFetchingNews(true);
    const res = await fetch("http://localhost:8000/news/fetch", { method: "POST" });
    if (res.ok) {
      fetchNews();
    }
    setFetchingNews(false);
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">T&T Dashboard</h1>
        <p className="text-muted-foreground mt-2">Adaptive Portfolio & News Intelligence</p>
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
            <Button onClick={triggerNewsFetch} disabled={fetchingNews}>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.symbol}</TableCell>
                        <TableCell>{h.company_name}</TableCell>
                        <TableCell className="text-right">{h.quantity}</TableCell>
                        <TableCell className="text-right">₹{h.average_price}</TableCell>
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
                      data={holdings.map((h: any) => ({ name: h.symbol, value: h.quantity * h.average_price }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {holdings.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
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
            <div className="space-y-4">
              {news.map((n: any) => (
                <div key={n.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <a href={n.link} target="_blank" rel="noreferrer" className="text-lg font-semibold hover:underline">
                    {n.title}
                  </a>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
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
    </div>
  );
}
