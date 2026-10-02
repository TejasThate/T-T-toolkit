from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import pytz
from app.tasks.alerts import process_technical_alerts
from app.services.news_pipeline import run_news_pipeline

logger = logging.getLogger(__name__)
ist = pytz.timezone('Asia/Kolkata')

scheduler = AsyncIOScheduler(timezone=ist)

def start_scheduler():
    # Evaluate Screener Alerts every 15 minutes
    scheduler.add_job(process_technical_alerts, 'interval', minutes=15)
    
    # Ingest news every 5 min
    scheduler.add_job(run_news_pipeline, 'interval', minutes=5)
    
    scheduler.start()
    logger.info("Scheduler started.")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler stopped.")
