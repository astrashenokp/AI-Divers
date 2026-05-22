import asyncio
import contextvars
import json
import logging
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from langgraph.graph import END, StateGraph

from agents.agent_state import AgentState
from agents.domains.education.prompts import (
    EDUCATION_BASE_PROMPT,
    USE_CASE_HINTS as EDUCATION_USE_CASE_HINTS,
    TOOLS_BY_USE_CASE as EDUCATION_TOOLS_BY_USE_CASE,
)
from agents.domains.ecommerce.prompts import (
    ECOMMERCE_BASE_PROMPT,
    USE_CASE_HINTS as ECOMMERCE_USE_CASE_HINTS,
    TOOLS_BY_USE_CASE as ECOMMERCE_TOOLS_BY_USE_CASE,
)
from agents.domains.tourism.prompts import (
    TOURISM_BASE_PROMPT,
    USE_CASE_HINTS as TOURISM_USE_CASE_HINTS,
    TOOLS_BY_USE_CASE as TOURISM_TOOLS_BY_USE_CASE,
)
from agents.domains.general.prompts import (
    GENERAL_BASE_PROMPT,
    USE_CASE_HINTS as GENERAL_USE_CASE_HINTS,
    TOOLS_BY_USE_CASE as GENERAL_TOOLS_BY_USE_CASE,
)
from services.tool_execution_service import execute_tool_call
from tools.tool_registry import get_available_tools

_DOTENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=_DOTENV_PATH)

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── Domain configuration ──────────────────────────────────────────────────────

DOMAIN_CONFIG = {
    "education": {
        "base_prompt": EDUCATION_BASE_PROMPT,
        "use_case_hints": EDUCATION_USE_CASE_HINTS,
        "tools_by_use_case": EDUCATION_TOOLS_BY_USE_CASE,
    },
    "ecommerce": {
        "base_prompt": ECOMMERCE_BASE_PROMPT,
        "use_case_hints": ECOMMERCE_USE_CASE_HINTS,
        "tools_by_use_case": ECOMMERCE_TOOLS_BY_USE_CASE,
    },
    "tourism": {
        "base_prompt": TOURISM_BASE_PROMPT,
        "use_case_hints": TOURISM_USE_CASE_HINTS,
        "tools_by_use_case": TOURISM_TOOLS_BY_USE_CASE,
    },
    "general": {
        "base_prompt": GENERAL_BASE_PROMPT,
        "use_case_hints": GENERAL_USE_CASE_HINTS,
        "tools_by_use_case": GENERAL_TOOLS_BY_USE_CASE,
    },
}


def _get_openai_client(provider: str | None = None):
    from openai import AsyncOpenAI
    import os
    if provider == "gemini" or os.getenv("GEMINI_API_KEY"):
        return AsyncOpenAI(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=os.getenv("GEMINI_API_KEY"),
        )
    return AsyncOpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
    )


def _get_system_prompt(state: AgentState, domain: str, use_case: str | None = None) -> str:
    if state.get("system_prompt"):
        return state["system_prompt"]

    config = DOMAIN_CONFIG.get(domain)
    if not config:
        return "Ти — корисний AI-асистент. Відповідай українською."

    prompt = config["base_prompt"]
    if use_case and use_case in config.get("use_case_hints", {}):
        prompt += "\n" + config["use_case_hints"][use_case]
    return prompt


def _get_tools_for_domain(state: AgentState, domain: str, use_case: str | None = None) -> list[dict]:
    """Returns tool metadata for the LLM, filtered by domain and use case."""
    
    if state.get("tools") is not None:
        custom_tool_names = state["tools"]
        all_tools = get_available_tools()
        filtered_tools = [t for t in all_tools if t["name"] in custom_tool_names]
        return _to_openai_tools(filtered_tools)
        
    all_tools = get_available_tools(domain)

    if not use_case:
        return _to_openai_tools(all_tools)

    config = DOMAIN_CONFIG.get(domain)
    if not config:
        return _to_openai_tools(all_tools)

    allowed = config["tools_by_use_case"].get(use_case)
    if allowed is None:
        return _to_openai_tools(all_tools)

    return _to_openai_tools([t for t in all_tools if t["name"] in allowed])


def _to_openai_tools(tools: list[dict]) -> list[dict]:
    """Converts Anthropic-style tool definitions to OpenAI/Groq format.

    Groq's llama models can be finicky with integer types in tool calls,
    so we relax integer/number fields to accept strings too.
    """
    result = []
    for t in tools:
        params_raw = t.get("input_schema") or t.get("parameters") or {}
        params = dict(params_raw)
        if "properties" in params:
            params["properties"] = {
                k: _relax_number_types(dict(v))
                for k, v in params["properties"].items()
            }
        result.append({
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t.get("description", ""),
                "parameters": params,
            },
        })
    return result


def _relax_number_types(schema: dict) -> dict:
    """Relaxes integer/number fields to accept strings (Groq llama quirk)."""
    t = schema.get("type")
    if t in ("integer", "number"):
        schema["type"] = "string"
        schema.pop("minimum", None)
        schema.pop("maximum", None)
        schema.pop("default", None)
        schema["description"] = (
            schema.get("description", "") +
            f" (приймає {t}, буде конвертовано автоматично)"
        )
    return schema


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_last_text(messages: list) -> str:
    for msg in reversed(messages):
        if not isinstance(msg, dict):
            continue
        if msg.get("role") == "user":
            return msg.get("content", "") or ""
    return ""


def _extract_last_assistant_text(messages: list) -> str:
    for msg in reversed(messages):
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content", "")
        if isinstance(content, str) and content:
            return content
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    return block["text"]
    return ""


# ── Per-request event queue (contextvars — safe for concurrent requests) ─────

_current_event_queue: contextvars.ContextVar[asyncio.Queue | None] = (
    contextvars.ContextVar("_current_event_queue", default=None)
)


# ── SSE helper ────────────────────────────────────────────────────────────────


def _emit_sse(event: str, data: dict):
    logger.info("SSE | event=%s | data=%s", event, data)
    queue = _current_event_queue.get()
    if queue is not None:
        queue.put_nowait((event, data))


# ── Build OpenAI messages list from internal format ──────────────────────────


def _build_openai_messages(
    internal_messages: list,
    system_prompt: str,
) -> list[dict]:
    messages = [{"role": "system", "content": system_prompt}]

    for msg in internal_messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if role == "system":
            continue

        if role == "tool":
            messages.append({
                "role": "tool",
                "tool_call_id": msg.get("tool_call_id", ""),
                "content": content if isinstance(content, str) else str(content),
            })
        elif role == "assistant":
            entry: dict = {"role": "assistant"}
            if isinstance(content, str):
                entry["content"] = content
            elif isinstance(content, list):
                texts = [b["text"] for b in content if isinstance(b, dict) and b.get("type") == "text"]
                entry["content"] = " ".join(texts) if texts else ""
            else:
                entry["content"] = str(content)

            tool_calls = msg.get("tool_calls")
            if tool_calls:
                entry["tool_calls"] = [
                    {"type": "function", **tc}
                    if "type" not in tc
                    else tc
                    for tc in tool_calls
                ]

            messages.append(entry)
        else:
            messages.append({
                "role": role,
                "content": content if isinstance(content, str) else str(content),
            })

    return messages


# ── Graph nodes ───────────────────────────────────────────────────────────────


async def reason_node(state: AgentState) -> dict:
    step_count = state.get("step_count", 0)
    max_steps = state.get("max_steps", 10)

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
                "content": (
                    "Досягнуто максимальної кількості кроків. "
                    "Напишіть уточнення, якщо потрібно продовжити."
                ),
            }],
            "step_count": step_count + 1,
        }

    domain = state.get("domain", "education")
    use_case = state.get("use_case")
    system_prompt = _get_system_prompt(state, domain, use_case)
    tools = _get_tools_for_domain(state, domain, use_case)

    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — using fallback response")
        last_text = _get_last_text(state["messages"])
        return {
            "messages": [{
                "role": "assistant",
                "content": (
                    f"[Демо-режим] Отримано запит у домені \"{domain}\". "
                    f"Користувач написав: \"{last_text or '—'}\". "
                    f"Для повноцінної роботи встановіть GROQ_API_KEY."
                ),
            }],
            "step_count": state.get("step_count", 0) + 1,
        }

    provider = state.get("model_provider")
    client = _get_openai_client(provider)
    api_messages = _build_openai_messages(state["messages"], system_prompt)

    model = state.get("model_name") or (
        "gemini-2.5-flash" if provider == "gemini" else GROQ_MODEL
    )

    kwargs = {
        "model": model,
        "messages": api_messages,
        "max_tokens": 4096,
        "stream": True,
    }
    if tools:
        kwargs["tools"] = tools

    response = await client.chat.completions.create(**kwargs)
    
    assistant_msg: dict = {"role": "assistant"}
    content_buffer = ""
    tool_calls_dict = {}

    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta.content:
            content_buffer += delta.content
            _emit_sse("message_delta", {
                "execution_id": state["execution_id"],
                "delta": delta.content
            })
            
        if delta.tool_calls:
            for tc in delta.tool_calls:
                idx = tc.index
                if idx not in tool_calls_dict:
                    tool_calls_dict[idx] = {
                        "id": tc.id or "",
                        "type": "function",
                        "function": {"name": "", "arguments": ""}
                    }
                if tc.id:
                    tool_calls_dict[idx]["id"] = tc.id
                if tc.function:
                    if tc.function.name:
                        tool_calls_dict[idx]["function"]["name"] += tc.function.name
                    if tc.function.arguments:
                        tool_calls_dict[idx]["function"]["arguments"] += tc.function.arguments

    assistant_msg["content"] = content_buffer

    has_tool_use = False
    if tool_calls_dict:
        has_tool_use = True
        assistant_msg["tool_calls"] = [
            {
                "id": tc["id"],
                "type": "function",
                "function": {
                    "name": tc["function"]["name"],
                    "arguments": tc["function"]["arguments"],
                },
            }
            for idx, tc in sorted(tool_calls_dict.items())
        ]

    _emit_sse("reasoning_step", {
        "execution_id": state["execution_id"],
        "domain": domain,
        "has_tool_calls": has_tool_use,
    })

    return {
        "messages": [assistant_msg],
        "step_count": state.get("step_count", 0) + 1,
    }


def _coerce_tool_args(arguments_json: str) -> dict:
    """Parses tool arguments and coerces string numbers to proper types."""
    args = json.loads(arguments_json)
    for key, value in args.items():
        if isinstance(value, str):
            # Try int first, then float
            stripped = value.strip()
            if stripped.lstrip("-").isdigit():
                args[key] = int(stripped)
            else:
                try:
                    args[key] = float(stripped)
                except ValueError:
                    pass  # keep as string
    return args


async def tool_node(state: AgentState) -> dict:
    last_msg = state["messages"][-1]
    if last_msg.get("role") != "assistant":
        return {"messages": []}

    tool_results = []

    for tc in last_msg.get("tool_calls", []):
        tool_name = tc["function"]["name"]
        tool_args = _coerce_tool_args(tc["function"]["arguments"])

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
        )

        _emit_sse("tool_call_finished", {
            "execution_id": state["execution_id"],
            **result,
        })

        tool_results.append({
            "role": "tool",
            "tool_call_id": tc["id"],
            "content": result.get("result", str(result)),
        })

    if not tool_results:
        return {"messages": state["messages"]}

    return {"messages": state["messages"] + tool_results}


def guardrail_check(state: AgentState) -> Literal["continue", "finalize"]:
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

    return "continue" if last_msg.get("tool_calls") else "finalize"


def final_node(state: AgentState) -> dict:
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


# ── Graph factory ─────────────────────────────────────────────────────────────


def create_domain_graph(domain: str) -> StateGraph:
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
