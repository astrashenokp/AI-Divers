from typing import Any

from .http_request_tool import ToolGuardrailError
from .tool_schemas import DatabaseQueryInput


_APPROVED_QUERY_TEMPLATES: dict[str, dict[str, Any]] = {
    "get_order_by_id": {
        "description": "Gets a single order summary by order ID.",
        "allowed_domains": frozenset({"ecommerce"}),
        "required_params": ("order_id",),
        "default_max_rows": 1,
        "rows": [
            {"order_id": "ORD-12345", "status": "shipped", "total_amount": 2199, "currency": "UAH"},
            {"order_id": "ORD-77777", "status": "processing", "total_amount": 899, "currency": "UAH"},
        ],
        "filters": ("order_id",),
    },
    "get_course_by_id": {
        "description": "Gets course information by course ID.",
        "allowed_domains": frozenset({"education"}),
        "required_params": ("course_id",),
        "default_max_rows": 1,
        "rows": [
            {"course_id": "COURSE-101", "title": "Python для початківців", "level": "beginner", "duration_hours": 24},
            {"course_id": "COURSE-202", "title": "JavaScript Fundamentals", "level": "beginner", "duration_hours": 18},
        ],
        "filters": ("course_id",),
    },
    "get_user_progress": {
        "description": "Gets saved learning progress for a user in a course.",
        "allowed_domains": frozenset({"education"}),
        "required_params": ("user_id",),
        "default_max_rows": 10,
        "rows": [
            {"user_id": "user-123", "course_id": "COURSE-101", "lesson_id": "L5", "status": "completed"},
            {"user_id": "user-123", "course_id": "COURSE-101", "lesson_id": "L6", "status": "in_progress"},
            {"user_id": "user-456", "course_id": "COURSE-202", "lesson_id": "L1", "status": "completed"},
        ],
        "filters": ("user_id", "course_id"),
    },
    "get_hotels_by_city": {
        "description": "Gets a short list of hotels available in a city.",
        "allowed_domains": frozenset({"tourism"}),
        "required_params": ("city",),
        "default_max_rows": 5,
        "rows": [
            {"city": "Львів", "hotel_id": "HTL-001", "name": "Lviv City Hotel", "price_from": 3200, "currency": "UAH"},
            {"city": "Київ", "hotel_id": "HTL-002", "name": "Dnipro Riverside", "price_from": 4100, "currency": "UAH"},
            {"city": "Одеса", "hotel_id": "HTL-003", "name": "Black Sea Stay", "price_from": 3600, "currency": "UAH"},
        ],
        "filters": ("city",),
    },
}


def database_query_tool() -> dict:
    """Returns metadata for a safe, read-only database lookup tool."""
    return {
        "name": "database_query",
        "description": (
            "Runs an approved read-only internal data lookup by query template name. "
            "Use for structured internal records such as orders, courses, user progress, "
            "or hotel data. Do not provide raw SQL. Only approved query templates are allowed."
        ),
        "input_schema": DatabaseQueryInput.model_json_schema(),
    }


def _validate_template(query_name: str, domain: str | None) -> dict[str, Any]:
    template = _APPROVED_QUERY_TEMPLATES.get(query_name)
    if template is None:
        raise ToolGuardrailError(
            f"Query template '{query_name}' is not approved. "
            f"Approved templates: {sorted(_APPROVED_QUERY_TEMPLATES)}"
        )

    if domain is not None and domain not in template["allowed_domains"]:
        raise ToolGuardrailError(
            f"Query template '{query_name}' is not permitted in domain '{domain}'. "
            f"Allowed domains: {sorted(template['allowed_domains'])}"
        )

    return template


def _ensure_required_params(template: dict[str, Any], params: dict[str, Any]) -> None:
    missing = [name for name in template["required_params"] if name not in params]
    if missing:
        raise ToolGuardrailError(
            f"Missing required params for query '{params}': {missing}"
        )


def _filter_rows(template: dict[str, Any], params: dict[str, Any]) -> list[dict[str, Any]]:
    rows = template["rows"]
    filters = template.get("filters", ())
    result = []

    for row in rows:
        matches = True
        for field in filters:
            if field in params and str(row.get(field)) != str(params[field]):
                matches = False
                break
        if matches:
            result.append(row)

    return result


async def execute_database_query(args: dict) -> str:
    """
    Safe read-only database lookup executor.

    This MVP implementation uses approved in-memory templates instead of raw SQL.
    It keeps the runtime contract stable without exposing arbitrary database access.
    """
    validated = DatabaseQueryInput(**args)
    params = validated.params or {}
    domain = params.get("domain")

    template = _validate_template(validated.query_name, domain if isinstance(domain, str) else None)
    _ensure_required_params(template, params)

    max_rows = min(validated.max_rows, template["default_max_rows"])
    rows = _filter_rows(template, params)[:max_rows]

    lines = [
        f"Database query: {validated.query_name}",
        f"Connection: {validated.connection_id}",
        f"Rows returned: {len(rows)}",
        f"Description: {template['description']}",
    ]

    if rows:
        lines.append("")
        lines.append("Results:")
        for index, row in enumerate(rows, 1):
            fields = ", ".join(f"{key}={value}" for key, value in row.items())
            lines.append(f"{index}. {fields}")
    else:
        lines.append("")
        lines.append("No rows matched the provided parameters.")

    lines.append("")
    lines.append("Mode: approved read-only template executor (no raw SQL).")
    return "\n".join(lines)
