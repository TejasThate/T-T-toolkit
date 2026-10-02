from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import NewsItem

router = APIRouter(prefix="/news", tags=["News Engine"])

@router.get("")
async def get_news(db: AsyncSession = Depends(get_db), category: str = Query("All"), limit: int = 50, offset: int = 0):
    query = select(NewsItem)
    if category and category != "All":
        query = query.where(NewsItem.category == category)
    
    query = query.order_by(NewsItem.published_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    news = result.scalars().all()
    return {"data": news}
