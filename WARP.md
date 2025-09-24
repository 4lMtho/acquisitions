# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Stack: Node.js (ESM) + Express 5, Drizzle ORM (neon-http), Neon serverless Postgres, Winston logging, Morgan HTTP logging, Zod validation, Arcjet security middleware.
- Entrypoint: src/index.js → src/server.js (listen) → src/app.js (Express app, middleware, routes).
- Routes: /api/auth (sign-up, sign-in, sign-out), /api/users (list, by id placeholder). Health at /health and root at /.
- Import aliases: package.json defines import maps for #config/*, #controllers/*, #middleware/*, #models/*, #routes/*, #services/*, #utils/*, #validations/*.
- Environment: NODE_ENV toggles Neon Local dev behavior; Docker Compose orchestrates dev (with Neon Local proxy) and prod (direct Neon Cloud).

Common commands
- Install
  - npm ci (preferred, lockfile present)
  - npm install
- Run (local without Docker)
  - npm run dev  # node --watch src/index.js
- Lint/Format
  - npm run lint
  - npm run lint:fix
  - npm run format
  - npm run format:check
- Database (Drizzle)
  - npm run db:generate
  - npm run db:migrate
  - npm run db:studio
- Docker (development, Neon Local)
  - docker compose -f docker-compose.dev.yml up --build
  - App: http://localhost:3000
  - Uses .env.development (see README for required Neon vars)
- Docker (production, Neon Cloud)
  - Note: Dockerfile expects "npm start". Add to package.json if missing: "start": "node src/index.js"
  - docker compose -f docker-compose.prod.yml up --build -d
  - App: http://localhost:3000
- Windows note: package scripts dev:docker and prod:docker call shell scripts (scripts/dev.sh, scripts/prod.sh). On Windows PowerShell, run the docker compose commands above directly unless using WSL/Git Bash.
- Tests: No test runner or scripts are configured in this repo as of now. Update this section when tests are added.

High-level architecture
- Bootstrap
  - src/index.js loads dotenv and imports ./server.js
  - src/server.js reads PORT (default 3000) and starts Express app
  - src/app.js builds the app with middleware, logging, and route mounting
- Configuration (src/config)
  - database.js: Neon serverless driver via @neondatabase/serverless; when NODE_ENV=development it routes through Neon Local proxy (http://neon-local:5432/sql). Exposes drizzle db and raw sql
  - logger.js: Winston logger; file transports for logs/ and console in non-production
  - arcjet.js: Arcjet client with shield, bot detection, and a short sliding window rule
- Middleware
  - security.middleware.js: role-aware rate limiting via Arcjet (guest/user/admin windows) with bot/shield/rate-limit handling and structured warnings, then next()
- Routing layer (src/routes)
  - auth.routes.js → controllers/auth.controller.js
  - users.routes.js → controllers/users.controller.js
- Controllers
  - auth.controller.js: Zod validation (signup/signin), calls services, issues JWT via utils/jwt.js, sets httpOnly cookie via utils/cookies.js, logs via Winston
  - users.controller.js: fetchAllUsers via service and returns payload with count
- Services
  - auth.service.js: createUser with uniqueness check, bcrypt hashing, drizzle insert; authenticateUser with bcrypt compare; returns sanitized user fields
  - users.service.js: getAllUsers selects explicit columns from users table
- Models
  - models/user.model.js: Drizzle schema for users (id, name, email, password, role, created_at, updated_at)
- Utilities
  - utils/jwt.js: sign/verify with JWT_SECRET and 1d expiry
  - utils/cookies.js: helpers to set/clear httpOnly cookie with secure defaults (15m)
  - utils/format.js: formats Zod errors
- Validations
  - validations/auth.validation.js: Zod schemas for signup/signin

Environment and runtime
- Required variables commonly used by the app and tooling (set via env files or CI):
  - DATABASE_URL (dev/prod; Neon Local vs Neon Cloud)
  - NODE_ENV (development/production)
  - ARCJET_KEY (Arcjet security)
  - JWT_SECRET (auth token signing)
  - LOG_LEVEL (optional for Winston)
  - PORT (optional; default 3000)
- Docker Compose
  - docker-compose.dev.yml: runs Neon Local proxy and app (dev target) with hot reload; uses .env.development
  - docker-compose.prod.yml: runs app (prod target) direct to Neon Cloud; uses .env.production
- Health
  - GET /health returns JSON with status, timestamp, and uptime; Dockerfile healthcheck targets this endpoint

Key notes distilled from README
- Dev uses Neon Local proxy with ephemeral branches; stopping dev removes ephemeral branch
- For serverless driver in dev, Neon Local proxy is at http://neon-local:5432/sql with self-signed TLS (adjust ssl behavior in non-serverless clients)
- Production connects directly to Neon Cloud via DATABASE_URL; no Neon Local

Conventions
- Code style: ESLint (eslint.config.js) with Prettier integration; ESM modules; 2-space indentation; single quotes; semicolons
- Import aliases via package.json "imports" map (ESM import maps); use paths like import x from '#services/...'
