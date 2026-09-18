import pandas as pd
import numpy as np

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index (RSI)."""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    """Calculate MACD (Moving Average Convergence Divergence)."""
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return pd.DataFrame({
        'MACD': macd_line,
        'Signal': signal_line,
        'Histogram': histogram
    })

def detect_breakout(df: pd.DataFrame, window: int = 20) -> pd.Series:
    """
    Detect if the current close breaks out of the recent resistance (high of last `window` days)
    or breaks down below recent support (low of last `window` days).
    Returns 1 for Bullish Breakout, -1 for Bearish Breakdown, 0 otherwise.
    """
    rolling_high = df['high'].rolling(window=window).max().shift(1)
    rolling_low = df['low'].rolling(window=window).min().shift(1)
    
    signals = pd.Series(0, index=df.index)
    signals.loc[df['close'] > rolling_high] = 1
    signals.loc[df['close'] < rolling_low] = -1
    return signals

def generate_signals(df: pd.DataFrame) -> dict:
    """
    Given a DataFrame with OHLCV data, generates the latest trading signals.
    """
    if len(df) < 30:
        return {}
        
    df = df.copy()
    df['RSI'] = calculate_rsi(df['close'])
    macd_df = calculate_macd(df['close'])
    df['MACD'] = macd_df['MACD']
    df['MACD_Signal'] = macd_df['Signal']
    df['Breakout'] = detect_breakout(df)
    
    latest = df.iloc[-1]
    prev = df.iloc[-2]
    
    signals = {}
    
    # RSI Signals
    if latest['RSI'] > 70:
        signals["RSI"] = {"direction": "Bearish", "value": f"{latest['RSI']:.1f} (Overbought)"}
    elif latest['RSI'] < 30:
        signals["RSI"] = {"direction": "Bullish", "value": f"{latest['RSI']:.1f} (Oversold)"}
        
    # MACD Crossover
    if prev['MACD'] <= prev['MACD_Signal'] and latest['MACD'] > latest['MACD_Signal']:
        signals["MACD"] = {"direction": "Bullish", "value": "Bullish Crossover"}
    elif prev['MACD'] >= prev['MACD_Signal'] and latest['MACD'] < latest['MACD_Signal']:
        signals["MACD"] = {"direction": "Bearish", "value": "Bearish Crossover"}
        
    # Breakout
    if latest['Breakout'] == 1:
        signals["BREAKOUT"] = {"direction": "Bullish", "value": "Resistance Breakout"}
    elif latest['Breakout'] == -1:
        signals["BREAKOUT"] = {"direction": "Bearish", "value": "Support Breakdown"}
        
    return signals
