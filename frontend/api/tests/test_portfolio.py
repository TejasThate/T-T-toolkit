import pytest
from httpx import AsyncClient
import secrets

@pytest.mark.asyncio
async def test_get_portfolio_empty(client):
    # Register and get token
    email = f"test_{secrets.token_hex(4)}@example.com"
    await client.post("/api/auth/register", json={"email": email, "password": "testpass"})
    login_res = await client.post("/api/auth/login", data={"username": email, "password": "testpass"})
    token = login_res.json()["access_token"]
    
    # Fetch portfolio
    response = await client.get(
        "/api/portfolio",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json() == []
