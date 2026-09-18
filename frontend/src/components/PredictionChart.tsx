'use client';
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

interface PredictionData {
  symbol: string;
  direction: string;
  confidence: number;
  current_price: number;
  projected_price_3d: number;
  historical_last_3: number[];
  signals: {
    sma: string;
    rsi: string;
    volume: string;
    arima: string;
  };
  raw_score: number;
}

export function PredictionChart({ symbol, token }: { symbol: string, token: string }) {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchPrediction = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/market/predict/${symbol}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || 'Failed to fetch prediction');
        if (mounted) setData(json);
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPrediction();
    return () => { mounted = false; };
  }, [symbol, token]);

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-[#141824] rounded-xl border border-white/5 mt-4">
        <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 flex items-start gap-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400 mt-4">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Build chart data
  const chartData = [
    { day: 'T-2', price: data.historical_last_3[0] },
    { day: 'T-1', price: data.historical_last_3[1] },
    { day: 'Today', price: data.historical_last_3[2], projected: data.historical_last_3[2] }, // Connect historical to projected
    { day: 'T+3 (Proj)', projected: data.projected_price_3d }
  ];

  // Colors based on trend
  const isUp = data.direction === 'Up';
  const isDown = data.direction === 'Down';
  const color = isUp ? '#22C55E' : isDown ? '#EF4444' : '#f5a524';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Activity;

  return (
    <div className="w-full max-w-lg bg-[#141824] rounded-xl border border-white/5 overflow-hidden mt-4 shadow-lg">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs text-slate-300">
            {symbol.substring(0, 3)}
          </div>
          <div>
            <h4 className="font-medium text-sm text-slate-200 leading-none mb-1">{symbol}</h4>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">AI Trend Projection</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 mb-1" style={{ color }}>
            <Icon size={14} />
            <span className="font-bold text-sm">{data.confidence}% Conf.</span>
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">3-Day Horizon</div>
        </div>
      </div>
      
      <div className="p-4 h-52 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={5} />
            <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0e0f12', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            {/* Historical Line */}
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#64748b" 
              strokeWidth={2} 
              dot={{ r: 4, fill: '#64748b', strokeWidth: 0 }} 
            />
            {/* Dashed Projection Line */}
            <Line 
              type="monotone" 
              dataKey="projected" 
              stroke={color} 
              strokeWidth={2} 
              strokeDasharray="5 5" 
              dot={{ r: 4, fill: color, strokeWidth: 0 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="p-3 bg-white/[0.01] border-t border-white/5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">SMA Trend</span>
          <span className="text-slate-300 font-medium bg-white/5 px-2 py-0.5 rounded">{data.signals.sma.split(' ')[0]}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">RSI Mom.</span>
          <span className="text-slate-300 font-medium bg-white/5 px-2 py-0.5 rounded">{data.signals.rsi.split(' ')[0]}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Volume</span>
          <span className="text-slate-300 font-medium bg-white/5 px-2 py-0.5 rounded">{data.signals.volume.split(' ')[0]}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">ARIMA</span>
          <span className="text-slate-300 font-medium bg-white/5 px-2 py-0.5 rounded">{data.signals.arima.split(' ')[0]}</span>
        </div>
      </div>
    </div>
  );
}
