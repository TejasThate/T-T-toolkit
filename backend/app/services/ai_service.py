import os
import json
import logging
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import NewsArticle, DailyBar
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

class RouterDecision(BaseModel):
    agent: str = Field(description="The agent to handle the query. Options: 'technical', 'fundamental', 'risk', 'general'")

def get_llm():
    return ChatGroq(model="llama-3.1-70b-versatile", temperature=0.2, max_tokens=1024, api_key=os.getenv("GROQ_API_KEY"))

async def call_technical_agent(query: str, db: AsyncSession) -> str:
    context = "We have access to DailyBars and ComputedSignals. For now, tell the user the Technical Agent is active and sees bullish patterns on NIFTY."
    llm = get_llm()
    prompt = f"You are the Technical Analysis Agent. Answer the query using chart patterns, indicators, and support/resistance.\n\nContext: {context}\n\nQuery: {query}"
    res = await llm.ainvoke([HumanMessage(content=prompt)])
    return f"📈 **Technical Agent:**\n{res.content}"

async def call_fundamental_agent(query: str, db: AsyncSession) -> str:
    result = await db.execute(select(NewsArticle).order_by(NewsArticle.published_at.desc()).limit(3))
    news = result.scalars().all()
    context = "\n".join([f"- {n.title} (Impact: {n.impact_score}/10, Symbol: {n.affected_symbol}) - {n.impact_reason}" for n in news])
    
    llm = get_llm()
    prompt = f"You are the Fundamental Analysis Agent. Answer the query using news sentiment, macroeconomics, and corporate announcements.\n\nRecent News Context:\n{context}\n\nQuery: {query}"
    res = await llm.ainvoke([HumanMessage(content=prompt)])
    return f"📰 **Fundamental Agent:**\n{res.content}"
    
async def call_risk_agent(query: str, db: AsyncSession) -> str:
    llm = get_llm()
    prompt = f"You are the Risk Management Agent. Answer the query focusing on position sizing, stop-loss placement, and portfolio exposure.\n\nQuery: {query}"
    res = await llm.ainvoke([HumanMessage(content=prompt)])
    return f"🛡️ **Risk Agent:**\n{res.content}"

async def generate_chat_response(messages: list, db: AsyncSession = None) -> str:
    if not os.getenv("GROQ_API_KEY"):
        return "GROQ_API_KEY is not configured in the environment. Please add it to enable Multi-Agent AI features."
        
    last_query = messages[-1]["content"] if messages else ""
    
    llm = get_llm()
    router_llm = llm.with_structured_output(RouterDecision)
    try:
        decision: RouterDecision = await router_llm.ainvoke(
            f"Given the user query, which specialized financial agent should answer it? Options: 'technical' (charts, price action, indicators), 'fundamental' (news, earnings, macro), 'risk' (portfolio sizing, stop-loss), 'general' (anything else).\n\nQuery: {last_query}"
        )
        target_agent = decision.agent.lower()
    except Exception as e:
        logger.error(f"Router failed: {e}")
        target_agent = "general"
        
    try:
        if target_agent == "technical" and db:
            return await call_technical_agent(last_query, db)
        elif target_agent == "fundamental" and db:
            return await call_fundamental_agent(last_query, db)
        elif target_agent == "risk" and db:
            return await call_risk_agent(last_query, db)
        else:
            langchain_msgs = [SystemMessage(content="You are a helpful Indian stock market AI assistant. Keep answers brief and professional.")]
            for m in messages:
                if m["role"] == "user":
                    langchain_msgs.append(HumanMessage(content=m["content"]))
                else:
                    langchain_msgs.append(AIMessage(content=m["content"]))
            res = await llm.ainvoke(langchain_msgs)
            return f"🤖 **General AI:**\n{res.content}"
    except Exception as e:
        return f"Error executing {target_agent} agent: {e}"

async def generate_forecast_summary(portfolio_context: str, market_context: str) -> str:
    if not os.getenv("GROQ_API_KEY"):
        return "AI Engine is offline. Please configure GROQ_API_KEY."
        
    prompt = f"Based on the user's portfolio and live quotes, write a 1 or 2 sentence market sentiment summary.\nBe punchy and actionable.\nPORTFOLIO:\n{portfolio_context}\nLIVE QUOTES:\n{market_context}"

    try:
        llm = get_llm()
        res = await llm.ainvoke([HumanMessage(content=prompt)])
        return res.content.strip()
    except Exception as e:
        logger.error(f"Groq Forecast error: {e}")
        return "Unable to generate forecast at this time."
