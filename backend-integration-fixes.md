# Backend Integration Fixes

This file lists the backend changes needed to match `architecture.md`, `apps/agent-service`, and the current frontend contract.

## Goal

Backend must be the bridge between frontend and the Python AI runtime:

```text
Frontend -> Spring Boot backend -> Python agent-service -> LLM + tools
```

Frontend must call only `/api/v1/*` backend routes. It must not call `apps/agent-service` directly.

## 1. Fix Tool Names And Categories

Current problem:

- backend uses old `ToolType` enum values:
  - `WEB_SEARCH`
  - `HTTP_REQUEST`
  - `DATABASE_QUERY`
- current `agent-service` uses these domains:
  - `education`
  - `tourism`
  - `ecommerce`
  - `general`
- current `agent-service` uses these tool keys:
  - shared/general: `get_current_time`, `search_web`, `save_note`, `http_request`
  - education: `course_search`, `course_info`, `save_progress`
  - tourism: `hotel_search`, `itinerary_plan`, `get_weather`
  - ecommerce: `product_search`, `order_status`, `check_price`

Required backend change:

- Prefer storing tool type as `String`, not Java enum.
- If enum is kept, it must include all real snake_case tool keys and must not use old names like `DATABASE_QUERY`.

Affected files:

```text
backend/src/main/java/com/aidivers/agenticstudio/tools/ToolType.java
backend/src/main/java/com/aidivers/agenticstudio/tools/AgentTool.java
backend/src/main/java/com/aidivers/agenticstudio/tools/AgentToolRequest.java
backend/src/main/java/com/aidivers/agenticstudio/tools/AgentToolResponse.java
backend/src/main/java/com/aidivers/agenticstudio/guardrails/Guardrail.java
backend/src/main/java/com/aidivers/agenticstudio/guardrails/GuardrailRequest.java
backend/src/main/java/com/aidivers/agenticstudio/guardrails/GuardrailResponse.java
```

Database note:

- `agent_tools.type` is already `VARCHAR(255)`, so the database can store snake_case tool names.
- The mismatch is mostly in Java DTO/entity mapping.

## 2. Fix `GET /api/v1/tool-types`

Current problem:

- backend returns a plain list of enum tool types.
- frontend expects an object with `categories`.

Required response shape:

```json
{
  "categories": [
    {
      "id": "education",
      "label": "Освіта",
      "description": "Tools for learning assistants, course search, course details, and student progress.",
      "tools": [
        {
          "type": "course_search",
          "name": "Course Search",
          "description": "Searches learning courses by topic, skill, or level.",
          "category": "education",
          "requiresHumanConfirmation": false,
          "configSchema": {}
        }
      ]
    }
  ]
}
```

Required categories:

```text
education
tourism
ecommerce
general
```

Required backend change:

- Update `ToolController.getToolTypes()` to return `ToolTypesResponse` with `categories`.
- The response should match frontend `ToolTypesResponse` in `apps/web/src/lib/types.ts`.
- Tool metadata can be hardcoded first, but should eventually proxy/derive from Python `GET /tool-types` and `/guardrails-config`.

Affected files:

```text
backend/src/main/java/com/aidivers/agenticstudio/tools/ToolController.java
backend/src/main/java/com/aidivers/agenticstudio/tools/ToolTypeResponse.java
```

## 3. Fix Tool Attach Endpoint

Current endpoint:

```text
POST /api/v1/agents/{agentId}/tools
```

Current problem:

- frontend sends `config` as an object.
- backend expects `configJson` as a JSON string.
- backend maps `type` through old `ToolType` enum.

Required request shape:

```json
{
  "type": "get_current_time",
  "category": "general",
  "name": "Get Current Time",
  "enabled": true,
  "config": {
    "timezone": "Europe/Kyiv"
  }
}
```

Required response shape:

```json
{
  "id": "uuid",
  "agentId": "uuid",
  "type": "get_current_time",
  "category": "general",
  "name": "Get Current Time",
  "enabled": true,
  "config": {
    "timezone": "Europe/Kyiv"
  },
  "createdAt": "2026-05-22T10:00:00Z",
  "updatedAt": "2026-05-22T10:00:00Z"
}
```

Required backend change:

- Accept `config` as object/map.
- Return `config` as object/map.
- Do not require frontend to stringify config manually.
- Store config in existing `agent_tools.config_json`.
- Store tool `type` as snake_case string.
- Add `category` to request/response. If the database does not store category yet, backend can derive it from tool type for MVP.

## 4. Add Or Confirm Agent CRUD Endpoints

Frontend already expects:

```text
GET  /api/v1/agents
POST /api/v1/agents
GET  /api/v1/agents/{agentId}
PUT  /api/v1/agents/{agentId}
```

Current problem:

- `AgentService` exists, but an `AgentController` was not found.

Required backend change:

- Add browser-facing `AgentController`.
- Request/response should match frontend `Agent`, `AgentDraft` in `apps/web/src/lib/types.ts`.
- Include attached tools, guardrails, and deployment settings if available.

## 5. Fix Session Creation Contract

Current frontend call:

```ts
createAgentSession(agentId, { title?: string })
```

Current backend request requires:

```text
source
title
```

Required backend change:

- Either make `source` optional and default it to `STUDIO`, or ask frontend to always send `source: "STUDIO"`.
- Recommended backend behavior:

```json
{
  "source": "STUDIO",
  "title": "New chat"
}
```

If fields are missing:

- `source` defaults to `STUDIO`
- `title` defaults to `"New chat"`

## 6. Fix Chat Execution Stream Contract

Current frontend path:

```text
POST /api/v1/agents/{agentId}/execute/stream
```

Frontend request should be simple:

```json
{
  "sessionId": "optional-session-uuid",
  "message": "User message",
  "metadata": {
    "domain": "general"
  }
}
```

Current backend problem:

- `sessionId` is expected as query param.
- body expects `messages`, `domain`, `useCase`, `maxSteps`, etc.
- backend forwards the frontend request too directly to Python.

Required backend behavior:

1. Accept `sessionId`, `message`, and optional `metadata` in the request body.
2. Load agent by `agentId`.
3. Load or create session.
4. Save the user message to `messages`.
5. Load enabled tools from `agent_tools`.
6. Load guardrails from `guardrails`.
7. Build the internal Python request.
8. Call Python `POST /internal/v1/agent/stream`.
9. Relay frontend-safe SSE events to the browser.
10. Persist execution, steps, tool calls, assistant final message, and errors.

Backend should not require frontend to send the full agent/tools/guardrails context.

## 7. Connect Backend To Python Agent Service

Current backend calls:

```text
POST /internal/v1/agent/stream
```

Current problem:

- Python `agent-service` does not currently expose this route.
- Python currently exposes:
  - `GET /health`
  - `GET /domains`
  - `GET /tool-types`
  - `GET /guardrails-config`
  - `POST /execute-tool`

Required team decision:

- AI team should add `POST /internal/v1/agent/stream`, because this is the architecture target.
- Backend should keep using `AGENT_SERVICE_URL` from `application.yml`.

Internal Python request should include:

```json
{
  "agent": {
    "id": "uuid",
    "name": "General Assistant",
    "systemPrompt": "You help users...",
    "modelProvider": "anthropic",
    "modelName": "claude-3-5-haiku-latest"
  },
  "domain": "general",
  "tools": [
    {
      "id": "uuid",
      "type": "get_current_time",
      "name": "Get Current Time",
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
    "id": "uuid",
    "source": "STUDIO"
  },
  "message": "User message",
  "executionId": "uuid"
}
```

## 8. SSE Event Names

Backend and frontend should use these event names:

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

Frontend rendering expectations:

- `message_delta` updates the assistant message in chat.
- `execution_completed` finalizes the assistant message.
- tool/execution events update Live Tracking.

## Acceptance Checklist

Backend is integration-ready when:

- `GET /api/v1/tool-types` returns `{ categories: [...] }`
- categories are `education`, `tourism`, `ecommerce`, `general`
- tool types are snake_case and match `agent-service`
- `POST /api/v1/agents/{agentId}/tools` accepts `config` object, not `configJson` string
- `POST /api/v1/agents/{agentId}/sessions` works with frontend payload or provides defaults
- `POST /api/v1/agents/{agentId}/execute/stream` accepts `{ sessionId, message, metadata }`
- backend builds the internal Python request itself
- backend calls Python through `AGENT_SERVICE_URL`
- backend does not require `LLM_API_KEY`
- frontend never calls Python or Claude directly
- SSE events use the shared names above

