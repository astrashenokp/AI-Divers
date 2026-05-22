import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from services.tool_execution_service import execute_tool_call

async def main():
    # Тест 1 — current_time
    result = await execute_tool_call("get_current_time", {"timezone": "Europe/Kyiv"})
    print("✅ current_time:", result)

    # Тест 2 — невідомий tool
    result = await execute_tool_call("fake_tool", {})
    print("✅ unknown tool:", result)

    # Тест 3 — невалідні аргументи
    result = await execute_tool_call("save_note", {})
    print("✅ invalid args:", result)

asyncio.run(main())