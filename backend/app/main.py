from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import csv
import io
from fastapi import UploadFile, File

from .database import engine, Base, get_db
from . import models, schemas, crud, auth, news_service
from .gmail_service import sync_demat_from_gmail

app = FastAPI(title="T&T API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            # Run table creation (not recommended for production, use alembic)
            await conn.run_sync(Base.metadata.create_all)
        print("Successfully connected to the database and created tables.")
    except Exception as e:
        print(f"Failed to connect to the database on startup: {e}")
        print("The app will still start, but database operations will fail until DATABASE_URL is corrected.")

@app.get("/")
def read_root():
    return {"message": "T&T Toolkit API is running. Try /docs for API documentation."}

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.post("/auth/register", response_model=schemas.Token)
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
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

@app.post("/auth/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
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

@app.post("/auth/google", response_model=schemas.Token)
async def google_login(req: schemas.GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as grequests
        GOOGLE_CLIENT_ID = "251614952431-j137o7u8qeu3b7n93846bi4e1h5auop3.apps.googleusercontent.com"
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
async def trigger_gmail_sync(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user.google_access_token:
        raise HTTPException(status_code=400, detail="Gmail not linked. Please login with Google.")
        
    result = await sync_demat_from_gmail(
        db, 
        current_user.id, 
        current_user.google_access_token, 
        current_user.google_refresh_token
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
        
    return result

@app.post("/news/fetch")
async def trigger_news_fetch(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    processed = await news_service.fetch_and_process_news(db)
    return {"message": f"Successfully fetched and rated {processed} new articles."}

@app.get("/news", response_model=List[schemas.NewsArticle])
async def get_news(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    result = await db.execute(
        select(models.NewsArticle)
        .order_by(models.NewsArticle.impact_score.desc())
        .limit(10)
    )
    return result.scalars().all()

from pydantic import BaseModel
class ChatRequest(BaseModel):
    query: str

@app.post("/ai/chat")
async def ai_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    holdings = await crud.get_holdings(db, current_user.id)
    portfolio_context = "\n".join([f"{h.symbol} ({h.company_name}): {h.quantity} shares @ {h.average_price}" for h in holdings])
    
    prompt = f"""
    You are an expert financial AI assistant. The user is asking a question about their stock portfolio or the market.
    Here is the user's current portfolio:
    {portfolio_context if portfolio_context else "No stocks currently held."}
    
    User Query: {req.query}
    
    Provide a helpful, concise, and analytical answer. Keep your response formatting clean and markdown compatible.
    """
    
    try:
        if not news_service.client:
            return {"reply": "Groq API key not configured. I cannot process this request."}
            
        response = await news_service.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.7,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"reply": f"Sorry, I encountered an error: {e}"}
