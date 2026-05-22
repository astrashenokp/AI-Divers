from datetime import datetime, timezone
import zoneinfo

from .tool_schemas import GetCurrentTimeInput


def get_current_time_tool() -> dict:
    """Returns tool metadata for the agent / LLM."""
    return {
        "name": "get_current_time",
        "description": "Returns the current date and time. Use when the user asks what time or date it is.",
        "input_schema": GetCurrentTimeInput.model_json_schema(),
    }


async def execute_get_current_time(args: dict) -> str:
    """Executes the get_current_time tool."""
    validated = GetCurrentTimeInput(**args)

    try:
        tz = zoneinfo.ZoneInfo(validated.timezone)
        now = datetime.now(tz=tz)
    except zoneinfo.ZoneInfoNotFoundError:
        now = datetime.now(tz=timezone.utc)

    return now.isoformat()