import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { toast } from 'sonner';
import { API_BASE } from '../lib/api';

const WS_BASE = API_BASE.replace(/^http/, 'ws');

export function useMarketDataSync() {
  const updateMarketPrices = usePortfolioStore((state) => state.updateMarketPrices);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout;

    // 1. Initial HTTP snapshot for instant rendering
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/market/movers?index=NIFTY50&type=gainers&limit=6`);
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            const quotes: Record<string, any> = {};
            const prices: Record<string, number> = {};
            const gainers: any[] = [];
            
            json.data.forEach((item: any) => {
              quotes[item.symbol] = {
                price: item.ltp,
                ltp: item.ltp,
                change: item.change,
                change_pct: item.change_pct,
                volume: item.volume
              };
              prices[item.symbol] = item.ltp;
              gainers.push({
                symbol: item.symbol,
                price: item.ltp,
                change_pct: item.change_pct
              });
            });

            setData({
              quotes,
              gainers,
              as_of: new Date().toISOString()
            });
            updateMarketPrices(prices);
            setIsFetching(false);
          }
        }
      } catch (e) {
        console.warn("Initial market snapshot fetch error:", e);
      }
    };

    fetchInitialData();

    // 2. WebSocket live feed
    const connect = () => {
      try {
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
              
              if (payload.quotes) {
                const prices: Record<string, number> = {};
                Object.keys(payload.quotes).forEach(symbol => {
                  prices[symbol] = payload.quotes[symbol].ltp || payload.quotes[symbol].price;
                });
                updateMarketPrices(prices);
              }
            }
          } catch (err: unknown) {
            console.error("Failed to parse market update", err);
          }
        };

        ws.onerror = (e) => {
          console.warn("WebSocket error, falling back to HTTP snapshots");
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch (err) {
        console.warn("WebSocket initialization error:", err);
      }
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
