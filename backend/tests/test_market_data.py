import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from app.services import market_data

@pytest.mark.asyncio
async def test_fetch_quotes_empty():
    quotes = await market_data.fetch_quotes([])
    assert quotes == {}

@pytest.mark.asyncio
@patch('app.services.market_data.yf.download')
async def test_fetch_quotes_single(mock_download):
    # Mock yfinance DataFrame response for a single stock
    mock_df = pd.DataFrame({
        'Close': [2400.0, 2450.0, 2500.0, 2480.0, 2500.0]
    })
    mock_download.return_value = mock_df
    
    quotes = await market_data.fetch_quotes(["RELIANCE"])
    
    assert "RELIANCE.NS" in quotes
    assert quotes["RELIANCE.NS"]["price"] == 2500.0
    # change = ((2500 - 2480) / 2480) * 100 = 0.80645...
    assert abs(quotes["RELIANCE.NS"]["change_pct"] - 0.80645) < 0.01

@pytest.mark.asyncio
@patch('app.services.market_data.yf.download')
async def test_fetch_quotes_multiple(mock_download):
    # Mock yfinance DataFrame response for multiple stocks
    # For multiple stocks, yfinance returns a MultiIndex column DataFrame,
    # but for simple 'Close' we can just return a DataFrame with columns as tickers
    # Wait, the code checks `if sym in closes:` so `closes` needs to have sym as columns.
    mock_df = pd.DataFrame()
    mock_df.index = [0, 1]
    
    # Create the Close dataframe to be returned by data['Close']
    close_df = pd.DataFrame({
        'TCS.NS': [3000.0, 3100.0],
        'INFY.NS': [1500.0, 1450.0]
    })
    
    # We assign it to mock_df under 'Close' using pd.concat with keys to simulate MultiIndex
    mock_df = pd.concat([close_df], axis=1, keys=['Close'])
    
    mock_download.return_value = mock_df
    
    quotes = await market_data.fetch_quotes(["TCS", "INFY.NS"])
    
    assert "TCS.NS" in quotes
    assert quotes["TCS.NS"]["price"] == 3100.0
    assert abs(quotes["TCS.NS"]["change_pct"] - 3.33) < 0.02
    
    assert "INFY.NS" in quotes
    assert quotes["INFY.NS"]["price"] == 1450.0
    assert abs(quotes["INFY.NS"]["change_pct"] - (-3.33)) < 0.02

@pytest.mark.asyncio
@patch('app.services.market_data.fetch_quotes')
async def test_fetch_top_gainers(mock_fetch_quotes):
    # Mock fetch_quotes to return predefined data
    mock_fetch_quotes.return_value = {
        "RELIANCE.NS": {"price": 2500.0, "change_pct": 1.2},
        "TCS.NS": {"price": 3100.0, "change_pct": -0.5},
        "INFY.NS": {"price": 1450.0, "change_pct": 3.4},
        "HDFCBANK.NS": {"price": 1600.0, "change_pct": 0.2},
    }
    
    # Clear cache
    market_data._cache.clear()
    
    gainers = await market_data.fetch_top_gainers(limit=2)
    
    assert len(gainers) == 2
    assert gainers[0]["symbol"] == "INFY"
    assert gainers[0]["change_pct"] == 3.4
    assert gainers[1]["symbol"] == "RELIANCE"
    assert gainers[1]["change_pct"] == 1.2
