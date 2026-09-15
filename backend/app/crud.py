from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from . import models, schemas
import yfinance as yf
import asyncio
import math

async def get_holdings(db: AsyncSession, user_id: int):
    result = await db.execute(select(models.Holding).where(models.Holding.user_id == user_id))
    return result.scalars().all()

async def create_holding(db: AsyncSession, holding: schemas.HoldingCreate, user_id: int):
    db_holding = models.Holding(**holding.model_dump(), user_id=user_id)
    db.add(db_holding)
    await db.commit()
    await db.refresh(db_holding)
    return db_holding

async def delete_user_holdings(db: AsyncSession, user_id: int):
    # This deletes all existing holdings for a user to replace with new CSV
    result = await db.execute(select(models.Holding).where(models.Holding.user_id == user_id))
    holdings = result.scalars().all()
    for holding in holdings:
        await db.delete(holding)
    await db.commit()

async def get_news_articles(db: AsyncSession, limit: int = 50):
    result = await db.execute(select(models.NewsArticle).order_by(models.NewsArticle.published_at.desc()).limit(limit))
    return result.scalars().all()

async def update_live_prices(db: AsyncSession, holdings: list):
    if not holdings:
        return []
    
    yf_symbols = []
    for h in holdings:
        sym = h.symbol.strip()
        if not sym.endswith(".NS") and not sym.endswith(".BO"):
            sym = f"{sym}.NS"
        yf_symbols.append(sym)
    
    def fetch_prices():
        try:
            tickers = " ".join(yf_symbols)
            data = yf.download(tickers, period="1d", progress=False)
            if data.empty:
                return {}
            # Check if 'Close' column exists
            if 'Close' not in data:
                return {}
                
            closes = data['Close'].iloc[-1]
            if len(yf_symbols) == 1:
                return {yf_symbols[0]: float(closes)}
            else:
                return closes.to_dict()
        except Exception as e:
            print(f"yfinance error: {e}")
            return {}
            
    live_prices = await asyncio.to_thread(fetch_prices)
    
    updated = False
    for i, h in enumerate(holdings):
        sym = yf_symbols[i]
        if sym in live_prices:
            price = live_prices[sym]
            if price and not math.isnan(price):
                h.current_price = float(price)
                updated = True
                
    if updated:
        await db.commit()
        
    return holdings

async def create_chat_session(db: AsyncSession, user_id: int, title: str = None):
    db_session = models.ChatSession(user_id=user_id, title=title)
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session

async def get_chat_sessions(db: AsyncSession, user_id: int):
    result = await db.execute(select(models.ChatSession).where(models.ChatSession.user_id == user_id).order_by(models.ChatSession.updated_at.desc()))
    return result.scalars().all()

async def create_chat_message(db: AsyncSession, session_id: int, message: schemas.ChatMessageCreate):
    db_message = models.ChatMessage(**message.model_dump(), session_id=session_id)
    db.add(db_message)
    
    # Update session updated_at
    session_result = await db.execute(select(models.ChatSession).where(models.ChatSession.id == session_id))
    session = session_result.scalars().first()
    if session:
        session.updated_at = func.now()
        
    await db.commit()
    await db.refresh(db_message)
    return db_message

async def get_chat_messages(db: AsyncSession, session_id: int):
    result = await db.execute(select(models.ChatMessage).where(models.ChatMessage.session_id == session_id).order_by(models.ChatMessage.created_at.asc()))
    return result.scalars().all()

async def create_alert(db: AsyncSession, user_id: int, alert: schemas.AlertCreate):
    db_alert = models.Alert(**alert.model_dump(), user_id=user_id)
    db.add(db_alert)
    await db.commit()
    await db.refresh(db_alert)
    return db_alert

async def get_alerts(db: AsyncSession, user_id: int):
    result = await db.execute(select(models.Alert).where(models.Alert.user_id == user_id).order_by(models.Alert.created_at.desc()))
    return result.scalars().all()

async def delete_alert(db: AsyncSession, alert_id: int, user_id: int):
    result = await db.execute(select(models.Alert).where(models.Alert.id == alert_id, models.Alert.user_id == user_id))
    alert = result.scalars().first()
    if alert:
        await db.delete(alert)
        await db.commit()
        return True
    return False
