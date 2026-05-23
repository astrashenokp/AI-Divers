from typing import TypedDict


class AgentState(TypedDict):
    messages: list
    domain: str | None
    use_case: str | None
    execution_id: str
    step_count: int
    max_steps: int
    system_prompt: str | None
    tools: list[str] | None
    guardrails: dict | None
    session_id: str | None
    model_provider: str | None
    model_name: str | None
