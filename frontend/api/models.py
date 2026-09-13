from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    google_access_token = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)

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
