import React, { useEffect } from 'react';
import { X, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { formatINR, formatPercent } from '@/lib/format';

interface StockDrawerProps {
  symbol: string | null;
  onClose: () => void;
}

export function StockDrawer({ symbol, onClose }: StockDrawerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['quickQuote', symbol],
    queryFn: () => fetchApi<any>(`/api/market/stock/${symbol}/quick`),
    enabled: !!symbol,
  });

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!symbol) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-[#141824] border-l border-white/5 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h2 className="text-lg font-bold text-slate-100">{symbol.replace('.NS', '')}</h2>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-32 bg-white/5 rounded" />
                <div className="h-32 w-full bg-white/5 rounded-xl" />
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {formatINR(data.data.ltp)}
                  </div>
                </div>

                <div className="bg-[#0e0f12] rounded-xl p-4 border border-white/5 h-48 flex items-center justify-center text-slate-500 text-sm">
                  {/* Sparkline placeholder */}
                  Sparkline will render here
                </div>
                
                <div className="pt-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full py-2 px-4 bg-[#6C5CE7] hover:bg-[#5f51d3] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <TrendingUp size={16} />
                      Set Alert
                    </button>
                    <button className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <ExternalLink size={16} />
                      View Full Details
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">Failed to load stock data.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
