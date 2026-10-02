from cachetools import TTLCache
import time

# Create caches
quotes_cache = TTLCache(maxsize=1000, ttl=10) # 10s during market hours, can be adjusted dynamically
history_cache = TTLCache(maxsize=500, ttl=3600) # 1h
news_cache = TTLCache(maxsize=100, ttl=300) # 5m
constituents_cache = TTLCache(maxsize=50, ttl=86400) # 24h

def get_market_status():
    # Placeholder for market status logic
    # In production, this checks if current IST time is between 09:15 and 15:30 on weekdays
    # and not a holiday.
    return "OPEN"

def update_cache_ttl():
    # Example logic to adjust TTL based on market status
    status = get_market_status()
    # Unfortunately, TTLCache ttl is fixed at initialization in cachetools.
    # To support dynamic TTL, we would need a custom cache or rebuild the cache instance.
    pass
