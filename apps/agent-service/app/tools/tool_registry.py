from typing import Callable

# Shared tools
from .current_time_tool import get_current_time_tool, execute_get_current_time
from .web_search_tool import search_web_tool, execute_search_web
from .save_note_tool import save_note_tool, execute_save_note
from .http_request_tool import http_request_tool, execute_http_request
from .website_analyzer_tool import website_analyzer_tool, execute_analyze_website

# Ecommerce domain tools
from .ecommerce.product_search_tool import product_search_tool, execute_product_search
from .ecommerce.order_status_tool import order_status_tool, execute_order_status
from .ecommerce.check_price_tool import check_price_tool, execute_check_price

# Education domain tools
from .education.course_search_tool import course_search_tool, execute_course_search
from .education.course_info_tool import course_info_tool, execute_course_info
from .education.save_progress_tool import save_progress_tool, execute_save_progress

# Tourism domain tools
from .tourism.hotel_search_tool import hotel_search_tool, execute_hotel_search
from .tourism.itinerary_tool import itinerary_tool, execute_itinerary
from .tourism.get_weather_tool import get_weather_tool, execute_get_weather

# ---------------------------------------------------------------------------
# Shared — available to every domain
# ---------------------------------------------------------------------------

_SHARED_REGISTRY: dict[str, Callable] = {
    "get_current_time":  execute_get_current_time,
    "search_web":        execute_search_web,
    "save_note":         execute_save_note,
    "http_request":      execute_http_request,
    "analyze_website":   execute_analyze_website,
}

_SHARED_TOOLS: list[dict] = [
    get_current_time_tool(),
    search_web_tool(),
    save_note_tool(),
    http_request_tool(),
    website_analyzer_tool(),
]

# ---------------------------------------------------------------------------
# Domain-specific
# ---------------------------------------------------------------------------

_DOMAIN_REGISTRY: dict[str, dict[str, Callable]] = {
    "ecommerce": {
        "product_search": execute_product_search,
        "order_status":   execute_order_status,
        "check_price":    execute_check_price,
    },
    "education": {
        "course_search":  execute_course_search,
        "course_info":    execute_course_info,
        "save_progress":  execute_save_progress,
    },
    "tourism": {
        "hotel_search":   execute_hotel_search,
        "itinerary_plan": execute_itinerary,
        "get_weather":    execute_get_weather,
    },
    "general": {},
}

_DOMAIN_TOOLS: dict[str, list[dict]] = {
    "ecommerce": [product_search_tool(), order_status_tool(), check_price_tool()],
    "education": [course_search_tool(), course_info_tool(), save_progress_tool()],
    "tourism":   [hotel_search_tool(), itinerary_tool(), get_weather_tool()],
    "general":   [],
}

# ---------------------------------------------------------------------------
# Public API — used by Alina and tool_execution_service
# ---------------------------------------------------------------------------

def get_tool_registry(domain: str | None = None) -> dict[str, Callable]:
    """
    Returns execute functions for a given domain + shared tools.

    Args:
        domain: "ecommerce" | "education" | "tourism" | "general" | None
                None = all tools (used for testing and fallback)
    """
    if domain is None:
        all_tools = dict(_SHARED_REGISTRY)
        for d in _DOMAIN_REGISTRY.values():
            all_tools.update(d)
        return all_tools
    return {**_SHARED_REGISTRY, **_DOMAIN_REGISTRY.get(domain, {})}


def get_available_tools(domain: str | None = None) -> list[dict]:
    """
    Returns tool metadata list for the LLM.

    Args:
        domain: same as get_tool_registry()
    """
    if domain is None:
        all_meta = list(_SHARED_TOOLS)
        for d in _DOMAIN_TOOLS.values():
            all_meta.extend(d)
        return all_meta
    return _SHARED_TOOLS + _DOMAIN_TOOLS.get(domain, [])


# ---------------------------------------------------------------------------
# Legacy exports — keeps existing imports working
# ---------------------------------------------------------------------------

TOOL_REGISTRY: dict[str, Callable] = get_tool_registry()
AVAILABLE_TOOLS: list[dict] = get_available_tools()
