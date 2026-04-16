# backend/utils/date_utils.py
from datetime import date, datetime
import re
from fastapi import HTTPException, status


def parse_day_month(value: str) -> tuple[int, int]:
    """
    Parse day_month from format like '15_04' or '15-04' or '15.04'
    Returns tuple (day, month)
    """
    # Remove any whitespace and split by common separators
    value = value.strip()

    # Try different separators
    for separator in ["_", "-", "."]:
        if separator in value:
            parts = value.split(separator)
            if len(parts) == 2:
                try:
                    day = int(parts[0])
                    month = int(parts[1])

                    # Basic validation
                    if 1 <= day <= 31 and 1 <= month <= 12:
                        return day, month
                except ValueError:
                    continue

    raise ValueError(f"Invalid day_month format: {value}. Use format like '15_04'")


def format_day_month(day: int, month: int) -> str:
    """Format day and month as 'DD_MM' with leading zeros"""
    return f"{day:02d}_{month:02d}"


def get_full_date_from_day_month(day_month_value: str) -> date:
    """
    Convert stored day_month value to full date with current year
    """
    try:
        day, month = parse_day_month(day_month_value)
        current_year = datetime.now().year
        return date(current_year, month, day)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format in parameter: {str(e)}",
        )


def get_full_date_with_custom_year(day_month_value: str, year: int) -> date:
    """Convert stored day_month value to full date with specified year"""
    day, month = parse_day_month(day_month_value)
    return date(year, month, day)
