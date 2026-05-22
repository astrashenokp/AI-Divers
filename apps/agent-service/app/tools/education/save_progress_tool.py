from ..tool_schemas import SaveProgressInput

_in_memory_progress: list[dict] = []


def save_progress_tool() -> dict:
    return {
        "name": "save_progress",
        "description": "Saves student progress for a specific lesson in a course.",
        "input_schema": SaveProgressInput.model_json_schema(),
    }


async def execute_save_progress(args: dict) -> str:
    validated = SaveProgressInput(**args)

    _in_memory_progress.append({
        "user_id": validated.user_id,
        "course_id": validated.course_id,
        "lesson_id": validated.lesson_id,
    })

    return (
        f"Прогрес збережено! "
        f"Користувач {validated.user_id}, курс {validated.course_id}, урок {validated.lesson_id}."
    )
