from fastapi import APIRouter
from .. import market_service
from ..cache import get_cache, set_cache

router = APIRouter(prefix="/market", tags=["market"])

@router.get("/live")
async def market_live():
    cached_data = await get_cache("market_live_data")
    if cached_data:
        return {"data": cached_data, "cached": True}
        
    data = await market_service.get_live_market_data()
    await set_cache("market_live_data", data, ttl_seconds=10)
    return {"data": data}
