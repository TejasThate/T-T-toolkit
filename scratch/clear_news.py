import asyncio
import sys
import os

# Add backend to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.database import SessionLocal
from app.models import NewsArticle
from sqlalchemy import delete

async def clear_news():
    async with SessionLocal() as db:
        await db.execute(delete(NewsArticle))
        await db.commit()
        print("News articles cleared successfully!")

asyncio.run(clear_news())
