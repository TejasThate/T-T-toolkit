import { useEffect, useState, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  last_updated: string;
}

export function useLiveQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (symbols.length === 0) return;

    let retryTimeout: NodeJS.Timeout;
    
    const connect = () => {
      const symbolsQuery = symbols.join(',');
      const url = `${API_BASE}/stream/quotes?symbols=${symbolsQuery}`;
      
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Object.keys(data).length > 0) {
            setQuotes(prev => ({
              ...prev,
              ...data
            }));
          }
        } catch (e) {
          console.error("Error parsing quote stream", e);
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        // Reconnect with backoff
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    const handleVisibilityChange = () => {
      if (document.hidden && eventSourceRef.current) {
        eventSourceRef.current.close();
        setIsConnected(false);
      } else if (!document.hidden) {
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearTimeout(retryTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [symbols.join(',')]);

  return { quotes, isConnected };
}
