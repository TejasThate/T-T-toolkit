import os
import json
import jwt
from datetime import datetime, timedelta, timezone
from locust import HttpUser, task, between, events
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.environ.get("SECRET_KEY", "your-secret-key-for-jwt-keep-it-secret")
ALGORITHM = "HS256"

def create_test_token():
    expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode = {"sub": "test@example.com", "exp": expire} # Assuming test user
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

class LoadTestUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        self.token = create_test_token()
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def test_news(self):
        self.client.get("/api/news?category=All", headers=self.headers)

    @task(2)
    def test_portfolio(self):
        self.client.get("/api/portfolio", headers=self.headers)
        
    @task(1)
    def test_chat(self):
        # AI chat can take longer, weight is lower
        payload = {
            "session_id": 1,
            "messages": [{"role": "user", "content": "Hello, how are the markets?"}]
        }
        self.client.post("/api/chat", json=payload, headers=self.headers)
