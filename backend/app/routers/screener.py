from sqlalchemy.future import select
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any, Union
import yfinance as yf
import pandas as pd
import ta

router = APIRouter(prefix="/screener", tags=["Screener Engine"])

class Condition(BaseModel):
    indicator: str
    operator: str
    value: Union[float, str]

class ScreenerRequest(BaseModel):
    conditions: List[Condition]

def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Compute technical indicators on the dataframe using ta"""
    if df.empty or len(df) < 50:
        return df

    # Basic moving averages
    df['SMA_20'] = ta.trend.sma_indicator(df['Close'], window=20)
    df['SMA_50'] = ta.trend.sma_indicator(df['Close'], window=50)
    df['SMA_200'] = ta.trend.sma_indicator(df['Close'], window=200)

    # RSI
    df['RSI_14'] = ta.momentum.rsi(df['Close'], window=14)

    # MACD
    macd = ta.trend.MACD(df['Close'], window_slow=26, window_fast=12, window_sign=9)
    df['MACD'] = macd.macd()
    df['MACD_Signal'] = macd.macd_signal()
    df['MACD_Diff'] = macd.macd_diff()

    # Bollinger Bands
    bb = ta.volatility.BollingerBands(df['Close'], window=20, window_dev=2)
    df['BBL_20_2.0'] = bb.bollinger_lband()
    df['BBU_20_2.0'] = bb.bollinger_hband()
    
    # 52 Week High/Low (assuming daily data, 252 trading days)
    df['52W_High'] = df['High'].rolling(window=252, min_periods=1).max()
    df['52W_Low'] = df['Low'].rolling(window=252, min_periods=1).min()

    return df

def evaluate_condition(row, condition: Condition) -> bool:
    try:
        val = row.get(condition.indicator)
        if val is None or pd.isna(val):
            return False
            
        target = condition.value
        
        # If target is a string, it might refer to another column
        if isinstance(target, str) and target in row:
            target = row[target]
            
        target = float(target)
        val = float(val)

        if condition.operator == '>':
            return val > target
        elif condition.operator == '<':
            return val < target
        elif condition.operator == '>=':
            return val >= target
        elif condition.operator == '<=':
            return val <= target
        elif condition.operator == '==':
            return val == target
        else:
            return False
    except Exception:
        return False

@router.post("/run")
async def run_screener(request: ScreenerRequest = Body(...)):
    # In production, we'd fetch pre-computed indicators from the database (ohlcv_daily table)
    # For this POC, we'll fetch a small basket of stocks via yfinance dynamically
    
    basket = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ITC.NS",
        "SBIN.NS", "BHARTIARTL.NS", "LARSEN.NS", "BAJFINANCE.NS"
    ]
    
    results = []
    
    try:
        # Fetch data for basket
        data = yf.download(tickers=" ".join(basket), period="1y", group_by="ticker", threads=True, progress=False)
        
        for symbol in basket:
            try:
                # Handle single vs multi ticker download structure
                df = data[symbol] if len(basket) > 1 else data
                if df.empty:
                    continue
                    
                df = compute_indicators(df)
                latest = df.iloc[-1]
                
                # Check all conditions
                passed = all(evaluate_condition(latest, cond) for cond in request.conditions)
                
                if passed:
                    results.append({
                        "symbol": symbol.replace(".NS", ""),
                        "ltp": float(latest.get("Close", 0)),
                        "rsi": float(latest.get("RSI_14", 0)) if "RSI_14" in latest else None,
                        "volume": int(latest.get("Volume", 0)),
                        "sma_20": float(latest.get("SMA_20", 0)) if "SMA_20" in latest else None,
                        "sma_50": float(latest.get("SMA_50", 0)) if "SMA_50" in latest else None,
                    })
            except Exception as e:
                print(f"Error evaluating {symbol}: {e}")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {
        "count": len(results),
        "results": results
    }

from app.database import get_db
from app.models import TechnicalAlert, Notification
from sqlalchemy.orm import Session
from fastapi import Depends

class AlertRequest(BaseModel):
    name: str
    conditions: List[Condition]

@router.post("/alerts")
async def save_alert(request: AlertRequest = Body(...), db: Session = Depends(get_db)):
    # In a real app we'd get user_id from token, mock for now
    alert = TechnicalAlert(
        user_id=1,
        name=request.name,
        conditions=[c.dict() for c in request.conditions],
        is_active=True
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"message": "Alert saved successfully", "alert_id": alert.id}

@router.get("/alerts")
async def get_alerts(db: Session = Depends(get_db)):
    result = await db.execute(select(TechnicalAlert).where(TechnicalAlert.user_id == 1))
    alerts = result.scalars().all()
    return {"alerts": alerts}

@router.get("/notifications")
async def get_notifications(db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id == 1).order_by(Notification.created_at.desc()).limit(50).all()
    return {"notifications": notifs}
