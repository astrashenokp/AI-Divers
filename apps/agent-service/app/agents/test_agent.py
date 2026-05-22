"""
Tests for the agent layer (router + education domain graph).

Run:
    python -m agents.test_agent

Requires:
    pip install langgraph anthropic httpx pydantic
"""

import asyncio
import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.router.router import _classify_fallback, _get_last_text
from agents.agent_graph import agent_graph
from agents.agent_state import AgentState


def _make_exec_id() -> str:
    return f"test-{uuid.uuid4().hex[:8]}"


# ── 1. Router fallback tests ──────────────────────────────────────────────


def test_router_fallback_education():
    domain = _classify_fallback([
        {"role": "user", "content": "знайди курс по Python для початківців"},
    ])
    assert domain == "education", f"Expected education, got {domain}"
    print(f"  ✅ router_fallback_education → {domain}")


def test_router_fallback_ecommerce():
    domain = _classify_fallback([
        {"role": "user", "content": "хочу купити навушники"},
    ])
    assert domain == "ecommerce", f"Expected ecommerce, got {domain}"
    print(f"  ✅ router_fallback_ecommerce → {domain}")


def test_router_fallback_tourism():
    domain = _classify_fallback([
        {"role": "user", "content": "забронювати готель в Києві"},
    ])
    assert domain == "tourism", f"Expected tourism, got {domain}"
    print(f"  ✅ router_fallback_tourism → {domain}")


def test_router_fallback_general():
    domain = _classify_fallback([
        {"role": "user", "content": "як справи? розкажи анекдот"},
    ])
    assert domain == "general", f"Expected general, got {domain}"
    print(f"  ✅ router_fallback_general → {domain}")


# ── 2. get_last_text helper ───────────────────────────────────────────────


def test_get_last_text():
    messages = [
        {"role": "user", "content": "привіт"},
        {"role": "assistant", "content": "привіт!"},
        {"role": "user", "content": "знайди курс Python"},
    ]
    text = _get_last_text(messages)
    assert text == "знайди курс Python", f"Expected 'знайди курс Python', got '{text}'"
    print(f"  ✅ get_last_text → '{text}'")


def test_get_last_text_with_content_blocks():
    messages = [
        {"role": "user", "content": [{"type": "text", "text": "hello world"}]},
    ]
    text = _get_last_text(messages)
    assert text == "hello world", f"Expected 'hello world', got '{text}'"
    print(f"  ✅ get_last_text (blocks) → '{text}'")


# ── 3. Education graph integration ────────────────────────────────────────


async def test_education_graph_simple_query():
    """Test education graph with a simple text query (no tool calls)."""
    initial_state: AgentState = {
        "messages": [
            {"role": "user", "content": "розкажи про курс Python для початківців"},
        ],
        "domain": "education",
        "use_case": "course_info",
        "execution_id": _make_exec_id(),
        "step_count": 0,
        "max_steps": 5,
    }

    result = await agent_graph.ainvoke(initial_state)
    last_msg = result["messages"][-1]

    assert last_msg["role"] == "assistant"
    content = last_msg.get("content", "")
    if isinstance(content, list):
        texts = [b["text"] for b in content if isinstance(b, dict) and b.get("type") == "text"]
        content = " ".join(texts)

    assert isinstance(content, str) and len(content) > 0
    print(f"  ✅ education_graph simple query — response length: {len(content)} chars")
    print(f"     response preview: {content[:100]}...")


async def test_education_graph_with_tool_call():
    """Test education graph where the LLM calls a tool (course_search)."""
    initial_state: AgentState = {
        "messages": [
            {"role": "user", "content": "знайди курс по JavaScript"},
        ],
        "domain": "education",
        "use_case": None,
        "execution_id": _make_exec_id(),
        "step_count": 0,
        "max_steps": 10,
    }

    result = await agent_graph.ainvoke(initial_state)
    last_msg = result["messages"][-1]

    assert last_msg["role"] == "assistant"
    content = last_msg.get("content", "")
    if isinstance(content, list):
        texts = [b["text"] for b in content if isinstance(b, dict) and b.get("type") == "text"]
        content = " ".join(texts)

    print(f"  ✅ education_graph with tool call — response length: {len(content)} chars")
    print(f"     response preview: {content[:100]}...")


async def test_education_graph_max_steps_guardrail():
    """Test that max_steps guardrail stops the agent."""
    initial_state: AgentState = {
        "messages": [
            {"role": "user", "content": "розкажи про курси"},
        ],
        "domain": "education",
        "use_case": None,
        "execution_id": _make_exec_id(),
        "step_count": 8,
        "max_steps": 5,
    }

    result = await agent_graph.ainvoke(initial_state)
    last_msg = result["messages"][-1]

    content = last_msg.get("content", "")
    if isinstance(content, list):
        texts = [b["text"] for b in content if isinstance(b, dict) and b.get("type") == "text"]
        content = " ".join(texts)

    assert "крок" in content.lower() or "ліміт" in content.lower()
    print(f"  ✅ education_graph max_steps guardrail — guardrail triggered")
    print(f"     response: {content[:150]}...")


# ── 4. Tool registry ──────────────────────────────────────────────────────


def test_tool_registry_has_education():
    from tools.tool_registry import get_tool_registry, AVAILABLE_TOOLS

    registry = get_tool_registry()
    assert "course_search" in registry, "course_search not in registry"
    assert "course_info" in registry, "course_info not in registry"
    assert "save_progress" in registry, "save_progress not in registry"

    tool_names = [t["name"] for t in AVAILABLE_TOOLS]
    assert "course_search" in tool_names, "course_search not in AVAILABLE_TOOLS"
    assert "course_info" in tool_names, "course_info not in AVAILABLE_TOOLS"
    assert "save_progress" in tool_names, "save_progress not in AVAILABLE_TOOLS"

    print(f"  ✅ tool_registry has all education tools")


# ── Main runner ───────────────────────────────────────────────────────────


def run_sync_tests():
    print("\n🧪 Router fallback tests:")
    test_router_fallback_education()
    test_router_fallback_ecommerce()
    test_router_fallback_tourism()
    test_router_fallback_general()

    print("\n🧪 Helper tests:")
    test_get_last_text()
    test_get_last_text_with_content_blocks()

    print("\n🧪 Tool registry tests:")
    test_tool_registry_has_education()


async def run_async_tests():
    print("\n🧪 Education graph integration tests:")

    has_api_key = bool(os.getenv("GROQ_API_KEY"))
    if not has_api_key:
        print("  ⚠️  GROQ_API_KEY не встановлено — тести будуть у демо-режимі")

    await test_education_graph_simple_query()
    await test_education_graph_with_tool_call()
    await test_education_graph_max_steps_guardrail()


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 Agent Layer Tests")
    print("=" * 60)

    run_sync_tests()

    asyncio.run(run_async_tests())

    print("\n" + "=" * 60)
    print("🏁 Всі тести пройдено!")
    print("=" * 60)
