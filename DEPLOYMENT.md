# ActiTrace — Deployment Guide

Three supported deployment paths:

1. **Docker Compose** on a single VM or local machine — recommended, one command up.
2. **Render + Vercel** — managed hosting, free tier friendly.
3. **Railway / Fly.io** — pick up the same `docker-compose.yml` / Dockerfiles.

```
┌────────────────┐      /api proxy       ┌────────────────┐        ┌───────────┐
│ frontend       │ ────────────────────▶ │ backend        │ ─────▶ │ Postgres  │
│ Vite + nginx   │                       │ FastAPI · JWT  │        │ (or SQLite)│
│ :3000          │                       │ :8000          │        └───────────┘
└────────────────┘                       └────────┬───────┘
                                                  │ HTTPS
                                                  ▼
                                           Groq API (LLM)
```

---

## 0. Prerequisites

- Docker 24+ and Docker Compose v2 (bundled with Docker Desktop and modern Linux packages)
- Repo cloned locally, with the model artifact committed at
  `backend/app/models/store/v1.1.joblib` (the 95.5% logistic-regression model).
  `backend/.gitignore` excludes `*.joblib` by default — force-add the artifact once:
  ```bash
  git add -f backend/app/models/store/v1.1.joblib
  git commit -m "ship v1.1 model artifact"
  ```
- A Groq API key from https://console.groq.com (free tier is fine) if you want
  the "Health insights" card on the report page. The backend boots fine without
  one; the insights card will just show an error.

---

## 1. Docker Compose (single VM or laptop)

### 1.1 Environment

Create a `.env` file next to `docker-compose.yml`:

```bash
cat > .env <<EOF
JWT_SECRET=$(openssl rand -hex 32)
GROQ_API_KEY=gsk_your_key_here
CORS_ORIGINS=http://localhost:3000
EOF
```

For a public deployment, set `CORS_ORIGINS` to the browser-facing URL, e.g.
`https://actitrace.example.com`. Multiple origins can be comma-separated.

### 1.2 Boot

```bash
docker compose up -d --build
```

What starts:

| Service  | Port  | Notes                                                            |
|----------|-------|------------------------------------------------------------------|
| postgres | 5432  | Volume `pgdata` — survives restarts; wipe with `down -v`.        |
| backend  | 8000  | FastAPI, auto-creates tables, registers artifacts on first boot. |
| frontend | 3000  | nginx static + `/api/*` proxy to `backend:8000`.                 |

On first boot, `sync_filesystem_to_db` scans
`backend/app/models/store/*.joblib`, registers any unknown versions, and
activates the **highest-accuracy** one (v1.1 → 95.5%). Subsequent boots are
idempotent.

### 1.3 First account

The very first signup becomes the admin (only admins can train/activate models):

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"strong-password"}'
```

Open http://localhost:3000, sign in, upload a session CSV (use
`UCI HAR Dataset/test/X_test.txt` + `y_test.txt` to see the ground-truth
comparison).

### 1.4 Operational commands

```bash
docker compose logs -f backend         # tail
docker compose logs -f                 # all services
docker compose ps                      # status
docker compose restart backend         # restart one service
docker compose down                    # stop everything
docker compose down -v                 # stop + wipe Postgres volume
docker compose pull && docker compose up -d --build   # pull base images, rebuild
```

### 1.5 HTTPS / public hosting

The compose file only exposes HTTP. For a public deploy put a TLS terminator in
front of port 3000:

**Cloudflare Tunnel** (no certs, free):
```bash
cloudflared tunnel --url http://localhost:3000
```

**Caddy** (auto Let's Encrypt):
```caddyfile
actitrace.example.com {
    reverse_proxy localhost:3000
}
```

**Nginx + Certbot**: standard `proxy_pass http://127.0.0.1:3000;` block.

Remember to set `CORS_ORIGINS=https://actitrace.example.com` in `.env` and
`docker compose up -d --build` to re-deploy.

---

## 2. Environment variables (reference)

All backend vars are read by `backend/app/config.py` via pydantic-settings.

| Variable           | Default                                      | Purpose                                           |
|--------------------|----------------------------------------------|---------------------------------------------------|
| `DATABASE_URL`     | `sqlite:///./actitrace.db`                   | Any SQLAlchemy URL. Postgres in compose.          |
| `JWT_SECRET`       | `change-me-in-production`                    | **Rotate for any real deploy.** 32+ random bytes. |
| `JWT_ALGORITHM`    | `HS256`                                      | Usually leave alone.                              |
| `JWT_EXPIRE_MINUTES` | `1440` (24h)                               | Session length.                                   |
| `CORS_ORIGINS`     | `http://localhost:3000,http://localhost:5173`| Comma-separated origins allowed to hit the API.   |
| `GROQ_API_KEY`     | (dev default in code)                        | Set this in prod. Leave empty to disable insights.|
| `GROQ_MODEL`       | `llama-3.3-70b-versatile`                    | Any Groq-supported chat model.                    |
| `GROQ_BASE_URL`    | `https://api.groq.com/openai/v1`             | Override for alternative OpenAI-compatible hosts. |
| `MODEL_STORE_DIR`  | `backend/app/models/store`                   | Where `.joblib` artifacts live.                   |
| `DATASET_PATH`     | `./UCI HAR Dataset`                          | Needed only for the in-app training endpoint.     |

The frontend needs no runtime env — all API calls go through relative `/api/*`
and nginx proxies them.

---

## 3. Render + Vercel (managed, free tier)

```
Vercel (static frontend)  →  Render (FastAPI)  →  Render Postgres
      /api rewrite                  SQLAlchemy
```

### 3.1 Postgres on Render

1. Render → **New → PostgreSQL** → plan **Free**.
2. Copy the **Internal Database URL**, convert to the SQLAlchemy form:
   ```
   postgresql+psycopg2://user:pass@dpg-xxxxx-a/actitrace
   ```

### 3.2 Backend on Render

1. **New → Web Service** → connect the GitHub repo.
2. Settings:
   | Field           | Value                                                  |
   |-----------------|--------------------------------------------------------|
   | Root directory  | `backend`                                              |
   | Runtime         | Python 3.12                                            |
   | Build command   | `pip install -r requirements.txt`                      |
   | Start command   | `uvicorn app.main:app --host 0.0.0.0 --port $PORT`     |
   | Plan            | Free (or Starter for no cold-starts)                   |
3. Environment variables:
   | Key               | Value                                    |
   |-------------------|------------------------------------------|
   | `DATABASE_URL`    | the Render Postgres SQLAlchemy URL       |
   | `JWT_SECRET`      | `openssl rand -hex 32`                   |
   | `CORS_ORIGINS`    | `https://<your-app>.vercel.app`          |
   | `GROQ_API_KEY`    | your Groq key                            |
   | `PYTHON_VERSION`  | `3.12.6`                                 |
4. Deploy. Tables auto-create; v1.1 artifact auto-registers and activates.

Verify:
```bash
curl https://<your-render-app>.onrender.com/health
# {"status":"ok"}
```

> Free-tier Render services sleep after 15 min idle. First request wakes
> them (~30 s). Artifact loads lazily on the first inference (~1 s extra).

### 3.3 Frontend on Vercel

1. **Add New → Project** → import the repo.
2. Settings: Root directory `frontend`, framework **Vite** (auto-detected).
3. Commit `frontend/vercel.json` so `/api/*` rewrites to Render:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://<your-render-app>.onrender.com/:path*" },
       { "source": "/(.*)",       "destination": "/index.html" }
     ]
   }
   ```
4. Deploy. Copy the Vercel URL, set it as `CORS_ORIGINS` on Render, redeploy
   the backend.

### 3.4 Smoke test

```bash
APP=https://<your-vercel-app>.vercel.app
curl -X POST $APP/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"strong-password"}'
```

---

## 4. Railway (one-click-ish)

Railway picks up the `docker-compose.yml` directly:

1. Railway → **New Project → Deploy from GitHub Repo**.
2. It provisions Postgres automatically and exposes both services.
3. Set env vars on the backend service (`JWT_SECRET`, `GROQ_API_KEY`,
   `CORS_ORIGINS` pointing to the frontend Railway URL).
4. Set `DATABASE_URL` to Railway's Postgres connection string (SQLAlchemy form).

## 5. Fly.io

Per-service `fly launch` from each Dockerfile:

```bash
cd backend && fly launch        # answer prompts, skip Postgres — use fly pg create
fly pg create --name actitrace-db
fly pg attach actitrace-db      # sets DATABASE_URL
fly secrets set JWT_SECRET=$(openssl rand -hex 32) GROQ_API_KEY=gsk_...
fly deploy

cd ../frontend && fly launch    # static site
```

Update `frontend/nginx.conf` so `proxy_pass` points at the backend's Fly URL,
or use a small rewrite config.

---

## 6. Models & retraining in production

- **Artifacts** live under `backend/app/models/store/*.joblib`. In compose
  they're mounted from the host so new `.joblib` files written by
  `/model/train` survive container restarts.
- **Activation rule on empty DB**: highest-accuracy artifact wins (see
  `sync_filesystem_to_db`). With multiple versions already registered, the
  active one stays as-is — admins flip via the Models page.
- **Retraining from the UI** hits `/model/train`, which reads
  `UCI HAR Dataset/` from `DATASET_PATH`. The compose file mounts it read-only
  into the container. On Render/Vercel the dataset must be in the repo (~60 MB)
  or fetched at startup; if you don't plan to retrain in-app, delete the
  `/model/train` router call from the Models page to avoid confusion.
- **Ship a new model as a deploy** (safest for managed hosts):
  ```bash
  python ml/train.py --version v1.2 --out backend/app/models/store
  git add -f backend/app/models/store/v1.2.joblib
  git commit -m "train v1.2"
  git push                       # Render/Vercel auto-deploy
  ```
  The backend registers v1.2 on boot. If the DB already has versions, v1.2
  arrives **inactive** — an admin activates it via Models → Activate.

---

## 7. Data flow recap

1. User uploads a CSV (optionally with a paired `y_test.txt` labels file).
2. Backend stores the session, runs `run_inference` → persists per-window
   predictions and a summary dict.
3. Report page pulls session detail + calls `/sessions/:id/insights`, which
   builds a prompt from the summary and calls Groq for the health insights
   card.
4. Ground-truth comparison is only populated if the upload included an
   `activity`/`label` column inside the CSV, or a paired labels file via the
   "Ground truth" input on the upload form.

---

## 8. Security & ops checklist

- [ ] `JWT_SECRET` rotated from the default and stored outside the repo.
- [ ] `GROQ_API_KEY` set via env (not the hard-coded dev default in `config.py`).
- [ ] `CORS_ORIGINS` matches the production origin exactly (no wildcard).
- [ ] First signup done so further signups aren't inadvertently granted admin
      (first-account-is-admin is by design).
- [ ] HTTPS terminator in front of port 3000 for any public deploy.
- [ ] Postgres volume (`pgdata`) backed up if sessions/users matter
      (`docker compose exec postgres pg_dump -U actitrace actitrace > backup.sql`).
- [ ] `.env` added to `.gitignore` (already is, verify before committing).
- [ ] Render/Vercel env vars configured; `CORS_ORIGINS` updated after the
      frontend URL is known.

---

## 9. Troubleshooting

| Symptom                                                  | Cause / Fix                                                                                       |
|----------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| `Inference failed: [Errno 2] No such file or directory: '.../v1.X.joblib'` | DB row has a relative `artifact_path`. Update to absolute path in Postgres (`UPDATE model_versions SET artifact_path=...`). |
| Insights card shows `Groq API error 403: error code: 1010` | Cloudflare blocks default Python UA. Already fixed in `services/insights.py`; rebuild the backend. |
| Insights card shows `GROQ_API_KEY is not configured`     | `GROQ_API_KEY` env var missing. Set in `.env`, `docker compose up -d --build`.                   |
| Report shows `Match vs ground truth: —`                  | CSV didn't include an `activity`/`label` column and no labels file was attached on upload.       |
| Accuracy much lower than expected on UCI test file       | Confirm you're on v1.1 (Models tab should show 95.5% as active). If v1.0 is active, click Activate on v1.1. |
| Frontend loads but /api/* 502s                           | Backend container isn't healthy yet. `docker compose logs backend` — most likely DB not up or `DATABASE_URL` wrong. |
| Free-tier Render: first request ~30 s                    | Cold start. Upgrade to Starter or ping `/health` from a cron every 10 min.                        |

---

## 10. Quick reference — one-liner redeploy

```bash
git pull && docker compose up -d --build
```

For managed hosts, `git push` to the tracked branch triggers auto-deploy on
both Render and Vercel.
