# Deploying MealPlanner AI to Vercel

This project deploys as a **single Vercel project**:

- **Frontend** (React / CRA) → static build served by Vercel.
- **Backend** (Go / Gin) → the whole API runs as one Go serverless function at `api/index.go`.
- **Database** → external managed PostgreSQL (Neon recommended, via the Vercel Marketplace).

All `/api/*` requests are rewritten to the Go function; everything else falls back to the
React SPA (`index.html`). Because frontend and API share one domain, there is no CORS to configure.

## Project layout (after the Vercel refactor)

```
.
├── api/index.go        # Vercel Go serverless function — wraps the Gin app (the entrypoint)
├── internal/           # Go backend packages (api handlers, services, models, config)
├── go.mod, go.sum      # Go module "mealplanner" (must be at repo root for Vercel)
├── frontend/           # React app (built to frontend/build at deploy time)
├── database/*.sql      # Schema + seed SQL to load into your Postgres
└── vercel.json         # Build command, output dir, function config, rewrites
```

## One-time setup

### 1. Provision a Postgres database
In the Vercel dashboard: **Storage → Create Database → Neon** (or any managed Postgres).
Copy the **pooled** connection string (Neon's host contains `-pooler`). Serverless functions
open many short-lived connections, so the pooled endpoint is important.

### 2. Load the schema
Run the SQL in `database/` against your new database, in this order:
```
schema.sql
seeds.sql                       # optional sample data
# then any feature migrations you need, e.g.:
add_shopping_cart_tables.sql
enhanced_user_preferences.sql
add_centralized_scraped_recipes_table.sql
```
(Use `psql "$DATABASE_URL" -f database/schema.sql`, etc.)

### 3. Set environment variables (Project Settings → Environment Variables)
| Variable          | Required | Notes                                              |
|-------------------|----------|----------------------------------------------------|
| `DATABASE_URL`    | yes      | Pooled Postgres connection string                  |
| `OPENAI_API_KEY`  | no       | AI features fall back to mock responses if unset   |
| `USDA_API_KEY`    | no       | Needed for live USDA nutrition lookups             |
| `ENVIRONMENT`     | no       | e.g. `production`                                   |

`REACT_APP_API_URL` is injected as `/api` by `vercel.json` at build time — no need to set it.

## Deploy

**Option A — Git integration (recommended):** push this repo to GitHub/GitLab and
"Import Project" in Vercel. It auto-builds on every push.

**Option B — CLI:**
```
npm i -g vercel
vercel            # preview deploy
vercel --prod     # production deploy
```

## Verifying
- `https://<your-app>.vercel.app/api/health` → `{"status":"ok"}`
- The app loads and recipe/ingredient lists populate (confirms DB connectivity).

## Known limitations on serverless
- **Background web scrapers** (continuous loops) do not run on serverless. On-demand
  scraping via `POST /api/scrape` still works. To schedule recurring scrapes, add a
  [Vercel Cron Job](https://vercel.com/docs/cron-jobs) hitting a dedicated endpoint.
- Keep the DB pool small (already configured in `api/index.go`) and prefer a pooled
  connection string to avoid exhausting Postgres connections under concurrency.
