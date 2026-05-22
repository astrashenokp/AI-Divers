from .tool_schemas import SaveNoteInput

# Temporary in-memory store while DB is being set up by Stas Data
# Replace with actual repository call once available
_in_memory_notes: list[dict] = []


def save_note_tool() -> dict:
    """Returns tool metadata for the agent / LLM."""
    return {
        "name": "save_note",
        "description": (
            "Saves an important note or piece of information for the current session. "
            "Use when the user asks to remember something."
        ),
        "input_schema": SaveNoteInput.model_json_schema(),
    }


async def execute_save_note(args: dict) -> str:
    """Saves a note. Uses in-memory store until DB layer is ready."""
    validated = SaveNoteInput(**args)

    # TODO: replace with Stas Data's repository call
    # from app.repositories.chat_repository import save_note_to_db
    # await save_note_to_db(session_id=validated.session_id, content=validated.content)

    _in_memory_notes.append({
        "session_id": validated.session_id,
        "content": validated.content,
    })

    return f"Note saved successfully for session {validated.session_id}."