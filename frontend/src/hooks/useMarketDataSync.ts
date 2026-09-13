import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore';

export function useMarketDataSync() {
  const updateMarketPrices = usePortfolioStore((state) => state.updateMarketPrices);

  const { data, error, isFetching } = useQuery({
    queryKey: ['marketData'],
    queryFn: async () => {
      const response = await fetch('http://127.0.0.1:8000/api/market/live');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    // Poll every 15 seconds
    refetchInterval: 15 * 1000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (data && data.data) {
      // Map market data to a Record<string, number>
      const prices: Record<string, number> = {};
      Object.keys(data.data).forEach(symbol => {
        prices[symbol] = data.data[symbol].ltp;
      });
      
      updateMarketPrices(prices);
    }
  }, [data, updateMarketPrices]);

  return { data, error, isFetching };
}
