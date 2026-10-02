"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Loader2, UploadCloud, PieChart as PieChartIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from '@tanstack/react-virtual';
import dynamic from 'next/dynamic';

const PieChartConfig = dynamic(() => import('@/components/ui/PieChartConfig'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-white/5 rounded-full" />
});

interface Holding {
  id: number;
  symbol: string;
  quantity: number;
  average_price: number;
  live_price?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PortfolioPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  
  // CAS Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [panNumber, setPanNumber] = useState("");
  const [syncJobId, setSyncJobId] = useState<string | null>(null);

  const { data: holdings = [], isLoading, isError, refetch } = useQuery<Holding[]>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['syncStatus', syncJobId],
    queryFn: async () => {
      if (!syncJobId) return null;
      const res = await fetch(`${API_BASE}/api/portfolio/sync/${syncJobId}`);
      if (!res.ok) throw new Error("Status check failed");
      return res.json();
    },
    enabled: !!syncJobId,
    refetchInterval: (query) => {
      const status = query.state?.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 2000; // poll every 2 seconds
    }
  });

  useEffect(() => {
    if (syncStatus?.status === 'completed') {
      toast.success("Successfully synced CAS!");
      setSyncJobId(null);
      setIsModalOpen(false);
      setPanNumber("");
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    } else if (syncStatus?.status === 'failed') {
      toast.error(syncStatus.error || "Sync failed");
      setSyncJobId(null);
    }
  }, [syncStatus, queryClient]);

  const syncMutation = useMutation({
    mutationFn: async (pan: string) => {
      const res = await fetch(`${API_BASE}/api/portfolio/sync`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ pan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Sync failed");
      return data;
    },
    onSuccess: (data) => {
      if (data.job_id) {
        setSyncJobId(data.job_id);
      } else {
        toast.success(data.message || "Successfully synced CAS!");
        setIsModalOpen(false);
        setPanNumber("");
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      }
    },
    onError: (e: Error) => {
      toast.error(e.message);
    }
  });

  const handleCASSync = () => {
    if (!panNumber || panNumber.length !== 10) {
      toast.error("Please enter a valid 10-character PAN number.");
      return;
    }
    syncMutation.mutate(panNumber);
  };

  const { totalInvested, totalCurrentValue, overallPnl, overallPnlPercent } = useMemo(() => {
    const invested = holdings.reduce((sum, h) => sum + (h.quantity * h.average_price), 0);
    const curr = holdings.reduce((sum, h) => sum + (h.quantity * (h.live_price || h.average_price)), 0);
    const pnl = curr - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { totalInvested: invested, totalCurrentValue: curr, overallPnl: pnl, overallPnlPercent: pct };
  }, [holdings]);

  const chartData = useMemo(() => {
    return holdings.map((h) => ({
      name: h.symbol,
      value: h.quantity * (h.live_price || h.average_price)
    })).sort((a, b) => b.value - a.value);
  }, [holdings]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: holdings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  const isSyncing = syncMutation.isPending || !!syncJobId;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-10 bg-[#0e0f12]">
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] bg-clip-text text-transparent">
            Portfolio
          </h1>
          <p className="text-slate-400 mt-2 text-base md:text-lg">Your Wealth Command Center</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
          <button
            onClick={() => refetch()}
            className="px-4 md:px-6 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition flex items-center space-x-2 flex-1 md:flex-none justify-center"
          >
            <span>↻ Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] hover:shadow-lg hover:shadow-[#6C5CE7]/30 text-white rounded-xl font-medium transition flex items-center space-x-2 flex-1 md:flex-none justify-center"
          >
            <UploadCloud size={18} />
            <span>Sync CAS</span>
          </button>
        </div>
      </header>

      {/* CAS Sync Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#13141a] border border-white/10 p-6 md:p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <h2 className="text-xl md:text-2xl font-bold text-slate-200 mb-2">Sync CAS via Gmail</h2>
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
                  className="px-4 md:px-5 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCASSync}
                  disabled={isSyncing || panNumber.length !== 10}
                  className="px-4 md:px-5 py-2 md:py-2.5 bg-[#6C5CE7] hover:bg-[#5A4FCF] text-white rounded-xl transition font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                  <span>{isSyncing ? "Syncing..." : "Start Sync"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-[#6C5CE7] animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center text-slate-500 p-8 md:p-16 border border-red-500/30 rounded-2xl bg-red-500/5 backdrop-blur-sm mt-8">
            <h3 className="text-2xl font-semibold mb-2 text-red-400">Error Loading Portfolio</h3>
            <p className="mb-6">We could not load your holdings.</p>
            <button onClick={() => refetch()} className="px-6 py-2.5 bg-white/10 text-white rounded-xl">Retry</button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-[#13141a] rounded-2xl p-5 md:p-6 border border-white/5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <PieChartIcon size={64} className="text-[#6C5CE7]" />
              </div>
              <h3 className="text-slate-400 font-medium mb-1 relative z-10 text-sm md:text-base">Total Portfolio Value</h3>
              <p className="text-3xl md:text-4xl font-bold text-slate-100 relative z-10">₹{totalCurrentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            
            <div className="bg-[#13141a] rounded-2xl p-5 md:p-6 border border-white/5 shadow-lg relative overflow-hidden group">
              <h3 className="text-slate-400 font-medium mb-1 relative z-10 text-sm md:text-base">Total Invested</h3>
              <p className="text-2xl md:text-3xl font-semibold text-slate-200 relative z-10">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            
            <div className={`bg-[#13141a] rounded-2xl p-5 md:p-6 border border-white/5 shadow-lg relative overflow-hidden group ${overallPnl >= 0 ? 'border-b-emerald-500/50' : 'border-b-rose-500/50'} border-b-4`}>
              <h3 className="text-slate-400 font-medium mb-1 relative z-10 text-sm md:text-base">Overall P&L</h3>
              <div className="flex items-baseline space-x-2 md:space-x-3 relative z-10">
                <p className={`text-2xl md:text-4xl font-bold ${overallPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {overallPnl >= 0 ? '+' : ''}₹{overallPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <span className={`text-sm md:text-lg font-medium ${overallPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ({overallPnlPercent >= 0 ? '+' : ''}{overallPnlPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div className="text-center text-slate-500 p-8 md:p-16 border border-white/5 rounded-2xl bg-white/5 md:backdrop-blur-sm mt-8">
              <UploadCloud size={48} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl md:text-2xl font-semibold mb-2 text-slate-300">No Holdings Found</h3>
              <p className="mb-6 text-sm md:text-base">Click &quot;Sync CAS via Gmail&quot; to securely pull your NSDL/CDSL statement.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Virtualized Table */}
              <div className="lg:col-span-2 bg-[#13141a] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/5">
                  <h3 className="text-lg font-semibold text-slate-200">Current Holdings</h3>
                </div>
                <div 
                  ref={parentRef} 
                  className="overflow-auto custom-scrollbar" 
                  style={{ height: '400px' }} // Fixed height for virtualizer
                >
                  <table className="w-full text-left border-collapse relative min-w-[600px]">
                    <thead className="sticky top-0 bg-[#13141a] z-10">
                      <tr className="bg-white/[0.02]">
                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Symbol</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Qty</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Avg Price</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">LTP</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Current Value</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const h = holdings[virtualRow.index];
                        const ltp = h.live_price || h.average_price;
                        const currValue = h.quantity * ltp;
                        const invested = h.quantity * h.average_price;
                        const pnl = currValue - invested;
                        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                        
                        return (
                          <tr 
                            key={h.id} 
                            className="absolute top-0 left-0 w-full hover:bg-white/[0.02] transition-colors border-b border-white/5"
                            style={{
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-200 text-sm md:text-base">{h.symbol}</span>
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-slate-300 font-medium text-sm md:text-base">
                              {h.quantity}
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-slate-400 text-sm md:text-base">
                              ₹{h.average_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-slate-200 font-medium text-sm md:text-base">
                              ₹{ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-slate-200 font-medium text-sm md:text-base">
                              ₹{currValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex flex-col items-end">
                                <span className={`font-semibold text-sm md:text-base ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                <div className="bg-[#13141a] border border-white/5 rounded-2xl p-4 md:p-6 shadow-lg h-[400px] flex flex-col">
                  <h3 className="text-lg font-semibold text-slate-200 mb-6">Asset Allocation</h3>
                  <div className="flex-1 min-h-0">
                    <PieChartConfig data={chartData} />
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
