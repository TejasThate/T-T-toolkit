import feedparser
from bs4 import BeautifulSoup
import json
import os
import hashlib
from datetime import datetime, timezone
import asyncio
import httpx
from app.database import SessionLocal
from app.models import NewsItem
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
from app.websocket_manager import manager

FEEDS = {
    "Moneycontrol": "https://www.moneycontrol.com/rss/MCtopnews.xml",
    "LiveMint": "https://www.livemint.com/rss/markets"
}

class SingleNewsAnalysis(BaseModel):
    url_hash: str = Field(description="The url_hash provided in the input.")
    symbols: list[str] = Field(description="List of NSE stock symbols impacted. Empty if none.")
    sentiment: float = Field(description="Sentiment score from -1.0 to +1.0.")
    impact: float = Field(description="Impact score from 1 to 10.")
    category: str = Field(description="Category e.g. Earnings, Macro, M&A, Regulatory, General.")
    reason: str = Field(description="A concise 1-sentence reason.")

class BatchNewsAnalysis(BaseModel):
    results: list[SingleNewsAnalysis]

async def fetch_feed(source: str, url: str) -> list:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            feed = feedparser.parse(response.content)
            return [(source, entry) for entry in feed.entries[:10]]
    except Exception as e:
        print(f"[News Pipeline] Error fetching feed {source}: {e}")
        return []

async def run_news_pipeline():
    print("[News Pipeline] Starting RSS ingestion...")
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("[News Pipeline] GROQ_API_KEY missing. Skipping AI scoring.")
        return

    # Phase 3 model routing (FAST_MODEL)
    model_name = os.getenv("FAST_MODEL", "llama-3.3-70b-versatile")
    llm = ChatGroq(model=model_name, temperature=0.1, max_tokens=2048, api_key=groq_api_key)
    structured_llm = llm.with_structured_output(BatchNewsAnalysis)
    
    # Fetch all feeds in parallel
    tasks = [fetch_feed(source, url) for source, url in FEEDS.items()]
    feed_results = await asyncio.gather(*tasks)
    
    all_entries = []
    for fr in feed_results:
        all_entries.extend(fr)
        
    async with SessionLocal() as db:
        new_items_data = []
        batch_prompt_text = ""
        
        from sqlalchemy.future import select
        
        for source, entry in all_entries:
            url_hash = hashlib.md5(entry.link.encode()).hexdigest()
            
            # Check if exists
            existing = await db.execute(select(NewsItem).where(NewsItem.url_hash == url_hash))
            if existing.scalars().first():
                continue
                
            soup = BeautifulSoup(entry.get('summary', ''), "html.parser")
            clean_text = soup.get_text()
            
            dt = datetime.now(timezone.utc)
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                from time import mktime
                dt = datetime.fromtimestamp(mktime(entry.published_parsed))

            item_data = {
                "url_hash": url_hash,
                "title": entry.title,
                "source": source,
                "url": entry.link,
                "published_at": dt,
                "snippet": clean_text[:200]
            }
            new_items_data.append(item_data)
            
            batch_prompt_text += f"Hash: {url_hash}\nTitle: {entry.title}\nSummary: {clean_text}\n---\n"
            
            if len(new_items_data) >= 20: # Batch of 20
                break
                
        if not new_items_data:
            print("[News Pipeline] No new items.")
            return
            
        print(f"[News Pipeline] Analyzing {len(new_items_data)} new items in batch.")
        
        try:
            analysis: BatchNewsAnalysis = await structured_llm.ainvoke(
                f"Analyze these Indian financial news headlines and extract the requested fields for each. Match them by 'url_hash'.\n\n{batch_prompt_text}"
            )
            
            analysis_map = {res.url_hash: res for res in analysis.results}
            
            ws_updates = []
            
            for item in new_items_data:
                res = analysis_map.get(item["url_hash"])
                if res:
                    new_news = NewsItem(
                        url_hash=item["url_hash"],
                        title=item["title"],
                        source=item["source"],
                        url=item["url"],
                        published_at=item["published_at"],
                        snippet=item["snippet"],
                        symbols=res.symbols,
                        sentiment=res.sentiment,
                        impact=res.impact,
                        category=res.category,
                        reason=res.reason
                    )
                    db.add(new_news)
                    
                    ws_updates.append({
                        "title": new_news.title,
                        "source": new_news.source,
                        "url": new_news.url,
                        "symbols": new_news.symbols,
                        "sentiment": new_news.sentiment,
                        "impact": new_news.impact,
                        "category": new_news.category,
                        "reason": new_news.reason,
                        "published_at": new_news.published_at.isoformat()
                    })
                    
            await db.commit()
            print(f"[News Pipeline] Saved {len(ws_updates)} items.")
            
            # Push to clients
            if ws_updates:
                await manager.broadcast(json.dumps({"type": "NEWS_UPDATE", "data": ws_updates}))
                
        except Exception as e:
            print(f"[News Pipeline] Batch AI analysis failed: {e}")
