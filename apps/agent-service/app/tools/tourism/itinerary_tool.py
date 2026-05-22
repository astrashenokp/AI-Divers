from ..tool_schemas import ItineraryInput


def itinerary_tool() -> dict:
    return {
        "name": "itinerary_plan",
        "description": (
            "Складає детальний план подорожі по місту або країні. "
            "Використовуй коли користувач хоче спланувати маршрут або дізнатися що подивитись. "
            "Приклад: itinerary_plan(destination='Київ', days=3, interests='музеї, їжа, історія')"
        ),
        "input_schema": ItineraryInput.model_json_schema(),
    }


async def execute_itinerary(args: dict) -> str:
    validated = ItineraryInput(**args)
    interests_note = f" (інтереси: {validated.interests})" if validated.interests else ""
    # TODO: підключити реальний LLM-based itinerary або туристичний API
    days_plan = []
    for day in range(1, min(validated.days + 1, 4)):
        days_plan.append(
            f"День {day}:\n"
            f"  🌅 Ранок: Прогулянка центром {validated.destination}\n"
            f"  🍽 Обід: Місцевий ресторан з традиційною кухнею\n"
            f"  🏛 День: Відвідування музею або пам'ятки\n"
            f"  🌙 Вечір: Вечеря та прогулянка набережною"
        )
    if validated.days > 3:
        days_plan.append(f"... та ще {validated.days - 3} дні за аналогічною програмою")
    return (
        f"🗺 Маршрут для {validated.destination} на {validated.days} дні{interests_note}\n\n"
        + "\n\n".join(days_plan)
    )
