from ..tool_schemas import ProductSearchInput


def product_search_tool() -> dict:
    return {
        "name": "product_search",
        "description": (
            "Шукає товари в каталозі інтернет-магазину за назвою або категорією. "
            "Використовуй коли користувач хоче знайти, переглянути або порівняти товари. "
            "Приклад: product_search(query='бездротові навушники', category='електроніка', max_results=5)"
        ),
        "input_schema": ProductSearchInput.model_json_schema(),
    }


async def execute_product_search(args: dict) -> str:
    validated = ProductSearchInput(**args)
    # TODO: підключити реальний API через http_request_tool
    results = [
        {"name": f"{validated.query} Pro", "price": "1499 грн", "rating": 4.5, "in_stock": True},
        {"name": f"{validated.query} Basic", "price": "899 грн", "rating": 4.1, "in_stock": True},
        {"name": f"{validated.query} Premium", "price": "2799 грн", "rating": 4.8, "in_stock": False},
    ]
    lines = [f"🛒 Результати пошуку для '{validated.query}':"]
    for i, r in enumerate(results[:validated.max_results], 1):
        stock = "✅ В наявності" if r["in_stock"] else "❌ Немає в наявності"
        lines.append(f"{i}. {r['name']} — {r['price']} | ⭐ {r['rating']} | {stock}")
    return "\n".join(lines)
