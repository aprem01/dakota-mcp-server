# Dakota Marketplace MCP Server

External-facing MCP (Model Context Protocol) server that allows customers to query Dakota Marketplace data from any MCP-compatible AI client. Every query runs as the authenticated customer using their Salesforce OAuth token — Salesforce sharing rules and field-level security are enforced natively.

## Architecture

```
AI Client (Claude/ChatGPT/Cursor)
    ↓ MCP Protocol
Dakota MCP Server (Node.js + Express)
    ├─ OAuth 2.0 + PKCE → Salesforce Connected App
    ├─ Redis → Session storage, cache, rate limiting
    └─ Salesforce REST/Composite API → Per-user queries
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_fund_managers` | Search by name, AUM, strategy, geography |
| `get_fund_manager` | Full profile + funds + contacts (Composite API) |
| `search_allocators` | Search by type, AUM, location |
| `get_allocator` | Full allocator profile + contacts |
| `search_funds` | Search by strategy, vintage year, status, manager |
| `get_fund` | Full fund details + manager info |
| `get_contacts` | Contacts for a manager or allocator |
| `search_marketplace` | Free-text search across all entities (SOSL) |

## Setup

### 1. Salesforce Connected App

1. In Salesforce Setup → App Manager → New Connected App
2. Enable OAuth Settings:
   - Callback URL: `https://your-app.herokuapp.com/auth/callback`
   - OAuth Scopes: `api`, `refresh_token`
3. Enable PKCE: check "Require Proof Key for Code Exchange (PKCE)"
4. Set "Permitted Users" to "All users may self-authorize"
5. Note the Consumer Key and Consumer Secret

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `SALESFORCE_CLIENT_ID` | Connected App Consumer Key |
| `SALESFORCE_CLIENT_SECRET` | Connected App Consumer Secret |
| `SALESFORCE_INSTANCE_URL` | e.g., `https://dakota.my.salesforce.com` |
| `SALESFORCE_REDIRECT_URI` | e.g., `https://your-app.herokuapp.com/auth/callback` |
| `REDIS_URL` | Redis connection string |
| `SESSION_SECRET` | Random secret for session signing |
| `PORT` | Server port (Heroku sets automatically) |

### 3. Install & Run

```bash
npm install
npm start
```

### 4. Deploy to Heroku

```bash
heroku create dakota-mcp-server
heroku addons:create heroku-redis:mini
heroku config:set SALESFORCE_CLIENT_ID=... SALESFORCE_CLIENT_SECRET=... ...
git push heroku main
```

## Authentication Flow

1. Customer opens `GET /auth/login` — redirects to Salesforce OAuth
2. After login, Salesforce redirects to `/auth/callback` with authorization code
3. Server exchanges code for access + refresh tokens (PKCE verified)
4. Tokens stored in Redis keyed by session ID
5. Session ID returned to client for use in MCP tool calls
6. Token refresh happens automatically before expiry

## Rate Limits

- **Standard tier**: 100 requests/hour
- **Premium tier**: 500 requests/hour
- Sliding window tracked in Redis
- Clear error with retry guidance when exceeded

## Cache Strategy

- Search results: 120s TTL
- Profile lookups: 300s TTL
- Strictly isolated by user ID — no cross-customer data leakage
- Key format: `cache:{user_id}:{tool_name}:{query_hash}`

## Customizing SOQL Queries

All Salesforce field names are centralized in the tool files under `src/tools/`. Update the SOQL queries there to match your actual Salesforce object and field API names. The Composite API request builders are in `src/salesforce/composite.js`.
