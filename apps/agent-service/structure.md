# Agentic Studio — Domain Structure & Tool Contract

**Версія:** 1.0  
**Дата:** 2026-05-22  
**Статус:** ЗАТВЕРДЖЕНО — від цього документу відштовхуємось усі

---

## 1. Мова системи

Агент **завжди відповідає українською**.

Реалізація через system prompt кожного доменного агента:
```
"Ти завжди відповідаєш українською мовою, незалежно від мови запиту користувача."
```

Модель: **Claude claude-sonnet-4-6** (Anthropic) — найкраще підтримує українську серед безкоштовних/доступних LLM.  
Fallback якщо немає ключа: **Gemini 1.5 Flash** (також добре знає українську).

---

## 2. Архітектура: Router + Domain Agents

```
User Query
    ↓
ROUTER (1 LLM call — classify_domain)
    ↓
┌──────────┬────────────┬──────────┬──────────┐
│ecommerce │ education  │ tourism  │ general  │
└──────────┴────────────┴──────────┴──────────┘
    ↓ кожен домен — окремий agent loop
Think → Act (tool call) → Observe → repeat → Final Answer
```

**Router** отримує запит і повертає один з: `ecommerce | education | tourism | general`  
**General** — fallback якщо жоден домен не підходить.

---

## 3. Домени, Use Cases, Tools

### 3.1 🛒 E-commerce

**System prompt hint:**
> "Ти — розумний асистент інтернет-магазину. Допомагаєш з пошуком товарів, цінами, статусом замовлень. Відповідаєш лише українською."

**Use cases:** customer_support, order_tracking, product_recommendation

**Domain tools:**

| Tool | Опис | Вхідні параметри |
|------|------|-----------------|
| `product_search` | Шукає товари за назвою або категорією | `query: str`, `category: str = ""`, `max_results: int = 5` |
| `order_status` | Перевіряє статус і трекінг замовлення | `order_id: str` |
| `check_price` | Повертає ціну і наявність конкретного товару | `product_id: str` |

**Shared tools також доступні:** `web_search`, `current_time`, `http_request`, `save_note`

---

### 3.2 🎓 Education

**System prompt hint:**
> "Ти — освітній асистент. Допомагаєш знайти курси, отримати інформацію про навчання та зберегти прогрес. Відповідаєш лише українською."

**Use cases:** learning_support, course_info, skill_development

**Domain tools:**

| Tool | Опис | Вхідні параметри |
|------|------|-----------------|
| `course_search` | Шукає курси за темою або навичкою | `query: str`, `level: str = "any"`, `max_results: int = 5` |
| `course_info` | Детальна інформація про конкретний курс | `course_id: str` |
| `save_progress` | Зберігає прогрес студента по уроку | `user_id: str`, `course_id: str`, `lesson_id: str` |

**Shared tools також доступні:** `web_search`, `current_time`, `http_request`, `save_note`

---

### 3.3 🏨 Tourism

**System prompt hint:**
> "Ти — туристичний асистент. Допомагаєш з плануванням подорожей, пошуком готелів та маршрутів. Відповідаєш лише українською."

**Use cases:** trip_planning, destination_info, booking_support

**Domain tools:**

| Tool | Опис | Вхідні параметри |
|------|------|-----------------|
| `hotel_search` | Шукає готелі в місті за датами | `city: str`, `check_in: str`, `check_out: str`, `guests: int = 2` |
| `itinerary_plan` | Складає план подорожі по місту або країні | `destination: str`, `days: int`, `interests: str = ""` |
| `get_weather` | Повертає прогноз погоди для локації | `city: str`, `days: int = 3` |

**Shared tools також доступні:** `web_search`, `current_time`, `http_request`, `save_note`

---

### 3.4 🌐 General

**System prompt hint:**
> "Ти — універсальний AI-асистент. Допомагаєш з будь-якими запитами. Відповідаєш лише українською."

**Use cases:** будь-що поза іншими доменами

**Domain tools:** немає — тільки shared tools

**Shared tools:** `web_search`, `current_time`, `http_request`, `save_note`

---

## 4. Shared Tools (всі домени)

| Tool | Опис | Вхідні параметри |
|------|------|-----------------|
| `get_current_time` | Поточна дата і час | `timezone: str = "UTC"` |
| `search_web` | Пошук в інтернеті | `query: str`, `max_results: int = 3` |
| `save_note` | Зберігає нотатку для сесії | `session_id: str`, `content: str` |
| `http_request` | HTTP запит до зовнішнього API | `url: str`, `method: str = "GET"`, `headers: dict`, `body: str` |

---

## 5. Структура файлів

```
apps/agent-service/app/
│
├── tools/                              ← SOFIA
│   ├── __init__.py
│   ├── tool_schemas.py                 ← ВСІ Pydantic schemas (shared + domain)
│   ├── tool_registry.py                ← get_tool_registry(domain) + get_available_tools(domain)
│   │
│   ├── current_time_tool.py            ← shared ✅ готово
│   ├── web_search_tool.py              ← shared ✅ готово
│   ├── save_note_tool.py               ← shared ✅ готово
│   ├── http_request_tool.py            ← shared ✅ готово
│   │
│   ├── ecommerce/
│   │   ├── __init__.py
│   │   ├── product_search_tool.py      ← domain tool
│   │   ├── order_status_tool.py        ← domain tool
│   │   └── check_price_tool.py         ← domain tool
│   │
│   ├── education/
│   │   ├── __init__.py
│   │   ├── course_search_tool.py       ← domain tool
│   │   ├── course_info_tool.py         ← domain tool
│   │   └── save_progress_tool.py       ← domain tool
│   │
│   └── tourism/
│       ├── __init__.py
│       ├── hotel_search_tool.py        ← domain tool
│       ├── itinerary_tool.py           ← domain tool
│       └── get_weather_tool.py         ← domain tool
│
├── agents/                             ← ALINA
│   ├── __init__.py
│   ├── agent_graph.py                  ← головний граф: router → domain agent
│   ├── agent_state.py                  ← AgentState TypedDict
│   │
│   ├── router/
│   │   ├── router.py                   ← classify_domain() → "ecommerce"|"education"|"tourism"|"general"
│   │   └── prompts.py                  ← промпт роутера
│   │
│   └── domains/
│       ├── ecommerce/
│       │   ├── graph.py                ← Think→Act→Observe цикл для ecommerce
│       │   └── prompts.py              ← system prompt українською
│       ├── education/
│       │   ├── graph.py
│       │   └── prompts.py
│       ├── tourism/
│       │   ├── graph.py
│       │   └── prompts.py
│       └── general/
│           ├── graph.py
│           └── prompts.py
│
└── services/
    └── tool_execution_service.py       ← SOFIA ✅ готово

```

---

## 6. Контракт між Sofia і Alina

### Sofia надає Аліні:

```python
# 1. Tools для конкретного домену
from tools.tool_registry import get_available_tools, get_tool_registry

tools_meta = get_available_tools(domain="ecommerce")
# → список dict [{name, description, input_schema}, ...]
# Передається в LLM як список доступних інструментів

tools_exec = get_tool_registry(domain="ecommerce")
# → dict {"product_search": execute_fn, "search_web": execute_fn, ...}
# Використовується в execute_tool_call()

# 2. Виконання tool call
from services.tool_execution_service import execute_tool_call

result = await execute_tool_call(
    tool_name="product_search",
    args={"query": "навушники", "max_results": 3},
    execution_id="exec-abc-123",
)
# result — завжди dict:
# {
#   "tool_name": "product_search",
#   "status": "success" | "error",
#   "result": "...",
#   "started_at": "2026-05-22T...",
#   "completed_at": "2026-05-22T...",
#   "duration_ms": 45,
#   "execution_id": "exec-abc-123",
#   "error_type": None | "unknown_tool" | "validation_error" | "blocked" | "runtime_error"
# }
```

### Правило межі:
- **Alina** вирішує **коли** і **який** tool викликати
- **Sofia** вирішує **що** tool робить і **як** виконується безпечно

---

## 7. Tool Schema Contract

Всі Pydantic schemas живуть **тільки** в `tool_schemas.py`.  
Жоден tool file не оголошує власну schema — тільки імпортує.

```python
# tool_schemas.py — повний список schemas

# Shared
class GetCurrentTimeInput(BaseModel): ...
class SearchWebInput(BaseModel): ...
class SaveNoteInput(BaseModel): ...
class HttpRequestInput(BaseModel): ...

# Ecommerce
class ProductSearchInput(BaseModel): ...
class OrderStatusInput(BaseModel): ...
class CheckPriceInput(BaseModel): ...

# Education
class CourseSearchInput(BaseModel): ...
class CourseInfoInput(BaseModel): ...
class SaveProgressInput(BaseModel): ...

# Tourism
class HotelSearchInput(BaseModel): ...
class ItineraryInput(BaseModel): ...
class GetWeatherInput(BaseModel): ...
```

---

## 8. Guardrails Contract

Guardrails живуть **в коді**, не в промпті.

| Guardrail | Де реалізований | Error type |
|-----------|----------------|------------|
| Blocked internal URLs | `http_request_tool.py` | `blocked` |
| Disallowed HTTP methods | `http_request_tool.py` | `blocked` |
| Max steps | `agents/domains/*/graph.py` (Alina) | agent stops |
| Forbidden topics | `agents/domains/*/graph.py` (Alina) | agent stops |

---

## 9. Live Tracking Events

Кожен крок агента генерує SSE подію для фронтенду:

| Event | Коли | Дані |
|-------|------|------|
| `execution_started` | Початок виконання | `execution_id`, `domain` |
| `reasoning_step` | LLM думає | `thought` text |
| `tool_call_started` | Перед `execute_tool_call()` | `tool_name`, `args` |
| `tool_call_finished` | Після `execute_tool_call()` | повний ToolResult dict |
| `execution_completed` | Фінальна відповідь | `answer` text |
| `execution_failed` | Критична помилка | `error` message |

Sofia забезпечує: `tool_call_finished` завжди містить повний ToolResult з `duration_ms`.  
Alina забезпечує: всі інші події генеруються в agent graph.

---

## 10. Пріоритети реалізації

### Sofia (tools layer)
| # | Що | Статус |
|---|----|----|
| 1 | `tool_execution_service.py` з dict contract | ✅ Done |
| 2 | `http_request_tool.py` з guardrails | ✅ Done |
| 3 | `tool_schemas.py` — додати domain schemas | 🔧 In progress |
| 4 | `tool_registry.py` з `get_tool_registry(domain)` | 🔧 In progress |
| 5 | `ecommerce/` tools (3 files) | 🔧 In progress |
| 6 | `education/` tools (3 files) | 🔧 In progress |
| 7 | `tourism/` tools (3 files) | ❌ Todo |
| 8 | Оновити `test_tools.py` | ❌ Todo |

### Alina (agent layer)
| # | Що | Статус |
|---|----|----|
| 1 | `agent_state.py` | ❌ Todo |
| 2 | `router/router.py` | ❌ Todo |
| 3 | Domain graphs × 4 | ❌ Todo |
| 4 | `agent_graph.py` (main) | ❌ Todo |