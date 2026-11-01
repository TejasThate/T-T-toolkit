# Environment Variables Checklist

This document tracks all required and optional environment variables across services.
**NEVER COMMIT REAL VALUES / SECRETS TO GIT.**

---

### 1. Market Data (Phase 7 — Angel One SmartAPI)
| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `MARKET_PROVIDER` | Yes | Selects market data provider (`angel` or `yfinance`) | `angel` |
| `ANGEL_API_KEY` | For Live Feed | API Key from Angel One SmartAPI Developer Portal | Alphanumeric key |
| `ANGEL_CLIENT_CODE` | For Live Feed | Angel One Trading Account Client ID | e.g. `A123456` |
| `ANGEL_PIN` | For Live Feed | 4-digit Trading / Login PIN | `1234` |
| `ANGEL_TOTP_SECRET` | For Live Feed | Base32 TOTP secret key enabled on Angel One | e.g. `JBSWY3DPEHPK3PXP` |

---

### 2. Core Backend & Database
| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection URI (with `+asyncpg`) | `postgresql+asyncpg://...` (falls back to local SQLite if unset) |
| `SECRET_KEY` / `JWT_SECRET` | Yes | 256-bit secret key for JWT session tokens | Generated random hex/string |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of permitted CORS frontend domains | `http://localhost:3000,https://t-t-toolkit-tawny.vercel.app` |

---

### 3. Authentication & AI Services
| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 Web Client ID | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth 2.0 Web Client Secret | Alphanumeric secret |
| `GROQ_API_KEY` | Yes | Groq Cloud API Key for high-speed LLM inference | `gsk_...` |
| `SENTRY_DSN` | Optional | Sentry DSN for backend crash and error tracking | `https://...@sentry.io/...` |
