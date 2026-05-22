from ..tool_schemas import HotelSearchInput


def hotel_search_tool() -> dict:
    return {
        "name": "hotel_search",
        "description": (
            "Шукає готелі в місті за датами заїзду та виїзду. "
            "Використовуй коли користувач хоче знайти місце для проживання під час подорожі. "
            "Приклад: hotel_search(city='Львів', check_in='2026-06-15', check_out='2026-06-18', guests=2)"
        ),
        "input_schema": HotelSearchInput.model_json_schema(),
    }


async def execute_hotel_search(args: dict) -> str:
    validated = HotelSearchInput(**args)
    # TODO: підключити Booking.com API або аналог через http_request
    results = [
        {"name": f"Готель Централь {validated.city}", "stars": 4, "price": "1800 грн/ніч", "rating": 4.6, "available": True},
        {"name": f"Апартаменти Затишок {validated.city}", "stars": 3, "price": "950 грн/ніч", "rating": 4.3, "available": True},
        {"name": f"Преміум Резорт {validated.city}", "stars": 5, "price": "4200 грн/ніч", "rating": 4.9, "available": False},
    ]
    lines = [
        f"🏨 Готелі у {validated.city}",
        f"📅 {validated.check_in} → {validated.check_out} | 👥 {validated.guests} гостей\n",
    ]
    for i, h in enumerate(results, 1):
        avail = "✅ Вільно" if h["available"] else "❌ Зайнято"
        lines.append(f"{i}. {h['name']} {'⭐' * h['stars']}\n   💰 {h['price']} | ⭐ {h['rating']} | {avail}")
    return "\n".join(lines)
