import pandas as pd
import yfinance as yf
import xgboost as xgb
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Adds basic technical indicators to the dataframe to serve as features."""
    # Simple Moving Averages
    df['SMA_5'] = df['Close'].rolling(window=5).mean()
    df['SMA_10'] = df['Close'].rolling(window=10).mean()
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    
    # Relative Strength Index (RSI) - 14 day
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI_14'] = 100 - (100 / (1 + rs))
    
    # MACD
    exp1 = df['Close'].ewm(span=12, adjust=False).mean()
    exp2 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = exp1 - exp2
    df['Signal_Line'] = df['MACD'].ewm(span=9, adjust=False).mean()
    
    # Volatility (Rolling Std Dev)
    df['Volatility_10'] = df['Close'].rolling(window=10).std()
    
    # Target variable: Next day's close price
    df['Target_Next_Close'] = df['Close'].shift(-1)
    
    return df

async def predict_stock_price(symbol: str) -> dict:
    """
    Fetches historical data, trains a lightweight XGBoost model, 
    and predicts the next day's closing price.
    """
    try:
        # Fetch 2 years of historical data to train the model
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="2y")
        
        if hist.empty or len(hist) < 50:
            return {"error": "Not enough historical data to train the model."}

        # Clean and prepare features
        df = add_technical_indicators(hist)
        
        # Drop rows with NaN values created by rolling windows/shifts
        df = df.dropna()
        
        if len(df) < 100:
            return {"error": "Insufficient data after calculating indicators."}
            
        # Features and Target
        features = ['Open', 'High', 'Low', 'Close', 'Volume', 'SMA_5', 'SMA_10', 'SMA_20', 'RSI_14', 'MACD', 'Signal_Line', 'Volatility_10']
        X = df[features]
        y = df['Target_Next_Close']
        
        # Train an XGBoost Regressor
        # In a real enterprise app, we'd do a train/test split, hyperparameter tuning, etc.
        # For this prototype, we train a lightweight model on the entire dataset.
        model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42,
            objective='reg:squarederror'
        )
        
        model.fit(X, y)
        
        # Prepare the most recent day's data to make a prediction for tomorrow
        latest_data = hist.iloc[-1:] # Get the absolute last row (which was dropped from training due to shift(-1))
        # We need to manually calculate the indicators for this last row using the previous rows context
        # The easiest way is to re-calculate indicators on the original hist, then take the last row
        full_df_with_features = add_technical_indicators(hist.copy())
        # The target for the last row is NaN, but we only need features
        latest_features = full_df_with_features.iloc[-1:][features]
        
        # Make Prediction
        predicted_price = model.predict(latest_features)[0]
        current_price = hist['Close'].iloc[-1]
        
        # Calculate Feature Importance to explain the AI's decision
        importance = model.feature_importances_
        feature_importance = [{"feature": f, "importance": float(imp)} for f, imp in zip(features, importance)]
        feature_importance = sorted(feature_importance, key=lambda x: x['importance'], reverse=True)[:5] # Top 5
        
        # Generate a confidence score (dummy logic based on volatility for prototype)
        volatility = latest_features['Volatility_10'].values[0]
        confidence = max(40, 95 - (volatility / current_price * 1000)) # Simple inverse relationship
        
        predicted_change = ((predicted_price - current_price) / current_price) * 100
        
        return {
            "symbol": symbol,
            "current_price": round(float(current_price), 2),
            "predicted_price": round(float(predicted_price), 2),
            "predicted_change_pct": round(float(predicted_change), 2),
            "confidence_score": round(float(confidence), 1),
            "top_features": feature_importance,
            "sentiment": "Bullish" if predicted_change > 0 else "Bearish"
        }
        
    except Exception as e:
        logger.error(f"Prediction failed for {symbol}: {e}")
        return {"error": f"Model training failed: {str(e)}"}
