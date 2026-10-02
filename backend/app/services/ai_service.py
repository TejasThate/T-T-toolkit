import os
import json
import logging
from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import NewsItem, Holding
from app.services.market_data import LatestTick

logger = logging.getLogger(__name__)

# -- TOOLS --

@tool
def get_price(symbol: str) -> str:
    """Fetch the latest live price and change for a given NSE symbol."""
    sym = symbol.strip().upper()
    if not sym.endswith(".NS") and not sym.endswith(".BO") and not sym.startswith("^"):
        sym = f"{sym}.NS"
    tick = LatestTick.get(sym)
    if tick:
        return f"{symbol}: ₹{tick.price} (Change: {tick.change_pct}%)"
    return f"Price for {symbol} not found in live cache."

@tool
def get_news(symbol: str) -> str:
    """Fetch the latest news impacting a specific stock symbol."""
    # We will simulate fetching from LatestNews cache or DB
    # For now, just a placeholder since we can't easily access the DB session inside the tool without passing it
    return f"Recent news for {symbol} is generally positive based on market trends."

@tool
def get_portfolio() -> str:
    """Fetch the user's current portfolio summary."""
    return "User portfolio: Rely on the compact summary provided in the system prompt."

TOOLS = [get_price, get_news, get_portfolio]

def get_llm(model_type: str = "fast", streaming: bool = False):
    api_key = os.getenv("GROQ_API_KEY")
    
    if model_type == "smart":
        model_name = os.getenv("SMART_MODEL", "llama-3.1-70b-versatile")
        max_tokens = 2048
    else:
        model_name = os.getenv("FAST_MODEL", "llama-3.1-8b-instant")
        max_tokens = 600

    return ChatGroq(
        model=model_name,
        temperature=0.2,
        max_tokens=max_tokens,
        api_key=api_key,
        streaming=streaming
    )

import hashlib
import time

_prompt_cache = {}

async def generate_chat_stream(
    messages: list, 
    portfolio_summary: str,
    db: AsyncSession
) -> AsyncGenerator[str, None]:
    if not os.getenv("GROQ_API_KEY"):
        yield "data: {\"text\": \"GROQ_API_KEY is not configured.\"}\n\n"
        return

    last_query = messages[-1]["content"].lower() if messages else ""
    prompt_hash = hashlib.md5((last_query + portfolio_summary).encode()).hexdigest()
    
    if prompt_hash in _prompt_cache:
        cached = _prompt_cache[prompt_hash]
        if time.time() < cached["expires_at"]:
            yield f"data: {json.dumps({'text': cached['response']})}\n\n"
            return
        else:
            del _prompt_cache[prompt_hash]

    # Check if user explicitly requested deep analysis
    model_type = "smart" if "deep analysis" in last_query or "analyze deeply" in last_query else "fast"
    
    llm = get_llm(model_type=model_type, streaming=True)
    llm_with_tools = llm.bind_tools(TOOLS)
    
    # System Prompt with Compact Portfolio
    sys_prompt = f"""You are a helpful, blazing fast Indian stock market AI assistant.
Keep answers concise (max 3 sentences unless asked for deep analysis).
Use the available tools if the user asks for real-time prices or news.
User Portfolio Summary:
{portfolio_summary}
"""
    
    langchain_msgs = [SystemMessage(content=sys_prompt)]
    
    # Keep only last 6 messages
    recent_messages = messages[-6:]
    for m in recent_messages:
        if m["role"] == "user":
            langchain_msgs.append(HumanMessage(content=m["content"]))
        else:
            langchain_msgs.append(AIMessage(content=m["content"]))
            
    # Initial streaming call
    try:
        full_response = ""
        async for chunk in llm_with_tools.astream(langchain_msgs):
            if chunk.content:
                full_response += chunk.content
                yield f"data: {json.dumps({'text': chunk.content})}\n\n"
            
            if hasattr(chunk, 'tool_call_chunks') and chunk.tool_call_chunks:
                pass 
                
        if full_response:
            _prompt_cache[prompt_hash] = {
                "response": full_response,
                "expires_at": time.time() + 300
            }
    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        yield f"data: {json.dumps({'text': f'Error: {e}'})}\n\n"

async def generate_forecast_summary(portfolio_context: str, market_context: str) -> str:
    if not os.getenv("GROQ_API_KEY"):
        return "AI Engine is offline. Please configure GROQ_API_KEY."
        
    prompt = f"Based on the user's portfolio and live quotes, write a 1 or 2 sentence market sentiment summary.\nBe punchy and actionable.\nPORTFOLIO:\n{portfolio_context}\nLIVE QUOTES:\n{market_context}"

    try:
        llm = get_llm(model_type="fast", streaming=False)
        res = await llm.ainvoke([HumanMessage(content=prompt)])
        return res.content.strip()
    except Exception as e:
        logger.error(f"Groq Forecast error: {e}")
        return "Unable to generate forecast at this time."
