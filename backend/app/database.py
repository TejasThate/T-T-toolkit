from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import asynccontextmanager

import os
import socket
from dotenv import load_dotenv

# Force IPv4 to prevent "Network is unreachable" errors with IPv6 DNS resolution (common on Render + Supabase/Neon)
old_getaddrinfo = socket.getaddrinfo
def new_getaddrinfo(*args, **kwargs):
    responses = old_getaddrinfo(*args, **kwargs)
    return [response for response in responses if response[0] == socket.AF_INET]
socket.getaddrinfo = new_getaddrinfo

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://nivesh_user:nivesh_password@localhost:5433/nivesh_db")

# Automatically inject the asyncpg driver if missing
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

SQLALCHEMY_DATABASE_URL = DATABASE_URL
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
