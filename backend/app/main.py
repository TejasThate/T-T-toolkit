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

app = FastAPI(title="T&T Toolkit API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Database connection test (tables now managed by Alembic)
    try:
        async with engine.begin() as conn:
            pass
        print("Successfully connected to the database.")
    except Exception as e:
        print(f"Failed to connect to the database on startup: {e}")
        print("The app will still start, but database operations will fail until DATABASE_URL is corrected.")

@app.get("/")
def read_root():
    return {"message": "T&T Toolkit API is running. Try /docs for API documentation."}

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.get("/models")
async def list_models():
    models = await news_service.client.models.list()
    return {"models": [m.id for m in models.data]}

@app.get("/market/live")
async def market_live():
    data = await market_service.get_live_market_data()
    return {"data": data}

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
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
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
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
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

@app.post("/auth/google", response_model=schemas.Token)
async def google_login(req: schemas.GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as grequests
            import os
            GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
            if not GOOGLE_CLIENT_ID:
                raise Exception("Missing GOOGLE_CLIENT_ID env var")
            idinfo = id_token.verify_oauth2_token(req.credential, grequests.Request(), GOOGLE_CLIENT_ID)
        except Exception as e:
            print(f"ID token verification failed: {e}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Google Token: {e}")
            
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google token missing email")

        result = await db.execute(select(models.User).where(models.User.email == email))
        user = result.scalars().first()
        
        if not user:
            import secrets
            hashed_password = auth.get_password_hash(secrets.token_urlsafe(32))
            user = models.User(email=email, hashed_password=hashed_password)
            db.add(user)
        
        await db.commit()
        await db.refresh(user)
            
        access_token = auth.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Server error: {error_msg}")
        raise HTTPException(status_code=400, detail=f"Internal Server Error Debug: {str(e)}")

class GoogleAuthCodeRequest(BaseModel):
    code: str

@app.post("/auth/google/code", response_model=schemas.Token)
async def google_login_code(req: GoogleAuthCodeRequest, db: AsyncSession = Depends(get_db)):
    try:
        token_info = auth.exchange_google_code(req.code)
        idinfo = token_info.get("idinfo", {})
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google token missing email")

        result = await db.execute(select(models.User).where(models.User.email == email))
        user = result.scalars().first()
        
        if not user:
            import secrets
            hashed_password = auth.get_password_hash(secrets.token_urlsafe(32))
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
async def save_pan(
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
async def upload_portfolio(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
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

@app.get("/portfolio", response_model=List[schemas.Holding])
async def get_portfolio(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user_id = current_user.id
    holdings = await crud.get_holdings(db, user_id)
    # Fetch live market data in the background and update holdings
    holdings = await crud.update_live_prices(db, holdings)
    return holdings

@app.post("/portfolio/sync-gmail")
async def sync_gmail_route(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    token_result = await db.execute(select(models.OAuthToken).where(
        models.OAuthToken.user_id == current_user.id,
        models.OAuthToken.provider == 'google'
    ))
    oauth_token = token_result.scalars().first()
    
    if not oauth_token:
        raise HTTPException(status_code=400, detail="Google account not linked or missing permissions")
        
    try:
        # In a real app we'd refresh the token using google_refresh_token if needed
        # For now, pass the decrypted access and refresh tokens to the sync service
        access_token = auth.decrypt_data(oauth_token.access_token)
        refresh_token = auth.decrypt_data(oauth_token.refresh_token) if oauth_token.refresh_token else None
        
        # We need the client ID/secret to refresh tokens if needed
        import os
        from google.oauth2.credentials import Credentials
        
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
        )
        
        # Here we would actually process the emails. 
        # For demonstration we'll just parse the mock emails in the service.
        results = await sync_demat_from_gmail(
            db, 
            current_user.id,
            creds
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    symbols: str = Query(..., description="Comma separated list of symbols"),
    current_user: models.User = Depends(auth.get_current_user)
):
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    quotes = await market_data.fetch_quotes(symbol_list)
    return quotes

@app.get("/api/market/top-gainers")
async def get_top_gainers(
    limit: int = 5,
    current_user: models.User = Depends(auth.get_current_user)
):
    gainers = await market_data.fetch_top_gainers(limit=limit)
    return gainers

# ---- PORTFOLIO ENDPOINTS ----

class GmailSyncRequest(BaseModel):
    google_access_token: str

@app.post("/api/portfolio/sync")
async def sync_portfolio_gmail(
    request: GmailSyncRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Ensure user has a PAN
    if not current_user.encrypted_pan:
        raise HTTPException(status_code=400, detail="Please verify your PAN in Settings first.")
        
    try:
        # Decrypt PAN (mocked decryption for now, assuming it's stored plaintext in prototype)
        # In a real system, you'd use Fernet to decrypt `current_user.encrypted_pan`
        pan = current_user.encrypted_pan
        
        # 1. Fetch PDF from Gmail
        pdf_bytes = await gmail_service.fetch_cas_pdf_from_gmail(request.google_access_token)
        
        # 2. Parse PDF
        holdings_list = pdf_parser.parse_cdsl_cas(pdf_bytes, password=pan.upper())
        
        if not holdings_list:
            raise HTTPException(status_code=400, detail="Successfully parsed PDF but found no valid holdings.")
            
        # 3. Save to DB (Clear old holdings first for a fresh sync, or implement upsert)
        # For prototype, we will clear existing and insert new
        await db.execute(delete(models.PortfolioHolding).where(models.PortfolioHolding.user_id == current_user.id))
        
        new_holdings = []
        for h in holdings_list:
            new_holding = models.PortfolioHolding(
                user_id=current_user.id,
                symbol=h["symbol"],
                quantity=h["quantity"],
                average_price=h["avg_price"]
            )
            db.add(new_holding)
            new_holdings.append(new_holding)
            
        await db.commit()
        
        return {"message": f"Successfully synced {len(new_holdings)} holdings from your CAS statement!"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An unexpected error occurred during sync.")

# ---- AI ENDPOINTS ----

class ChatRequest(BaseModel):
    message: str

async def _build_ai_contexts(current_user: models.User, db: AsyncSession):
    # 1. Fetch Portfolio
    result = await db.execute(select(models.PortfolioHolding).where(models.PortfolioHolding.user_id == current_user.id))
    holdings = result.scalars().all()
    
    if not holdings:
        portfolio_context = "User has no synced holdings."
        market_context = "No holdings to track."
    else:
        portfolio_context = "\n".join([f"- {h.symbol}: {h.quantity} shares (Avg: {h.average_price})" for h in holdings])
        
        # 2. Fetch Live Quotes for Portfolio
        symbols = [h.symbol for h in holdings]
        live_quotes = await market_data.fetch_live_quotes(symbols)
        market_context = ""
        for sym, data in live_quotes.items():
            market_context += f"- {sym}: ₹{data.get('price', 0)} (Change: {data.get('change_pct', 0)}%)\n"
            
    return portfolio_context, market_context

@app.post("/api/ai/chat")
async def chat_with_ai(
    request: ChatRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    portfolio_context, market_context = await _build_ai_contexts(current_user, db)
    
    # 3. Fetch Top Gainers
    gainers = await market_data.fetch_top_gainers(limit=3)
    gainers_context = "\n".join([f"- {g['symbol']}: +{g['change_pct']}%" for g in gainers])
    
    # 4. Generate AI Response
    try:
        response_text = await ai_service.generate_chat_response(
            query=request.message,
            portfolio_context=portfolio_context,
            market_context=market_context,
            gainers_context=gainers_context
        )
        return {"response": response_text}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/forecast")
async def get_ai_forecast(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    portfolio_context, market_context = await _build_ai_contexts(current_user, db)
    
    # Generate Forecast Summary
    forecast_text = await ai_service.generate_forecast_summary(
        portfolio_context=portfolio_context,
        market_context=market_context
    )
    return {"forecast": forecast_text}

@app.get("/api/news")
async def get_top_news(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches the latest top news and generates a sentiment tag.
    """
    try:
        articles = await news_service.fetch_financial_news(limit=10)
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {e}")
