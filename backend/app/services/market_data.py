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

class Tick(BaseModel):
    symbol: str
    price: float
    change_pct: float
    volume: float = 0.0
    ts: datetime.datetime
    source: str
    is_live: bool

class MarketDataProvider(ABC):
    @abstractmethod
    async def get_quotes(self, symbols: List[str]) -> List[Tick]:
        pass

    async def start_stream(self, symbols: List[str], callback) -> None:
        pass

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

# Singleton setup
provider_name = os.getenv("MARKET_PROVIDER", "yfinance")
provider: MarketDataProvider
if provider_name == "angel":
    pass # Angel provider will be in Phase 7
else:
    provider = YFinanceProvider()

# LatestTick in memory map
LatestTick: Dict[str, Tick] = {}

def is_market_open() -> bool:
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.datetime.now(ist)
    if now.weekday() >= 5: # Sat/Sun
        return False
    # Holiday check mock (for now, assume open if weekday)
    # Market hours 9:15 to 15:30
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
    
    while True:
        try:
            # Union of all symbols held or watched
            symbols_to_fetch = set(["^NSEI", "^BSESN"])
            async with SessionLocal() as db:
                result = await db.execute(select(Holding.symbol))
                symbols = result.scalars().all()
                for s in symbols:
                    symbols_to_fetch.add(s)
            
            # Fetch quotes
            ticks = await provider.get_quotes(list(symbols_to_fetch))
            
            updates = []
            for t in ticks:
                LatestTick[t.symbol] = t
                updates.append(t.model_dump(mode='json'))
            
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
                        # We should ideally use postgres UPSERT here, but we can do a simple merge
                        await db.merge(snapshot)
                    await db.commit()

            if is_market_open():
                await asyncio.sleep(20) # 20s interval during market hours
            else:
                await asyncio.sleep(60 * 10) # 10 minutes when closed
        except Exception as e:
            logger.error(f"Error in market_data_poller: {e}")
            await asyncio.sleep(30)
