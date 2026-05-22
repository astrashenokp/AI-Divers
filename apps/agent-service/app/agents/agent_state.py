from typing import TypedDict


class AgentState(TypedDict):
    messages: list
    domain: str | None
    use_case: str | None
    execution_id: str
    step_count: int
    max_steps: int
