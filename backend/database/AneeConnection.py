import asyncio
from typing import Any, List
import cx_Oracle


class AsyncAnneConnection:
    def __init__(
        self,
        user: str,
        password: str,
        hostname: str,
        sid: str,
        port: int = 1521,
    ):
        self.user = user
        self.password = password
        self.hostname = hostname
        self.sid = sid
        self.port = port
        self.db_conn = None
        self.cursor = None

    async def __aenter__(self):
        if not self.db_conn:
            # Run the synchronous connection in a thread pool
            loop = asyncio.get_event_loop()
            self.db_conn = await loop.run_in_executor(
                None,
                cx_Oracle.connect,
                self.user,
                self.password,
                cx_Oracle.makedsn(self.hostname, self.port, self.sid),
            )
        self.cursor = self.db_conn.cursor()
        return self.cursor

    async def __aexit__(self, exc_type, exc_value, traceback):
        rollback = False
        if exc_type:
            rollback = True
            # Handle error if needed

        if self.cursor:
            self.cursor.close()
        if self.db_conn:
            self.db_conn.close()


# Usage example:
async def main():
    db_anee_helper = AsyncAnneConnection(
        user="anee",
        password="ANEE",
        hostname="10.127.1.21",
        sid="ANEE",
        port=1521,
    )

    async with db_anee_helper as cursor:
        # Run execute in thread pool since cx_Oracle is synchronous
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, cursor.execute, "SELECT * FROM dboanee.agreement"
        )
        rows = await loop.run_in_executor(None, cursor.fetchall)
        for row in rows:
            print(row)


if __name__ == "__main__":
    asyncio.run(main())
