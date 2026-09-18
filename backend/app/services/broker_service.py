import os
import requests
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BrokerAdapter(ABC):
    @abstractmethod
    def get_login_url(self) -> str:
        pass

    @abstractmethod
    def get_access_token(self, auth_code: str) -> str:
        pass

    @abstractmethod
    def get_holdings(self, access_token: str) -> List[Dict[str, Any]]:
        """Returns list of holdings: [{'symbol': '...', 'quantity': 10, 'average_price': 100.0, 'company_name': '...'}]"""
        pass

class UpstoxBrokerAdapter(BrokerAdapter):
    def __init__(self):
        self.api_key = os.getenv("UPSTOX_API_KEY", "")
        self.api_secret = os.getenv("UPSTOX_API_SECRET", "")
        self.redirect_uri = os.getenv("UPSTOX_REDIRECT_URI", "http://localhost:8000/api/broker/callback")
        self.base_url = "https://api.upstox.com/v2"
        
    def get_login_url(self) -> str:
        return f"{self.base_url}/login/authorization/dialog?response_type=code&client_id={self.api_key}&redirect_uri={self.redirect_uri}"

    def get_access_token(self, auth_code: str) -> str:
        url = f"{self.base_url}/login/authorization/token"
        headers = {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        }
        data = {
            'code': auth_code,
            'client_id': self.api_key,
            'client_secret': self.api_secret,
            'redirect_uri': self.redirect_uri,
            'grant_type': 'authorization_code'
        }
        response = requests.post(url, headers=headers, data=data)
        if response.status_code != 200:
            raise Exception(f"Upstox Auth Failed: {response.text}")
        return response.json().get("access_token")

    def get_holdings(self, access_token: str) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/portfolio/long-term-holdings"
        headers = {
            'accept': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch holdings: {response.text}")
            
        data = response.json().get("data", [])
        holdings = []
        for item in data:
            holdings.append({
                "symbol": item.get("trading_symbol", item.get("instrument_token", "UNKNOWN")),
                "company_name": item.get("company_name", ""),
                "quantity": float(item.get("quantity", 0)),
                "average_price": float(item.get("average_price", 0.0)),
                "current_price": float(item.get("last_price", 0.0))
            })
        return holdings

# Factory
def get_broker_adapter(provider: str) -> BrokerAdapter:
    if provider.lower() == "upstox":
        return UpstoxBrokerAdapter()
    raise ValueError(f"Unsupported broker: {provider}")
