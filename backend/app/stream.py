from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
import asyncio
from typing import List, Optional
from app.cache import quotes_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

async def quote_generator(request: Request, symbols: List[str]):
    """
    Yields quotes to the client.
    Pushes diffs when possible.
    """
    last_pushed = {}
    
    while True:
        if await request.is_disconnected():
            logger.info("Client disconnected from SSE.")
            break
            
        # In a real scenario, this fetches from the active Provider Chain
        # For now, we simulate by checking cache or fetching
        # We will yield only changed values.
        
        # Simulated payload for now
        payload = {}
        # yield dict(data=json.dumps(payload))
        
        await asyncio.sleep(15) # Heartbeat / poll interval

@router.get("/quotes")
async def stream_quotes(request: Request, symbols: str):
    sym_list = [s.strip() for s in symbols.split(",") if s.strip()]
    return EventSourceResponse(quote_generator(request, sym_list))
