from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models

app = FastAPI(title="T&T API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with actual frontend origin later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Run table creation (not recommended for production, use alembic)
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
def read_root():
    return {"message": "Welcome to T&T API"}

import csv
import io
from fastapi import UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from . import crud, schemas
from .database import get_db
from sqlalchemy import select

@app.post("/portfolio/upload")
async def upload_portfolio(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    decoded_content = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded_content))
    
    # Mock user_id = 1 for now until auth is implemented
    user_id = 1
    
    await crud.delete_user_holdings(db, user_id)
    
    holdings_created = []
    for row in csv_reader:
        # Assuming generic column names, adapt if Groww export differs
        try:
            # Map typical Groww CSV columns or standard formats
            # Note: Groww might use 'Stock Name', 'ISIN', etc. We'll use a generic fallback.
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
            # Skip invalid rows
            print(f"Skipping row due to error: {e}")
            continue
            
    return {"message": f"Successfully uploaded {len(holdings_created)} holdings."}

@app.get("/portfolio", response_model=List[schemas.Holding])
async def get_portfolio(db: AsyncSession = Depends(get_db)):
    user_id = 1
    holdings = await crud.get_holdings(db, user_id)
    return holdings

from . import news_service

@app.post("/news/fetch")
async def trigger_news_fetch(db: AsyncSession = Depends(get_db)):
    processed = await news_service.fetch_and_process_news(db)
    return {"message": f"Successfully fetched and rated {processed} new articles."}

@app.get("/news", response_model=List[schemas.NewsArticle])
async def get_news(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.NewsArticle)
        .order_by(models.NewsArticle.impact_score.desc())
        .limit(10)
    )
    return result.scalars().all()
