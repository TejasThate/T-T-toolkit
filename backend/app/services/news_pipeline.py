import feedparser
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime, timezone
from sqlalchemy.future import select
from app.database import SessionLocal
from app.models import NewsArticle
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

# RSS Feeds for Indian Markets
FEEDS = {
    "Moneycontrol": "https://www.moneycontrol.com/rss/MCtopnews.xml",
    "LiveMint": "https://www.livemint.com/rss/markets"
}

class NewsAnalysis(BaseModel):
    affected_symbol: str = Field(description="The primary NSE stock symbol impacted by this news (e.g. 'RELIANCE'). Leave empty if none.")
    impact_score: float = Field(description="Impact score from -10 (highly negative) to +10 (highly positive). 0 if neutral.")
    impact_reason: str = Field(description="A concise 1-sentence reason for the impact score.")

async def run_news_pipeline():
    print("[News Pipeline] Starting RSS ingestion...")
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("[News Pipeline] GROQ_API_KEY missing. Skipping AI scoring.")
        return
        
    llm = ChatGroq(model="llama3-70b-8192", temperature=0.1, max_tokens=1024, api_key=groq_api_key)
    structured_llm = llm.with_structured_output(NewsAnalysis)
    
    async with SessionLocal() as session:
        for source, url in FEEDS.items():
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:5]: 
                    res = await session.execute(select(NewsArticle).where(NewsArticle.link == entry.link))
                    if res.scalars().first():
                        continue
                        
                    soup = BeautifulSoup(entry.get('summary', ''), "html.parser")
                    clean_text = soup.get_text()
                    full_text = f"Title: {entry.title}\nSummary: {clean_text}"
                    
                    print(f"[News Pipeline] Analyzing: {entry.title}")
                    
                    try:
                        analysis: NewsAnalysis = await structured_llm.ainvoke(
                            f"Analyze this Indian financial news and extract the primary affected NSE stock symbol, an impact score (-10 to +10), and a 1-sentence reason.\n\nNews:\n{full_text}"
                        )
                        
                        article = NewsArticle(
                            title=entry.title,
                            link=entry.link,
                            source=source,
                            published_at=datetime.now(timezone.utc),
                            affected_symbol=analysis.affected_symbol,
                            impact_score=analysis.impact_score,
                            impact_reason=analysis.impact_reason,
                            content=clean_text
                        )
                        session.add(article)
                        await session.commit()
                    except Exception as e:
                        print(f"[News Pipeline] AI scoring failed for {entry.title}: {e}")
            except Exception as e:
                print(f"[News Pipeline] Feed {source} failed: {e}")
                
    print("[News Pipeline] Completed.")
