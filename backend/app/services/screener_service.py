import yfinance as yf
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
import logging
from datetime import datetime, timedelta
import asyncio

from app.models import DailyBar, ComputedSignal
from app.utils.technical_indicators import generate_signals

logger = logging.getLogger(__name__)

# Default Watchlist of NIFTY 50 top stocks
DEFAULT_WATCHLIST = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "L&T.NS", "BAJFINANCE.NS",
    "HINDUNILVR.NS", "AXISBANK.NS", "KOTAKBANK.NS", "ASIANPAINT.NS", "MARUTI.NS"
]

async def update_screener_signals(db: AsyncSession, symbols: list = DEFAULT_WATCHLIST):
    """
    Fetches historical OHLCV data for symbols, stores in DB, 
    computes technical signals, and updates ComputedSignal table.
    """
    logger.info(f"Updating screener signals for {len(symbols)} symbols...")
    
    # 1. Fetch Data in chunks to prevent memory limit exhaustion
    import gc
    data = {}
    chunk_size = 5
    loop = asyncio.get_event_loop()
    
    for i in range(0, len(symbols), chunk_size):
        chunk = symbols[i:i+chunk_size]
        tickers_str = " ".join(chunk)
        try:
            chunk_data = await loop.run_in_executor(
                None, 
                lambda: yf.download(tickers_str, period="6mo", group_by="ticker", auto_adjust=True, progress=False)
            )
            # If chunk has only 1 symbol, yfinance doesn't return a multi-index DataFrame
            if len(chunk) == 1:
                data[chunk[0]] = chunk_data
            else:
                for sym in chunk:
                    if sym in chunk_data:
                        data[sym] = chunk_data[sym]
        except Exception as e:
            logger.error(f"Failed to fetch yfinance data for chunk {chunk}: {e}")
            
        # Small sleep between chunks and garbage collect to clear old threads/objects
        await asyncio.sleep(0.5)
        gc.collect()

    # 2. Clear old signals
    await db.execute(delete(ComputedSignal))
    
    # 3. Process each symbol
    new_signals = []
    
    for symbol in symbols:
        try:
            if symbol not in data:
                continue
                
            df = data[symbol]
                
            if df is None or df.empty:
                continue
                
            df = df.dropna()
            
            # Ensure lowercase column names for our technical_indicators functions
            df = df.rename(columns={"Open": "open", "High": "high", "Low": "low", "Close": "close", "Volume": "volume"})
            
            # Generate Signals
            signals = generate_signals(df)
            
            # Store in DB
            base_symbol = symbol.replace(".NS", "")
            for sig_type, details in signals.items():
                new_signals.append(
                    ComputedSignal(
                        symbol=base_symbol,
                        signal_type=sig_type,
                        direction=details["direction"],
                        value=details["value"]
                    )
                )
        except Exception as e:
            logger.warning(f"Failed to process signals for {symbol}: {e}")

    # 4. Save to DB
    if new_signals:
        db.add_all(new_signals)
        await db.commit()
        logger.info(f"Successfully saved {len(new_signals)} computed signals to database.")
    else:
        logger.info("No actionable signals found today.")

async def get_active_signals(db: AsyncSession):
    """Retrieves all active computed signals from the database."""
    result = await db.execute(select(ComputedSignal))
    return result.scalars().all()
