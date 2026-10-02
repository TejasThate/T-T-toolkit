from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class MarketDataProvider(ABC):
    """
    Abstract base class for market data providers.
    All providers must implement these methods to ensure standard API compliance.
    """
    
    @abstractmethod
    async def get_index_constituents(self, index_name: str) -> List[str]:
        """Fetch a list of symbols that make up the given index."""
        pass
        
    @abstractmethod
    async def get_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """Fetch latest quotes for a list of symbols."""
        pass
        
    @abstractmethod
    async def get_history(self, symbol: str, period: str = "1mo", interval: str = "1d") -> List[Dict[str, Any]]:
        """Fetch historical OHLCV data for a symbol."""
        pass
        
    @abstractmethod
    async def get_market_status(self) -> Dict[str, Any]:
        """Fetch current market status (OPEN, CLOSED, PRE_OPEN, HOLIDAY)."""
        pass
