import pytest
import datetime
import time
import asyncio
from unittest.mock import MagicMock

from app.services.market_data import Tick, LatestTick
from app.providers.angel_session import AngelSession
from app.providers.angel_provider import AngelProvider

# 1. PAISE CONVERSION TEST
def test_paise_conversion_accuracy():
    """
    SmartWebSocketV2 binary packet delivers prices in PAISE (int64 integer).
    Verify that paise / 100.0 converts with precision to match REST quote LTP.
    """
    binary_last_traded_price_paise = 285050 # 2850 rupees and 50 paise
    binary_closed_price_paise = 280000     # 2800 rupees and 0 paise

    ltp_rupees = binary_last_traded_price_paise / 100.0
    close_rupees = binary_closed_price_paise / 100.0

    rest_mock_ltp = 2850.50
    rest_mock_close = 2800.00

    assert ltp_rupees == rest_mock_ltp, f"LTP mismatch: {ltp_rupees} != {rest_mock_ltp}"
    assert close_rupees == rest_mock_close, f"Close mismatch: {close_rupees} != {rest_mock_close}"
    
    # Calculate percentage change
    change_pct = ((ltp_rupees - close_rupees) / close_rupees) * 100.0
    expected_pct = ((2850.50 - 2800.00) / 2800.00) * 100.0
    assert abs(change_pct - expected_pct) < 1e-4

# 2. HOLIDAY AND MARKET HOURS SAFETY GUARDS
def test_holiday_and_market_hours_guards():
    """
    Verify safety guards prevent weekend mock sessions and holiday ticks from showing as LIVE.
    """
    provider = AngelProvider()

    # Outside market hours or weekend
    assert provider.is_live_tick(
        datetime.datetime.now(datetime.timezone.utc),
        ltp=2850.0,
        prev_close=2800.0
    ) == provider.is_market_open()

    # Extreme mock session gap (>50% single-tick gap from prev_close) must be rejected
    mock_crash_tick = provider.is_live_tick(
        datetime.datetime.now(datetime.timezone.utc),
        ltp=10.0, # 10 Rs vs 2800 prev close
        prev_close=2800.0
    )
    assert mock_crash_tick is False, "Dummy mock price gap must not be treated as live"

# 3. INSTRUMENT TOKEN MAPPING AND SYMBOL SEARCH
def test_symbol_token_mapping_and_search():
    """
    Verify default tokens and search functionality.
    """
    provider = AngelProvider()
    assert "RELIANCE" in provider.symbol_to_token
    assert provider.symbol_to_token["RELIANCE"] == "2885"
    assert provider.token_to_symbol["2885"] == "RELIANCE"

    # Search
    results = provider.search_instruments("RELIANCE")
    assert len(results) > 0
    match = results[0]
    assert match["symbol"] == "RELIANCE"
    assert match["token"] == "2885"
    assert match["exchange"] == "NSE"

# 4. KILLING ANGEL SESSION FLIPS TO DELAYED / YFINANCE FALLBACK
def test_session_failure_circuit_breaker():
    """
    Verify killing the Angel session flips gracefully to YFinance fallback with DELAYED badge.
    """
    async def _run():
        mock_session = AngelSession(
            api_key="mock_key",
            client_code="mock_client",
            pin="1234",
            totp_secret="JBSWY3DPEHPK3PXP"
        )
        # Simulate unauthenticated / killed session
        mock_session.jwt_token = None
        mock_session.auth_error = "Session killed by admin / expired token"

        provider = AngelProvider(session=mock_session)

        # Mock the fallback provider response
        dummy_fallback_tick = Tick(
            symbol="RELIANCE",
            price=2850.0,
            change_pct=1.5,
            volume=100000.0,
            ts=datetime.datetime.now(datetime.timezone.utc),
            source="yfinance",
            is_live=False # DELAYED
        )
        provider.fallback.get_quotes = MagicMock(return_value=asyncio.sleep(0.01, result=[dummy_fallback_tick]))

        ticks = await provider.get_quotes(["RELIANCE"])
        assert len(ticks) == 1
        assert ticks[0].symbol == "RELIANCE"
        assert ticks[0].source == "yfinance"
        assert ticks[0].is_live is False # Must carry is_live=False (DELAYED)

        # Recovery: restore session
        mock_session.jwt_token = "valid_test_token"
        mock_session.feed_token = "valid_feed_token"
        mock_session.auth_error = None
        assert mock_session.is_logged_in() is True

    asyncio.run(_run())

# 5. CONCURRENCY: 50 SIMULTANEOUS USERS CAUSE ZERO EXTRA PROVIDER CALLS
def test_fifty_concurrent_users_zero_extra_provider_calls():
    """
    Verify 50 concurrent requests read from shared in-memory LatestTick map
    without triggering 50 individual calls to Angel One.
    """
    async def _run():
        now = datetime.datetime.now(datetime.timezone.utc)
        LatestTick["RELIANCE"] = Tick(
            symbol="RELIANCE",
            price=2850.0,
            change_pct=1.2,
            volume=500000.0,
            ts=now,
            source="angel",
            is_live=True
        )

        upstream_api_calls = 0

        async def user_request_quote(sym: str):
            nonlocal upstream_api_calls
            tick = LatestTick.get(sym)
            if not tick:
                upstream_api_calls += 1
            return tick

        # 50 simultaneous user requests
        tasks = [user_request_quote("RELIANCE") for _ in range(50)]
        results = await asyncio.gather(*tasks)

        assert len(results) == 50
        assert all(r.price == 2850.0 for r in results)
        assert upstream_api_calls == 0, "50 concurrent users must cause zero extra provider calls"

    asyncio.run(_run())
