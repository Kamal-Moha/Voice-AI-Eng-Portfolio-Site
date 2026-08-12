# DaLab AI — Token Server (FastAPI)

Mints short-lived LiveKit access tokens for the in-browser React voice widget and
dispatches the `web-agent` into each visitor's room. Implements the LiveKit
[standard token endpoint](https://docs.livekit.io/frontends/build/authentication/endpoint/)
schema, so the frontend can use `TokenSource.endpoint(...)`.

## Why this exists

`web-agent` is a **named** agent — it only joins rooms that explicitly request it.
This server puts that dispatch instruction into the signed token, server-side, so
the browser can never tamper with it and the agent reliably joins.

## Run locally

1. Create your secrets file:
   ```bash
   cp .env.example .env
   ```
   Fill in `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` from
   **LiveKit Cloud → Project → Settings → Keys**. `LIVEKIT_URL` and `AGENT_NAME`
   are already correct for this project.

2. Start the server:
   ```bash
   uv run uvicorn main:app --reload --port 8000
   ```

3. Smoke-test the endpoint:
   ```bash
   curl -s -X POST http://localhost:8000/getToken -H 'Content-Type: application/json' -d '{}' | head -c 300
   # -> {"server_url":"wss://dalab-ai-rkv31z2w.livekit.cloud","participant_token":"eyJ..."}
   ```

`GET /healthz` returns `{"status":"ok"}` for uptime checks.

## Endpoint

`POST /getToken` — body fields are all optional (see `TokenRequest` in `main.py`).
Returns `201` with `{ server_url, participant_token }`.

## Deploy (production)

Containerize and run on Cloud Run (same project as the site) or any host. Set the
env vars as secrets, and set `ALLOWED_ORIGINS=https://www.dalabai.com` (plus any
other production origins). Point the widget's `VITE_TOKEN_ENDPOINT` at the public
URL. See the root deployment notes before promoting.
