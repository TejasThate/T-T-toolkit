import os
import logging
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not set. AI features will fail.")

async def generate_chat_response(query: str, portfolio_context: str, market_context: str, gainers_context: str) -> str:
    """
    Generates a response from Gemini, given the user's query and the current context.
    For this iteration, we use a single-turn stateless approach.
    """
    if not client:
        raise ValueError("GEMINI_API_KEY is missing from environment variables.")
        
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
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=query,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
            )
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise ValueError(f"AI Engine failed to generate response: {e}")

async def generate_forecast_summary(portfolio_context: str, market_context: str) -> str:
    """
    Generates a very short (2 sentence max) forecast/sentiment summary for the sidebar widget.
    """
    if not client:
        return "AI Engine is offline. Please configure GEMINI_API_KEY."
        
    prompt = f"""Based on the user's portfolio and live quotes, write a 1 or 2 sentence market sentiment summary.
Be punchy and actionable. DO NOT use markdown formatting (no bolding, no lists).

PORTFOLIO:
{portfolio_context}

LIVE QUOTES:
{market_context}
"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
            )
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini Forecast error: {e}")
        return "Unable to generate forecast at this time."
