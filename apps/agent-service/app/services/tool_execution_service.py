import logging
from pydantic import ValidationError

from tools.tool_registry import get_tool_registry

logger = logging.getLogger(__name__)


async def execute_tool_call(tool_name: str, args: dict) -> str:
    """
    Central entry point for tool execution.
    Called by Alina's agent after it decides to use a tool.

    Args:
        tool_name: name of the tool to call (must exist in TOOL_REGISTRY)
        args: raw dict of arguments from the LLM

    Returns:
        String result of the tool, or a safe error message string.
        Never raises — all errors are caught and returned as strings.
    """
    registry = get_tool_registry()

    if tool_name not in registry:
        logger.warning(f"Unknown tool requested: {tool_name}")
        return f"Error: tool '{tool_name}' is not available. Available tools: {list(registry.keys())}"

    tool_fn = registry[tool_name]

    try:
        result = await tool_fn(args)
        logger.info(f"Tool '{tool_name}' executed successfully")
        return str(result)

    except ValidationError as e:
        logger.warning(f"Tool '{tool_name}' received invalid args: {e}")
        return f"Error: invalid arguments for tool '{tool_name}'. Details: {e.errors()}"

    except Exception as e:
        logger.error(f"Tool '{tool_name}' raised an unexpected error: {e}", exc_info=True)
        return f"Error: tool '{tool_name}' failed with: {str(e)}"