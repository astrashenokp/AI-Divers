"""
main.py — FastAPI entry point for agent-service.

Endpoints:
  GET  /health                          — liveness check for Stas API
  GET  /domains                         — list of valid domains (для builder UI)
  GET  /tool-types                      — tool metadata, optionally filtered by domain
  GET  /guardrails-config               — domain limits and confirmation requirements
  POST /execute-tool                    — direct tool execution for debug/testing
  POST /internal/v1/agent/stream        — SSE streaming agent execution (для Stас API)
"""

import asyncio
import json
import logging
import uuid
from typing import Any, AsyncGenerator

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from tools.tool_registry import get_available_tools
from tools.tool_guardrails import (
    VALID_DOMAINS,
    DOMAIN_MAX_STEPS,
    DOMAIN_TOOL_ALLOWLIST,
    REQUIRES_HUMAN_CONFIRMATION,
    DEFAULT_MAX_STEPS,
    DEFAULT_TIMEOUT_SECONDS,
)
from services.tool_execution_service import execute_tool_call
from agents.agent_graph import agent_graph
from agents.agent_state import AgentState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agentic Studio — Agent Service",
    description="Tool execution layer for autonomous agents",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Rinata/Polina can connect from localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Liveness check. Stas API polls this before proxying requests."""
    return {"status": "ok", "service": "agent-service"}


# ---------------------------------------------------------------------------
# Domains
# ---------------------------------------------------------------------------

@app.get("/domains")
async def list_domains():
    """
    Returns available domain IDs with display names.
    Builder UI uses this to populate the industry selector.
    """
    domain_labels = {
        "ecommerce": "🛒 E-commerce",
        "education": "🎓 Education",
        "tourism":   "🏨 Tourism",
        "general":   "🌐 General",
    }
    return {
        "domains": [
            {"id": d, "label": domain_labels.get(d, d)}
            for d in sorted(VALID_DOMAINS)
        ]
    }


# ---------------------------------------------------------------------------
# Tool types
# ---------------------------------------------------------------------------

@app.get("/tool-types")
async def get_tool_types(
    domain: str | None = Query(
        default=None,
        description="Filter by domain: ecommerce | education | tourism | general",
    )
):
    """
    Returns tool metadata for the LLM / builder UI.

    Without domain → all tools.
    With domain    → shared + domain-specific tools only.
    """
    if domain is not None and domain not in VALID_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown domain '{domain}'. Valid domains: {sorted(VALID_DOMAINS)}",
        )
    tools = get_available_tools(domain=domain)
    return {
        "domain": domain,
        "count":  len(tools),
        "tools":  tools,
    }


# ---------------------------------------------------------------------------
# Guardrails config
# ---------------------------------------------------------------------------

@app.get("/guardrails-config")
async def get_guardrails_config():
    """
    Returns runtime safety configuration.
    Stas API and builder UI use this to show guardrail settings.
    """
    return {
        "valid_domains": sorted(VALID_DOMAINS),
        "default_max_steps": DEFAULT_MAX_STEPS,
        "default_timeout_seconds": DEFAULT_TIMEOUT_SECONDS,
        "domain_max_steps": DOMAIN_MAX_STEPS,
        "tools_requiring_confirmation": sorted(REQUIRES_HUMAN_CONFIRMATION),
        "domain_tool_allowlists": {
            domain: sorted(tools)
            for domain, tools in DOMAIN_TOOL_ALLOWLIST.items()
        },
    }


# ---------------------------------------------------------------------------
# Direct tool execution (debug / integration testing)
# ---------------------------------------------------------------------------

class ExecuteToolRequest(BaseModel):
    tool_name: str
    args: dict[str, Any] = {}
    domain: str | None = None
    step_count: int = 0


@app.post("/execute-tool")
async def execute_tool(request: ExecuteToolRequest):
    """
    Executes a tool directly. For local debug and integration testing only.
    NOT called by the agent — the agent uses execute_tool_call() internally.

    Returns ToolResult dict with status, result, timestamps, domain, error_type.
    """
    execution_id = f"debug-{uuid.uuid4().hex[:8]}"
    result = await execute_tool_call(
        tool_name=request.tool_name,
        args=request.args,
        execution_id=execution_id,
        domain=request.domain,
        step_count=request.step_count,
    )
    return result


# ---------------------------------------------------------------------------
# SSE Streaming agent execution
# POST /internal/v1/agent/stream  — consumed by Stas API / frontend
# ---------------------------------------------------------------------------

class AgentStreamRequest(BaseModel):
    """
    Request body for the streaming endpoint.
    Mirrors the frontend ExecuteAgentStreamRequest shape.
    """
    message: str
    sessionId: str | None = None
    domain: str | None = None
    use_case: str | None = None
    max_steps: int = 15
    metadata: dict[str, Any] = {}


def _sse_event(event: str, data: dict) -> str:
    """Formats a single SSE message in the text/event-stream wire format."""
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


async def _stream_agent(
    request: AgentStreamRequest,
    execution_id: str,
) -> AsyncGenerator[str, None]:
    """
    Runs the agent graph and yields SSE events.

    Emits (in order):
      execution_started        — once at the beginning
      reasoning_step           — each time the LLM reasons
      tool_call_started        — before each tool execution
      tool_call_finished       — after each tool execution
      guardrail_blocked        — if a guardrail fires
      message_delta            — final answer token (whole answer, not chunked)
      execution_completed      — end-of-stream marker
    """
    domain = request.domain
    if domain and domain not in VALID_DOMAINS:
        domain = None

    # ── execution_started ────────────────────────────────────────────────
    yield _sse_event("execution_started", {
        "executionId": execution_id,
        "domain": domain or "general",
        "sessionId": request.sessionId,
    })

    # ── Patch _emit_sse to yield events to the SSE stream ────────────────
    # We use a queue so the agent's synchronous _emit_sse calls can push
    # events that we yield from this async generator.
    event_queue: asyncio.Queue = asyncio.Queue()
    _SENTINEL = object()

    # Monkey-patch graph.py's _emit_sse for this execution only.
    # We capture events via the queue and forward them as SSE.
    import agents.domains.graph as _graph_module
    _original_emit = _graph_module._emit_sse

    def _patched_emit(event: str, data: dict):
        _original_emit(event, data)  # still logs
        enriched = {"executionId": execution_id, **data}
        event_queue.put_nowait((event, enriched))

    _graph_module._emit_sse = _patched_emit

    try:
        initial_state: AgentState = {
            "messages": [{"role": "user", "content": request.message}],
            "domain":   domain or "general",
            "use_case": request.use_case,
            "execution_id": execution_id,
            "step_count": 0,
            "max_steps":  request.max_steps,
        }

        # Run the graph in a background task so we can yield queue items
        # while it's executing.
        agent_task = asyncio.create_task(agent_graph.ainvoke(initial_state))

        # Drain the queue while the agent runs.
        while not agent_task.done():
            await asyncio.sleep(0)          # yield control
            while not event_queue.empty():
                event_name, event_data = event_queue.get_nowait()
                yield _sse_event(event_name, event_data)

        # Drain any remaining events after the task finished.
        while not event_queue.empty():
            event_name, event_data = event_queue.get_nowait()
            yield _sse_event(event_name, event_data)

        result_state = agent_task.result()

        # Extract final assistant text
        final_text = ""
        for msg in reversed(result_state.get("messages", [])):
            if not isinstance(msg, dict) or msg.get("role") != "assistant":
                continue
            content = msg.get("content", "")
            if isinstance(content, list):
                parts = [b.get("text", "") for b in content
                         if isinstance(b, dict) and b.get("type") == "text"]
                content = " ".join(parts)
            if content:
                final_text = content
                break

        # ── message_delta — full answer sent as a single delta ────────────
        yield _sse_event("message_delta", {
            "executionId": execution_id,
            "delta": final_text,
        })

        # ── execution_completed ───────────────────────────────────────────
        yield _sse_event("execution_completed", {
            "executionId": execution_id,
            "finalMessage": final_text,
            "sessionId": request.sessionId,
        })

    except Exception as exc:
        logger.error("Stream agent error | execution_id=%s | error=%s", execution_id, exc, exc_info=True)
        yield _sse_event("execution_failed", {
            "executionId": execution_id,
            "error": str(exc),
        })
    finally:
        # Always restore the original emit function
        _graph_module._emit_sse = _original_emit


@app.post("/internal/v1/agent/stream")
async def agent_stream(request: AgentStreamRequest):
    """
    SSE streaming endpoint for agent execution.
    Called by Stas API / frontend via POST.

    Request body:
        { "message": "...", "sessionId": "optional", "domain": "general", "max_steps": 10 }

    Response: text/event-stream with SSE events:
        execution_started | reasoning_step | tool_call_started |
        tool_call_finished | guardrail_blocked | message_delta |
        execution_completed | execution_failed

    Each event payload is a JSON object with camelCase keys.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty")

    execution_id = f"stream-{uuid.uuid4().hex[:8]}"
    logger.info(
        "Agent stream started | execution_id=%s | domain=%s | session=%s",
        execution_id, request.domain, request.sessionId,
    )

    return StreamingResponse(
        _stream_agent(request, execution_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
            "Connection": "keep-alive",
        },
    )
