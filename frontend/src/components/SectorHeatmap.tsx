import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { formatPercent } from '@/lib/format';

export function SectorHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketSectors'],
    queryFn: () => fetchApi<any>('/api/market/sectors'),
    
  });

  if (isLoading || !data) {
    return <div className="h-48 bg-[#141824] rounded-xl animate-pulse" />;
  }

  const sectors = data.data;

  const getColor = (pct: number) => {
    if (pct >= 1.5) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (pct > 0) return 'bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20';
    if (pct === 0) return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    if (pct > -1.5) return 'bg-rose-500/10 text-rose-400/80 border-rose-500/20';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  };

  return (
    <div className="bg-[#141824] rounded-xl p-4 border border-white/5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">Sector Performance</h3>
      <div className="flex flex-wrap gap-2">
        {sectors.map((s: any) => (
          <div key={s.sector} className={`px-2 py-1 rounded text-xs font-medium border ${getColor(s.change_pct)}`}>
            {s.sector} {formatPercent(s.change_pct)}
          </div>
        ))}
      </div>
    </div>
  );
}
