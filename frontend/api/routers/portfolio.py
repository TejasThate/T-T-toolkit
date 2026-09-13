from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import csv
import io

from ..database import get_db
from .. import models, schemas, crud, auth
from ..gmail_service import sync_demat_from_gmail

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.post("/upload")
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

@router.get("", response_model=List[schemas.Holding])
async def get_portfolio(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user_id = current_user.id
    holdings = await crud.get_holdings(db, user_id)
    # Fetch live market data in the background and update holdings
    holdings = await crud.update_live_prices(db, holdings)
    return holdings

@router.post("/sync-gmail")
async def trigger_gmail_sync(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user.google_access_token:
        raise HTTPException(status_code=400, detail="Gmail not linked. Please login with Google.")
        
    # Decrypt tokens before passing to background task
    access_token = auth.decrypt_token(current_user.google_access_token)
    refresh_token = auth.decrypt_token(current_user.google_refresh_token) if current_user.google_refresh_token else None
        
    background_tasks.add_task(
        sync_demat_from_gmail,
        db, 
        current_user.id, 
        access_token, 
        refresh_token
    )
    
    return {"status": "success", "message": "Gmail sync started in background"}
