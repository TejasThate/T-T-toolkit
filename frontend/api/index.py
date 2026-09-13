from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
import sentry_sdk

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("T&T_API")

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
    )
    logger.info("Sentry initialized")

from .database import engine, Base
from .routers import auth, portfolio, market_data, ai, news

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="T&T API", version="0.1.0", root_path="/api")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://t-t-toolkit-tawny.vercel.app", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            # Run table creation (not recommended for production, use alembic)
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Successfully connected to the database and created tables.")
    except Exception as e:
        logger.error(f"Failed to connect to the database on startup: {e}")
        logger.error("The app will still start, but database operations will fail until DATABASE_URL is corrected.")

@app.get("/")
def read_root():
    return {"message": "T&T Toolkit API is running. Try /docs for API documentation."}

@app.get("/ping")
def ping():
    return {"status": "ok"}

app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(market_data.router)
app.include_router(ai.router)
app.include_router(news.router)
