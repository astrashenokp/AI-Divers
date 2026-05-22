from pydantic import BaseModel, Field


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
