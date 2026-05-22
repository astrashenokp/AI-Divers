from ..tool_schemas import CourseSearchInput


def course_search_tool() -> dict:
    return {
        "name": "course_search",
        "description": (
            "Шукає навчальні курси за темою або навичкою. "
            "Використовуй коли користувач хоче знайти або порівняти курси для навчання. "
            "Приклад: course_search(query='Python програмування', level='beginner', max_results=5)"
        ),
        "input_schema": CourseSearchInput.model_json_schema(),
    }


async def execute_course_search(args: dict) -> str:
    validated = CourseSearchInput(**args)
    # TODO: підключити реальний API курсів
    results = [
        {"title": f"{validated.query} — Повний курс", "instructor": "Іван Коваленко", "duration": "12 год", "rating": 4.7, "price": "Безкоштовно"},
        {"title": f"{validated.query} для початківців", "instructor": "Марія Шевченко", "duration": "6 год", "rating": 4.5, "price": "499 грн"},
        {"title": f"Просунутий {validated.query}", "instructor": "Олексій Мельник", "duration": "20 год", "rating": 4.9, "price": "999 грн"},
    ]
    lines = [f"🎓 Курси за темою '{validated.query}':"]
    for i, c in enumerate(results[:validated.max_results], 1):
        lines.append(f"{i}. {c['title']}\n   👤 {c['instructor']} | ⏱ {c['duration']} | ⭐ {c['rating']} | 💰 {c['price']}")
    return "\n".join(lines)
