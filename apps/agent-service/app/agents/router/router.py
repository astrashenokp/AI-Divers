import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from agents.agent_state import AgentState
from agents.router.prompts import ROUTER_SYSTEM_PROMPT

_DOTENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=_DOTENV_PATH)

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

VALID_DOMAINS = {"ecommerce", "education", "tourism", "general"}


def _get_openai_client():
    from openai import AsyncOpenAI
    return AsyncOpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
    )


async def router_node(state: AgentState) -> dict:
    if state.get("domain"):
        logger.info("Domain from frontend: %s", state["domain"])
        return {"domain": state["domain"]}

    domain = await _classify_with_llm(state["messages"])
    logger.info("Classified domain: %s", domain)
    return {"domain": domain}


async def _classify_with_llm(messages: list) -> str:
    if GROQ_API_KEY:
        try:
            return await _classify_with_groq(messages)
        except Exception as e:
            logger.warning("LLM classification failed: %s, using fallback", e)

    return _classify_fallback(messages)


async def _classify_with_groq(messages: list) -> str:
    client = _get_openai_client()
    text = _get_last_text(messages) or "hello"

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.0,
            max_tokens=10,
        )
        domain = response.choices[0].message.content.strip().lower()
        return domain if domain in VALID_DOMAINS else "general"
    finally:
        await client.close()


def _classify_fallback(messages: list) -> str:
    last_text = _get_last_text(messages) or ""

    keywords = {
        "education": [
            "курс", "навчання", "урок", "освіт", "школ", "вчити",
            "студент", "лекці", "домашк", "універ", "вивчити",
            "освіта", "занятт", "тренінг", "вебінар",
        ],
        "ecommerce": [
            "купити", "товар", "ціна", "замовлен", "доставк",
            "магазин", "продаж", "кошик", "покупк",
        ],
        "tourism": [
            "готел", "подорож", "відпочинок", "тур", "бронюв",
            "маршрут", "політ", "авіа", "квиток", "поїздк",
        ],
    }

    msg_lower = last_text.lower()
    scores = {
        domain: sum(1 for kw in kws if kw in msg_lower)
        for domain, kws in keywords.items()
    }

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "general"


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
