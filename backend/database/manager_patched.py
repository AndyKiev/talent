# backend/database/manager_patched.py
import socket
import warnings
from typing import Any, List, Optional, Union

import jaydebeapi
import oracledb
from sshtunnel import SSHTunnelForwarder

from backend.config import settings

# Приховуємо попередження
warnings.filterwarnings("ignore")


class DatabaseConnection:
    """
    Клас для управління підключеннями до різних баз даних.
    Підтримує SSH тунелювання для віддалених підключень.
    """

    HOSTNAME = socket.gethostname()  # тестовий hostname lnvuadc0191

    def __init__(
        self,
        central: bool = False,
        gica: bool = False,
        meti_store_ukrstr004: bool = False,
        meti_store_ukrstr003: bool = False,
        meti_store_ukrstr002: bool = False,
        anee: bool = False,
        sqlite: bool = False,
    ):
        """
        Ініціалізація підключень до баз даних.

        Args:
            central: Підключення до METI Central
            gica: Підключення до GICA (DB2)
            meti_store_ukrstr004: Підключення до METI Store UKRSTR004
            meti_store_ukrstr003: Підключення до METI Store UKRSTR003
            meti_store_ukrstr002: Підключення до METI Store UKRSTR002
            anee: Підключення до ANEE
            sqlite: Підключення до SQLite
        """
        # Fix for paramiko compatibility with sshtunnel
        self._apply_paramiko_fix()

        self.meti_store_ukrstr004 = meti_store_ukrstr004
        self.meti_store_ukrstr003 = meti_store_ukrstr003
        self.meti_store_ukrstr002 = meti_store_ukrstr002
        self.anee = anee
        self.sqlite = sqlite
        self.central = central
        self.gica = gica

        # Визначаємо чи потрібен тунель
        self.tunnel = True if self.HOSTNAME != "lnvuadc0191" else False

        # Вимикаємо тунель для ANEE та SQLite підключень
        if self.anee or self.sqlite:
            self.tunnel = False

        # Ініціалізація з'єднань
        self.conn_central = None
        self.conn_gica = None
        self.conn_anee = None
        self.conn_sqlite = None
        self.conn_meti_store_ukrstr004 = None
        self.conn_meti_store_ukrstr003 = None
        self.conn_meti_store_ukrstr002 = None
        self.conn_tunnel = None
        self.cursor_central = None
        self.cursor_gica = None
        self.cursor_anee = None
        self.cursor_meti_store_ukrstr004 = None
        self.cursor_meti_store_ukrstr003 = None
        self.cursor_meti_store_ukrstr002 = None
        self.cursor_connection = []
        self.open_tunnels = []

    @staticmethod
    def _apply_paramiko_fix():
        """
        Застосовуємо фікс для сумісності paramiko з sshtunnel.
        Проблема: sshtunnel очікує paramiko.DSSKey, але paramiko 3.0+
        може мати різні назви для ключів.
        """
        try:
            import paramiko
            import inspect

            # Діагностика: виводимо доступні атрибути paramiko
            paramiko_attrs = [attr for attr in dir(paramiko) if "Key" in attr]
            # print(f"Available paramiko Key attributes: {paramiko_attrs}")

            # Спроба 1: Перевіряємо, чи є DSSKey
            if hasattr(paramiko, "DSSKey"):
                # DSSKey вже існує, нічого не робимо
                return

            # Спроба 2: Перевіряємо, чи є DSAKey
            if hasattr(paramiko, "DSAKey"):
                paramiko.DSSKey = paramiko.DSAKey
                # print("✓ Applied fix: paramiko.DSSKey = paramiko.DSAKey")
                return

            # Спроба 3: Шукаємо будь-який клас з DSA у назві
            for attr_name in paramiko_attrs:
                if "DSA" in attr_name.upper():
                    paramiko.DSSKey = getattr(paramiko, attr_name)
                    # print(f"✓ Applied fix: paramiko.DSSKey = paramiko.{attr_name}")
                    return

            # Спроба 4: Перевіряємо RSAKey
            if hasattr(paramiko, "RSAKey"):
                # Якщо немає DSA ключів, використовуємо RSA як запасний варіант
                paramiko.DSSKey = paramiko.RSAKey
                # print("✓ Applied fallback fix: paramiko.DSSKey = paramiko.RSAKey")
                return

            # print("⚠ Could not find suitable Key class in paramiko")

        except ImportError:
            # paramiko не встановлений, але це нормально для деяких підключень
            # print("ℹ paramiko not installed, skipping compatibility fix")
            pass
        except Exception as e:
            # print(f"⚠ Error applying paramiko fix: {e}")
            pass

    @staticmethod
    def get_free_port() -> int:
        """
        Отримуємо вільний порт для SSH тунелю.

        Returns:
            int: Вільний порт
        """
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("", 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port

    def open_tunnel(self, remote_bind_address: tuple) -> SSHTunnelForwarder:
        """
        Відкриває SSH тунель до віддаленого хосту.

        Args:
            remote_bind_address: Адреса для перенаправлення (хост, порт)

        Returns:
            SSHTunnelForwarder: Об'єкт SSH тунелю
        """
        # Apply fix before creating tunnel
        self._apply_paramiko_fix()

        try:
            # Try to create tunnel with current paramiko version
            server = SSHTunnelForwarder(
                ssh_address_or_host=(settings.ssh_tunnel.host, 22),
                ssh_username=settings.ssh_tunnel.employee,
                ssh_password=settings.ssh_tunnel.password,
                remote_bind_address=remote_bind_address,
                local_bind_address=("127.0.0.1", self.get_free_port()),
            )
            server.start()
            return server
        except AttributeError as e:
            if "DSSKey" in str(e):
                # If we still get DSSKey error, try monkey patch directly
                import paramiko

                # Get all available key classes
                key_classes = []
                for attr_name in dir(paramiko):
                    if "Key" in attr_name and not attr_name.startswith("_"):
                        try:
                            attr = getattr(paramiko, attr_name)
                            if isinstance(attr, type):
                                key_classes.append(attr_name)
                        except:
                            pass

                # Try to find a suitable key class
                for key_class in key_classes:
                    if key_class in ["DSAKey", "RSAKey", "ECDSAKey", "Ed25519Key"]:
                        paramiko.DSSKey = getattr(paramiko, key_class)
                        # print(f"Applied direct patch: DSSKey = {key_class}")

                        # Retry creating tunnel
                        server = SSHTunnelForwarder(
                            ssh_address_or_host=(settings.ssh_tunnel.host, 22),
                            ssh_username=settings.ssh_tunnel.employee,
                            ssh_password=settings.ssh_tunnel.password,
                            remote_bind_address=remote_bind_address,
                            local_bind_address=("127.0.0.1", self.get_free_port()),
                        )
                        server.start()
                        return server

                raise e  # Re-raise if we couldn't fix it
            else:
                raise e

    def oracle_db_connect(
        self,
        host: str,
        port: int,
        user: str,
        password: str,
        sid: str,
        tunnel_required: bool = True,
    ) -> oracledb.Connection:
        """
        Встановлює підключення до Oracle бази даних.

        Args:
            host: Хост бази даних
            port: Порт бази даних
            user: Ім'я користувача
            password: Пароль
            sid: SID бази даних
            tunnel_required: Чи потрібен SSH тунель

        Returns:
            oracledb.Connection: Підключення до Oracle
        """
        # Якщо потрібен тунель і він ще не створений
        if self.tunnel and tunnel_required and not self.conn_tunnel:
            self.conn_tunnel = self.open_tunnel(
                remote_bind_address=(host, port),
            )
            self.open_tunnels.append(self.conn_tunnel)

        # Якщо тунель активний, використовуємо локальні параметри
        if self.tunnel and tunnel_required and self.conn_tunnel:
            connect_host = self.conn_tunnel.local_bind_host
            connect_port = self.conn_tunnel.local_bind_port
        else:
            connect_host = host
            connect_port = port

        # Створюємо DSN для підключення
        dsn = oracledb.makedsn(
            host=connect_host,
            port=connect_port,
            service_name=sid,
        )

        # Встановлюємо підключення
        connection = oracledb.connect(
            user=user,
            password=password,
            dsn=dsn,
        )

        return connection

    @staticmethod
    def db2_connection(
        url: str,
        driver_args: list,
        driver: str,
        driver_path: str,
    ) -> jaydebeapi.Connection:
        """
        Встановлює підключення до DB2 бази даних.

        Args:
            url: URL підключення
            driver_args: Аргументи драйвера [employee, password]
            driver: Назва драйвера
            driver_path: Шлях до jar файлів

        Returns:
            jaydebeapi.Connection: Підключення до DB2
        """
        return jaydebeapi.connect(
            jclassname=driver,
            url=url,
            driver_args=driver_args,
            jars=driver_path,
        )

    def __enter__(self) -> Any:
        """
        Контекстний менеджер для автоматичного відкриття підключень.

        Returns:
            Any: Курсор або список курсорів
        """
        # Застосовуємо фікс перед відкриттям підключень
        self._apply_paramiko_fix()

        if self.central:
            self.conn_central = self.oracle_db_connect(
                user=settings.db_meti_central.employee,
                password=settings.db_meti_central.password,
                host=settings.db_meti_central.host,
                port=settings.db_meti_central.port,
                sid=settings.db_meti_central.sid,
                tunnel_required=self.tunnel,
            )
            self.cursor_central = self.conn_central.cursor()
            self.cursor_connection.append(
                {
                    "cursor": self.cursor_central,
                    "connection": self.conn_central,
                    "type": "central",
                }
            )

        if self.meti_store_ukrstr004:
            self.conn_meti_store_ukrstr004 = self.oracle_db_connect(
                user=settings.db_meti_store_ukrstr004.employee,
                password=settings.db_meti_store_ukrstr004.password,
                host=settings.db_meti_store_ukrstr004.host,
                port=settings.db_meti_store_ukrstr004.port,
                sid=settings.db_meti_store_ukrstr004.sid,
                tunnel_required=self.tunnel,
            )
            self.cursor_meti_store_ukrstr004 = self.conn_meti_store_ukrstr004.cursor()
            self.cursor_connection.append(
                {
                    "cursor": self.cursor_meti_store_ukrstr004,
                    "connection": self.conn_meti_store_ukrstr004,
                    "type": "meti_store_ukrstr004",
                }
            )

        if self.meti_store_ukrstr003:
            self.conn_meti_store_ukrstr003 = self.oracle_db_connect(
                user=settings.db_meti_store_ukrstr003.employee,
                password=settings.db_meti_store_ukrstr003.password,
                host=settings.db_meti_store_ukrstr003.host,
                port=settings.db_meti_store_ukrstr003.port,
                sid=settings.db_meti_store_ukrstr003.sid,
                tunnel_required=self.tunnel,
            )
            self.cursor_meti_store_ukrstr003 = self.conn_meti_store_ukrstr003.cursor()
            self.cursor_connection.append(
                {
                    "cursor": self.cursor_meti_store_ukrstr003,
                    "connection": self.conn_meti_store_ukrstr003,
                    "type": "meti_store_ukrstr003",
                }
            )

        if self.meti_store_ukrstr002:
            self.conn_meti_store_ukrstr002 = self.oracle_db_connect(
                user=settings.db_meti_store_ukrstr002.employee,
                password=settings.db_meti_store_ukrstr002.password,
                host=settings.db_meti_store_ukrstr002.host,
                port=settings.db_meti_store_ukrstr002.port,
                sid=settings.db_meti_store_ukrstr002.sid,
                tunnel_required=self.tunnel,
            )
            self.cursor_meti_store_ukrstr002 = self.conn_meti_store_ukrstr002.cursor()
            self.cursor_connection.append(
                {
                    "cursor": self.cursor_meti_store_ukrstr002,
                    "connection": self.conn_meti_store_ukrstr002,
                    "type": "meti_store_ukrstr002",
                }
            )

        if self.anee:
            self.conn_anee = self.oracle_db_connect(
                user=settings.db_anee.employee,
                password=settings.db_anee.password,
                host=settings.db_anee.host,
                port=settings.db_anee.port,
                sid=settings.db_anee.sid,
                tunnel_required=False,  # ANEE не потребує тунелю
            )
            self.cursor_anee = self.conn_anee.cursor()
            self.cursor_connection.append(
                {
                    "cursor": self.cursor_anee,
                    "connection": self.conn_anee,
                    "type": "anee",
                }
            )

        if self.gica:
            self.conn_gica = self.db2_connection(
                url=settings.db_gica.url,
                driver_args=[settings.db_gica.employee, settings.db_gica.password],
                driver=settings.db_gica.driver,
                driver_path=settings.db_gica.classpath,
            )
            self.cursor_gica = self.conn_gica.cursor()
            self.cursor_connection.append(
                {
                    "cursor": self.cursor_gica,
                    "connection": self.conn_gica,
                    "type": "gica",
                }
            )

        # SQLite підключення (якщо потрібно)
        if self.sqlite:
            # Додайте вашу логіку для SQLite
            pass

        # Повертаємо курсори
        cursors = [item["cursor"] for item in self.cursor_connection]

        # Якщо тільки одне підключення, повертаємо просто курсор
        if len(cursors) == 1:
            return cursors[0]
        # Якщо декілька підключень, повертаємо список курсорів
        elif len(cursors) > 1:
            return cursors
        # Якщо жодного підключення
        else:
            return None

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        """
        Контекстний менеджер для автоматичного закриття підключень.

        Args:
            exc_type: Тип винятку
            exc_value: Значення винятку
            traceback: Traceback
        """
        rollback_needed = exc_type is not None

        # Закриваємо всі з'єднання
        for connection_info in self.cursor_connection:
            self.close_connection(connection_info, rollback_needed)

        # Закриваємо всі тунелі
        for tunnel in self.open_tunnels:
            if tunnel and tunnel.is_active:
                try:
                    tunnel.stop()
                except:
                    pass  # Ігноруємо помилки при закритті тунелю

    @staticmethod
    def close_connection(connection_info: dict, rollback: bool) -> None:
        """
        Безпечно закриває підключення до бази даних.

        Args:
            connection_info: Словник з інформацією про підключення
            rollback: Чи потрібно робити rollback транзакції
        """
        cursor = connection_info.get("cursor")
        connection = connection_info.get("connection")
        conn_type = connection_info.get("type", "unknown")

        try:
            # Закриваємо курсор
            if cursor:
                cursor.close()

            # Обробляємо з'єднання
            if connection:
                if rollback:
                    try:
                        connection.rollback()
                    except:
                        pass  # Деякі бази даних можуть не підтримувати rollback
                else:
                    try:
                        connection.commit()
                    except:
                        pass  # Деякі бази даних можуть не підтримувати commit

                # Закриваємо з'єднання
                connection.close()

        except Exception as e:
            # Логування помилки закриття (можна додати логування)
            print(f"Warning: Error closing {conn_type} connection: {e}")

    def get_connection_info(self) -> dict:
        """
        Повертає інформацію про активні підключення.

        Returns:
            dict: Інформація про підключення
        """
        info = {
            "hostname": self.HOSTNAME,
            "tunnel_required": self.tunnel,
            "tunnel_active": bool(self.open_tunnels),
            "active_connections": [],
        }

        for conn_info in self.cursor_connection:
            conn_type = conn_info.get("type", "unknown")
            info["active_connections"].append(conn_type)

        return info


# Alternative solution: Monkey patch at module level
def apply_global_paramiko_fix():
    """
    Застосовує глобальний фікс для paramiko.
    Цю функцію можна викликати на початку програми.
    """
    try:
        import paramiko
        import inspect

        # Перевіряємо всі доступні ключові класи
        key_classes = []
        for attr_name in dir(paramiko):
            if "Key" in attr_name and not attr_name.startswith("_"):
                try:
                    attr = getattr(paramiko, attr_name)
                    if inspect.isclass(attr):
                        key_classes.append(attr_name)
                except:
                    pass

        # print(f"Available paramiko key classes: {key_classes}")

        # Якщо DSSKey не існує, створюємо аліас
        if not hasattr(paramiko, "DSSKey"):
            # Спроба знайти DSAKey
            for key_class in key_classes:
                if key_class == "DSAKey":
                    paramiko.DSSKey = getattr(paramiko, key_class)
                    # print(f"Applied global fix: DSSKey = {key_class}")
                    return
                elif "DSA" in key_class.upper():
                    paramiko.DSSKey = getattr(paramiko, key_class)
                    # print(f"Applied global fix: DSSKey = {key_class}")
                    return

            # Якщо не знайшли DSA, використовуємо перший доступний ключ
            if key_classes:
                paramiko.DSSKey = getattr(paramiko, key_classes[0])
                # print(f"Applied fallback global fix: DSSKey = {key_classes[0]}")
            else:
                # Створюємо пустий клас як заглушку
                class DummyKey:
                    pass

                paramiko.DSSKey = DummyKey
                # print("Created dummy DSSKey class")

    except ImportError:
        pass
    except Exception as e:
        print(f"Error in global paramiko fix: {e}")


# Застосовуємо глобальний фікс при імпорті модуля
apply_global_paramiko_fix()


# Функція для тестування підключення
def test_database_connection(connection_type: str = "central") -> bool:
    """
    Тестує підключення до бази даних.

    Args:
        connection_type: Тип підключення ("central", "anee", "gica", etc.)

    Returns:
        bool: True якщо підключення успішне, False якщо ні
    """
    try:
        # Визначаємо параметри підключення
        connection_params = {connection_type: True}

        with DatabaseConnection(**connection_params) as cursor:
            # Виконуємо простий запит для перевірки
            if connection_type == "gica":
                cursor.execute("SELECT 1 FROM SYSIBM.SYSDUMMY1")
            else:  # Oracle
                cursor.execute("SELECT 1 FROM DUAL")

            result = cursor.fetchone()
            print(f"✓ Успішне підключення до {connection_type}: {result}")
            return True

    except Exception as e:
        print(f"✗ Помилка підключення до {connection_type}: {e}")
        import traceback

        traceback.print_exc()
        return False


# Test function specifically for SSH tunnel
def test_ssh_tunnel() -> bool:
    """
    Тестує SSH тунель окремо.

    Returns:
        bool: True якщо тунель працює, False якщо ні
    """
    print("=" * 60)
    print("Тестування SSH тунелю")
    print("=" * 60)

    try:
        # Apply global fix
        apply_global_paramiko_fix()

        # Import after fix
        from sshtunnel import SSHTunnelForwarder

        # Get free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("", 0))
            local_port = s.getsockname()[1]

        print(f"Створюємо тунель на порт {local_port}...")

        # Create and start tunnel
        tunnel = SSHTunnelForwarder(
            ssh_address_or_host=(settings.ssh_tunnel.host, 22),
            ssh_username=settings.ssh_tunnel.employee,
            ssh_password=settings.ssh_tunnel.password,
            remote_bind_address=(
                settings.db_meti_central.host,
                settings.db_meti_central.port,
            ),
            local_bind_address=("127.0.0.1", local_port),
        )

        tunnel.start()
        print(f"✓ SSH тунель запущено")
        print(f"  Локальний адрес: {tunnel.local_bind_host}:{tunnel.local_bind_port}")

        # Test Oracle connection through tunnel
        dsn = oracledb.makedsn(
            host="127.0.0.1", port=local_port, service_name=settings.db_meti_central.sid
        )

        connection = oracledb.connect(
            user=settings.db_meti_central.employee,
            password=settings.db_meti_central.password,
            dsn=dsn,
        )

        print("✓ Успішно підключено до Oracle через тунель!")

        # Execute test query
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM DUAL")
        result = cursor.fetchone()
        print(f"✓ Запит виконано: {result}")

        # Cleanup
        cursor.close()
        connection.close()
        tunnel.stop()
        print("\n✓ Тунель закрито")

        return True

    except Exception as e:
        print(f"✗ Помилка при створенні тунелю: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    """
    Приклад використання класу DatabaseConnection.
    """
    print("=" * 60)
    print("Тестування підключень до баз даних")
    print("=" * 60)

    # First test SSH tunnel
    print("\n1. Тестуємо SSH тунель...")
    tunnel_ok = test_ssh_tunnel()

    if tunnel_ok:
        # Test database connections
        print("\n2. Тестуємо підключення до баз даних...")
        test_types = ["central", "anee"]

        for test_type in test_types:
            print(f"\nТестуємо підключення до {test_type}...")
            success = test_database_connection(test_type)

            if success:
                print(f"✓ {test_type}: Успішно")
            else:
                print(f"✗ {test_type}: Не вдалося")
    else:
        print("\n✗ Не вдалося встановити SSH тунель, пропускаємо тестування БД")

    print("\n" + "=" * 60)
    print("Завершено")
    print("=" * 60)
