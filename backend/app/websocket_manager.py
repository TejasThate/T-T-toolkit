import os
import json
import logging
import asyncio
from typing import List, Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Try importing redis for pub/sub, but allow it to fail gracefully if not installed
try:
    import redis.asyncio as redis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.redis_client = None
        self.pubsub = None
        self.use_redis = False
        
        redis_url = os.environ.get("REDIS_URL")
        if HAS_REDIS and redis_url:
            try:
                self.redis_client = redis.from_url(redis_url)
                self.pubsub = self.redis_client.pubsub()
                self.use_redis = True
                logger.info(f"WebSocket ConnectionManager using Redis Pub/Sub at {redis_url}")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}. Falling back to in-memory.")
                self.use_redis = False
        else:
            logger.info("WebSocket ConnectionManager using In-Memory broadcast (No REDIS_URL or redis-py not installed)")

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
            self.disconnect(websocket)

    async def broadcast_memory(self, message: str):
        """In-memory broadcast for the local worker only."""
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to a connection: {e}")
                dead_connections.append(connection)
                
        for dead in dead_connections:
            self.disconnect(dead)

    async def broadcast(self, message: str, channel: str = "market:updates"):
        """Broadcast a message, via Redis if available, else in-memory."""
        if self.use_redis:
            try:
                await self.redis_client.publish(channel, message)
            except Exception as e:
                logger.error(f"Redis publish failed: {e}. Falling back to memory broadcast.")
                await self.broadcast_memory(message)
        else:
            await self.broadcast_memory(message)

    async def redis_listener(self):
        """Background task to listen to Redis pub/sub and relay to local WebSockets."""
        if not self.use_redis:
            return
            
        try:
            await self.pubsub.subscribe("market:updates")
            logger.info("Subscribed to Redis channel 'market:updates'")
            
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = message["data"].decode("utf-8")
                    # Relay to all locally connected websockets
                    await self.broadcast_memory(data)
        except Exception as e:
            logger.error(f"Redis listener error: {e}")

manager = ConnectionManager()
