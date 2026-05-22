import sys
import os

from database.query_executor import QueryExecutor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def quick_test():
    print("=" * 60)

    # Створюємо виконавця
    executor = QueryExecutor(connection_type="central")
    query = """
            SELECT
                CIF_CDFO as supplier_code,
                CIF_RS as supplier_name,
                CIF_CDEANCIF as gln
            FROM PRUACE.MGCIF
            WHERE CIF_NOCI = 5 AND CIF_CDEANCIF <> 5 AND CIF_CDEANCIF IS NOT NULL
            """

    print("\nЗапит:")
    print("-" * 40)
    print(query.strip())
    print("-" * 40)
    executor.print_results(query, max_rows=10, lowercase_columns=True)

    print("\n✅ Тест завершено успішно!")


if __name__ == "__main__":
    quick_test()
