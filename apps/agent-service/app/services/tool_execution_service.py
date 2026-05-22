import logging
from datetime import datetime, timezone
from typing import Literal

from pydantic import ValidationError

from tools.tool_registry import get_tool_registry
from tools.http_request_tool import ToolGuardrailError
from tools.tool_guardrails import (
    check_tool_allowed_in_domain,
    check_step_limit,
    sanitize_args,
    VALID_DOMAINS,           # ← single source of truth, no local redefinition
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Runtime contract
# ---------------------------------------------------------------------------

ToolStatus = Literal["success", "error", "blocked", "requires_confirmation"]

ERROR_TYPE_UNKNOWN_TOOL = "unknown_tool"
ERROR_TYPE_VALIDATION   = "validation_error"
ERROR_TYPE_BLOCKED      = "blocked"
ERROR_TYPE_RUNTIME      = "runtime_error"


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
    domain: str | None = None,
    error_type: str | None = None,
) -> dict:
    """
    Unified ToolResult dict.

    {
        "tool_name":    str,
        "status":       "success" | "error" | "blocked" | "requires_confirmation",
        "result":       str,
        "started_at":   str,          # ISO 8601 UTC
        "completed_at": str,          # ISO 8601 UTC
        "duration_ms":  int,
        "execution_id": str | None,
        "domain":       str | None,
        "error_type":   str | None,
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
        "domain":       domain,
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
) -> dict:
    """
    Central entry point for tool execution.

    Runtime safety enforced here (not in prompts):
    - Domain tool allowlist check
    - Step limit (hard ceiling)
    - Guardrail errors from tools (blocked addresses, bad methods)
    - Input sanitization for safe logging

    Args:
        tool_name:    name of the tool to call
        args:         raw argument dict from the LLM
        execution_id: trace ID from agent loop
        domain:       active domain scope
        step_count:   current step in agent loop (for ceiling check)

    Returns:
        ToolResult dict — always, never raises.
    """
    started_at = _now_iso()

    # ── Domain validation ──────────────────────────────────────────────────
    if domain is not None and domain not in VALID_DOMAINS:
        logger.warning(
            "Unknown domain | domain=%s | tool=%s | execution_id=%s",
            domain, tool_name, execution_id,
        )
        domain = None

    # ── Log safely — redact sensitive args ────────────────────────────────
    safe_args = sanitize_args(args)
    logger.debug(
        "Tool call | tool=%s | domain=%s | step=%d | args=%s | execution_id=%s",
        tool_name, domain, step_count, safe_args, execution_id,
    )

    try:
        check_step_limit(step_count, domain)
        check_tool_allowed_in_domain(tool_name, domain)

    except ToolGuardrailError as exc:
        completed_at = _now_iso()
        logger.warning(
            "Guardrail blocked (pre-execution) | tool=%s | domain=%s | execution_id=%s | reason=%s",
            tool_name, domain, execution_id, exc,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=str(exc),
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            domain=domain,
            error_type=ERROR_TYPE_BLOCKED,
        )

    registry = get_tool_registry(domain=domain)

    # ── Unknown tool ───────────────────────────────────────────────────────
    if tool_name not in registry:
        completed_at = _now_iso()
        all_registry = get_tool_registry(domain=None)
        if tool_name in all_registry and domain is not None:
            msg = (
                f"Tool '{tool_name}' is not available in domain '{domain}'. "
                f"Available tools: {list(registry.keys())}"
            )
        else:
            msg = (
                f"Tool '{tool_name}' is not available. "
                f"Available tools: {list(registry.keys())}"
            )
        logger.warning(
            "Unknown tool | tool=%s | domain=%s | execution_id=%s",
            tool_name, domain, execution_id,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=msg,
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            domain=domain,
            error_type=ERROR_TYPE_UNKNOWN_TOOL,
        )

    tool_fn = registry[tool_name]

    try:
        output = await tool_fn(args)
        completed_at = _now_iso()
        logger.info(
            "Tool success | tool=%s | domain=%s | duration_ms=%d | execution_id=%s",
            tool_name, domain,
            _duration_ms(started_at, completed_at),
            execution_id,
        )
        return _make_result(
            tool_name=tool_name,
            status="success",
            result=str(output),
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            domain=domain,
        )

    except ToolGuardrailError as exc:
        completed_at = _now_iso()
        logger.warning(
            "Guardrail blocked (in-execution) | tool=%s | domain=%s | execution_id=%s | reason=%s",
            tool_name, domain, execution_id, exc,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=str(exc),
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            domain=domain,
            error_type=ERROR_TYPE_BLOCKED,
        )

    except ValidationError as exc:
        completed_at = _now_iso()
        logger.warning(
            "Validation error | tool=%s | domain=%s | execution_id=%s",
            tool_name, domain, execution_id,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=f"Invalid arguments for '{tool_name}': {exc.errors()}",
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            domain=domain,
            error_type=ERROR_TYPE_VALIDATION,
        )

    except Exception as exc:
        completed_at = _now_iso()
        logger.error(
            "Runtime error | tool=%s | domain=%s | execution_id=%s | error=%s",
            tool_name, domain, execution_id, type(exc).__name__,
            exc_info=True,
        )
        return _make_result(
            tool_name=tool_name,
            status="error",
            result=f"Tool '{tool_name}' failed: {str(exc)}",
            started_at=started_at,
            completed_at=completed_at,
            execution_id=execution_id,
            domain=domain,
            error_type=ERROR_TYPE_RUNTIME,
        )
