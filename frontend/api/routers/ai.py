from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
import os
from groq import AsyncGroq

from ..database import get_db
from .. import models, crud, auth

router = APIRouter(prefix="/ai", tags=["ai"])
limiter = Limiter(key_func=get_remote_address)

client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", "dummy_key"))

class ChatRequest(BaseModel):
    query: str

@router.post("/chat")
@limiter.limit("5/minute")
async def ai_chat(
    req: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    holdings = await crud.get_holdings(db, current_user.id)
    portfolio_context = "\\n".join([f"{h.symbol} ({h.company_name}): {h.quantity} shares @ {h.average_price}" for h in holdings])
    
    prompt = f"""
    You are an expert financial AI assistant. The user is asking a question about their stock portfolio or the market.
    Here is the user's current portfolio:
    {portfolio_context if portfolio_context else "No stocks currently held."}
    
    User Query: {req.query}
    
    Provide a concise, analytical response focusing on market trends, risk management, and the specific query.
    """
    
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-8b-instant",
        )
        return {"reply": chat_completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
