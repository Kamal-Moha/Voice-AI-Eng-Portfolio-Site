# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page portfolio site for Kamal Muhamed Ahmed (Voice AI Engineer). It is
**fully static** — hand-written HTML/CSS/vanilla JS, no framework, no build step,
no package manager, and no tests. All site content lives in `public/` and is served
verbatim by nginx.

## Architecture

- `public/index.html` — the entire page. All content (hero, stats, projects, about,
  capabilities, tech stack, contact) is authored inline here. Projects are static
  `<article class="project">` blocks; there is no data file or templating — edit the
  markup directly to add/change a project.
- `public/js/main.js` — one IIFE handling all interactivity: scroll-reveal
  (IntersectionObserver), animated stat counters, mobile nav, and **inline YouTube
  embeds**. Demo videos play in-card via `.js-video` elements carrying a `data-yt`
  video ID; clicking injects an `<iframe>` into the card's `.project__media`.
- `public/css/styles.css` — all styling.
- `nginx/default.conf.template` — server config. `${PORT}` is **not** hardcoded; the
  official nginx image runs `envsubst` over `/etc/nginx/templates/` at container
  startup, substituting the `PORT` env var (Cloud Run sets it, default 8080). Serves
  a SPA-style fallback to `index.html`, aggressive static-asset caching, and a
  `GET /healthz` → `200 ok` endpoint.
- `Dockerfile` — `nginx:1.27-alpine`; copies `public/` to the web root and the nginx
  template into `/etc/nginx/templates/`.

### Cache-busting
`index.html` references assets with manual version query strings (`styles.css?v=2`,
`main.js?v=2`). Because nginx caches these files for 30 days with `immutable`, **bump
the `?v=` number in `index.html` whenever you change `styles.css` or `main.js`** or
returning visitors won't see the update.

## Deployment

Push to `main` triggers `.github/workflows/deployment.yml`, which authenticates to
Google Cloud via Workload Identity Federation, builds the Docker image, pushes it to
Artifact Registry (repo `portfolio-site`, region `us-east1`), and deploys to Cloud
Run service `portfolio-site` on port 8080. Required GitHub secrets: `GCP_WIF_PROVIDER`,
`GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`.

## Common commands

```bash
# Preview locally without Docker
cd public && python -m http.server 8080      # http://localhost:8080

# Run the real (nginx) container locally
docker build -t voiceai-portfolio .
docker run --rm -p 8080:8080 voiceai-portfolio
docker run --rm -e PORT=9000 -p 9000:9000 voiceai-portfolio   # PORT is honored
```

Note: `mailto:`/social links in the contact section and some hero tool chips are the
live values; several alternatives (Loom intro, GitHub link, Upwork) are intentionally
commented out in `index.html` rather than deleted.
