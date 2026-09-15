from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import asynccontextmanager

import os
from dotenv import load_dotenv

load_dotenv()

# Read DATABASE_URL from environment, fallback to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./tandt.db")

# Render/Supabase often provides postgres:// which needs to be postgresql:// for SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ensure asyncpg driver is used for postgres
if DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

SQLALCHEMY_DATABASE_URL = DATABASE_URL

connect_args = {}
# SQLite requires check_same_thread=False
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True, connect_args=connect_args)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
