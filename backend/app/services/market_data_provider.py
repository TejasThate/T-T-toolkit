from abc import ABC, abstractmethod
from typing import List, Dict, Any

class MarketDataProvider(ABC):
    """
    Abstract base class for market data providers (e.g., Upstox, Angel One, Mock).
    """

    @abstractmethod
    async def get_live_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """
        Fetch live quotes for a list of symbols.
        Returns a dictionary mapping symbols to their live data.
        """
        pass

    @abstractmethod
    async def get_top_gainers(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch top gainers in the market.
        """
        pass

    @abstractmethod
    async def get_top_losers(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch top losers in the market.
        """
        pass

    @abstractmethod
    async def get_index_data(self, index_name: str) -> Dict[str, Any]:
        """
        Fetch live data for a specific index (e.g., NIFTY 50).
        """
        pass
