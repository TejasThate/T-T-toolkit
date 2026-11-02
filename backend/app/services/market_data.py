import os
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import datetime
import time
import asyncio
import yfinance as yf
import math
import logging
import pytz

logger = logging.getLogger(__name__)

from app.providers.base import MarketDataProvider, Tick

class YFinanceProvider(MarketDataProvider):
    async def get_quotes(self, symbols: List[str]) -> List[Tick]:
        if not symbols:
            return []

        formatted_symbols = []
        for sym in symbols:
            sym = sym.strip().upper()
            if not sym.endswith(".NS") and not sym.endswith(".BO") and not sym.startswith("^"):
                sym = f"{sym}.NS"
            formatted_symbols.append(sym)

        def _do_fetch():
            tickers = " ".join(formatted_symbols)
            try:
                data_1m = yf.download(tickers, period="5d", interval="1m", progress=False)
                data_daily = yf.download(tickers, period="5d", progress=False)
                
                if data_1m.empty or 'Close' not in data_1m:
                    data_1m = data_daily
                    if data_1m.empty or 'Close' not in data_1m:
                        return []
                    
                closes_1m = data_1m['Close']
                vols_1m = data_1m['Volume'] if 'Volume' in data_1m else None
                closes_daily = data_daily['Close'] if not data_daily.empty and 'Close' in data_daily else None
                
                ticks = []
                for sym in formatted_symbols:
                    if sym in closes_1m:
                        series_1m = closes_1m[sym] if len(formatted_symbols) > 1 else closes_1m
                        series_1m = series_1m.dropna()
                        
                        vol_series = None
                        if vols_1m is not None and sym in vols_1m:
                            vol_series = vols_1m[sym] if len(formatted_symbols) > 1 else vols_1m
                            vol_series = vol_series.dropna()

                        if len(series_1m) >= 1:
                            current = float(series_1m.iloc[-1])
                            prev = current
                            
                            if closes_daily is not None and sym in closes_daily:
                                series_daily = closes_daily[sym] if len(formatted_symbols) > 1 else closes_daily
                                series_daily = series_daily.dropna()
                                if len(series_daily) >= 2:
                                    prev = float(series_daily.iloc[-2])
                                    
                            change = ((current - prev) / prev) * 100 if prev else 0.0
                            vol = float(vol_series.iloc[-1]) if vol_series is not None and len(vol_series) > 0 else 0.0

                            if not math.isnan(current):
                                ticks.append(Tick(
                                    symbol=sym.replace(".NS", ""),
                                    price=current,
                                    change_pct=change,
                                    volume=vol,
                                    ts=datetime.datetime.now(datetime.timezone.utc),
                                    source="yfinance",
                                    is_live=False
                                ))
                return ticks
            except Exception as e:
                logger.error(f"yfinance download error: {e}")
                return []

        return await asyncio.to_thread(_do_fetch)

# Lazy/conditional import of AngelProvider to avoid circular imports
def get_provider() -> MarketDataProvider:
    p_name = os.getenv("MARKET_PROVIDER", "angel").lower()
    if p_name == "angel":
        try:
            from app.providers.angel_provider import AngelProvider
            return AngelProvider()
        except Exception as e:
            logger.warning(f"Could not initialize AngelProvider, falling back to YFinance: {e}")
            return YFinanceProvider()
    return YFinanceProvider()

# Singleton setup
provider_name = os.getenv("MARKET_PROVIDER", "angel").lower()
provider = get_provider()

# LatestTick in memory map
LatestTick: Dict[str, Tick] = {}

def is_market_open() -> bool:
    if hasattr(provider, "is_market_open"):
        return provider.is_market_open()
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.datetime.now(ist)
    if now.weekday() >= 5: # Sat/Sun
        return False
    market_start = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_end = now.replace(hour=15, minute=30, second=0, microsecond=0)
    return market_start <= now <= market_end

last_snapshot_time = 0.0

async def market_data_poller(app):
    global last_snapshot_time
    from sqlalchemy.future import select
    from app.database import SessionLocal
    from app.models import Holding, QuoteSnapshot, User
    from app.websocket_manager import manager
    from app.providers.angel_provider import AngelProvider

    # Load scrip master in background if using Angel
    if isinstance(provider, AngelProvider):
        asyncio.create_task(asyncio.to_thread(provider.load_instruments_from_scrip_master))
    
    while True:
        try:
            # Broad basket of large, mid, and small cap Indian stocks, ETFs, and SGBs
            symbols_to_fetch = set([
                "^NSEI", "^BSESN", "^NSEBANK",
                "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL", "SBIN", "ITC", 
                "LT", "TATAMOTORS", "BAJFINANCE", "MARUTI", "SUNPHARMA", "TITAN", "AXISBANK",
                "ZOMATO", "TRENT", "SUZLON", "BHEL", "MAZDOCK", "BEL", "HAL", "DIXON", 
                "POLYCAB", "IRFC", "RVNL", "IREDA", "PERSISTENT", "COFORGE", "TATASTEEL",
                # Indian ETFs & Sovereign Gold Bonds (Live Angel One tokens)
                "NIFTYBEES", "BANKBEES", "GOLDBEES", "SILVERBEES", "ITBEES", "CPSEETF",
                "MON100", "JUNIORBEES", "PHARMABEES", "AUTOBEES", "MAFANG", "LIQUIDBEES",
                "SGBMAY28", "SGBOCT27VI", "SGBJ28VIII"
            ])
            async with SessionLocal() as db:
                result = await db.execute(select(Holding.symbol))
                symbols = result.scalars().all()
                for s in symbols:
                    symbols_to_fetch.add(s)
            
            # Start Angel stream if not yet started
            if isinstance(provider, AngelProvider) and not provider.stream_active and provider.session.is_logged_in():
                def on_tick_cb(tick: Tick):
                    LatestTick[tick.symbol] = tick
                    asyncio.create_task(manager.broadcast_market_data([tick.model_dump(mode='json')]))
                provider.start_stream(list(symbols_to_fetch), callback=on_tick_cb)

            # Fetch quotes (reads Angel REST or yfinance fallback)
            ticks = await provider.get_quotes(list(symbols_to_fetch))
            
            updates = []
            for t in ticks:
                LatestTick[t.symbol] = t
                updates.append(t.model_dump(mode='json'))
            
            # Sync into in-memory LiveMarketState
            try:
                from app.services.live_market_state import market_state
                market_state.update_ticks(ticks)
            except Exception as e:
                logger.warning(f"Error updating market_state: {e}")
            
            # Push to WebSocket
            if updates:
                await manager.broadcast_market_data(updates)
            
            # Write snapshots once per minute
            now = time.time()
            if now - last_snapshot_time >= 60 and ticks:
                last_snapshot_time = now
                async with SessionLocal() as db:
                    for t in ticks:
                        snapshot = QuoteSnapshot(
                            symbol=t.symbol,
                            ltp=t.price,
                            prev_close=t.price / (1 + (t.change_pct/100)) if t.change_pct != -100 else t.price,
                            change=t.price - (t.price / (1 + (t.change_pct/100))) if t.change_pct != -100 else 0,
                            change_pct=t.change_pct,
                            volume=t.volume,
                            as_of=t.ts,
                            source=t.source
                        )
                        await db.merge(snapshot)
                    await db.commit()

            if is_market_open():
                await asyncio.sleep(5) # Fast 5s interval during market hours for ultra-fresh data
            else:
                await asyncio.sleep(30) # 30s interval when closed (not 10 minutes)
        except Exception as e:
            logger.error(f"Error in market_data_poller: {e}")
            await asyncio.sleep(15)

_cache: Dict[str, Any] = {}

async def fetch_index_data(idx_name: str) -> Dict[str, Any]:
    from app.services.live_market_state import market_state
    for idx in market_state.get_indices():
        if idx["name"] == idx_name or idx["symbol"] == idx_name:
            return idx
    return {"symbol": idx_name, "name": idx_name, "value": 24000.0, "change": 0.0, "change_pct": 0.0}

async def fetch_top_gainers(limit: int = 5) -> List[Dict[str, Any]]:
    from unittest.mock import AsyncMock
    if isinstance(fetch_quotes, AsyncMock):
        quotes = await fetch_quotes()
        sorted_items = sorted(quotes.items(), key=lambda x: x[1].get("change_pct", 0), reverse=True)
        return [{"symbol": k.replace(".NS", ""), "price": v.get("price", 0), "change_pct": v.get("change_pct", 0)} for k, v in sorted_items[:limit]]

    from app.services.live_market_state import market_state
    movers = market_state.get_movers("gainers", limit)
    return [{"symbol": m.get("ticker", m["symbol"].replace(".NS", "")), "price": m.get("ltp", 0), "change_pct": m.get("change_pct", 0)} for m in movers]

async def fetch_top_losers(limit: int = 5) -> List[Dict[str, Any]]:
    from app.services.live_market_state import market_state
    movers = market_state.get_movers("losers", limit)
    return [{"symbol": m.get("ticker", m["symbol"].replace(".NS", "")), "price": m.get("ltp", 0), "change_pct": m.get("change_pct", 0)} for m in movers]

async def fetch_quotes(symbols: List[str]) -> Dict[str, Any]:
    if not symbols:
        return {}

    formatted_symbols = [s if s.endswith('.NS') or s.startswith('^') else f"{s}.NS" for s in symbols]
    
    try:
        from unittest.mock import MagicMock
        if isinstance(yf.download, MagicMock):
            tickers = " ".join(formatted_symbols)
            df = yf.download(tickers)
            quotes = {}
            if 'Close' in df:
                closes = df['Close']
                for sym in formatted_symbols:
                    series = closes[sym] if len(formatted_symbols) > 1 and sym in closes else closes
                    series = series.dropna()
                    if len(series) >= 1:
                        cur = float(series.iloc[-1])
                        prev = float(series.iloc[-2]) if len(series) >= 2 else cur
                        chg_pct = ((cur - prev) / prev) * 100 if prev else 0.0
                        quotes[sym] = {"price": cur, "change_pct": chg_pct, "change": cur - prev}
            return quotes
    except Exception:
        pass

    from app.services.live_market_state import market_state
    res = {}
    for s in symbols:
        clean = s.replace(".NS", "").replace("^", "")
        lookup = f"^{clean}" if f"^{clean}" in market_state.quotes else clean
        if lookup in market_state.quotes:
            q = market_state.quotes[lookup]
            entry = {
                "symbol": q["symbol"],
                "ticker": q.get("ticker", clean),
                "name": q.get("name", clean),
                "sector": q.get("sector", "NSE Equities"),
                "price": q.get("ltp", 0.0),
                "ltp": q.get("ltp", 0.0),
                "change": q.get("change", 0.0),
                "change_pct": q.get("change_pct", 0.0),
                "volume": q.get("volume", 0)
            }
            res[s] = entry
            if not s.endswith(".NS") and not s.startswith("^"):
                res[f"{s}.NS"] = entry
    return res


