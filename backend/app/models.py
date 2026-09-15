from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from .database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
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
