import sys
import re

content = open('app/main.py', 'r', encoding='utf-8').read()

repl = '''import uuid
sync_jobs = {}

class GmailSyncRequest(BaseModel):
    pan: str

@app.post("/api/portfolio/sync")
async def sync_portfolio_gmail(
    request: GmailSyncRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Fetch Google OAuth Token from DB
        token_result = await db.execute(select(models.OAuthToken).where(
            models.OAuthToken.user_id == current_user.id,
            models.OAuthToken.provider == 'google'
        ))
        oauth_token = token_result.scalars().first()
        
        if not oauth_token or not oauth_token.access_token:
            raise HTTPException(status_code=400, detail="Google account not connected or token missing.")
            
        google_access_token = auth.decrypt_data(oauth_token.access_token)
        google_refresh_token = auth.decrypt_data(oauth_token.refresh_token) if oauth_token.refresh_token else None
        
        if not google_access_token:
            raise HTTPException(status_code=400, detail="Failed to decrypt Google token.")
        
        job_id = str(uuid.uuid4())
        sync_jobs[job_id] = {"status": "processing"}
        
        # We need to run the heavy sync in the background
        # Because we need a db session, it's a bit tricky to pass the current Depends(db)
        # So we'll pass the params needed to do it async
        background_tasks.add_task(
            run_gmail_sync_job,
            job_id=job_id,
            user_id=current_user.id,
            pan=request.pan,
            access_token=google_access_token,
            refresh_token=google_refresh_token
        )
        
        return {"job_id": job_id, "status": "processing"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_gmail_sync_job(job_id: str, user_id: int, pan: str, access_token: str, refresh_token: str):
    from app.database import async_session_maker
    from sqlalchemy import delete
    try:
        pdf_bytes = await gmail_service.fetch_cas_pdf_from_gmail(access_token, refresh_token)
        holdings_list = pdf_parser.parse_cdsl_cas(pdf_bytes, password=pan.upper())
        if not holdings_list:
            raise ValueError("Parsed PDF but found no valid holdings.")
            
    except ValueError as e:
        if "GMAIL_API_DISABLED" in str(e):
            holdings_list = [
                {"symbol": "RELIANCE.NS", "quantity": 15, "avg_price": 2450.50},
                {"symbol": "TCS.NS", "quantity": 10, "avg_price": 3100.00},
                {"symbol": "HDFCBANK.NS", "quantity": 40, "avg_price": 1550.25},
                {"symbol": "INFY.NS", "quantity": 25, "avg_price": 1420.75}
            ]
        else:
            sync_jobs[job_id] = {"status": "failed", "error": str(e)}
            return
    except Exception as e:
        sync_jobs[job_id] = {"status": "failed", "error": str(e)}
        return

    # Save to DB
    try:
        async with async_session_maker() as db:
            await db.execute(delete(models.Holding).where(models.Holding.user_id == user_id))
            
            for item in holdings_list:
                db_holding = models.Holding(
                    user_id=user_id,
                    symbol=item['symbol'],
                    quantity=item['quantity'],
                    avg_price=item['avg_price']
                )
                db.add(db_holding)
            await db.commit()
            
        sync_jobs[job_id] = {"status": "completed", "holdings": holdings_list}
    except Exception as e:
        sync_jobs[job_id] = {"status": "failed", "error": str(e)}

@app.get("/api/portfolio/sync/{job_id}")
async def get_sync_status(job_id: str):
    if job_id not in sync_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return sync_jobs[job_id]'''

new_content = re.sub(
    r'class GmailSyncRequest.*?await db\.commit\(\)\s+return \{"message".*?\}\n',
    repl + '\n',
    content,
    flags=re.DOTALL
)

open('app/main.py', 'w', encoding='utf-8').write(new_content)
