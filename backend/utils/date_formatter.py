# backend/utils/date_formatter.py
from datetime import date, datetime


class DateTimeFormatter:
    """Utility class for consistent datetime formatting across the application"""

    @staticmethod
    def format_datetime(dt: datetime | None) -> str | None:
        """Format datetime as DD.MM.YYYY hh:mm:ss"""
        if not dt:
            return None
        return dt.strftime("%d.%m.%Y %H:%M:%S")

    @staticmethod
    def format_date(d: date | None) -> str | None:
        """Format date as DD.MM.YYYY"""
        if not d:
            return None
        return d.strftime("%d.%m.%Y")
