# Архитектура агента (Alina)

**Версія:** 1.0
**Дата:** 2026-05-22
**Фокус:** Освітня сфера (Education) — перша реалізація

---

## 1. Загальна архітектура

```
START
  │
  ▼
router_node ──── (domain з фронтенду або LLM classification)
  │
  ├── "ecommerce" ──► ecommerce_subgraph ──► END
  ├── "education" ──► education_subgraph ──► END  ← ПЕРШИЙ
  ├── "tourism"   ──► tourism_subgraph   ──► END
  └── "general"   ──► general_subgraph   ──► END
```

**Router** визначає домен:
- Якщо `state["domain"]` переданий з фронтенду (кнопка) → використати його
- Інакше → LLM класифікує запит

---

## 2. Agent State (`agents/agent_state.py`)

```python
class AgentState(TypedDict):
    messages:       list   # історія чату (BaseMessage від LangChain / dict)
    domain:         str | None # "ecommerce" | "education" | "tourism" | "general"
    use_case:       str | None # "learning_support" | "course_info" | "skill_development"
    execution_id:   str        # UUID для SSE трекінгу
    step_count:     int        # лічильник кроків (guardrail)
    max_steps:      int        # максимальна кількість кроків (default 10)
```

---

## 3. Education Subgraph — Детальний опис

### 3.1 Схема

```
                 START
                   │
                   ▼
          ┌──────────────────┐
          │   reason_node     │  ← LLM (Claude) + system prompt + tools
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │  guardrail_check  │  ← step_count >= max_steps? → force END
          └────────┬─────────┘
                   │
          ┌────────┴─────────┐
          │                  │
     має tool_calls?     немає tool_calls
          │                  │
          ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │  tool_node    │   │  final_node   │
   │               │   │               │
   │ execute_tool_ │   │ фінальна      │
   │  call() × N   │   │ відповідь     │
   │ + SSE події   │   │ + SSE event   │
   └───────┬───────┘   └──────┬───────┘
           │                  │
           │                  END
           ▼
      (повертається до reason_node)
```

### 3.2 Nodes

#### reason_node
**Призначення:** Викликає LLM з system prompt + історією + доступними tools.

**Вхід:** `state["messages"]`, `state["use_case"]`, `state["step_count"]`

**Логіка:**
```python
def reason_node(state: AgentState) -> dict:
    # 1. Формуємо system prompt з урахуванням use case
    system_prompt = EDUCATION_BASE_PROMPT
    if state.get("use_case"):
        system_prompt += "\n\n" + USE_CASE_HINTS[state["use_case"]]

    # 2. Фільтруємо tools за use case (якщо заданий)
    tools = get_education_tools(state.get("use_case"))

    # 3. Генеруємо SSE подію
    emit_sse("reasoning_step", {"execution_id": state["execution_id"]})

    # 4. Викликаємо LLM
    response = llm.invoke(
        messages=[{"role": "system", "content": system_prompt}] + state["messages"],
        tools=tools,
    )

    # 5. Збільшуємо лічильник кроків
    return {
        "messages": [response],
        "step_count": state["step_count"] + 1,
    }
```

**LLM інтеграція:**
- Модель: Claude Sonnet 4-6 (Anthropic)
- Провайдер: `anthropic` SDK (прямі виклики) або `langchain-anthropic`
- Tools передаються в `tools` параметр для нативного tool calling

#### guardrail_check
**Призначення:** Перевіряє чи потрібно продовжувати або завершувати.

**Вхід:** `state["step_count"]`, `state["max_steps"]`, останнє повідомлення

**Логіка:**
```python
def guardrail_check(state: AgentState) -> Literal["continue", "finalize", "__end__"]:
    # Ліміт кроків
    if state["step_count"] >= state.get("max_steps", 10):
        emit_sse("guardrail_blocked", {
            "execution_id": state["execution_id"],
            "reason": "max_steps_exceeded",
        })
        return "finalize"

    # Останнє повідомлення
    last_msg = state["messages"][-1]

    # Якщо LLM повернула tool_calls → продовжуємо
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        return "continue"

    # Якщо це текстова відповідь → завершуємо
    return "finalize"
```

#### tool_node
**Призначення:** Виконує tool calls через Sofia's `execute_tool_call()`.

**Вхід:** `state["messages"][-1]` (AIMessage з tool_calls)

**Логіка:**
```python
async def tool_node(state: AgentState) -> dict:
    last_msg = state["messages"][-1]
    tool_messages = []

    for tool_call in last_msg.tool_calls:
        # SSE: tool_call_started
        emit_sse("tool_call_started", {
            "execution_id": state["execution_id"],
            "tool_name": tool_call["name"],
            "args": tool_call["args"],
        })

        # Виконання через сервіс Sofia
        result = await execute_tool_call(
            tool_name=tool_call["name"],
            args=tool_call["args"],
            execution_id=state["execution_id"],
        )

        # SSE: tool_call_finished
        emit_sse("tool_call_finished", {
            "execution_id": state["execution_id"],
            **result,
        })

        # Форматуємо результат для LLM
        tool_messages.append({
            "role": "tool",
            "tool_call_id": tool_call["id"],
            "content": result["result"],
        })

    return {"messages": tool_messages}
```

#### final_node
**Призначення:** Форматує фінальну відповідь користувачу.

**Вхід:** `state["messages"][-1]` (остання відповідь LLM)

**Логіка:**
```python
def final_node(state: AgentState) -> dict:
    last_msg = state["messages"][-1]
    content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

    # Якщо завершили через guardrail
    if state["step_count"] >= state.get("max_steps", 10):
        content += "\n\n*Досягнуто максимальної кількості кроків. Якщо потрібно більше — напишіть уточнення.*"

    # SSE: execution_completed
    emit_sse("execution_completed", {
        "execution_id": state["execution_id"],
        "answer": content,
    })

    return {"messages": [{"role": "assistant", "content": content}]}
```

### 3.3 Граф (StateGraph)

```python
def create_education_subgraph() -> StateGraph:
    builder = StateGraph(AgentState)

    builder.add_node("reason", reason_node)
    builder.add_node("tools", tool_node)
    builder.add_node("final", final_node)

    builder.set_entry_point("reason")

    builder.add_conditional_edges(
        "reason",
        guardrail_check,
        {
            "continue": "tools",
            "finalize": "final",
        }
    )

    builder.add_edge("tools", "reason")
    builder.add_edge("final", END)

    return builder.compile()
```

---

## 4. Use Cases для Education

### 4.1 Як використовуються

Use case — це **конфігурація агента**, яка:
- Змінює **system prompt** (додає спеціалізацію)
- Фільтрує **доступні tools** (LLM бачить тільки рекомендовані)
- Встановлює **guardrails** (max_steps, forbidden_topics)

Use case передається з **Builder UI** (фронтенд, Polina/Rinata), де користувач вибирає:
```
Industry: "Education"
  └── Use case: "learning_support" | "course_info" | "skill_development"
```
або може бути **не заданий** — тоді LLM сам визначає з контексту.

### 4.2 Таблиця Use Cases

| Use case | Опис | Рекомендовані tools | Додаток до промпту |
|----------|------|-------------------|-------------------|
| `learning_support` | Користувач потребує допомоги в навчанні, поясненні тем | `course_search`, `web_search`, `save_progress`, `save_note`, `get_current_time` | "Користувач потребує допомоги в навчанні. Пояснюй теми крок за кроком, перевіряй розуміння." |
| `course_info` | Користувач хоче дізнатися про курси, порівняти | `course_search`, `course_info`, `web_search`, `get_current_time` | "Користувач хоче отримати інформацію про курси. Порівнюй варіанти, показуй деталі." |
| `skill_development` | Користувач хоче розвинути навички | `course_search`, `save_progress`, `web_search`, `get_current_time` | "Користувач хоче розвинути навички. Пропонуй шляхи розвитку, послідовність кроків." |

### 4.3 Фільтрація Tools за Use Case

```python
EDUCATION_TOOLS_BY_USE_CASE = {
    "learning_support": [
        "course_search",
        "web_search",
        "save_progress",
        "save_note",
        "get_current_time",
    ],
    "course_info": [
        "course_search",
        "course_info",
        "web_search",
        "get_current_time",
    ],
    "skill_development": [
        "course_search",
        "save_progress",
        "web_search",
        "get_current_time",
    ],
}

# Якщо use case не заданий — всі tools
EDUCATION_ALL_TOOLS = [
    "course_search",
    "course_info",
    "save_progress",
    "web_search",
    "get_current_time",
    "http_request",
    "save_note",
]
```

### 4.4 System Prompt для Education

**Базовий промпт:**
```
Ти — освітній асистент.
Ти допомагаєш знайти курси, отримати інформацію про навчання та зберегти прогрес.
Ти завжди відповідаєш українською мовою, незалежно від мови запиту користувача.

Інструкції:
- Відповідай лаконічно та по суті.
- Якщо не знаєш точної відповіді — використай інструменти для пошуку.
- Не вигадуй факти, посилайся на джерела.
- Якщо потрібно більше інформації — уточни в користувача.
```

**Додаток для `learning_support`:**
```
Спеціалізація: Навчальна підтримка
- Пояснюй теми крок за кроком.
- Перевіряй розуміння користувача.
- Пропонуй додаткові матеріали для вивчення.
- Допомагай із домашніми завданнями, але не виконуй за користувача.
```

**Додаток для `course_info`:**
```
Спеціалізація: Інформація про курси
- Шукай курси за темою.
- Порівнюй варіанти (тривалість, рівень, ціна).
- Показуй детальну інформацію про курс.
- Якщо курс не знайдено — запропонуй альтернативи.
```

**Додаток для `skill_development`:**
```
Спеціалізація: Розвиток навичок
- Пропонуй шляхи розвитку навичок.
- Складай послідовність кроків для навчання.
- Рекомендуй курси та матеріали.
- Відстежуй прогрес користувача.
```

---

## 5. Tools для Education

### 5.1 Domain tools (реалізує Sofia)

| Tool | Опис | Параметри |
|------|------|-----------|
| `course_search` | Шукає курси за темою або навичкою | `query: str`, `level: str = "any"`, `max_results: int = 5` |
| `course_info` | Детальна інформація про курс | `course_id: str` |
| `save_progress` | Зберігає прогрес студента | `user_id: str`, `course_id: str`, `lesson_id: str` |

### 5.2 Shared tools (вже готові)

| Tool | Опис |
|------|------|
| `get_current_time` | Поточний час |
| `search_web` | Пошук в інтернеті |
| `save_note` | Збереження нотатки |
| `http_request` | HTTP запит до API |

---

## 6. Інтеграція з router та головним графом

### 6.1 Router

```python
def router_node(state: AgentState) -> dict:
    # Режим 1: domain з фронтенду (кнопка)
    if state.get("domain"):
        return {"domain": state["domain"]}

    # Режим 2: вільний ввід → LLM classification
    domain = classify_domain_with_llm(state["messages"])
    return {"domain": domain}
```

### 6.2 Головний граф

```python
def create_main_graph() -> CompiledStateGraph:
    builder = StateGraph(AgentState)

    builder.add_node("router", router_node)
    builder.add_node("education", create_education_subgraph())

    builder.set_entry_point("router")

    builder.add_conditional_edges(
        "router",
        lambda state: state["domain"],
        {
            "education": "education",
            # "ecommerce": "ecommerce",   # майбутнє
            # "tourism": "tourism",       # майбутнє
            # "general": "general",       # майбутнє
        }
    )

    builder.add_edge("education", END)

    return builder.compile()
```

---

## 7. SSE Live Tracking Events

| Event | Node | Дані |
|-------|------|------|
| `execution_started` | router_node | `{execution_id, domain}` |
| `reasoning_step` | reason_node | `{execution_id}` |
| `tool_call_started` | tool_node | `{execution_id, tool_name, args}` |
| `tool_call_finished` | tool_node | `{execution_id, tool_name, status, result, duration_ms}` |
| `guardrail_blocked` | guardrail_check | `{execution_id, reason}` |
| `execution_completed` | final_node | `{execution_id, answer}` |
| `execution_failed` | error handler | `{execution_id, error}` |

---

## 8. План реалізації (порядок)

| # | Файл | Статус |
|---|------|--------|
| 1 | `agents/agent_state.py` | ❌ Todo |
| 2 | `agents/router/prompts.py` | ❌ Todo |
| 3 | `agents/router/router.py` | ❌ Todo |
| 4 | `agents/domains/education/prompts.py` | ❌ Todo |
| 5 | `agents/domains/graph.py` (фабрика `create_domain_graph`) | ❌ Todo |
| 6 | `agents/agent_graph.py` (головний граф) | ❌ Todo |
| 7 | `agents/test_agent.py` (тести) | ❌ Todo |
| 8 | `requirements.txt` (оновлення залежностей) | ❌ Todo |

---

## 9. Залежності

```
# agent-service залежності
pydantic>=2.0
httpx>=0.27
langgraph>=0.4.0        # граф виконання агента
anthropic>=0.50.0       # Claude API
python-dotenv>=1.0.0    # .env файли
```

---

## 10. Приклад роботи (Education)

### Запит з use case

```
Користувач на фронтенді:
  Industry: "Education"
  Use case: "learning_support"
  Повідомлення: "поясни як працюють списки в Python"

Старт графа:
  execution_started → router_node → "education" → education_subgraph

Крок 1 (reason_node):
  system_prompt = базовий + "Користувач потребує допомоги в навчанні..."
  tools = [course_search, web_search, save_progress, save_note, get_current_time]
  LLM вирішує: відповісти текстом (без tool_calls) → "finalize"

Крок 2 (final_node):
  "Списки в Python — це впорядковані колекції елементів..."
  execution_completed
```

### Запит з tool call

```
Користувач: "знайди курс по Python для початківців"

Крок 1 (reason_node):
  LLM → course_search(query="Python для початківців", level="beginner")

Крок 2 (tool_node):
  execute_tool_call("course_search", {...}) → список курсів
  tool_call_finished

Крок 3 (reason_node):
  LLM отримує результат → формує відповідь
  "Знайшов кілька курсів: ..."
  немає tool_calls → "finalize"

Крок 4 (final_node):
  execution_completed
```

### Вільний ввід (без кнопки)

```
Користувач: "хочу вивчити Python"

router_node: LLM класифікує → "education"
  (use_case не заданий → LLM сам визначає з контексту)

education_subgraph:
  system_prompt = базовий (без спеціалізації)
  tools = всі education tools
  ... далі стандартний цикл
```
