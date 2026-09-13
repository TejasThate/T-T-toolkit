from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/register", response_model=schemas.Token)
@limiter.limit("5/minute")
async def register(user: schemas.UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
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

@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
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

@router.post("/google", response_model=schemas.Token)
@limiter.limit("5/minute")
async def google_login(req: schemas.GoogleLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    try:
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
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Server error: {error_msg}")
        raise HTTPException(status_code=400, detail=f"Internal Server Error Debug: {str(e)}")
