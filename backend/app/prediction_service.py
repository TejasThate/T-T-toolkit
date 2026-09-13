import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import statsmodels.api as sm
import warnings
import xgboost as xgb
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from . import models
import os

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "xgboost_models")
os.makedirs(MODELS_DIR, exist_ok=True)

def calculate_rsi(data: pd.Series, periods=14):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=periods).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=periods).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def prepare_features(df: pd.DataFrame):
    df['SMA20'] = df['Close'].rolling(window=20).mean()
    df['SMA50'] = df['Close'].rolling(window=50).mean()
    df['RSI'] = calculate_rsi(df['Close'], 14)
    df['Vol_SMA10'] = df['Volume'].rolling(window=10).mean()
    
    # Target: 1 if close price 3 days from now is higher than today, 0 otherwise
    df['Target_3d'] = (df['Close'].shift(-3) > df['Close']).astype(int)
    
    # Drop rows with NaN (due to rolling/shifting)
    features_df = df.dropna().copy()
    
    # Feature columns
    X = features_df[['SMA20', 'SMA50', 'RSI', 'Vol_SMA10', 'Close', 'Open', 'High', 'Low', 'Volume']]
    y = features_df['Target_3d']
    return X, y, df

def train_or_load_xgboost(symbol: str, df: pd.DataFrame):
    model_path = os.path.join(MODELS_DIR, f"{symbol}_xgb.json")
    clf = xgb.XGBClassifier(n_estimators=50, max_depth=3, learning_rate=0.1, random_state=42)
    
    X, y, _ = prepare_features(df)
    if len(X) < 10:
        return None # Not enough data to train

    if os.path.exists(model_path):
        clf.load_model(model_path)
    else:
        # Train and save
        clf.fit(X, y)
        clf.save_model(model_path)
        
    return clf

async def get_news_sentiment(symbol: str, db: AsyncSession) -> float:
    # Fetch recent news for this symbol to adjust the score
    result = await db.execute(
        select(models.NewsArticle)
        .where(models.NewsArticle.affected_symbol == symbol)
        .order_by(models.NewsArticle.published_at.desc())
        .limit(5)
    )
    articles = result.scalars().all()
    if not articles:
        return 0.0
    
    avg_impact = sum(a.impact_score or 5 for a in articles) / len(articles)
    return avg_impact - 5.0 # Centered around 0 (-5 to +5)

async def get_prediction(symbol: str, db: AsyncSession) -> dict:
    try:
        yf_symbol = symbol if '.' in symbol else f"{symbol}.NS"
        ticker = yf.Ticker(yf_symbol)
        df = ticker.history(period="1y") # Need more data for ML
        if df.empty or len(df) < 50:
            raise ValueError(f"Not enough data for {symbol}")

        # 1. Rule-based signals
        df['SMA20'] = df['Close'].rolling(window=20).mean()
        df['SMA50'] = df['Close'].rolling(window=50).mean()
        df['RSI'] = calculate_rsi(df['Close'], 14)
        df['Vol_SMA10'] = df['Volume'].rolling(window=10).mean()

        last_close = df['Close'].iloc[-1]
        last_sma20 = df['SMA20'].iloc[-1]
        last_sma50 = df['SMA50'].iloc[-1]
        last_rsi = df['RSI'].iloc[-1]
        last_vol = df['Volume'].iloc[-1]
        last_vol_sma10 = df['Vol_SMA10'].iloc[-1]

        score = 0
        max_score = 6 # SMA, RSI, Vol, ARIMA, XGBoost, News

        # Signal 1: SMA
        if last_sma20 > last_sma50:
            score += 1
            sma_signal = "Bullish (SMA20 > SMA50)"
        else:
            score -= 1
            sma_signal = "Bearish (SMA20 < SMA50)"

        # Signal 2: RSI
        if last_rsi < 30:
            score += 1
            rsi_signal = "Bullish (Oversold)"
        elif last_rsi > 70:
            score -= 1
            rsi_signal = "Bearish (Overbought)"
        else:
            rsi_signal = "Neutral"

        # Signal 3: Volume Spike
        if last_vol > last_vol_sma10 * 1.5:
            if df['Close'].iloc[-1] > df['Open'].iloc[-1]:
                score += 1
                vol_signal = "Bullish (Accumulation)"
            else:
                score -= 1
                vol_signal = "Bearish (Distribution)"
        else:
            vol_signal = "Neutral"

        # 2. Statistical Layer (ARIMA)
        close_prices = df['Close'].values
        model = sm.tsa.ARIMA(close_prices, order=(5, 1, 0))
        results = model.fit()
        forecast = results.forecast(steps=3)
        
        forecast_trend = forecast[-1] - last_close
        if forecast_trend > last_close * 0.005:
            score += 1
            arima_signal = "Bullish Projection"
        elif forecast_trend < -last_close * 0.005:
            score -= 1
            arima_signal = "Bearish Projection"
        else:
            arima_signal = "Neutral Projection"

        # 3. Machine Learning Layer (XGBoost)
        xgb_model = train_or_load_xgboost(symbol, df)
        xgb_signal = "Neutral (Insufficient Data)"
        if xgb_model:
            # Predict for the last row
            latest_features = df[['SMA20', 'SMA50', 'RSI', 'Vol_SMA10', 'Close', 'Open', 'High', 'Low', 'Volume']].iloc[-1:]
            xgb_pred = xgb_model.predict(latest_features)[0]
            xgb_prob = xgb_model.predict_proba(latest_features)[0]
            
            if xgb_pred == 1 and xgb_prob[1] > 0.6:
                score += 1
                xgb_signal = f"Bullish (XGBoost {round(xgb_prob[1]*100)}%)"
            elif xgb_pred == 0 and xgb_prob[0] > 0.6:
                score -= 1
                xgb_signal = f"Bearish (XGBoost {round(xgb_prob[0]*100)}%)"
            else:
                xgb_signal = "Neutral (XGBoost Unsure)"

        # 4. News Sentiment
        news_score = await get_news_sentiment(symbol, db)
        if news_score > 1.0:
            score += 1
        elif news_score < -1.0:
            score -= 1

        # Aggregate Score
        confidence = (abs(score) / max_score) * 100
        
        if score >= 2:
            direction = "Up"
        elif score <= -2:
            direction = "Down"
        else:
            direction = "Neutral"

        if direction == "Neutral":
            confidence = 50.0 + (abs(score) * 5)
            
        # Log to Database
        log_entry = models.PredictionLog(
            symbol=symbol,
            predicted_direction=direction,
            confidence=confidence,
            target_date=datetime.utcnow() + timedelta(days=3)
        )
        db.add(log_entry)
        await db.commit()

        last_3_prices = df['Close'].iloc[-3:].tolist()

        return {
            "symbol": symbol,
            "direction": direction,
            "confidence": round(confidence, 1),
            "current_price": round(last_close, 2),
            "projected_price_3d": round(forecast[-1], 2),
            "historical_last_3": last_3_prices,
            "signals": {
                "sma": sma_signal,
                "rsi": rsi_signal,
                "volume": vol_signal,
                "arima": arima_signal,
                "xgboost": xgb_signal
            },
            "raw_score": score
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise ValueError(f"Prediction failed for {symbol}: {str(e)}")

async def batch_retrain_models(db: AsyncSession):
    """
    Weekly batch retrain job. Evaluates previous predictions and retrains XGBoost models.
    """
    # 1. Update actual outcomes for past predictions
    three_days_ago = datetime.utcnow() - timedelta(days=3)
    pending = await db.execute(
        select(models.PredictionLog)
        .where(models.PredictionLog.actual_outcome == None)
        .where(models.PredictionLog.target_date <= datetime.utcnow())
    )
    for p in pending.scalars().all():
        try:
            yf_symbol = p.symbol if '.' in p.symbol else f"{p.symbol}.NS"
            df = yf.Ticker(yf_symbol).history(period="10d")
            if not df.empty:
                old_price = df['Close'].iloc[-4] if len(df) >= 4 else df['Close'].iloc[0]
                new_price = df['Close'].iloc[-1]
                actual_dir = "Up" if new_price > old_price else "Down"
                p.actual_outcome = "Correct" if actual_dir == p.predicted_direction else "Incorrect"
        except:
            pass
    
    await db.commit()

    # 2. Retrain active models
    # Find all unique symbols in recent logs
    symbols_res = await db.execute(select(models.PredictionLog.symbol).distinct())
    symbols = symbols_res.scalars().all()
    
    retrained = 0
    for sym in symbols:
        try:
            yf_symbol = sym if '.' in sym else f"{sym}.NS"
            df = yf.Ticker(yf_symbol).history(period="1y")
            if len(df) > 50:
                X, y, _ = prepare_features(df)
                clf = xgb.XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42)
                clf.fit(X, y)
                clf.save_model(os.path.join(MODELS_DIR, f"{sym}_xgb.json"))
                retrained += 1
        except Exception as e:
            print(f"Failed to retrain {sym}: {e}")
            
    return {"message": f"Evaluated past predictions and retrained {retrained} models."}
