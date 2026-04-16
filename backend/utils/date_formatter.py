# backend/utils/date_formatter.py
from datetime import datetime, date
from typing import Any, Optional


class DateTimeFormatter:
    """Utility class for consistent datetime formatting across the application"""

    @staticmethod
    def format_datetime(dt: Optional[datetime]) -> Optional[str]:
        """Format datetime as DD.MM.YYYY hh:mm:ss"""
        if not dt:
            return None
        return dt.strftime("%d.%m.%Y %H:%M:%S")

    @staticmethod
    def format_date(d: Optional[date]) -> Optional[str]:
        """Format date as DD.MM.YYYY"""
        if not d:
            return None
        return d.strftime("%d.%m.%Y")
