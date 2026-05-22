from ..tool_schemas import CourseInfoInput


def course_info_tool() -> dict:
    return {
        "name": "course_info",
        "description": (
            "Повертає детальну інформацію про конкретний курс: програму, вимоги, результати навчання. "
            "Використовуй коли користувач хоче дізнатися більше про курс перед записом. "
            "Приклад: course_info(course_id='COURSE-101')"
        ),
        "input_schema": CourseInfoInput.model_json_schema(),
    }


async def execute_course_info(args: dict) -> str:
    validated = CourseInfoInput(**args)
    # TODO: підключити реальний API
    return (
        f"📚 Курс {validated.course_id}\n"
        f"Назва: Python для аналізу даних\n"
        f"Тривалість: 15 годин | 42 уроки\n"
        f"Рівень: Середній\n"
        f"Теми: Pandas, NumPy, Matplotlib, основи ML\n"
        f"Вимоги: Базові знання Python\n"
        f"Сертифікат: Так ✅"
    )
