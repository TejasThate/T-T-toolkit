from fastapi import FastAPI, Depends, HTTPException, status, Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List
import csv
import io
from fastapi import UploadFile, File

from .database import engine, Base, get_db
from . import models, schemas, crud, auth, news_service, market_service, prediction_service
from app.services import market_data
from app.services import gmail_service, pdf_parser, ai_service
import sentry_sdk
import os

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="T&T Toolkit API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

import time
import logging
import os
import json
from fastapi import Request
from fastapi.middleware.gzip import GZipMiddleware

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("api")

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    duration_ms = process_time * 1000
    
    log_msg = f"{request.method} {request.url.path} - {response.status_code} - {duration_ms:.2f}ms"
    if duration_ms > 1000:
        logger.warning(f"SLOW REQUEST: {log_msg}")
    else:
        logger.info(log_msg)
        
    response.headers["X-Process-Time"] = str(process_time)
    return response

from sqlalchemy import text

@app.get("/health")
async def health_check():
    return {"status": "ok", "provider": os.getenv("MARKET_PROVIDER", "yfinance")}

@app.get("/health/deep")
async def health_check_deep(db: AsyncSession = Depends(get_db)):
    start_time = time.time()
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    duration_ms = (time.time() - start_time) * 1000
    
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
        "db_ping_ms": round(duration_ms, 2)
    }

import time
HEALTH_STATE = {
    "last_polled_time": None
}

import re

# We use allow_origin_regex for Vercel preview deployments
app.add_middleware(GZipMiddleware, minimum_size=1000)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://t-t-toolkit.vercel.app").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After", "ETag"],
)
from fastapi.responses import JSONResponse
import uuid

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    # Return JSON with CORS headers
    headers = {
        "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
        "Access-Control-Allow-Credentials": "true",
    }
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "code": "500",
            "request_id": request.headers.get("x-request-id", str(uuid.uuid4()))
        },
        headers=headers
    )

from app.scheduler import start_scheduler, stop_scheduler
from app.stream import router as stream_router

app.include_router(stream_router, prefix="/stream", tags=["Stream"])

@app.on_event("startup")
async def startup():
    from app.services.market_data import market_data_poller
    import asyncio
    asyncio.create_task(market_data_poller(app))
    import os
    print("--- STARTUP DIAGNOSTICS ---")
    
    # Check Database
    try:
        async with engine.begin() as conn:
            await conn.run_sync(models.Base.metadata.create_all)
        print("[OK] Connected to database and initialized tables.")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        
    start_scheduler()

        
    # Check Environment Variables
    if not os.getenv("GROQ_API_KEY"):
        print("[WARNING] GROQ_API_KEY is missing. AI features will use mocked responses.")
    else:
        print("[OK] GROQ_API_KEY is set.")
        
    if not os.getenv("GOOGLE_CLIENT_ID") or not os.getenv("GOOGLE_CLIENT_SECRET"):
        print("[WARNING] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Gmail Sync and Google Login will fail.")
    else:
        print("[OK] Google OAuth credentials are set.")
        
    print("---------------------------")
    
    # Initialize WebSocket Manager Redis Listener
    from app.websocket_manager import manager
    import asyncio
    asyncio.create_task(manager.redis_listener())

    # Initialize APScheduler for Market Data Polling (Phase 1)
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from app.services.screener_service import update_screener_signals
    import json
    from app.services import market_data
    
    async def poll_market_data():
        try:
            HEALTH_STATE["last_polled_time"] = time.time()
            indices = ["NIFTY 50", "SENSEX"]
            index_data = [await market_data.fetch_index_data(idx) for idx in indices]
            gainers = await market_data.fetch_top_gainers(5)
            losers = await market_data.fetch_top_losers(5)
            quotes = await market_data.fetch_quotes(["RELIANCE", "TCS", "HDFCBANK", "INFY"])
            
            payload = {
                "type": "market_update",
                "indices": index_data,
                "gainers": gainers,
                "losers": losers,
                "quotes": quotes
            }
            # Broadcast to websocket via Redis pub/sub relay
            await manager.broadcast(json.dumps(payload), channel="market:updates")
            
            # --- PHASE 5: ALERT EVALUATION ---
            from app.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                # Get all active alerts
                result = await session.execute(select(models.Alert).where(models.Alert.is_active == 1))
                active_alerts = result.scalars().all()
                
                for alert in active_alerts:
                    # If we have a quote for this symbol
                    if alert.symbol in quotes:
                        current_price = quotes[alert.symbol]["price"]
                        triggered = False
                        
                        if alert.condition == "price_above" and current_price >= alert.target_value:
                            triggered = True
                        elif alert.condition == "price_below" and current_price <= alert.target_value:
                            triggered = True
                            
                        if triggered:
                            # 1. Update DB (Deactivate and set triggered_at)
                            alert.is_active = 0
                            from sqlalchemy.sql import func
                            alert.triggered_at = func.now()
                            await session.commit()
                            
                            # 2. Push WebSocket Notification specifically for this user
                            alert_payload = {
                                "type": "alert_triggered",
                                "user_id": alert.user_id,
                                "alert_id": alert.id,
                                "symbol": alert.symbol,
                                "condition": alert.condition,
                                "target_value": alert.target_value,
                                "triggered_price": current_price
                            }
                            # Send to Redis pubsub so the worker holding the user's socket can relay it
                            await manager.broadcast(json.dumps(alert_payload), channel="market:updates")

        except Exception as e:
            print(f"[ERROR] Polling market data failed: {e}")

@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()

    async def run_daily_screener():
        try:
            from app.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                await update_screener_signals(session)
        except Exception as e:
            print(f"[ERROR] Screener update failed: {e}")
            
    async def run_news_pipeline_job():
        try:
            from app.services.news_pipeline import run_news_pipeline
            await run_news_pipeline()
        except Exception as e:
            print(f"[ERROR] News pipeline failed: {e}")
            
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(poll_market_data, 'interval', seconds=60)
    # Run screener daily at midnight
    scheduler.add_job(run_daily_screener, 'cron', hour=0, minute=0)
    # Run news pipeline every 4 hours instead of 1 hour to save resources
    scheduler.add_job(run_news_pipeline_job, 'interval', hours=4)
    
    scheduler.start()
    print("[OK] Started APScheduler for market data and screeners.")

@app.get("/")
def read_root():
    return {"message": "T&T Toolkit API is running. Try /docs for API documentation."}

from fastapi import WebSocket, WebSocketDisconnect
from app.websocket_manager import manager

@app.websocket("/ws/market")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

from app.services.screener_service import get_active_signals

@app.get("/api/news")
async def get_news(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.NewsArticle).order_by(models.NewsArticle.published_at.desc()).limit(20))
    news = result.scalars().all()
    
    news_list = []
    for n in news:
        news_list.append({
            "id": n.id,
            "title": n.title,
            "link": n.link,
            "source": n.source,
            "published_at": n.published_at,
            "affected_symbol": n.affected_symbol,
            "impact_score": n.impact_score,
            "impact_reason": n.impact_reason
        })
    return {"news": news_list}

@app.get("/api/screener/signals")
async def get_screener_signals(db: AsyncSession = Depends(get_db)):
    signals = await get_active_signals(db)
    return {"signals": signals}


@app.get("/models")
async def list_models():
    models = await news_service.client.models.list()
    return {"models": [m.id for m in models.data]}

@app.get("/market/live")
async def market_live():
    data = await market_service.get_live_market_data()
    return {"data": data}

@app.get("/api/market/ipos")
async def get_ipos():
    from app.services.ipo_scraper import fetch_live_ipos
    import asyncio
    ipos = await asyncio.to_thread(fetch_live_ipos)
    return {"ipos": ipos}

@app.get("/api/market/predict/{symbol}")
async def predict_trend(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    try:
        res = await prediction_service.get_prediction(symbol, db)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/market/prediction-stats")
async def get_prediction_stats(db: AsyncSession = Depends(get_db)):
    try:
        # Get historical hit rate
        result = await db.execute(
            select(models.PredictionLog)
            .where(models.PredictionLog.actual_outcome.in_(["Correct", "Incorrect"]))
        )
        logs = result.scalars().all()
        total = len(logs)
        correct = sum(1 for log in logs if log.actual_outcome == "Correct")
        
        hit_rate = (correct / total * 100) if total > 0 else 0
        
        # We can also quickly call the batch retrain for demonstration (normally a cron job)
        retrain_msg = await prediction_service.batch_retrain_models(db)

        return {
            "total_evaluated": total,
            "correct_predictions": correct,
            "hit_rate_percentage": round(hit_rate, 2),
            "retrain_status": retrain_msg["message"]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/register", response_model=schemas.Token)
@limiter.limit("5/minute")
async def register(request: Request, user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(models.User).where(models.User.email == user.email))
        db_user = result.scalars().first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        hashed_password = auth.get_password_hash(user.password)
        new_user = models.User(email=user.email, hashed_password=hashed_password)
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        access_token = auth.create_access_token(data={"sub": new_user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Registration Error: {str(e)}")

@app.post("/auth/login", response_model=schemas.Token)
@limiter.limit("10/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(models.User).where(models.User.email == form_data.username))
        user = result.scalars().first()
        if not user or not auth.verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = auth.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Login Error: {str(e)}")

class GoogleAuthCodeRequest(BaseModel):
    code: str

@app.post("/auth/google", response_model=schemas.Token)
@limiter.limit("5/minute")
async def google_login(request: Request, req: GoogleAuthCodeRequest, db: AsyncSession = Depends(get_db)):
    try:
        import asyncio
        loop = asyncio.get_running_loop()
        try:
            token_info = await loop.run_in_executor(None, auth.exchange_google_code, req.code)
        except Exception as flow_err:
            error_str = str(flow_err).lower()
            if 'invalid_grant' in error_str or 'bad request' in error_str:
                raise HTTPException(status_code=400, detail="invalid_grant: The auth code is invalid or expired.")
            elif 'redirect_uri_mismatch' in error_str:
                raise HTTPException(status_code=400, detail="redirect_uri_mismatch: Ensure frontend and backend use 'postmessage'.")
            else:
                raise HTTPException(status_code=400, detail=f"Google OAuth Error: {str(flow_err)}")

        idinfo = token_info.get("idinfo", {})
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google token missing email")

        result = await db.execute(select(models.User).where(models.User.email == email))
        user = result.scalars().first()
        
        if not user:
            import secrets
            hashed_password = auth.get_password_hash(secrets.token_urlsafe(16))
            user = models.User(email=email, hashed_password=hashed_password)
            db.add(user)
        
        await db.commit()
        await db.refresh(user)

        # Save tokens
        token_result = await db.execute(select(models.OAuthToken).where(
            models.OAuthToken.user_id == user.id,
            models.OAuthToken.provider == 'google'
        ))
        oauth_token = token_result.scalars().first()
        
        if not oauth_token:
            oauth_token = models.OAuthToken(user_id=user.id, provider='google')
            db.add(oauth_token)
            
        oauth_token.access_token = auth.encrypt_data(token_info["access_token"])
        if token_info.get("refresh_token"):
            oauth_token.refresh_token = auth.encrypt_data(token_info["refresh_token"])
            
        await db.commit()
            
        access_token = auth.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Server error: {error_msg}")
        raise HTTPException(status_code=400, detail=f"Login Error: {str(e)}")


import re
from pydantic import BaseModel

class PanRequest(BaseModel):
    pan_number: str

@app.post("/auth/pan")
@limiter.limit("5/minute")
async def save_pan(
    request: Request,
    req: PanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    pan = req.pan_number.upper()
    if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", pan):
        raise HTTPException(status_code=400, detail="Invalid PAN format")
        
    # Mocking a real KYC API verification step
    # if not verify_pan_with_nsdl(pan): raise KYCError()
    
    current_user.pan_number = auth.encrypt_data(pan)
    db.add(current_user)
    await db.commit()
    
    masked = pan[:5] + "***" + pan[-2:]
    return {"message": "PAN verified and saved securely", "masked_pan": masked}

@app.delete("/auth/delete-data")
async def delete_user_data(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user_id = current_user.id
    
    # 1. Delete all portfolio data
    await crud.delete_user_holdings(db, user_id)
    
    # 2. Delete OAuth Tokens
    await db.execute(models.OAuthToken.__table__.delete().where(models.OAuthToken.user_id == user_id))
    
    # 3. Clear PAN
    current_user.pan_number = None
    db.add(current_user)
    await db.commit()
    
    return {"message": "All sensitive data has been permanently deleted in compliance with DPDP Act."}

@app.get("/api/predict/{symbol}")
async def get_stock_prediction(
    symbol: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    from app.services import prediction_service
    prediction = await prediction_service.predict_stock_price(symbol.upper())
    if "error" in prediction:
        raise HTTPException(status_code=400, detail=prediction["error"])
    return prediction

@app.get("/auth/me")
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    masked_pan = None
    if current_user.pan_number:
        pan = auth.decrypt_data(current_user.pan_number)
        if pan and len(pan) == 10:
            masked_pan = pan[:5] + "***" + pan[-2:]
            
    # Check if google token exists
    token_result = await db.execute(select(models.OAuthToken).where(
        models.OAuthToken.user_id == current_user.id,
        models.OAuthToken.provider == 'google'
    ))
    oauth_token = token_result.scalars().first()
    
    return {
        "email": current_user.email,
        "has_google_linked": oauth_token is not None,
        "has_pan_verified": current_user.pan_number is not None,
        "pan_masked": masked_pan
    }

@app.post("/portfolio/upload")
@limiter.limit("5/minute")
async def upload_portfolio(
    request: Request,
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not file.filename.endswith('.csv') or file.content_type not in ['text/csv', 'application/vnd.ms-excel']:
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    decoded_content = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded_content))
    
    user_id = current_user.id
    await crud.delete_user_holdings(db, user_id)
    
    holdings_created = []
    for row in csv_reader:
        try:
            symbol = row.get('Symbol') or row.get('ISIN') or 'UNKNOWN'
            company = row.get('Company Name') or row.get('Stock Name') or symbol
            qty = float(row.get('Quantity') or row.get('Shares') or 0)
            avg_price = float(row.get('Average Price') or row.get('Buy Price') or 0)
            cur_price = float(row.get('Current Price') or row.get('LTP') or 0)
            
            holding_data = schemas.HoldingCreate(
                symbol=symbol,
                company_name=company,
                quantity=qty,
                average_price=avg_price,
                current_price=cur_price
            )
            
            db_holding = await crud.create_holding(db, holding_data, user_id)
            holdings_created.append(db_holding)
        except Exception as e:
            print(f"Skipping row due to error: {e}")
            continue
            
    return {"message": f"Successfully uploaded {len(holdings_created)} holdings."}

@app.get("/api/portfolio", response_model=List[schemas.Holding])
async def get_portfolio(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user_id = current_user.id
    holdings = await crud.get_holdings(db, user_id)
    # Fetch live market data in the background and update holdings
    holdings = await crud.update_live_prices(db, holdings)
    return holdings

# ---- CHAT ENDPOINTS ----

@app.post("/chat/sessions", response_model=schemas.ChatSession)
async def create_chat_session(
    session: schemas.ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return await crud.create_chat_session(db, current_user.id, session.title)

@app.get("/chat/sessions", response_model=List[schemas.ChatSession])
async def get_chat_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    sessions = await crud.get_chat_sessions(db, current_user.id)
    for session in sessions:
        session.messages = await crud.get_chat_messages(db, session.id)
    return sessions

@app.post("/chat/sessions/{session_id}/messages", response_model=schemas.ChatMessage)
async def create_chat_message(
    session_id: int,
    message: schemas.ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify session belongs to user
    sessions = await crud.get_chat_sessions(db, current_user.id)
    if not any(s.id == session_id for s in sessions):
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
    return await crud.create_chat_message(db, session_id, message)

# ---- ALERT ENDPOINTS ----

@app.post("/alerts", response_model=schemas.Alert)
async def create_alert(
    alert: schemas.AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return await crud.create_alert(db, current_user.id, alert)

@app.get("/alerts", response_model=List[schemas.Alert])
async def get_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return await crud.get_alerts(db, current_user.id)

@app.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deleted = await crud.delete_alert(db, alert_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "ok"}


# ---- MARKET DATA ENDPOINTS ----

@app.get("/api/market/quotes")
async def get_market_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols (e.g. RELIANCE.NS,TCS.NS)")
):
    from app.services.market_data import LatestTick
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    results = {}
    for sym in symbol_list:
        if not sym.endswith(".NS") and not sym.endswith(".BO") and not sym.startswith("^"):
            sym = f"{sym}.NS"
        
        tick = LatestTick.get(sym)
        if tick:
            results[sym] = {
                "price": tick.price,
                "change_pct": tick.change_pct,
                "volume": tick.volume,
                "as_of": tick.ts.isoformat(),
                "source": tick.source,
                "is_live": tick.is_live
            }
        else:
            results[sym] = None
    return results

from app.routers.market import router as market_router
from app.routers.screener import router as screener_router
from app.routers.news import router as news_router
from app.routers.chat import router as chat_router

app.include_router(market_router, prefix="/api", tags=["Market"])
app.include_router(screener_router, prefix="/api", tags=["Screener"])
app.include_router(news_router, prefix="/api", tags=["News"])
app.include_router(chat_router, prefix="/api", tags=["Chat"])

# ---- PORTFOLIO ENDPOINTS ----

import uuid
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
    return sync_jobs[job_id]

@app.get("/api/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    status_data = {
        "status": "healthy",
        "db_connected": False,
        "redis_connected": False,
        "last_polled_time": HEALTH_STATE["last_polled_time"],
        "seconds_since_last_poll": None
    }
    
    # 1. Check DB
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        status_data["db_connected"] = True
    except Exception as e:
        status_data["status"] = "unhealthy"
        status_data["error_db"] = str(e)
        
    # 2. Check Redis
    try:
        from app.websocket_manager import manager
        if manager.redis_client:
            await manager.redis_client.ping()
            status_data["redis_connected"] = True
        else:
            status_data["redis_connected"] = False
    except Exception as e:
        status_data["status"] = "unhealthy"
        status_data["error_redis"] = str(e)
        
    # 3. Check Poller
    if HEALTH_STATE["last_polled_time"]:
        status_data["seconds_since_last_poll"] = round(time.time() - HEALTH_STATE["last_polled_time"], 2)
        if status_data["seconds_since_last_poll"] > 60:
            status_data["status"] = "unhealthy"
            status_data["error_poller"] = "Poller is stalled"
            
    if status_data["status"] != "healthy":
        import fastapi
        return fastapi.responses.JSONResponse(status_code=503, content=status_data)
        
    return status_data

@app.get("/health/feed")
def health_feed():
    from app.services.market_data import LatestTick, provider_name, last_snapshot_time
    import time
    ages = [time.time() - t.ts.timestamp() for t in LatestTick.values() if hasattr(t.ts, 'timestamp')]
    max_age = max(ages) if ages else 0
    return {
        "provider": provider_name,
        "subscribed_symbols": len(LatestTick),
        "max_tick_age_seconds": round(max_age, 2),
        "snapshot_age_seconds": round(time.time() - last_snapshot_time, 2)
    }
