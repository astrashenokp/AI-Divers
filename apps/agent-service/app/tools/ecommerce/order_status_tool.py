from ..tool_schemas import OrderStatusInput


def order_status_tool() -> dict:
    return {
        "name": "order_status",
        "description": (
            "Перевіряє статус і трекінг замовлення за його номером. "
            "Використовуй коли користувач запитує про своє замовлення, доставку або відправлення. "
            "Приклад: order_status(order_id='ORD-12345')"
        ),
        "input_schema": OrderStatusInput.model_json_schema(),
    }


async def execute_order_status(args: dict) -> str:
    validated = OrderStatusInput(**args)
    # TODO: підключити реальний API
    return (
        f"📦 Замовлення {validated.order_id}\n"
        f"Статус: Відправлено ✅\n"
        f"Перевізник: Нова Пошта\n"
        f"ТТН: 59000{validated.order_id[-4:]}\n"
        f"Очікувана доставка: 24 травня 2026"
    )
