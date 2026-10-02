import sys

feed = """
@app.get("/health/feed")
def health_feed():
    from app.services.market_data import LatestTick, provider_name, last_snapshot_time
    import time
    ages = [time.time() - t.ts.timestamp() for t in LatestTick.values() if hasattr(t.ts, 'timestamp')]
    max_age = max(ages) if ages else 0
    return {
        "provider": provider_name,
        "subscribed_symbols": len(LatestTick),
        "max_tick_age_seconds": round(max_age, 2),
        "snapshot_age_seconds": round(time.time() - last_snapshot_time, 2)
    }
"""

content = open('app/main.py', 'r', encoding='utf-8').read()
if "/health/feed" not in content:
    open('app/main.py', 'a', encoding='utf-8').write(feed)
