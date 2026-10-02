"use client";

import React, { useState } from "react";
import { Filter, Play, Save, Plus, Trash2, ArrowRight, Loader2, Info } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { formatINR, formatPercent } from "@/lib/format";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface Condition {
  id: string;
  indicator: string;
  operator: string;
  value: string;
}

const INDICATORS = [
  { value: "Close", label: "LTP (Close Price)" },
  { value: "Volume", label: "Volume" },
  { value: "RSI_14", label: "RSI (14)" },
  { value: "SMA_20", label: "SMA (20)" },
  { value: "SMA_50", label: "SMA (50)" },
  { value: "SMA_200", label: "SMA (200)" },
  { value: "MACD", label: "MACD Line" },
  { value: "MACD_Signal", label: "MACD Signal" },
  { value: "BBL_20_2.0", label: "Bollinger Lower" },
  { value: "BBU_20_2.0", label: "Bollinger Upper" },
  { value: "52W_High", label: "52W High" },
  { value: "52W_Low", label: "52W Low" },
];

const OPERATORS = [
  { value: ">", label: "Greater Than (>)" },
  { value: "<", label: "Less Than (<)" },
  { value: ">=", label: "Greater or Equal (>=)" },
  { value: "<=", label: "Less or Equal (<=)" },
  { value: "==", label: "Equals (==)" },
];

export default function ScreenerPage() {
  const [conditions, setConditions] = useState<Condition[]>([
    { id: '1', indicator: 'RSI_14', operator: '>', value: '60' },
    { id: '2', indicator: 'Close', operator: '>', value: 'SMA_200' }
  ]);

  const addCondition = () => {
    setConditions([...conditions, { id: Date.now().toString(), indicator: 'Close', operator: '>', value: '0' }]);
  };

  const updateCondition = (id: string, field: keyof Condition, val: string) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const saveAlert = useMutation({
    mutationFn: async () => {
      const payload = conditions.map(({ id, ...rest }) => rest);
      return fetchApi<any>('/api/screener/alerts', {
        method: 'POST',
        body: JSON.stringify({ name: 'My Custom Screen ' + new Date().toLocaleTimeString(), conditions: payload })
      });
    },
    onSuccess: () => {
      toast.success("Screen saved to your Alerts dashboard!");
    },
    onError: (err: any) => {
      toast.error(`Failed to save: ${err.message}`);
    }
  });

  const runScreener = useMutation({
    mutationFn: async () => {
      const payload = conditions.map(({ id, ...rest }) => rest);
      return fetchApi<any>('/api/screener/run', {
        method: 'POST',
        body: JSON.stringify({ conditions: payload })
      });
    },
    onError: (err: any) => {
      toast.error(`Screener failed: ${err.message}`);
    }
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl max-md:backdrop-blur-none max-md:bg-[#0e0f12] z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <Filter size={20} className="text-[#38BDF8]" />
          Technical Screener
        </h1>
        <div className="flex gap-3">
          <button 
            onClick={() => saveAlert.mutate()}
            disabled={saveAlert.isPending || conditions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors border border-white/10 disabled:opacity-50"
          >
            {saveAlert.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Screen
          </button>
          <button 
            onClick={() => runScreener.mutate()}
            disabled={runScreener.isPending || conditions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#38BDF8] hover:bg-[#20aae8] text-white rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(56,189,248,0.3)] disabled:opacity-50"
          >
            {runScreener.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Run Screen
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Query Builder */}
        <div className="w-full md:w-96 border-r border-white/5 bg-[#141824] flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between">
              Conditions
              <span className="bg-[#38BDF8]/20 text-[#38BDF8] px-2 py-0.5 rounded text-xs">{conditions.length}</span>
            </h2>
            
            <div className="space-y-4">
              {conditions.map((cond, index) => (
                <div key={cond.id} className="bg-[#0e0f12] border border-white/10 rounded-xl p-4 relative group">
                  {index > 0 && (
                    <div className="absolute -top-3 left-6 bg-[#141824] px-2 text-[10px] font-bold text-slate-500 uppercase">
                      AND
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Indicator</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38BDF8]"
                        value={cond.indicator}
                        onChange={(e) => updateCondition(cond.id, 'indicator', e.target.value)}
                      >
                        {INDICATORS.map(ind => (
                          <option key={ind.value} value={ind.value}>{ind.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-1/2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Operator</label>
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38BDF8]"
                          value={cond.operator}
                          onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)}
                        >
                          {OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-1/2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Value</label>
                        <input 
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38BDF8]"
                          value={cond.value}
                          onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                          placeholder="e.g. 50 or SMA_200"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeCondition(cond.id)}
                    className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            <button 
              onClick={addCondition}
              className="mt-4 w-full py-3 border border-dashed border-white/20 hover:border-[#38BDF8]/50 rounded-xl text-slate-400 hover:text-[#38BDF8] flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Add Condition
            </button>
          </div>
        </div>

        {/* Right Area: Results */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0e0f12]">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Screener Results</h2>
              <p className="text-sm text-slate-400 mt-1">
                {runScreener.isSuccess ? `Found ${runScreener.data.count} matches from NIFTY basket` : 'Run the screener to see results'}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 custom-scrollbar">
            {runScreener.isPending ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                <Loader2 size={40} className="animate-spin text-[#38BDF8]" />
                <p>Evaluating indicators across basket...</p>
              </div>
            ) : runScreener.isSuccess && runScreener.data?.results?.length > 0 ? (
              <div className="bg-[#141824] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                      <th className="p-4 font-semibold">Symbol</th>
                      <th className="p-4 font-semibold">LTP</th>
                      <th className="p-4 font-semibold hidden md:table-cell">Volume</th>
                      <th className="p-4 font-semibold">RSI (14)</th>
                      <th className="p-4 font-semibold hidden lg:table-cell">SMA (20)</th>
                      <th className="p-4 font-semibold hidden lg:table-cell">SMA (50)</th>
                      <th className="p-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {runScreener.data.results.map((stock: any, idx: number) => (
                      <tr key={idx} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-semibold text-white">{stock.symbol}</td>
                        <td className="p-4 text-slate-200">{formatINR(stock.ltp)}</td>
                        <td className="p-4 text-slate-400 hidden md:table-cell">{stock.volume?.toLocaleString() || '-'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            stock.rsi > 70 ? 'bg-rose-500/20 text-rose-400' :
                            stock.rsi < 30 ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-slate-500/20 text-slate-300'
                          }`}>
                            {stock.rsi ? stock.rsi.toFixed(2) : '-'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 hidden lg:table-cell">{stock.sma_20 ? formatINR(stock.sma_20) : '-'}</td>
                        <td className="p-4 text-slate-400 hidden lg:table-cell">{stock.sma_50 ? formatINR(stock.sma_50) : '-'}</td>
                        <td className="p-4 text-right">
                          <button className="text-[#38BDF8] hover:text-white transition-colors flex items-center justify-end gap-1 text-xs font-medium w-full">
                            Chart <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : runScreener.isSuccess ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Info size={40} className="mb-4 opacity-20" />
                <p>No stocks matched your criteria.</p>
                <button 
                  onClick={() => setConditions([{ id: '1', indicator: 'RSI_14', operator: '<', value: '30' }])}
                  className="mt-4 text-[#38BDF8] text-sm hover:underline"
                >
                  Try an oversold screen (RSI &lt; 30)
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Filter size={48} className="mb-6 opacity-10" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">Build Your Screener</h3>
                <p className="max-w-md text-center text-sm">
                  Add technical conditions on the left panel. You can compare indicators against static numbers or other indicators (e.g. Close &gt; SMA_200).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
