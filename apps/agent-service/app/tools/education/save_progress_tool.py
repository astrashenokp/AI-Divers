from ..tool_schemas import SaveProgressInput


def save_progress_tool() -> dict:
    return {
        "name": "save_progress",
        "description": (
            "Зберігає прогрес студента — пройдений урок або досягнення. "
            "Використовуй коли користувач завершив урок, тест або важливий крок. "
            "Приклад: save_progress(user_id='user-123', course_id='COURSE-101', lesson_id='L5')"
        ),
        "input_schema": SaveProgressInput.model_json_schema(),
    }


async def execute_save_progress(args: dict) -> str:
    validated = SaveProgressInput(**args)
    # TODO: підключити БД від Стаса Data
    return (
        f"✅ Прогрес збережено!\n"
        f"Користувач: {validated.user_id}\n"
        f"Курс: {validated.course_id}\n"
        f"Урок {validated.lesson_id} позначено як завершений.\n"
        f"Продовжуй у тому ж дусі! 🚀"
    )
