# Voice AI Engineer Portfolio — Kamal Muhamed Ahmed

A fast, single-page portfolio showcasing production-ready Voice AI Agent projects.
Static site (HTML/CSS/JS) served by nginx, containerized for **Google Cloud Run**.

```
Portfolio/
├── public/                 # the static site (edit content here)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/main.js
│   └── favicon.svg
├── nginx/
│   └── default.conf.template   # nginx config; ${PORT} injected at runtime
├── Dockerfile
├── .dockerignore
└── README.md
```

---

## ✏️ Before you publish — fill in your details

Open `public/index.html` and replace the placeholders (search for `TODO`):

| Placeholder | Where | Replace with |
|---|---|---|
| `your-email@example.com` | Contact section "Email me" button | Your real email |
| LinkedIn `href="#"` | Contact socials | Your LinkedIn profile URL |
| Upwork `href="#"` | Contact socials | Your Upwork profile URL |

Your GitHub (`github.com/Kamal-Moha`) and Loom intro video are already wired in.

---

## 🖥️ Preview locally (no Docker)

Any static file server works. For example, with Python:

```bash
cd public
python -m http.server 8080
# open http://localhost:8080
```

---

## 🐳 Run with Docker locally

```bash
# from the Portfolio/ folder
docker build -t voiceai-portfolio .
docker run --rm -p 8080:8080 voiceai-portfolio
# open http://localhost:8080
```

The image respects the `PORT` env var, so this also works:

```bash
docker run --rm -e PORT=9000 -p 9000:9000 voiceai-portfolio
```

---

## ☁️ Deploy to Google Cloud Run

Prerequisites: a Google Cloud project with billing enabled and the `gcloud` CLI
installed and authenticated (`gcloud auth login`).

### Option A — Deploy straight from source (simplest)

Cloud Run builds the container for you from the `Dockerfile`:

```bash
# set these once
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

gcloud config set project "$PROJECT_ID"

# from the Portfolio/ folder
gcloud run deploy voiceai-portfolio \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080
```

When it finishes, `gcloud` prints a public HTTPS URL — that's your live portfolio.

### Option B — Build, push to Artifact Registry, then deploy

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export REPO="web"
export IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/voiceai-portfolio:latest"

# one-time: create an Artifact Registry repo
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker --location="$REGION" || true

# build & push with Cloud Build
gcloud builds submit --tag "$IMAGE"

# deploy
gcloud run deploy voiceai-portfolio \
  --image "$IMAGE" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080
```

---

## 🔗 Custom domain (optional)

After deploying, map your own domain:

```bash
gcloud run domain-mappings create \
  --service voiceai-portfolio \
  --domain portfolio.yourdomain.com \
  --region "$REGION"
```

Then add the DNS records Cloud Run gives you.

---

## Notes

- **Why nginx + `${PORT}`?** Cloud Run sends traffic to the port in the `PORT`
  env var (default `8080`). The official nginx image runs `envsubst` over files
  in `/etc/nginx/templates/` at startup, so `${PORT}` in `default.conf.template`
  becomes the right port automatically — locally and on Cloud Run.
- **Health check:** `GET /healthz` returns `200 ok`.
- The site is fully static — no build step, no runtime dependencies beyond nginx.
