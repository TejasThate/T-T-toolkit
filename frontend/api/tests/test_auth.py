import pytest
import secrets

@pytest.mark.asyncio
async def test_register(client):
    email = f"test_{secrets.token_hex(4)}@example.com"
    response = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "securepassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login(client):
    email = f"test_{secrets.token_hex(4)}@example.com"
    # Register first
    await client.post("/api/auth/register", json={"email": email, "password": "securepassword"})
    
    # Then login
    response = await client.post(
        "/api/auth/login",
        data={"username": email, "password": "securepassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
