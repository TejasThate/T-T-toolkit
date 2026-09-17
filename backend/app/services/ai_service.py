import os
import logging
from groq import AsyncGroq

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = None
if GROQ_API_KEY:
    client = AsyncGroq(api_key=GROQ_API_KEY)
else:
    logger.warning("GROQ_API_KEY is not set. AI features will fail.")

async def generate_chat_response(query: str, portfolio_context: str, market_context: str, gainers_context: str) -> str:
    """
    Generates a response from Groq, given the user's query and the current context.
    For this iteration, we use a single-turn stateless approach.
    """
    if not client:
        return (
            "**Mock AI Response**\n"
            "I see you don't have a GROQ_API_KEY configured in your backend. "
            "To get real AI insights, please add your Groq key to the Render environment variables.\n\n"
            "Based on your context, your portfolio seems to be tracking well. If you had an active API key, "
            "I would give you a deep analysis of your positions!"
        )
        
    system_instruction = f"""You are 'T&T AI', a hyper-intelligent, data-driven financial assistant built by Tejas Thate.
You have real-time access to the user's portfolio and live market data.

CURRENT CONTEXT:
--- PORTFOLIO HOLDINGS ---
{portfolio_context}

--- LIVE QUOTES (For Portfolio) ---
{market_context}

--- TODAY'S TOP GAINERS ---
{gainers_context}

INSTRUCTIONS:
1. Ground your answers ONLY in the provided context if the user asks about their portfolio or the market.
2. Be concise, professional, and slightly witty.
3. If the user asks about something completely unrelated to finance, politely steer them back.
4. Format your response in Markdown (e.g. use bolding for stock tickers, bullet points for lists).
"""

    try:
        response = await client.chat.completions.create(
            model='llama3-8b-8192',
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": query}
            ],
            temperature=0.4,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return f"AI Engine failed to generate response: {e}"

async def generate_forecast_summary(portfolio_context: str, market_context: str) -> str:
    """
    Generates a very short (2 sentence max) forecast/sentiment summary for the sidebar widget.
    """
    if not client:
        return "AI Engine is offline. Please configure GROQ_API_KEY."
        
    prompt = f"""Based on the user's portfolio and live quotes, write a 1 or 2 sentence market sentiment summary.
Be punchy and actionable. DO NOT use markdown formatting (no bolding, no lists).

PORTFOLIO:
{portfolio_context}

LIVE QUOTES:
{market_context}
"""

    try:
        response = await client.chat.completions.create(
            model='llama3-8b-8192',
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq Forecast error: {e}")
        return "Unable to generate forecast at this time."
