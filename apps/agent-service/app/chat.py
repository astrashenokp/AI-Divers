#!/usr/bin/env python3
"""
chat.py — Interactive CLI chat with the Agentic Studio agent.

Usage:
    cd apps/agent-service/app
    python chat.py

    # Or specify a domain directly:
    python chat.py --domain education
    python chat.py --domain general
    python chat.py --domain tourism
    python chat.py --domain ecommerce

    # Run a single query and exit:
    python chat.py --domain general --query "проаналізуй сайт https://example.com"

Environment:
    GROQ_API_KEY  — set in .env next to apps/ or export before running
    GROQ_MODEL    — optional, default: llama-3.3-70b-versatile

Commands inside chat:
    /domain <name>   — switch domain (education | ecommerce | tourism | general)
    /tools           — list available tools for current domain
    /clear           — clear conversation history
    /help            — show this help
    /quit or /exit   — exit
"""

import argparse
import asyncio
import os
import sys
import uuid
from pathlib import Path

# ── Make sure imports work from app/ dir ──────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv

_DOTENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_DOTENV_PATH)

from agents.agent_graph import agent_graph
from agents.agent_state import AgentState
from tools.tool_registry import get_available_tools

# ─────────────────────────────────────────────────────────────────────────────

VALID_DOMAINS = {"education", "ecommerce", "tourism", "general"}

DOMAIN_EMOJI = {
    "education": "🎓",
    "ecommerce": "🛒",
    "tourism":   "🏨",
    "general":   "🌐",
}

BANNER = r"""
╔══════════════════════════════════════════════════════╗
║           🤖  Agentic Studio — CLI Chat             ║
║                                                      ║
║  Команди:  /domain <назва>  /tools  /clear  /quit   ║
╚══════════════════════════════════════════════════════╝
"""


def _print_banner(domain: str) -> None:
    print(BANNER)
    emoji = DOMAIN_EMOJI.get(domain, "🌐")
    has_key = bool(os.getenv("GROQ_API_KEY"))
    mode = "🟢 GROQ LLM" if has_key else "🟡 Демо-режим (без GROQ_API_KEY)"
    print(f"  Домен: {emoji} {domain}   |   Режим: {mode}")
    print("  Введіть повідомлення або /help для довідки")
    print("─" * 56)


def _list_tools(domain: str) -> None:
    tools = get_available_tools(domain=domain)
    print(f"\n🔧 Інструменти для домену «{domain}» ({len(tools)} шт.):")
    for t in tools:
        print(f"  • {t['name']:25s} — {t['description'][:70]}…")
    print()


def _show_help() -> None:
    print("""
  /domain <name>  — змінити домен (education | ecommerce | tourism | general)
  /tools          — показати доступні інструменти
  /clear          — очистити історію розмови
  /help           — ця довідка
  /quit або /exit — вийти

  Приклади питань:
    знайди курс по Python
    проаналізуй сайт https://example.com
    забронюй готель у Львові
    знайди навушники дешевше 2000 грн
    яка зараз година?
    розкажи цікавий факт
""")


async def _run_agent(
    messages: list,
    domain: str,
    execution_id: str,
) -> str:
    """Runs the agent graph and returns the final assistant text."""
    state: AgentState = {
        "messages": messages,
        "domain":   domain,
        "use_case": None,
        "execution_id": execution_id,
        "step_count": 0,
        "max_steps":  15,
    }

    result = await agent_graph.ainvoke(state)
    last_msg = result["messages"][-1]

    content = last_msg.get("content", "")
    if isinstance(content, list):
        texts = [
            b["text"]
            for b in content
            if isinstance(b, dict) and b.get("type") == "text"
        ]
        content = " ".join(texts)

    return content or "—"


async def chat_loop(domain: str, single_query: str | None = None) -> None:
    _print_banner(domain)

    messages: list = []

    async def handle_input(user_input: str) -> tuple[bool, str]:
        """Returns (should_continue, domain_after)."""
        nonlocal domain, messages

        stripped = user_input.strip()
        if not stripped:
            return True, domain

        # ── Commands ──────────────────────────────────────────────────
        if stripped.startswith("/"):
            parts = stripped.split()
            cmd = parts[0].lower()

            if cmd in ("/quit", "/exit", "/q"):
                print("До побачення! 👋")
                return False, domain

            elif cmd == "/help":
                _show_help()
                return True, domain

            elif cmd == "/tools":
                _list_tools(domain)
                return True, domain

            elif cmd == "/clear":
                messages = []
                print("✅ Історія очищена.\n")
                return True, domain

            elif cmd == "/domain":
                if len(parts) < 2:
                    print("❗ Вкажіть домен: /domain education | ecommerce | tourism | general\n")
                    return True, domain
                new_domain = parts[1].lower()
                if new_domain not in VALID_DOMAINS:
                    print(f"❗ Невідомий домен «{new_domain}». Доступні: {sorted(VALID_DOMAINS)}\n")
                    return True, domain
                domain = new_domain
                messages = []  # clear history when switching domain
                emoji = DOMAIN_EMOJI.get(domain, "🌐")
                print(f"✅ Домен змінено на {emoji} {domain}. Історія очищена.\n")
                return True, domain

            else:
                print(f"❓ Невідома команда: {cmd}. Введіть /help для списку команд.\n")
                return True, domain

        # ── Regular message ───────────────────────────────────────────
        messages.append({"role": "user", "content": stripped})
        execution_id = f"chat-{uuid.uuid4().hex[:8]}"

        print(f"\n⏳ Агент думає… (execution_id={execution_id})")
        print("─" * 56)

        try:
            answer = await _run_agent(
                messages=list(messages),
                domain=domain,
                execution_id=execution_id,
            )
        except Exception as exc:
            print(f"❌ Помилка агента: {exc}")
            messages.pop()  # remove the failed user message
            return True, domain

        emoji = DOMAIN_EMOJI.get(domain, "🤖")
        print(f"\n{emoji} Агент ({domain}):")
        print(answer)
        print("─" * 56)

        # Append assistant reply to history
        messages.append({"role": "assistant", "content": answer})
        return True, domain

    # ── Single query mode ─────────────────────────────────────────────────
    if single_query:
        await handle_input(single_query)
        return

    # ── Interactive loop ──────────────────────────────────────────────────
    while True:
        try:
            emoji = DOMAIN_EMOJI.get(domain, "🌐")
            user_input = input(f"\n{emoji} Ви: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nДо побачення! 👋")
            break

        should_continue, domain = await handle_input(user_input)
        if not should_continue:
            break


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Agentic Studio — CLI Chat",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--domain",
        default="general",
        choices=list(VALID_DOMAINS),
        help="Starting domain (default: general)",
    )
    parser.add_argument(
        "--query", "-q",
        default=None,
        help="Run a single query and exit",
    )
    args = parser.parse_args()

    asyncio.run(chat_loop(domain=args.domain, single_query=args.query))


if __name__ == "__main__":
    main()
