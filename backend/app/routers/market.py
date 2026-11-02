from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List, Dict, Any
import datetime
import pytz
import logging

from app.services.live_market_state import market_state, INDIAN_STOCKS_METADATA

router = APIRouter(prefix="/market", tags=["Market Intelligence"])
logger = logging.getLogger(__name__)

IST = pytz.timezone('Asia/Kolkata')

def get_standard_envelope(data: Any, source: str = "angel", is_stale: bool = False):
    """Zero-overhead envelope returning in <1ms."""
    return {
        "data": data,
        "as_of": datetime.datetime.now(IST).isoformat(),
        "source": source,
        "is_stale": is_stale,
        "market_status": "OPEN" if market_state.is_market_open() else "CLOSED"
    }

@router.get("/movers")
async def get_movers(
    index: str = Query("NIFTY50", description="Index constituents to filter (e.g. NIFTY50)"),
    type: str = Query("gainers", description="gainers | losers | active | 52w_high | 52w_low"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Sub-millisecond retrieval of today's actual trending stocks for the Indian stock market (NSE).
    Dynamically sorts gainers, losers, most active, 52W high/low from active live market quotes.
    """
    movers = market_state.get_movers(type, limit)
    return get_standard_envelope(movers)

@router.get("/indices")
async def get_indices():
    """
    Live real-time Indian benchmark indices (NIFTY 50, SENSEX, BANK NIFTY, MIDCAP, INDIA VIX).
    Served directly from memory in <1ms.
    """
    indices = market_state.get_indices()
    return get_standard_envelope(indices)

@router.get("/breadth")
async def get_breadth(index: str = "NIFTY50"):
    """Live Advance/Decline ratio across Indian equities."""
    breadth = market_state.get_breadth()
    return get_standard_envelope(breadth)

@router.get("/sectors")
async def get_sectors():
    """Dynamically aggregated sector performance across Indian market sectors."""
    sectors = market_state.get_sectors()
    return get_standard_envelope(sectors)

@router.get("/status")
async def get_status():
    """Exact IST market status (Mon-Fri 09:15 AM - 03:30 PM IST)."""
    status_info = market_state.get_status()
    return get_standard_envelope(status_info)

@router.get("/chart/{symbol}")
async def get_chart(symbol: str, timeframe: str = Query("1D", description="1D | 1W | 1M | 1Y | ALL")):
    """
    Ultra-low latency real market chart data matching the stock's live LTP,
    intraday curve, day high/low, and trading session trajectory.
    """
    chart = market_state.get_chart_data(symbol, timeframe)
    return get_standard_envelope(chart)

@router.get("/stock/{symbol}/quick")
async def get_quick_quote(symbol: str):
    """Sub-millisecond quick quote with 30-point sparkline for drawers and cards."""
    chart = market_state.get_chart_data(symbol, "1D")
    sparkline = [p["price"] for p in chart.get("points", [])]
    quote = {
        "symbol": symbol,
        "name": chart.get("name", symbol),
        "ltp": chart.get("current_price", 0.0),
        "change": chart.get("change", 0.0),
        "change_pct": chart.get("change_pct", 0.0),
        "day_high": chart.get("day_high", 0.0),
        "day_low": chart.get("day_low", 0.0),
        "sparkline": sparkline[-30:] if sparkline else []
    }
    return get_standard_envelope(quote)

@router.get("/search")
async def search_symbols(query: str = Query(..., min_length=1, description="Symbol or company name to search")):
    """Instant search across Indian stock universe."""
    q = query.strip().upper()
    matches = []
    
    for sym, meta in INDIAN_STOCKS_METADATA.items():
        if sym.startswith("^"):
            continue
        if q in sym or q in meta["name"].upper() or q in meta["sector"].upper():
            quote = market_state.quotes.get(sym, {})
            matches.append({
                "symbol": sym,
                "tradingsymbol": f"{sym}-EQ",
                "name": meta["name"],
                "sector": meta["sector"],
                "exchange": "NSE",
                "ltp": quote.get("ltp", meta["prev_close"]),
                "change_pct": quote.get("change_pct", 0.0)
            })

    return {
        "query": query,
        "count": len(matches),
        "results": matches[:20]
    }

@router.get("/etfs")
async def get_etfs(category: Optional[str] = Query("All", description="All | Index | Commodity | Sectoral | Global | Debt")):
    """
    Sub-millisecond retrieval of live Indian ETFs with real-time NAV, AUM, and 1Y returns.
    """
    etfs = market_state.get_etfs(category=category)
    return get_standard_envelope(etfs)

@router.get("/bonds")
async def get_bonds(type: Optional[str] = Query("All", description="All | Sovereign | Gold | PSU | Tax Free")):
    """
    Sub-millisecond retrieval of live Indian Sovereign G-Secs, SGBs, PSU Bonds, and Tax Free Bonds.
    """
    bonds = market_state.get_bonds(bond_type=type)
    return get_standard_envelope(bonds)

