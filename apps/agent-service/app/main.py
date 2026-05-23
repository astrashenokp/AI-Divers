"""
main.py — FastAPI entry point for agent-service.

Endpoints:
  GET  /health               — liveness check for Stas API
  GET  /domains              — list of valid domains (для builder UI)
  GET  /tool-types           — tool metadata, optionally filtered by domain
  GET  /guardrails-config    — domain limits and confirmation requirements
  POST /execute-tool         — direct tool execution for debug/testing
"""

import logging
import uuid
from typing import Any
from agents.agent_graph import agent_graph
from agents.agent_state import AgentState
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import asyncio
import json

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
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
    message: str | None = None
    sessionId: str | None = None
    domain: str | None = None
    use_case: str | None = None
    max_steps: int = 10
    system_prompt: str | None = None
    tools: list[str] | None = None
    guardrails: dict | None = None
    model_provider: str | None = None
    model_name: str | None = None
    metadata: dict[str, Any] = {}
    messages: list | None = None

def _sse_event(event: str, data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"

async def _stream_agent(
    request: AgentStreamRequest,
    execution_id: str,
) -> AsyncGenerator[str, None]:
    domain = request.domain
    if domain and domain not in VALID_DOMAINS:
        domain = None

    yield _sse_event("execution_started", {
        "executionId": execution_id,
        "domain": domain or "general",
        "sessionId": request.sessionId,
    })

    from agents.domains.graph import _current_event_queue

    event_queue: asyncio.Queue = asyncio.Queue()
    token = _current_event_queue.set(event_queue)

    try:
        history = request.messages if request.messages else [{"role": "user", "content": request.message}]
        initial_state: AgentState = {
            "messages": history,
            "domain":   domain or "general",
            "use_case": request.use_case,
            "execution_id": execution_id,
            "step_count": 0,
            "max_steps":  request.max_steps,
            "system_prompt": request.system_prompt,
            "tools": request.tools,
            "guardrails": request.guardrails,
            "session_id": request.sessionId,
            "model_provider": request.model_provider,
            "model_name": request.model_name,
        }

        agent_task = asyncio.create_task(agent_graph.ainvoke(initial_state))

        while True:
            done = agent_task.done()
            while not event_queue.empty():
                event_name, event_data = event_queue.get_nowait()
                yield _sse_event(event_name, event_data)
            if done:
                break
            try:
                await asyncio.wait_for(event_queue.get(), timeout=0.3)
            except asyncio.TimeoutError:
                pass

        result_state = agent_task.result()

        final_text = ""
        for msg in reversed(result_state.get("messages", [])):
            if not isinstance(msg, dict) or msg.get("role") != "assistant":
                continue
            content_msg = msg.get("content", "")
            if isinstance(content_msg, list):
                parts = [b.get("text", "") for b in content_msg if isinstance(b, dict) and b.get("type") == "text"]
                content_msg = " ".join(parts)
            if content_msg:
                final_text = content_msg
                break

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
        _current_event_queue.reset(token)

@app.post("/internal/v1/agent/stream")
async def agent_stream(request: AgentStreamRequest):
    if not request.messages:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=422, detail="message must not be empty")

    execution_id = f"stream-{uuid.uuid4().hex[:8]}"
    logger.info("Agent stream started | execution_id=%s | domain=%s | session=%s", execution_id, request.domain, request.sessionId)

    return StreamingResponse(
        _stream_agent(request, execution_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
