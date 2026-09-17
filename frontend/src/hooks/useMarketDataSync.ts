import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useMarketDataSync() {
  const updateMarketPrices = usePortfolioStore((state) => state.updateMarketPrices);

  const { data, error, isFetching } = useQuery({
    queryKey: ['marketData'],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return {};
      
      const response = await fetch(`${API_BASE}/api/market/quotes?symbols=HDFCBANK,TCS,INFY,RELIANCE`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    // Poll every 60 seconds to avoid yfinance rate limits
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (data) {
      // Map market data to a Record<string, number>
      const prices: Record<string, number> = {};
      Object.keys(data).forEach(symbol => {
        prices[symbol] = data[symbol].price;
      });
      
      updateMarketPrices(prices);
    }
  }, [data, updateMarketPrices]);

  return { data, error, isFetching };
}
