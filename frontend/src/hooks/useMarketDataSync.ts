import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { toast } from 'sonner';
import { API_BASE } from '../lib/api';

const WS_BASE = API_BASE.replace(/^http/, 'ws');

export function useMarketDataSync() {
  const updateMarketPrices = usePortfolioStore((state) => state.updateMarketPrices);
  const [data, setData] = useState<{
    quotes?: Record<string, any>;
    gainers?: any[];
    as_of?: string;
    [key: string]: any;
  }>({});
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;

    // 1. HTTP snapshot for immediate rendering + resilient background polling
    const fetchMarketSnapshot = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/market/movers?index=NIFTY50&type=gainers&limit=8`);
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            const prices: Record<string, number> = {};
            const gainers: any[] = [];
            
            setData(prev => {
              const quotes: Record<string, any> = { ...(prev.quotes || {}) };

              json.data.forEach((item: any) => {
                const cleanSym = item.ticker || item.symbol.replace('.NS', '').replace('^', '');
                const quoteObj = {
                  price: item.ltp || item.price,
                  ltp: item.ltp || item.price,
                  change: item.change,
                  change_pct: item.change_pct,
                  volume: item.volume
                };
                quotes[cleanSym] = quoteObj;
                quotes[item.symbol] = quoteObj;
                quotes[`${cleanSym}.NS`] = quoteObj;
                prices[cleanSym] = item.ltp || item.price;
                prices[item.symbol] = item.ltp || item.price;
                gainers.push({
                  symbol: cleanSym,
                  price: item.ltp || item.price,
                  change_pct: item.change_pct
                });
              });

              return {
                ...prev,
                quotes,
                gainers,
                as_of: new Date().toISOString()
              };
            });

            updateMarketPrices(prices);
            setIsFetching(false);
          }
        }
      } catch (e) {
        console.warn("Market snapshot fetch warning:", e);
      }
    };

    fetchMarketSnapshot();
    // Poll every 8 seconds to ensure live quotes never stall
    pollInterval = setInterval(fetchMarketSnapshot, 8000);

    // 2. WebSocket real-time feed
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
            
            const pType = (payload.type || '').toUpperCase();
            if (pType === 'MARKET_UPDATE') {
              const ticks: any[] = Array.isArray(payload.data) ? payload.data : [];
              if (ticks.length > 0) {
                const prices: Record<string, number> = {};

                setData(prev => {
                  const quotes = { ...(prev.quotes || {}) };
                  ticks.forEach(t => {
                    const clean = (t.symbol || '').replace('.NS', '').replace('^', '');
                    const qObj = {
                      price: t.price,
                      ltp: t.price,
                      change: t.change,
                      change_pct: t.change_pct,
                      volume: t.volume
                    };
                    quotes[clean] = qObj;
                    quotes[t.symbol] = qObj;
                    quotes[`${clean}.NS`] = qObj;
                    prices[clean] = t.price;
                    prices[t.symbol] = t.price;
                  });

                  return {
                    ...prev,
                    quotes,
                    as_of: new Date().toISOString()
                  };
                });

                updateMarketPrices(prices);
              }
            }
          } catch (err: unknown) {
            console.error("Failed to parse market update", err);
          }
        };

        ws.onerror = () => {
          console.warn("WebSocket error, active HTTP poller is maintaining live feed.");
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch (err) {
        console.warn("WebSocket initialization warning:", err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [updateMarketPrices]);

  return { data, error, isFetching };
}
