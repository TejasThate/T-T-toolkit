"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";

interface NewsItem {
  id: number;
  title: string;
  link: string;
  source: string;
  published_at: string;
  affected_symbol?: string | null;
  impact_score?: number | null;
  impact_reason?: string | null;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  const fetchNews = async () => {
    try {
      setLoading(true);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/news`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch news.");
      const data = await res.json();
      setNews(data.news as NewsItem[]);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchNews();
  }, [token]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-10 bg-[#0e0f12]">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] bg-clip-text text-transparent">
            Market Intelligence
          </h1>
          <p className="text-slate-400 mt-2 text-lg">AI-Scored Financial News Feed</p>
        </div>
        <button
          onClick={fetchNews}
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition flex items-center space-x-2"
        >
          <span>↻ Refresh</span>
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-[#6C5CE7] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center space-x-4">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : news.length === 0 ? (
        <div className="text-center text-slate-500 p-10 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-sm">
          <h3 className="text-xl font-semibold mb-2">No News Available</h3>
          <p>The RSS pipeline has not ingested any news yet. Please wait for the scheduled job to run, or restart the backend.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {news.map((n) => (
            <a
              key={n.id}
              href={n.link}
              target="_blank"
              rel="noreferrer"
              className="group relative bg-[#13141a] rounded-2xl p-6 border border-white/5 hover:border-[#6C5CE7]/50 transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg shadow-black/20 hover:shadow-[#6C5CE7]/10"
            >
              {/* Score Indicator Line */}
              <div 
                className={`absolute top-0 left-0 w-full h-1 ${
                  (n.impact_score || 0) > 2 ? 'bg-emerald-500' : 
                  (n.impact_score || 0) < -2 ? 'bg-rose-500' : 'bg-slate-500'
                }`}
              />
              
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {n.source}
                  </span>
                  <span className="text-xs text-slate-600">
                    {new Date(n.published_at).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold mb-3 text-slate-200 group-hover:text-[#A29BFE] transition-colors line-clamp-3">
                  {n.title}
                </h3>
                
                {n.impact_reason && (
                  <p className="text-sm text-slate-400 italic mb-4 line-clamp-3">
                    "{n.impact_reason}"
                  </p>
                )}
              </div>

              <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Impact</span>
                  <span className={`text-lg font-bold ${
                    (n.impact_score || 0) > 2 ? 'text-emerald-400' : 
                    (n.impact_score || 0) < -2 ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    {n.impact_score !== null ? n.impact_score : '-'} / 10
                  </span>
                </div>
                
                {n.affected_symbol && (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 mb-1">Symbol</span>
                    <span className="text-sm font-semibold bg-[#6C5CE7]/10 px-2 py-1 rounded text-[#A29BFE]">
                      {n.affected_symbol}
                    </span>
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
