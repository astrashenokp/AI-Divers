import json
from urllib.parse import urlparse

import httpx

from .tool_schemas import HttpRequestInput

# ---------------------------------------------------------------------------
# Guardrail exception — signals a blocked request BEFORE execution
# tool_execution_service catches this and returns status="error", error_type="blocked"
# ---------------------------------------------------------------------------

class ToolGuardrailError(Exception):
    """Raised when a tool call is blocked by a runtime guardrail rule."""


# Hosts that must never be reachable from a tool call.
# Runtime guardrail — not a prompt instruction, enforced in code.
_BLOCKED_HOSTS = frozenset({
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",       # AWS instance metadata
    "metadata.google.internal",
})

_ALLOWED_METHODS = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE"})

# ---------------------------------------------------------------------------
# Tool definition (metadata for the LLM)
# ---------------------------------------------------------------------------


def http_request_tool() -> dict:
    """Returns tool metadata consumed by the agent / LLM."""
    return {
        "name": "http_request",
        "description": (
            "Makes an HTTP request to an external public API or service. "
            "Use when the agent needs to call a REST endpoint, fetch live data, "
            "submit a form, or integrate with a third-party service. "
            "Supports GET, POST, PUT, PATCH, DELETE. "
            "Example: fetch order status from 'https://api.shop.com/orders/99' "
            "or post data to a webhook URL."
        ),
        "input_schema": HttpRequestInput.model_json_schema(),
    }


# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------


async def execute_http_request(args: dict) -> str:
    """
    Executes the http_request tool.

    Raises:
        ToolGuardrailError: if the request is blocked by a runtime rule
                            (internal address, disallowed method).
                            tool_execution_service maps this to status="error",
                            error_type="blocked".
        pydantic.ValidationError: if args do not match HttpRequestInput schema.
                            tool_execution_service maps this to error_type="validation_error".
    Returns:
        str: formatted HTTP response (status line + body).
    """
    validated = HttpRequestInput(**args)

    # ── Guardrail: block internal/private addresses ───────────────────────
    parsed = urlparse(validated.url)
    hostname = (parsed.hostname or "").lower()

    if (
        hostname in _BLOCKED_HOSTS
        or hostname.startswith("192.168.")
        or hostname.startswith("10.")
        or hostname.startswith("172.16.")
    ):
        raise ToolGuardrailError(
            f"Requests to internal or private addresses are not allowed. "
            f"Blocked host: '{hostname}'"
        )

    # ── Guardrail: method allowlist ───────────────────────────────────────
    method = validated.method.upper()
    if method not in _ALLOWED_METHODS:
        raise ToolGuardrailError(
            f"HTTP method '{method}' is not allowed. "
            f"Allowed methods: {sorted(_ALLOWED_METHODS)}"
        )

    # ── Execute ───────────────────────────────────────────────────────────
    async with httpx.AsyncClient(
        timeout=validated.timeout_seconds,
        follow_redirects=True,
    ) as client:
        response = await client.request(
            method=method,
            url=validated.url,
            headers=validated.headers or {},
            content=validated.body.encode("utf-8") if validated.body else None,
        )

    # ── Format response ───────────────────────────────────────────────────
    status_line = f"HTTP {response.status_code} {response.reason_phrase}"

    content_type = response.headers.get("content-type", "")
    body_text = response.text

    # Pretty-print JSON responses
    if "application/json" in content_type:
        try:
            body_text = json.dumps(response.json(), ensure_ascii=False, indent=2)
        except Exception:
            pass

    # Truncate long responses so the agent context stays manageable
    max_chars = 3000
    truncated = ""
    if len(body_text) > max_chars:
        body_text = body_text[:max_chars]
        truncated = f"\n[Response truncated to {max_chars} characters]"

    return f"{status_line}\n\n{body_text}{truncated}"