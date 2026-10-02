import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import TechnicalAlert, Notification
from app.routers.screener import compute_indicators, evaluate_condition, Condition
import yfinance as yf

logger = logging.getLogger(__name__)

def process_technical_alerts():
    logger.info("Starting background technical alerts processing...")
    
    db: Session = SessionLocal()
    try:
        active_alerts = db.query(TechnicalAlert).filter(TechnicalAlert.is_active == True).all()
        if not active_alerts:
            logger.info("No active alerts found.")
            return

        # Use the same basket as screener
        basket = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ITC.NS",
            "SBIN.NS", "BHARTIARTL.NS", "LARSEN.NS", "BAJFINANCE.NS"
        ]
        
        logger.info(f"Fetching data for {len(basket)} symbols...")
        data = yf.download(tickers=" ".join(basket), period="1y", group_by="ticker", threads=True, progress=False)
        
        # Precompute indicators for all symbols to save time
        computed_data = {}
        for symbol in basket:
            try:
                df = data[symbol] if len(basket) > 1 else data
                if df.empty:
                    continue
                df = compute_indicators(df)
                computed_data[symbol] = df.iloc[-1]
            except Exception as e:
                logger.error(f"Error computing indicators for {symbol}: {e}")
                
        # Evaluate each alert
        for alert in active_alerts:
            conditions = [Condition(**c) for c in alert.conditions]
            matched_symbols = []
            
            for symbol, latest in computed_data.items():
                try:
                    passed = all(evaluate_condition(latest, cond) for cond in conditions)
                    if passed:
                        matched_symbols.append(symbol.replace('.NS', ''))
                except Exception as e:
                    pass
                    
            if matched_symbols:
                # Create a notification
                notif = Notification(
                    user_id=alert.user_id,
                    title=f"Alert Triggered: {alert.name}",
                    message=f"Matches found: {', '.join(matched_symbols)}"
                )
                db.add(notif)
                logger.info(f"Alert {alert.name} triggered for {matched_symbols}")
                
        db.commit()
        logger.info("Finished processing technical alerts.")
    except Exception as e:
        logger.error(f"Failed to process alerts: {e}")
        db.rollback()
    finally:
        db.close()
