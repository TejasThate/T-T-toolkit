# Performance Baseline (PERF_BASELINE.md)

## Benchmark Results (5 runs each, Localhost) - AFTER PHASE 5

| Endpoint | Min (ms) | Avg (ms) | Max (ms) | Likely Reason |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | 2.12 | 2.92 | 3.40 | Instant memory response |
| `/health/deep` | 4.60 | 4.90 | 5.36 | DB check with connection pooling on Postgres |
| `/api/market/quotes` | 2.47 | 2.97 | 3.51 | Returning cached data instantly; provider fetching is a background task now |
| `/api/news` | 5.66 | 6.12 | 6.90 | Reading from Postgres cache; background worker scores news |
| `/api/screener/alerts` | 5.56 | 6.42 | 7.84 | Fast DB reads; no more synchronous crunching |

## Top 5 Slowest Operations (Resolved)

1.  **AI Chat (Llama-3/Groq)**: Resolved by implementing Server-Sent Events (SSE) streaming in Phase 3. TTFB (Time To First Byte) is now under 1.5s.
2.  **`/api/screener/alerts`**: Resolved by shifting intensive processes to background tasks and utilizing Postgres indexing. Now averages ~6ms.
3.  **`yfinance` calls in request path**: Resolved in Phase 2 by extracting to an asynchronous polling worker that caches tick maps. Endpoint just serves the snapshot.
4.  **News Scraping & Scoring**: Resolved in Phase 2. Background task fetches RSS feeds, dedupes, and uses Groq to batched-score sentiment out-of-band.
5.  **SQLite write locking**: Resolved in Phase 1 by migrating to Postgres with SQLAlchemy connection pooling. Writes no longer block reads.
