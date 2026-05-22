# Architecture.md

## Purpose

This document is the team's source of truth for the Agentic Studio hackathon project.

Its job is to keep three things aligned:

- the hackathon product requirements
- the real repository state
- the work split between team members

If code and this document disagree, update this file first and then update the code.

---

## Product Direction

Project name: **Agentic Studio**

We are building a visual environment where a user can create an autonomous AI agent in minutes, give it tools, configure safety rules, observe every execution step in real time, and deploy that agent outside the studio.

The prototype must prove four things:

1. This is not a hardcoded chatbot.
2. The agent works as a loop: Think -> Act -> Observe -> repeat.
3. The runtime is observable and safe.
4. The same agent can later be exposed through external integration surfaces.

---

## Current Product Strategy

For the hackathon MVP, we are intentionally simplifying the builder model:

- `industry` and `use case` are treated as **presets**, not as a free-form node graph
- the real runtime complexity lives in the **execution engine**
- UI onboarding is important for demo quality, but it is downstream of the runtime

Current domain model for the agent runtime:

- `ecommerce`
- `education`
- `tourism`
- `general`

Each domain gets:

- its own tool allowlist
- its own domain prompt
- its own step ceiling
- shared runtime rules

---

## Repository Reality

Current relevant structure:

```text
AI-DIversssss/
  architecture.md
  README.md
  apps/
    agent-service/
      structure.md
      requirements.txt
      app/
        __init__.py
        main.py
        test_tools.py
        agents/
          __init__.py
          agent_graph.py
          agent_state.py
          router/
            router.py
            prompts.py
          domains/
            ecommerce/
              graph.py
              prompts.py
            education/
              graph.py
              prompts.py
            tourism/
              graph.py
              prompts.py
            general/
              graph.py
              prompts.py
        services/
          __init__.py
          tool_execution_service.py
        tools/
          architecture_tools.md
          current_time_tool.py
          web_search_tool.py
          save_note_tool.py
          http_request_tool.py
          tool_guardrails.py
          tool_registry.py
          tool_schemas.py
          database_query_tool.py
          industry_presets.py
          website_analyzer_tool.py
          ecommerce/
            __init__.py
            product_search_tool.py
            order_status_tool.py
            check_price_tool.py
          education/
            __init__.py
            course_search_tool.py
            course_info_tool.py
            save_progress_tool.py
          tourism/
            __init__.py
            hotel_search_tool.py
            itinerary_tool.py
            get_weather_tool.py
    web/
      package.json
      src/
        app/
        components/
```

Important status notes:

- `apps/agent-service/app/main.py` exists and exposes tool/debug endpoints
- `tool_execution_service.py` is implemented with domain scoping and runtime guardrails
- `tool_guardrails.py` exists and enforces runtime safety rules
- domain tools for `ecommerce`, `education`, and `tourism` exist
- `agents/` structure exists, but the LangGraph implementation is still mostly scaffolding
- `database_query_tool.py`, `industry_presets.py`, and `website_analyzer_tool.py` are placeholders for later work

---

## High-Level System Architecture

### Runtime flow

```text
User Query
   ↓
Frontend Builder / Chat UI
   ↓
Spring Boot API (Stas API)
   ↓
Python agent-service
   ├── FastAPI entrypoint
   ├── Router agent
   ├── Domain agent loop
   ├── Tool registry
   └── Guardrails + execution service
   ↓
Live Tracking events / Tool results
   ↓
Spring Boot streaming API
   ↓
Frontend timeline + chat
```

### Agent runtime model

```text
User Query
   ↓
Router
   ↓
ecommerce | education | tourism | general
   ↓
Domain Agent Loop
Think -> Act -> Observe -> repeat
   ↓
Final Answer
```

### Tool execution model

```text
Agent decides to call a tool
   ↓
execute_tool_call(...)
   ↓
Guardrail checks
  - valid domain
  - tool allowlist
  - step ceiling
  - safe logging
   ↓
Tool registry lookup
   ↓
Tool execution
   ↓
Unified ToolResult dict
```

---

## Team Responsibilities

The work is divided by ownership area. Everyone should stay inside their boundary unless they coordinate with the owner of the affected area.

### Alina

Primary responsibility: **Python/LangGraph agent logic and orchestration**

Alina owns the agent brain:

- router logic
- domain prompts
- LangGraph state
- execution loop behavior
- LLM integration
- final answer behavior
- Live Tracking event emission from the agent loop

Current target areas:

- `apps/agent-service/app/agents/`
- `apps/agent-service/app/agents/router/`
- `apps/agent-service/app/agents/domains/`

Concrete deliverables:

- implement `classify_domain()`
- implement domain-specific agent loops
- pass `domain` and `step_count` into `execute_tool_call()`
- keep the runtime aligned with the tool contracts defined by Sofia

### Sofia

Primary responsibility: **Python tool layer, guardrails, registry, and execution service**

Sofia owns the agent hands:

- tool schemas
- tool registry
- runtime guardrails
- tool execution safety
- tool result normalization
- local FastAPI service surface for tool/debug integration

Current target areas:

- `apps/agent-service/app/main.py`
- `apps/agent-service/app/services/tool_execution_service.py`
- `apps/agent-service/app/tools/`
- `apps/agent-service/requirements.txt`
- `apps/agent-service/structure.md`

Concrete deliverables:

- maintain shared tools
- maintain domain tool structure
- keep `get_tool_registry(domain)` and `get_available_tools(domain)` stable
- enforce runtime guardrails in code
- keep `execute_tool_call()` returning a unified ToolResult dict
- expose health / tool metadata / guardrail config endpoints for integration

Rule:

- Alina decides **when** a tool is called.
- Sofia defines **which tools exist** and **how they execute safely**.

### Stas API

Primary responsibility: **Spring Boot API, streaming, and frontend contracts**

Stas API owns the browser-facing backend surface:

- Spring Boot bootstrap
- REST controllers
- validation and DTOs
- SSE streaming
- proxying calls into the Python agent-service
- stable contracts for Polina and Rinata

Concrete deliverables:

- create `apps/backend`
- provide `/api/v1/health`
- provide agent/session/execution endpoints
- provide `/api/v1/agents/{agentId}/execute/stream`
- proxy Python runtime events to the frontend

### Stas Data

Primary responsibility: **PostgreSQL, JPA, persistence, and deployment storage**

Stas Data owns:

- database setup
- entities and repositories
- session/message persistence
- execution history persistence
- deployment settings persistence

Concrete deliverables:

- define backend persistence model
- store tool call history and execution steps
- later replace in-memory note/progress stubs with DB-backed behavior where needed

### Rinata

Primary responsibility: **frontend UI structure and demo-ready UX**

Rinata owns:

- builder experience
- onboarding flow
- prompt/tools/guardrails screens
- chat and timeline presentation
- deployment screen UI

Current direction:

- builder should be preset-driven
- domain selector should not hardcode values if `/domains` is available
- tool selection should use `/tool-types`

### Polina

Primary responsibility: **frontend integration and client-side data flow**

Polina owns:

- API clients
- stream consumption
- frontend execution state
- tool metadata loading
- builder state integration

Important integration contracts from Python:

- `GET /health`
- `GET /domains`
- `GET /tool-types`
- `GET /guardrails-config`
- `POST /execute-tool` for debug/integration

---

## Agent-Service Architecture

The Python `agent-service` now has three clear layers.

### 1. API layer

File:

- `apps/agent-service/app/main.py`

Current purpose:

- liveness endpoint
- domain listing endpoint
- tool metadata endpoint
- guardrail config endpoint
- direct tool execution endpoint for debug/testing

Current endpoints:

- `GET /health`
- `GET /domains`
- `GET /tool-types`
- `GET /guardrails-config`
- `POST /execute-tool`

### 2. Service layer

File:

- `apps/agent-service/app/services/tool_execution_service.py`

Current purpose:

- central execution entry point
- apply runtime safety checks
- return a normalized ToolResult object

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

### 3. Tools layer

Folder:

- `apps/agent-service/app/tools/`

Current purpose:

- shared tools
- domain tools
- schemas
- registry
- guardrail configuration

---

## Runtime Safety Model

Guardrails are enforced in code, not in prompts.

Current runtime guardrails include:

- domain validation
- tool allowlist by domain
- max step ceiling by domain
- HTTP request guardrails
- sensitive arg redaction in logs

Files involved:

- `apps/agent-service/app/tools/tool_guardrails.py`
- `apps/agent-service/app/tools/http_request_tool.py`
- `apps/agent-service/app/services/tool_execution_service.py`

Current domain step ceilings:

- `ecommerce`: 8
- `education`: 10
- `tourism`: 10
- `general`: 6

Tools currently marked as requiring human confirmation:

- `http_request`
- `save_progress`
- `save_note`

---

## Product Requirements Mapping

### 1. Visual Constructor

Current status:

- preset-based domain structure is defined
- tool metadata API exists
- domain list API exists
- builder UI is still frontend work

### 2. Autonomous Execution Engine

Current status:

- tool layer is strong
- runtime guardrails exist
- domain-aware tool execution exists
- full LangGraph agent loop is not implemented yet

### 3. Live Tracking

Current status:

- ToolResult contract exists with timestamps and duration
- event streaming from the agent loop is still pending

### 4. Deploy Anywhere

Current status:

- Python service exposes internal HTTP endpoints
- public deploy surfaces still belong to backend/API work

---

## Current Gaps

These items are intentionally not finished yet:

- LangGraph router and domain loops
- persisted memory / note / progress storage
- `database_query_tool.py`
- `industry_presets.py`
- `website_analyzer_tool.py`
- public deployment surfaces
- Spring Boot backend implementation

---

## Priority Order

Recommended build order from this point:

1. Finish LangGraph router and domain loops.
2. Integrate `domain` and `step_count` into Alina's execution path.
3. Connect Spring Boot to Python `agent-service`.
4. Build frontend against `/domains`, `/tool-types`, and `/guardrails-config`.
5. Add persistence-backed implementations where needed.
6. Add optional polish features like website analysis and richer presets.

---

## Target Repository Structure

The repo should keep moving toward this structure:

```text
AI-DIversssss/
  architecture.md
  apps/
    agent-service/
      requirements.txt
      structure.md
      app/
        main.py
        agents/
        services/
        tools/
    backend/
      src/
    web/
      src/
```

This is the intended split:

- `apps/agent-service` = Python runtime
- `apps/backend` = Spring Boot orchestration API
- `apps/web` = frontend builder and demo UI
