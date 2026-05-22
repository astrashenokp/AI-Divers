"""
website_analyzer_tool.py — scrapes a public URL and returns structured info.

Uses httpx + BeautifulSoup4 (already in requirements.txt).

Returns:
  - Page title
  - Meta description
  - Main headings (h1, h2)
  - Main text excerpt (first ~800 chars)
  - All internal/external links count
"""

from urllib.parse import urlparse, urljoin

import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from .http_request_tool import ToolGuardrailError

# ---------------------------------------------------------------------------
# Input schema
# ---------------------------------------------------------------------------

_BLOCKED_HOSTS = frozenset({
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",
    "metadata.google.internal",
})


class WebsiteAnalyzerInput(BaseModel):
    url: str = Field(
        ...,
        description=(
            "Full public URL to analyze. Must start with https:// or http://. "
            "Example: 'https://example.com' or 'https://bbc.com/news'"
        ),
    )
    include_links: bool = Field(
        default=False,
        description="If true, also return a list of up to 10 links found on the page.",
    )


# ---------------------------------------------------------------------------
# Tool metadata
# ---------------------------------------------------------------------------


def website_analyzer_tool() -> dict:
    """Returns tool metadata for the agent / LLM."""
    return {
        "name": "analyze_website",
        "description": (
            "Fetches and analyzes a public web page. "
            "Returns the page title, meta description, main headings, "
            "a text excerpt, and optionally a list of links. "
            "Use when the user asks to analyze, summarize, or inspect a URL. "
            "Example: 'analyze https://example.com' or 'what is on this website?'"
        ),
        "input_schema": WebsiteAnalyzerInput.model_json_schema(),
    }


# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------


async def execute_analyze_website(args: dict) -> str:
    """
    Fetches a URL and returns structured page analysis.

    Raises:
        ToolGuardrailError: if the URL points to an internal/private address.
        pydantic.ValidationError: if args don't match WebsiteAnalyzerInput.
    Returns:
        str: formatted analysis report.
    """
    validated = WebsiteAnalyzerInput(**args)

    # ── Guardrail: block internal addresses ──────────────────────────────
    parsed = urlparse(validated.url)
    hostname = (parsed.hostname or "").lower()

    if (
        hostname in _BLOCKED_HOSTS
        or hostname.startswith("192.168.")
        or hostname.startswith("10.")
        or hostname.startswith("172.16.")
    ):
        raise ToolGuardrailError(
            f"Requests to internal or private addresses are not allowed. "
            f"Blocked host: '{hostname}'"
        )

    if parsed.scheme not in ("http", "https"):
        raise ToolGuardrailError(
            f"Only http:// and https:// URLs are allowed. Got scheme: '{parsed.scheme}'"
        )

    # ── Fetch ─────────────────────────────────────────────────────────────
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; AgenticStudio/1.0; +https://agentic.studio)"
        )
    }

    async with httpx.AsyncClient(
        timeout=15.0,
        follow_redirects=True,
        headers=headers,
    ) as client:
        response = await client.get(validated.url)
        response.raise_for_status()

    content_type = response.headers.get("content-type", "")
    if "text/html" not in content_type and "application/xhtml" not in content_type:
        # Not HTML — return raw info
        return (
            f"URL: {validated.url}\n"
            f"Status: HTTP {response.status_code}\n"
            f"Content-Type: {content_type}\n"
            f"Note: The URL returned a non-HTML response (e.g. JSON, image, PDF). "
            f"Cannot parse page structure."
        )

    # ── Parse ─────────────────────────────────────────────────────────────
    soup = BeautifulSoup(response.text, "html.parser")

    # Title
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else "—"

    # Meta description
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].strip()

    # OG description fallback
    if not meta_desc:
        og_tag = soup.find("meta", attrs={"property": "og:description"})
        if og_tag and og_tag.get("content"):
            meta_desc = og_tag["content"].strip()

    # Headings
    h1_tags = [h.get_text(strip=True) for h in soup.find_all("h1")]
    h2_tags = [h.get_text(strip=True) for h in soup.find_all("h2")][:5]

    # Main text (strip scripts, styles, nav, footer)
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    body = soup.find("body")
    raw_text = body.get_text(separator=" ", strip=True) if body else soup.get_text(separator=" ", strip=True)
    # Collapse whitespace
    import re
    raw_text = re.sub(r"\s+", " ", raw_text).strip()
    excerpt = raw_text[:800] + ("…" if len(raw_text) > 800 else "")

    # Links (optional)
    links_section = ""
    if validated.include_links:
        base = f"{parsed.scheme}://{parsed.netloc}"
        all_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("#") or href.startswith("javascript:"):
                continue
            full = urljoin(base, href)
            text = a.get_text(strip=True)[:60] or full
            all_links.append(f"  • {text} → {full}")
        all_links = all_links[:10]
        links_section = (
            f"\n\n🔗 Links ({len(all_links)} shown):\n" + "\n".join(all_links)
            if all_links else "\n\n🔗 Links: none found"
        )

    # ── Format report ─────────────────────────────────────────────────────
    headings_text = ""
    if h1_tags:
        headings_text += "\n  H1: " + " | ".join(h1_tags[:3])
    if h2_tags:
        headings_text += "\n  H2: " + " | ".join(h2_tags)

    report = (
        f"🌐 Website Analysis: {validated.url}\n"
        f"{'─' * 50}\n"
        f"📄 Title: {title}\n"
        f"📝 Meta Description: {meta_desc or '—'}\n"
        f"📌 Headings:{headings_text or ' —'}\n"
        f"\n📖 Text Excerpt:\n{excerpt}"
        f"{links_section}"
    )

    return report
