import sys
import re

content = open('app/main.py', 'r', encoding='utf-8').read()

if 'from fastapi.responses import StreamingResponse' not in content:
    content = content.replace('from fastapi import FastAPI, Depends, HTTPException, status, Query, Request, File, UploadFile', 
                              'from fastapi import FastAPI, Depends, HTTPException, status, Query, Request, File, UploadFile\nfrom fastapi.responses import StreamingResponse')

repl = '''@app.post("/api/ai/chat")
async def chat_with_ai(
    request: ChatRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Compact portfolio summary
    result = await db.execute(select(models.Holding).where(models.Holding.user_id == current_user.id))
    holdings = result.scalars().all()
    portfolio_summary = f"User has {len(holdings)} holdings. Top holding: {holdings[0].symbol if holdings else 'None'}."
    
    # 4. Generate AI Response via Streaming
    try:
        messages = [{"role": "user", "content": request.message}]
        stream = ai_service.generate_chat_stream(
            messages=messages,
            portfolio_summary=portfolio_summary,
            db=db
        )
        return StreamingResponse(stream, media_type="text/event-stream")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))'''

new_content = re.sub(
    r'@app\.post\("/api/ai/chat"\).*?raise HTTPException\(status_code=500, detail=str\(e\)\)',
    repl,
    content,
    flags=re.DOTALL
)

open('app/main.py', 'w', encoding='utf-8').write(new_content)
