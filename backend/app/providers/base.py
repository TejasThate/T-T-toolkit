from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import datetime

class Tick(BaseModel):
    symbol: str
    price: float
    change_pct: float
    volume: float = 0.0
    ts: datetime.datetime
    source: str
    is_live: bool

class MarketDataProvider(ABC):
    """
    Abstract base class for all market data providers (Angel One, YFinance, etc.).
    """
    @abstractmethod
    async def get_quotes(self, symbols: List[str]) -> List[Tick]:
        pass

    async def start_stream(self, symbols: List[str], callback) -> None:
        pass
