import httpx
import time
import statistics

BASE_URL = "http://localhost:8000"

ENDPOINTS = [
    "/health",
    "/health/deep",
    "/api/market/quotes?symbols=RELIANCE.NS,TCS.NS,HDFCBANK.NS",
    "/api/news?category=All",
    "/api/screener/alerts"
]

def bench_endpoint(client: httpx.Client, path: str, runs: int = 5):
    url = f"{BASE_URL}{path}"
    times = []
    
    # Warmup
    try:
        client.get(url, timeout=10.0)
    except Exception:
        pass
        
    for _ in range(runs):
        start = time.time()
        try:
            resp = client.get(url, timeout=15.0)
            status = resp.status_code
        except Exception as e:
            status = str(e)
            
        elapsed = (time.time() - start) * 1000
        times.append(elapsed)
        time.sleep(0.1) # brief pause
        
    min_t = min(times)
    max_t = max(times)
    avg_t = statistics.mean(times)
    
    print(f"{path:<50} | Min: {min_t:7.2f}ms | Avg: {avg_t:7.2f}ms | Max: {max_t:7.2f}ms")

if __name__ == "__main__":
    print(f"Running benchmarks against {BASE_URL} (5 runs each)...\n")
    print(f"{'Endpoint':<50} | {'Min':>9} | {'Avg':>9} | {'Max':>9}")
    print("-" * 85)
    
    with httpx.Client() as client:
        for ep in ENDPOINTS:
            bench_endpoint(client, ep)
