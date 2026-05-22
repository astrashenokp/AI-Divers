# Tools Layer — Architecture & Ownership

**Owner:** Sofia Prutska  
**Service:** `apps/agent-service`

---

## Purpose

This folder contains everything the agent needs to **act**:

- tool schemas
- shared tools
- domain tools
- runtime guardrail rules
- tool registry
- tool metadata for the LLM
- safe execution support consumed by `tool_execution_service.py`

If Alina's code is the **brain**, this folder is the **hands** plus the **safety rails** around those hands.

---

## Current Structure

```text
apps/agent-service/app/
│
├── main.py                            ← FastAPI entrypoint for tool/debug APIs
├── test_tools.py                      ← local runtime verification
│
├── services/
│   └── tool_execution_service.py      ← central executor returning ToolResult dict
│
├── tools/
│   ├── architecture_tools.md          ← this file
│   ├── tool_schemas.py                ← all shared + domain Pydantic schemas
│   ├── tool_registry.py               ← get_tool_registry(domain), get_available_tools(domain)
│   ├── tool_guardrails.py             ← runtime tool safety rules
│   │
│   ├── current_time_tool.py           ← shared tool
│   ├── web_search_tool.py             ← shared tool
│   ├── save_note_tool.py              ← shared tool
│   ├── http_request_tool.py           ← shared tool with request guardrails
│   │
│   ├── database_query_tool.py         ← placeholder
│   ├── industry_presets.py            ← placeholder
│   ├── website_analyzer_tool.py       ← placeholder
│   │
│   ├── ecommerce/
│   │   ├── __init__.py
│   │   ├── product_search_tool.py
│   │   ├── order_status_tool.py
│   │   └── check_price_tool.py
│   │
│   ├── education/
│   │   ├── __init__.py
│   │   ├── course_search_tool.py
│   │   ├── course_info_tool.py
│   │   └── save_progress_tool.py
│   │
│   └── tourism/
│       ├── __init__.py
│       ├── hotel_search_tool.py
│       ├── itinerary_tool.py
│       └── get_weather_tool.py
```

---

## Architecture Model

The tools layer now follows a domain-aware runtime model:

```text
Router decides domain
   ↓
Agent sees tools for that domain only
   ↓
execute_tool_call(tool_name, args, domain, step_count)
   ↓
Runtime guardrails
   ├── valid domain
   ├── step limit
   ├── domain allowlist
   └── sensitive arg redaction
   ↓
Registry lookup
   ↓
Tool execution
   ↓
Unified ToolResult dict
```

This means domain scoping exists in two places by design:

1. **LLM visibility layer** via `get_available_tools(domain)`
2. **Runtime enforcement layer** via `tool_guardrails.py`

Even if the LLM or graph tries to call a wrong tool, the runtime still blocks it.

---

## Shared vs Domain Tools

### Shared tools

Available in every domain:

- `get_current_time`
- `search_web`
- `save_note`
- `http_request`

### Domain tools

`ecommerce`:

- `product_search`
- `order_status`
- `check_price`

`education`:

- `course_search`
- `course_info`
- `save_progress`

`tourism`:

- `hotel_search`
- `itinerary_plan`
- `get_weather`

`general`:

- no domain-only tools
- shared tools only

---

## File Responsibilities

### `tool_schemas.py`

What it is:

- one central place for **all** tool input schemas

Why it exists:

- LLM tool arguments arrive as raw JSON
- validation must be explicit and shared
- tools should not define ad hoc inline schemas

Current schema groups:

- shared schemas
- ecommerce schemas
- education schemas
- tourism schemas

Rule:

- change this file first when adding a new tool

### `tool_registry.py`

What it is:

- the master mapping between tool names, metadata, and execution functions

Current public API:

```python
get_tool_registry(domain: str | None = None) -> dict[str, Callable]
get_available_tools(domain: str | None = None) -> list[dict]

TOOL_REGISTRY = get_tool_registry()
AVAILABLE_TOOLS = get_available_tools()
```

Why it matters:

- Alina uses metadata for LLM tool visibility
- the execution service uses execute-function lookup
- FastAPI `/tool-types` uses metadata for builder/debug integration

### `tool_guardrails.py`

What it is:

- the runtime safety policy for tool execution

Current responsibilities:

- domain allowlists
- step ceilings
- confirmation-required tool list
- input redaction for safe logs
- valid domain constants

Why it matters:

- the runtime should enforce facts, not trust prompts
- missing tools must be impossible to call
- infinite loops must stop at a hard ceiling

### `http_request_tool.py`

Special role:

- shared tool for external API calls
- defines `ToolGuardrailError`
- blocks internal/private addresses
- blocks disallowed HTTP methods

Status:

- implemented
- guarded
- ready for integration

### `services/tool_execution_service.py`

What it is:

- the single runtime entry point for all tool calls

Current function signature:

```python
async def execute_tool_call(
    tool_name: str,
    args: dict,
    execution_id: str | None = None,
    domain: str | None = None,
    step_count: int = 0,
) -> dict:
```

Current responsibilities:

- validate domain
- sanitize logged arguments
- enforce step limit
- enforce domain allowlist
- handle unknown tools safely
- catch tool guardrail blocks
- catch validation errors
- catch runtime errors
- return a unified ToolResult dict

Current ToolResult shape:

```python
{
    "tool_name": str,
    "status": "success" | "error" | "blocked" | "requires_confirmation",
    "result": str,
    "started_at": str,
    "completed_at": str,
    "duration_ms": int,
    "execution_id": str | None,
    "domain": str | None,
    "error_type": str | None,
}
```

---

## FastAPI Integration Surface

The tools layer is now exposed through `app/main.py`.

Current endpoints:

- `GET /health`
- `GET /domains`
- `GET /tool-types`
- `GET /guardrails-config`
- `POST /execute-tool`

Why this matters:

- Stas API can health-check the Python service
- frontend can load domains and tool metadata without hardcoding
- the team can debug tools before the agent graph is ready

---

## Runtime Safety Guarantees

Current guarantees:

- wrong domain tool calls are blocked
- excessive tool-loop steps are blocked
- unsafe HTTP destinations are blocked
- disallowed HTTP methods are blocked
- invalid input payloads are caught by Pydantic
- unexpected runtime failures return safe error objects
- sensitive fields like `password`, `token`, `api_key` are redacted in logs

This is the main runtime principle:

> prompts suggest behavior, code enforces behavior

---

## How It Connects to Alina's Agent Layer

Alina should use two tool-facing APIs from this layer:

```python
from tools.tool_registry import get_available_tools
from services.tool_execution_service import execute_tool_call
```

Expected flow:

1. Router selects a domain.
2. Domain graph asks `get_available_tools(domain=...)`.
3. LLM sees only shared tools + that domain's tools.
4. When the LLM requests a tool, Alina calls:

```python
await execute_tool_call(
    tool_name=tool_name,
    args=args,
    execution_id=execution_id,
    domain=domain,
    step_count=step_count,
)
```

Required from Alina:

- always pass `domain`
- always pass `step_count`

Without those two values, runtime scoping and ceilings are weaker.

---

## Placeholders and Future Work

These files exist but are not implemented yet:

- `database_query_tool.py`
- `industry_presets.py`
- `website_analyzer_tool.py`

They are intentionally placeholders and should not be treated as stable runtime capabilities yet.

---

## Local Verification

`test_tools.py` is the local runtime verification script.

How to run:

```bash
cd apps/agent-service
python3 -m app.test_tools
```

Current test scope covers:

- shared tools
- domain tools
- domain scoping failures
- HTTP guardrail blocks
- step ceiling blocks
- sensitive-arg redaction path

Current expected status:

- all assertions passing

---

## Adding a New Tool

When adding a new tool, follow this order:

1. Add schema to `tool_schemas.py`
2. Create `your_tool_name_tool.py`
3. Register it in `tool_registry.py`
4. Add it to the correct domain allowlist in `tool_guardrails.py`
5. Add or update tests in `test_tools.py`
6. Tell Alina if the new tool changes prompt/tool-routing behavior

If the tool is domain-specific, add it in both places:

- registry/domain metadata
- domain allowlist

If you skip the allowlist step, the runtime contract is incomplete.

---

## Boundary Rules

These rules are non-negotiable:

| Rule | Why |
|---|---|
| Alina decides when a tool is called | Keeps orchestration separate from execution |
| Sofia defines which tools exist and how they run | Keeps tool behavior centralized |
| Runtime guardrails live in code, not prompts | Safety must be enforceable |
| Schemas live only in `tool_schemas.py` | Validation stays consistent |
| `execute_tool_call()` never raises to the caller | Agent runtime always gets a safe result object |
| Domain tools must be both visible and permitted | Visibility alone is not security |
