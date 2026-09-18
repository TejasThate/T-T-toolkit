"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import { Bell, Trash2, Plus, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import AppShell from '../../components/AppShell';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AlertsPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState("RELIANCE");
  const [condition, setCondition] = useState("price_above");
  const [targetValue, setTargetValue] = useState("");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    enabled: !!token
  });

  const createAlertMutation = useMutation({
    mutationFn: async (newAlert: any) => {
      const res = await fetch(`${API_BASE}/alerts`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newAlert)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to create alert");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Alert created successfully");
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setTargetValue("");
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`)
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete alert");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Alert deleted");
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`)
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue) return;
    createAlertMutation.mutate({
      symbol: symbol.toUpperCase(),
      condition,
      target_value: parseFloat(targetValue)
    });
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Bell className="w-6 h-6 text-yellow-500" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Market Alerts</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Set custom price triggers and get instant WebSocket notifications when the market crosses your targets.
          </p>
        </header>

        {/* Create Alert Form */}
        <div className="bg-[#141824] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Create New Alert</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Symbol</label>
              <input 
                type="text" 
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/50 uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Condition</label>
              <select 
                value={condition}
                onChange={e => setCondition(e.target.value)}
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
              >
                <option value="price_above">Price goes Above</option>
                <option value="price_below">Price goes Below</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Price (₹)</label>
              <input 
                type="number" 
                step="0.05"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                placeholder="e.g. 1500"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={createAlertMutation.isPending}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Plus size={18} />
              {createAlertMutation.isPending ? "Saving..." : "Add Alert"}
            </button>
          </form>
        </div>

        {/* Active Alerts List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Your Alerts</h2>
          
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 text-sm border border-white/5 border-dashed rounded-2xl">
              Loading alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm border border-white/5 border-dashed rounded-2xl">
              No alerts set yet. Create one above to get notified!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert: any) => (
                <div 
                  key={alert.id} 
                  className={`bg-[#141824] border rounded-2xl p-5 flex items-center justify-between transition-colors ${
                    alert.is_active ? 'border-white/5 hover:border-white/10' : 'border-yellow-500/20 bg-yellow-500/5'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tracking-wide">{alert.symbol}</span>
                      {!alert.is_active && (
                        <span className="flex items-center gap-1 text-[10px] font-medium bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Triggered
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-mono text-slate-400 flex items-center gap-2">
                      {alert.condition === "price_above" ? (
                        <span className="flex items-center text-emerald-400">
                          <ArrowUpRight size={14} /> crosses above
                        </span>
                      ) : (
                        <span className="flex items-center text-red-400">
                          <ArrowDownRight size={14} /> drops below
                        </span>
                      )}
                      <span className="text-white font-medium">₹{alert.target_value}</span>
                    </div>
                    {!alert.is_active && alert.triggered_at && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        Triggered at: {new Date(alert.triggered_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => deleteAlertMutation.mutate(alert.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
