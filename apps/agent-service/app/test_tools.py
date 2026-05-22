import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from services.tool_execution_service import (
    execute_tool_call,
    ERROR_TYPE_UNKNOWN_TOOL,
    ERROR_TYPE_VALIDATION,
    ERROR_TYPE_BLOCKED,
)


def _print_result(label: str, result: dict) -> None:
    icon = "✅" if result["status"] == "success" else "❌"
    print(f"\n{icon} {label}")
    print(f"   tool_name:   {result['tool_name']}")
    print(f"   status:      {result['status']}")
    print(f"   error_type:  {result.get('error_type')}")
    print(f"   duration_ms: {result['duration_ms']}")
    print(f"   result:      {result['result'][:120]}")


async def main():
    # ── 1. Successful tool call ───────────────────────────────────────────
    r = await execute_tool_call(
        "get_current_time", {"timezone": "Europe/Kyiv"},
        execution_id="test-001",
    )
    _print_result("get_current_time → success", r)
    assert r["status"] == "success", f"Expected success, got {r['status']}"
    assert r["error_type"] is None
    assert r["duration_ms"] >= 0

    # ── 2. Unknown tool ───────────────────────────────────────────────────
    r = await execute_tool_call("fake_tool", {}, execution_id="test-002")
    _print_result("fake_tool → unknown_tool", r)
    assert r["status"] == "error"
    assert r["error_type"] == ERROR_TYPE_UNKNOWN_TOOL

    # ── 3. Validation error ───────────────────────────────────────────────
    r = await execute_tool_call("save_note", {}, execution_id="test-003")
    _print_result("save_note (no args) → validation_error", r)
    assert r["status"] == "error"
    assert r["error_type"] == ERROR_TYPE_VALIDATION

    # ── 4. http_request — public API (GET) ────────────────────────────────
    r = await execute_tool_call(
        "http_request",
        {"url": "https://httpbin.org/get", "method": "GET"},
        execution_id="test-004",
    )
    _print_result("http_request GET httpbin.org → success", r)
    assert r["status"] == "success", f"Expected success, got {r['status']}: {r['result']}"
    assert "200" in r["result"]

    # ── 5. http_request — blocked internal address ────────────────────────
    r = await execute_tool_call(
        "http_request",
        {"url": "http://localhost:8080/secret"},
        execution_id="test-005",
    )
    _print_result("http_request localhost → blocked", r)
    assert r["status"] == "error", f"Expected error, got {r['status']}"
    assert r["error_type"] == ERROR_TYPE_BLOCKED, f"Expected blocked, got {r['error_type']}"

    # ── 6. http_request — disallowed method ──────────────────────────────
    r = await execute_tool_call(
        "http_request",
        {"url": "https://httpbin.org/get", "method": "HACK"},
        execution_id="test-006",
    )
    _print_result("http_request method=HACK → blocked", r)
    assert r["status"] == "error"
    assert r["error_type"] == ERROR_TYPE_BLOCKED, f"Expected blocked, got {r['error_type']}"

    print("\n🏁 All 6 assertions passed.")


asyncio.run(main())