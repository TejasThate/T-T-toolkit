from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    pan_number = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    symbol = Column(String, index=True)
    company_name = Column(String)
    quantity = Column(Float)
    average_price = Column(Float)
    current_price = Column(Float, nullable=True)
    sector = Column(String, nullable=True)

class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    link = Column(String, unique=True)
    published_at = Column(DateTime)
    source = Column(String)
    content = Column(Text, nullable=True)
    impact_score = Column(Float, nullable=True)  # Out of 10
    impact_reason = Column(Text, nullable=True)
    affected_symbol = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    predicted_direction = Column(String)  # Up, Down, Neutral
    confidence = Column(Float)
    target_date = Column(DateTime)
    actual_outcome = Column(String, nullable=True)  # Correct, Incorrect, Pending
    created_at = Column(DateTime, server_default=func.now())

class OAuthToken(Base):
    __tablename__ = "oauth_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    provider = Column(String) # e.g., 'google'
    access_token = Column(String) # encrypted
    refresh_token = Column(String, nullable=True) # encrypted
    scopes = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, index=True)
    role = Column(String) # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('idx_chat_msg_session_time', 'session_id', 'created_at'),
    )

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    symbol = Column(String, index=True)
    condition = Column(String) # 'price_above', 'price_below', 'percent_up', 'percent_down'
    target_value = Column(Float)
    is_active = Column(Integer, default=1) # 1 for True, 0 for False
    created_at = Column(DateTime, server_default=func.now())
    triggered_at = Column(DateTime, nullable=True)

class DailyBar(Base):
    __tablename__ = "daily_bars"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    date = Column(DateTime, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)

class ComputedSignal(Base):
    __tablename__ = "computed_signals"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    signal_type = Column(String, index=True) # e.g. "RSI", "MACD", "BREAKOUT"
    direction = Column(String) # "Bullish", "Bearish"
    value = Column(String, nullable=True) # e.g. "72.4 (Overbought)"
    timestamp = Column(DateTime, server_default=func.now())

# --- PHASE 0A TABLES ---
from sqlalchemy import Date, Boolean, JSON

class Instrument(Base):
    __tablename__ = "instruments"
    symbol = Column(String, primary_key=True, index=True)
    name = Column(String)
    isin = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    indices = Column(JSON, nullable=True)  # Store list as JSON
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class OhlcvDaily(Base):
    __tablename__ = "ohlcv_daily"
    symbol = Column(String, primary_key=True)
    date = Column(Date, primary_key=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    adj_close = Column(Float, nullable=True)
    volume = Column(Float)

class QuoteSnapshot(Base):
    __tablename__ = "quotes_snapshot"
    symbol = Column(String, primary_key=True, index=True)
    ltp = Column(Float)
    prev_close = Column(Float)
    change = Column(Float)
    change_pct = Column(Float)
    volume = Column(Float)
    day_high = Column(Float, nullable=True)
    day_low = Column(Float, nullable=True)
    week52_high = Column(Float, nullable=True)
    week52_low = Column(Float, nullable=True)
    as_of = Column(DateTime)
    source = Column(String)

class Signal(Base):
    __tablename__ = "signals"
    symbol = Column(String, primary_key=True)
    date = Column(Date, primary_key=True)
    indicators = Column(JSON) # JSONB in postgres
    score = Column(Float)
    verdict = Column(String)
    reasons = Column(JSON) # JSONB in postgres

class NewsItem(Base):
    __tablename__ = "news_items"
    id = Column(Integer, primary_key=True, index=True)
    url_hash = Column(String, unique=True, index=True)
    title = Column(String)
    source = Column(String)
    url = Column(String)
    published_at = Column(DateTime)
    snippet = Column(Text, nullable=True)
    symbols = Column(JSON, nullable=True) # Array of symbols
    sentiment = Column(Float, nullable=True)
    impact = Column(Float, nullable=True)
    category = Column(String, nullable=True)
    horizon = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    reason = Column(String, nullable=True)
    scored_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('idx_news_items_time_symbol', 'published_at', 'symbols'),
    )

class TechnicalAlert(Base):
    __tablename__ = "technical_alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String)
    conditions = Column(JSON) # List of conditions
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    last_triggered_at = Column(DateTime, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
