from typing import Callable

from .current_time_tool import get_current_time_tool, execute_get_current_time
from .web_search_tool import search_web_tool, execute_search_web
from .save_note_tool import save_note_tool, execute_save_note
from .http_request_tool import http_request_tool, execute_http_request
from .education.course_search_tool import course_search_tool, execute_course_search
from .education.course_info_tool import course_info_tool, execute_course_info
from .education.save_progress_tool import save_progress_tool, execute_save_progress


# Used by execute_tool_call() to find the right function to run
TOOL_REGISTRY: dict[str, Callable] = {
    "get_current_time": execute_get_current_time,
    "search_web": execute_search_web,
    "save_note": execute_save_note,
    "http_request": execute_http_request,
    "course_search": execute_course_search,
    "course_info": execute_course_info,
    "save_progress": execute_save_progress,
}

# Used by Alina's agent to tell the LLM which tools exist
AVAILABLE_TOOLS: list[dict] = [
    get_current_time_tool(),
    search_web_tool(),
    save_note_tool(),
    http_request_tool(),
    course_search_tool(),
    course_info_tool(),
    save_progress_tool(),
]


def get_tool_registry() -> dict[str, Callable]:
    """Returns the full tool registry. Import this in tool_execution_service."""
    return TOOL_REGISTRY