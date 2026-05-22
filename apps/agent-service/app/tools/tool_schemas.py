from pydantic import BaseModel, Field


class GetCurrentTimeInput(BaseModel):
    timezone: str = Field(
        default="UTC",
        description="Timezone string, e.g. 'UTC' or 'Europe/Kyiv'",
    )


class SearchWebInput(BaseModel):
    query: str = Field(..., description="Search query string")
    max_results: int = Field(
        default=3, ge=1, le=10,
        description="Max number of results to return",
    )


class SaveNoteInput(BaseModel):
    session_id: str = Field(..., description="Chat session ID to associate the note with")
    content: str = Field(..., description="Text content of the note to save")


class HttpRequestInput(BaseModel):
    url: str = Field(
        ...,
        description=(
            "Full URL to send the request to. Must be a public HTTP/HTTPS URL. "
            "Example: 'https://api.example.com/v1/orders/99'"
        ),
    )
    method: str = Field(
        default="GET",
        description="HTTP method: GET, POST, PUT, PATCH, DELETE. Default is GET.",
    )
    headers: dict = Field(
        default_factory=dict,
        description=(
            "Optional request headers as key-value pairs. "
            'Example: {"Authorization": "Bearer token123"}'
        ),
    )
    body: str = Field(
        default="",
        description=(
            "Optional request body for POST/PUT/PATCH requests. "
            'Send JSON as a string. Example: {"key": "value"}'
        ),
    )
    timeout_seconds: float = Field(
        default=15.0,
        ge=1.0,
        le=30.0,
        description="Request timeout in seconds. Min 1, max 30. Default 15.",
    )