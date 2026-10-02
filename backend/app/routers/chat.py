from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List
import json
import logging

from app.database import get_db
from app.models import ChatMessage, ChatSession, Holding, User
from app.services.ai_service import generate_chat_stream
from app import auth

router = APIRouter(prefix="/chat", tags=["AI Agent"])
logger = logging.getLogger(__name__)

class MessageInput(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    session_id: int
    messages: List[MessageInput]

@router.post("")
async def chat_with_agent(
    request: ChatRequest,
    current_user: User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify session ownership
    session = await db.execute(select(ChatSession).where(
        ChatSession.id == request.session_id, 
        ChatSession.user_id == current_user.id
    ))
    if not session.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # 1. Save user message to DB
    user_msg_content = request.messages[-1].content
    user_msg = ChatMessage(session_id=request.session_id, role="user", content=user_msg_content)
    db.add(user_msg)
    await db.commit()

    # Convert to list of dicts for ai_service
    msgs = [{"role": m.role, "content": m.content} for m in request.messages]
    
    # Pre-compute compact portfolio summary
    result = await db.execute(select(Holding).where(Holding.user_id == current_user.id))
    holdings = result.scalars().all()
    portfolio_summary = f"User has {len(holdings)} holdings. "
    if holdings:
        portfolio_summary += f"Top holdings include {', '.join([h.symbol for h in holdings[:5]])}."

    # 2. Get AI Streaming Response
    async def stream_and_save():
        full_response = ""
        try:
            stream = generate_chat_stream(msgs, portfolio_summary, db)
            async for chunk in stream:
                # Expecting 'data: {"text": "something"}\n\n'
                if chunk.startswith("data: "):
                    try:
                        data = json.loads(chunk[6:].strip())
                        full_response += data.get("text", "")
                    except:
                        pass
                yield chunk
                
            # 3. Save AI message to DB after stream finishes
            if full_response:
                ai_msg = ChatMessage(session_id=request.session_id, role="assistant", content=full_response)
                db.add(ai_msg)
                await db.commit()
                
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'text': ' Error generating response.'})}\n\n"

    return StreamingResponse(stream_and_save(), media_type="text/event-stream")

@router.get("/{session_id}")
async def get_chat_history(
    session_id: int, 
    current_user: User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await db.execute(select(ChatSession).where(
        ChatSession.id == session_id, 
        ChatSession.user_id == current_user.id
    ))
    if not session.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    msgs = await db.execute(
        select(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return {"messages": [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in msgs.scalars().all()]}
