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
from pydantic import BaseModel, Field
from app.websocket_manager import manager

FEEDS = {
    "Moneycontrol": "https://www.moneycontrol.com/rss/MCtopnews.xml",
    "Moneycontrol Markets": "https://www.moneycontrol.com/rss/marketreports.xml",
    "Moneycontrol Business": "https://www.moneycontrol.com/rss/business.xml",
    "LiveMint Markets": "https://www.livemint.com/rss/markets",
    "LiveMint Companies": "https://www.livemint.com/rss/companies",
    "Economic Times": "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
        async with httpx.AsyncClient(timeout=10.0, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code == 200:
                feed = feedparser.parse(response.content)
                return [(source, entry) for entry in feed.entries[:15]]
            return []
    except Exception as e:
        print(f"[News Pipeline] Error fetching feed {source}: {e}")
        return []

KNOWN_INDIAN_STOCKS = [
    # Large Caps
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL", "SBIN", "ITC", 
    "LT", "HINDUNILVR", "TATAMOTORS", "BAJFINANCE", "MARUTI", "SUNPHARMA", "TITAN", 
    "AXISBANK", "ADANIENT", "NTPC", "ONGC", "POWERGRID", "TATASTEEL", "KOTAKBANK", 
    "M&M", "COALINDIA", "BAJAJFINSV", "NESTLEIND", "ULTRACEMCO", "ASIANPAINT", "WIPRO", 
    "TECHM", "HCLTECH", "JSWSTEEL", "GRASIM", "CIPLA", "DRREDDY", "BPCL", "EICHERMOT", 
    "HEROMOTOCO", "DIVISLAB", "APOLLOHOSP", "BRITANNIA", "TATACONSUM", "INDUSINDBK", 
    "BEL", "HAL", "VEDL", "IOC", "ADANIPORTS",
    # Mid & Small Caps & Trending
    "ZOMATO", "TRENT", "SUZLON", "BHEL", "IRFC", "RVNL", "MAZDOCK", "IREDA", 
    "MOTHERSON", "KPITTECH", "TATAELXSI", "POLYCAB", "PERSISTENT", "COFORGE", 
    "CDSL", "ANGELONE", "DIXON", "IDEA", "YESBANK", "NHPC", "SJVN", "JIOFIN", 
    "PRESTIGE", "PHOENIXLTD", "AUROPHARMA", "LTIM", "MUTHOOTFIN", "PAYTM", 
    "NYKAA", "PBFINTECH", "SWIGGY", "OLAELEC", "DEEPAKNTR", "EXIDEIND", "FEDERALBNK"
]

def fallback_sentiment_and_cat(title: str):
    t = title.lower()
    bullish_keywords = ["surge", "jump", "rally", "profit", "gain", "high", "rise", "soar", "record", "growth", "order win", "contract", "dividend"]
    bearish_keywords = ["drop", "plunge", "fall", "loss", "crash", "down", "decline", "weak", "concern", "fine", "penalty", "slump"]
    
    sentiment = 0.0
    if any(k in t for k in bullish_keywords):
        sentiment = 0.65
    elif any(k in t for k in bearish_keywords):
        sentiment = -0.65
        
    category = "General"
    if any(k in t for k in ["quarter", "q1", "q2", "q3", "q4", "result", "revenue", "profit", "ebitda", "net profit", "earnings"]):
        category = "Earnings"
    elif any(k in t for k in ["rbi", "inflation", "gdp", "repo rate", "fed", "macro", "economy", "fiscal", "rupee"]):
        category = "Macro"
    elif any(k in t for k in ["acquisition", "merger", "stake", "buyout", "deal", "takeover", "jv", "joint venture"]):
        category = "M&A"
    elif any(k in t for k in ["sebi", "rbi notice", "tax", "court", "investigation", "penalty", "notice", "ed"]):
        category = "Regulatory"
        
    # Extract likely symbols
    symbols = []
    for s in KNOWN_INDIAN_STOCKS:
        # Check symbol or common name
        s_lower = s.lower()
        if f" {s_lower} " in f" {t} " or s_lower in t:
            symbols.append(s)
            if len(symbols) >= 3:
                break
            
    return symbols, sentiment, 7.0, category, "Market news update"

async def run_news_pipeline():
    print("[News Pipeline] Starting RSS ingestion...")
    
    # Fetch all feeds in parallel
    tasks = [fetch_feed(source, url) for source, url in FEEDS.items()]
    feed_results = await asyncio.gather(*tasks)
    
    all_entries = []
    for fr in feed_results:
        all_entries.extend(fr)
        
    if not all_entries:
        print("[News Pipeline] No entries fetched from feeds.")
        return
        
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
            clean_snippet = soup.get_text()[:300].strip()
            
            # Offset-naive UTC datetime for PostgreSQL TIMESTAMP WITHOUT TIME ZONE
            published_at = datetime.utcnow()
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try:
                    published_at = datetime(*entry.published_parsed[:6])
                except Exception:
                    published_at = datetime.utcnow()
                
            item_data = {
                "url_hash": url_hash,
                "title": entry.title.strip(),
                "source": source,
                "url": entry.link,
                "published_at": published_at,
                "snippet": clean_snippet or entry.title.strip()
            }
            new_items_data.append(item_data)
            batch_prompt_text += f"url_hash: {url_hash}\nTitle: {entry.title}\nSnippet: {clean_snippet}\n---\n"
            
            if len(new_items_data) >= 50: # Ingest up to 50 items
                break
                
        if not new_items_data:
            print("[News Pipeline] No new items.")
            return
            
        print(f"[News Pipeline] Processing {len(new_items_data)} new items.")
        
        analysis_map = {}
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key and "mock" not in groq_api_key:
            try:
                from langchain_groq import ChatGroq
                model_name = os.getenv("FAST_MODEL", "llama-3.3-70b-versatile")
                llm = ChatGroq(model=model_name, temperature=0.1, max_tokens=2048, api_key=groq_api_key)
                structured_llm = llm.with_structured_output(BatchNewsAnalysis)
                analysis: BatchNewsAnalysis = await structured_llm.ainvoke(
                    f"Analyze these Indian financial news headlines and extract the requested fields for each. Match them by 'url_hash'.\n\n{batch_prompt_text[:3500]}"
                )
                analysis_map = {res.url_hash: res for res in analysis.results}
            except Exception as e:
                print(f"[News Pipeline] AI structured scoring error: {e}. Using rule-based fallback.")
                
        ws_updates = []
        for item in new_items_data:
            res = analysis_map.get(item["url_hash"])
            if res:
                symbols = res.symbols
                sentiment = res.sentiment
                impact = res.impact
                category = res.category
                reason = res.reason
            else:
                symbols, sentiment, impact, category, reason = fallback_sentiment_and_cat(item["title"])
                
            new_news = NewsItem(
                url_hash=item["url_hash"],
                title=item["title"],
                source=item["source"],
                url=item["url"],
                published_at=item["published_at"],
                snippet=item["snippet"],
                symbols=symbols,
                sentiment=sentiment,
                impact=impact,
                category=category,
                reason=reason
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
        print(f"[News Pipeline] Successfully saved {len(ws_updates)} items to database.")
        
        # Push to clients
        if ws_updates:
            try:
                await manager.broadcast(json.dumps({"type": "NEWS_UPDATE", "data": ws_updates}))
            except Exception as e:
                print(f"[News Pipeline] Broadcast error: {e}")
