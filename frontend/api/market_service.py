import yfinance as yf
import asyncio

def _fetch_live_data():
    symbols = {
        "NIFTY 50": "^NSEI",
        "SENSEX": "^BSESN",
        "RELIANCE": "RELIANCE.NS",
        "HDFC BANK": "HDFCBANK.NS",
        "TCS": "TCS.NS",
        "INFY": "INFY.NS"
    }
    
    data = {}
    for name, symbol in symbols.items():
        try:
            ticker = yf.Ticker(symbol)
            # Use fast download to get the last 2 days of data for previous close comparison
            hist = ticker.history(period="2d")
            if len(hist) >= 1:
                last_price = hist['Close'].iloc[-1]
                prev_close = hist['Close'].iloc[-2] if len(hist) > 1 else last_price
                change = last_price - prev_close
                change_percent = (change / prev_close) * 100 if prev_close else 0
                
                data[name] = {
                    "symbol": symbol,
                    "price": float(last_price),
                    "change": float(change),
                    "change_percent": float(change_percent)
                }
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
            
    return data

async def get_live_market_data():
    return await asyncio.to_thread(_fetch_live_data)
