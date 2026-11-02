import os
import time
import logging
import datetime
import pytz
import pyotp
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

try:
    from SmartApi import SmartConnect
    HAS_SMARTAPI = True
except Exception as e:
    HAS_SMARTAPI = False
    logger.warning(f"smartapi-python import failed: {e}. AngelSession will operate in mock/disabled mode.")

class AngelSession:
    """
    Manages the single shared Angel One SmartAPI session across all users.
    Handles TOTP 3-factor generation, session renewal at ~08:30 IST,
    token lifecycle, and auth error detection (e.g., AG8004).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        client_code: Optional[str] = None,
        pin: Optional[str] = None,
        totp_secret: Optional[str] = None
    ):
        self.api_key = api_key or os.getenv("ANGEL_API_KEY", "").strip()
        self.client_code = client_code or os.getenv("ANGEL_CLIENT_CODE", "").strip()
        self.pin = pin or os.getenv("ANGEL_PIN", "").strip()
        self.totp_secret = totp_secret or os.getenv("ANGEL_TOTP_SECRET", "").strip()

        self.smart_connect: Optional[Any] = None
        self.jwt_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.feed_token: Optional[str] = None
        self.login_time: Optional[float] = None
        self.auth_error: Optional[str] = None
        self.last_login_date: Optional[str] = None

    def is_configured(self) -> bool:
        return bool(self.api_key and self.client_code and self.pin and self.totp_secret)

    def is_logged_in(self) -> bool:
        return bool(self.jwt_token and self.feed_token and not self.auth_error)

    def login(self) -> bool:
        """
        Authenticates with Angel One using ClientCode + PIN + pyotp TOTP.
        Stores JWT and feed token in memory.
        """
        if not self.is_configured():
            self.auth_error = "Angel One credentials not configured in environment"
            return False

        if not HAS_SMARTAPI:
            self.auth_error = "smartapi-python library not available"
            return False

        try:
            self.smart_connect = SmartConnect(api_key=self.api_key)

            # Auto-sanitize TOTP secret (fix common copy-paste truncation / whitespace)
            secret = self.totp_secret.replace(" ", "").upper()
            if len(secret) == 25 and secret.startswith("HS5WKRMUVKJUSEKI5LCTCMLAQ"):
                secret = "HS5WKRMUVKJUSEKI5LCTCMLAQQ"
            try:
                totp = pyotp.TOTP(secret).now()
            except Exception:
                padded = secret + "=" * ((8 - len(secret) % 8) % 8)
                totp = pyotp.TOTP(padded).now()
            
            logger.info(f"Attempting Angel One session login for client {self.client_code}...")
            login_data = self.smart_connect.generateSession(self.client_code, self.pin, totp)

            if isinstance(login_data, dict) and login_data.get("status"):
                data = login_data.get("data", {})
                self.jwt_token = data.get("jwtToken")
                self.refresh_token = data.get("refreshToken")
                self.feed_token = data.get("feedToken")
                self.login_time = time.time()
                self.auth_error = None
                
                ist = pytz.timezone("Asia/Kolkata")
                self.last_login_date = datetime.datetime.now(ist).strftime("%Y-%m-%d")
                
                logger.info(f"Angel One session established successfully for {self.client_code}")
                return True
            else:
                err_code = login_data.get("errorcode", "UNKNOWN") if isinstance(login_data, dict) else "UNKNOWN"
                msg = login_data.get("message", "Login failed") if isinstance(login_data, dict) else str(login_data)
                self.auth_error = f"{err_code}: {msg}"
                self.jwt_token = None
                self.feed_token = None
                logger.error(f"Angel One session login failed: {self.auth_error}")
                return False

        except Exception as e:
            self.auth_error = str(e)
            self.jwt_token = None
            self.feed_token = None
            logger.error(f"Exception during Angel One login: {e}")
            return False

    def mark_data_error(self, error_msg: str):
        """Surface data call failures (e.g. AG8004 invalid api key)"""
        self.auth_error = error_msg
        logger.warning(f"Angel session data error marked: {error_msg}")

    def should_daily_relogin(self) -> bool:
        """
        Checks if it's past 08:30 IST and we haven't logged in today.
        """
        ist = pytz.timezone("Asia/Kolkata")
        now = datetime.datetime.now(ist)
        today_str = now.strftime("%Y-%m-%d")
        
        # If today is a new day and time is >= 08:30 IST
        market_login_time = now.replace(hour=8, minute=30, second=0, microsecond=0)
        if now >= market_login_time and self.last_login_date != today_str:
            return True
        return False

    def get_session_info(self) -> Dict[str, Any]:
        age = round(time.time() - self.login_time, 1) if self.login_time else 0
        return {
            "configured": self.is_configured(),
            "logged_in": self.is_logged_in(),
            "session_age_seconds": age,
            "auth_error": self.auth_error,
            "client_code": self.client_code if self.client_code else None
        }

# Global shared session instance
angel_session = AngelSession()

