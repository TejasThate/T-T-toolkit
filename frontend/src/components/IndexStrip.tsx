import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { formatPercent } from '@/lib/format';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useMarketDataSync } from '@/hooks/useMarketDataSync';
import { FlashingPrice } from './ui/FlashingPrice';

export function IndexStrip() {
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['marketIndices'],
    queryFn: () => fetchApi<any>('/api/market/indices'),
    // No more aggressive polling, relies on window focus or websocket
    staleTime: 60 * 1000, 
  });

  const { data: marketData } = useMarketDataSync();
  const quotes = marketData?.quotes as Record<string, any> || {};

  if (isLoading || !initialData) {
    return <div className="h-16 bg-[#141824] animate-pulse border-b border-white/5" />;
  }

  const indices = initialData.data || [];

  return (
    <div className="w-full bg-[#141824] border-b border-white/5 overflow-x-auto hide-scrollbar">
      <div className="flex px-4 py-3 gap-6 w-max min-w-full">
        {indices.map((idx: any) => {
          const liveQuote = quotes[idx.symbol];
          const price = liveQuote?.price || idx.value;
          const change = liveQuote?.change || idx.change;
          const changePct = liveQuote?.change_pct || idx.change_pct;

          return (
            <div key={idx.symbol} className="flex flex-col min-w-[120px]">
              <span className="text-xs text-slate-400 font-medium">{idx.name}</span>
              <div className="flex items-end gap-2 mt-1">
                <FlashingPrice price={price} className="text-sm font-bold text-slate-200" />
                <span className={`text-xs flex items-center ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {change >= 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                  {formatPercent(changePct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
