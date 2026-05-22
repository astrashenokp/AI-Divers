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

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.tools.industry_presets import get_industry_presets
from app.tools.tool_registry import get_available_tools
from app.tools.tool_guardrails import (
    VALID_DOMAINS,
    DOMAIN_MAX_STEPS,
    DOMAIN_TOOL_ALLOWLIST,
    REQUIRES_HUMAN_CONFIRMATION,
    DEFAULT_MAX_STEPS,
    DEFAULT_TIMEOUT_SECONDS,
)
from app.services.tool_execution_service import execute_tool_call

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
# Industry presets
# ---------------------------------------------------------------------------

@app.get("/industry-presets")
async def list_industry_presets():
    """
    Returns builder-ready industry presets aligned with runtime configuration.
    Frontend can use this for onboarding and default agent setup.
    """
    presets = get_industry_presets()
    return {
        "count": len(presets),
        "presets": presets,
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
