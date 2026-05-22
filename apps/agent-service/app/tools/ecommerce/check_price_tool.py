from ..tool_schemas import CheckPriceInput


def check_price_tool() -> dict:
    return {
        "name": "check_price",
        "description": (
            "Перевіряє поточну ціну та наявність конкретного товару. "
            "Використовуй коли користувач запитує про ціну, знижки або наявність товару. "
            "Приклад: check_price(product_id='PROD-001')"
        ),
        "input_schema": CheckPriceInput.model_json_schema(),
    }


async def execute_check_price(args: dict) -> str:
    validated = CheckPriceInput(**args)
    # TODO: підключити реальний API
    return (
        f"💰 Ціна товару {validated.product_id}:\n"
        f"Поточна ціна: 1499 грн\n"
        f"Стара ціна: 2099 грн\n"
        f"Знижка: 28% 🎉\n"
        f"В наявності: 12 одиниць"
    )
