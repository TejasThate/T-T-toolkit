import yfinance as yf
from typing import List, Dict, Any
from datetime import datetime
import pytz
from app.providers.base import MarketDataProvider
import asyncio
from concurrent.futures import ThreadPoolExecutor

class YFinanceProvider(MarketDataProvider):
    def __init__(self):
        self.ist = pytz.timezone('Asia/Kolkata')
        self.executor = ThreadPoolExecutor(max_workers=5)

    async def get_index_constituents(self, index_name: str) -> List[str]:
        # yfinance doesn't natively provide index constituents well, usually this relies on NSE
        return []

    async def get_quotes(self, symbols: List[str]) -> List[Tick]:
        """Fetch quotes in batch using yf.download with fallback to in-memory Indian market state."""
        if not symbols:
            return []
            
        from app.providers.base import Tick
        from app.services.live_market_state import market_state
        ticks: List[Tick] = []
        now = datetime.now(self.ist)

        # Fallback to high-fidelity in-memory quotes first for sub-millisecond response
        for sym in symbols:
            clean = sym.replace(".NS", "").replace(".BO", "")
            lookup = f"^{clean}" if f"^{clean}" in market_state.quotes else clean
            if lookup in market_state.quotes:
                q = market_state.quotes[lookup]
                ticks.append(Tick(
                    symbol=sym,
                    price=float(q.get("ltp", q.get("prev_close", 0.0))),
                    change_pct=float(q.get("change_pct", 0.0)),
                    volume=float(q.get("volume", 0.0)),
                    ts=now,
                    source="yf_fallback",
                    is_live=False
                ))

        if ticks:
            return ticks

        # Ensure symbols have .NS suffix for Indian market
        yf_symbols = [s if s.endswith('.NS') or s.endswith('.BO') else f"{s}.NS" for s in symbols]
        
        def fetch():
            data = yf.download(tickers=" ".join(yf_symbols), period="2d", group_by="ticker", threads=True, progress=False)
            return data

        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(self.executor, fetch)
            
            for i, sym in enumerate(symbols):
                yf_sym = yf_symbols[i]
                try:
                    df = data[yf_sym] if len(symbols) > 1 else data
                    if df is not None and not df.empty and len(df) >= 1:
                        latest = df.iloc[-1]
                        prev_close = df.iloc[-2]["Close"] if len(df) >= 2 else latest["Close"]
                        curr_price = float(latest["Close"])
                        pct = ((curr_price - prev_close) / prev_close) * 100.0 if prev_close else 0.0
                        vol = float(latest.get("Volume", 0.0))
                        ticks.append(Tick(
                            symbol=sym,
                            price=curr_price,
                            change_pct=round(pct, 2),
                            volume=vol,
                            ts=now,
                            source="yfinance",
                            is_live=False
                        ))
                except Exception:
                    continue
            return ticks
        except Exception as e:
            print(f"YFinance provider error: {e}")
            return ticks

    async def get_history(self, symbol: str, period: str = "1mo", interval: str = "1d") -> List[Dict[str, Any]]:
        yf_sym = symbol if symbol.endswith('.NS') or symbol.endswith('.BO') else f"{symbol}.NS"
        
        def fetch():
            ticker = yf.Ticker(yf_sym)
            return ticker.history(period=period, interval=interval)
            
        try:
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(self.executor, fetch)
            
            if df.empty:
                return []
                
            history = []
            for date, row in df.iterrows():
                history.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "open": row["Open"],
                    "high": row["High"],
                    "low": row["Low"],
                    "close": row["Close"],
                    "volume": row["Volume"]
                })
            return history
        except Exception as e:
            print(f"YFinance history error for {symbol}: {e}")
            return []

    async def get_market_status(self) -> Dict[str, Any]:
        # yfinance doesn't have a reliable market status endpoint, rely on NSE
        return {"market_status": "UNKNOWN"}
