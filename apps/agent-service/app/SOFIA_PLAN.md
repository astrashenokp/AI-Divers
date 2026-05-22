# 🗺️ SOFIA'S HACKATHON PLAN — Agentic Studio

**Розробник:** Sofia Prutska
**Роль:** Agent Tools Engineer
**Дата:** May 22-23, 2026
**Час:** 48 годин

---

## 🎯 Що ми будуємо (розуміння продукту)

Agentic Studio — це платформа де користувач:
1. **Обирає сферу** → отримує готові tools для неї
2. **Налаштовує агента** → system prompt, guardrails
3. **Запускає** → бачить Live Tracking (Think → Act → Observe)
4. **Деплоїть** → REST API / webhook / JS widget

**Ідея ElevenLabs onboarding flow (твоя ідея — вона правильна!):**
```
Крок 1: Обери індустрію    → Healthcare / Education / E-commerce / ...
Крок 2: Обери use case     → Customer Support / Sales / Scheduling / ...
Крок 3: Tools & Knowledge  → автоматично підтягуються tools для цієї сфери
Крок 4: Налаштуй агента    → name, goal, website (optional)
Крок 5: ✅ Агент готовий
```

**Твоя роль в цьому:** Ти визначаєш які tools існують для кожної індустрії і як вони виконуються. Це **серце продукту** — без твоїх tools агент нічого не вміє робити.

---

## 📋 ТВОЇ DELIVERABLES (оновлені з architecture.md)

За architecture.md тобі потрібно реалізувати:

| # | Що | Файл | Пріоритет |
|---|---|---|---|
| 1 | `web_search` tool — повний | `tools/web_search_tool.py` | 🔴 HIGH |
| 2 | `http_request` tool — новий | `tools/http_request_tool.py` | 🔴 HIGH |
| 3 | `database_query` tool — новий | `tools/database_query_tool.py` | 🟡 MED |
| 4 | Tool config validation | `tools/tool_schemas.py` | 🔴 HIGH |
| 5 | Normalize tool results для Live Tracking | `services/tool_execution_service.py` | 🔴 HIGH |
| 6 | Industry-based tool presets | `tools/industry_presets.py` | 🟡 MED |
| 7 | Website analyzer tool (твоя ідея) | `tools/website_analyzer_tool.py` | 🟢 BONUS |

---

## 🏗️ НОВА СТРУКТУРА ФАЙЛІВ (що потрібно побудувати)

```
apps/agent-service/app/
│
├── tools/
│   ├── __init__.py
│   ├── tool_schemas.py              ✅ є — потрібно розширити
│   ├── tool_registry.py             ✅ є — потрібно розширити
│   ├── current_time_tool.py         ✅ готово
│   ├── web_search_tool.py           🔧 є skeleton — потрібен реальний API
│   ├── save_note_tool.py            🔧 є skeleton — підключити БД
│   ├── http_request_tool.py         ❌ створити новий
│   ├── database_query_tool.py       ❌ створити новий
│   ├── website_analyzer_tool.py     ❌ BONUS — твоя ідея
│   └── industry_presets.py          ❌ створити новий
│
├── services/
│   ├── __init__.py
│   └── tool_execution_service.py    🔧 є — додати Live Tracking events
│
├── __init__.py
└── test_tools.py                    ✅ є
```

---

## ⏰ ПЛАН ПО ГОДИНАХ

### DAY 1 (May 22) — Foundations

#### Година 1-2: Setup і розширення schemas
**Задача:** Розширити `tool_schemas.py` для нових tools

```python
# Що додати в tool_schemas.py:

class HttpRequestInput(BaseModel):
    url: str = Field(..., description="URL to send request to")
    method: str = Field(default="GET", description="HTTP method: GET, POST, PUT, DELETE")
    headers: dict = Field(default={}, description="Request headers as key-value pairs")
    body: str = Field(default="", description="Request body for POST/PUT")

class DatabaseQueryInput(BaseModel):
    query: str = Field(..., description="SQL query to execute. Read-only SELECT only.")
    connection_id: str = Field(..., description="ID of the configured database connection")

class WebsiteAnalyzerInput(BaseModel):
    url: str = Field(..., description="Website URL to analyze")
    extract: list[str] = Field(
        default=["title", "description", "main_content"],
        description="What to extract: title, description, main_content, links"
    )
```

#### Година 2-3: http_request_tool.py — НОВИЙ
**Це критичний tool** — через нього агент може викликати будь-який зовнішній API

```python
# apps/agent-service/app/tools/http_request_tool.py

import httpx
from .tool_schemas import HttpRequestInput

def http_request_tool() -> dict:
    return {
        "name": "http_request",
        "description": (
            "Makes HTTP requests to external APIs or services. "
            "Use when the agent needs to call a REST API, fetch data from a URL, "
            "or interact with external services. "
            "Example: http_request(url='https://api.example.com/data', method='GET')"
        ),
        "input_schema": HttpRequestInput.model_json_schema(),
    }

async def execute_http_request(args: dict) -> str:
    validated = HttpRequestInput(**args)

    # Guardrail: блокувати внутрішні адреси
    blocked_hosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254"]
    from urllib.parse import urlparse
    parsed = urlparse(validated.url)
    if any(blocked in parsed.netloc for blocked in blocked_hosts):
        return "Error: requests to internal addresses are not allowed"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.request(
            method=validated.method.upper(),
            url=validated.url,
            headers=validated.headers or {},
            content=validated.body.encode() if validated.body else None,
        )
        return f"Status: {response.status_code}\n{response.text[:2000]}"
```

#### Година 3-4: web_search_tool.py — підключити реальний API
**Серпер або Brave** — потрібен API ключ (попросити у організаторів або взяти свій)

```python
# Оновити execute_search_web в web_search_tool.py:

import os

SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
SERPER_API_URL = "https://google.serper.dev/search"

async def execute_search_web(args: dict) -> str:
    validated = SearchWebInput(**args)

    if not SERPER_API_KEY:
        # Fallback на DuckDuckGo якщо нема ключа
        return await _duckduckgo_search(validated.query)

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            SERPER_API_URL,
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": validated.query, "num": validated.max_results}
        )
        data = response.json()

    results = []
    for item in data.get("organic", [])[:validated.max_results]:
        results.append(f"**{item.get('title')}**\n{item.get('snippet')}\n{item.get('link')}")

    return "\n\n".join(results) if results else f"No results for: {validated.query}"
```

#### Година 4-5: tool_execution_service.py — додати Live Tracking events
**КРИТИЧНО** — без цього Live Tracking не працює!

```python
# Оновити execute_tool_call в tool_execution_service.py:

import logging
from datetime import datetime
from pydantic import ValidationError
from tools.tool_registry import get_tool_registry

logger = logging.getLogger(__name__)

async def execute_tool_call(
    tool_name: str,
    args: dict,
    execution_id: str = None   # ← новий параметр для Live Tracking
) -> dict:                     # ← тепер повертаємо dict замість str!
    """
    Returns:
        {
            "result": "tool output string",
            "status": "success" | "error",
            "tool_name": "search_web",
            "started_at": "2026-05-22T10:00:00",
            "completed_at": "2026-05-22T10:00:01",
            "execution_id": "abc-123"
        }
    """
    started_at = datetime.utcnow().isoformat()
    registry = get_tool_registry()

    if tool_name not in registry:
        return {
            "result": f"Error: tool '{tool_name}' is not available",
            "status": "error",
            "tool_name": tool_name,
            "started_at": started_at,
            "completed_at": datetime.utcnow().isoformat(),
            "execution_id": execution_id,
        }

    tool_fn = registry[tool_name]

    try:
        result = await tool_fn(args)
        return {
            "result": str(result),
            "status": "success",
            "tool_name": tool_name,
            "started_at": started_at,
            "completed_at": datetime.utcnow().isoformat(),
            "execution_id": execution_id,
        }
    except ValidationError as e:
        return {
            "result": f"Invalid arguments: {e.errors()}",
            "status": "error",
            "tool_name": tool_name,
            "started_at": started_at,
            "completed_at": datetime.utcnow().isoformat(),
            "execution_id": execution_id,
        }
    except Exception as e:
        logger.error(f"Tool '{tool_name}' failed: {e}", exc_info=True)
        return {
            "result": f"Tool error: {str(e)}",
            "status": "error",
            "tool_name": tool_name,
            "started_at": started_at,
            "completed_at": datetime.utcnow().isoformat(),
            "execution_id": execution_id,
        }
```

#### Година 5-6: industry_presets.py — НОВА ІДЕЯ (твоя!)
**Це те що робить продукт "вау"** — готові tools для кожної сфери

```python
# apps/agent-service/app/tools/industry_presets.py

"""
Industry-based tool presets.
When user selects an industry + use case in the builder UI,
the agent gets pre-configured with the right tools.
"""

INDUSTRY_TOOL_PRESETS: dict[str, dict] = {
    "healthcare": {
        "display_name": "Healthcare & Medical",
        "use_cases": {
            "patient_support": {
                "display_name": "Patient Support",
                "recommended_tools": ["web_search", "save_note", "http_request"],
                "system_prompt_hint": (
                    "You are a healthcare support assistant. "
                    "Help patients find information about symptoms, medications, and appointments. "
                    "Always recommend consulting a real doctor for medical decisions. "
                    "Never diagnose."
                ),
                "guardrails": {
                    "max_steps": 8,
                    "forbidden_topics": ["diagnose", "prescribe medication"],
                    "require_human_confirmation": []
                }
            },
            "appointment_scheduling": {
                "display_name": "Appointment Scheduling",
                "recommended_tools": ["http_request", "save_note", "get_current_time"],
                "system_prompt_hint": (
                    "You are a scheduling assistant. "
                    "Help patients book, reschedule, or cancel appointments."
                ),
                "guardrails": {
                    "max_steps": 6,
                    "forbidden_topics": [],
                    "require_human_confirmation": ["http_request"]
                }
            }
        }
    },
    "education": {
        "display_name": "Education & Training",
        "use_cases": {
            "learning_support": {
                "display_name": "Learning Support",
                "recommended_tools": ["web_search", "save_note", "http_request"],
                "system_prompt_hint": (
                    "You are an educational assistant. "
                    "Help students understand concepts, find resources, and learn effectively."
                ),
                "guardrails": {
                    "max_steps": 10,
                    "forbidden_topics": ["do homework for student"],
                    "require_human_confirmation": []
                }
            }
        }
    },
    "ecommerce": {
        "display_name": "Retail & E-commerce",
        "use_cases": {
            "customer_support": {
                "display_name": "Customer Support",
                "recommended_tools": ["http_request", "web_search", "save_note"],
                "system_prompt_hint": (
                    "You are an e-commerce customer support agent. "
                    "Help customers with orders, returns, product questions, and shipping."
                ),
                "guardrails": {
                    "max_steps": 8,
                    "forbidden_topics": [],
                    "require_human_confirmation": ["http_request"]
                }
            },
            "order_tracking": {
                "display_name": "Order Tracking",
                "recommended_tools": ["http_request", "get_current_time"],
                "system_prompt_hint": (
                    "You are an order tracking assistant. "
                    "Help customers find status of their orders and delivery information."
                ),
                "guardrails": {
                    "max_steps": 5,
                    "forbidden_topics": [],
                    "require_human_confirmation": []
                }
            }
        }
    },
    "finance": {
        "display_name": "Finance & Banking",
        "use_cases": {
            "customer_support": {
                "display_name": "Customer Support",
                "recommended_tools": ["web_search", "save_note", "http_request"],
                "system_prompt_hint": (
                    "You are a banking support assistant. "
                    "Help customers with account questions, transactions, and financial products. "
                    "Never ask for full card numbers or passwords."
                ),
                "guardrails": {
                    "max_steps": 6,
                    "forbidden_topics": ["full card number", "PIN", "password"],
                    "require_human_confirmation": ["http_request"]
                }
            }
        }
    },
    "technology": {
        "display_name": "Technology & Software",
        "use_cases": {
            "technical_support": {
                "display_name": "Technical Support",
                "recommended_tools": ["web_search", "http_request", "save_note", "database_query"],
                "system_prompt_hint": (
                    "You are a technical support agent. "
                    "Help users troubleshoot technical issues, find documentation, and resolve bugs."
                ),
                "guardrails": {
                    "max_steps": 12,
                    "forbidden_topics": [],
                    "require_human_confirmation": ["database_query"]
                }
            }
        }
    },
    "general": {
        "display_name": "General Purpose",
        "use_cases": {
            "assistant": {
                "display_name": "General Assistant",
                "recommended_tools": ["web_search", "save_note", "get_current_time", "http_request"],
                "system_prompt_hint": "You are a helpful general-purpose assistant.",
                "guardrails": {
                    "max_steps": 10,
                    "forbidden_topics": [],
                    "require_human_confirmation": []
                }
            }
        }
    }
}


def get_preset(industry: str, use_case: str) -> dict | None:
    """Returns tool preset for given industry + use case combination."""
    return (
        INDUSTRY_TOOL_PRESETS
        .get(industry, {})
        .get("use_cases", {})
        .get(use_case)
    )


def get_industries() -> list[dict]:
    """Returns list of available industries for the UI dropdown."""
    return [
        {"id": k, "display_name": v["display_name"]}
        for k, v in INDUSTRY_TOOL_PRESETS.items()
    ]


def get_use_cases(industry: str) -> list[dict]:
    """Returns list of use cases for given industry."""
    industry_data = INDUSTRY_TOOL_PRESETS.get(industry, {})
    return [
        {"id": k, "display_name": v["display_name"]}
        for k, v in industry_data.get("use_cases", {}).items()
    ]
```

### DAY 1 вечір (Година 6-8): BONUS — website_analyzer_tool.py
**Твоя ідея і вона чудова!** Користувач вставляє URL сайту → агент аналізує і персоналізується

```python
# apps/agent-service/app/tools/website_analyzer_tool.py

import httpx
from bs4 import BeautifulSoup
from .tool_schemas import WebsiteAnalyzerInput

def website_analyzer_tool() -> dict:
    return {
        "name": "analyze_website",
        "description": (
            "Analyzes a website to extract key information for agent personalization. "
            "Use when the user provides their website URL during agent setup. "
            "Extracts: title, description, main content, contact info, and business context. "
            "Example: analyze_website(url='https://mystore.com', extract=['title', 'description'])"
        ),
        "input_schema": WebsiteAnalyzerInput.model_json_schema(),
    }

async def execute_analyze_website(args: dict) -> str:
    validated = WebsiteAnalyzerInput(**args)

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        response = await client.get(
            validated.url,
            headers={"User-Agent": "AgenticStudio/1.0 (site analyzer)"}
        )
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    result = {}

    if "title" in validated.extract:
        result["title"] = soup.title.string if soup.title else ""

    if "description" in validated.extract:
        meta_desc = soup.find("meta", attrs={"name": "description"})
        result["description"] = meta_desc.get("content", "") if meta_desc else ""

    if "main_content" in validated.extract:
        # Видалити navigation, footer, scripts
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        result["main_content"] = soup.get_text(separator=" ", strip=True)[:1500]

    import json
    return json.dumps(result, ensure_ascii=False)
```

---

### DAY 2 (May 23) — Integration & Polish

#### Година 1-2: Оновити tool_registry.py
Додати всі нові tools:

```python
# Додати в tool_registry.py:

from .http_request_tool import http_request_tool, execute_http_request
from .website_analyzer_tool import website_analyzer_tool, execute_analyze_website

TOOL_REGISTRY: dict[str, Callable] = {
    "get_current_time": execute_get_current_time,
    "search_web": execute_search_web,
    "save_note": execute_save_note,
    "http_request": execute_http_request,       # ← новий
    "analyze_website": execute_analyze_website, # ← новий
}

AVAILABLE_TOOLS: list[dict] = [
    get_current_time_tool(),
    search_web_tool(),
    save_note_tool(),
    http_request_tool(),       # ← новий
    website_analyzer_tool(),   # ← новий
]
```

#### Година 2-3: FastAPI endpoints для builder UI
Rinata і Polina потребують endpoints щоб показати industries у UI:

```python
# apps/agent-service/app/main.py (або роутер)

from fastapi import FastAPI
from tools.industry_presets import get_industries, get_use_cases, get_preset

app = FastAPI()

@app.get("/tool-types")
async def get_tool_types():
    """Returns available tool types for the builder UI."""
    return {"tools": AVAILABLE_TOOLS}

@app.get("/industries")
async def list_industries():
    """Returns available industries for the onboarding wizard."""
    return {"industries": get_industries()}

@app.get("/industries/{industry}/use-cases")
async def list_use_cases(industry: str):
    """Returns use cases for a given industry."""
    return {"use_cases": get_use_cases(industry)}

@app.get("/industries/{industry}/use-cases/{use_case}/preset")
async def get_tool_preset(industry: str, use_case: str):
    """Returns recommended tools + system prompt for industry+use_case combo."""
    preset = get_preset(industry, use_case)
    if not preset:
        return {"error": "Preset not found"}, 404
    return preset
```

#### Година 3-5: Тестування і координація з Аліною
- Перевірити що `execute_tool_call()` повертає правильний формат для Live Tracking
- Перевірити що Аліна може отримати `AVAILABLE_TOOLS` з нашого registry
- Перевірити що industry presets дають правильні tools агенту

#### Година 5-7: Demo preparation
Підготувати сценарій для 7-хвилинного демо:

**Демо сценарій (твоя частина):**
1. Показати вибір індустрії (Healthcare) → автоматично підтягнулись tools
2. Показати website analyzer → агент проаналізував сайт за 5 секунд
3. Показати Live Tracking → tool_call_started → tool_call_finished
4. Показати guardrails → http_request потребує підтвердження

---

## 🔄 Взаємодія з командою

| Хто | Що від них потрібно | Що ти їм даєш |
|---|---|---|
| **Аліна** | Підтвердити формат `execute_tool_call()` результату | `AVAILABLE_TOOLS` list, `execute_tool_call()` |
| **Стас API** | Підтвердити формат Live Tracking events | Tool result dict з `status`, `started_at`, `completed_at` |
| **Стас Data** | Repository функція для `save_note` | Параметри: `session_id: str, content: str` |
| **Рінат/Поліна** | Знають наші endpoints | `/tool-types`, `/industries`, `/industries/{id}/preset` |

---

## 🚨 КРИТИЧНИЙ ШЛЯХ (що без чого нічого не працює)

```
tool_schemas.py (розширити)
        ↓
http_request_tool.py (створити)
        ↓
tool_registry.py (оновити)
        ↓
tool_execution_service.py (додати Live Tracking format)
        ↓
Аліна може підключити агента ← РОЗБЛОКОВУЄ КОМАНДУ
        ↓
industry_presets.py (демо wow factor)
        ↓
website_analyzer_tool.py (bonus wow factor)
```

**Перші 3 кроки** потрібно зробити в першу чергу — вони розблоковують Аліну.

---

## 📝 Нотатки щодо твоїх ідей

### ✅ Ідея ElevenLabs onboarding flow — ПРАВИЛЬНА, реалізуємо
Через `industry_presets.py` + FastAPI endpoints. Rinata будує UI, ти даєш дані.

### ✅ Ідея website analyzer — ПРАВИЛЬНА, реалізуємо як BONUS tool
`analyze_website` tool в `website_analyzer_tool.py`. Потрібно: `pip install beautifulsoup4`

### ✅ Tools per industry — ПРАВИЛЬНА, реалізуємо
`industry_presets.py` містить recommended tools + system prompt hint для кожної сфери.

### ⚠️ database_query tool — обережно
Це потрібно координувати зі Стасом Data — він визначає які connection IDs доступні. Зроби спочатку skeleton, потім підключимо разом.

---

## 📦 Що додати в requirements.txt

```
pydantic>=2.0
httpx>=0.27
fastapi
uvicorn
beautifulsoup4    ← для website_analyzer
python-dotenv     ← для .env файлів
```

---

## 🏁 Чеклист готовності до демо

- [ ] `web_search_tool` з реальним Serper API
- [ ] `http_request_tool` з безпечним виконанням
- [ ] `tool_execution_service` повертає dict з timestamps
- [ ] `industry_presets` — мінімум 3 індустрії
- [ ] `website_analyzer_tool` — парсить title + description
- [ ] `tool_registry` містить всі tools
- [ ] FastAPI endpoints `/industries` і `/industries/{id}/preset` працюють
- [ ] Всі тести в `test_tools.py` проходять
- [ ] Координація з Аліною — формат підтверджено