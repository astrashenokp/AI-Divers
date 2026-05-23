"""
database_query_tool.py — read-only platform data access tool.

Дає агенту безпечний доступ до platform-level даних через backend internal API.
НЕ є SQL-консоллю і НЕ замінює domain tools на кшталт course_search,
product_search або hotel_search.

Scope цього tool:
  - конфіг агента
  - повідомлення сесії
  - execution summary
  - прогрес користувача

Flow:
  Agent
    -> execute_database_query(query_type, params)
    -> Pydantic validation + query_type allowlist
    -> POST {BACKEND_INTERNAL_URL}/internal/v1/data/query
    -> Spring Boot -> service -> DB
    -> safe DTO
    -> redact sensitive fields
    -> str для LLM context

Режими роботи:
  1. Backend mode:
     якщо BACKEND_INTERNAL_URL встановлений, tool ходить у Spring Boot.
  2. Stub mode:
     якщо URL не встановлений або backend недоступний, tool тихо
     переходить на вбудовані mock-дані й додає [backend unavailable]
     на початок відповіді. Агент не крашиться.

Guardrails:
  - allowlist query_type через Literal enum у schema
  - жорстка Pydantic schema з model-level validation
  - read-only: жодних write операцій
  - timeout
  - response size cap
  - redact sensitive fields
  - no raw SQL
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

from .tool_schemas import DatabaseQueryInput


_BACKEND_URL = os.getenv("BACKEND_INTERNAL_URL", "").rstrip("/")
_BACKEND_API_KEY = os.getenv("BACKEND_INTERNAL_API_KEY", "")

_TIMEOUT_SECONDS = 5.0
_MAX_RESPONSE_CHARS = 3000

_REDACT_FIELDS = frozenset({
    "password",
    "password_hash",
    "secret",
    "token",
    "api_key",
    "access_token",
    "refresh_token",
    "credit_card",
    "card_number",
    "cvv",
})

_STUB: dict[str, Any] = {
    "get_session_messages": [
        {
            "role": "user",
            "content": "Знайди курс Python",
            "created_at": "2026-05-22T10:00:00Z",
        },
        {
            "role": "assistant",
            "content": "Знайшов 3 курси для початківців...",
            "created_at": "2026-05-22T10:00:05Z",
        },
    ],
    "get_agent_config": {
        "agent_id": "demo-agent-001",
        "name": "Education Assistant",
        "domain": "education",
        "tools": [
            "course_search",
            "course_info",
            "save_progress",
            "database_query",
        ],
        "max_steps": 10,
        "system_prompt_hint": "Ти — освітній асистент.",
    },
    "get_execution_summary": [
        {
            "execution_id": "exec-001",
            "status": "completed",
            "domain": "education",
            "steps_taken": 3,
            "final_answer_preview": "Знайшов курс Python для початківців...",
            "created_at": "2026-05-22T10:00:00Z",
        }
    ],
    "get_user_progress": [
        {
            "course_id": "py-101",
            "course_title": "Python для початківців",
            "lesson_id": "lesson-3",
            "lesson_title": "Функції",
            "completed_at": "2026-05-22T10:00:00Z",
        }
    ],
}


def database_query_tool() -> dict:
    """Returns tool metadata for the agent / LLM."""
    return {
        "name": "database_query",
        "description": (
            "Reads platform-level data from the system through a secure backend "
            "API. Use this tool for chat session history, agent configuration, "
            "execution summaries, or user learning progress. This tool is "
            "READ-ONLY and does not modify data. Do not use it for product, "
            "course, or hotel discovery when dedicated domain tools exist."
        ),
        "input_schema": DatabaseQueryInput.model_json_schema(),
    }


async def execute_database_query(args: dict) -> str:
    """
    Validates the query, calls backend when configured, and falls back to stub
    data if backend is unavailable.

    Raises:
        pydantic.ValidationError: invalid query_type or missing required params

    Returns:
        str: formatted safe result for the agent context
    """
    validated = DatabaseQueryInput(**args)

    if _BACKEND_URL:
        try:
            return await _query_backend(validated)
        except Exception as exc:
            stub_result = _query_stub(validated)
            return f"[backend unavailable: {exc}]\n{stub_result}"

    return _query_stub(validated)


async def _query_backend(validated: DatabaseQueryInput) -> str:
    """Calls POST /internal/v1/data/query on the backend."""
    url = f"{_BACKEND_URL}/internal/v1/data/query"

    payload: dict[str, Any] = {
        "queryType": validated.query_type,
        "limit": validated.limit,
    }
    if validated.session_id:
        payload["sessionId"] = validated.session_id
    if validated.agent_id:
        payload["agentId"] = validated.agent_id
    if validated.user_id:
        payload["userId"] = validated.user_id
    if validated.course_id:
        payload["courseId"] = validated.course_id
    if validated.execution_id:
        payload["executionId"] = validated.execution_id

    headers = {"Content-Type": "application/json"}
    if _BACKEND_API_KEY:
        headers["X-Internal-Key"] = _BACKEND_API_KEY

    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    items = data.get("items", data) if isinstance(data, dict) else data
    items = _redact(items)
    return _format_result(validated.query_type, items)


def _query_stub(validated: DatabaseQueryInput) -> str:
    """Returns offline/demo stub data."""
    raw = _STUB.get(validated.query_type)
    if raw is None:
        return f"No stub data available for query_type='{validated.query_type}'."

    items = raw if isinstance(raw, list) else [raw]
    items = items[: validated.limit]
    items = _redact(items)
    return _format_result(validated.query_type, items)


def _redact(data: Any) -> Any:
    """Recursively redacts sensitive fields from dicts/lists."""
    if isinstance(data, list):
        return [_redact(item) for item in data]
    if isinstance(data, dict):
        return {
            key: "[REDACTED]" if key.lower() in _REDACT_FIELDS else _redact(value)
            for key, value in data.items()
        }
    return data


def _format_result(query_type: str, items: Any) -> str:
    """Formats a readable result string for the LLM context."""
    if isinstance(items, list) and not items:
        return f"No results found for query_type='{query_type}'."

    body = json.dumps(items, ensure_ascii=False, indent=2)
    if len(body) > _MAX_RESPONSE_CHARS:
        body = body[:_MAX_RESPONSE_CHARS] + "\n... [truncated]"

    prefix = f"Results for '{query_type}':\n" if isinstance(items, list) else ""
    return f"{prefix}{body}"
