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
    "SUNPHARMA.NS", "TITAN.NS", "ULTRACEMCO.NS", "BAJAJFINSV.NS", "TATAMOTORS.NS",
    "NTPC.NS", "M&M.NS", "POWERGRID.NS", "NESTLEIND.NS", "TATASTEEL.NS",
    "TECHM.NS", "HINDUNILVR.NS", "WIPRO.NS", "INDUSINDBK.NS", "GRASIM.NS",
    "ONGC.NS", "HDFCLIFE.NS", "JSWSTEEL.NS", "ADANIENT.NS", "ADANIPORTS.NS",
    "HINDALCO.NS", "DRREDDY.NS", "CIPLA.NS", "APOLLOHOSP.NS", "BRITANNIA.NS",
    "COALINDIA.NS", "EICHERMOT.NS", "HEROMOTOCO.NS", "TATACONSUM.NS", "DIVISLAB.NS",
    "BAJAJ-AUTO.NS", "UPL.NS", "BPCL.NS", "SHREECEM.NS", "TRENT.NS"
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

    formatted_symbols = []
    for sym in symbols:
        sym = sym.strip().upper()
        if not sym.endswith(".NS") and not sym.endswith(".BO") and not sym.startswith("^"):
            sym = f"{sym}.NS"
        formatted_symbols.append(sym)
        
    results = {}
    missing_symbols = []
    
    for sym in formatted_symbols:
        cached = get_from_cache(f"quote_{sym}")
        if cached:
            results[sym] = cached
        else:
            missing_symbols.append(sym)

    if not missing_symbols:
        return results

    def _do_fetch():
        tickers = " ".join(missing_symbols)
        try:
            # We fetch 1 day, 1 minute interval to get live intraday prices
            data = yf.download(tickers, period="5d", interval="1m", progress=False)
            if data.empty or 'Close' not in data:
                # fallback to daily if 1m fails
                data = yf.download(tickers, period="5d", progress=False)
                if data.empty or 'Close' not in data:
                    return {}
                
            closes = data['Close']
            
            fetched = {}
            for sym in missing_symbols:
                if sym in closes:
                    series = closes[sym] if len(missing_symbols) > 1 else closes
                    series = series.dropna()
                    if len(series) >= 2:
                        current = float(series.iloc[-1])
                        # Get yesterday's close by fetching 5d daily data just for the previous close
                        daily_data = yf.download(sym, period="5d", progress=False)
                        if not daily_data.empty and 'Close' in daily_data:
                            daily_closes = daily_data['Close'].dropna()
                            if len(daily_closes) >= 2:
                                prev = float(daily_closes.iloc[-2])
                                change = ((current - prev) / prev) * 100 if prev else 0.0
                                if not math.isnan(current):
                                    fetched[sym] = {
                                        "price": float(current),
                                        "change_pct": float(change)
                                    }
            return fetched
        except Exception as e:
            logger.error(f"yfinance download error: {e}")
            return {}

    fetched_results = await asyncio.to_thread(_do_fetch)
    
    for sym, data in fetched_results.items():
        results[sym] = data
        set_to_cache(f"quote_{sym}", data, ttl_seconds=60)
        
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

async def fetch_top_losers(limit: int = 5) -> list[dict]:
    """
    Fetch top losers from the predefined NIFTY 50 basket.
    """
    cache_key = "top_losers"
    cached = get_from_cache(cache_key)
    if cached:
        return cached[:limit]

    quotes = await fetch_quotes(NIFTY_50_SYMBOLS)
    if not quotes:
        return []

    losers = []
    for sym, data in quotes.items():
        losers.append({
            "symbol": sym.replace(".NS", ""),
            "price": data["price"],
            "change_pct": data["change_pct"]
        })
        
    losers.sort(key=lambda x: x["change_pct"])
    
    set_to_cache(cache_key, losers, ttl_seconds=120)
    
    return losers[:limit]

async def fetch_index_data(symbol: str) -> dict:
    """
    Fetch index data. symbol should be ^NSEI for NIFTY 50, ^BSESN for SENSEX
    """
    cache_key = f"index_{symbol}"
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    mapping = {
        "NIFTY 50": "^NSEI",
        "SENSEX": "^BSESN"
    }
    actual_sym = mapping.get(symbol, symbol)
    
    quotes = await fetch_quotes([actual_sym])
    if actual_sym in quotes:
        data = {
            "name": symbol,
            "value": quotes[actual_sym]["price"],
            "change": round((quotes[actual_sym]["change_pct"] / 100) * quotes[actual_sym]["price"], 2),
            "change_pct": quotes[actual_sym]["change_pct"]
        }
        set_to_cache(cache_key, data, ttl_seconds=60)
        return data
    return {"name": symbol, "value": 0, "change": 0, "change_pct": 0}
