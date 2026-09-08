from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from . import models, schemas

async def get_holdings(db: AsyncSession, user_id: int):
    result = await db.execute(select(models.Holding).where(models.Holding.user_id == user_id))
    return result.scalars().all()

async def create_holding(db: AsyncSession, holding: schemas.HoldingCreate, user_id: int):
    db_holding = models.Holding(**holding.dict(), user_id=user_id)
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
