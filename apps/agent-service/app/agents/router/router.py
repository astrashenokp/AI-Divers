import logging
import os

from agents.agent_state import AgentState
from agents.router.prompts import ROUTER_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

VALID_DOMAINS = {"ecommerce", "education", "tourism", "general"}


def router_node(state: AgentState) -> dict:
    if state.get("domain"):
        logger.info("Domain from frontend: %s", state["domain"])
        return {"domain": state["domain"]}

    domain = _classify_with_llm(state["messages"])
    logger.info("Classified domain: %s", domain)
    return {"domain": domain}


def _classify_with_llm(messages: list) -> str:
    if ANTHROPIC_API_KEY:
        try:
            return _classify_with_anthropic(messages)
        except Exception as e:
            logger.warning("LLM classification failed: %s, using fallback", e)

    return _classify_fallback(messages)


def _classify_with_anthropic(messages: list) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    last_text = _get_last_text(messages)

    response = client.messages.create(
        model="claude-sonnet-4-20260514",
        max_tokens=10,
        system=ROUTER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": last_text or "hello"}],
    )

    domain = response.content[0].text.strip().lower()
    return domain if domain in VALID_DOMAINS else "general"


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
