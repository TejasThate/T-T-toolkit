import pytest
import time
from app.services.live_market_state import LiveMarketState
from app.services.market_data import Tick
import datetime

def test_live_market_state_etfs():
    state = LiveMarketState()
    t0 = time.time()
    etfs = state.get_etfs()
    latency_ms = (time.time() - t0) * 1000
    
    assert len(etfs) >= 10, "Should have full basket of Indian ETFs"
    assert latency_ms < 5.0, f"ETF retrieval took {latency_ms:.2f}ms, expected < 5ms"
    
    symbols = [e["symbol"] for e in etfs]
    assert "NIFTYBEES" in symbols
    assert "GOLDBEES" in symbols
    assert "BANKBEES" in symbols
    assert "CPSEETF" in symbols
    
    # Filter by category
    commodity_etfs = state.get_etfs(category="Commodity")
    assert all(e["category"] == "Commodity" for e in commodity_etfs)
    assert any(e["symbol"] == "GOLDBEES" for e in commodity_etfs)
    assert any(e["symbol"] == "SILVERBEES" for e in commodity_etfs)

def test_live_market_state_bonds():
    state = LiveMarketState()
    t0 = time.time()
    bonds = state.get_bonds()
    latency_ms = (time.time() - t0) * 1000
    
    assert len(bonds) >= 8, "Should have Indian G-Secs, SGBs, and PSU bonds"
    assert latency_ms < 5.0, f"Bond retrieval took {latency_ms:.2f}ms, expected < 5ms"
    
    # Check 10Y Benchmark G-Sec
    gsec = next((b for b in bonds if "GS2033" in b["symbol"] or "GS2034" in b["symbol"]), None)
    assert gsec is not None
    assert gsec["rating"] == "SOVEREIGN"
    assert gsec["yield_pct"] > 6.0
    
    # Check Sovereign Gold Bond
    sgb = next((b for b in bonds if "SGB" in b["symbol"]), None)
    assert sgb is not None
    assert sgb["type"] == "SGB (Gold)"
    assert sgb["price"] > 10000

def test_etf_and_bond_tick_updates():
    state = LiveMarketState()
    
    # Update NIFTYBEES with new tick
    tick_etf = Tick(
        symbol="NIFTYBEES",
        price=272.50,
        change_pct=2.45,
        volume=500000,
        ts=datetime.datetime.now(datetime.timezone.utc),
        source="angel",
        is_live=True
    )
    state.update_ticks([tick_etf])
    
    etfs = state.get_etfs()
    niftybees = next(e for e in etfs if e["symbol"] == "NIFTYBEES")
    assert niftybees["nav"] == 272.50
    assert niftybees["price"] == 272.50
    assert niftybees["change_pct"] == 2.45

