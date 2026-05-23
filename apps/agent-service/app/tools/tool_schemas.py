from typing import Literal

from pydantic import BaseModel, Field, model_validator


# ===========================================================================
# SHARED SCHEMAS
# ===========================================================================

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
        description="Optional request headers as key-value pairs.",
    )
    body: str = Field(
        default="",
        description="Optional request body for POST/PUT/PATCH. Send JSON as a string.",
    )
    timeout_seconds: float = Field(
        default=15.0, ge=1.0, le=30.0,
        description="Request timeout in seconds. Min 1, max 30. Default 15.",
    )


# ===========================================================================
# ECOMMERCE SCHEMAS
# ===========================================================================

class ProductSearchInput(BaseModel):
    query: str = Field(
        ...,
        description=(
            "Product name or keyword to search for. "
            "Example: 'wireless headphones' or 'running shoes Nike'"
        ),
    )
    category: str = Field(
        default="",
        description="Optional product category filter. Example: 'electronics', 'clothing'",
    )
    max_results: int = Field(
        default=5, ge=1, le=10,
        description="Maximum number of products to return. Default 5.",
    )


class OrderStatusInput(BaseModel):
    order_id: str = Field(
        ...,
        description=(
            "Order ID to check status for. "
            "Example: 'ORD-12345' or '98765'"
        ),
    )


class CheckPriceInput(BaseModel):
    product_id: str = Field(
        ...,
        description=(
            "Product ID to check price and availability for. "
            "Example: 'PROD-001' or 'SKU-ABC123'"
        ),
    )


# ===========================================================================
# EDUCATION SCHEMAS
# ===========================================================================

class CourseSearchInput(BaseModel):
    query: str = Field(
        ...,
        description=(
            "Topic or skill to search courses for. "
            "Example: 'Python programming' or 'machine learning'"
        ),
    )
    level: str = Field(
        default="any",
        description="Difficulty level: 'beginner', 'intermediate', 'advanced', or 'any'. Default 'any'.",
    )
    max_results: int = Field(
        default=5, ge=1, le=10,
        description="Maximum number of courses to return. Default 5.",
    )


class CourseInfoInput(BaseModel):
    course_id: str = Field(
        ...,
        description=(
            "Course ID to get detailed information for. "
            "Example: 'COURSE-101' or 'py-for-beginners'"
        ),
    )


class SaveProgressInput(BaseModel):
    user_id: str = Field(
        ...,
        description="User ID whose progress to save. Example: 'user-abc-123'",
    )
    course_id: str = Field(
        ...,
        description="Course ID the user is taking. Example: 'COURSE-101'",
    )
    lesson_id: str = Field(
        ...,
        description="Lesson ID that was completed. Example: 'L5' or 'lesson-05'",
    )


# ===========================================================================
# TOURISM SCHEMAS
# ===========================================================================

class HotelSearchInput(BaseModel):
    city: str = Field(
        ...,
        description=(
            "City to search hotels in. "
            "Example: 'Lviv' or 'Paris'"
        ),
    )
    check_in: str = Field(
        ...,
        description="Check-in date in YYYY-MM-DD format. Example: '2026-06-15'",
    )
    check_out: str = Field(
        ...,
        description="Check-out date in YYYY-MM-DD format. Example: '2026-06-20'",
    )
    guests: int = Field(
        default=2, ge=1, le=10,
        description="Number of guests. Default 2.",
    )


class ItineraryInput(BaseModel):
    destination: str = Field(
        ...,
        description=(
            "City or country to build itinerary for. "
            "Example: 'Kyiv' or 'Italy'"
        ),
    )
    days: int = Field(
        ..., ge=1, le=30,
        description="Number of days for the trip. Example: 3",
    )
    interests: str = Field(
        default="",
        description=(
            "Optional interests to personalize the itinerary. "
            "Example: 'museums, food, history' or 'outdoor, hiking'"
        ),
    )


class GetWeatherInput(BaseModel):
    city: str = Field(
        ...,
        description="City to get weather forecast for. Example: 'Odesa' or 'Barcelona'",
    )
    days: int = Field(
        default=3, ge=1, le=7,
        description="Number of forecast days. Min 1, max 7. Default 3.",
    )


# ===========================================================================
# SHARED UTILITY SCHEMAS
# ===========================================================================

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


class DatabaseQueryInput(BaseModel):
    """
    Input schema for database_query_tool.

    query_type determines which platform-level read operation is allowed.
    This is not raw SQL and not a generic filters dict.
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
