from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import asynccontextmanager

import os
from dotenv import load_dotenv

load_dotenv()

# Use SQLite by default, storing the file locally.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./tandt.db")

SQLALCHEMY_DATABASE_URL = DATABASE_URL

# SQLite requires check_same_thread=False
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True, connect_args=connect_args)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
