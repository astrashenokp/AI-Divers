"""
tool_guardrails.py — Runtime safety rules for tool calls.

Викладач: "Правила на рівні рантайму — це факти. Інструмент недоступний → не можна викликати."

These guardrails run BEFORE tool execution. They are enforced by code, not by prompts.
ToolGuardrailError is caught by tool_execution_service → status="error", error_type="blocked"
"""

from tools.http_request_tool import ToolGuardrailError

# ---------------------------------------------------------------------------
# Domain tool allowlists — what each domain can call
# This is the runtime enforcement of domain scoping.
# "Missing tools can't be called" — лектор
# ---------------------------------------------------------------------------

DOMAIN_TOOL_ALLOWLIST: dict[str, frozenset[str]] = {
    "ecommerce": frozenset({
        # shared
        "get_current_time", "search_web", "save_note", "http_request", "analyze_website",
        # domain
        "product_search", "order_status", "check_price",
    }),
    "education": frozenset({
        # shared
        "get_current_time", "search_web", "save_note", "http_request", "analyze_website",
        # domain
        "course_search", "course_info", "save_progress",
    }),
    "tourism": frozenset({
        # shared
        "get_current_time", "search_web", "save_note", "http_request", "analyze_website",
        # domain
        "hotel_search", "itinerary_plan", "get_weather",
    }),
    "general": frozenset({
        # shared only — no domain tools
        "get_current_time", "search_web", "save_note", "http_request", "analyze_website",
    }),
}

# ---------------------------------------------------------------------------
# Tools that require human confirmation before execution
# Викладач: "Рантайм зупиняється на інструментах із тегом requires_approval"
# ---------------------------------------------------------------------------

REQUIRES_HUMAN_CONFIRMATION: frozenset[str] = frozenset({
    "http_request",      # external API calls — can have side effects
    "save_progress",     # writes user data
    "save_note",         # writes session data
})

# ---------------------------------------------------------------------------
# Hard ceilings — max steps per domain
# Викладач: "Виставте стелю. Max steps, timeout, budget. Всі три."
# ---------------------------------------------------------------------------

DOMAIN_MAX_STEPS: dict[str, int] = {
    "ecommerce": 15,
    "education": 15,
    "tourism":   15,
    "general":   15,
}

DEFAULT_MAX_STEPS = 15
DEFAULT_TIMEOUT_SECONDS = 60

# ---------------------------------------------------------------------------
# Input sanitization — context filtering
# Викладач: "Scrub inputs before context"
# ---------------------------------------------------------------------------

# Patterns that should never reach the LLM in tool args
_SENSITIVE_PATTERNS = [
    "password", "passwd", "secret", "api_key", "token", "credit_card",
    "cvv", "ssn", "passport",
]

VALID_DOMAINS = frozenset({"ecommerce", "education", "tourism", "general"})


def sanitize_args(args: dict) -> dict:
    """
    Removes or masks sensitive fields from tool args before logging/context.
    Does NOT block the call — just ensures safe logging.
    """
    sanitized = {}
    for key, value in args.items():
        key_lower = key.lower()
        if any(pattern in key_lower for pattern in _SENSITIVE_PATTERNS):
            sanitized[key] = "***REDACTED***"
        else:
            sanitized[key] = value
    return sanitized


# ---------------------------------------------------------------------------
# Guardrail checks — called by tool_execution_service
# ---------------------------------------------------------------------------

def check_tool_allowed_in_domain(tool_name: str, domain: str | None) -> None:
    """
    Raises ToolGuardrailError if tool is not in the domain allowlist.
    This is the hard enforcement — no exceptions.
    """
    if domain is None:
        return  # no scoping in test/fallback mode
    allowlist = DOMAIN_TOOL_ALLOWLIST.get(domain)
    if allowlist is None:
        return  # unknown domain — handled upstream
    if tool_name not in allowlist:
        raise ToolGuardrailError(
            f"Tool '{tool_name}' is not permitted in domain '{domain}'. "
            f"Permitted tools: {sorted(allowlist)}"
        )


def check_step_limit(step_count: int, domain: str | None) -> None:
    """
    Raises ToolGuardrailError if step count exceeds domain ceiling.
    Викладач: "Стеля не обговорюється."
    """
    max_steps = DOMAIN_MAX_STEPS.get(domain or "", DEFAULT_MAX_STEPS)
    if step_count >= max_steps:
        raise ToolGuardrailError(
            f"Step limit reached: {step_count}/{max_steps} steps used in domain '{domain}'. "
            f"Agent execution stopped to prevent infinite loops and cost overrun."
        )


def requires_confirmation(tool_name: str) -> bool:
    """Returns True if this tool requires human confirmation before execution."""
    return tool_name in REQUIRES_HUMAN_CONFIRMATION
