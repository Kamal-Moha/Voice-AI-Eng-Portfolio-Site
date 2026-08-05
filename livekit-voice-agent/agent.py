from dotenv import load_dotenv

from livekit import agents, api
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import (
    google,
    aws,
    ai_coustics,
    noise_cancellation
)
import os
from datetime import datetime
from utils import load_prompt

load_dotenv()

call_recording_bucket = "dalab-ai-website-agent-recordings"
agent_name = "web-agent"
class Assistant(Agent):
    def __init__(self, context_vars=None) -> None:
        instructions = load_prompt("instructions.yaml")

        if context_vars:
            instructions = instructions.format(**context_vars)

        super().__init__(instructions=instructions)

server = AgentServer()

@server.rtc_session(agent_name=agent_name)
async def my_agent(ctx: agents.JobContext):

    now = datetime.now()

    date_folder = now.strftime("%d-%m-%Y")
    time_filename = now.strftime("%H-%M-%S")

    filepath = (
        f"recordings/"
        f"{agent_name}/"
        f"{date_folder}/"
        f"{time_filename}.ogg"
    )

  # ------RECORDING THE CALL (EGRESS)-------

    # Set up recording
    req = api.RoomCompositeEgressRequest(
        room_name=ctx.room.name,
        layout="speaker",
        audio_only=True,
        file=api.EncodedFileOutput(
            filepath=filepath,
            s3=api.S3Upload(
                bucket=call_recording_bucket,
                region="eu-north-1",
                access_key=os.getenv("AWS_ACCESS_KEY_ID"),
                secret=os.getenv("AWS_SECRET_ACCESS_KEY"),
                force_path_style=True,
            ),
        ),
    )

    res = await ctx.api.egress.start_room_composite_egress(req)


    session = AgentSession(
        llm=aws.realtime.RealtimeModel(voice="tiffany")
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(model=ai_coustics.EnhancerModel.QUAIL_VF_S),
            ),
        ),
    )

    await session.generate_reply(
        instructions="Greet the user and offer your assistance. You should start by speaking in English."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)