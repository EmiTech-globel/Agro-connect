# Repo guidance for AI coding agents

This file gives focused, actionable pointers for making productive code changes in this repository.

Architecture (big picture)
- Frontend: a Next.js app in `frontend/`. A custom server is started in `frontend/server.js` which also initializes Socket.io and exposes the instance on `globalThis.io` for API routes to emit real-time updates.
- Ingestion worker: `services/ingestion/src/index.ts` consumes RabbitMQ messages from the `scraped_prices` queue, validates/detects anomalies, and inserts rows into the `scraped_prices` Postgres table.
- Scrapers: Python scrapers live under `scrapers/` (e.g. `scrapers/scrapers/jiji_scraper.py`). They produce structured price data (product_id, location_id, price, unit, currency) that is expected to be sent to the ingestion queue.
- Dataflow: scrapers -> RabbitMQ `scraped_prices` -> ingestion worker -> Postgres -> frontend (via DB queries or socket.io room `prices`).

Key conventions & patterns to follow
- Socket.io access: use `globalThis.io` (as created in `frontend/server.js`). Always guard access (it may be undefined in some test contexts).
- Postgres pool: use the pool pattern in `frontend/lib/db.ts` which stores a global `__pgPool` during dev hot-reloads. Prefer reusing `query()` helper where present.
- Queue name: the ingestion worker listens on `scraped_prices` — if you add producers or new consumers, update this queue and document the message schema.
- Anomaly rules: ingestion flags anomalies when price change > 30% (see `services/ingestion/src/index.ts`). New ingestion logic should preserve or explicitly migrate this behavior.
- Scraper outputs: scrapers build dictionaries with `product_id`, `location_id`, `price`, `unit`, `currency`. When adding a new scraper, map product/location names to existing ids using the base scraper helpers (see `BaseScraper` and `jiji_scraper.py` for examples).

Env & runtime notes
- Infrastructure (DB + RabbitMQ): a `docker-compose.yml` at repo root is used for local infra. Use `docker-compose up` to bring up Postgres and RabbitMQ before running services.
- Important env vars used across services: `DATABASE_URL`, `RABBITMQ_URL`, `NODE_ENV`. Ensure these are set for workers and frontend.

Where to look for examples
- Websocket & custom server: `frontend/server.js` (global `io`, room `prices`, `subscribe_prices` event).
- DB helper & pool reuse: `frontend/lib/db.ts` (exported `query()` wrapper and `__pgPool` global pattern).
- Ingestion worker (queue consumer, validation, anomaly detection, insert SQL): `services/ingestion/src/index.ts`.
- Scraper example & mapping logic: `scrapers/scrapers/jiji_scraper.py` (search query mapping, `map_location()`, `determine_unit()`, price extraction).

Edit guidance for common tasks
- Adding an API route that emits updates: require the route to check `if (globalThis.io) globalThis.io.to('prices').emit(...)` and fall back to doing nothing or to storing a DB change if socket is absent.
- Adding DB code: prefer `frontend/lib/db.ts` style; maintain the pool global to avoid connection leaks in dev.
- Adding a new scraper: follow `BaseScraper` conventions, produce the same message schema, and test by posting to RabbitMQ (or run the scraper locally with an env pointing to a test queue).

Style & tests
- There are limited automated tests present. When changing cross-service contracts (message schema, DB columns, queue names), update the other components accordingly and include a short manual test plan in the PR description.

If something is unclear
- Ask for the missing detail and mention which file(s) you inspected (link them). Example: "I inspected `frontend/server.js` and `services/ingestion/src/index.ts` and need clarification on the message envelope." 

Feedback
- If this guidance misses a frequently edited area you work on, tell me which files to add and I'll expand examples.
