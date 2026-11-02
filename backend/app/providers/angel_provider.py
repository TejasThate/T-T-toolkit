import os
import time
import json
import logging
import datetime
import asyncio
import threading
import pytz
import requests
from typing import List, Dict, Any, Optional, Set

from app.providers.base import MarketDataProvider, Tick
from app.providers.angel_session import angel_session, AngelSession
from app.providers.yfinance_provider import YFinanceProvider

logger = logging.getLogger(__name__)

try:
    from SmartApi.smartWebSocketV2 import SmartWebSocketV2
    HAS_SMART_WS = True
except Exception as e:
    HAS_SMART_WS = False
    logger.warning(f"SmartWebSocketV2 import failed: {e}")

NSE_HOLIDAYS_2026 = {
    "2026-01-26", # Republic Day
    "2026-03-03", # Holi
    "2026-03-20", # Id-Ul-Fitr
    "2026-03-27", # Ram Navami
    "2026-04-03", # Good Friday
    "2026-04-14", # Dr. Ambedkar Jayanti
    "2026-05-01", # Maharashtra Day
    "2026-05-27", # Bakri Id
    "2026-06-26", # Muharram
    "2026-08-15", # Independence Day
    "2026-09-04", # Milad-un-Nabi
    "2026-10-02", # Mahatma Gandhi Jayanti
    "2026-10-20", # Dussehra
    "2026-11-08", # Diwali Laxmi Pujan
    "2026-11-24", # Guru Nanak Jayanti
    "2026-12-25", # Christmas
}

class AngelProvider(MarketDataProvider):
    """
    Institutional Angel One SmartAPI Market Data Provider.
    Supports:
    - Daily OpenAPIScripMaster ingestion and symbol-token mapping
    - Sub-second binary WebSocket streaming via SmartWebSocketV2
    - Automatic paise-to-rupees conversion (/100.0)
    - Fallback to YFinanceProvider on auth/stream errors (labelled DELAYED)
    - Safety guards for NSE market hours and weekend mock sessions
    - Rate-limited batched REST quotes (max 10 req/s)
    """

    def __init__(self, session: Optional[AngelSession] = None):
        self.session = session or angel_session
        self.fallback = YFinanceProvider()
        self.ist = pytz.timezone("Asia/Kolkata")
        
        # Symbol and token mappings
        self.symbol_to_token: Dict[str, str] = {}
        self.token_to_symbol: Dict[str, str] = {}
        self.symbol_names: Dict[str, str] = {}
        self.subscribed_tokens: Set[str] = set()
        
        # Streaming state
        self.ws_client: Optional[Any] = None
        self.ws_thread: Optional[threading.Thread] = None
        self.stream_active = False
        self.last_tick_time: float = 0.0
        self.stream_errors: int = 0
        self.last_stream_error: Optional[str] = None
        self.stream_mode: str = "init" # init, streaming, rest_fallback, yf_fallback
        
        # REST rate limiting (10 req/s max)
        self.last_rest_call: float = 0.0
        self.rest_lock = asyncio.Lock()
        
        # Default fallback tokens for common equities and indices
        self._init_default_tokens()

    def _init_default_tokens(self):
        defaults = {
            "RELIANCE": ("2885", "RELIANCE INDUSTRIES LTD"),
            "TCS": ("11536", "TATA CONSULTANCY SERV LT"),
            "HDFCBANK": ("1333", "HDFC BANK LTD"),
            "INFY": ("1594", "INFOSYS LIMITED"),
            "ICICIBANK": ("4963", "ICICI BANK LTD"),
            "SBIN": ("3045", "STATE BANK OF INDIA"),
            "BHARTIARTL": ("10604", "BHARTI AIRTEL LIMITED"),
            "ITC": ("1660", "ITC LTD"),
            "KOTAKBANK": ("1922", "KOTAK MAHINDRA BANK LTD"),
            "LT": ("11483", "LARSEN & TOUBRO LTD"),
            "TATAMOTORS": ("3456", "TATA MOTORS LIMITED"),
            "AXISBANK": ("5900", "AXIS BANK LTD"),
            "MARUTI": ("10999", "MARUTI SUZUKI INDIA LTD"),
            "SUNPHARMA": ("3351", "SUN PHARMACEUTICAL IND L"),
            "TITAN": ("3506", "TITAN COMPANY LIMITED"),
            "BAJFINANCE": ("317", "BAJAJ FINANCE LIMITED"),
            "BAJAJFINSV": ("16675", "BAJAJ FINSERV LTD"),
            "NTPC": ("11630", "NTPC LTD"),
            "POWERGRID": ("14977", "POWER GRID CORP. OF INDIA"),
            "TATASTEEL": ("3499", "TATA STEEL LIMITED"),
            "JSWSTEEL": ("11723", "JSW STEEL LIMITED"),
            "ADANIENT": ("25", "ADANI ENTERPRISES LIMITED"),
            "ADANIPORTS": ("15083", "ADANI PORTS AND SEZ LTD"),
            "M&M": ("2031", "MAHINDRA & MAHINDRA LTD"),
            "HINDUNILVR": ("1394", "HINDUSTAN UNILEVER LTD"),
            "WIPRO": ("3787", "WIPRO LTD"),
            "HCLTECH": ("7229", "HCL TECHNOLOGIES LTD"),
            "TECHM": ("13538", "TECH MAHINDRA LIMITED"),
            "TRENT": ("1964", "TRENT LTD"),
            "SUZLON": ("12018", "SUZLON ENERGY LIMITED"),
            "BHEL": ("438", "BHARAT HEAVY ELECTRICALS"),
            "BEL": ("383", "BHARAT ELECTRONICS LTD"),
            "HAL": ("2303", "HINDUSTAN AERONAUTICS LTD"),
            "DIXON": ("21690", "DIXON TECHNO (INDIA) LTD"),
            "POLYCAB": ("9590", "POLYCAB INDIA LIMITED"),
            "IRFC": ("2029", "INDIAN RAIL TOUR CORP LTD"),
            "RVNL": ("9552", "RAIL VIKAS NIGAM LIMITED"),
            "IREDA": ("20261", "INDIAN RENEWABLE ENERGY D"),
            "INDUSINDBK": ("5258", "INDUSIND BANK LIMITED"),
            "BPCL": ("526", "BHARAT PETROLEUM CORP  LT"),
            "TATACONSUM": ("3432", "TATA CONSUMER PRODUCTS LT"),
            "CIPLA": ("694", "CIPLA LTD"),
            "HEROMOTOCO": ("1348", "HERO MOTOCORP LIMITED"),
            "^NSEI": ("99926000", "NIFTY 50"),
            "^BSESN": ("99919000", "SENSEX"),
            "^NSEBANK": ("26009", "BANK NIFTY"),

            # Top Indian ETFs
            "NIFTYBEES": ("10576", "NIPPON INDIA ETF NIFTY BEES"),
            "BANKBEES": ("11439", "NIPPON INDIA ETF BANK BEES"),
            "GOLDBEES": ("14428", "NIPPON INDIA ETF GOLD BEES"),
            "SILVERBEES": ("8080", "NIPPON INDIA ETF SILVER BEES"),
            "ITBEES": ("19084", "NIPPON INDIA ETF NIFTY IT"),
            "CPSEETF": ("2328", "CPSE ETF"),
            "MON100": ("22739", "MOTILAL OSWAL NASDAQ 100 ETF"),
            "JUNIORBEES": ("10939", "NIPPON INDIA NIFTY NEXT 50"),
            "PHARMABEES": ("4973", "NIPPON INDIA ETF NIFTY PHARMA"),
            "LIQUIDBEES": ("11006", "NIPPON INDIA ETF LIQUID BEES"),
            "AUTOBEES": ("7880", "NIPPON INDIA ETF NIFTY AUTO"),
            "MAFANG": ("3507", "MIRAE ASSET NYSE FANG+ ETF"),

            # Sovereign Gold Bonds (SGB) Traded on NSE
            "SGBMAY28": ("18972", "SGB MAY 2028 SERIES I"),
            "SGBOCT27VI": ("14252", "SGB OCT 2027 SERIES VI"),
            "SGBJ28VIII": ("17110", "SGB JAN 2028 SERIES VIII"),
            "SGBJAN29IX": ("1920", "SGB JAN 2029 SERIES IX"),
            "SGBJUN27": ("10261", "SGB JUN 2027 SERIES I")
        }
        for sym, (tok, name) in defaults.items():
            self.symbol_to_token[sym] = tok
            self.token_to_symbol[tok] = sym
            self.symbol_names[sym] = name

    def is_market_open(self) -> bool:
        now = datetime.datetime.now(self.ist)
        # Saturday = 5, Sunday = 6
        if now.weekday() >= 5:
            return False
        date_str = now.strftime("%Y-%m-%d")
        if date_str in NSE_HOLIDAYS_2026:
            return False
        market_start = now.replace(hour=9, minute=15, second=0, microsecond=0)
        market_end = now.replace(hour=15, minute=30, second=0, microsecond=0)
        return market_start <= now <= market_end

    def is_live_tick(self, tick_time: datetime.datetime, ltp: float, prev_close: Optional[float] = None) -> bool:
        if not self.is_market_open():
            return False
        age = (datetime.datetime.now(datetime.timezone.utc) - tick_time).total_seconds()
        if age > 5.0:
            return False
        # Filter out extreme dummy values from weekend mock sessions (>50% gap from prev close)
        if prev_close and prev_close > 0:
            pct_diff = abs(ltp - prev_close) / prev_close
            if pct_diff > 0.50:
                logger.warning(f"Abnormal tick price {ltp} vs prev_close {prev_close} ignored (mock session)")
                return False
        return True

    def load_instruments_from_scrip_master(self, cache_path: str = "scrip_master_cache.json") -> int:
        """
        Downloads Angel One's OpenAPIScripMaster.json, filters for NSE Cash equities and indices,
        and builds high-speed in-memory symbol<->token mappings.
        """
        url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
        data = None

        # Check local cache if fresh (<24h old)
        if os.path.exists(cache_path):
            file_age = time.time() - os.path.getmtime(cache_path)
            if file_age < 86400: # 24 hours
                try:
                    with open(cache_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    logger.info(f"Loaded {len(data)} instruments from cache {cache_path}")
                except Exception as e:
                    logger.warning(f"Error reading scrip cache: {e}")

        if not data:
            try:
                logger.info(f"Downloading Angel One ScripMaster from {url}...")
                resp = requests.get(url, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    with open(cache_path, "w", encoding="utf-8") as f:
                        json.dump(data, f)
                    logger.info(f"Downloaded and cached {len(data)} instruments.")
            except Exception as e:
                logger.error(f"Failed to download Angel ScripMaster: {e}")
                return len(self.symbol_to_token)

        if not data:
            return len(self.symbol_to_token)

        loaded = 0
        for item in data:
            exch = item.get("exch_seg")
            sym = item.get("symbol", "")
            token = item.get("token", "")
            name = item.get("name", "")

            # NSE Equities end with -EQ (e.g. RELIANCE-EQ)
            if exch == "NSE" and sym.endswith("-EQ") and token:
                clean_sym = sym[:-3] # Strip -EQ
                self.symbol_to_token[clean_sym] = token
                self.token_to_symbol[token] = clean_sym
                self.symbol_names[clean_sym] = name
                loaded += 1
            # AMXIDX indices
            elif exch == "NSE" and item.get("instrumenttype") == "AMXIDX" and token:
                if sym == "Nifty 50":
                    self.symbol_to_token["^NSEI"] = token
                    self.symbol_to_token["NIFTY"] = token
                    self.token_to_symbol[token] = "^NSEI"
                elif sym == "Nifty Bank":
                    self.symbol_to_token["^NSEBANK"] = token
                    self.token_to_symbol[token] = "^NSEBANK"
                loaded += 1

        logger.info(f"AngelProvider mapped {loaded} NSE instruments.")
        return loaded

    def search_instruments(self, query: str, limit: int = 15) -> List[Dict[str, str]]:
        q = query.strip().upper()
        results = []
        for sym, token in self.symbol_to_token.items():
            name = self.symbol_names.get(sym, sym)
            if q in sym or q in name.upper():
                results.append({
                    "symbol": sym,
                    "tradingsymbol": f"{sym}-EQ" if not sym.startswith("^") else sym,
                    "name": name,
                    "token": token,
                    "exchange": "NSE"
                })
                if len(results) >= limit:
                    break
        return results

    async def _rate_limit_rest(self):
        async with self.rest_lock:
            elapsed = time.time() - self.last_rest_call
            if elapsed < 0.10: # 10 requests / sec max
                await asyncio.sleep(0.10 - elapsed)
            self.last_rest_call = time.time()

    async def get_quotes(self, symbols: List[str]) -> List[Tick]:
        """
        Primary quotes fetcher.
        1. Checks Angel One session.
        2. Queries Angel One getMarketData (mode=FULL) for batched tokens.
        3. Falls back to YFinanceProvider with DELAYED labels if session / data call fails.
        """
        if not symbols:
            return []

        # Auto-login if configured but not logged in
        if not self.session.is_logged_in():
            if self.session.is_configured():
                self.session.login()

        # If still not logged in, gracefully fallback
        if not self.session.is_logged_in() or not self.session.smart_connect:
            self.stream_mode = "yf_fallback"
            return await self.fallback.get_quotes(symbols)

        # Map requested symbols to tokens
        tokens_to_fetch = []
        token_sym_map = {}
        unmapped_symbols = []

        for s in symbols:
            clean = s.replace(".NS", "").replace(".BO", "").strip().upper()
            token = self.symbol_to_token.get(clean)
            if token:
                tokens_to_fetch.append(token)
                token_sym_map[token] = clean
            else:
                unmapped_symbols.append(s)

        ticks: List[Tick] = []

        if tokens_to_fetch:
            try:
                await self._rate_limit_rest()

                def _fetch():
                    return self.session.smart_connect.getMarketData(
                        mode="FULL",
                        exchangeTokens={"NSE": tokens_to_fetch}
                    )

                market_resp = await asyncio.to_thread(_fetch)

                if isinstance(market_resp, dict) and market_resp.get("status"):
                    self.stream_mode = "rest_active"
                    data_items = market_resp.get("data", {}).get("fetched", [])
                    now_utc = datetime.datetime.now(datetime.timezone.utc)

                    for item in data_items:
                        token = str(item.get("symbolToken"))
                        sym = token_sym_map.get(token, item.get("tradingSymbol", "").replace("-EQ", ""))
                        ltp = float(item.get("ltp", 0.0))
                        prev_close = float(item.get("close", 0.0))
                        pct_change = float(item.get("percentChange", 0.0))
                        vol = float(item.get("tradeVolume", 0.0))

                        is_live = self.is_live_tick(now_utc, ltp, prev_close)

                        ticks.append(Tick(
                            symbol=sym,
                            price=ltp,
                            change_pct=pct_change,
                            volume=vol,
                            ts=now_utc,
                            source="angel",
                            is_live=is_live
                        ))
                else:
                    err_msg = str(market_resp.get("message") if isinstance(market_resp, dict) else market_resp)
                    logger.warning(f"Angel getMarketData returned non-success: {err_msg}")
                    self.session.mark_data_error(err_msg)
                    # Trigger fallback
                    return await self.fallback.get_quotes(symbols)

            except Exception as e:
                logger.error(f"Error calling Angel getMarketData: {e}")
                self.session.mark_data_error(str(e))
                return await self.fallback.get_quotes(symbols)

        # If any symbols were unmapped, fetch remainder via fallback
        if unmapped_symbols:
            fb_ticks = await self.fallback.get_quotes(unmapped_symbols)
            ticks.extend(fb_ticks)

        return ticks

    def start_stream(self, symbols: List[str], callback=None) -> None:
        """
        Starts the SmartWebSocketV2 streaming connection in a background daemon thread.
        Ticks are parsed from binary packets (paise -> rupees) and dispatched to LatestTick.
        """
        if not HAS_SMART_WS or not self.session.is_logged_in():
            logger.info("Angel SmartWebSocketV2 streaming skipped (credentials or library unavailable).")
            return

        if self.stream_active:
            # Update subscribed tokens
            new_tokens = [self.symbol_to_token[s] for s in symbols if s in self.symbol_to_token]
            if self.ws_client and new_tokens:
                try:
                    self.ws_client.subscribe(
                        correlation_id="tt_stream",
                        mode=2, # QUOTE mode
                        token_list=[{"exchangeType": 1, "tokens": new_tokens}]
                    )
                    self.subscribed_tokens.update(new_tokens)
                except Exception as e:
                    logger.error(f"Error subscribing new tokens to Angel WS: {e}")
            return

        tokens = [self.symbol_to_token[s] for s in symbols if s in self.symbol_to_token]
        self.subscribed_tokens = set(tokens)

        def _run_ws():
            try:
                auth_token = f"Bearer {self.session.jwt_token}" if not self.session.jwt_token.startswith("Bearer") else self.session.jwt_token
                self.ws_client = SmartWebSocketV2(
                    auth_token=auth_token,
                    api_key=self.session.api_key,
                    client_code=self.session.client_code,
                    feed_token=self.session.feed_token,
                    max_retry_attempt=5,
                    retry_delay=5
                )

                def on_open(wsapp):
                    logger.info("Angel One SmartWebSocketV2 connected successfully.")
                    self.stream_active = True
                    self.stream_mode = "streaming"
                    if self.subscribed_tokens:
                        self.ws_client.subscribe(
                            correlation_id="tt_stream",
                            mode=2, # QUOTE
                            token_list=[{"exchangeType": 1, "tokens": list(self.subscribed_tokens)}]
                        )

                def on_data(wsapp, msg):
                    self.last_tick_time = time.time()
                    token = str(msg.get("token", ""))
                    sym = self.token_to_symbol.get(token)
                    if not sym:
                        return

                    # SmartWebSocketV2 binary packet delivers price in PAISE (int64)
                    raw_ltp = msg.get("last_traded_price", 0)
                    raw_close = msg.get("closed_price", 0)
                    
                    ltp = raw_ltp / 100.0
                    close = raw_close / 100.0
                    vol = float(msg.get("volume_trade_for_the_day", 0))
                    change_pct = ((ltp - close) / close) * 100.0 if close > 0 else 0.0

                    now_utc = datetime.datetime.now(datetime.timezone.utc)
                    is_live = self.is_live_tick(now_utc, ltp, close)

                    tick = Tick(
                        symbol=sym,
                        price=ltp,
                        change_pct=change_pct,
                        volume=vol,
                        ts=now_utc,
                        source="angel",
                        is_live=is_live
                    )
                    import app.services.market_data as md
                    md.LatestTick[sym] = tick

                    if callback:
                        try:
                            callback(tick)
                        except Exception as cb_err:
                            logger.error(f"Tick callback error: {cb_err}")

                def on_error(wsapp, err):
                    self.stream_errors += 1
                    self.last_stream_error = str(err)
                    logger.warning(f"Angel SmartWebSocketV2 error: {err}")

                def on_close(wsapp):
                    logger.info("Angel SmartWebSocketV2 closed.")
                    self.stream_active = False

                self.ws_client.on_open = on_open
                self.ws_client.on_data = on_data
                self.ws_client.on_error = on_error
                self.ws_client.on_close = on_close

                self.ws_client.connect()
            except Exception as e:
                self.stream_active = False
                self.last_stream_error = str(e)
                logger.error(f"Angel SmartWebSocketV2 crashed: {e}")

        self.ws_thread = threading.Thread(target=_run_ws, daemon=True, name="AngelWSStream")
        self.ws_thread.start()
        logger.info("Started Angel WS stream daemon thread.")

    def get_provider_status(self) -> Dict[str, Any]:
        return {
            "name": "angel",
            "session": self.session.get_session_info(),
            "streaming": self.stream_active,
            "stream_mode": self.stream_mode,
            "subscribed_tokens_count": len(self.subscribed_tokens),
            "instruments_mapped": len(self.symbol_to_token),
            "is_market_open": self.is_market_open(),
            "last_stream_error": self.last_stream_error
        }
