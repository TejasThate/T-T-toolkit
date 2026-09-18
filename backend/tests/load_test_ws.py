import asyncio
import websockets
import json
import time

WS_URL = "ws://localhost:8000/ws/market"
NUM_CLIENTS = 100

async def client_task(client_id):
    try:
        async with websockets.connect(WS_URL) as ws:
            # print(f"Client {client_id} connected.")
            messages_received = 0
            start_time = time.time()
            
            # Listen for messages for 15 seconds
            while time.time() - start_time < 15:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    data = json.loads(message)
                    messages_received += 1
                except asyncio.TimeoutError:
                    continue
                    
            return {"client_id": client_id, "success": True, "messages": messages_received}
    except Exception as e:
        return {"client_id": client_id, "success": False, "error": str(e)}

async def main():
    print(f"Spawning {NUM_CLIENTS} concurrent WebSocket clients to {WS_URL}...")
    start_time = time.time()
    
    tasks = []
    for i in range(NUM_CLIENTS):
        tasks.append(client_task(i))
        
    results = await asyncio.gather(*tasks)
    
    success_count = sum(1 for r in results if r["success"])
    fail_count = NUM_CLIENTS - success_count
    
    total_messages = sum(r.get("messages", 0) for r in results)
    
    print(f"--- Load Test Complete ---")
    print(f"Total time: {time.time() - start_time:.2f} seconds")
    print(f"Successful connections: {success_count}/{NUM_CLIENTS}")
    print(f"Failed connections: {fail_count}/{NUM_CLIENTS}")
    print(f"Total messages received across all clients: {total_messages}")
    
    if fail_count > 0:
        print("\nErrors encountered:")
        for r in results:
            if not r["success"]:
                print(f"Client {r['client_id']}: {r['error']}")

if __name__ == "__main__":
    asyncio.run(main())
