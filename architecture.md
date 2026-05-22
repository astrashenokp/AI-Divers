# Architecture.md

## Purpose

This document is the team's source of truth for the Agentic Studio hackathon project.

The most important goal of this file is to divide the work clearly between six people while keeping the architecture aligned with the product requirements:

- visual no-code / low-code agent builder
- autonomous agent execution loop
- real-time Live Tracking
- guardrails and human confirmation
- external deployment through REST API, webhook, or widget
- Spring Boot backend with PostgreSQL
- Python + LangGraph agent runtime
- existing Next.js frontend files and current Python tool files

If code and this document disagree, update this file first and then update the code.

---

## Product Direction

Project name: **Agentic Studio**

We are building a visual environment where a user can assemble an autonomous AI agent in minutes, give it tools, configure safety rules, watch its execution process in real time, and deploy it outside the studio.

The prototype must show that we are not building another hardcoded chatbot. The agent should be configurable, observable, tool-using, and reusable through external integration surfaces.

---

## Current Repository State

Relevant project files currently include:

```text
AI-Divers/
  architecture.md
  README.md
  apps/
    web/
      package.json
      src/
        app/
          page.tsx
          chat/page.tsx
          globals.scss
        components/
          chat/
            AgentThinkingPanel.tsx
            ChatHeader.tsx
            ChatLayout.tsx
            ChatMessageBubble.tsx
            ChatMessageList.tsx
    agent-service/
      app/
        architecture_tools.md
        current_time_tool.py
        web_search_tool.py
        save_note_tool.py
        tool_registry.py
        tool_execution_service.py
        tool_schemas.py
```

---

## Team Responsibilities

The work is divided by ownership area. Everyone should stay inside their boundary unless they coordinate with the owner of the affected area.

### Alina

Primary responsibility: **Python/LangGraph agent logic and orchestration**

Alina owns the agent's "brain":

- prompt architecture
- system prompt rules
- execution states
- reasoning flow
- LLM tool-use behavior
- final answer behavior

Current files connected to Alina's work:

- `apps/agent-service/app/architecture_tools.md`
- Python tool metadata exposed through `AVAILABLE_TOOLS` in the prototype registry

Target Python/LangGraph areas:

- `apps/agent-service/app/agents/`
- `apps/agent-service/app/agents/agent_graph.py`
- `apps/agent-service/app/agents/agent_state.py`
- `apps/agent-service/app/agents/prompts.py`
- `apps/agent-service/app/agents/chat_agent.py`

Concrete deliverables:

- define how the agent uses the configured system prompt
- design the Reasoning -> Action -> Observation -> Final Answer loop
- implement the LangGraph agent graph
- define Python agent state and transitions
- integrate the LLM provider from Python with native tool use where possible
- make sure every major execution step emits a Live Tracking event

### Sofia

Primary responsibility: **Python tool schemas, registry, and execution layer**

Sofia owns the agent's "hands":

- tool schemas
- tool registry
- tool execution rules
- tool validation
- tool result formatting
- tool call safety

Target Python/LangGraph areas:

- `apps/agent-service/app/architecture_tools.md`
- `apps/agent-service/app/current_time_tool.py`
- `apps/agent-service/app/web_search_tool.py`
- `apps/agent-service/app/save_note_tool.py`
- `apps/agent-service/app/tool_registry.py`
- `apps/agent-service/app/tool_execution_service.py`
- `apps/agent-service/app/tool_schemas.py`
- `apps/agent-service/app/tools/`
- `apps/agent-service/app/tools/tool_schemas.py`
- `apps/agent-service/app/tools/tool_registry.py`
- `apps/agent-service/app/tools/current_time_tool.py`
- `apps/agent-service/app/tools/web_search_tool.py`
- `apps/agent-service/app/tools/http_request_tool.py`
- `apps/agent-service/app/tools/database_query_tool.py`
- `apps/agent-service/app/services/tool_execution_service.py`

Concrete deliverables:

- keep tool work in Python
- implement available tool types: `web_search`, `http_request`, `database_query`
- implement tool config validation
- implement safe tool execution
- normalize tool results for the agent and for Live Tracking
- coordinate with Stas Data for persisted tool call history

Rule:

- Alina decides **when** the agent should call a tool.
- Sofia defines **which tools exist** and **how they execute safely**.

### Stas API

Primary responsibility: **Spring Boot API, streaming, and frontend contracts**

Stas API owns the backend surface that the frontend calls:

- Spring Boot app bootstrap
- REST controllers
- request and response DTOs
- validation
- CORS
- healthcheck
- SSE streaming for Live Tracking
- internal client for the Python LangGraph agent service
- frontend-safe errors

Target Spring Boot areas:

- `apps/backend/src/main/java/com/aidivers/agenticstudio/config/`
- `apps/backend/src/main/java/com/aidivers/agenticstudio/common/`
- `apps/backend/src/main/java/com/aidivers/agenticstudio/live/`
- controllers inside `agents/`, `tools/`, `sessions/`, `execution/`, and `deployments/`

Concrete deliverables:

- create Spring Boot app in `apps/backend`
- implement `/api/v1/health`
- implement agent CRUD endpoints
- implement tool and guardrail endpoints
- implement session endpoints
- implement `/api/v1/agents/{agentId}/execute/stream`
- proxy or relay execution events from `apps/agent-service`
- implement deployment endpoints for REST API, webhook, and widget config
- keep API contracts stable for Polina

### Stas Data

Primary responsibility: **PostgreSQL, JPA, persistence, and deployment storage**

Stas Data owns backend data integrity:

- PostgreSQL setup
- Spring Data JPA entities
- repositories
- database migrations if used
- persistence services
- session and message storage
- execution step storage
- tool call history storage
- deployment settings storage

Target Spring Boot areas:

- entities and repositories across `agents/`, `tools/`, `guardrails/`, `sessions/`, `execution/`, and `deployments/`
- `apps/backend/src/main/resources/application.yml`
- Docker Compose database configuration

Concrete deliverables:

- configure PostgreSQL for local development
- define JPA entities for the domain model in this document
- implement repositories
- persist agents, tools, guardrails, sessions, messages, executions, steps, tool calls, and deployments
- expose persistence through Spring Boot services so the Python agent runtime does not own database structure
- coordinate with Sofia so `save_note` or equivalent memory features use backend persistence instead of in-memory storage

Rule:

- Stas API owns browser-facing contracts.
- Stas Data owns database structure and persistence contracts.
- API or schema contract changes must be discussed before merging.

### Rinata

Primary responsibility: **frontend UI structure, components, and demo-ready UX**

Rinata owns the visual product experience:

- product layout
- visual builder screens
- prompt editor UI
- tool connector UI
- guardrail UI
- test chat UI
- Live Tracking timeline presentation
- deployment settings UI
- empty, loading, and error states

Current files owned by Rinata:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/chat/page.tsx`
- `apps/web/src/app/page.module.scss`
- `apps/web/src/app/chat/page.module.scss`
- `apps/web/src/components/chat/`
- `apps/web/src/app/globals.scss`

Target frontend areas:

- `apps/web/src/app/agents/`
- `apps/web/src/components/builder/`
- `apps/web/src/components/live-tracking/`
- `apps/web/src/components/deployments/`
- existing `apps/web/src/components/chat/`

Concrete deliverables:

- evolve the current chat template into Agentic Studio
- implement agent list and agent builder screens
- implement `PromptEditor`
- implement `ToolConnectorPanel`
- implement `GuardrailPanel`
- implement `LiveTrackingTimeline`
- implement `DeploymentPanel`
- keep the UI demo-ready even before all backend endpoints are finished

### Polina

Primary responsibility: **frontend integration and client-side data flow**

Polina owns how frontend state talks to the backend:

- API client functions
- SSE stream consumption
- builder state
- session state
- message send flow
- execution event state
- deployment settings integration

Current frontend integration gap:

- `apps/web/src/app/chat/page.tsx` currently uses mock data.
- There is no `apps/web/src/lib/`, `apps/web/src/hooks/`, or `apps/web/src/store/` yet.

Target frontend areas:

- `apps/web/src/lib/`
- `apps/web/src/hooks/`
- `apps/web/src/store/`

Concrete deliverables:

- define `API_BASE_URL`
- implement API helpers for agents, tools, guardrails, sessions, execution, and deployments
- implement `useAgentExecutionStream()`
- connect mock chat UI to real backend streaming
- keep frontend state synchronized with Live Tracking events
- coordinate event names with Stas API

Rule:

- Rinata owns presentation.
- Polina owns data flow.
- Shared components should receive data through props and must not hardcode backend behavior.

---

## Product Requirements

### 1. Visual Constructor

The user must be able to configure an agent without writing backend code.

Required UI capabilities:

- create and edit an agent
- edit the base system prompt
- connect tools
- configure tool settings
- configure guardrails
- test the agent in a chat-like interface
- see the live execution trace
- prepare deployment settings

Required tool categories:

- web search
- HTTP requests
- database queries

Required guardrails:

- maximum agent steps
- forbidden topics
- human confirmation before selected tool calls

### 2. Autonomous Execution Engine

The agent must run as an execution loop, not as a single chat completion.

Required loop:

1. Reasoning
2. Action, when a tool is needed
3. Observation from the tool result
4. Next reasoning step or final answer

The loop stops when:

- the task is solved
- `maxSteps` is reached
- a guardrail blocks the request
- human confirmation is required
- an execution error happens

The LLM provider should support native tool use. The backend must keep the provider behind an adapter so the team can use a free-tier or low-cost model during development and switch providers later.

### 3. Live Tracking

The frontend must show the agent's process in real time.

Required event types:

- execution started
- reasoning step
- tool call started
- tool call finished
- guardrail blocked
- human confirmation required
- message delta
- execution completed
- execution failed

The user should see what the agent is doing without reading backend logs.

### 4. Deploy Anywhere

An agent must not live only inside the studio.

Required deployment surfaces:

- public REST API endpoint
- webhook endpoint
- embeddable widget or iframe configuration

The first demo may implement one surface fully and stub the others, but the architecture must support all three.

---

## Technology Stack

### Frontend

- Next.js
- TypeScript
- React
- Sass modules
- `lucide-react`

Current frontend package:

- `apps/web/package.json`

Current local frontend command:

```bash
cd apps/web
npm run dev
```

### Backend

Main backend stack owned by Stas API and Stas Data:

- Java 21
- Spring Boot
- Spring Web
- Spring Data JPA
- PostgreSQL
- Docker
- Docker Compose

Recommended backend addition:

- Spring AI only if it helps the Spring Boot API layer. The agent runtime itself is Python/LangGraph.

### Agent Runtime

Agent runtime stack owned by Alina and Sofia:

- Python
- LangGraph
- Pydantic for tool schemas
- async tool execution
- optional FastAPI or another small HTTP layer for internal communication with Spring Boot

Current agent runtime files:

- `apps/agent-service/app` contains the Python tool layer and should become the LangGraph agent runtime.
- New agent orchestration code should be added in Python under `apps/agent-service/app/agents/`.
- Alina and Sofia should not be assigned Spring Boot implementation tasks.

---

## Target Repository Structure

The repo should move toward this structure:

```text
AI-Divers/
  architecture.md
  README.md
  apps/
    web/
      src/
        app/
          page.tsx
          chat/
          agents/
        components/
          chat/
          builder/
          live-tracking/
          deployments/
          ui/
        hooks/
        lib/
        store/
    backend/
      src/
        main/
          java/com/aidivers/agenticstudio/
            AgenticStudioApplication.java
            config/
            common/
            agents/
            tools/
            guardrails/
            execution/
            sessions/
            deployments/
            live/
            llm/
          resources/
            application.yml
        test/
      Dockerfile
      .env.example
    agent-service/
      app/
        agents/
          agent_graph.py
          agent_state.py
          chat_agent.py
          prompts.py
        tools/
          tool_schemas.py
          tool_registry.py
          current_time_tool.py
          web_search_tool.py
          http_request_tool.py
          database_query_tool.py
        services/
          tool_execution_service.py
        main.py
      requirements.txt
      Dockerfile
      .env.example
  infra/
    docker/
  docker-compose.yml
```

Spring Boot product API and persistence code should go into `apps/backend`.

Python agent runtime and LangGraph code should go into `apps/agent-service`.

---

## Backend Architecture

The backend has two cooperating parts:

- `apps/backend`: Spring Boot product API, persistence, deployment settings, and frontend-facing streaming
- `apps/agent-service`: Python/LangGraph agent runtime, prompts, graph state, and tool execution

Spring Boot responsibilities:

- expose REST API endpoints for the frontend
- manage agents, sessions, tools, guardrails, and deployment settings
- validate incoming requests
- store and retrieve data from PostgreSQL
- call the Python agent service to execute autonomous agent runs
- relay streaming execution events for Live Tracking
- expose agents externally through REST API, webhook, or embeddable widget config

Spring Boot modules:

- `agents`: agent CRUD, prompt config, model config
- `tools`: saved tool configuration and frontend-visible tool type metadata
- `guardrails`: saved safety settings
- `execution`: execution request handling and event relay
- `sessions`: chat/test sessions and message history
- `deployments`: external REST/webhook/widget settings
- `live`: SSE event formatting and publishing
- `agentclient`: internal client for `apps/agent-service`

Python agent-service responsibilities:

- build and run the LangGraph graph
- apply agent-side prompt and state transitions
- use configured tools during execution
- emit structured execution events
- return final answer and tool results to Spring Boot
- keep tool logic in Python

---

## Agent Execution Design

Agent execution is owned by Alina in Python with LangGraph.

Recommended execution states:

- `LOAD_CONTEXT`
- `CHECK_INPUT_GUARDRAILS`
- `REASON`
- `CALL_TOOL`
- `OBSERVE_TOOL_RESULT`
- `CHECK_STEP_LIMIT`
- `REQUEST_HUMAN_CONFIRMATION`
- `GENERATE_FINAL_ANSWER`
- `COMPLETE`
- `BLOCK`
- `FAIL`

Recommended Python modules/classes:

- `build_agent_graph()`
- `run_agent_turn()`
- `stream_agent_turn()`
- `AgentState`
- `AgentStep`
- `SYSTEM_PROMPT`
- `ToolRegistry`
- `execute_tool_call()`
- `LiveTrackingEvent`

Spring Boot should not duplicate the LangGraph logic. It should call the Python agent service, persist the results, and stream events to the frontend.

Rules:

- the agent should answer directly when no tool is needed
- the agent should call tools only when they materially improve the answer
- the agent must never invent tool results
- the agent must stop at `maxSteps`
- every major step must be persisted and streamed
- tool errors must be returned as structured execution events

---

## Tool Design

Tool execution is owned by Sofia in Python.

Current Python tools:

- `get_current_time`
- `search_web`
- `save_note`

Target product tool types:

- `web_search`
- `http_request`
- `database_query`

Frontend tool categories for the `/tools` page:

- `education` - UI label: `Освіта`
- `tourism` - UI label: `Туризм`
- `ecommerce` - UI label: `E-commerce (Продажі)`
- `other` - UI label: `Інше`

These categories are frontend-facing product groupings. They do not replace the execution tool types above. A category contains one or more tool templates. For example, `ecommerce` may contain an `http_request` tool template for product or order data, while `tourism` may contain a `web_search` or `http_request` template for travel information.

Python tool executor pattern:

```python
TOOL_REGISTRY = {
    "web_search": execute_web_search,
    "http_request": execute_http_request,
    "database_query": execute_database_query,
}

async def execute_tool_call(tool_name: str, args: dict) -> str:
    ...
```

Tool safety rules:

- validate tool configuration when attached to an agent
- validate tool input before execution
- apply guardrails before risky tool calls
- redact secrets in Live Tracking events
- store tool call input, output, status, and error details
- return structured errors instead of crashing an agent run

---

## Guardrail Design

Minimum guardrail outcomes:

- `ALLOW`
- `BLOCK`
- `REQUIRE_HUMAN_CONFIRMATION`

Minimum guardrail checks:

- max step count
- forbidden topic detection
- tool requires human confirmation

When a guardrail blocks or pauses execution, the backend must:

- persist the execution status
- emit a Live Tracking event
- return a clear frontend-safe message

---

## Live Tracking Design

Preferred transport:

- Server-Sent Events

Endpoint:

```text
POST /api/v1/agents/{agentId}/execute/stream
```

SSE event names:

- `execution_started`
- `reasoning_step`
- `tool_call_started`
- `tool_call_finished`
- `guardrail_blocked`
- `human_confirmation_required`
- `message_delta`
- `execution_completed`
- `execution_failed`

Frontend rendering requirements:

- step number
- step type
- short summary
- tool name when applicable
- status
- timestamp
- expandable input/output JSON for technical demo viewers

Do not stream secrets, API keys, database credentials, or full private tool configs to the browser.

---

## API Contract

All backend routes use:

```text
/api/v1
```

Required routes:

```text
GET  /api/v1/health

GET  /api/v1/agents
POST /api/v1/agents
GET  /api/v1/agents/{agentId}
PUT  /api/v1/agents/{agentId}

GET  /api/v1/tool-types
POST /api/v1/agents/{agentId}/tools
PUT  /api/v1/agents/{agentId}/guardrails

POST /api/v1/agents/{agentId}/sessions
GET  /api/v1/sessions/{sessionId}/messages

POST /api/v1/agents/{agentId}/execute/stream

PUT  /api/v1/agents/{agentId}/deployment
POST /api/v1/public/agents/{deploymentSlug}/execute
POST /api/v1/public/webhooks/{deploymentSlug}
GET  /api/v1/public/widgets/{deploymentSlug}/config
```

Internal Spring Boot -> Python agent-service route:

```text
POST /internal/v1/agent/stream
```

This internal endpoint is implemented by `apps/agent-service` and streams structured agent events back to Spring Boot. The browser never calls the Python service directly.

---

## Frontend, Backend, and AI Runtime Connection Contract

This section defines how Rinata/Polina frontend work connects to Stas API/Stas Data backend work and Alina/Sofia AI runtime work.

Core rule:

- the frontend never calls `apps/agent-service` directly
- the frontend calls only Spring Boot routes under `/api/v1`
- Spring Boot owns persistence, validation, public API routes, and SSE relay
- Python agent-service owns agent reasoning, tool execution, and internal event generation
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
10. Python runs the LangGraph loop and executes tools through Sofia's tool execution layer.
11. Python emits internal execution events to Spring Boot.
12. Spring Boot persists execution, steps, and tool call history.
13. Spring Boot streams frontend-safe SSE events to the browser.
14. Frontend renders the final answer in chat and renders execution steps in Live Tracking.

Frontend must treat tools as configuration, not as directly callable browser functions.

Frontend may show:

- tool category cards
- tool template cards
- enabled/disabled state
- simple public config fields
- Live Tracking tool call status

Frontend must not:

- execute `web_search`, `http_request`, or `database_query` directly from the browser
- send API keys or database credentials to the browser
- call `http://localhost:8001` or any Python agent-service route
- invent tool results when streaming data is not available

Backend must expose tool templates in a frontend-friendly shape:

```json
{
  "categories": [
    {
      "id": "education",
      "label": "Освіта",
      "description": "Tools for learning assistants, course search, tutoring, and knowledge lookup",
      "tools": [
        {
          "type": "web_search",
          "name": "Education Web Search",
          "description": "Searches public learning resources",
          "requiresHumanConfirmation": false,
          "configSchema": {
            "allowedDomains": "string[]"
          }
        }
      ]
    },
    {
      "id": "tourism",
      "label": "Туризм",
      "description": "Tools for travel research, destinations, routes, and recommendations",
      "tools": []
    },
    {
      "id": "ecommerce",
      "label": "E-commerce (Продажі)",
      "description": "Tools for product lookup, order status, sales workflows, and customer requests",
      "tools": []
    },
    {
      "id": "other",
      "label": "Інше",
      "description": "General tools for tasks that do not fit the main categories yet",
      "tools": []
    }
  ]
}
```

Frontend attaches a tool to an agent through Spring Boot:

```json
{
  "type": "web_search",
  "name": "Education Web Search",
  "category": "education",
  "enabled": true,
  "config": {
    "allowedDomains": ["wikipedia.org", "coursera.org"]
  }
}
```

Backend stores this in `agent_tools` and sends only validated, redacted config to Python.

Internal Spring Boot -> Python execution request:

```json
{
  "agent": {
    "id": "agent-123",
    "name": "Education Assistant",
    "systemPrompt": "You help students understand topics clearly.",
    "modelProvider": "anthropic",
    "modelName": "claude-3-5-haiku-latest"
  },
  "guardrails": {
    "maxSteps": 6,
    "forbiddenTopics": [],
    "requireHumanConfirmationForTools": ["database_query"]
  },
  "tools": [
    {
      "id": "agent-tool-1",
      "type": "web_search",
      "name": "Education Web Search",
      "config": {
        "allowedDomains": ["wikipedia.org", "coursera.org"]
      }
    }
  ],
  "session": {
    "id": "session-123",
    "source": "STUDIO"
  },
  "message": {
    "role": "user",
    "content": "Поясни, що таке LangGraph"
  }
}
```

Python agent-service must emit events using the shared SSE event names. Event payloads must be structured and frontend-safe:

```json
{
  "event": "tool_call_started",
  "executionId": "execution-123",
  "stepIndex": 2,
  "toolName": "web_search",
  "summary": "Searching public learning resources",
  "status": "RUNNING",
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
- Sofia owns Python tool schema validation and safe tool execution
- Alina owns when the agent decides to use an attached tool

Example create agent request:

```json
{
  "name": "Research Assistant",
  "description": "Helps research topics using tools",
  "systemPrompt": "You are a careful research assistant.",
  "modelProvider": "anthropic",
  "modelName": "claude-3-5-haiku-latest"
}
```

Example guardrail request:

```json
{
  "maxSteps": 6,
  "forbiddenTopics": ["medical diagnosis", "illegal activity"],
  "requireHumanConfirmationForTools": ["DATABASE_QUERY"]
}
```

---

## Database Design

PostgreSQL is the main persistent storage for:

- users or demo users
- agents
- agent configurations
- tools connected to agents
- guardrails
- chat sessions
- messages
- agent executions
- agent execution steps
- tool call history
- deployment settings

Required tables:

- `users`
- `agents`
- `agent_tools`
- `guardrails`
- `chat_sessions`
- `messages`
- `agent_executions`
- `agent_execution_steps`
- `tool_call_history`
- `deployment_settings`

Minimum fields:

```text
users: id, display_name, email, created_at
agents: id, owner_id, name, description, system_prompt, model_provider, model_name, created_at, updated_at
agent_tools: id, agent_id, type, name, config_json, enabled, created_at
guardrails: id, agent_id, max_steps, forbidden_topics_json, human_confirmation_tools_json, created_at, updated_at
chat_sessions: id, agent_id, source, title, created_at, updated_at
messages: id, session_id, role, content, created_at
agent_executions: id, agent_id, session_id, status, started_at, completed_at, error_message
agent_execution_steps: id, execution_id, step_index, type, summary, input_json, output_json, created_at
tool_call_history: id, execution_id, agent_tool_id, tool_name, input_json, output_json, status, created_at
deployment_settings: id, agent_id, deployment_slug, rest_enabled, webhook_enabled, widget_enabled, public_access_enabled, created_at, updated_at
```

Accepted session sources:

- `STUDIO`
- `REST_API`
- `WEBHOOK`
- `WIDGET`

Accepted execution statuses:

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

Target frontend screens:

- agent list
- agent builder
- prompt editor
- tool configuration
- guardrail configuration
- test chat
- Live Tracking panel
- deployment settings

Target component groups:

- `components/chat`: reusable chat shell and message UI
- `components/builder`: agent configuration UI
- `components/live-tracking`: execution timeline
- `components/deployments`: REST/webhook/widget UI
- `lib`: API clients and constants
- `hooks`: data and streaming hooks
- `store`: shared frontend state if needed

Polina should connect the existing mock `AgentThinkingPanel` concept to real SSE events. Rinata should evolve it visually into the Live Tracking timeline.

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

Docker Compose should start at minimum:

- PostgreSQL database
- Spring Boot backend application
- Python LangGraph agent service

Expected local services:

- frontend: `http://localhost:3000`
- backend: `http://localhost:8080`
- agent service: `http://localhost:8001`
- PostgreSQL: `localhost:5432`

Backend should not depend on manually installed local PostgreSQL.

Target command:

```bash
docker compose up
```

The frontend can be started separately:

```bash
cd apps/web
npm run dev
```

---

## Environment Variables

Backend `.env.example` target:

```env
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/agentic_studio
SPRING_DATASOURCE_USERNAME=agentic
SPRING_DATASOURCE_PASSWORD=agentic
LLM_PROVIDER=anthropic
LLM_MODEL_NAME=claude-3-5-haiku-latest
LLM_API_KEY=
AGENT_SERVICE_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000
APP_ENV=development
```

Agent service `.env.example` target:

```env
AGENT_SERVICE_PORT=8001
LLM_PROVIDER=anthropic
LLM_MODEL_NAME=claude-3-5-haiku-latest
LLM_API_KEY=
SPRING_BACKEND_URL=http://localhost:8080
APP_ENV=development
```

Frontend `.env.local.example` target:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

---

## Naming Rules

Java:

- packages use lowercase
- classes use `PascalCase`
- methods use `camelCase`
- constants use `UPPER_SNAKE_CASE`
- controllers end with `Controller`
- services end with `Service`
- repositories end with `Repository`
- request/response objects may use `Request` and `Response` suffixes

TypeScript:

- React components use `PascalCase`
- hooks start with `use`
- helpers use `camelCase`
- constants use `UPPER_SNAKE_CASE`

Python/LangGraph:

- files use `snake_case`
- classes use `PascalCase`
- functions use `snake_case`
- constants use `UPPER_SNAKE_CASE`
- Alina and Sofia's production agent/runtime code belongs in Python under `apps/agent-service`

---

## Required Constants

Backend event constants:

```java
public static final String API_V1_PREFIX = "/api/v1";
public static final String EVENT_EXECUTION_STARTED = "execution_started";
public static final String EVENT_REASONING_STEP = "reasoning_step";
public static final String EVENT_TOOL_CALL_STARTED = "tool_call_started";
public static final String EVENT_TOOL_CALL_FINISHED = "tool_call_finished";
public static final String EVENT_GUARDRAIL_BLOCKED = "guardrail_blocked";
public static final String EVENT_HUMAN_CONFIRMATION_REQUIRED = "human_confirmation_required";
public static final String EVENT_MESSAGE_DELTA = "message_delta";
public static final String EVENT_EXECUTION_COMPLETED = "execution_completed";
public static final String EVENT_EXECUTION_FAILED = "execution_failed";
```

Frontend constants:

```ts
export const APP_TITLE = "Agentic Studio";
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
export const AGENTS_PATH = "/api/v1/agents";
export const TOOL_TYPES_PATH = "/api/v1/tool-types";
```

---

## First Implementation Plan

1. Stas API creates `apps/backend` Spring Boot app and health endpoint.
2. Stas Data adds PostgreSQL Docker Compose and JPA entities.
3. Alina creates the Python LangGraph skeleton in `apps/agent-service/app/agents`.
4. Sofia organizes Python tools under `apps/agent-service/app/tools` and adds `http_request` / `database_query`.
5. Polina creates frontend API/SSE integration utilities.
6. Rinata evolves current chat UI into builder, Live Tracking, and deployment screens.
7. Stas API connects Spring Boot to the Python agent service and relays execution events.

The first demo should prioritize:

- create/edit agent prompt
- attach at least one tool
- configure max steps
- run a test message
- show Live Tracking events
- show at least one external deployment option

---

## Final Decision Summary

We are building Agentic Studio, not a single hardcoded chatbot.

The final architecture is:

- Next.js frontend in `apps/web`
- Spring Boot backend in `apps/backend`
- Python/LangGraph agent runtime in `apps/agent-service`
- PostgreSQL persistence
- SSE Live Tracking
- autonomous execution loop
- configurable tools and guardrails
- deployable agents through REST API, webhook, or widget
