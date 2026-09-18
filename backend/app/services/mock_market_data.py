from typing import List, Dict, Any
import random
from .market_data_provider import MarketDataProvider

class MockMarketDataProvider(MarketDataProvider):
    """
    Mock implementation of MarketDataProvider for local development.
    Generates random realistic-looking data.
    """
    
    def __init__(self):
        self.base_prices = {
            "RELIANCE": 2900.0,
            "TCS": 3800.0,
            "HDFCBANK": 1450.0,
            "INFY": 1600.0,
            "ICICIBANK": 1050.0,
        }

    async def get_live_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        result = {}
        for sym in symbols:
            base = self.base_prices.get(sym, 1000.0)
            # Random fluctuation +/- 2%
            change_pct = (random.random() - 0.5) * 4
            ltp = base * (1 + change_pct / 100)
            result[sym] = {
                "symbol": sym,
                "ltp": round(ltp, 2),
                "change": round(ltp - base, 2),
                "change_pct": round(change_pct, 2)
            }
        return result

    async def get_top_gainers(self, limit: int = 5) -> List[Dict[str, Any]]:
        symbols = ["TATASTEEL", "WIPRO", "HCLTECH", "SBIN", "BAJFINANCE"]
        return [
            {
                "symbol": sym,
                "ltp": round(random.uniform(500, 3000), 2),
                "change": round(random.uniform(10, 100), 2),
                "change_pct": round(random.uniform(2, 8), 2)
            }
            for sym in symbols[:limit]
        ]

    async def get_top_losers(self, limit: int = 5) -> List[Dict[str, Any]]:
        symbols = ["ITC", "HINDUNILVR", "ASIANPAINT", "MARUTI", "SUNPHARMA"]
        return [
            {
                "symbol": sym,
                "ltp": round(random.uniform(500, 3000), 2),
                "change": round(random.uniform(-100, -10), 2),
                "change_pct": round(random.uniform(-8, -2), 2)
            }
            for sym in symbols[:limit]
        ]

    async def get_index_data(self, index_name: str) -> Dict[str, Any]:
        if index_name == "NIFTY 50":
            base = 22000.0
        elif index_name == "SENSEX":
            base = 73000.0
        else:
            base = 10000.0
            
        change_pct = (random.random() - 0.5) * 2
        ltp = base * (1 + change_pct / 100)
        
        return {
            "name": index_name,
            "ltp": round(ltp, 2),
            "change": round(ltp - base, 2),
            "change_pct": round(change_pct, 2)
        }
