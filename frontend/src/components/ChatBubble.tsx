"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import Markdown from 'react-markdown';

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => Math.floor(Math.random() * 1000000));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use query to fetch history if exists (we use a random session ID here for now, so it's fresh)
  const { data, refetch } = useQuery({
    queryKey: ['chatHistory', sessionId],
    queryFn: () => fetchApi<any>(`/api/chat/${sessionId}`),
    enabled: isOpen,
  });

  const chatHistory = data?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const sendMessage = useMutation({
    mutationFn: async (msg: string) => {
      const messages = [...chatHistory, { role: "user", content: msg }];
      return fetchApi<any>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, messages })
      });
    },
    onSuccess: () => {
      setInput("");
      refetch();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate(input);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] text-white rounded-full shadow-2xl shadow-[#6C5CE7]/30 hover:scale-105 transition-transform z-40 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <Sparkles size={24} />
      </button>

      {/* Chat Interface */}
      <div 
        className={`fixed bottom-6 right-6 w-[400px] h-[600px] max-h-[80vh] bg-[#0e0f12] border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 transition-all transform origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-[#141824] rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#6C5CE7]/20 rounded-lg">
              <Bot size={20} className="text-[#A29BFE]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Market Intelligence AI</h3>
              <p className="text-[10px] text-emerald-400 font-medium">Online • Multi-Agent System</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0e0f12]">
          
          {/* Welcome Message */}
          {chatHistory.length === 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-[#A29BFE]" />
              </div>
              <div className="bg-[#141824] border border-white/5 p-3 rounded-2xl rounded-tl-sm text-sm text-slate-200">
                Hello! I am your AI assistant. I can help you analyze the market using technical charts, breaking news, or risk management strategies. Ask me anything!
              </div>
            </div>
          )}

          {/* History */}
          {chatHistory.map((msg: any, idx: number) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-[#38BDF8]/20' : 'bg-[#6C5CE7]/20'
              }`}>
                {msg.role === 'user' ? <User size={16} className="text-[#38BDF8]" /> : <Bot size={16} className="text-[#A29BFE]" />}
              </div>
              <div className={`max-w-[80%] p-3 text-sm rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-[#38BDF8] text-white rounded-tr-sm' 
                  : 'bg-[#141824] border border-white/5 text-slate-200 rounded-tl-sm'
              }`}>
                {msg.role === 'user' ? msg.content : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Optimistic UI / Loading */}
          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-[#A29BFE]" />
              </div>
              <div className="bg-[#141824] border border-white/5 p-3 rounded-2xl rounded-tl-sm text-sm text-slate-400 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Thinking...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/5 bg-[#141824] rounded-b-2xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about NIFTY support levels..."
              className="flex-1 bg-[#0e0f12] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#6C5CE7]"
            />
            <button 
              type="submit"
              disabled={!input.trim() || sendMessage.isPending}
              className="p-2 bg-[#6C5CE7] hover:bg-[#5f51d3] text-white rounded-xl disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
