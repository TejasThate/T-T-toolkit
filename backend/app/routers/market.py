from fastapi import APIRouter, Query, HTTPException, Depends
from typing import List, Dict, Any, Optional
import datetime
import pytz

router = APIRouter(prefix="/market", tags=["Market Trends"])

# Simulated Data Provider (in a real app, this would use the Provider Chain from Phase 0)
# We will use yfinance directly for now as a fallback since NseProvider isn't fully robust here yet.
from app.providers.yfinance_provider import YFinanceProvider
yf_provider = YFinanceProvider()

# Caching decorators would go here
def get_standard_envelope(data, source="yfinance", is_stale=False):
    ist = pytz.timezone('Asia/Kolkata')
    return {
        "data": data,
        "as_of": datetime.datetime.now(ist).isoformat(),
        "source": source,
        "is_stale": is_stale,
        "market_status": "OPEN" # In real app, call get_market_status()
    }

@router.get("/movers")
async def get_movers(
    index: str = Query("NIFTY50", description="Index to fetch constituents from"),
    type: str = Query("gainers", description="gainers|losers|active|52w_high|52w_low"),
    limit: int = Query(10, ge=1, le=50)
):
    # Simulated NIFTY50 constituents
    NIFTY_50_SYMBOLS = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS",
        "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "BAJFINANCE.NS", "LARSEN.NS"
    ]
    
    quotes = await yf_provider.get_quotes(NIFTY_50_SYMBOLS)
    
    # In a real app, we'd sort these quotes by change_pct
    movers = []
    # Mocking sort logic since yfinance get_quotes isn't returning rich data yet
    movers = [
        {
            "symbol": "RELIANCE.NS",
            "name": "Reliance Industries",
            "sector": "Energy",
            "ltp": 2500.00,
            "change": 25.50,
            "change_pct": 1.03,
            "volume": 1200000,
            "value_traded": 3000000000,
            "day_high": 2510.00,
            "day_low": 2480.00,
            "prev_close": 2474.50,
            "week52_high": 3000.00,
            "week52_low": 2000.00,
            "pct_from_52w_high": -16.6,
            "volume_vs_20d_avg": 1.2
        }
    ]
    
    return get_standard_envelope(movers)

@router.get("/indices")
async def get_indices():
    indices = [
        {"symbol": "^NSEI", "name": "NIFTY 50", "value": 22000.0, "change": 150.0, "change_pct": 0.68, "advances": 35, "declines": 15},
        {"symbol": "^BSESN", "name": "SENSEX", "value": 72000.0, "change": 400.0, "change_pct": 0.55, "advances": 20, "declines": 10},
        {"symbol": "^NSEBANK", "name": "BANK NIFTY", "value": 46000.0, "change": -50.0, "change_pct": -0.11, "advances": 4, "declines": 8},
        {"symbol": "^INDIAVIX", "name": "INDIA VIX", "value": 14.5, "change": -0.2, "change_pct": -1.36, "advances": 0, "declines": 0}
    ]
    return get_standard_envelope(indices)

@router.get("/breadth")
async def get_breadth(index: str = "NIFTY50"):
    breadth = {
        "advances": 35,
        "declines": 13,
        "unchanged": 2,
        "ratio": 2.69
    }
    return get_standard_envelope(breadth)

@router.get("/sectors")
async def get_sectors():
    sectors = [
        {"sector": "IT", "change_pct": 1.5},
        {"sector": "Financials", "change_pct": -0.2},
        {"sector": "Energy", "change_pct": 0.8},
        {"sector": "Auto", "change_pct": 2.1},
        {"sector": "Pharma", "change_pct": 0.5},
        {"sector": "FMCG", "change_pct": -0.5}
    ]
    return get_standard_envelope(sectors)

@router.get("/status")
async def get_status():
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.datetime.now(ist)
    status = {
        "status": "OPEN",
        "next_open": (now + datetime.timedelta(days=1)).isoformat(),
        "next_close": (now + datetime.timedelta(hours=4)).isoformat(),
        "holiday": None
    }
    return get_standard_envelope(status)

@router.get("/stock/{symbol}/quick")
async def get_quick_quote(symbol: str):
    history = await yf_provider.get_history(symbol, period="1mo", interval="1d")
    sparkline = [day["close"] for day in history] if history else []
    
    quote = {
        "symbol": symbol,
        "ltp": sparkline[-1] if sparkline else 0,
        "sparkline": sparkline[-30:] # last 30 days
    }
    return get_standard_envelope(quote)
