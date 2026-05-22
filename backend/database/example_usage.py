# example_usage.py
import asyncio

# Синхронне використання
from backend.database import get_suppliers_with_gln, print_suppliers_gln
from backend.database import export_gln_to_file_async

# Отримати дані
suppliers = get_suppliers_with_gln(limit=10)
print(f"Отримано {len(suppliers)} постачальників")

# Вивести красиво
print_suppliers_gln(limit=5000)


# Асинхронне використання
async def main():
    from backend.database import get_gln_from_meti_central_async

    suppliers = await get_gln_from_meti_central_async(limit=5000)
    print(f"Асинхронно отримано {len(suppliers)} постачальників")

    # Експорт у файл
    # filename = await export_gln_to_file_async(limit=100, format="csv")
    filename = await export_gln_to_file_async(limit=5000, format="excel")
    print(f"Дані збережено у файл: {filename}")


if __name__ == "__main__":
    # Синхронний приклад
    print_suppliers_gln(limit=5000)

    # Асинхронний приклад
    asyncio.run(main())
