import yfinance as yf
import asyncio
import time
import math
import logging

logger = logging.getLogger(__name__)

# Local in-memory cache to prevent yfinance rate limits
# Format: { "key": {"data": ..., "expires_at": float} }
_cache = {}

NIFTY_50_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS",
    "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "BAJFINANCE.NS", "LARSEN.NS",
    "KOTAKBANK.NS", "AXISBANK.NS", "HCLTECH.NS", "ASIANPAINT.NS", "MARUTI.NS",
    "SUNPHARMA.NS", "TITAN.NS", "ULTRACEMCO.NS", "BAJAJFINSV.NS", "TATAMOTORS.NS"
]

def get_from_cache(key: str):
    if key in _cache:
        item = _cache[key]
        if time.time() < item["expires_at"]:
            return item["data"]
        else:
            del _cache[key]
    return None

def set_to_cache(key: str, data: any, ttl_seconds: int = 60):
    _cache[key] = {
        "data": data,
        "expires_at": time.time() + ttl_seconds
    }

async def fetch_quotes(symbols: list[str]) -> dict[str, dict]:
    """
    Fetch current price and percentage change for a list of symbols.
    Returns: { "RELIANCE.NS": {"price": 2500.5, "change_pct": 1.2}, ... }
    """
    if not symbols:
        return {}

    # Format symbols for yfinance (append .NS if missing and not .BO)
    formatted_symbols = []
    for sym in symbols:
        sym = sym.strip().upper()
        if not sym.endswith(".NS") and not sym.endswith(".BO"):
            sym = f"{sym}.NS"
        formatted_symbols.append(sym)
        
    # Check cache first
    cache_key = f"quotes_{','.join(sorted(formatted_symbols))}"
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    def _do_fetch():
        tickers = " ".join(formatted_symbols)
        try:
            # We fetch 5 days to ensure we have the previous close for calculation
            data = yf.download(tickers, period="5d", progress=False)
            if data.empty or 'Close' not in data:
                return {}
                
            closes = data['Close']
            
            results = {}
            if len(formatted_symbols) == 1:
                if len(closes) >= 2:
                    current = closes.iloc[-1]
                    prev = closes.iloc[-2]
                    change = ((current - prev) / prev) * 100 if prev else 0.0
                    if not math.isnan(current):
                        results[formatted_symbols[0]] = {
                            "price": float(current),
                            "change_pct": float(change)
                        }
            else:
                for sym in formatted_symbols:
                    if sym in closes:
                        series = closes[sym].dropna()
                        if len(series) >= 2:
                            current = series.iloc[-1]
                            prev = series.iloc[-2]
                            change = ((current - prev) / prev) * 100 if prev else 0.0
                            if not math.isnan(current):
                                results[sym] = {
                                    "price": float(current),
                                    "change_pct": float(change)
                                }
            return results
        except Exception as e:
            logger.error(f"yfinance download error: {e}")
            return {}

    # Run blocking yfinance call in thread
    results = await asyncio.to_thread(_do_fetch)
    
    if results:
        set_to_cache(cache_key, results, ttl_seconds=60)
        
    return results

async def fetch_top_gainers(limit: int = 5) -> list[dict]:
    """
    Fetch top gainers from the predefined NIFTY 50 basket.
    """
    cache_key = "top_gainers"
    cached = get_from_cache(cache_key)
    if cached:
        return cached[:limit]

    quotes = await fetch_quotes(NIFTY_50_SYMBOLS)
    if not quotes:
        return []

    # Format into list and sort by change_pct
    gainers = []
    for sym, data in quotes.items():
        gainers.append({
            "symbol": sym.replace(".NS", ""),
            "price": data["price"],
            "change_pct": data["change_pct"]
        })
        
    # Sort descending
    gainers.sort(key=lambda x: x["change_pct"], reverse=True)
    
    set_to_cache(cache_key, gainers, ttl_seconds=120)  # cache gainers for 2 mins
    
    return gainers[:limit]
