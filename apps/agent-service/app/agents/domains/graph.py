import logging
import os
from typing import Literal

from langgraph.graph import END, StateGraph

from agents.agent_state import AgentState
from agents.domains.education.prompts import EDUCATION_BASE_PROMPT, USE_CASE_HINTS
from services.tool_execution_service import execute_tool_call

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# ── Tool definitions ──────────────────────────────────────────────────────────

EDUCATION_TOOLS = [
    {
        "name": "course_search",
        "description": "Шукає курси за темою або навичкою",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Пошуковий запит, наприклад 'Python для початківців'",
                },
                "level": {
                    "type": "string",
                    "description": "Рівень: beginner, intermediate, advanced, any",
                    "default": "any",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Максимум результатів (1-10)",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "course_info",
        "description": "Детальна інформація про конкретний курс за його ID",
        "input_schema": {
            "type": "object",
            "properties": {
                "course_id": {
                    "type": "string",
                    "description": "ID курсу",
                },
            },
            "required": ["course_id"],
        },
    },
    {
        "name": "save_progress",
        "description": "Зберігає прогрес студента по уроку",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "ID користувача",
                },
                "course_id": {
                    "type": "string",
                    "description": "ID курсу",
                },
                "lesson_id": {
                    "type": "string",
                    "description": "ID уроку",
                },
            },
            "required": ["user_id", "course_id", "lesson_id"],
        },
    },
]

SHARED_TOOLS = [
    {
        "name": "get_current_time",
        "description": "Повертає поточну дату і час у вказаному часовому поясі",
        "input_schema": {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": "Часовий пояс, наприклад UTC або Europe/Kyiv",
                    "default": "UTC",
                },
            },
        },
    },
    {
        "name": "search_web",
        "description": "Пошук в інтернеті для отримання актуальної інформації",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Пошуковий запит",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Максимум результатів",
                    "default": 3,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "save_note",
        "description": "Зберігає нотатку для поточної сесії",
        "input_schema": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "ID сесії",
                },
                "content": {
                    "type": "string",
                    "description": "Текст нотатки",
                },
            },
            "required": ["session_id", "content"],
        },
    },
    {
        "name": "http_request",
        "description": "Виконує HTTP запит до зовнішнього API або сервісу",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Повний URL для запиту",
                },
                "method": {
                    "type": "string",
                    "description": "HTTP метод: GET, POST, PUT, DELETE",
                    "default": "GET",
                },
                "headers": {
                    "type": "object",
                    "description": "Заголовки запиту у форматі key-value",
                    "default": {},
                },
                "body": {
                    "type": "string",
                    "description": "Тіло запиту для POST/PUT (JSON рядком)",
                    "default": "",
                },
            },
            "required": ["url"],
        },
    },
]

# ── Domain configuration ──────────────────────────────────────────────────────

DOMAIN_CONFIG = {
    "education": {
        "all_tools": EDUCATION_TOOLS + SHARED_TOOLS,
        "base_prompt": EDUCATION_BASE_PROMPT,
        "use_case_hints": USE_CASE_HINTS,
        "tools_by_use_case": {
            "learning_support": [
                "course_search", "web_search", "save_progress",
                "save_note", "get_current_time",
            ],
            "course_info": [
                "course_search", "course_info", "web_search", "get_current_time",
            ],
            "skill_development": [
                "course_search", "save_progress", "web_search", "get_current_time",
            ],
        },
    },
}


def _get_system_prompt(domain: str, use_case: str | None = None) -> str:
    config = DOMAIN_CONFIG.get(domain)
    if not config:
        return "Ти — корисний AI-асистент. Відповідай українською."

    prompt = config["base_prompt"]
    if use_case and use_case in config.get("use_case_hints", {}):
        prompt += "\n" + config["use_case_hints"][use_case]
    return prompt


def _get_tools_for_domain(domain: str, use_case: str | None = None) -> list[dict]:
    config = DOMAIN_CONFIG.get(domain)
    if not config:
        return SHARED_TOOLS

    all_tools = config["all_tools"]
    if not use_case:
        return all_tools

    allowed = config["tools_by_use_case"].get(use_case)
    if allowed is None:
        return all_tools

    return [t for t in all_tools if t["name"] in allowed]


# ── Helper: extract last user text from messages ──────────────────────────────

def _get_last_text(messages: list) -> str:
    for msg in reversed(messages):
        if not isinstance(msg, dict):
            continue
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        return block["text"]
                return ""
            if isinstance(content, str):
                return content
    return ""


# ── SSE helper ────────────────────────────────────────────────────────────────

def _emit_sse(event: str, data: dict):
    """Emits SSE event. Logs for now; will connect to API streaming later."""
    logger.info("SSE | event=%s | data=%s", event, data)


# ── Graph nodes ───────────────────────────────────────────────────────────────

async def reason_node(state: AgentState) -> dict:
    """LLM reasoning step — calls Claude with system prompt + tools."""
    step_count = state.get("step_count", 0)
    max_steps = state.get("max_steps", 10)

    # Early guardrail: stop before LLM call if limit exceeded
    if step_count >= max_steps:
        logger.warning(
            "Max steps exceeded (early) | step_count=%d | max_steps=%d | exec=%s",
            step_count, max_steps, state["execution_id"],
        )
        _emit_sse("guardrail_blocked", {
            "execution_id": state["execution_id"],
            "reason": "max_steps_exceeded",
        })
        return {
            "messages": [{
                "role": "assistant",
                "content": [{
                    "type": "text",
                    "text": (
                        "Досягнуто максимальної кількості кроків. "
                        "Напишіть уточнення, якщо потрібно продовжити."
                    ),
                }],
            }],
            "step_count": step_count + 1,
        }

    domain = state.get("domain", "education")
    use_case = state.get("use_case")
    system_prompt = _get_system_prompt(domain, use_case)
    tools = _get_tools_for_domain(domain, use_case)

    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — using fallback response")
        last_text = _get_last_text(state["messages"])
        return {
            "messages": [{
                "role": "assistant",
                "content": [{
                    "type": "text",
                    "text": (
                        f"[Демо-режим] Отримано запит у домені \"{domain}\". "
                        f"Користувач написав: \"{last_text or '—'}\". "
                        f"Для повноцінної роботи встановіть ANTHROPIC_API_KEY."
                    ),
                }],
            }],
            "step_count": state.get("step_count", 0) + 1,
        }

    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    api_messages = _prepare_messages_for_api(state["messages"])

    response = client.messages.create(
        model="claude-sonnet-4-20260514",
        max_tokens=4096,
        system=system_prompt,
        messages=api_messages,
        tools=tools if tools else None,
    )

    assistant_content = []
    has_tool_use = False

    for block in response.content:
        if block.type == "text":
            assistant_content.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            has_tool_use = True
            assistant_content.append({
                "type": "tool_use",
                "id": block.id,
                "name": block.name,
                "input": block.input,
            })

    _emit_sse("reasoning_step", {
        "execution_id": state["execution_id"],
        "domain": domain,
        "has_tool_calls": has_tool_use,
    })

    return {
        "messages": [{"role": "assistant", "content": assistant_content}],
        "step_count": state.get("step_count", 0) + 1,
    }


async def tool_node(state: AgentState) -> dict:
    """Executes tool calls from the last assistant message."""
    last_msg = state["messages"][-1]
    if last_msg.get("role") != "assistant":
        return {"messages": []}

    tool_results = []

    for block in last_msg.get("content", []):
        if not isinstance(block, dict) or block.get("type") != "tool_use":
            continue

        tool_name = block["name"]
        tool_args = block.get("input", {})

        _emit_sse("tool_call_started", {
            "execution_id": state["execution_id"],
            "tool_name": tool_name,
            "args": tool_args,
        })

        result = await execute_tool_call(
            tool_name=tool_name,
            args=tool_args,
            execution_id=state["execution_id"],
            domain=state.get("domain"),
            step_count=state.get("step_count", 0),
            max_steps=state.get("max_steps", 10),
        )

        _emit_sse("tool_call_finished", {
            "execution_id": state["execution_id"],
            **result,
        })

        tool_results.append({
            "type": "tool_result",
            "tool_use_id": block["id"],
            "content": result.get("result", str(result)),
        })

    if not tool_results:
        return {"messages": []}

    return {"messages": [{"role": "user", "content": tool_results}]}


def guardrail_check(state: AgentState) -> Literal["continue", "finalize"]:
    """Checks whether the agent should continue or stop."""
    step_count = state.get("step_count", 0)
    max_steps = state.get("max_steps", 10)

    if step_count >= max_steps:
        logger.warning(
            "Max steps exceeded | step_count=%d | max_steps=%d | exec=%s",
            step_count, max_steps, state["execution_id"],
        )
        _emit_sse("guardrail_blocked", {
            "execution_id": state["execution_id"],
            "reason": "max_steps_exceeded",
        })
        return "finalize"

    last_msg = state["messages"][-1] if state["messages"] else None
    if not last_msg or last_msg.get("role") != "assistant":
        return "finalize"

    has_tool_use = any(
        isinstance(b, dict) and b.get("type") == "tool_use"
        for b in last_msg.get("content", [])
    )

    return "continue" if has_tool_use else "finalize"


def final_node(state: AgentState) -> dict:
    """Formats the final answer for the user."""
    answer = _extract_last_assistant_text(state["messages"])

    if not answer:
        answer = "Дякую за запит! Якщо є додаткові питання — я готовий допомогти."

    if state.get("step_count", 0) >= state.get("max_steps", 10):
        answer += "\n\n*Досягнуто максимальної кількості кроків. Напишіть уточнення, якщо потрібно продовжити.*"

    _emit_sse("execution_completed", {
        "execution_id": state["execution_id"],
        "answer": answer,
    })

    return {"messages": [{"role": "assistant", "content": answer}]}


def _extract_last_assistant_text(messages: list) -> str:
    for msg in reversed(messages):
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", "")
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    return block["text"]
        elif isinstance(content, str):
            return content
    return ""


def _prepare_messages_for_api(messages: list) -> list:
    """Converts internal message format to Anthropic Messages API format."""
    result = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            continue
        if isinstance(content, list):
            result.append({"role": role, "content": content})
        else:
            result.append({"role": role, "content": str(content)})
    return result


# ── Graph factory ─────────────────────────────────────────────────────────────

def create_domain_graph(domain: str) -> StateGraph:
    """Creates a compiled LangGraph StateGraph for the given domain."""
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
        },
    )

    builder.add_edge("tools", "reason")
    builder.add_edge("final", END)

    return builder.compile()
