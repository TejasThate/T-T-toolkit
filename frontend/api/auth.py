import os
from datetime import datetime, timedelta
from typing import Optional
from cryptography.fernet import Fernet
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .database import get_db
from .models import User
from google.oauth2 import id_token
from google.auth.transport import requests
from google_auth_oauthlib.flow import Flow

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-jwt-keep-it-secret")

# Fernet encryption key for Google tokens (must be 32 url-safe base64-encoded bytes)
# Fallback for dev only. In prod, provide ENCRYPTION_KEY env var!
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode("utf-8"))
fernet = Fernet(ENCRYPTION_KEY.encode("utf-8"))

def encrypt_token(token: str) -> str:
    if not token:
        return token
    return fernet.encrypt(token.encode("utf-8")).decode("utf-8")

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return encrypted_token
    try:
        return fernet.decrypt(encrypted_token.encode("utf-8")).decode("utf-8")
    except Exception as e:
        print(f"Failed to decrypt token: {e}")
        return encrypted_token

def verify_google_token(token: str):
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        return idinfo
    except ValueError:
        return None

def exchange_google_code(code: str, redirect_uri: str = 'postmessage'):
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly'],
        redirect_uri=redirect_uri
    )
    
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    # Verify the ID token to get email
    idinfo = verify_google_token(credentials.id_token)
    
    return {
        "idinfo": idinfo,
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token
    }
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    # Bypass auth and use a single dummy account for the dashboard
    dummy_email = "demo@example.com"
    result = await db.execute(select(User).where(User.email == dummy_email))
    user = result.scalars().first()
    if not user:
        user = User(email=dummy_email, hashed_password="x")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user
