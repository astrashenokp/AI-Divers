"""
industry_presets.py — Builder presets for domain-based agent creation.

This file is intentionally configuration-focused.
It does not execute tools and it does not enforce runtime rules.

Purpose:
- give the frontend a stable source of domain presets
- keep onboarding labels/use cases/defaults aligned with the real runtime
- avoid duplicating domain metadata across multiple files
"""

from copy import deepcopy

from .tool_guardrails import (
    DOMAIN_MAX_STEPS,
    REQUIRES_HUMAN_CONFIRMATION,
    VALID_DOMAINS,
)
from .tool_registry import get_available_tools


_PRESET_ORDER = ("ecommerce", "education", "tourism", "general")


INDUSTRY_PRESETS: dict[str, dict] = {
    "ecommerce": {
        "id": "ecommerce",
        "label": "E-commerce",
        "icon": "shopping-cart",
        "description": (
            "For online stores, customer requests, order tracking, "
            "product search, and sales support."
        ),
        "assistant_role": "AI assistant for an online store",
        "main_goal_hint": (
            "Help customers find products, answer order questions, "
            "and support purchase-related workflows."
        ),
        "system_prompt_hint": (
            "You are a helpful e-commerce assistant. "
            "Answer only in Ukrainian. Help with products, prices, "
            "orders, and customer support requests."
        ),
        "use_cases": [
            {
                "id": "customer_support",
                "label": "Customer Support",
                "description": "Answer common support questions and route customers quickly.",
            },
            {
                "id": "order_tracking",
                "label": "Order Tracking",
                "description": "Help users check order status and delivery information.",
            },
            {
                "id": "product_recommendation",
                "label": "Product Recommendation",
                "description": "Suggest products, compare options, and explain pricing.",
            },
        ],
        "default_enabled_tools": [
            "product_search",
            "order_status",
            "check_price",
            "search_web",
        ],
        "optional_tools": [
            "get_current_time",
            "save_note",
            "http_request",
        ],
    },
    "education": {
        "id": "education",
        "label": "Education",
        "icon": "graduation-cap",
        "description": (
            "For learning assistants, course discovery, student progress, "
            "and educational support."
        ),
        "assistant_role": "AI educational assistant",
        "main_goal_hint": (
            "Help users discover courses, understand learning paths, "
            "and support progress in study workflows."
        ),
        "system_prompt_hint": (
            "You are an educational assistant. "
            "Answer only in Ukrainian. Help users find courses, "
            "understand course details, and support learning progress."
        ),
        "use_cases": [
            {
                "id": "learning_support",
                "label": "Learning Support",
                "description": "Guide users through study tasks and learning questions.",
            },
            {
                "id": "course_info",
                "label": "Course Information",
                "description": "Help users compare and understand available courses.",
            },
            {
                "id": "skill_development",
                "label": "Skill Development",
                "description": "Support growth plans and structured learning journeys.",
            },
        ],
        "default_enabled_tools": [
            "course_search",
            "course_info",
            "search_web",
        ],
        "optional_tools": [
            "save_progress",
            "get_current_time",
            "save_note",
            "http_request",
        ],
    },
    "tourism": {
        "id": "tourism",
        "label": "Tourism",
        "icon": "map",
        "description": (
            "For travel planning, hotel discovery, itineraries, "
            "destination research, and weather support."
        ),
        "assistant_role": "AI travel assistant",
        "main_goal_hint": (
            "Help users plan trips, compare stays, understand destinations, "
            "and prepare for travel."
        ),
        "system_prompt_hint": (
            "You are a tourism assistant. "
            "Answer only in Ukrainian. Help with hotels, routes, "
            "trip planning, and travel-related questions."
        ),
        "use_cases": [
            {
                "id": "trip_planning",
                "label": "Trip Planning",
                "description": "Create travel plans and day-by-day itineraries.",
            },
            {
                "id": "destination_info",
                "label": "Destination Information",
                "description": "Explain what to visit and what to expect at a destination.",
            },
            {
                "id": "booking_support",
                "label": "Booking Support",
                "description": "Help compare accommodation and travel preparation options.",
            },
        ],
        "default_enabled_tools": [
            "hotel_search",
            "itinerary_plan",
            "get_weather",
        ],
        "optional_tools": [
            "search_web",
            "get_current_time",
            "save_note",
            "http_request",
        ],
    },
    "general": {
        "id": "general",
        "label": "General",
        "icon": "sparkles",
        "description": (
            "Fallback preset for broad assistant tasks that do not belong "
            "to a domain-specific workflow."
        ),
        "assistant_role": "General AI assistant",
        "main_goal_hint": (
            "Help users with broad questions while keeping the setup simple "
            "and safe for demos."
        ),
        "system_prompt_hint": (
            "You are a general AI assistant. "
            "Answer only in Ukrainian. Use tools carefully and prefer concise, "
            "helpful answers."
        ),
        "use_cases": [
            {
                "id": "general_help",
                "label": "General Help",
                "description": "Support broad tasks and simple agent demos.",
            },
            {
                "id": "research_assistant",
                "label": "Research Assistant",
                "description": "Answer questions that benefit from public information lookup.",
            },
            {
                "id": "workflow_helper",
                "label": "Workflow Helper",
                "description": "Provide lightweight support without a domain-specific flow.",
            },
        ],
        "default_enabled_tools": [
            "search_web",
            "get_current_time",
        ],
        "optional_tools": [
            "save_note",
            "http_request",
        ],
    },
}


def _human_confirmation_tools_for_domain(domain: str) -> list[str]:
    """Return tools in this preset that require explicit approval."""
    tool_names = {
        tool["name"]
        for tool in get_available_tools(domain=domain)
    }
    required = tool_names.intersection(REQUIRES_HUMAN_CONFIRMATION)
    return sorted(required)


def _with_runtime_defaults(domain: str, preset: dict) -> dict:
    """Attach runtime-aware defaults without mutating source config."""
    data = deepcopy(preset)
    data["max_steps"] = DOMAIN_MAX_STEPS.get(domain)
    data["valid_domain"] = domain in VALID_DOMAINS
    data["requires_human_confirmation_for_tools"] = _human_confirmation_tools_for_domain(domain)
    data["available_tool_names"] = sorted(
        tool["name"] for tool in get_available_tools(domain=domain)
    )
    return data


def get_industry_presets() -> list[dict]:
    """
    Returns all presets in a stable display order.

    Safe for:
    - builder UIs
    - onboarding flows
    - debug APIs
    """
    return [
        _with_runtime_defaults(domain, INDUSTRY_PRESETS[domain])
        for domain in _PRESET_ORDER
        if domain in INDUSTRY_PRESETS
    ]


def get_industry_preset(domain: str) -> dict | None:
    """Returns a single preset by domain, or None if missing."""
    preset = INDUSTRY_PRESETS.get(domain)
    if preset is None:
        return None
    return _with_runtime_defaults(domain, preset)


def get_default_builder_payload(domain: str) -> dict | None:
    """
    Returns a frontend-friendly starter payload for agent creation.

    This is intentionally simple and does not leak runtime internals.
    """
    preset = get_industry_preset(domain)
    if preset is None:
        return None

    return {
        "domain": preset["id"],
        "label": preset["label"],
        "assistant_role": preset["assistant_role"],
        "main_goal_hint": preset["main_goal_hint"],
        "system_prompt_hint": preset["system_prompt_hint"],
        "default_enabled_tools": list(preset["default_enabled_tools"]),
        "optional_tools": list(preset["optional_tools"]),
        "guardrails": {
            "max_steps": preset["max_steps"],
            "require_human_confirmation_for_tools": list(
                preset["requires_human_confirmation_for_tools"]
            ),
        },
        "use_cases": deepcopy(preset["use_cases"]),
    }
