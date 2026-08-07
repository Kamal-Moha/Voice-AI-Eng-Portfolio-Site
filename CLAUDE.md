# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo for Kamal Muhamed Ahmed's (Voice AI Engineer) portfolio. It has **two
independently deployable components**:

- **`website/`** — a single-page portfolio site. **Fully static** hand-written
  HTML/CSS/vanilla JS, no framework, no build step, no package manager, and no tests.
  Content lives in `website/public/` and is served verbatim by nginx.
- **`livekit-voice-agent/`** — a Python ([LiveKit Agents](https://docs.livekit.io/agents/))
  voice agent that powers the in-browser voice widget embedded on the site. It runs on
  LiveKit Cloud, not Cloud Run.

The two deploy via separate GitHub Actions workflows, each path-filtered so a push only
redeploys the component whose files changed (see **Deployment**).

## Architecture

### `website/` (the static site)

- `website/public/index.html` — the entire page. All content (hero, stats, projects,
  about, capabilities, tech stack, contact) is authored inline here, plus the embedded
  LiveKit voice widget. Projects are static `<article class="project">` blocks; there is
  no data file or templating — edit the markup directly to add/change a project.
- `website/public/js/main.js` — one IIFE handling all interactivity: scroll-reveal
  (IntersectionObserver), animated stat counters, mobile nav, and **inline YouTube
  embeds**. Demo videos play in-card via `.js-video` elements carrying a `data-yt`
  video ID; clicking injects an `<iframe>` into the card's `.project__media`.
- `website/public/css/styles.css` — all styling.
- `website/public/favicon.svg` — site icon.
- `website/nginx/default.conf.template` — server config. `${PORT}` is **not** hardcoded;
  the official nginx image runs `envsubst` over `/etc/nginx/templates/` at container
  startup, substituting the `PORT` env var (Cloud Run sets it, default 8080). Serves an
  SPA-style fallback to `index.html`, aggressive static-asset caching (30d `immutable`),
  gzip, security headers, and a `GET /healthz` → `200 ok` endpoint.
- `website/Dockerfile` — `nginx:1.27-alpine`; copies `public/` to the web root and the
  nginx template into `/etc/nginx/templates/`.

#### Cache-busting
`index.html` references assets with manual version query strings (`styles.css?v=4`,
`main.js?v=4`). Because nginx caches these files for 30 days with `immutable`, **bump
the `?v=` number in `website/public/index.html` whenever you change `styles.css` or
`main.js`** or returning visitors won't see the update.

### `livekit-voice-agent/` (the voice agent)

- `livekit-voice-agent/agent.py` — the agent entrypoint. Defines an `AgentServer` with a
  single `@server.rtc_session(agent_name="web-agent")` handler. Uses an AWS realtime model
  (`aws.realtime.RealtimeModel`, voice `tiffany`) with ai-coustics audio enhancement /
  noise cancellation, and records each call (egress) as OGG to the S3 bucket
  `dalab-ai-website-agent-recordings` (region `eu-north-1`).
- `livekit-voice-agent/prompts/instructions.yaml` — the agent's system prompt, loaded via
  `utils.load_prompt` (`utils.py`).
- `livekit-voice-agent/livekit.toml` — LiveKit Cloud config (subdomain + agent id). This
  file is **generated** by the "Create livekit-voice-agent" workflow and committed via PR;
  don't hand-edit it.
- Python `>=3.12`, managed with **uv** (`pyproject.toml` + `uv.lock`). Key deps:
  `livekit-agents[aws,google,mcp]~=1.5`, ai-coustics / noise-cancellation plugins,
  `pydantic-ai`, `boto3`, `inngest`.
- `livekit-voice-agent/Dockerfile` — container image for the agent.

## Deployment

Everything deploys on push to `main` via `.github/workflows/`. Each workflow is
**path-filtered**, so a commit only redeploys the component it touched. (If a push changes
files outside every filter, or changes only excluded files like `*.md`, **no** workflow
runs — this is expected.)

- **`site-deployment.yml`** ("Build and Deploy the website server to Cloud Run") —
  triggers on push to `main` under `website/**` (excluding `**/*.md`) or on changes to the
  workflow itself. Authenticates to Google Cloud via Workload Identity Federation, builds
  the Docker image from `website/`, pushes it to Artifact Registry (repo `portfolio-site`,
  region `us-east1`, image `cicd-app-img`), and deploys to Cloud Run service
  `portfolio-site` on port 8080. Required GitHub secrets: `GCP_WIF_PROVIDER`,
  `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`.
- **`livekit-agent-deploy-automated.yml`** ("Deploy livekit-voice-agent on changes") —
  triggers on push to `main` under `livekit-voice-agent/**` (excluding `livekit.toml` and
  `*.md`). Runs `livekit/deploy-action@v2.12.2` with `OPERATION: deploy` to redeploy the
  agent on LiveKit Cloud. Uses a `concurrency` group (cancel-in-progress) and the
  `livekit-voice-agent` environment. Required secrets: `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
  `LIVEKIT_API_SECRET`, `SECRET_LIST`.
- **`livekit-agent-create.yml`** ("Create livekit-voice-agent") — **manual only**
  (`workflow_dispatch`). Creates a new LiveKit Cloud agent, opens a PR adding the generated
  `livekit.toml`, then blocks until the agent reaches the `Running` state. Required secrets:
  `LIVEKIT_*` (as above) plus `GH_TOKEN` (to open the PR).

## Common commands

```bash
# --- website ---
# Preview locally without Docker
cd website/public && python -m http.server 8080      # http://localhost:8080

# Run the real (nginx) container locally
cd website
docker build -t voiceai-portfolio .
docker run --rm -p 8080:8080 voiceai-portfolio
docker run --rm -e PORT=9000 -p 9000:9000 voiceai-portfolio   # PORT is honored

# --- livekit voice agent ---
cd livekit-voice-agent
uv sync                        # install deps from uv.lock
uv run python agent.py dev     # run the agent locally (needs LIVEKIT_* + AWS env vars)
```

Note: `mailto:`/social links in the contact section and some hero tool chips are the
live values; several alternatives (Loom intro, GitHub link, Upwork) are intentionally
commented out in `website/public/index.html` rather than deleted.
