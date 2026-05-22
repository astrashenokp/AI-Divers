import httpx

from .tool_schemas import SearchWebInput

# TODO: replace with a real search API key (e.g. Serper, Brave, DuckDuckGo)
SEARCH_API_URL = "https://api.duckduckgo.com/"


def search_web_tool() -> dict:
    """Returns tool metadata for the agent / LLM."""
    return {
        "name": "search_web",
        "description": (
            "Searches the web for current information. "
            "Use when the user asks about recent events, news, or facts that may have changed. "
            "Example: 'latest AI news today' or 'weather in Kyiv tomorrow'."
        ),
        "input_schema": SearchWebInput.model_json_schema(),
    }


async def execute_search_web(args: dict) -> str:
    """Executes a web search and returns results as a formatted string."""
    validated = SearchWebInput(**args)

    # TODO: swap DuckDuckGo instant answers for a proper search API (Serper/Brave) when API key is available
    params = {
        "q": validated.query,
        "format": "json",
        "no_redirect": "1",
        "no_html": "1",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(SEARCH_API_URL, params=params)
        response.raise_for_status()
        data = response.json()

    # DuckDuckGo instant answer format
    abstract = data.get("AbstractText", "")
    related = data.get("RelatedTopics", [])

    results = []
    if abstract:
        results.append(f"Summary: {abstract}")

    for item in related[: validated.max_results]:
        if isinstance(item, dict) and "Text" in item:
            results.append(f"- {item['Text']}")

    if not results:
        return f"No results found for query: '{validated.query}'"

    return "\n".join(results)