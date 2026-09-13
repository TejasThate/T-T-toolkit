from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from .. import models, schemas, auth, news_service

router = APIRouter(prefix="/news", tags=["news"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/fetch")
@limiter.limit("5/minute")
async def trigger_news_fetch(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    background_tasks.add_task(news_service.fetch_and_process_news, db)
    return {"message": "News fetch and rating started in the background."}

@router.get("", response_model=List[schemas.NewsArticle])
@limiter.limit("20/minute")
async def get_news(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.NewsArticle)
        .order_by(models.NewsArticle.impact_score.desc())
        .limit(10)
    )
    return result.scalars().all()
