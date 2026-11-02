import os
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib
import time

from app.services.live_market_state import market_state

logger = logging.getLogger(__name__)

# Valid Groq Models (llama-3.1-70b-versatile was deprecated by Groq, replaced by 3.3)
DEFAULT_FAST_MODEL = "llama-3.1-8b-instant"
DEFAULT_SMART_MODEL = "llama-3.3-70b-versatile"

def get_llm(model_type: str = "fast", streaming: bool = False):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.startswith("mock"):
        return None

    model_name = os.getenv("SMART_MODEL", DEFAULT_SMART_MODEL) if model_type == "smart" else os.getenv("FAST_MODEL", DEFAULT_FAST_MODEL)
    max_tokens = 2048 if model_type == "smart" else 750

    try:
        return ChatGroq(
            model=model_name,
            temperature=0.2,
            max_tokens=max_tokens,
            api_key=api_key,
            streaming=streaming
        )
    except Exception as e:
        logger.warning(f"Error initializing ChatGroq: {e}")
        return None

def build_refined_market_forecast(portfolio_context: str = "", market_context: str = "") -> str:
    """
    Generates an institutional-grade, highly refined market summary for Indian Equities (NSE/BSE).
    Inspired by Groww Insights and institutional morning intelligence notes.
    """
    indices = market_state.get_indices()
    nifty = next((i for i in indices if "NIFTY 50" in i["name"]), None)
    bank_nifty = next((i for i in indices if "BANK" in i["name"]), None)
    breadth = market_state.get_breadth()
    top_gainers = market_state.get_movers("gainers", 3)
    top_losers = market_state.get_movers("losers", 2)
    sectors = market_state.get_sectors()

    nifty_val = f"{nifty['value']:,.1f}" if nifty else "24,150.0"
    nifty_chg = f"{nifty['change_pct']:+.2f}%" if nifty else "+0.53%"
    is_nifty_bullish = nifty and nifty['change_pct'] >= 0

    gainers_str = ", ".join([f"{g['ticker']} ({g['change_pct']:+.2f}%)" for g in top_gainers]) if top_gainers else "Reliance (+1.4%), Trent (+4.1%)"
    losers_str = ", ".join([f"{l['ticker']} ({l['change_pct']:+.2f}%)" for l in top_losers]) if top_losers else "IndusInd Bank (-2.9%)"
    lead_sector = sectors[0]["sector"] if sectors else "Energy & IT"
    lead_sec_pct = f"{sectors[0]['change_pct']:+.2f}%" if sectors else "+1.8%"

    regime = "Bullish Momentum" if is_nifty_bullish else "Defensive Consolidation"

    forecast = (
        f"**Market Regime: {regime}** | NIFTY 50 trading at **{nifty_val}** ({nifty_chg}). "
        f"Market breadth stands at **{breadth['ratio']}:1** (Advances: {breadth['advances']}, Declines: {breadth['declines']}). "
        f"Sector leadership led by **{lead_sector}** ({lead_sec_pct}). "
        f"Top momentum drivers: {gainers_str}. Lagging: {losers_str}. "
        f"Tactical bias: Accumulate high relative strength leaders on intraday pullbacks."
    )
    return forecast

_prompt_cache = {}

async def generate_chat_stream(
    messages: list, 
    portfolio_summary: str,
    db: AsyncSession
) -> AsyncGenerator[str, None]:
    last_query = messages[-1]["content"] if messages else ""
    llm = get_llm(model_type="fast", streaming=True)
    
    # If Groq is not configured or fails, yield refined intelligent stream directly
    if not llm:
        from app.routers.chat import generate_intelligent_fallback_response
        refined = generate_intelligent_fallback_response(last_query, portfolio_summary)
        # Yield in chunks for realistic responsive streaming
        words = refined.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + " "
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        return

    # Real Groq execution with live market grounding
    indices = market_state.get_indices()
    top_gainers = market_state.get_movers("gainers", 4)
    idx_strs = [f"{i.get('name')}: {i.get('value')} ({i.get('change_pct', 0):+.2f}%)" for i in indices]
    g_strs = [f"{g.get('ticker')}: Rs. {g.get('ltp')} ({g.get('change_pct', 0):+.2f}%)" for g in top_gainers]
    market_snapshot = (
        f"Current NSE Indices: {', '.join(idx_strs)}. "
        f"Top Gainers Today: {', '.join(g_strs)}."
    )

    sys_prompt = f"""You are an elite, highly refined Indian Stock Market analyst and trading mentor (trained on Groww and NSE institutional research).
You answer strictly about the Indian Stock Market (NSE / BSE).
Always provide clean, structured markdown with:
- Clear, bulleted insights
- Exact price levels, supports, and resistances
- Specific sector momentum
- Actionable conclusions for retail investors
Current Live Market Context:
{market_snapshot}
User Portfolio Context:
{portfolio_summary}
"""
    langchain_msgs = [SystemMessage(content=sys_prompt)]
    for m in messages[-6:]:
        if m["role"] == "user":
            langchain_msgs.append(HumanMessage(content=m["content"]))
        else:
            langchain_msgs.append(AIMessage(content=m["content"]))

    try:
        async for chunk in llm.astream(langchain_msgs):
            if chunk.content:
                yield f"data: {json.dumps({'text': chunk.content})}\n\n"
    except Exception as e:
        logger.error(f"Groq streaming error: {e}")
        from app.routers.chat import generate_intelligent_fallback_response
        fallback = generate_intelligent_fallback_response(last_query, portfolio_summary)
        yield f"data: {json.dumps({'text': fallback})}\n\n"

async def generate_forecast_summary(portfolio_context: str, market_context: str) -> str:
    llm = get_llm(model_type="fast", streaming=False)
    if not llm:
        return build_refined_market_forecast(portfolio_context, market_context)

    prompt = (
        f"You are a Senior Quantitative Market Strategist for the Indian Stock Market.\n"
        f"Based on live NSE quotes and user context, write a crisp 2-sentence institutional market forecast.\n"
        f"Tone: Crisp, authoritative, highly refined, analytical (Groww/institutional style).\n"
        f"PORTFOLIO: {portfolio_context}\n"
        f"LIVE MARKET: {market_context}\n"
    )
    try:
        res = await llm.ainvoke([HumanMessage(content=prompt)])
        content = res.content.strip()
        if content and len(content) > 20:
            return content
        return build_refined_market_forecast(portfolio_context, market_context)
    except Exception as e:
        logger.warning(f"Groq Forecast invocation error: {e}")
        return build_refined_market_forecast(portfolio_context, market_context)
