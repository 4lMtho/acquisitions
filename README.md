# Acquisitions — Docker + Neon Local (Dev) and Neon Cloud (Prod)

This repo is configured to run locally with Neon Local (ephemeral branches) and in production against Neon Cloud.

Highlights

- Dev: Docker Compose runs your app + Neon Local proxy. Your app connects to Postgres at postgres://neon:npg@neon-local:5432/<db>.
- Ephemeral branches: Each dev run creates an ephemeral branch from a parent branch and cleans it up when stopping.
- Prod: App connects directly to Neon Cloud using DATABASE_URL. No Neon Local is used.
- Secrets: Injected via env files and Compose; nothing hardcoded in images.

## Prerequisites

- Docker Desktop (Windows/macOS/Linux)
- A Neon account with:
  - API key (NEON_API_KEY)
  - Project ID (NEON_PROJECT_ID)
  - Parent branch ID (PARENT_BRANCH_ID) for dev ephemeral branches (e.g., your main branch)

## Files added

- `Dockerfile` — Multi-stage image for dev (watch mode) and prod
- `.dockerignore` — Keeps images small
- `docker-compose.dev.yml` — App + Neon Local proxy
- `docker-compose.prod.yml` — App only (connects to Neon Cloud)
- `.env.development` — Dev env vars (placeholders)
- `.env.production` — Prod env vars (placeholders)

Note: `.gitignore` was updated to ignore `.neon_local/`, which Neon Local may create if you enable persistent branches.

## Environment variables

- Dev (`.env.development`):
  - NEON_API_KEY, NEON_PROJECT_ID, PARENT_BRANCH_ID — used by the Neon Local proxy container
  - NEON_DATABASE_NAME — database in your Neon project
  - DATABASE_URL — app connection string to the Neon Local proxy
- Prod (`.env.production`):
  - DATABASE_URL — your Neon Cloud connection string (no Neon Local in prod)

Do not commit real secrets; these files are already in `.gitignore`.

## Start the app locally (Neon Local)

1. Open PowerShell in the repo root.
2. Edit `.env.development` and fill in:
   - `NEON_API_KEY=...`
   - `NEON_PROJECT_ID=...`
   - `PARENT_BRANCH_ID=...`
   - `NEON_DATABASE_NAME=...` (e.g., `appdb`)
     The app DATABASE_URL will be:
     `postgres://neon:npg@neon-local:5432/<NEON_DATABASE_NAME>?sslmode=require`
3. Run dev stack:
   `docker compose -f docker-compose.dev.yml up --build`
4. App is available at http://localhost:3000.
5. Stopping the stack deletes the ephemeral branch automatically.

### Optional: Persist a branch per Git branch in dev

In `docker-compose.dev.yml`, uncomment the `volumes` under `neon-local`:

- `./.neon_local/:/tmp/.neon_local`
- `./.git/HEAD:/tmp/.git/HEAD:ro,consistent`
  This keeps a stable branch for your current Git branch. `.neon_local/` is ignored by Git.

## Using @neondatabase/serverless locally

Neon Local can proxy the Neon serverless driver over HTTP. If your code uses `@neondatabase/serverless`, add this dev-only configuration:

```js
import { neon, neonConfig } from '@neondatabase/serverless';

if (process.env.NODE_ENV === 'development') {
  // Route serverless driver to Neon Local proxy
  neonConfig.fetchEndpoint = 'http://neon-local:5432/sql';
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);
```

For Postgres/libpq clients, Neon Local uses self-signed TLS; when using Node `pg` you may need:

```js
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

## Build and run for production (Neon Cloud)

1. Edit `.env.production` and set `DATABASE_URL` to your Neon Cloud connection string (e.g. `postgres://<user>:<password>@<project>.<region>.pooler.neon.tech/<db>?sslmode=require`).
2. Ensure your app has a production start script in `package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js"
  }
}
```

3. Build and run:
   `docker compose -f docker-compose.prod.yml up --build -d`

The prod Compose file does not run Neon Local; the app connects directly to Neon Cloud via `DATABASE_URL`.

## How environments switch

- Compose selects the appropriate env file:
  - Dev: `.env.development` (Neon Local URL)
  - Prod: `.env.production` (Neon Cloud URL)
- Your app reads `process.env.DATABASE_URL` — no code changes needed to switch environments.

## Troubleshooting

- If `@neondatabase/serverless` over Neon Local returns connection issues, ensure you set `neonConfig.fetchEndpoint = 'http://neon-local:5432/sql'` in development and avoid WebSockets.
- If using Node `pg`, add `ssl: { rejectUnauthorized: false }` when talking to Neon Local (self-signed cert).
- Windows file watching: the dev service uses `node --watch`; Docker Desktop file sharing must be enabled for your project path.

## References

- Neon Local docs: https://neon.com/docs/local/neon-local
