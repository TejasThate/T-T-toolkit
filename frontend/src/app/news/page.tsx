"use client";

import React from "react";
import { Newspaper, Loader2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TopNewsPage() {
  const { token } = useAuthStore();

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['topNews'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/news`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('News fetch failed');
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15 * 60 * 1000 // 15 mins
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <Newspaper size={20} className="text-[#38BDF8]" />
          Top News
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
        <div className="max-w-4xl mx-auto space-y-6">
          <p className="text-slate-400">
            Latest financial news with AI-powered sentiment analysis.
          </p>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8]" />
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No news found at the moment.
            </div>
          ) : (
            <div className="grid gap-4">
              {news.map((article: any, i: number) => {
                const isBullish = article.sentiment === 'Bullish';
                const isBearish = article.sentiment === 'Bearish';
                
                return (
                  <a 
                    key={i} 
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-[#141824] border border-white/5 hover:border-white/20 rounded-2xl p-5 transition-all group"
                  >
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h2 className="text-lg font-semibold text-slate-200 group-hover:text-[#38BDF8] transition-colors leading-snug">
                        {article.title}
                      </h2>
                      <div className={`
                        flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap
                        ${isBullish ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          isBearish ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'}
                      `}>
                        {isBullish ? <ArrowUpRight size={14} /> : isBearish ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                        {article.sentiment}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                      {article.description}
                    </p>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span className="font-medium text-slate-300">{article.source}</span>
                      <span>{new Date(article.published_at).toLocaleString()}</span>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
