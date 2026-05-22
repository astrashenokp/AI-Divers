from html import unescape
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from .http_request_tool import ToolGuardrailError
from .tool_schemas import WebsiteAnalyzerInput

_BLOCKED_HOSTS = frozenset({
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",
    "metadata.google.internal",
})


def website_analyzer_tool() -> dict:
    """Returns tool metadata consumed by the agent / LLM."""
    return {
        "name": "website_analyzer",
        "description": (
            "Fetches and analyzes a public website page to extract a short structured summary. "
            "Use when the user provides a website and wants the agent to understand the business, "
            "page purpose, headings, key text, or useful public links. "
            "Example: website_analyzer(url='https://example.com', include_headings=True, include_links=True)"
        ),
        "input_schema": WebsiteAnalyzerInput.model_json_schema(),
    }


def _normalize_text(text: str) -> str:
    cleaned = " ".join(unescape(text).split())
    return cleaned.strip()


def _check_public_url(url: str) -> None:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    if parsed.scheme not in {"http", "https"}:
        raise ToolGuardrailError(
            f"Only public HTTP/HTTPS URLs are allowed. Got scheme: '{parsed.scheme or 'unknown'}'"
        )

    if (
        hostname in _BLOCKED_HOSTS
        or hostname.startswith("10.")
        or hostname.startswith("192.168.")
        or hostname.startswith("172.16.")
    ):
        raise ToolGuardrailError(
            f"Requests to internal or private addresses are not allowed. Blocked host: '{hostname}'"
        )


def _extract_headings(soup: BeautifulSoup) -> list[str]:
    headings: list[str] = []
    for tag_name in ("h1", "h2", "h3"):
        for tag in soup.find_all(tag_name):
            text = _normalize_text(tag.get_text(" ", strip=True))
            if text and text not in headings:
                headings.append(text)
    return headings[:10]


def _extract_paragraphs(soup: BeautifulSoup, max_paragraphs: int) -> list[str]:
    paragraphs: list[str] = []
    for tag in soup.find_all("p"):
        text = _normalize_text(tag.get_text(" ", strip=True))
        if len(text) >= 40 and text not in paragraphs:
            paragraphs.append(text)
        if len(paragraphs) >= max_paragraphs:
            break
    return paragraphs


def _extract_links(soup: BeautifulSoup, base_url: str, max_links: int) -> list[str]:
    links: list[str] = []
    seen: set[str] = set()
    for tag in soup.find_all("a", href=True):
        href = tag.get("href", "").strip()
        if not href or href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:"):
            continue
        full_url = urljoin(base_url, href)
        parsed = urlparse(full_url)
        if parsed.scheme not in {"http", "https"}:
            continue
        if full_url not in seen:
            seen.add(full_url)
            links.append(full_url)
        if len(links) >= max_links:
            break
    return links


async def execute_website_analyzer(args: dict) -> str:
    """
    Fetches a public website page and returns a compact analysis.

    Raises:
        ToolGuardrailError: if the URL points to an internal/private address
                            or uses a disallowed scheme.
        pydantic.ValidationError: if args do not match WebsiteAnalyzerInput.
    """
    validated = WebsiteAnalyzerInput(**args)
    _check_public_url(validated.url)

    headers = {
        "User-Agent": "AgenticStudioBot/1.0 (+website-analyzer)",
        "Accept": "text/html,application/xhtml+xml",
    }

    async with httpx.AsyncClient(
        timeout=validated.timeout_seconds,
        follow_redirects=True,
    ) as client:
        response = await client.get(validated.url, headers=headers)
        response.raise_for_status()

    content_type = response.headers.get("content-type", "")
    if "html" not in content_type.lower():
        return (
            f"Website analysis for {validated.url}\n"
            f"Status: {response.status_code}\n"
            f"Content-Type: {content_type or 'unknown'}\n"
            "The response is not an HTML page, so structured page analysis is limited."
        )

    soup = BeautifulSoup(response.text, "html.parser")

    for tag_name in ("script", "style", "noscript"):
        for tag in soup.find_all(tag_name):
            tag.decompose()

    title_tag = soup.find("title")
    title = _normalize_text(title_tag.get_text(" ", strip=True)) if title_tag else "N/A"

    description = ""
    meta_description = soup.find("meta", attrs={"name": "description"})
    if meta_description and meta_description.get("content"):
        description = _normalize_text(meta_description["content"])
    if not description:
        og_description = soup.find("meta", attrs={"property": "og:description"})
        if og_description and og_description.get("content"):
            description = _normalize_text(og_description["content"])

    headings = _extract_headings(soup) if validated.include_headings else []
    paragraphs = _extract_paragraphs(soup, validated.max_paragraphs)
    links = _extract_links(soup, str(response.url), validated.max_links) if validated.include_links else []

    lines = [
        f"Website analysis for {validated.url}",
        f"Final URL: {response.url}",
        f"Page title: {title}",
    ]

    if description:
        lines.append(f"Meta description: {description}")

    if headings:
        lines.append("")
        lines.append("Headings:")
        for item in headings:
            lines.append(f"- {item}")

    if paragraphs:
        lines.append("")
        lines.append("Key page text:")
        for idx, paragraph in enumerate(paragraphs, 1):
            lines.append(f"{idx}. {paragraph}")

    if links:
        lines.append("")
        lines.append("Useful links:")
        for link in links:
            lines.append(f"- {link}")

    if not headings and not paragraphs and not links:
        lines.append("")
        lines.append("No strong structured content could be extracted from this page.")

    return "\n".join(lines)
