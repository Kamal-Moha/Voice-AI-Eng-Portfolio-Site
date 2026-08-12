"""
DaLab AI — LiveKit token server (FastAPI)
=========================================

Mints short-lived JWT access tokens so the in-browser React voice widget can
connect to the LiveKit Cloud room and have the `web-agent` dispatched into it.

Implements the LiveKit *standard token endpoint* schema, so it works with the
`TokenSource.endpoint(...)` client SDK abstraction out of the box:

  POST /getToken
    body (all optional): room_name, participant_identity, participant_name,
                         participant_metadata, participant_attributes, room_config
    -> 201 { "server_url": "...", "participant_token": "..." }

Agent dispatch is done SERVER-SIDE: the token always carries a RoomConfiguration
that dispatches AGENT_NAME (default "web-agent"). `web-agent` is a *named* agent,
which means it only joins rooms that explicitly request it — so this dispatch is
required, the agent will not auto-join otherwise.

Secrets are read from the environment (see .env.example). Never commit real keys.
"""

from __future__ import annotations

import os
import uuid
from datetime import timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from livekit import api

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
AGENT_NAME = os.getenv("AGENT_NAME", "web-agent")

# Comma-separated list of allowed browser origins. Defaults to the local dev
# origins (static site on :8080, Vite dev server on :5173).
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if o.strip()
]

# Token time-to-live. The widget only needs enough time to establish the
# connection; the session itself lives on after the token is consumed.
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", "900"))  # 15 minutes

app = FastAPI(title="DaLab AI Token Server", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


class TokenRequest(BaseModel):
    room_name: str | None = None
    participant_identity: str | None = None
    participant_name: str | None = None
    participant_metadata: str | None = None
    participant_attributes: dict[str, str] | None = None
    # Present when the client SDK packages its own dispatch info; we ignore it
    # in favor of server-side dispatch below, but accept it so requests validate.
    room_config: dict | None = None


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/getToken", status_code=201)
async def get_token(req: TokenRequest) -> dict[str, str]:
    if not (LIVEKIT_URL and LIVEKIT_API_KEY and LIVEKIT_API_SECRET):
        # Misconfiguration — fail loud rather than issuing a broken token.
        raise HTTPException(status_code=500, detail="Token server is not configured")

    room_name = req.room_name or f"dalab-web-{uuid.uuid4().hex[:12]}"
    identity = req.participant_identity or f"visitor-{uuid.uuid4().hex[:8]}"
    display_name = req.participant_name or "Website Visitor"

    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(display_name)
        .with_ttl(timedelta(seconds=TOKEN_TTL_SECONDS))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        # Server-side, authoritative dispatch of the named voice agent.
        .with_room_config(
            api.RoomConfiguration(
                agents=[api.RoomAgentDispatch(agent_name=AGENT_NAME)]
            )
        )
    )

    if req.participant_metadata:
        token = token.with_metadata(req.participant_metadata)
    if req.participant_attributes:
        token = token.with_attributes(req.participant_attributes)

    return {
        "server_url": LIVEKIT_URL,
        "participant_token": token.to_jwt(),
    }


# if __name__ == "__main__":
#     import uvicorn

#     uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
