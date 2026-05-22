import os
import httpx
from ..tool_schemas import GetWeatherInput

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/forecast"


def get_weather_tool() -> dict:
    return {
        "name": "get_weather",
        "description": (
            "Повертає прогноз погоди для міста на кілька днів. "
            "Використовуй коли користувач запитує про погоду або планує поїздку. "
            "Приклад: get_weather(city='Одеса', days=3)"
        ),
        "input_schema": GetWeatherInput.model_json_schema(),
    }


async def execute_get_weather(args: dict) -> str:
    validated = GetWeatherInput(**args)

    if OPENWEATHER_API_KEY:
        # Real API call when key is available
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                OPENWEATHER_URL,
                params={
                    "q": validated.city,
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric",
                    "lang": "ua",
                    "cnt": validated.days * 8,
                },
            )
            if response.status_code == 200:
                data = response.json()
                lines = [f"🌤 Прогноз погоди для {validated.city} на {validated.days} дні:"]
                seen_dates = set()
                for item in data.get("list", []):
                    date = item["dt_txt"][:10]
                    if date not in seen_dates and len(seen_dates) < validated.days:
                        seen_dates.add(date)
                        temp = item["main"]["temp"]
                        desc = item["weather"][0]["description"]
                        lines.append(f"📅 {date}: {temp:.0f}°C, {desc}")
                return "\n".join(lines)

    # Stub fallback if no API key
    lines = [f"🌤 Прогноз погоди для {validated.city} на {validated.days} дні:"]
    temps = [18, 21, 19, 23, 17, 22, 20]
    descs = ["сонячно", "хмарно", "невеликий дощ", "ясно", "вітряно", "сонячно", "мінлива хмарність"]
    from datetime import date, timedelta
    for i in range(validated.days):
        d = date.today() + timedelta(days=i)
        lines.append(f"📅 {d}: {temps[i % 7]}°C, {descs[i % 7]}")
    lines.append("\n⚠️ Прогноз орієнтовний. Додайте OPENWEATHER_API_KEY для реальних даних.")
    return "\n".join(lines)
