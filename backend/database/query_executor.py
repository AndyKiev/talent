# backend/database/query_executor.py
import sys
import os
from typing import List, Dict, Any, Optional
import pandas as pd

# Додаємо шлях до проекту для імпорту модулів
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.manager_patched import DatabaseConnection


class QueryExecutor:
    """
    Клас для виконання SQL запитів та виведення результатів.
    """

    def __init__(self, connection_type: str = "central"):
        """
        Ініціалізація виконавця запитів.

        Args:
            connection_type: Тип підключення ("central", "anee", "gica", etc.)
        """
        self.connection_type = connection_type
        self.connection_params = {connection_type: True}

    def execute_query(
        self, query: str, params: Optional[Dict] = None, fetch_all: bool = True
    ) -> Any:
        """
        Виконує SQL запит та повертає результати.

        Args:
            query: SQL запит
            params: Параметри для запиту (опціонально)
            fetch_all: Чи отримувати всі результати (True) чи тільки один (False)

        Returns:
            Результати запиту
        """
        try:
            with DatabaseConnection(**self.connection_params) as cursor:
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)

                if fetch_all:
                    results = cursor.fetchall()
                else:
                    results = cursor.fetchone()

                # Отримуємо назви колонок
                if cursor.description:
                    columns = [desc[0] for desc in cursor.description]
                else:
                    columns = []

                return results, columns

        except Exception as e:
            print(f"✗ Помилка виконання запиту: {e}")
            import traceback

            traceback.print_exc()
            return None, []

    def execute_to_dataframe(
        self, query: str, params: Optional[Dict] = None, lowercase_columns: bool = True
    ) -> pd.DataFrame:
        """
        Виконує SQL запит та повертає результати у вигляді DataFrame.

        Args:
            query: SQL запит
            params: Параметри для запиту (опціонально)
            lowercase_columns: Привести назви колонок до нижнього регістру

        Returns:
            pandas.DataFrame з результатами
        """
        results, columns = self.execute_query(query, params, fetch_all=True)

        if results and columns:
            # Конвертуємо назви колонок до нижнього регістру, якщо потрібно
            if lowercase_columns:
                columns = [col.lower() for col in columns]

            df = pd.DataFrame(results, columns=columns)
            return df
        else:
            return pd.DataFrame()

    def print_results(
        self,
        query: str,
        params: Optional[Dict] = None,
        max_rows: int = 50,
        lowercase_columns: bool = True,
    ) -> None:
        """
        Виконує SQL запит та виводить результати у зручному форматі.

        Args:
            query: SQL запит
            params: Параметри для запиту (опціонально)
            max_rows: Максимальна кількість рядків для виведення
            lowercase_columns: Привести назви колонок до нижнього регістру для виведення
        """
        print("=" * 80)
        print("ВИКОНАННЯ SQL ЗАПИТУ")
        print("=" * 80)

        # Виводимо сам запит
        print("\nSQL Запит:")
        print("-" * 40)
        print(query.strip())
        print("-" * 40)

        # Виконуємо запит
        results, columns = self.execute_query(query, params, fetch_all=True)

        if results is None:
            print("\n✗ Не вдалося виконати запит")
            return

        # Приводимо назви колонок до нижнього регістру, якщо потрібно
        if lowercase_columns:
            display_columns = [col.lower() for col in columns]
        else:
            display_columns = columns

        # Статистика
        print(f"\nРезультатів знайдено: {len(results)}")

        if len(results) == 0:
            print("Запит не повернув жодного результату")
            return

        # Виводимо назви колонок
        print(f"\nКолонки ({len(display_columns)}): {', '.join(display_columns)}")

        # Обмежуємо кількість рядків для виведення
        display_results = results[:max_rows] if max_rows > 0 else results

        # Створюємо таблицю для виведення
        print("\nРезультати:")
        print("-" * 80)

        # Форматуємо заголовки
        col_widths = {}
        for col in display_columns:
            col_widths[col] = max(len(str(col)), 15)

        # Виводимо заголовки
        header = " | ".join([f"{col:<{col_widths[col]}}" for col in display_columns])
        print(header)
        print("-" * len(header))

        # Виводимо рядки
        for row in display_results:
            row_str = " | ".join(
                [
                    f"{str(val)[:col_widths[col]]:<{col_widths[col]}}"
                    for col, val in zip(display_columns, row)
                ]
            )
            print(row_str)

        if len(results) > max_rows and max_rows > 0:
            print(f"... і ще {len(results) - max_rows} рядків")

        print("-" * 80)

        # Статистика по колонках
        if results:
            print("\nСтатистика:")
            for i, col in enumerate(display_columns):
                non_null = sum(1 for row in results if row[i] is not None)
                print(
                    f"  {col}: {non_null}/{len(results)} заповнених значень "
                    f"({(non_null/len(results)*100):.1f}%)"
                )

    def execute_supplier_gln_query(self, limit: Optional[int] = None) -> pd.DataFrame:
        """
        Виконує стандартний запит для отримання постачальників з GLN.

        Args:
            limit: Обмеження кількості результатів (опціонально)

        Returns:
            DataFrame з постачальниками та їх GLN
        """
        query = """
                SELECT
                    CIF_CDFO as supplier_code,
                    CIF_RS as supplier_name,
                    CIF_CDEANCIF as gln
                FROM PRUACE.MGCIF
                WHERE CIF_NOCI = 5 AND CIF_CDEANCIF IS NOT NULL \
                """

        if limit:
            query += f" AND ROWNUM <= {limit}"

        print("\n" + "=" * 80)
        print("ЗАПИТ ДЛЯ ОТРИМАННЯ ПОСТАЧАЛЬНИКІВ З GLN")
        print("=" * 80)

        # Виконуємо запит з конвертацією назв колонок до нижнього регістру
        df = self.execute_to_dataframe(query, lowercase_columns=True)

        if not df.empty:
            print(f"\nЗнайдено {len(df)} постачальників з GLN")

            # Виводимо перші 10 рядків
            print("\nПерші 10 результатів:")
            print(df.head(10).to_string(index=False))

            # Статистика
            print("\nСтатистика:")
            print(f"Унікальних постачальників: {df['supplier_code'].nunique()}")
            print(f"Унікальних GLN: {df['gln'].nunique()}")

            # Постачальники без назви
            no_name = df[df["supplier_name"].isnull()]
            if len(no_name) > 0:
                print(f"\nПостачальники без назви: {len(no_name)}")

            # GLN довжина
            df["gln_length"] = df["gln"].astype(str).str.len()
            gln_length_stats = df["gln_length"].value_counts().sort_index()
            print("\nДовжина GLN:")
            for length, count in gln_length_stats.items():
                print(f"  {length} символів: {count} ({count/len(df)*100:.1f}%)")

            # Збереження в файл
            timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
            filename = f"suppliers_with_gln_{timestamp}.csv"
            df.to_csv(filename, index=False, encoding="utf-8")
            print(f"\nДані збережено у файл: {filename}")

        return df

    def analyze_gln_data(self) -> None:
        """
        Аналізує дані GLN постачальників.
        """
        df = self.execute_supplier_gln_query()

        if df.empty:
            return

        print("\n" + "=" * 80)
        print("АНАЛІЗ ДАНИХ GLN")
        print("=" * 80)

        # Перевірка формату GLN
        print("\nПеревірка формату GLN:")

        # 1. Чи всі GLN складаються тільки з цифр
        df["is_numeric"] = df["gln"].astype(str).str.isnumeric()
        numeric_count = df["is_numeric"].sum()
        print(
            f"1. GLN складаються тільки з цифр: {numeric_count}/{len(df)} "
            f"({numeric_count/len(df)*100:.1f}%)"
        )

        if numeric_count < len(df):
            non_numeric = df[~df["is_numeric"]]
            print(f"   Нечислові GLN (приклади):")
            for _, row in non_numeric.head(5).iterrows():
                print(f"     {row['supplier_code']}: '{row['gln']}'")

        # 2. Стандартна довжина GLN (13 цифр)
        standard_length = 13
        df["gln_length"] = df["gln"].astype(str).str.len()
        standard_len_count = (df["gln_length"] == standard_length).sum()
        print(
            f"\n2. GLN стандартної довжини ({standard_length} цифр): "
            f"{standard_len_count}/{len(df)} ({standard_len_count/len(df)*100:.1f}%)"
        )

        # 3. Дублікати GLN
        gln_counts = df["gln"].value_counts()
        duplicates = gln_counts[gln_counts > 1]
        print(f"\n3. Дубльованих GLN: {len(duplicates)}")

        if len(duplicates) > 0:
            print(f"   Найчастіше повторювані GLN:")
            for gln, count in duplicates.head(5).items():
                suppliers = df[df["gln"] == gln]["supplier_code"].tolist()
                print(f"     GLN {gln}: {count} разів, постачальники: {suppliers}")

        # 4. Постачальники без GLN (має бути 0, бо ми фільтруємо по IS NOT NULL)
        print(f"\n4. Постачальники без GLN: 0 (фільтровано запитом)")

        # 5. Групування постачальників
        print(f"\n5. Топ-10 постачальників за кількістю GLN:")
        supplier_gln_counts = (
            df.groupby("supplier_code")["gln"].nunique().sort_values(ascending=False)
        )
        for supplier, count in supplier_gln_counts.head(10).items():
            supplier_name = (
                df[df["supplier_code"] == supplier]["supplier_name"].iloc[0]
                if not df[df["supplier_code"] == supplier]["supplier_name"]
                .isnull()
                .all()
                else "Без назви"
            )
            print(f"   {supplier} - {supplier_name}: {count} унікальних GLN")


def main():
    """
    Головна функція для тестування модуля.
    """
    print("=" * 80)
    print("МОДУЛЬ ДЛЯ ВИКОНАННЯ ЗАПИТІВ ДО БАЗ ДАНИХ")
    print("=" * 80)

    # Створюємо екземпляр виконавця запитів
    executor = QueryExecutor(connection_type="central")

    # Варіант 1: Простий запит з обмеженням
    print("\n1. Тестуємо простий запит:")
    simple_query = "SELECT 1 as test_value, 'Hello' as test_text, SYSDATE as current_date FROM DUAL"
    executor.print_results(simple_query, lowercase_columns=True)

    # Варіант 2: Запит постачальників з GLN (обмежено 10 рядками)
    print("\n2. Запит постачальників з GLN (обмежено 10):")
    supplier_query = """
                     SELECT
                         CIF_CDFO as supplier_code,
                         CIF_RS as supplier_name,
                         CIF_CDEANCIF as gln
                     FROM PRUACE.MGCIF
                     WHERE CIF_NOCI = 5 AND CIF_CDEANCIF <> '5' AND CIF_CDEANCIF IS NOT NULL
                       AND ROWNUM <= 10 \
                     """
    executor.print_results(supplier_query, lowercase_columns=True)

    # Варіант 3: Повний аналіз GLN даних
    print("\n3. Виконуємо повний аналіз GLN даних:")
    try:
        df = executor.execute_supplier_gln_query(
            limit=100
        )  # Обмежуємо 100 для швидкості

        # Якщо потрібно повний аналіз (усі дані), розкоментуйте:
        # executor.analyze_gln_data()

    except Exception as e:
        print(f"Помилка при аналізі даних: {e}")
        import traceback

        traceback.print_exc()

    # Варіант 4: Збереження результатів у CSV
    print("\n4. Збереження результатів у файл:")
    df = executor.execute_supplier_gln_query(limit=50)

    if not df.empty:
        print(
            f"\nОтримано DataFrame з {len(df)} рядками та {len(df.columns)} колонками"
        )
        print(f"Колонки: {list(df.columns)}")

        # Збереження в різних форматах
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")

        # CSV
        csv_file = f"suppliers_gln_{timestamp}.csv"
        df.to_csv(csv_file, index=False, encoding="utf-8")
        print(f"  - CSV файл: {csv_file}")

        # Excel
        try:
            excel_file = f"suppliers_gln_{timestamp}.xlsx"
            df.to_excel(excel_file, index=False)
            print(f"  - Excel файл: {excel_file}")
        except ImportError:
            print("  - Excel експорт не доступний (потрібно встановити openpyxl)")

        # JSON
        json_file = f"suppliers_gln_{timestamp}.json"
        df.to_json(json_file, orient="records", indent=2, force_ascii=False)
        print(f"  - JSON файл: {json_file}")

    print("\n" + "=" * 80)
    print("ЗАВЕРШЕНО")
    print("=" * 80)


# Додаткова утиліта для командного рядка
def run_from_command_line():
    """
    Запуск з командного рядка.

    Використання:
        python query_executor.py [--limit N] [--full] [--analyze]

    Параметри:
        --limit N     Обмежити кількість результатів
        --full        Виконати повний аналіз
        --analyze     Виконати детальний аналіз GLN даних
        --help        Показати довідку
    """
    import argparse

    parser = argparse.ArgumentParser(description="Виконання SQL запитів до бази даних")
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Обмеження кількості результатів (за замовчуванням: 20)",
    )
    parser.add_argument(
        "--full", action="store_true", help="Виконати повний аналіз (без обмежень)"
    )
    parser.add_argument(
        "--analyze", action="store_true", help="Виконати детальний аналіз GLN даних"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="csv",
        choices=["csv", "excel", "json", "all"],
        help="Формат виведення (csv, excel, json, all)",
    )

    args = parser.parse_args()

    executor = QueryExecutor(connection_type="central")

    if args.analyze:
        # Детальний аналіз
        executor.analyze_gln_data()
    elif args.full:
        # Повний аналіз без обмежень
        df = executor.execute_supplier_gln_query(limit=None)
        if not df.empty:
            print(f"\nОтримано {len(df)} записів")
    else:
        # Обмежений запит
        df = executor.execute_supplier_gln_query(limit=args.limit)

        # Збереження у вказаному форматі
        if not df.empty:
            timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")

            if args.output in ["csv", "all"]:
                csv_file = f"suppliers_gln_{timestamp}.csv"
                df.to_csv(csv_file, index=False, encoding="utf-8")
                print(f"Збережено у CSV: {csv_file}")

            if args.output in ["excel", "all"]:
                try:
                    excel_file = f"suppliers_gln_{timestamp}.xlsx"
                    df.to_excel(excel_file, index=False)
                    print(f"Збережено у Excel: {excel_file}")
                except ImportError:
                    print(
                        "Для експорту в Excel встановіть openpyxl: pip install openpyxl"
                    )

            if args.output in ["json", "all"]:
                json_file = f"suppliers_gln_{timestamp}.json"
                df.to_json(json_file, orient="records", indent=2, force_ascii=False)
                print(f"Збережено у JSON: {json_file}")


if __name__ == "__main__":
    # Запускаємо головну функцію
    main()

    # Або для запуску з командного рядка:
    # run_from_command_line()
