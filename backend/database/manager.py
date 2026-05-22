import socket
from typing import Any, Annotated, List

import jaydebeapi
import oracledb
from sshtunnel import SSHTunnelForwarder

from backend.config import settings


class DatabaseConnection:
    HOSTNAME = socket.gethostname()  # test host name lnvuadc0191

    def __init__(
        self,
        central=None,
        gica=None,
        meti_store_ukrstr004=None,
        meti_store_ukrstr003=None,
        meti_store_ukrstr002=None,
        anee=None,
        sqlite=None,
    ):
        self.meti_store_ukrstr004 = meti_store_ukrstr004
        self.meti_store_ukrstr003 = meti_store_ukrstr003
        self.meti_store_ukrstr002 = meti_store_ukrstr002
        self.anee = anee
        self.sqlite = sqlite
        self.central = central
        self.gica = gica

        self.tunnel = True if self.HOSTNAME != "lnvuadc0191" else False
        # Force tunnel to False for ANEE connections
        # if self.anee | self.sqlite:
        #     self.tunnel = False

        self.conn_central = None
        self.conn_gica = None
        self.conn_anee = None
        self.conn_sqlite = None
        self.conn_tunnel = None
        self.cursor_central = None
        self.cursor_gica = None
        self.cursor_connection = []
        self.open_tunnels = []

    @staticmethod
    def get_free_port() -> int:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("", 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port

    def open_tunnel(self, remote_bind_address: tuple) -> SSHTunnelForwarder:
        server = SSHTunnelForwarder(
            ssh_host=settings.ssh_tunnel.host,
            ssh_username=settings.ssh_tunnel.employee,
            ssh_password=settings.ssh_tunnel.password,
            remote_bind_address=remote_bind_address,
            local_bind_address=("127.0.0.1", self.get_free_port()),
        )
        server.start()
        return server

    def oracle_db_connect(
        self,
        host: str,
        port: int,
        user: str,
        password: str,
        sid: str,
    ) -> oracledb.Connection:
        if self.tunnel:
            self.conn_tunnel = self.open_tunnel(
                remote_bind_address=(host, port),
            )
            self.open_tunnels.append(self.conn_tunnel)
        return oracledb.connect(
            user=user,
            password=password,
            dsn=oracledb.makedsn(
                host=self.conn_tunnel.local_bind_host if self.tunnel else host,
                port=self.conn_tunnel.local_bind_port if self.tunnel else port,
                service_name=sid,
            ),
        )

    @staticmethod
    def db2_connection(
        url: str,
        driver_args: list,
        driver: str,
        driver_path: str,
    ) -> jaydebeapi.Connection:
        return jaydebeapi.connect(
            jclassname=driver,
            url=url,
            driver_args=driver_args,
            jars=driver_path,
        )

    def __enter__(self) -> Annotated[Any, List[Any]]:

        if self.central:
            self.conn_central = self.oracle_db_connect(
                user=settings.db_meti_central.employee,
                password=settings.db_meti_central.password,
                host=settings.db_meti_central.host,
                port=settings.db_meti_central.port,
                sid=settings.db_meti_central.sid,
            )
            self.cursor_central = self.conn_central.cursor()
            self.cursor_connection.append(
                {
                    "cursor_central": self.cursor_central,
                    "connection_central": self.conn_central,
                }
            )
        if self.meti_store_ukrstr004:
            self.conn_meti_store_ukrstr004 = self.oracle_db_connect(
                user=settings.db_meti_store_ukrstr004.employee,
                password=settings.db_meti_store_ukrstr004.password,
                host=settings.db_meti_store_ukrstr004.host,
                port=settings.db_meti_store_ukrstr004.port,
                sid=settings.db_meti_store_ukrstr004.sid,
            )
            self.cursor_meti_store_ukrstr004 = self.conn_meti_store_ukrstr004.cursor()
            self.cursor_connection.append(
                {
                    "cursor_meti_store_ukrstr004": self.cursor_meti_store_ukrstr004,
                    "connection_cursor_meti_store_ukrstr004": self.conn_meti_store_ukrstr004,
                }
            )

        if self.meti_store_ukrstr003:
            self.conn_meti_store_ukrstr003 = self.oracle_db_connect(
                user=settings.db_meti_store_ukrstr003.employee,
                password=settings.db_meti_store_ukrstr003.password,
                host=settings.db_meti_store_ukrstr003.host,
                port=settings.db_meti_store_ukrstr003.port,
                sid=settings.db_meti_store_ukrstr003.sid,
            )
            self.cursor_meti_store_ukrstr003 = self.conn_meti_store_ukrstr003.cursor()
            self.cursor_connection.append(
                {
                    "cursor_meti_store_ukrstr003": self.cursor_meti_store_ukrstr003,
                    "connection_cursor_meti_store_ukrstr003": self.conn_meti_store_ukrstr003,
                }
            )

        if self.meti_store_ukrstr002:
            self.conn_meti_store_ukrstr002 = self.oracle_db_connect(
                user=settings.db_meti_store_ukrstr002.employee,
                password=settings.db_meti_store_ukrstr002.password,
                host=settings.db_meti_store_ukrstr002.host,
                port=settings.db_meti_store_ukrstr002.port,
                sid=settings.db_meti_store_ukrstr002.sid,
            )
            self.cursor_meti_store_ukrstr002 = self.conn_meti_store_ukrstr002.cursor()
            self.cursor_connection.append(
                {
                    "cursor_meti_store_ukrstr002": self.cursor_meti_store_ukrstr002,
                    "connection_cursor_meti_store_ukrstr002": self.conn_meti_store_ukrstr002,
                }
            )

        if self.sqlite:
            pass

        if self.anee:
            self.conn_anee = self.oracle_db_connect(  # Fixed variable name
                user=settings.db_anee.employee,
                password=settings.db_anee.password,
                host=settings.db_anee.host,
                port=settings.db_anee.port,
                sid=settings.db_anee.sid,
            )
            self.cursor_anee = self.conn_anee.cursor()
            self.cursor_connection.append(  # Fixed variable name
                {
                    "cursor_anee": self.cursor_anee,
                    "connection_cursor_anee": self.conn_anee,
                    # "conn_anee": self.conn_anee,  # Fixed variable name
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
                    "cursor_gica": self.cursor_gica,
                    "connection_gica": self.conn_gica,
                }
            )

        cursors = [
            [value for key, value in instance.items() if key[:6] == "cursor"][0]
            for instance in self.cursor_connection
        ]

        return cursors[0] if len(cursors) == 1 else cursors

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        rollback = False
        if exc_type:
            # log.error(f"Exception Type: {exc_type}")
            # log.error(f"Exception Value: {exc_value}")
            # log.error("Rolling back the transactions...")

            rollback = True
        if self.cursor_connection:
            [self.close_connection(elem, rollback) for elem in self.cursor_connection]

        if self.conn_tunnel:
            [tunnel.close() for tunnel in self.open_tunnels if tunnel]

    @staticmethod
    def close_connection(instance: dict, rollback: bool) -> None:
        key_cursor = [key for key in instance.keys() if key[:6] == "cursor"][0]
        key_connection = [key for key in instance.keys() if key != key_cursor][0]
        if instance[key_cursor]:
            instance[key_cursor].close()
        if instance[key_connection]:
            if rollback:
                instance[key_connection].rollback()
            else:
                instance[key_connection].commit()
            instance[key_connection].close()
