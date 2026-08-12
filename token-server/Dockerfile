# ============================================================
#  DaLab AI — LiveKit token server (FastAPI), for Cloud Run.
#  Mints short-lived JWTs so the in-browser voice widget can
#  join a LiveKit room with the `web-agent` dispatched into it.
# ============================================================
FROM python:3.12-slim

LABEL org.opencontainers.image.title="DaLab AI Token Server" \
      org.opencontainers.image.authors="Kamal Muhamed Ahmed"

# uv provides fast, reproducible installs straight from the committed uv.lock.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Install dependencies first (better layer caching) — no dev deps in the image.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Then the application code.
COPY main.py ./

# Cloud Run injects PORT (defaults to 8080); provide a local default too.
ENV PORT=8080
EXPOSE 8080

# Shell form so ${PORT} is expanded at runtime. uvicorn binds all interfaces.
CMD uv run uvicorn main:app --host 0.0.0.0 --port ${PORT}
