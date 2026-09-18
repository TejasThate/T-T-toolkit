"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Loader2, UploadCloud, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Holding {
  id: number;
  symbol: string;
  quantity: number;
  average_price: number;
  live_price?: number;
}

export default function PortfolioPage() {
  const { token } = useAuthStore();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  
  // CAS Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [panNumber, setPanNumber] = useState("");
  const [syncing, setSyncing] = useState(false);

  const fetchPortfolio = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = await res.json();
      setHoldings(data);
    } catch (e) {
      if (e instanceof Error) {
        toast.error(e.message);
      } else {
        toast.error(String(e));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchPortfolio();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCASSync = async () => {
    if (!panNumber || panNumber.length !== 10) {
      toast.error("Please enter a valid 10-character PAN number.");
      return;
    }
    
    try {
      setSyncing(true);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/portfolio/sync`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ pan: panNumber })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Sync failed");
      
      toast.success(data.message || "Successfully synced CAS!");
      setIsModalOpen(false);
      setPanNumber("");
      fetchPortfolio();
    } catch (e) {
      if (e instanceof Error) {
        toast.error(e.message);
      } else {
        toast.error(String(e));
      }
    } finally {
      setSyncing(false);
    }
  };

  const totalInvested = holdings.reduce((sum, h) => sum + (h.quantity * h.average_price), 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + (h.quantity * (h.live_price || h.average_price)), 0);
  const overallPnl = totalCurrentValue - totalInvested;
  const overallPnlPercent = totalInvested > 0 ? (overallPnl / totalInvested) * 100 : 0;

  const COLORS = ['#6C5CE7', '#00cec9', '#0984e3', '#d63031', '#e84393', '#fdcb6e', '#00b894', '#e17055'];
  const chartData = holdings.map((h) => ({
    name: h.symbol,
    value: h.quantity * (h.live_price || h.average_price)
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-10 bg-[#0e0f12]">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] bg-clip-text text-transparent">
            Portfolio
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Your Wealth Command Center</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={fetchPortfolio}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition flex items-center space-x-2"
          >
            <span>↻ Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] hover:shadow-lg hover:shadow-[#6C5CE7]/30 text-white rounded-xl font-medium transition flex items-center space-x-2"
          >
            <UploadCloud size={18} />
            <span>Sync CAS via Gmail</span>
          </button>
        </div>
      </header>

      {/* CAS Sync Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13141a] border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Sync CAS via Gmail</h2>
            <p className="text-slate-400 text-sm mb-6">
              T&T Toolkit will scan your connected Gmail account for the latest NSDL/CDSL CAS statement. Your PAN is required as the password to decrypt the PDF. It will <strong>never</strong> be saved.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent uppercase tracking-widest"
                  maxLength={10}
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCASSync}
                  disabled={syncing || panNumber.length !== 10}
                  className="px-5 py-2.5 bg-[#6C5CE7] hover:bg-[#5A4FCF] text-white rounded-xl transition font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                  <span>{syncing ? "Syncing..." : "Start Sync"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-[#6C5CE7] animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#13141a] rounded-2xl p-6 border border-white/5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <PieChartIcon size={64} className="text-[#6C5CE7]" />
              </div>
              <h3 className="text-slate-400 font-medium mb-1 relative z-10">Total Portfolio Value</h3>
              <p className="text-4xl font-bold text-slate-100 relative z-10">₹{totalCurrentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            
            <div className="bg-[#13141a] rounded-2xl p-6 border border-white/5 shadow-lg relative overflow-hidden group">
              <h3 className="text-slate-400 font-medium mb-1 relative z-10">Total Invested</h3>
              <p className="text-3xl font-semibold text-slate-200 relative z-10">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            
            <div className={`bg-[#13141a] rounded-2xl p-6 border border-white/5 shadow-lg relative overflow-hidden group ${overallPnl >= 0 ? 'border-b-emerald-500/50' : 'border-b-rose-500/50'} border-b-4`}>
              <h3 className="text-slate-400 font-medium mb-1 relative z-10">Overall P&L</h3>
              <div className="flex items-baseline space-x-3 relative z-10">
                <p className={`text-4xl font-bold ${overallPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {overallPnl >= 0 ? '+' : ''}₹{overallPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <span className={`text-lg font-medium ${overallPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ({overallPnlPercent >= 0 ? '+' : ''}{overallPnlPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div className="text-center text-slate-500 p-16 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-sm mt-8">
              <UploadCloud size={48} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-2xl font-semibold mb-2 text-slate-300">No Holdings Found</h3>
              <p className="mb-6">Click &quot;Sync CAS via Gmail&quot; to securely pull your NSDL/CDSL statement.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Table */}
              <div className="lg:col-span-2 bg-[#13141a] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-6 py-5 border-b border-white/5">
                  <h3 className="text-lg font-semibold text-slate-200">Current Holdings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.02]">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Qty</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Avg Price</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">LTP</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Current Value</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {holdings.map((h) => {
                        const ltp = h.live_price || h.average_price;
                        const currValue = h.quantity * ltp;
                        const invested = h.quantity * h.average_price;
                        const pnl = currValue - invested;
                        const pnlPct = (pnl / invested) * 100;
                        
                        return (
                          <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-200">{h.symbol}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300 font-medium">
                              {h.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-400">
                              ₹{h.average_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-200 font-medium">
                              ₹{ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-200 font-medium">
                              ₹{currValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex flex-col items-end">
                                <span className={`font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                                <span className={`text-xs ${pnl >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                                  {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Charts */}
              <div className="space-y-8">
                <div className="bg-[#13141a] border border-white/5 rounded-2xl p-6 shadow-lg h-[400px] flex flex-col">
                  <h3 className="text-lg font-semibold text-slate-200 mb-6">Asset Allocation</h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                          contentStyle={{ backgroundColor: '#1a1b23', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </>
      )}
    </div>
  );
}
