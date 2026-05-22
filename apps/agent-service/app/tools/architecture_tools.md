# Tools layer — achitecture & ownership

**Owner:** Sofia Prutska  
**Service:** `apps/agent-service`

---

## What is this folder?

This folder contains everything the agent needs to **act** — the actual tools it can call, their input schemas, the registry that maps names to functions, and the execution service that runs them safely.

If Alina's code is the **brain** (deciding what to do), this folder is the **hands** (doing it).

---

## Folder structure

```
apps/agent-service/app/
│
├── tools/
│   ├── architecture_tools.md       ← this file
│   ├── diagrams/
│   │   └── tool_execution_flow.svg ← tool execution flow diagram
│   ├── tool_schemas.py             ← Pydantic input schemas for every tool
│   ├── tool_registry.py            ← TOOL_REGISTRY + AVAILABLE_TOOLS
│   ├── current_time_tool.py        ← Tool: get current datetime
│   ├── web_search_tool.py          ← Tool: search the web
│   └── save_note_tool.py           ← Tool: save a note to session
│
├── services/
│   └── tool_execution_service.py   ← execute_tool_call() — central executor
│
├── __init__.py                     ← required for Python module resolution
└── test_tools.py                   ← local test runner, NOT for production
```

## File responsibilities

### `tool_schemas.py`
**What it is:** Pydantic `BaseModel` classes that define what arguments each tool accepts.

**Why it exists:** The agent (LLM) sends tool arguments as raw JSON. We need to validate them before running anything. Each tool has exactly one schema.

**Schemas defined here:**
| Schema class | Used by |
|---|---|
| `GetCurrentTimeInput` | `current_time_tool.py` |
| `SearchWebInput` | `web_search_tool.py` |
| `SaveNoteInput` | `save_note_tool.py` |

**⚠️ Change this file first** if we add a new tool — everything else depends on it.

---

### `tool_registry.py`
**What it is:** The master list of all available tools.

**Why it exists:** Two things need to know about tools:
1. The **LLM** — needs a list of tool names, descriptions, and input schemas to decide which one to call → `AVAILABLE_TOOLS`
2. The **executor** — needs to know which Python function to call → `TOOL_REGISTRY`

**Exports:**
```python
TOOL_REGISTRY: dict[str, Callable]   # "get_current_time" → execute_get_current_time
AVAILABLE_TOOLS: list[dict]          # [{name, description, input_schema}, ...]
get_tool_registry() -> dict          # getter function used by tool_execution_service
```

**Who imports this:**
- Alina imports `AVAILABLE_TOOLS` → passes to LLM in system prompt
- `tool_execution_service.py` imports `get_tool_registry()` → runs tools

---

### `current_time_tool.py`
**What it does:** Returns the current date and time, optionally in a given timezone.

**Status:** Fully implemented, no external dependencies.

**Functions:**
```python
get_current_time_tool() -> dict          # returns tool metadata for LLM
execute_get_current_time(args: dict) -> str  # runs the tool
```

**Example call:**
```
Input:  {"timezone": "Europe/Kyiv"}
Output: "2026-05-21T15:30:00+03:00"
```

---

### `web_search_tool.py`
**What it does:** Searches the web and returns a summary of results.

**Status:** Skeleton ready. Needs a real search API key on hackathon day.

**Current implementation:** Uses DuckDuckGo Instant Answers (no key needed, limited results).

**Recommended upgrade:** Replace with [Serper API](https://serper.dev) or [Brave Search API](https://api.search.brave.com) for better results.

**Functions:**
```python
search_web_tool() -> dict              # returns tool metadata for LLM
execute_search_web(args: dict) -> str  # runs the tool
```

**Example call:**
```
Input:  {"query": "latest AI news", "max_results": 3}
Output: "Summary: ...\n- Result 1\n- Result 2\n- Result 3"
```

**To upgrade on hackathon day:**
1. Get a free Serper API key at serper.dev
2. Replace `SEARCH_API_URL` and the request logic in `execute_search_web()`
3. Add `SERPER_API_KEY` to `.env` and `config.py`

---

### `save_note_tool.py`
**What it does:** Saves a note tied to the current chat session.

**Status:** Working stub (in-memory). Needs DB integration from Stas Data.

**Functions:**
```python
save_note_tool() -> dict              # returns tool metadata for LLM
execute_save_note(args: dict) -> str  # runs the tool
```

**To connect to DB** (coordinate with Stas Data):
```python
# Replace the in-memory append with:
from app.repositories.chat_repository import save_note_to_db
await save_note_to_db(session_id=validated.session_id, content=validated.content)
```

**Example call:**
```
Input:  {"session_id": "abc-123", "content": "User prefers metric units"}
Output: "Note saved successfully for session abc-123."
```

---

### `services/tool_execution_service.py`
**What it is:** The single entry point that the agent calls whenever it wants to use any tool.

**Status:** Fully implemented.

**Why it exists:** The agent shouldn't call tool functions directly — it calls `execute_tool_call()` and we handle everything: lookup, validation, execution, error catching.

**Function:**
```python
async def execute_tool_call(tool_name: str, args: dict) -> str
```

**Safety guarantees:**
- Unknown tool name → returns safe error string (never crashes)
- Invalid args → Pydantic catches it → returns descriptive error
- Runtime exception → caught, logged, returned as string
- Agent always gets back a string — never a raw exception

---

## How it all connects

```
┌───────────────────────────────────────────────────┐
│           Alina's Agent (agent_graph.py)          │
│                                                   │
│ Uses AVAILABLE_TOOLS to tell LLM what's available │
│ Calls execute_tool_call() when LLM picks a too    │
└───────────────────┬───────────────────────────────┘
                    │ execute_tool_call("search_web", {"query": "..."})
                    ▼
┌───────────────────────────────────────────────────┐
│           tool_execution_service.py               │
│                                                   │
│   1. Looks up "search_web" in TOOL_REGISTRY       │
│   2. Validates args with Pydantic schema          │
│   3. Calls execute_search_web(args)               │
│   4. Returns result string (or error string)      │
└─────────────────────┬─────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
  ┌──────────────┐ ┌──────────┐ ┌──────────────┐
  │current_time  │ │web_search│ │  save_note   │
  │   _tool.py   │ │ _tool.py │ │   _tool.py   │
  │              │ │          │ │              │
  │ stdlib only  │ │  httpx   │ │  DB / stub   │
  └──────────────┘ └──────────┘ └──────────────┘
```

---

## Adding a new tool (checklist)

If the hackathon task requires a new tool, follow this order:

- [ ] Add a new Pydantic schema in `tool_schemas.py`
- [ ] Create a new file `your_tool_name_tool.py` with `your_tool()` and `execute_your_tool()`
- [ ] Register it in `tool_registry.py` — both `TOOL_REGISTRY` and `AVAILABLE_TOOLS`
- [ ] Test it by calling `execute_tool_call("your_tool", {...})` directly
- [ ] Tell Alina — she may want to add tool-calling hints to the system prompt

---


## Diagram: tool execution flow

The diagram below shows one tool call from start to finish — from the agent's decision to the final result.

![Tool Execution Flow](./diagrams/tool_execution_flow.svg)


## Dependencies

```
requirements.txt entries needed for this layer:
  pydantic>=2.0
  httpx>=0.27        # for web_search_tool
  fastapi            # already in agent-service
```

No LangGraph, no LangChain needed in this folder.

---

### `test_tools.py` (local test runner)

**What it is:** A standalone script to verify that all tools work correctly
without needing the full FastAPI server, database, or Alina's agent.

**Status:** ✅ All 3 tests passing as of 2026-05-21

**How to run:**
```bash
cd apps/agent-service
python3 -m app.test_tools
```

**Expected output:**
```
✅ current_time: 2026-05-21T12:35:24+03:00
✅ unknown tool: Error: tool 'fake_tool' is not available. Available tools: ['get_current_time', 'search_web', 'save_note']
✅ invalid args: Error: invalid arguments for tool 'save_note'. Details: [...]
```

**What each test verifies:**

| Test | Input | Expected result | Status |
|---|---|---|---|
| `get_current_time` | `{"timezone": "Europe/Kyiv"}` | Current datetime with +03:00 offset | ✅ |
| `fake_tool` | `{}` | Safe error string with list of available tools | ✅ |
| `save_note` without args | `{}` | Pydantic catches missing `session_id` and `content` | ✅ |

**Important:** This file is for local testing only. Do not import it anywhere in production code.

---

## ⚠️ Import path note (read before touching tool_execution_service.py)

Current import in `services/tool_execution_service.py` line 4:
```python
from tools.tool_registry import get_tool_registry
```

This works when running tests via `python3 -m app.test_tools` from `agent-service/`.

When Stas Data connects `main.py`, the import may need to change depending on how he launches uvicorn. **Ask Stas this exact question before changing anything:**

> "Звідки ти запускаєш uvicorn — з `agent-service/` чи з `agent-service/app/`?"

**If he runs from `agent-service/` (standard):**
```bash
cd apps/agent-service
uvicorn app.main:app
```
→ change line 4 to:
```python
from app.tools.tool_registry import get_tool_registry
```

**If he runs from `agent-service/app/`:**
```bash
cd apps/agent-service/app
uvicorn main:app
```
→ keep line 4 as is:
```python
from tools.tool_registry import get_tool_registry
```

## Boundary rules (non-negotiable)

| Rule | Why |
|---|---|
| Alina calls tools, Sofia defines them | Clean separation of concerns |
| `execute_tool_call()` never raises | Agent must always get a string back |
| Each tool has exactly one Pydantic schema | Validation is always explicit |
| `save_note_tool` uses stub until DB is ready | No blocking on other people's work |
| No direct DB calls except in `save_note_tool` | Tools should be stateless where possible |