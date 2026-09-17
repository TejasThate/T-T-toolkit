"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TerminalChatPage() {
  const { token } = useAuthStore();
  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isChatLoading]);

  const submitMessage = async (message: string) => {
    if (!message.trim() || !token) return;
    
    setChatHistory(prev => [...prev, {role: 'user', content: message}]);
    setIsChatLoading(true);
    
    try {
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
      setChatHistory(prev => [...prev, { role: "assistant", content: `Error: ${err.message}. Ensure your GROQ_API_KEY is configured on the backend.` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatQuery;
    setChatQuery("");
    await submitMessage(query);
  };

  const sendQuickAction = (action: string) => {
    submitMessage(action);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center px-6 bg-[#0e0f12]/80 backdrop-blur-xl z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <Bot size={20} className="text-[#6C5CE7]" />
          Terminal AI
        </h1>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
        <div className="max-w-3xl mx-auto space-y-6">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] opacity-50 select-none">
              <Bot size={64} className="text-slate-700 mb-6" />
              <p className="text-slate-500 font-medium">How can T&T AI assist your trading today?</p>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-[#6C5CE7]" />
                  </div>
                )}
                
                <div className={`
                  relative max-w-[85%] rounded-2xl px-5 py-3 
                  ${msg.role === 'user' 
                    ? 'bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] text-white rounded-br-none shadow-[0_0_15px_rgba(108,92,231,0.3)]' 
                    : 'bg-[#141824] border border-white/5 text-slate-200 rounded-bl-none shadow-xl'
                  }
                `}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {isChatLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center flex-shrink-0">
                <Loader2 size={16} className="text-[#6C5CE7] animate-spin" />
              </div>
              <div className="bg-[#141824] border border-white/5 text-slate-400 rounded-2xl rounded-bl-none px-5 py-3 flex items-center gap-2">
                Thinking<span className="animate-pulse">...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 md:p-6 bg-gradient-to-t from-[#0e0f12] via-[#0e0f12] to-transparent z-20">
        <div className="max-w-3xl mx-auto">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar">
            {[
              { title: "Analyze my portfolio", query: "Analyze my current portfolio and tell me if I'm overexposed to any sector." },
              { title: "Today's top gainers", query: "What are today's top gainers?" },
              { title: "Market sentiment", query: "Based on my holdings and the market, what is the overall sentiment today?" },
            ].map((chip) => (
              <button 
                key={chip.title}
                onClick={() => sendQuickAction(chip.query)}
                className="whitespace-nowrap px-4 py-2 rounded-full border border-white/10 bg-[#141824]/80 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all flex items-center gap-2"
              >
                {chip.title}
              </button>
            ))}
          </div>

          <form onSubmit={handleChatSubmit} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] rounded-xl opacity-20 blur-md group-hover:opacity-30 transition-opacity"></div>
            <div className="relative flex items-center bg-[#141824] border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all focus-within:border-white/20 focus-within:bg-[#1a1d27]">
              <input 
                type="text" 
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Ask T&T AI anything about your portfolio or the markets..." 
                className="flex-1 bg-transparent border-none text-slate-200 text-sm px-6 py-4 focus:outline-none focus:ring-0 placeholder-slate-600"
                disabled={isChatLoading}
              />
              <button 
                type="submit" 
                disabled={!chatQuery.trim() || isChatLoading}
                className="p-4 text-[#6C5CE7] hover:text-[#A29BFE] disabled:opacity-30 transition-colors flex items-center justify-center"
              >
                {isChatLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
