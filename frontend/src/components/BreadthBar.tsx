import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

export function BreadthBar() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketBreadth'],
    queryFn: () => fetchApi<any>('/api/market/breadth?index=NIFTY50'),
    
  });

  if (isLoading || !data) {
    return <div className="h-24 bg-[#141824] rounded-xl animate-pulse" />;
  }

  const { advances, declines, unchanged } = data.data;
  const total = advances + declines + unchanged;
  const advPct = (advances / total) * 100;
  const decPct = (declines / total) * 100;
  const uncPct = (unchanged / total) * 100;

  return (
    <div className="bg-[#141824] rounded-xl p-4 border border-white/5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">Market Breadth (NIFTY 50)</h3>
      <div className="flex w-full h-3 rounded-full overflow-hidden mb-3">
        <div style={{ width: `${advPct}%` }} className="bg-emerald-500" />
        <div style={{ width: `${uncPct}%` }} className="bg-slate-500" />
        <div style={{ width: `${decPct}%` }} className="bg-rose-500" />
      </div>
      <div className="flex justify-between text-xs font-medium">
        <div className="text-emerald-400">{advances} Adv</div>
        <div className="text-slate-400">{unchanged} Unc</div>
        <div className="text-rose-400">{declines} Dec</div>
      </div>
    </div>
  );
}
