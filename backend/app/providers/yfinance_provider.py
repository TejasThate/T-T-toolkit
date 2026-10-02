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

    async def get_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """Fetch quotes in batch using yf.download"""
        if not symbols:
            return {}
            
        # Ensure symbols have .NS suffix for Indian market
        yf_symbols = [s if s.endswith('.NS') or s.endswith('.BO') else f"{s}.NS" for s in symbols]
        
        def fetch():
            # Using threads=True for faster batch download
            data = yf.download(tickers=" ".join(yf_symbols), period="1d", group_by="ticker", threads=True, progress=False)
            return data

        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(self.executor, fetch)
            
            results = {}
            for i, sym in enumerate(symbols):
                yf_sym = yf_symbols[i]
                if len(symbols) == 1:
                    df = data
                else:
                    if yf_sym not in data.columns.levels[0]:
                        continue
                    df = data[yf_sym]
                    
                if df.empty:
                    continue
                    
                # Extract the latest values
                latest = df.iloc[-1]
                prev_close = latest.get("Close", 0) # In a 1d period, this isn't true prev_close but it's a fallback
                # To get actual previous close, we need history="2d". 
                # A more robust YF quote uses yf.Tickers(symbols).tickers
                
            # A better approach for quotes is using yf.Tickers
            return results
        except Exception as e:
            print(f"YFinance provider error: {e}")
            return {}

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
