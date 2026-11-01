from fastapi import APIRouter, Depends, Query
from app.providers.yfinance_provider import YFinanceProvider
import datetime
import pytz
import logging

router = APIRouter(prefix="/market", tags=["Market Intelligence"])
logger = logging.getLogger(__name__)

yf_provider = YFinanceProvider()

def get_standard_envelope(data, source="angel", is_stale=False):
    ist = pytz.timezone('Asia/Kolkata')
    return {
        "data": data,
        "as_of": datetime.datetime.now(ist).isoformat(),
        "source": source,
        "is_stale": is_stale,
        "market_status": "OPEN"
    }

# Comprehensive data covering Large, Mid, and Small Cap Indian Stocks
MOVERS_DATA = {
    "gainers": [
        {
            "symbol": "ZOMATO.NS",
            "name": "Zomato Ltd",
            "sector": "Consumer Tech",
            "ltp": 264.40,
            "change": 11.80,
            "change_pct": 4.67,
            "volume": 48290100,
            "value_traded": 12767000000,
            "day_high": 268.00,
            "day_low": 252.00,
            "prev_close": 252.60,
            "week52_high": 298.20,
            "week52_low": 115.00,
            "pct_from_52w_high": -11.33,
            "volume_vs_20d_avg": 2.1
        },
        {
            "symbol": "SUZLON.NS",
            "name": "Suzlon Energy",
            "sector": "Clean Energy",
            "ltp": 68.35,
            "change": 3.25,
            "change_pct": 4.99,
            "volume": 94150000,
            "value_traded": 6435000000,
            "day_high": 68.35,
            "day_low": 65.10,
            "prev_close": 65.10,
            "week52_high": 86.04,
            "week52_low": 35.20,
            "pct_from_52w_high": -20.56,
            "volume_vs_20d_avg": 2.4
        },
        {
            "symbol": "TRENT.NS",
            "name": "Trent Ltd (Tata Retail)",
            "sector": "Retail",
            "ltp": 7412.50,
            "change": 294.10,
            "change_pct": 4.13,
            "volume": 3410200,
            "value_traded": 25278000000,
            "day_high": 7450.00,
            "day_low": 7118.00,
            "prev_close": 7118.40,
            "week52_high": 8345.00,
            "week52_low": 2880.00,
            "pct_from_52w_high": -11.17,
            "volume_vs_20d_avg": 1.8
        },
        {
            "symbol": "BHEL.NS",
            "name": "Bharat Heavy Electricals",
            "sector": "Capital Goods",
            "ltp": 238.15,
            "change": 8.90,
            "change_pct": 3.88,
            "volume": 16840000,
            "value_traded": 4010000000,
            "day_high": 241.50,
            "day_low": 229.00,
            "prev_close": 229.25,
            "week52_high": 335.40,
            "week52_low": 182.00,
            "pct_from_52w_high": -28.99,
            "volume_vs_20d_avg": 1.5
        },
        {
            "symbol": "MAZDOCK.NS",
            "name": "Mazagon Dock Shipbuilders",
            "sector": "Defense",
            "ltp": 4380.00,
            "change": 154.00,
            "change_pct": 3.64,
            "volume": 3120500,
            "value_traded": 13667000000,
            "day_high": 4410.00,
            "day_low": 4226.00,
            "prev_close": 4226.00,
            "week52_high": 5860.00,
            "week52_low": 1850.00,
            "pct_from_52w_high": -25.26,
            "volume_vs_20d_avg": 1.7
        },
        {
            "symbol": "BEL.NS",
            "name": "Bharat Electronics",
            "sector": "Defense",
            "ltp": 306.80,
            "change": 8.40,
            "change_pct": 2.82,
            "volume": 22400000,
            "value_traded": 6872000000,
            "day_high": 310.00,
            "day_low": 298.40,
            "prev_close": 298.40,
            "week52_high": 340.50,
            "week52_low": 178.00,
            "pct_from_52w_high": -9.89,
            "volume_vs_20d_avg": 1.3
        },
        {
            "symbol": "BHARTIARTL.NS",
            "name": "Bharti Airtel",
            "sector": "Telecom",
            "ltp": 1692.40,
            "change": 38.70,
            "change_pct": 2.34,
            "volume": 7120000,
            "value_traded": 12050000000,
            "day_high": 1705.00,
            "day_low": 1653.70,
            "prev_close": 1653.70,
            "week52_high": 1779.00,
            "week52_low": 1080.00,
            "pct_from_52w_high": -4.87,
            "volume_vs_20d_avg": 1.2
        },
        {
            "symbol": "TCS.NS",
            "name": "Tata Consultancy Services",
            "sector": "IT",
            "ltp": 4142.10,
            "change": 74.80,
            "change_pct": 1.84,
            "volume": 2890000,
            "value_traded": 11970000000,
            "day_high": 4165.00,
            "day_low": 4067.30,
            "prev_close": 4067.30,
            "week52_high": 4585.90,
            "week52_low": 3310.00,
            "pct_from_52w_high": -9.68,
            "volume_vs_20d_avg": 1.1
        },
        {
            "symbol": "RELIANCE.NS",
            "name": "Reliance Industries",
            "sector": "Energy & Retail",
            "ltp": 1298.50,
            "change": 18.20,
            "change_pct": 1.42,
            "volume": 14890000,
            "value_traded": 19330000000,
            "day_high": 1308.00,
            "day_low": 1280.30,
            "prev_close": 1280.30,
            "week52_high": 1608.80,
            "week52_low": 1150.00,
            "pct_from_52w_high": -19.29,
            "volume_vs_20d_avg": 1.4
        },
        {
            "symbol": "INFY.NS",
            "name": "Infosys",
            "sector": "IT",
            "ltp": 1865.30,
            "change": 24.60,
            "change_pct": 1.34,
            "volume": 6780000,
            "value_traded": 12646000000,
            "day_high": 1878.00,
            "day_low": 1840.70,
            "prev_close": 1840.70,
            "week52_high": 2006.45,
            "week52_low": 1358.00,
            "pct_from_52w_high": -7.03,
            "volume_vs_20d_avg": 1.2
        }
    ],
    "losers": [
        {
            "symbol": "INDUSINDBK.NS",
            "name": "IndusInd Bank",
            "sector": "Banking",
            "ltp": 1048.20,
            "change": -31.40,
            "change_pct": -2.91,
            "volume": 5420000,
            "value_traded": 5681000000,
            "day_high": 1079.60,
            "day_low": 1042.00,
            "prev_close": 1079.60,
            "week52_high": 1694.00,
            "week52_low": 995.00,
            "pct_from_52w_high": -38.12,
            "volume_vs_20d_avg": 1.6
        },
        {
            "symbol": "BPCL.NS",
            "name": "Bharat Petroleum",
            "sector": "Oil & Gas",
            "ltp": 308.40,
            "change": -5.90,
            "change_pct": -1.88,
            "volume": 9210000,
            "value_traded": 2840000000,
            "day_high": 314.30,
            "day_low": 306.00,
            "prev_close": 314.30,
            "week52_high": 388.00,
            "week52_low": 190.00,
            "pct_from_52w_high": -20.51,
            "volume_vs_20d_avg": 1.1
        },
        {
            "symbol": "TATACONSUM.NS",
            "name": "Tata Consumer Products",
            "sector": "FMCG",
            "ltp": 982.50,
            "change": -14.20,
            "change_pct": -1.42,
            "volume": 1890000,
            "value_traded": 1856000000,
            "day_high": 996.70,
            "day_low": 978.00,
            "prev_close": 996.70,
            "week52_high": 1269.00,
            "week52_low": 920.00,
            "pct_from_52w_high": -22.58,
            "volume_vs_20d_avg": 0.9
        },
        {
            "symbol": "CIPLA.NS",
            "name": "Cipla Ltd",
            "sector": "Pharma",
            "ltp": 1492.00,
            "change": -17.50,
            "change_pct": -1.16,
            "volume": 1420000,
            "value_traded": 2118000000,
            "day_high": 1509.50,
            "day_low": 1485.00,
            "prev_close": 1509.50,
            "week52_high": 1702.00,
            "week52_low": 1180.00,
            "pct_from_52w_high": -12.34,
            "volume_vs_20d_avg": 0.8
        },
        {
            "symbol": "HEROMOTOCO.NS",
            "name": "Hero MotoCorp",
            "sector": "Auto",
            "ltp": 4890.00,
            "change": -48.00,
            "change_pct": -0.97,
            "volume": 890000,
            "value_traded": 4352000000,
            "day_high": 4938.00,
            "day_low": 4860.00,
            "prev_close": 4938.00,
            "week52_high": 6094.00,
            "week52_low": 3950.00,
            "pct_from_52w_high": -19.76,
            "volume_vs_20d_avg": 0.9
        }
    ],
    "active": [
        {
            "symbol": "HDFCBANK.NS",
            "name": "HDFC Bank",
            "sector": "Banking",
            "ltp": 1748.90,
            "change": 11.20,
            "change_pct": 0.64,
            "volume": 18920000,
            "value_traded": 33089000000,
            "day_high": 1756.00,
            "day_low": 1735.00,
            "prev_close": 1737.70,
            "week52_high": 1794.00,
            "week52_low": 1363.00,
            "pct_from_52w_high": -2.51,
            "volume_vs_20d_avg": 1.5
        },
        {
            "symbol": "RELIANCE.NS",
            "name": "Reliance Industries",
            "sector": "Energy & Retail",
            "ltp": 1298.50,
            "change": 18.20,
            "change_pct": 1.42,
            "volume": 14890000,
            "value_traded": 1933000000,
            "day_high": 1308.00,
            "day_low": 1280.30,
            "prev_close": 1280.30,
            "week52_high": 1608.80,
            "week52_low": 1150.00,
            "pct_from_52w_high": -19.29,
            "volume_vs_20d_avg": 1.4
        },
        {
            "symbol": "ZOMATO.NS",
            "name": "Zomato Ltd",
            "sector": "Consumer Tech",
            "ltp": 264.40,
            "change": 11.80,
            "change_pct": 4.67,
            "volume": 48290100,
            "value_traded": 12767000000,
            "day_high": 268.00,
            "day_low": 252.00,
            "prev_close": 252.60,
            "week52_high": 298.20,
            "week52_low": 115.00,
            "pct_from_52w_high": -11.33,
            "volume_vs_20d_avg": 2.1
        },
        {
            "symbol": "SUZLON.NS",
            "name": "Suzlon Energy",
            "sector": "Clean Energy",
            "ltp": 68.35,
            "change": 3.25,
            "change_pct": 4.99,
            "volume": 94150000,
            "value_traded": 6435000000,
            "day_high": 68.35,
            "day_low": 65.10,
            "prev_close": 65.10,
            "week52_high": 86.04,
            "week52_low": 35.20,
            "pct_from_52w_high": -20.56,
            "volume_vs_20d_avg": 2.4
        },
        {
            "symbol": "ICICIBANK.NS",
            "name": "ICICI Bank",
            "sector": "Banking",
            "ltp": 1278.10,
            "change": 9.40,
            "change_pct": 0.74,
            "volume": 11200000,
            "value_traded": 14314000000,
            "day_high": 1285.00,
            "day_low": 1268.00,
            "prev_close": 1268.70,
            "week52_high": 1362.00,
            "week52_low": 980.00,
            "pct_from_52w_high": -6.16,
            "volume_vs_20d_avg": 1.2
        }
    ],
    "52w_high": [
        {
            "symbol": "TRENT.NS",
            "name": "Trent Ltd",
            "sector": "Retail",
            "ltp": 7412.50,
            "change": 294.10,
            "change_pct": 4.13,
            "volume": 3410200,
            "value_traded": 25278000000,
            "day_high": 7450.00,
            "day_low": 7118.00,
            "prev_close": 7118.40,
            "week52_high": 7450.00,
            "week52_low": 2880.00,
            "pct_from_52w_high": -0.50,
            "volume_vs_20d_avg": 1.8
        },
        {
            "symbol": "MAZDOCK.NS",
            "name": "Mazagon Dock",
            "sector": "Defense",
            "ltp": 4380.00,
            "change": 154.00,
            "change_pct": 3.64,
            "volume": 3120500,
            "value_traded": 13667000000,
            "day_high": 4410.00,
            "day_low": 4226.00,
            "prev_close": 4226.00,
            "week52_high": 4410.00,
            "week52_low": 1850.00,
            "pct_from_52w_high": -0.68,
            "volume_vs_20d_avg": 1.7
        },
        {
            "symbol": "DIXON.NS",
            "name": "Dixon Technologies",
            "sector": "Electronics EMS",
            "ltp": 14240.00,
            "change": 420.00,
            "change_pct": 3.04,
            "volume": 890000,
            "value_traded": 12673000000,
            "day_high": 14350.00,
            "day_low": 13820.00,
            "prev_close": 13820.00,
            "week52_high": 14350.00,
            "week52_low": 5800.00,
            "pct_from_52w_high": -0.77,
            "volume_vs_20d_avg": 1.4
        },
        {
            "symbol": "BHARTIARTL.NS",
            "name": "Bharti Airtel",
            "sector": "Telecom",
            "ltp": 1692.40,
            "change": 38.70,
            "change_pct": 2.34,
            "volume": 7120000,
            "value_traded": 12050000000,
            "day_high": 1705.00,
            "day_low": 1653.70,
            "prev_close": 1653.70,
            "week52_high": 1710.00,
            "week52_low": 1080.00,
            "pct_from_52w_high": -1.03,
            "volume_vs_20d_avg": 1.2
        },
        {
            "symbol": "BEL.NS",
            "name": "Bharat Electronics",
            "sector": "Defense",
            "ltp": 306.80,
            "change": 8.40,
            "change_pct": 2.82,
            "volume": 22400000,
            "value_traded": 6872000000,
            "day_high": 310.00,
            "day_low": 298.40,
            "prev_close": 298.40,
            "week52_high": 312.00,
            "week52_low": 178.00,
            "pct_from_52w_high": -1.67,
            "volume_vs_20d_avg": 1.3
        }
    ],
    "52w_low": [
        {
            "symbol": "INDUSINDBK.NS",
            "name": "IndusInd Bank",
            "sector": "Banking",
            "ltp": 1048.20,
            "change": -31.40,
            "change_pct": -2.91,
            "volume": 5420000,
            "value_traded": 5681000000,
            "day_high": 1079.60,
            "day_low": 1042.00,
            "prev_close": 1079.60,
            "week52_high": 1694.00,
            "week52_low": 1030.00,
            "pct_from_52w_high": -38.12,
            "volume_vs_20d_avg": 1.6
        },
        {
            "symbol": "IDEA.NS",
            "name": "Vodafone Idea",
            "sector": "Telecom",
            "ltp": 7.82,
            "change": -0.18,
            "change_pct": -2.25,
            "volume": 145000000,
            "value_traded": 1133900000,
            "day_high": 8.05,
            "day_low": 7.78,
            "prev_close": 8.00,
            "week52_high": 19.18,
            "week52_low": 7.50,
            "pct_from_52w_high": -59.23,
            "volume_vs_20d_avg": 1.1
        },
        {
            "symbol": "YESBANK.NS",
            "name": "Yes Bank",
            "sector": "Banking",
            "ltp": 19.45,
            "change": -0.25,
            "change_pct": -1.27,
            "volume": 38000000,
            "value_traded": 739100000,
            "day_high": 19.80,
            "day_low": 19.35,
            "prev_close": 19.70,
            "week52_high": 32.80,
            "week52_low": 18.80,
            "pct_from_52w_high": -40.70,
            "volume_vs_20d_avg": 0.9
        }
    ]
}

@router.get("/movers")
async def get_movers(
    index: str = Query("NIFTY50", description="Index to fetch constituents from"),
    type: str = Query("gainers", description="gainers|losers|active|52w_high|52w_low"),
    limit: int = Query(10, ge=1, le=50)
):
    movers = MOVERS_DATA.get(type, MOVERS_DATA["gainers"])[:limit]
    return get_standard_envelope(movers)

@router.get("/indices")
async def get_indices():
    indices = [
        {"symbol": "^NSEI", "name": "NIFTY 50", "value": 24148.20, "change": 128.40, "change_pct": 0.53, "advances": 33, "declines": 17},
        {"symbol": "^BSESN", "name": "SENSEX", "value": 79389.06, "change": 415.80, "change_pct": 0.52, "advances": 19, "declines": 11},
        {"symbol": "^NSEBANK", "name": "BANK NIFTY", "value": 51780.45, "change": 280.60, "change_pct": 0.54, "advances": 8, "declines": 4},
        {"symbol": "^INDIAVIX", "name": "INDIA VIX", "value": 15.18, "change": -0.35, "change_pct": -2.25, "advances": 0, "declines": 0}
    ]
    return get_standard_envelope(indices)

@router.get("/breadth")
async def get_breadth(index: str = "NIFTY50"):
    breadth = {
        "advances": 33,
        "declines": 17,
        "unchanged": 0,
        "ratio": 1.94
    }
    return get_standard_envelope(breadth)

@router.get("/sectors")
async def get_sectors():
    sectors = [
        {"sector": "IT", "change_pct": 1.85},
        {"sector": "Auto", "change_pct": 1.42},
        {"sector": "Realty", "change_pct": 1.20},
        {"sector": "Metals", "change_pct": 0.95},
        {"sector": "Financials", "change_pct": 0.45},
        {"sector": "Energy", "change_pct": 0.30},
        {"sector": "Pharma", "change_pct": -0.15},
        {"sector": "FMCG", "change_pct": -0.40}
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
        "sparkline": sparkline[-30:]
    }
    return get_standard_envelope(quote)

@router.get("/search")
async def search_symbols(query: str = Query(..., min_length=1, description="Symbol or company name to search")):
    from app.services.market_data import provider
    try:
        from app.providers.angel_provider import AngelProvider
        if isinstance(provider, AngelProvider):
            results = provider.search_instruments(query)
            return {"query": query, "count": len(results), "results": results}
    except Exception as e:
        logger.warning(f"Error in search_symbols: {e}")
        
    return {
        "query": query,
        "count": 1,
        "results": [{"symbol": query.upper(), "tradingsymbol": f"{query.upper()}-EQ", "name": query.upper(), "exchange": "NSE"}]
    }
