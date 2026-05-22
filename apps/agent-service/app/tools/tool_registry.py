from typing import Callable

from .current_time_tool import get_current_time_tool, execute_get_current_time
from .web_search_tool import search_web_tool, execute_search_web
from .save_note_tool import save_note_tool, execute_save_note


# Used by execute_tool_call() to find the right function to run
TOOL_REGISTRY: dict[str, Callable] = {
    "get_current_time": execute_get_current_time,
    "search_web": execute_search_web,
    "save_note": execute_save_note,
}

# Used by Alina's agent to tell the LLM which tools exist
AVAILABLE_TOOLS: list[dict] = [
    get_current_time_tool(),
    search_web_tool(),
    save_note_tool(),
]


def get_tool_registry() -> dict[str, Callable]:
    """Returns the full tool registry. Import this in tool_execution_service."""
    return TOOL_REGISTRY