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
    print(f"   domain:      {result.get('domain')}")
    print(f"   error_type:  {result.get('error_type')}")
    print(f"   duration_ms: {result['duration_ms']}")
    print(f"   result:      {result['result'][:120]}")


async def main():

    # ======================================================================
    print("\n" + "=" * 60)
    print("SHARED TOOLS (no domain)")
    print("=" * 60)

    r = await execute_tool_call("get_current_time", {"timezone": "Europe/Kyiv"}, execution_id="t-001")
    _print_result("get_current_time → success", r)
    assert r["status"] == "success" and r["error_type"] is None

    r = await execute_tool_call("fake_tool", {}, execution_id="t-002")
    _print_result("fake_tool → unknown_tool", r)
    assert r["status"] == "error" and r["error_type"] == ERROR_TYPE_UNKNOWN_TOOL

    r = await execute_tool_call("save_note", {}, execution_id="t-003")
    _print_result("save_note (no args) → validation_error", r)
    assert r["status"] == "error" and r["error_type"] == ERROR_TYPE_VALIDATION

    r = await execute_tool_call("http_request", {"url": "https://httpbin.org/get"}, execution_id="t-004")
    _print_result("http_request GET → success", r)
    assert r["status"] == "success" and "200" in r["result"]

    r = await execute_tool_call("http_request", {"url": "http://localhost:8080/secret"}, execution_id="t-005")
    _print_result("http_request localhost → blocked", r)
    assert r["status"] == "error" and r["error_type"] == ERROR_TYPE_BLOCKED

    r = await execute_tool_call("http_request", {"url": "https://httpbin.org/get", "method": "HACK"}, execution_id="t-006")
    _print_result("http_request HACK → blocked", r)
    assert r["status"] == "error" and r["error_type"] == ERROR_TYPE_BLOCKED

    # ======================================================================
    print("\n" + "=" * 60)
    print("ECOMMERCE DOMAIN")
    print("=" * 60)

    r = await execute_tool_call("product_search", {"query": "бездротові навушники"}, execution_id="t-007", domain="ecommerce")
    _print_result("product_search (ecommerce) → success", r)
    assert r["status"] == "success" and r["domain"] == "ecommerce"

    r = await execute_tool_call("order_status", {"order_id": "ORD-12345"}, execution_id="t-008", domain="ecommerce")
    _print_result("order_status (ecommerce) → success", r)
    assert r["status"] == "success"

    r = await execute_tool_call("check_price", {"product_id": "PROD-001"}, execution_id="t-009", domain="ecommerce")
    _print_result("check_price (ecommerce) → success", r)
    assert r["status"] == "success"

    # Domain scoping: hotel_search is NOT available in ecommerce
    r = await execute_tool_call("hotel_search", {"city": "Київ", "check_in": "2026-06-15", "check_out": "2026-06-18"}, execution_id="t-010", domain="ecommerce")
    _print_result("hotel_search in ecommerce → unknown_tool (scoped out)", r)
    assert r["status"] == "error" and r["error_type"] == ERROR_TYPE_UNKNOWN_TOOL

    # ======================================================================
    print("\n" + "=" * 60)
    print("EDUCATION DOMAIN")
    print("=" * 60)

    r = await execute_tool_call("course_search", {"query": "Python програмування"}, execution_id="t-011", domain="education")
    _print_result("course_search (education) → success", r)
    assert r["status"] == "success" and r["domain"] == "education"

    r = await execute_tool_call("course_info", {"course_id": "COURSE-101"}, execution_id="t-012", domain="education")
    _print_result("course_info (education) → success", r)
    assert r["status"] == "success"

    r = await execute_tool_call("save_progress", {"user_id": "user-123", "course_id": "COURSE-101", "lesson_id": "L5"}, execution_id="t-013", domain="education")
    _print_result("save_progress (education) → success", r)
    assert r["status"] == "success"

    # ======================================================================
    print("\n" + "=" * 60)
    print("TOURISM DOMAIN")
    print("=" * 60)

    r = await execute_tool_call("hotel_search", {"city": "Львів", "check_in": "2026-06-15", "check_out": "2026-06-18"}, execution_id="t-014", domain="tourism")
    _print_result("hotel_search (tourism) → success", r)
    assert r["status"] == "success" and r["domain"] == "tourism"

    r = await execute_tool_call("itinerary_plan", {"destination": "Київ", "days": 3, "interests": "музеї, їжа"}, execution_id="t-015", domain="tourism")
    _print_result("itinerary_plan (tourism) → success", r)
    assert r["status"] == "success"

    r = await execute_tool_call("get_weather", {"city": "Одеса", "days": 3}, execution_id="t-016", domain="tourism")
    _print_result("get_weather (tourism) → success", r)
    assert r["status"] == "success"

    # ======================================================================
    print("\n" + "=" * 60)
    print("GENERAL DOMAIN (shared tools only)")
    print("=" * 60)

    r = await execute_tool_call("get_current_time", {"timezone": "Europe/Kyiv"}, execution_id="t-017", domain="general")
    _print_result("get_current_time (general) → success", r)
    assert r["status"] == "success" and r["domain"] == "general"

    # product_search is NOT available in general
    r = await execute_tool_call("product_search", {"query": "тест"}, execution_id="t-018", domain="general")
    _print_result("product_search in general → unknown_tool (scoped out)", r)
    assert r["status"] == "error" and r["error_type"] == ERROR_TYPE_UNKNOWN_TOOL

    print("\n" + "=" * 60)
    print("🏁 All 18 assertions passed.")
    print("=" * 60)


asyncio.run(main())
