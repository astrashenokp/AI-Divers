from pydantic import BaseModel, Field


class GetCurrentTimeInput(BaseModel):
    timezone: str = Field(default="UTC", description="Timezone string, e.g. 'UTC' or 'Europe/Kyiv'")


class SearchWebInput(BaseModel):
    query: str = Field(..., description="Search query string")
    max_results: int = Field(default=3, ge=1, le=10, description="Max number of results to return")


class SaveNoteInput(BaseModel):
    session_id: str = Field(..., description="Chat session ID to associate the note with")
    content: str = Field(..., description="Text content of the note to save")