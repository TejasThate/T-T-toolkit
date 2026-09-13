from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import asynccontextmanager

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL_ENV = os.getenv("DATABASE_URL")

if DATABASE_URL_ENV:
    # Use asyncpg for Postgres
    if DATABASE_URL_ENV.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL_ENV.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL_ENV.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL_ENV.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        DATABASE_URL = DATABASE_URL_ENV
    
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    connect_args = {}
else:
    # Fallback to local SQLite for development / Vercel ephemeral
    DATABASE_URL = "sqlite+aiosqlite:////tmp/tandt.db"
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    connect_args = {"check_same_thread": False}

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True, connect_args=connect_args)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
