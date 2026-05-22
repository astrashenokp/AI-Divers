from ..tool_schemas import CourseInfoInput

_in_memory_courses: dict[str, dict] = {
    "py-101": {
        "id": "py-101",
        "title": "Python для початківців",
        "level": "beginner",
        "duration": "6 тижнів",
        "description": "Курс ознайомить вас з основами Python: змінні, типи даних, цикли, функції, робота з файлами.",
        "topics": ["Вступ до Python", "Змінні та типи даних", "Умовні оператори", "Цикли", "Функції", "Робота з файлами"],
    },
    "py-201": {
        "id": "py-201",
        "title": "Python: продвинутий рівень",
        "level": "intermediate",
        "duration": "8 тижнів",
        "description": "Поглиблене вивчення Python: ООП, декоратори, генератори, асинхронність, тестування.",
        "topics": ["Об'єктно-орієнтоване програмування", "Декоратори та генератори", "Асинхронне програмування", "Тестування", "Робота з API"],
    },
    "js-101": {
        "id": "js-101",
        "title": "JavaScript для початківців",
        "level": "beginner",
        "duration": "5 тижнів",
        "description": "Основи JavaScript: змінні, функції, DOM, події, асинхронність.",
        "topics": ["Змінні та типи", "Функції та області видимості", "DOM маніпуляції", "Обробка подій", "Асинхронний JS"],
    },
    "web-101": {
        "id": "web-101",
        "title": "Веб-розробка: HTML, CSS, JS",
        "level": "beginner",
        "duration": "10 тижнів",
        "description": "Повний курс веб-розробки: HTML5, CSS3, JavaScript, адаптивний дизайн.",
        "topics": ["HTML5 семантика", "CSS3 стилізація", "Flexbox та Grid", "JavaScript основи", "Адаптивний дизайн"],
    },
    "data-101": {
        "id": "data-101",
        "title": "Аналіз даних з Python",
        "level": "intermediate",
        "duration": "7 тижнів",
        "description": "Аналіз даних за допомогою Pandas, NumPy, Matplotlib. Робота з реальними наборами даних.",
        "topics": ["Pandas основи", "NumPy масиви", "Візуалізація з Matplotlib", "Очищення даних", "Статистичний аналіз"],
    },
    "ai-101": {
        "id": "ai-101",
        "title": "Основи штучного інтелекту",
        "level": "beginner",
        "duration": "4 тижні",
        "description": "Вступ до AI: машинне навчання, нейронні мережі, NLP, комп'ютерний зір.",
        "topics": ["Що таке AI?", "Машинне навчання", "Нейронні мережі", "NLP та комп'ютерний зір"],
    },
}


def course_info_tool() -> dict:
    return {
        "name": "course_info",
        "description": "Returns detailed information about a specific course by its ID.",
        "input_schema": CourseInfoInput.model_json_schema(),
    }


async def execute_course_info(args: dict) -> str:
    validated = CourseInfoInput(**args)

    course = _in_memory_courses.get(validated.course_id)
    if not course:
        return f"Курс з ID '{validated.course_id}' не знайдено."

    lines = [
        f"**{course['title']}**",
        f"ID: {course['id']}",
        f"Рівень: {course['level']}",
        f"Тривалість: {course['duration']}",
        f"Опис: {course['description']}",
        "Теми:",
    ]
    for i, topic in enumerate(course["topics"], 1):
        lines.append(f"  {i}. {topic}")

    return "\n".join(lines)
