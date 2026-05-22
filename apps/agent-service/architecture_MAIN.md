# Agent Service Architecture

## Призначення папки

`apps/agent-service` — це окремий Python-сервіс, який виконує роль AI runtime для Agentic Studio.

Його задача:

- прийняти запит від бекенду;
- визначити або прийняти домен агента;
- прогнати запит через LangGraph-цикл `think -> tool call -> observe -> final answer`;
- безпечно виконати tool calls;
- віддати події виконання у вигляді SSE stream;
- повернути фінальну відповідь агента.

Простими словами:

- `backend` — це оркестратор між frontend і Python runtime;
- `agent-service` — це місце, де реально "живе" агент;
- `tools/` — це дії агента;
- `agents/` — це логіка мислення і маршрутизації;
- `services/` — це централізоване безпечне виконання інструментів.

---

## Що тут є на високому рівні

```text
apps/agent-service/
├── architecture.md
├── requirements.txt
├── structure.md
└── app/
    ├── main.py
    ├── test_tools.py
    ├── architecture_agent.md
    ├── agents/
    ├── services/
    └── tools/
```

### Ролі верхнього рівня

- `requirements.txt`
  Python-залежності сервісу.
- `structure.md`
  старіший структурний опис доменів і контрактів.
- `app/main.py`
  FastAPI entrypoint з HTTP endpoints.
- `app/agents/`
  агентна оркестрація, router, доменні графи, prompts.
- `app/services/`
  сервісний шар для виконання тулів.
- `app/tools/`
  усі shared/domain tools, schemas, registry, guardrails.
- `app/test_tools.py`, `app/agents/test_agent.py`
  локальні інтеграційні перевірки.

---

## Архітектурна модель

### Повний потік

```text
Frontend
  ↓
Spring Boot backend
  ↓
POST /internal/v1/agent/stream
  ↓
FastAPI (main.py)
  ↓
LangGraph main graph
  ↓
router
  ↓
education | ecommerce | tourism | general
  ↓
reason -> tools -> reason -> ... -> final
  ↓
SSE events + final answer
  ↓
backend relay
  ↓
frontend timeline/chat
```

### Головна ідея

У сервісі є два рівні керування:

1. `Router layer`
   Визначає домен або бере його з бекенду.
2. `Domain execution layer`
   Запускає конкретного доменного агента з його prompt-ами, набором інструментів і guardrails.

---

## Структура `app/`

```text
app/
├── __init__.py
├── main.py
├── test_tools.py
├── architecture_agent.md
├── agents/
│   ├── __init__.py
│   ├── agent_graph.py
│   ├── agent_state.py
│   ├── test_agent.py
│   ├── router/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   └── prompts.py
│   └── domains/
│       ├── __init__.py
│       ├── graph.py
│       ├── education/
│       │   ├── __init__.py
│       │   ├── graph.py
│       │   └── prompts.py
│       ├── ecommerce/
│       │   ├── graph.py
│       │   └── prompts.py
│       ├── tourism/
│       │   ├── graph.py
│       │   └── prompts.py
│       └── general/
│           ├── graph.py
│           └── prompts.py
├── services/
│   ├── __init__.py
│   └── tool_execution_service.py
└── tools/
    ├── __init__.py
    ├── architecture_tools.md
    ├── tool_schemas.py
    ├── tool_registry.py
    ├── tool_guardrails.py
    ├── current_time_tool.py
    ├── web_search_tool.py
    ├── save_note_tool.py
    ├── http_request_tool.py
    ├── database_query_tool.py
    ├── industry_presets.py
    ├── website_analyzer_tool.py
    ├── diagrams/
    ├── education/
    ├── ecommerce/
    └── tourism/
```

---

## `main.py`: API-шар сервісу

Файл: [main.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/main.py)

### Що робить

`main.py` підіймає `FastAPI` застосунок і дає 6 основних API:

- `GET /health`
  простий healthcheck;
- `GET /domains`
  список доменів для UI або backend;
- `GET /tool-types`
  метадані інструментів;
- `GET /guardrails-config`
  runtime-конфіг safety-обмежень;
- `POST /execute-tool`
  прямий запуск одного tool для debug/testing;
- `POST /internal/v1/agent/stream`
  основний endpoint для запуску агента зі стрімом подій.

### Важливо для бекенду

Ключовий endpoint тут один:

`POST /internal/v1/agent/stream`

Саме його має викликати Spring Boot backend. Frontend напряму до Python ходити не повинен.

### Формат вхідного payload

```json
{
  "message": "Знайди курс по Python",
  "sessionId": "optional-session-id",
  "domain": "education",
  "use_case": "course_info",
  "max_steps": 10,
  "system_prompt": null,
  "tools": ["course_search", "course_info"],
  "guardrails": null,
  "model_provider": "gemini",
  "model_name": "gemini-2.5-flash",
  "metadata": {}
}
```

### Що реально використовується

На поточний момент сервіс явно використовує:

- `message`
- `sessionId`
- `domain`
- `use_case`
- `max_steps`
- `system_prompt`
- `tools`
- `model_provider`
- `model_name`

Поле `guardrails` зараз прокидається в `state`, але не застосовується окремою логікою в рантаймі.
Поле `metadata` описане в request model, але в поточному коді не використовується в agent loop.

---

## Agent State: спільний стан виконання

Файл: [agent_state.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/agent_state.py)

`AgentState` — це центральний словник стану, який проходить через увесь LangGraph.

Ключі:

- `messages`
  історія повідомлень у внутрішньому форматі;
- `domain`
  активний домен;
- `use_case`
  спеціалізація всередині домену;
- `execution_id`
  id виконання для логів і SSE;
- `step_count`
  скільки reasoning-кроків уже пройдено;
- `max_steps`
  верхня межа циклу;
- `system_prompt`
  optional override system prompt;
- `tools`
  optional явний allowlist інструментів;
- `guardrails`
  місце для додаткових runtime-правил;
- `session_id`
  ідентифікатор сесії;
- `model_provider`
  провайдер моделі;
- `model_name`
  конкретна модель.

---

## `agents/`: мозок сервісу

### 1. `agent_graph.py`

Файл: [agent_graph.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/agent_graph.py)

Це верхньорівневий граф.

Він:

- pre-compile-ить 4 підграфи;
- додає `router` node;
- після router пересилає виконання у відповідний домен;
- завершує виконання після доменного підграфа.

Підтримувані домени:

- `education`
- `ecommerce`
- `tourism`
- `general`

### 2. `router/router.py`

Файл: [router.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/router/router.py)

Router працює так:

- якщо `domain` уже переданий із бекенду, він використовується як є;
- якщо `domain` відсутній, router пробує LLM-класифікацію через Groq;
- якщо LLM недоступна або падає, спрацьовує keyword fallback;
- якщо нічого не збіглося, сервіс іде в `general`.

Це дуже важливо для backend integration:

- якщо бекенд уже знає домен агента, краще передавати його явно;
- якщо бекенд не передає домен, сервіс сам класифікує кожен user message.

### 3. `router/prompts.py`

Файл: [prompts.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/router/prompts.py)

Тут лежить system prompt класифікатора доменів.

### 4. `domains/graph.py`

Файл: [graph.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/domains/graph.py)

Це серце рантайму. Саме тут описаний універсальний цикл для будь-якого домену:

```text
reason -> guardrail_check -> tools -> reason -> ... -> final
```

#### Основні вузли

- `reason_node`
  викликає LLM, стрімить текстові дельти, збирає tool calls;
- `tool_node`
  виконує всі tool calls через `execute_tool_call(...)`;
- `guardrail_check`
  вирішує, чи продовжувати цикл;
- `final_node`
  формує фінальну відповідь.

#### Як вибираються інструменти

Логіка така:

- якщо у `state.tools` переданий список, сервіс фільтрує інструменти жорстко по ньому;
- інакше бере весь набір для домену;
- якщо переданий `use_case`, набір ще раз звужується за `TOOLS_BY_USE_CASE`.

Тобто є 3 рівні фільтрації:

1. домен;
2. use case;
3. explicit tools від бекенду.

---

## Доменні prompts і use cases

У кожному домені є свій `prompts.py`.

### Education

Файл: [education/prompts.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/domains/education/prompts.py)

Use cases:

- `learning_support`
- `course_info`
- `skill_development`

### Ecommerce

Файл: [ecommerce/prompts.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/domains/ecommerce/prompts.py)

Use cases:

- `customer_support`
- `order_tracking`
- `product_recommendation`

### Tourism

Файл: [tourism/prompts.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/domains/tourism/prompts.py)

Use cases:

- `trip_planning`
- `destination_info`
- `booking_support`

### General

Файл: [general/prompts.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/agents/domains/general/prompts.py)

Use case:

- `general_assistance`

### Спільне правило

Усі доменні prompts змушують агента відповідати українською мовою.

---

## `tools/`: руки агента

Папка: [tools](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools)

Це весь action layer.

### Основні файли

#### `tool_schemas.py`

Файл: [tool_schemas.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/tool_schemas.py)

Тут зібрані всі `Pydantic` input schemas для shared і domain tools.

Це single source of truth для:

- валідації args;
- генерації JSON schema для LLM;
- контракту між агентом і tools.

#### `tool_registry.py`

Файл: [tool_registry.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/tool_registry.py)

Тут зібрані:

- `_SHARED_REGISTRY`
- `_DOMAIN_REGISTRY`
- `_SHARED_TOOLS`
- `_DOMAIN_TOOLS`

Публічні функції:

- `get_tool_registry(domain)`
- `get_available_tools(domain)`

Саме через них:

- `main.py` віддає список tool types;
- `agent runtime` віддає моделі доступні інструменти;
- `tool_execution_service` знаходить execute-функцію.

#### `tool_guardrails.py`

Файл: [tool_guardrails.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/tool_guardrails.py)

Це runtime safety policy.

Що тут є:

- `VALID_DOMAINS`
- `DOMAIN_TOOL_ALLOWLIST`
- `REQUIRES_HUMAN_CONFIRMATION`
- `DOMAIN_MAX_STEPS`
- `DEFAULT_MAX_STEPS`
- `DEFAULT_TIMEOUT_SECONDS`
- `sanitize_args(...)`
- `check_tool_allowed_in_domain(...)`
- `check_step_limit(...)`
- `requires_confirmation(...)`

Критично важливо:

навіть якщо LLM "вигадає" tool call, який не належить домену, runtime його все одно заблокує.

---

## Shared tools

### Доступні в усіх доменах

- `get_current_time`
- `search_web`
- `save_note`
- `http_request`

### Реальний стан shared tools

#### `get_current_time`

Файл: [current_time_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/current_time_tool.py)

- стабільний утилітарний інструмент;
- працює через `zoneinfo`;
- якщо timezone не знайдено, падає у UTC.

#### `search_web`

Файл: [web_search_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/web_search_tool.py)

- зараз використовує DuckDuckGo Instant Answer API;
- це не повноцінний web search engine;
- результат залежить від `AbstractText` і `RelatedTopics`;
- для production-реалістики краще буде замінити на Brave/Serper/інший пошуковий API.

#### `save_note`

Файл: [save_note_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/save_note_tool.py)

- зараз зберігає дані тільки в in-memory список;
- після рестарту сервісу дані зникають;
- для production треба підключити persistence через backend/database.

#### `http_request`

Файл: [http_request_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/http_request_tool.py)

- виконує зовнішні HTTP запити;
- дозволені методи: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`;
- блокує `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, metadata hosts і частину private ranges;
- обрізає довгі response body до 3000 символів;
- JSON відповіді pretty-print-ить.

Це один із найризикованіших тулів, тому на нього треба дивитися особливо уважно.

---

## Domain tools

### Ecommerce

- `product_search`
- `order_status`
- `check_price`

Файли:

- [product_search_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/ecommerce/product_search_tool.py)
- [order_status_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/ecommerce/order_status_tool.py)
- [check_price_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/ecommerce/check_price_tool.py)

Поточний стан:

- це переважно mock/stub-логіка;
- повертають форматовані демо-результати;
- ще не підключені до реального shop API.

### Education

- `course_search`
- `course_info`
- `save_progress`

Файли:

- [course_search_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/education/course_search_tool.py)
- [course_info_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/education/course_info_tool.py)
- [save_progress_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/education/save_progress_tool.py)

Поточний стан:

- `save_progress` поки не пише в БД;
- частина відповідей теж мокова;
- інтеграція з навчальним backend ще попереду.

### Tourism

- `hotel_search`
- `itinerary_plan`
- `get_weather`

Файли:

- [hotel_search_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/tourism/hotel_search_tool.py)
- [itinerary_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/tourism/itinerary_tool.py)
- [get_weather_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/tourism/get_weather_tool.py)

Поточний стан:

- `get_weather` уміє працювати з `OPENWEATHER_API_KEY`, але має stub fallback;
- `hotel_search` і `itinerary_plan` зараз теж демо-реалізації;
- інтеграція з реальними travel API ще не зроблена.

### Placeholder-файли

Є кілька файлів, які зараз не є частиною основного runtime-потоку:

- `database_query_tool.py`
- `website_analyzer_tool.py`
- `industry_presets.py`

Це не ядро поточної інтеграції. Якщо бекенд підключає сервіс сьогодні, ці файли можна сприймати як заготовки на майбутнє.

---

## `services/tool_execution_service.py`: єдина точка виконання тулів

Файл: [tool_execution_service.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/services/tool_execution_service.py)

Це один із найважливіших файлів у всій папці.

Саме він:

- приймає `tool_name`, `args`, `execution_id`, `domain`, `step_count`;
- перевіряє валідність домену;
- редагує чутливі поля в логах;
- перевіряє step limit;
- перевіряє, чи tool дозволений у поточному домені;
- знаходить execute-функцію в registry;
- ловить `ValidationError`;
- ловить `ToolGuardrailError`;
- ловить всі інші runtime exceptions;
- завжди повертає уніфікований `ToolResult`.

### Формат `ToolResult`

```json
{
  "tool_name": "search_web",
  "status": "success",
  "result": "...",
  "started_at": "2026-05-23T00:00:00+00:00",
  "completed_at": "2026-05-23T00:00:01+00:00",
  "duration_ms": 123,
  "execution_id": "stream-abcd1234",
  "domain": "general",
  "error_type": null
}
```

Можливі `error_type`:

- `unknown_tool`
- `validation_error`
- `blocked`
- `runtime_error`

---

## SSE contract

Основний стрім іде через `StreamingResponse` у `main.py`.

### Події, які генерує сервіс

- `execution_started`
- `message_delta`
- `reasoning_step`
- `tool_call_started`
- `tool_call_finished`
- `guardrail_blocked`
- `execution_completed`
- `execution_failed`

### Що важливо для backend

Backend має:

- не чекати тільки фінального event;
- вміти relay-ити проміжні події у frontend;
- бажано зберігати tool calls, errors і final answer окремо;
- бути готовим, що `execution_completed` може прийти і з `domains/graph.py`, і як фінальний SSE в `main.py`.

Практично це означає: при інтеграції не варто жорстко зав'язуватись на один-єдиний тип фінальної події без нормалізації на боці backend.

---

## Моделі і провайдери

### Поточна поведінка

У `domains/graph.py` сервіс працює так:

- за замовчуванням використовує Groq-сумісний OpenAI client;
- якщо передано `model_provider="gemini"` або є `GEMINI_API_KEY`, клієнт переключається на Gemini через OpenAI-compatible endpoint;
- якщо `GROQ_API_KEY` відсутній, сервіс не падає, а повертає demo/fallback-відповідь;
- router для LLM-класифікації теж використовує Groq, якщо ключ є.

### На що звернути увагу

- router не використовує `model_provider` з request;
- доменний graph використовує `model_provider` і `model_name`;
- якщо немає `GROQ_API_KEY`, reasoning переходить у demo-режим;
- якщо є `GEMINI_API_KEY`, `_get_openai_client()` може обрати Gemini навіть без явного `model_provider`.

Для production варто це уніфікувати, але для поточного онбордингу це треба просто знати.

---

## Конфігурація і `.env`

### Де сервіс шукає `.env`

І `router/router.py`, і `domains/graph.py` завантажують `.env` з:

`apps/agent-service/.env`

Не з `app/.env`, а саме з кореня `agent-service`.

### Ключі, які реально використовуються

- `GROQ_API_KEY`
- `GROQ_MODEL` опційно
- `GEMINI_API_KEY`
- `OPENWEATHER_API_KEY`

### Приклад

```env
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=...
OPENWEATHER_API_KEY=...
```

---

## Як запускати локально

### Важливий нюанс імпортів

Сервіс зараз написаний з імпортами типу:

- `from agents...`
- `from tools...`
- `from services...`

Через це запускати його треба з директорії:

`apps/agent-service/app`

А не з `apps/agent-service` через `uvicorn app.main:app`.

Я перевірив це локально:

- `python3 -c 'import main'` з `app/` працює;
- `python3 -c 'import app.main'` з `apps/agent-service/` падає через `ModuleNotFoundError: agents`.

### Рекомендований локальний запуск

```bash
cd apps/agent-service/app
python3 -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8001
```

### Швидка перевірка

```bash
curl http://127.0.0.1:8001/health
```

Очікувана відповідь:

```json
{"status":"ok","service":"agent-service"}
```

---

## Як бекенду це підключити

### Правильна схема інтеграції

```text
Frontend
  ↓
Spring Boot API
  ↓
agent-service
```

Frontend не повинен знати про внутрішні Python endpoints.

### Що має робити backend перед викликом Python

1. Прийняти user message від frontend.
2. Визначити, який agent конфіг використовується.
3. Завантажити прикріплені tools агента.
4. Завантажити guardrails агента.
5. Визначити домен і use case.
6. Сформувати payload для `agent-service`.
7. Відкрити SSE-з'єднання з `POST /internal/v1/agent/stream`.
8. Relay-ити події у frontend.
9. Зберегти фінальний результат, tool calls, помилки, session history.

### Мінімальний backend payload у Python

```json
{
  "message": "Підбери готель у Львові",
  "sessionId": "chat-123",
  "domain": "tourism",
  "use_case": "booking_support",
  "max_steps": 8,
  "tools": ["hotel_search", "get_weather", "save_note"]
}
```

### Що краще прокидати явно з backend

- `domain`
  щоб не покладатися на router-класифікацію;
- `use_case`
  щоб prompt і tools були більш точними;
- `tools`
  щоб жорстко обмежити доступний набір інструментів під конкретного агента;
- `max_steps`
  щоб контролювати вартість і цикл;
- `sessionId`
  щоб notes/history мали прив'язку.

### Якщо агент-конструктор у вас зберігається в БД

Добра практика така:

- `domain` і `use_case` зберігає backend як частину agent config;
- `tools` зберігаються як enabled/disabled список;
- `guardrails` зберігаються у backend, але частина з них поки ще не застосовується Python runtime напряму;
- backend формує runtime payload сам і не змушує frontend знати всі технічні поля.

---

## Що вже готово, а що ні

### Готово

- FastAPI API-шар;
- SSE endpoint для агентного виконання;
- LangGraph routing;
- доменні prompts;
- tool registry;
- runtime guardrails;
- unified tool execution contract;
- базові локальні тести.

### Частково готово / демо-рівень

- частина tool implementations;
- `search_web` як спрощений пошук;
- `save_note` тільки in-memory;
- `save_progress` без реальної БД;
- travel/ecommerce/education інтеграції переважно мокові;
- `guardrails` з request ще не мають окремого apply-шару;
- запуск з кореня `agent-service` поки незручний через абсолютні імпорти.

### Не варто припускати без перевірки

- що notes або progress переживуть рестарт;
- що всі tools звертаються в реальні зовнішні системи;
- що `search_web` дає повноцінний список результатів як Google/Brave;
- що `requires_confirmation` уже автоматично зупиняє виконання в agent loop.

До речі, `REQUIRES_HUMAN_CONFIRMATION` оголошений у guardrails, але зараз не використовується як окремий runtime pause-механізм у `execute_tool_call` або в graph loop.

---

## На що звернути увагу новій людині в команді

### Якщо ти бекендер

- Думай про `agent-service` як про окремий internal AI microservice.
- Не пускай frontend напряму в Python.
- Нормалізуй SSE events на боці backend.
- Зберігай state виконання у своїй БД, бо Python runtime не є джерелом довготривалої правди.
- Не покладайся на мокові tool responses як на production data source.

### Якщо ти працюєш над AI/runtime

- Новий tool додається через schema -> tool file -> registry -> guardrails -> tests.
- Новий домен додається через prompts + tool registry + domain allowlist + main graph routing.
- Зміни в shape tool metadata можуть зламати backend/UI builder.

### Якщо ти підключаєш реальний backend API

- Найкраща точка інтеграції для tool-level side effects зараз або всередині tool implementation, або через окремий backend-facing API.
- Для запису даних у production краще відмовитись від тимчасового in-memory storage.

---

## Як розширювати сервіс без хаосу

### Додати новий tool

1. Додати schema в `tool_schemas.py`.
2. Створити `*_tool.py` з metadata + `execute_*`.
3. Зареєструвати tool у `tool_registry.py`.
4. Додати його в allowlist у `tool_guardrails.py`.
5. За потреби додати в `TOOLS_BY_USE_CASE`.
6. Покрити перевіркою в `test_tools.py`.

### Додати новий домен

1. Створити новий `prompts.py`.
2. Додати домен у `DOMAIN_CONFIG`.
3. Додати підграф у `agent_graph.py`.
4. Оновити `VALID_DOMAINS`.
5. Додати allowlist і max steps.
6. Оновити `/domains` labels у `main.py`.

---

## Рекомендації перед production-підключенням

- перевести імпорти на стабільний package layout, щоб сервіс запускався з кореня;
- винести mock tools за прапорець або замінити їх на реальні інтеграції;
- зробити реальний confirmation flow для write- і network-sensitive tools;
- зробити persistence для `save_note` і `save_progress`;
- додати єдиний config layer для model provider selection;
- уніфікувати фінальний SSE event contract;
- додати інтеграційні тести між backend і Python service.

---

## Короткий висновок

`agent-service` уже має хороше ядро для MVP:

- є API;
- є router;
- є доменні агенти;
- є loop;
- є SSE;
- є runtime guardrails.

Але це ще не повністю production-ready data/runtime layer.

Для бекенду правильний підхід такий:

- ставитися до цього сервісу як до internal AI executor;
- передавати йому вже зібрану конфігурацію агента;
- забирати з нього стрім подій і фінальний результат;
- не очікувати, що Python runtime сам буде довготривалим сховищем стану.
