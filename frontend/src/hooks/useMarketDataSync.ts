import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { toast } from 'sonner';

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, 'ws');

export function useMarketDataSync() {
  const updateMarketPrices = usePortfolioStore((state) => state.updateMarketPrices);
  const [data, setData] = useState<any>({});
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(`${WS_BASE}/ws/market`);

      ws.onopen = () => {
        if (isMounted) {
          setIsFetching(false);
          setError(null);
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data);
          
          // Phase 5: Handle Alert Triggered
          if (payload.type === 'alert_triggered') {
            const msg = `${payload.symbol} has crossed your alert target of ₹${payload.target_value}!`;
            toast.success(`🚨 Alert Triggered!`, {
              description: msg,
              duration: 10000,
            });
            return;
          }
          
          if (payload.type === 'market_update') {
            setData(payload);
            
            // Map market data to a Record<string, number> for portfolio
            if (payload.quotes) {
              const prices: Record<string, number> = {};
              Object.keys(payload.quotes).forEach(symbol => {
                prices[symbol] = payload.quotes[symbol].ltp;
              });
              updateMarketPrices(prices);
            }
          }
        } catch (err: any) {
          console.error("Failed to parse market update", err);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error", e);
        if (isMounted) setError(new Error("WebSocket error"));
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsFetching(true);
          // Try to reconnect in 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [updateMarketPrices]);

  return { data, error, isFetching };
}
