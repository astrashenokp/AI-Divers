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
LLM provider integration is owned by the AI runtime team:

- the Python agent-service reads `LLM_PROVIDER=groq`, `LLM_MODEL_NAME`, and `GROQ_API_KEY`
- the Python agent-service calls the external LLM provider through Groq API
- the Python agent-service owns prompt formatting, model adapter logic, native tool-use integration, and LLM response parsing
- the Spring Boot backend must not call Groq or any other external LLM provider directly for normal agent execution
- the Next.js frontend must never receive or store `GROQ_API_KEY` or any other LLM secret

Current agent runtime files:

- `apps/agent-service/app` contains the Python tool layer and should become the LangGraph agent runtime.
- New agent orchestration code should be added in Python under `apps/agent-service/app/agents/`.
- Alina and Sofia should not be assigned Spring Boot implementation tasks.

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
---

## Frontend, Backend, and AI Runtime Connection Contract

This section defines how Rinata/Polina frontend work connects to Stas API/Stas Data backend work and Alina/Sofia AI runtime work.

Core rule:

- the frontend never calls `apps/agent-service` directly
- the frontend calls only Spring Boot routes under `/api/v1`
- Spring Boot owns persistence, validation, public API routes, and SSE relay
- Python agent-service owns agent reasoning, tool execution, and internal event generation
- Python agent-service owns external LLM provider calls and uses `GROQ_API_KEY`
- Spring Boot does not call Groq or any other external LLM provider directly in the MVP agent execution path
- the frontend never receives `GROQ_API_KEY` or any other LLM secret and never calls any LLM provider directly
- Spring Boot sends agent configuration and attached tools to Python through `POST /internal/v1/agent/stream`
- Python streams structured events back to Spring Boot
- Spring Boot persists those events and relays frontend-safe events to the browser

End-to-end flow:

1. Frontend loads available tool categories and templates from `GET /api/v1/tool-types`.
2. User selects tools on the frontend and configures an agent.
3. Frontend saves the agent through `POST /api/v1/agents` or `PUT /api/v1/agents/{agentId}`.
4. Frontend attaches selected tools through `POST /api/v1/agents/{agentId}/tools`.
5. Backend validates and persists the selected tools in `agent_tools`.
6. User sends a test message in the chat.
7. Frontend opens execution through `POST /api/v1/agents/{agentId}/execute/stream`.
8. Backend loads the agent, tools, guardrails, session, and previous messages.
9. Backend calls Python `POST /internal/v1/agent/stream` with the full agent execution context.
10. Python uses its configured LLM provider adapter to call Groq.
11. Python runs the LangGraph loop and executes tools through Sofia's tool execution layer.
12. Python emits internal execution events to Spring Boot.
13. Spring Boot persists execution, steps, and tool call history.
14. Spring Boot streams frontend-safe SSE events to the browser.
15. Frontend renders the final answer in chat and renders execution steps in Live Tracking.

Frontend must treat tools as configuration, not as directly callable browser functions.

Frontend may show:

- tool category cards
- tool template cards
- enabled/disabled state
- simple public config fields
- Live Tracking tool call status

Frontend must not:

- execute `search_web`, `http_request`, `save_note`, or any other tool directly from the browser
- send API keys or database credentials to the browser
- send `GROQ_API_KEY` or any LLM provider secret to the browser
- call Groq or another LLM provider directly
- call `http://localhost:8001` or any Python agent-service route
- invent tool results when streaming data is not available

Backend must expose tool templates in a frontend-friendly shape.

The backend response must use the same domains and snake_case tool keys as `apps/agent-service`.
Do not expose old enum values such as `WEB_SEARCH`, `HTTP_REQUEST`, or `DATABASE_QUERY` as the public tool contract.

```json
{
  "categories": [
    {
      "id": "education",
      "label": "Education",
      "description": "Tools for learning assistants, course search, course details, and student progress",
      "tools": [
        {
          "type": "course_search",
          "name": "Course Search",
          "description": "Searches learning courses by topic, skill, or level",
          "category": "education",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        },
        {
          "type": "course_info",
          "name": "Course Info",
          "description": "Returns details for a specific course",
          "category": "education",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        },
        {
          "type": "save_progress",
          "name": "Save Progress",
          "description": "Saves student lesson progress",
          "category": "education",
          "requiresHumanConfirmation": true,
          "configSchema": {}
        }
      ]
    },
    {
      "id": "tourism",
      "label": "Tourism",
      "description": "Tools for travel research, destinations, routes, and recommendations",
      "tools": [
        {
          "type": "hotel_search",
          "name": "Hotel Search",
          "description": "Searches hotels by city, dates, and guest count",
          "category": "tourism",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        },
        {
          "type": "itinerary_plan",
          "name": "Itinerary Plan",
          "description": "Builds a travel plan for a destination",
          "category": "tourism",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        },
        {
          "type": "get_weather",
          "name": "Get Weather",
          "description": "Returns a weather forecast for a city",
          "category": "tourism",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        }
      ]
    },
    {
      "id": "ecommerce",
      "label": "E-commerce",
      "description": "Tools for product lookup, order status, sales workflows, and customer requests",
      "tools": [
        {
          "type": "product_search",
          "name": "Product Search",
          "description": "Searches products by name, keyword, or category",
          "category": "ecommerce",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        },
        {
          "type": "order_status",
          "name": "Order Status",
          "description": "Checks order status and tracking information",
          "category": "ecommerce",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        },
        {
          "type": "check_price",
          "name": "Check Price",
          "description": "Checks price and availability for a product",
          "category": "ecommerce",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        }
      ]
    },
    {
      "id": "general",
      "label": "General",
      "description": "Shared tools for general assistant tasks",
      "tools": [
        {
          "type": "get_current_time",
          "name": "Get Current Time",
          "description": "Returns the current date and time for a timezone",
          "category": "general",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        },
        {
          "type": "search_web",
          "name": "Search Web",
          "description": "Searches the web for current information",
          "category": "general",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        },
        {
          "type": "save_note",
          "name": "Save Note",
          "description": "Saves an important note for the current session",
          "category": "general",
          "requiresHumanConfirmation": true,
          "configSchema": {}
        },
        {
          "type": "http_request",
          "name": "HTTP Request",
          "description": "Calls a public external API with runtime guardrails",
          "category": "general",
          "requiresHumanConfirmation": true,
          "configSchema": {}
        }
      ]
    }
  ]
}
```

Frontend attaches a tool to an agent through Spring Boot:

```json
{
  "type": "get_current_time",
  "name": "Get Current Time",
  "category": "general",
  "enabled": true,
  "config": {
    "timezone": "Europe/Kyiv"
  }
}
```

Backend stores this in `agent_tools` and sends only validated, redacted config to Python.

Internal Spring Boot -> Python execution request:

```json
{
  "executionId": "execution-123",
  "agent": {
    "id": "agent-123",
    "name": "General Assistant",
    "systemPrompt": "You help users clearly and safely.",
    "modelProvider": "groq",
    "modelName": "llama-3.1-8b-instant"
  },
  "domain": "general",
  "guardrails": {
    "maxSteps": 6,
    "forbiddenTopics": [],
    "requireHumanConfirmationForTools": ["save_note", "http_request"]
  },
  "tools": [
    {
      "id": "agent-tool-1",
      "type": "search_web",
      "name": "Search Web",
      "category": "general",
      "enabled": true,
      "config": {
        "max_results": 3
      }
    }
  ],
  "session": {
    "id": "session-123",
    "source": "STUDIO"
  },
  "message": {
    "role": "user",
    "content": "Explain how agent tools work"
  }
}
```

### Backend -> AI Runtime Implementation Instructions

This subsection is for the Spring Boot backend team. It defines exactly how the backend connects frontend requests to the Python AI runtime.

Backend owns the integration bridge:

```text
Frontend `/api/v1/*` request
   -> Spring Boot controller
   -> Spring Boot service loads persisted data
   -> Spring Boot client calls Python `agent-service`
   -> Python streams runtime events
   -> Spring Boot persists and relays frontend-safe SSE events
   -> Frontend renders chat + Live Tracking
```

Backend must not ask the frontend to send the full agent runtime context. The frontend sends only user-facing input. Backend loads the rest from persistence.

#### Required Spring Boot Configuration

Backend must use `AGENT_SERVICE_URL` for Python calls:

```yaml
agent-service:
  url: ${AGENT_SERVICE_URL:http://localhost:8001}
```

Backend must not define or require:

```text
LLM_API_KEY
GROQ_API_KEY
NEXT_PUBLIC_LLM_API_KEY
```

LLM provider secrets belong only to `apps/agent-service`.

#### Public Frontend Endpoint

Frontend calls Spring Boot:

```text
POST /api/v1/agents/{agentId}/execute/stream
Accept: text/event-stream
Content-Type: application/json
```

Frontend request body:

```json
{
  "sessionId": "optional-session-uuid",
  "message": "User message",
  "metadata": {
    "domain": "general"
  }
}
```

Rules:

- `sessionId` belongs in the JSON body, not only as a query parameter.
- `message` is the raw user message from the chat composer.
- `metadata.domain` may be provided by the frontend when the user entered chat from a category such as `/chat?domain=general`.
- if `metadata.domain` is missing, backend may use a saved agent domain or default to `general` for MVP.

#### Backend Data Loading Before Python Call

When `POST /api/v1/agents/{agentId}/execute/stream` is called, backend must:

1. load the agent from `agents`
2. load or create the chat session in `chat_sessions`
3. save the user message in `messages`
4. load enabled tools from `agent_tools`
5. load guardrails from `guardrails`
6. create an `agent_executions` row with status `RUNNING`
7. build the internal Python request
8. call Python `POST /internal/v1/agent/stream`
9. relay SSE events to the frontend
10. persist execution steps and tool call history as events arrive
11. save the final assistant message when execution completes
12. mark the execution `COMPLETED`, `FAILED`, or `BLOCKED`

Backend must not simply forward the frontend request body to Python. Backend must enrich it with trusted persisted context.

#### Internal Python Endpoint

Backend calls Python:

```text
POST {AGENT_SERVICE_URL}/internal/v1/agent/stream
Accept: text/event-stream
Content-Type: application/json
```

The Python team must expose this endpoint. If it does not exist yet, backend should keep the client code ready but cannot complete end-to-end execution.

Internal request shape:

```json
{
  "executionId": "execution-uuid",
  "agent": {
    "id": "agent-uuid",
    "name": "General Assistant",
    "description": "Answers general user requests",
    "systemPrompt": "You help users clearly and safely.",
    "modelProvider": "groq",
    "modelName": "llama-3.1-8b-instant"
  },
  "domain": "general",
  "tools": [
    {
      "id": "agent-tool-uuid",
      "type": "get_current_time",
      "name": "Get Current Time",
      "category": "general",
      "enabled": true,
      "config": {
        "timezone": "Europe/Kyiv"
      }
    }
  ],
  "guardrails": {
    "maxSteps": 6,
    "forbiddenTopics": [],
    "requireHumanConfirmationForTools": ["save_note", "http_request"]
  },
  "session": {
    "id": "session-uuid",
    "source": "STUDIO"
  },
  "messages": [
    {
      "role": "user",
      "content": "User message"
    }
  ]
}
```

Notes:

- `tools[].type` must be snake_case and match `agent-service`.
- `tools[].config` must be an object, not a stringified JSON blob.
- backend may include previous session messages if needed for context.
- backend should send only frontend-safe and redacted tool config to Python.
- backend must not send database credentials, API keys, or private secrets to the browser.

#### Tool Storage Rules

Backend database may store `agent_tools.type` as `VARCHAR`.

Recommended Java mapping:

```java
private String type;
```

Avoid using a narrow `ToolType` enum for persisted attached tools because tools are owned by `agent-service` and may change. If a Java enum is used, it must include every current tool key:

```text
get_current_time
search_web
save_note
http_request
course_search
course_info
save_progress
hotel_search
itinerary_plan
get_weather
product_search
order_status
check_price
```

Backend attach-tool request should accept:

```json
{
  "type": "search_web",
  "category": "general",
  "name": "Search Web",
  "enabled": true,
  "config": {
    "max_results": 3
  }
}
```

Backend attach-tool response should return the same shape plus ids and timestamps:

```json
{
  "id": "agent-tool-uuid",
  "agentId": "agent-uuid",
  "type": "search_web",
  "category": "general",
  "name": "Search Web",
  "enabled": true,
  "config": {
    "max_results": 3
  },
  "createdAt": "2026-05-22T12:00:00Z",
  "updatedAt": "2026-05-22T12:00:00Z"
}
```

Frontend should not have to send or parse `configJson` strings.

#### Backend SSE Relay Rules

Backend should relay these event names to the browser:

```text
execution_started
reasoning_step
tool_call_started
tool_call_finished
guardrail_blocked
human_confirmation_required
message_delta
execution_completed
execution_failed
```

Every frontend-safe event should use this general payload shape:

```json
{
  "executionId": "execution-uuid",
  "stepIndex": 2,
  "toolName": "search_web",
  "summary": "Searching the web for current information",
  "status": "running",
  "timestamp": "2026-05-22T12:00:00Z",
  "input": {},
  "output": {}
}
```

Status values sent to frontend should be lowercase:

```text
running
completed
failed
blocked
waiting_for_human
```

For assistant streaming:

```json
{
  "delta": "partial assistant text"
}
```

or:

```json
{
  "output": {
    "delta": "partial assistant text"
  }
}
```

For final answer:

```json
{
  "finalMessage": "Final assistant answer"
}
```

or:

```json
{
  "output": {
    "finalMessage": "Final assistant answer"
  }
}
```

The current frontend stream parser supports both direct and `output.*` variants.

#### Persistence During Streaming

Backend should persist:

- `agent_executions`: one row per run
- `agent_execution_steps`: one row for reasoning/tool/guardrail/message events where useful
- `tool_call_history`: one row per tool call
- `messages`: user message before execution and final assistant message after completion

Suggested mapping:

```text
execution_started -> create or update agent_executions
reasoning_step -> agent_execution_steps
tool_call_started -> agent_execution_steps + tool_call_history RUNNING
tool_call_finished -> update tool_call_history COMPLETED + agent_execution_steps
guardrail_blocked -> update execution BLOCKED + agent_execution_steps
human_confirmation_required -> agent_execution_steps
message_delta -> relay only; persist final message on completion
execution_completed -> update execution COMPLETED + save assistant message
execution_failed -> update execution FAILED
```

#### Backend Acceptance Checklist

Backend is ready for Polina/frontend integration when:

- `GET /api/v1/tool-types` returns `{ "categories": [...] }`
- tool categories are exactly `education`, `tourism`, `ecommerce`, and `general`
- tool keys are snake_case and match `apps/agent-service`
- `POST /api/v1/agents/{agentId}/tools` accepts and returns `config` as an object
- `POST /api/v1/agents/{agentId}/sessions` works with frontend defaults or defaults missing fields to `STUDIO` and `"New chat"`
- `POST /api/v1/agents/{agentId}/execute/stream` accepts `{ "sessionId", "message", "metadata" }`
- backend loads agent, tools, guardrails, session, and previous messages itself
- backend calls Python only through `AGENT_SERVICE_URL`
- backend does not require or expose `GROQ_API_KEY`
- backend relays SSE events with the shared event names
- backend persists execution, steps, tool calls, and final messages

Python agent-service must emit events using the shared SSE event names. Event payloads must be structured and frontend-safe:

```json
{
  "event": "tool_call_started",
  "executionId": "execution-123",
  "stepIndex": 2,
  "toolName": "search_web",
  "summary": "Searching the web for current information",
  "status": "running",
  "timestamp": "2026-05-22T12:00:00Z"
}
```

Frontend rendering contract:

- `message_delta` updates the assistant message in chat
- `execution_completed` finalizes the assistant message
- `reasoning_step`, `tool_call_started`, `tool_call_finished`, `guardrail_blocked`, `human_confirmation_required`, and `execution_failed` update Live Tracking
- frontend displays `summary`, `stepIndex`, `toolName`, `status`, and `timestamp`
- frontend may show expandable JSON only when backend marks it frontend-safe

Ownership:

- Rinata owns how categories, tool cards, chat, and Live Tracking look
- Polina owns API client functions and SSE state handling
- Stas API owns `/api/v1/tool-types`, agent tool attach routes, and SSE relay
- Stas Data owns persisted `agent_tools`, executions, steps, and tool call history
- Stas API owns `AGENT_SERVICE_URL` usage and the Spring Boot client that calls Python
- Stas API must not require `GROQ_API_KEY` for the normal MVP execution flow
- Sofia owns Python tool schema validation and safe tool execution
- Alina owns when the agent decides to use an attached tool
- Alina owns Python LLM provider integration and model adapter behavior
- Sofia coordinates with Alina so Python tool schemas are compatible with native LLM tool use

Example create agent request:

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

- `RUNNING`
- `COMPLETED`
- `FAILED`
- `BLOCKED`
- `WAITING_FOR_HUMAN`

---

## Frontend Architecture

Current frontend:

- `/` explains what Agentic Studio is and links to the main product areas.
- `/tools` shows the basic frontend tool categories: `Освіта`, `Туризм`, `E-commerce (Продажі)`, `Інше`.
- `/chat` is a test chat with visible tool activity.
- chat components already exist and should be reused.

Current purpose:

- shared tools
- domain tools
- schemas
- registry
- guardrail configuration

---

## AI Diver Guide

### Purpose

Agentic Studio includes an interactive in-product helper called **AI Diver Guide**.

The guide is represented by a small robot diver mascot wearing a swimming mask and snorkel. The mascot supports the product metaphor: users are "diving" into agent creation, tool configuration, Live Tracking, and deployment.

The goal of AI Diver Guide is to make the product easier for first-time users and safer during presentations. Agentic Studio has several advanced concepts such as prompts, tools, guardrails, Live Tracking, sessions, and deployments. The guide helps users understand what to do next and recover when something goes wrong.

AI Diver Guide is not part of the core agent execution engine. It is a frontend product assistant and onboarding layer.

### User Experience

On the user's first visit, AI Diver Guide appears near the main input, composer, or primary action area and asks:

```text
First dive? I can help you create your first agent or fix a problem.
```

The guide should provide action buttons such as:

- `Create first agent`
- `Explain this screen`
- `I have a problem`
- `Hide`

The guide must be dismissible. After dismissal, it should collapse into a small helper icon and should not block the main workflow.

The guide may reappear automatically only for important events such as backend connection failure, stream failure, guardrail blocking, or deployment configuration problems.

### Interaction Modes

AI Diver Guide supports four interaction modes.

#### 1. First-Time Onboarding

The guide helps a new user complete the first successful agent setup:

1. choose an agent template
2. edit the system prompt
3. enable at least one tool
4. configure a simple guardrail such as `maxSteps`
5. run a test message
6. view Live Tracking events
7. copy or preview a deployment option

This mode supports the product requirement that a user should be able to create and test an agent quickly.

#### 2. Contextual Help

The guide shows screen-specific help based on the current product area:

- Agent Builder: explains agent name, description, and system prompt
- Tool Configuration: explains what tools allow the agent to do
- Guardrails: explains max steps, forbidden topics, and human confirmation
- Test Chat: explains how to run an agent task
- Live Tracking: explains reasoning steps, tool calls, observations, and final answer events
- Deployments: explains REST API, webhook, and widget options

#### 3. Troubleshooting

The guide can react to frontend-visible problems:

- backend is unreachable
- healthcheck fails
- SSE stream fails
- malformed stream event is received
- no agent is selected
- agent prompt is empty
- no tools are enabled
- guardrail blocks execution
- human confirmation is required
- deployment slug or widget configuration is missing

For example, when the backend is unreachable, the guide may show:

```text
I cannot reach the backend. You can check the health endpoint or continue in mock mode.
```

Possible actions:

- `Check backend health`
- `Retry`
- `Run mock mode`
- `Show debug info`

#### 4. Demo Mode

The guide may include a demo-safe path that helps the team show the product in a predictable order:

1. create a starter agent
2. enable one tool
3. set `maxSteps`
4. run a test task
5. show Live Tracking
6. copy widget code
7. open the external widget preview

This mode is optional but useful for presenting the product reliably.

### MVP Implementation Strategy

For the MVP, AI Diver Guide should be implemented as a frontend rule-based assistant.

It should not require an LLM or backend endpoint in the first version. This keeps the feature reliable and prevents it from blocking the core agent execution work.

The guide can decide what to show based on:

- current route
- whether this is the user's first visit
- selected agent state
- builder completion state
- API health state
- stream state
- latest execution error
- latest Live Tracking event
- deployment configuration state

A future version may connect AI Diver Guide to a backend help endpoint, but this is not required for the first version.

### Frontend Ownership

Rinata owns the visual presentation of the guide:

- mascot design
- popover/bubble UI
- animations
- positioning near the composer or primary action area
- responsive behavior
- Sass styling

Suggested UI files:

```text
apps/web/src/components/help/AiDiverGuide.tsx
apps/web/src/components/help/AiDiverMascot.tsx
apps/web/src/components/help/AiDiverBubble.tsx
apps/web/src/components/help/AiDiverActionChips.tsx
apps/web/src/components/help/AiDiverGuide.module.scss
```

Polina owns the guide's client-side logic and integration state:

- guide triggers
- guide rules
- localStorage persistence
- API health integration
- stream error integration
- action callbacks for mock mode, retry, and guided setup

Suggested integration files:

```text
apps/web/src/lib/guideTypes.ts
apps/web/src/lib/guideRules.ts
apps/web/src/hooks/useAiDiverGuide.ts
apps/web/src/store/guideStore.ts
```

### Suggested TypeScript Model

```ts
export type GuideTrigger =
  | "first_visit"
  | "builder_empty"
  | "agent_missing_prompt"
  | "no_tools_selected"
  | "backend_unreachable"
  | "stream_failed"
  | "guardrail_blocked"
  | "human_confirmation_required"
  | "deployment_not_configured"
  | "demo_mode";

export type GuideActionType =
  | "start_guided_setup"
  | "explain_screen"
  | "insert_template"
  | "add_default_tool"
  | "set_safe_guardrails"
  | "check_backend_health"
  | "retry_stream"
  | "run_mock_mode"
  | "open_widget_preview"
  | "dismiss";

export type GuideAction = {
  id: string;
  label: string;
  type: GuideActionType;
};

export type GuideMessage = {
  id: string;
  trigger: GuideTrigger;
  title: string;
  body: string;
  actions: GuideAction[];
};

export type GuideContext = {
  route: string;
  isFirstVisit: boolean;
  hasSelectedAgent: boolean;
  hasSystemPrompt: boolean;
  enabledToolCount: number;
  backendReachable: boolean | null;
  isStreaming: boolean;
  latestExecutionStatus?:
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "BLOCKED"
    | "WAITING_FOR_HUMAN";
  deploymentConfigured: boolean;
};
```

### Behavior Rules

Minimum guide behavior:

- show first-visit onboarding once
- store dismissal state in `localStorage`
- collapse into a small icon after dismissal
- reappear for critical errors
- never block the main workflow
- never display secrets, API keys, database credentials, or private tool configs
- provide short, actionable messages
- keep advanced explanations behind action buttons

### Example Messages

First visit:

```text
First dive? I can help you create your first agent or fix a problem.
```

Agent builder empty:

```text
Start by choosing a template or writing a clear role for your agent.
```

No tools enabled:

```text
Your agent can answer, but it cannot act yet. Add a tool to show real agent behavior.
```

Stream failure:

```text
The live stream stopped unexpectedly. You can retry or switch to mock mode.
```

Guardrail blocked:

```text
A guardrail stopped this execution. Check the blocked topic or reduce the request risk.
```

Deployment not configured:

```text
Your agent works in the studio. Enable a widget or API deployment to use it outside.
```

### Future Extension

In a future version, AI Diver Guide may become an AI-powered assistant that uses the current product context to generate personalized help.

Possible backend route:

```text
POST /api/v1/help/guide
```

However, this route is not required for the MVP. The first version should stay frontend-only and rule-based for reliability.

---

## Docker and Local Development

Docker is used to make local development predictable for all team members.

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
## Environment Variables

Backend `.env.example` target:

```env
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/agentic_studio
SPRING_DATASOURCE_USERNAME=agentic
SPRING_DATASOURCE_PASSWORD=agentic
AGENT_SERVICE_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000
APP_ENV=development
```

### 1. Visual Constructor

Current status:

- preset-based domain structure is defined
- tool metadata API exists
- domain list API exists
- builder UI is still frontend work
LLM environment ownership:

- `LLM_PROVIDER=groq`, `LLM_MODEL_NAME`, and `GROQ_API_KEY` belong to `apps/agent-service`
- Spring Boot uses `AGENT_SERVICE_URL` to call Python and does not need the LLM key in the MVP path
- Next.js must never define `NEXT_PUBLIC_LLM_API_KEY` or any other public LLM secret
- for local demos, use a low-cost Groq-hosted model such as `llama-3.1-8b-instant` and keep mock mode available when credits or rate limits are unavailable

Frontend `.env.local.example` target:

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
- Next.js frontend in `apps/web`
- Spring Boot backend in `apps/backend`
- Python/LangGraph agent runtime in `apps/agent-service`
- PostgreSQL persistence
- SSE Live Tracking
- autonomous execution loop
- configurable tools and guardrails
- deployable agents through REST API, webhook, or widget
