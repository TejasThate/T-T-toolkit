import asyncio
import os
import sys

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services import news_service, market_data

async def test_news():
    print("Testing fetch_financial_news...")
    try:
        articles = await news_service.fetch_financial_news(limit=2)
        print(f"Success! Fetched {len(articles)} articles.")
        for a in articles:
            print(f" - {a.get('title')}")
    except Exception as e:
        print(f"ERROR in fetch_financial_news: {e}")
        import traceback
        traceback.print_exc()

async def test_market():
    print("\nTesting fetch_top_gainers...")
    try:
        gainers = await market_data.fetch_top_gainers(limit=2)
        print(f"Success! Fetched {len(gainers)} gainers.")
        for g in gainers:
            print(f" - {g.get('symbol')}: {g.get('change_pct')}%")
    except Exception as e:
        print(f"ERROR in fetch_top_gainers: {e}")
        import traceback
        traceback.print_exc()

async def main():
    await test_news()
    await test_market()

if __name__ == "__main__":
    asyncio.run(main())
