import feedparser
import random
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from . import crud, schemas

# Expanded RSS feeds targeting Indian Company & Investment News
RSS_FEEDS = [
    "https://economictimes.indiatimes.com/company/rssfeeds/2146843.cms", # ET Companies
    "https://www.livemint.com/rss/companies",                            # Mint Companies
    "https://www.business-standard.com/rss/companies-101.rss",           # Business Standard Companies
    "https://www.moneycontrol.com/rss/business.xml",                     # Moneycontrol Business
    "https://economictimes.indiatimes.com/markets/stocks/news/rssfeeds/2146842.cms" # ET Stock News
]

import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv() # Load variables from .env

# Configure Groq API if key is present
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def analyze_impact(title: str, summary: str):
    """
    Uses Groq to analyze impact. Falls back to keyword heuristic if no key.
    Filters out general market news.
    """
    if not client:
        # Fallback keyword heuristic if user hasn't set the API key yet
        return mock_analyze_impact(title, summary)
        
    prompt = f"""
    You are an expert Indian Stock Market AI analyst.
    Analyze the following news article:
    Title: {title}
    Summary: {summary}
    
    IMPORTANT INSTRUCTION:
    We ONLY want news that is specifically about individual companies, investments, fundings, acquisitions, or direct catalysts (e.g. "Reliance acquires startup", "TCS announces dividend", "Bajaj Finance hits 52 week high").
    DO NOT include general market news, sector overviews, global news, or index movements (e.g. "Sensex falls", "Nifty gains", "Market wrap", "Mid-day mood").
    
    If the news is general market news or NOT about a specific company, return "affected_symbol": "NONE".
    If the news IS about a specific company, determine its impact score and NSE symbol.
    
    Provide your output strictly in the following JSON format:
    {{
        "impact_score": <a float from 0.0 to 10.0, where 0 is extremely negative, 5 is neutral, and 10 is extremely positive>,
        "impact_reason": "<a short 1-sentence explanation>",
        "affected_symbol": "<the NSE stock symbol or 'NONE' if general news>"
    }}
    Do not include any markdown formatting or extra text, just the raw JSON object.
    """
    
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="qwen/qwen3.8-27b",
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        # Parse JSON
        result_text = response.choices[0].message.content
        data = json.loads(result_text)
        return float(data.get("impact_score", 5.0)), data.get("impact_reason", "AI analyzed."), data.get("affected_symbol", "NONE")
    except Exception as e:
        print(f"Groq API Error: {e}")
        return 5.0, f"Failed to analyze with AI: {str(e)}", "NONE"

def mock_analyze_impact(title: str, summary: str):
    # Simple keyword heuristic for demonstration
    text = (title + " " + summary).lower()
    score = random.uniform(2.0, 5.0) # Baseline neutral
    reason = "Mocked (No GEMINI_API_KEY found)."
    
    positive_words = ['surge', 'jump', 'profit', 'upgraded', 'wins', 'growth', 'record', 'dividend']
    negative_words = ['plunge', 'loss', 'downgraded', 'crash', 'scam', 'fraud', 'declines', 'misses']
    
    pos_count = sum(1 for w in positive_words if w in text)
    neg_count = sum(1 for w in negative_words if w in text)
    
    if pos_count > neg_count:
        score += min(5.0, pos_count * 1.5)
        reason = "Mocked: Positive sentiment detected."
    elif neg_count > pos_count:
        score -= min(3.0, neg_count * 1.5)
        score = max(0.0, score) # floor at 0
        reason = "Mocked: Negative sentiment detected."
        
    return round(score, 1), reason, "NIFTY50"

async def fetch_and_process_news(db: AsyncSession):
    articles_processed = 0
    
    for feed_url in RSS_FEEDS:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries[:4]: # Process top 4 from each feed to prevent timeouts
            title = entry.title
            link = entry.link
            summary = getattr(entry, 'summary', '')
            published_at = datetime.utcnow() # In reality, parse entry.published
            
            score, reason, symbol = analyze_impact(title, summary)
            
            # Skip general news based on our strict AI prompt
            if symbol == "NONE" or symbol == "UNKNOWN":
                continue
            
            article_data = schemas.NewsArticleCreate(
                title=title,
                link=link,
                published_at=published_at,
                source="RSS Feed",
                content=summary,
                impact_score=score,
                impact_reason=reason,
                affected_symbol=symbol
            )
            
            try:
                # Need to add create_news_article to crud.py
                from . import crud, models
                db_article = models.NewsArticle(**article_data.dict())
                db.add(db_article)
                await db.commit()
                articles_processed += 1
            except Exception as e:
                await db.rollback()
                # likely a unique constraint violation on link (already fetched)
                continue
                
    return articles_processed
