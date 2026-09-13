import os
import json
from typing import Any, Optional
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL")

# Try to connect to Redis if URL is provided
redis_client = None
if REDIS_URL:
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")

# Fallback in-memory cache for local dev / no-redis setup
_memory_cache = {}

async def get_cache(key: str) -> Optional[Any]:
    if redis_client:
        try:
            val = await redis_client.get(key)
            if val:
                return json.loads(val)
            return None
        except Exception as e:
            print(f"Redis get error: {e}")
            
    return _memory_cache.get(key)

async def set_cache(key: str, value: Any, ttl_seconds: int = 10):
    if redis_client:
        try:
            await redis_client.setex(key, ttl_seconds, json.dumps(value))
            return
        except Exception as e:
            print(f"Redis set error: {e}")
            
    _memory_cache[key] = value
    # Note: in-memory cache won't auto-expire in this simplistic implementation,
    # but it's only a fallback.
