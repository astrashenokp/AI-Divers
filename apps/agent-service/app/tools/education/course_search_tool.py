from ..tool_schemas import CourseSearchInput

_in_memory_courses: list[dict] = [
    {"id": "py-101", "title": "Python для початківців", "level": "beginner", "duration": "6 тижнів"},
    {"id": "py-201", "title": "Python: продвинутий рівень", "level": "intermediate", "duration": "8 тижнів"},
    {"id": "js-101", "title": "JavaScript для початківців", "level": "beginner", "duration": "5 тижнів"},
    {"id": "web-101", "title": "Веб-розробка: HTML, CSS, JS", "level": "beginner", "duration": "10 тижнів"},
    {"id": "data-101", "title": "Аналіз даних з Python", "level": "intermediate", "duration": "7 тижнів"},
    {"id": "ai-101", "title": "Основи штучного інтелекту", "level": "beginner", "duration": "4 тижні"},
]


def course_search_tool() -> dict:
    return {
        "name": "course_search",
        "description": "Searches for courses by topic or skill. Use when the user wants to find learning courses.",
        "input_schema": CourseSearchInput.model_json_schema(),
    }


async def execute_course_search(args: dict) -> str:
    validated = CourseSearchInput(**args)

    query_lower = validated.query.lower()
    results = [
        c for c in _in_memory_courses
        if (validated.level == "any" or c["level"] == validated.level)
        and any(word in c["title"].lower() for word in query_lower.split())
    ]

    if not results:
        return f"За запитом '{validated.query}' курсів не знайдено."

    lines = [f"Знайдено курсів: {len(results)}"]
    for c in results[:validated.max_results]:
        lines.append(f"\n- **{c['title']}** (ID: {c['id']})")
        lines.append(f"  Рівень: {c['level']}, Тривалість: {c['duration']}")

    return "\n".join(lines)
