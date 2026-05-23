# ── Додати в tool_schemas.py ──────────────────────────────────────────────
# Скопіюй цей клас у кінець існуючого tool_schemas.py.

from typing import Literal

from pydantic import Field, model_validator


class DatabaseQueryInput(BaseModel):
    """
    Input schema for database_query_tool.

    query_type визначає який саме platform-level read запит виконується.
    Це не raw SQL і не generic filters dict — лише allowlist сценаріїв.
    """

    query_type: Literal[
        "get_session_messages",
        "get_agent_config",
        "get_execution_summary",
        "get_user_progress",
    ] = Field(
        ...,
        description=(
            "What to read from the system. "
            "'get_session_messages' requires session_id. "
            "'get_agent_config' requires agent_id. "
            "'get_execution_summary' requires session_id or execution_id. "
            "'get_user_progress' requires user_id and optionally course_id."
        ),
    )

    session_id: str | None = Field(
        default=None,
        description="Session UUID. Required for get_session_messages and one valid option for get_execution_summary.",
    )
    agent_id: str | None = Field(
        default=None,
        description="Agent UUID. Required for get_agent_config.",
    )
    user_id: str | None = Field(
        default=None,
        description="User UUID. Required for get_user_progress.",
    )
    course_id: str | None = Field(
        default=None,
        description="Optional course ID filter, e.g. 'py-101'.",
    )
    execution_id: str | None = Field(
        default=None,
        description="Execution ID. Optional filter for get_execution_summary.",
    )
    limit: int = Field(
        default=20,
        ge=1,
        le=50,
        description="Max number of records to return. Default 20, max 50.",
    )

    @model_validator(mode="after")
    def validate_required_fields(self) -> "DatabaseQueryInput":
        if self.query_type == "get_session_messages" and not self.session_id:
            raise ValueError("session_id is required for get_session_messages")

        if self.query_type == "get_agent_config" and not self.agent_id:
            raise ValueError("agent_id is required for get_agent_config")

        if self.query_type == "get_execution_summary":
            if not self.session_id and not self.execution_id:
                raise ValueError(
                    "session_id or execution_id is required for get_execution_summary"
                )

        if self.query_type == "get_user_progress" and not self.user_id:
            raise ValueError("user_id is required for get_user_progress")

        return self
