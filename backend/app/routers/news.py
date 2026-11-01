from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import NewsItem
from app.services.news_pipeline import run_news_pipeline
import logging

router = APIRouter(prefix="/news", tags=["News Engine"])
logger = logging.getLogger(__name__)

@router.get("")
async def get_news(db: AsyncSession = Depends(get_db), category: str = Query("All"), limit: int = 50, offset: int = 0):
    query = select(NewsItem)
    if category and category != "All":
        query = query.where(NewsItem.category == category)
    
    query = query.order_by(NewsItem.published_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    news = result.scalars().all()
    
    if not news:
        try:
            logger.info("No news found in DB, triggering news pipeline fetch...")
            await run_news_pipeline()
            result = await db.execute(query)
            news = result.scalars().all()
        except Exception as e:
            logger.warning(f"Error fetching initial news: {e}")
            
    return {"data": news, "news": news}
