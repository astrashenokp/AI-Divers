# database_query_tool — architecture and backend integration

**Файл:** `app/tools/database_query_tool.py`  
**Тип:** Shared tool  
**Режим:** Read-only  
**Статус:** Stub mode готовий. Для реальних даних потрібен `BACKEND_INTERNAL_URL`.

---

## 1. Purpose

`database_query_tool` — це безпечний shared tool для читання platform-level даних із системи.

Його задача:

- дати агенту одну точку входу для системних даних;
- не пускати LLM напряму в БД;
- не дозволяти raw SQL;
- не дублювати domain tools;
- працювати через backend internal API;
- тихо падати в stub mode, якщо backend тимчасово недоступний.

Це не “database console for the model”.  
Це platform read-only adapter.

---

## 2. Що він робить

Tool приймає `query_type` і невеликий allowlisted набір параметрів.  
Після цього він:

1. валідовує вхід через Pydantic;
2. формує запит у backend;
3. отримує safe DTO;
4. редагує чутливі поля;
5. повертає результат як рядок для LLM context.

---

## 3. Що він НЕ робить

Tool не має права:

- виконувати SQL, який придумала LLM;
- приймати довільні `filters: dict`;
- записувати або оновлювати дані;
- ходити напряму в PostgreSQL/MySQL;
- повертати секрети, токени, ключі, карткові дані;
- підміняти domain tools на кшталт `course_search`, `product_search`, `hotel_search`.

---

## 4. Scope

### Підходить для:

- session history
- agent config
- execution summary
- user progress

### Не підходить для:

- пошуку курсів
- пошуку товарів
- пошуку готелів
- будь-якої бізнесової доменної логіки, для якої вже є окремі tools

---

## 5. Runtime flow

```text
Agent decides it needs platform data
  ↓
database_query_tool(query_type, params)
  ↓
Pydantic validation
  ↓
query_type allowlist check
  ↓
POST /internal/v1/data/query
  ↓
Spring Boot backend
  ↓
service / repository layer
  ↓
database
  ↓
safe DTO
  ↓
_redact()
  ↓
formatted string result
  ↓
Agent receives observation and continues
```

Якщо backend недоступний:

```text
database_query_tool
  ↓
backend call fails
  ↓
fallback to stub data
  ↓
result starts with [backend unavailable]
```

---

## 6. Input contract

### Allowed query types

| `query_type` | Required fields | What it returns |
|---|---|---|
| `get_session_messages` | `session_id` | chat history for one session |
| `get_agent_config` | `agent_id` | agent config, tools, domain, limits |
| `get_execution_summary` | `session_id` or `execution_id` | execution logs / summary |
| `get_user_progress` | `user_id` | completed lessons/courses, optional `course_id` filter |

### Supported fields

| Field | Type | Notes |
|---|---|---|
| `query_type` | Literal enum | required |
| `session_id` | `str \| None` | used for session reads |
| `agent_id` | `str \| None` | used for agent config |
| `user_id` | `str \| None` | used for user progress |
| `course_id` | `str \| None` | optional progress filter |
| `execution_id` | `str \| None` | optional execution filter |
| `limit` | `int` | default 20, max 50 |

### Example payloads

```json
{
  "query_type": "get_session_messages",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "limit": 20
}
```

```json
{
  "query_type": "get_agent_config",
  "agent_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

```json
{
  "query_type": "get_execution_summary",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "limit": 5
}
```

```json
{
  "query_type": "get_user_progress",
  "user_id": "user-42",
  "course_id": "py-101",
  "limit": 10
}
```

---

## 7. Output contract

Tool завжди повертає **string**, бо agent runtime працює з tool observation як із текстом.

### Success example

```text
Results for 'get_session_messages':
[
  {
    "role": "user",
    "content": "Знайди курс Python",
    "created_at": "2026-05-22T10:00:00Z"
  },
  {
    "role": "assistant",
    "content": "Знайшов 3 курси...",
    "created_at": "2026-05-22T10:00:05Z"
  }
]
```

### Backend unavailable example

```text
[backend unavailable: Connection refused]
Results for 'get_session_messages':
[
  ...
]
```

### Empty example

```text
No results found for query_type='get_user_progress'.
```

---

## 8. Two runtime modes

### 1. Backend mode

Якщо в `.env` встановлений:

```env
BACKEND_INTERNAL_URL=http://backend:8080
BACKEND_INTERNAL_API_KEY=your-secret-key
```

tool працює з реальним backend endpoint.

### 2. Stub mode

Якщо `BACKEND_INTERNAL_URL` не встановлений або backend недоступний:

- tool не валить agent execution;
- повертає mock/stub data;
- додає `[backend unavailable]` у початок відповіді.

Це корисно для:

- локальної розробки;
- демо;
- тимчасового падіння backend;
- незалежного тестування AI runtime.

---

## 9. Guardrails

### Already enforced by schema/code

- `query_type` — strict allowlist через `Literal`
- required field combinations — через model-level validation
- read-only only
- no SQL field
- no generic open-ended filters dict
- max `limit = 50`
- timeout on backend call
- response truncation
- redaction of sensitive fields

### Sensitive fields redacted

Tool має маскувати принаймні:

- `password`
- `password_hash`
- `secret`
- `token`
- `api_key`
- `access_token`
- `refresh_token`
- `credit_card`
- `card_number`
- `cvv`

---

## 10. Backend integration

### Why backend should own this

Backend already owns:

- database access
- business permissions
- DTO shaping
- auditability
- internal auth

Тому Python runtime не має напряму знати SQL або DB credentials.

### Internal endpoint

Recommended endpoint:

```text
POST /internal/v1/data/query
```

Headers:

```text
Content-Type: application/json
X-Internal-Key: <secret>   # optional but strongly recommended
```

### Request payload from Python

```json
{
  "queryType": "get_session_messages",
  "sessionId": "uuid",
  "limit": 20
}
```

Allowed payload shapes:

| `queryType` | Fields |
|---|---|
| `get_session_messages` | `queryType`, `sessionId`, `limit` |
| `get_agent_config` | `queryType`, `agentId` |
| `get_execution_summary` | `queryType`, `sessionId` or `executionId`, `limit` |
| `get_user_progress` | `queryType`, `userId`, `courseId?`, `limit` |

### Expected backend response

Preferred response:

```json
{
  "items": [ ... ],
  "total": 2
}
```

Tool may also accept a bare list for flexibility, but `items` wrapper is cleaner.

### Recommended DTO rule

Backend should return only safe fields that are intended for AI context.

Do not return:

- password hashes
- auth tokens
- internal-only flags
- raw secrets
- hidden metadata not needed by the tool

---

## 11. Suggested Spring Boot controller shape

```java
@RestController
@RequestMapping("/internal/v1/data")
public class AgentDataController {

    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> query(
            @RequestHeader(value = "X-Internal-Key", required = false) String internalKey,
            @RequestBody AgentDataQueryRequest request) {

        if (!internalKeyValid(internalKey)) {
            return ResponseEntity.status(403).build();
        }

        return switch (request.getQueryType()) {
            case "get_session_messages" -> {
                var messages = chatService.getMessages(request.getSessionId(), request.getLimit());
                yield ResponseEntity.ok(Map.of("items", messages, "total", messages.size()));
            }
            case "get_agent_config" -> {
                var config = agentService.getConfig(request.getAgentId());
                yield ResponseEntity.ok(Map.of("items", List.of(config), "total", 1));
            }
            case "get_execution_summary" -> {
                var execs = executionService.getSummary(
                    request.getSessionId(), request.getExecutionId(), request.getLimit());
                yield ResponseEntity.ok(Map.of("items", execs, "total", execs.size()));
            }
            case "get_user_progress" -> {
                var progress = progressService.getProgress(
                    request.getUserId(), request.getCourseId(), request.getLimit());
                yield ResponseEntity.ok(Map.of("items", progress, "total", progress.size()));
            }
            default -> ResponseEntity.badRequest().body(Map.of("error", "Unknown queryType"));
        };
    }
}
```

---

## 12. How to wire it into agent-service

### 1. Add schema

Copy `DatabaseQueryInput` from `tool_schemas_addition.py` into:

`app/tools/tool_schemas.py`

### 2. Register tool

In `app/tools/tool_registry.py`:

```python
from .database_query_tool import database_query_tool, execute_database_query
```

Add to shared registry:

```python
"database_query": execute_database_query,
```

Add to shared tool metadata:

```python
database_query_tool(),
```

### 3. Allow it in guardrails

In `app/tools/tool_guardrails.py` add `database_query` only to domains where it is really useful.

Recommended initial policy:

- `education`: yes
- `general`: yes
- `ecommerce`: optional
- `tourism`: optional

If you want strict rollout, start with:

```python
"education"
"general"
```

### 4. Optionally expose in use cases

If a use case needs platform context, add it into `TOOLS_BY_USE_CASE` in domain prompts.

Example:

- education `learning_support`
- education `skill_development`
- general assistance flows that need session context

---

## 13. Domain usage guidance

### Best fit

- `education`
  read chat history, fetch user progress, inspect agent config

- `general`
  recover context, inspect agent/runtime configuration

### Conditional fit

- `ecommerce`
  maybe useful for execution history or agent config, but not for product search

- `tourism`
  maybe useful for session context, but not for hotel/trip data

### Important rule

This tool should not replace domain business tools.

If the agent needs:

- courses -> `course_search`
- products -> `product_search`
- hotels -> `hotel_search`

If the agent needs:

- session memory
- platform config
- execution history
- user learning progress

then `database_query` is appropriate.

---

## 14. Suggested tests

In `test_tools.py` add at least:

```python
# Stub mode
result = await execute_tool_call(
    "database_query",
    {"query_type": "get_session_messages", "session_id": "test-session", "limit": 5},
    execution_id="test-001",
)
assert result["status"] == "success"

# Invalid query_type
result = await execute_tool_call(
    "database_query",
    {"query_type": "drop_table_users"},
    execution_id="test-002",
)
assert result["status"] == "error"
assert result["error_type"] == "validation_error"
```

Also good:

- missing required field for valid `query_type`
- backend unavailable fallback
- response redaction
- response truncation

---

## 15. Future extensions

- pagination with cursor instead of only `limit`
- richer safe filters for specific query types
- separate DTOs for each query type
- audit log of every `database_query` tool call
- optional domain-based authorization rules
- more platform query types:
  - `get_tool_usage_stats`
  - `get_guardrail_violations`
  - `get_recent_failures`

---

## 16. Short summary

`database_query_tool` має бути не SQL-інструментом для моделі, а безпечним read-only adapter між agent runtime і backend data layer.

Правильна схема така:

```text
LLM -> database_query_tool -> backend internal API -> service/repository -> database
```

Так він:

- не ламає архітектуру;
- не обходить backend;
- легко документується;
- безпечно масштабується;
- не дублює domain tools.
