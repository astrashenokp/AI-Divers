import logging
from datetime import datetime, timezone
from typing import Literal

from pydantic import ValidationError

from tools.tool_registry import get_tool_registry
from tools.http_request_tool import ToolGuardrailError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Runtime contract
# ---------------------------------------------------------------------------

ToolStatus = Literal["success", "error", "blocked", "requires_confirmation"]

ERROR_TYPE_UNKNOWN_TOOL = "unknown_tool"
ERROR_TYPE_VALIDATION   = "validation_error"
ERROR_TYPE_BLOCKED      = "blocked"
ERROR_TYPE_RUNTIME      = "runtime_error"
ERROR_TYPE_STEP_LIMIT   = "step_limit_exceeded"
ERROR_TYPE_CROSS_DOMAIN = "cross_domain_blocked"

# ── Domain scoping ────────────────────────────────────────────────────────
# Domain-specific tools — agent from one domain cannot call tools of another.
# Shared tools are allowed from any domain.

DOMAIN_TOOLS: dict[str, list[str]] = {
    "education": ["course_search", "course_info", "save_progress"],
    "ecommerce": ["product_search", "order_status", "check_price"],
    "tourism":   ["hotel_search", "itinerary_plan", "get_weather"],
}

SHARED_TOOL_NAMES: set[str] = {
    "get_current_time", "search_web", "save_note", "http_request",
}


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _duration_ms(started_at: str, completed_at: str) -> int:
    try:
        start = datetime.fromisoformat(started_at)
        end   = datetime.fromisoformat(completed_at)
        return max(0, int((end - start).total_seconds() * 1000))
    except Exception:
        return 0


def _make_result(
    *,
    tool_name: str,
    status: ToolStatus,
    result: str,
    started_at: str,
    completed_at: str,
    execution_id: str | None,
    error_type: str | None = None,
) -> dict:
    """
    Unified ToolResult dict.

    {
        "tool_name":    str,
        "status":       "success" | "error" | "blocked" | "requires_confirmation",
        "result":       str,          # human-readable output or error message
        "started_at":   str,          # ISO 8601 UTC
        "completed_at": str,          # ISO 8601 UTC
        "duration_ms":  int,
        "execution_id": str | None,
        "error_type":   str | None,   # None when status == "success"
    }
    """
    return {
        "tool_name":    tool_name,
        "status":       status,
        "result":       result,
        "started_at":   started_at,
        "completed_at": completed_at,
        "duration_ms":  _duration_ms(started_at, completed_at),
        "execution_id": execution_id,
        "error_type":   error_type,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def execute_tool_call(
    tool_name: str,
    args: dict,
    execution_id: str | None = None,
    domain: str | None = None,
    step_count: int = 0,
    max_steps: int = 0,
) -> dict:
    """
    Central entry point for tool execution.

    Called by Alina's agent after the LLM decides to use a tool.
    Relayed as SSE events by Stas API (tool_call_started / tool_call_finished).

    Parameters:
        tool_name:      Name of the tool to execute.
        args:           Arguments as a dict matching the tool's input schema.
        execution_id:   Unique execution ID for tracking / SSE.
        domain:         Domain the agent is running in (education, ecommerce, ...).
                        Used for cross-domain guardrail.
        step_count:     Current step count in the agent loop.
        max_steps:      Maximum allowed steps. If step_count >= max_steps the
                        call is blocked (defense-in-depth).

    Returns:
        ToolResult dict — always, never raises.
    """
    started_at = _now_iso()
    registry = get_tool_registry()

    # ── 0a. Step limit guardrail (defense-in-depth) ────────────────────────
    if max_steps > 0 and step_count >= max_steps:
        completed_at = _now_iso()
        logger.warning(
            "Step limit exceeded | tool=%s | step_count=%d | max_steps=%d | exec=%s",
            tool_name, step_count, max_steps, execution_id,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=(
                f"Step limit exceeded ({step_count}/{max_steps}). "
                f"Tool '{tool_name}' was blocked."
            ),
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            error_type=ERROR_TYPE_STEP_LIMIT,
        )

    # ── 0b. Cross-domain guardrail ─────────────────────────────────────────
    if domain and domain in DOMAIN_TOOLS:
        allowed = set(DOMAIN_TOOLS[domain]) | SHARED_TOOL_NAMES
        if tool_name not in allowed:
            completed_at = _now_iso()
            logger.warning(
                "Cross-domain blocked | tool=%s | domain=%s | exec=%s",
                tool_name, domain, execution_id,
            )
            return _make_result(
                tool_name=tool_name,
                status="error",
                result=(
                    f"Tool '{tool_name}' is not available in the '{domain}' domain."
                ),
                started_at=started_at,
                completed_at=completed_at,
                execution_id=execution_id,
                error_type=ERROR_TYPE_CROSS_DOMAIN,
            )

    # ── 1. Unknown tool ────────────────────────────────────────────────────
    if tool_name not in registry:
        completed_at = _now_iso()
        logger.warning(
            "Unknown tool | tool=%s | execution_id=%s",
            tool_name, execution_id,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=(
                f"Tool '{tool_name}' is not available. "
                f"Available tools: {list(registry.keys())}"
            ),
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            error_type=ERROR_TYPE_UNKNOWN_TOOL,
        )

    tool_fn = registry[tool_name]

    try:
        output = await tool_fn(args)
        completed_at = _now_iso()
        logger.info(
            "Tool success | tool=%s | execution_id=%s",
            tool_name, execution_id,
        )
        return _make_result(
            tool_name=tool_name,
            status="success",
            result=str(output),
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
        )

    # ── 2. Guardrail block ─────────────────────────────────────────────────
    except ToolGuardrailError as exc:
        completed_at = _now_iso()
        logger.warning(
            "Guardrail blocked | tool=%s | execution_id=%s | reason=%s",
            tool_name, execution_id, exc,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=str(exc),
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            error_type=ERROR_TYPE_BLOCKED,
        )

    # ── 3. Validation error ────────────────────────────────────────────────
    except ValidationError as exc:
        completed_at = _now_iso()
        logger.warning(
            "Validation error | tool=%s | execution_id=%s",
            tool_name, execution_id,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=f"Invalid arguments for '{tool_name}': {exc.errors()}",
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            error_type=ERROR_TYPE_VALIDATION,
        )

    # ── 4. Runtime error ───────────────────────────────────────────────────
    except Exception as exc:
        completed_at = _now_iso()
        logger.error(
            "Runtime error | tool=%s | execution_id=%s | error=%s",
            tool_name, execution_id, type(exc).__name__,
            exc_info=True,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=f"Tool '{tool_name}' failed: {str(exc)}",
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            error_type=ERROR_TYPE_RUNTIME,
        )