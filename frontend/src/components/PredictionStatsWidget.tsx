"use client";

import { useEffect, useState } from "react";
import { Activity, Target, Zap, Clock } from "lucide-react";

interface PredictionStats {
  total_evaluated: number;
  correct_predictions: number;
  hit_rate_percentage: number;
  retrain_status: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function PredictionStatsWidget() {
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/market/prediction-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch prediction stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-white/10 w-1/3 rounded mb-4"></div>
        <div className="h-8 bg-white/10 w-1/2 rounded"></div>
      </div>
    );
  }

  const hitRate = stats?.hit_rate_percentage ?? 0;
  
  // Decide color based on hit rate (e.g. >50 is green, <50 is red)
  const hitRateColor = hitRate >= 50 ? "text-emerald-400" : "text-amber-400";

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/15 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Target size={14} className="text-[#6C5CE7]" /> Model Accuracy
        </h3>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-slate-400 mb-1">Historical Hit Rate</div>
          <div className={`text-2xl font-bold ${hitRateColor}`}>
            {hitRate.toFixed(1)}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 mb-1">Total Predictions</div>
          <div className="text-lg font-medium text-white">
            {stats?.total_evaluated ?? 0}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Zap size={12} className="text-yellow-400" /> XGBoost Active
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          <Clock size={12} /> Adaptive Learning
        </span>
      </div>
    </div>
  );
}
