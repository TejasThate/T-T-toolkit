import os
import logging
import feedparser
from typing import List, Dict
from app.services import ai_service
import asyncio

logger = logging.getLogger(__name__)

async def fetch_financial_news(query: str = "Indian stock market OR NSE OR BSE", limit: int = 10) -> List[Dict]:
    """
    Fetches latest financial news using Google News RSS (no API key required)
    and tags each with a sentiment using Groq.
    """
    import urllib.parse
    encoded_query = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"

    try:
        # feedparser.parse is blocking, so run it in a thread
        feed = await asyncio.to_thread(feedparser.parse, url)
        
        articles = feed.entries[:limit]
        
        processed_articles = []
        for article in articles:
            title = article.get("title", "")
            url = article.get("link", "")
            published = article.get("published", "")
            source = article.get("source", {}).get("title", "Google News")
            
            if not title or not url:
                continue
            
            # Tag sentiment using Groq (fast/cheap check)
            sentiment = "Neutral"
            if ai_service.client:
                try:
                    sentiment_prompt = f"Analyze the sentiment of this financial news headline: '{title}'. Reply with ONLY ONE WORD: 'Bullish', 'Bearish', or 'Neutral'."
                    gen_res = await ai_service.client.chat.completions.create(
                        model='llama3-8b-8192',
                        messages=[{"role": "user", "content": sentiment_prompt}],
                        temperature=0.1
                    )
                    raw_sentiment = gen_res.choices[0].message.content.strip().lower()
                    if "bullish" in raw_sentiment: sentiment = "Bullish"
                    elif "bearish" in raw_sentiment: sentiment = "Bearish"
                except Exception as e:
                    logger.error(f"Failed to generate sentiment: {e}")
            
            processed_articles.append({
                "title": title,
                "description": "", # RSS descriptions are often messy HTML
                "url": url,
                "source": source,
                "published_at": published,
                "sentiment": sentiment
            })
            
        return processed_articles
        
    except Exception as e:
        logger.error(f"RSS feed error: {e}")
        return []
