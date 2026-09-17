import os
import httpx
import logging
from typing import List, Dict
from app.services import ai_service

logger = logging.getLogger(__name__)

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

async def fetch_financial_news(query: str = "Indian stock market OR NSE OR BSE", limit: int = 10) -> List[Dict]:
    """
    Fetches latest financial news using NewsAPI and tags each with a sentiment using Groq.
    """
    if not NEWS_API_KEY:
        logger.warning("NEWS_API_KEY is not set. Returning empty news.")
        return []

    url = f"https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": limit,
        "apiKey": NEWS_API_KEY
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            articles = data.get("articles", [])
            
            processed_articles = []
            for article in articles:
                # We only want articles that have titles and URLs
                if not article.get("title") or not article.get("url"):
                    continue
                
                title = article.get("title")
                description = article.get("description", "")
                
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
                    "description": description,
                    "url": article.get("url"),
                    "source": article.get("source", {}).get("name", "Unknown"),
                    "published_at": article.get("publishedAt"),
                    "sentiment": sentiment
                })
                
            return processed_articles
            
    except Exception as e:
        logger.error(f"NewsAPI error: {e}")
        return []
