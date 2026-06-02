# backend/utils/essence_set_fingerprint.py
#
# Single source of truth for essence-set canonicalisation.
#
# Every insert, lookup, and permission check routes through fingerprint(),
# so there is exactly one definition of "what makes two sets equal".
#
# Rules:
#   - sort the resolved integer essence ids ascending (NOT enum order,
#     NOT call/arg order),
#   - join with the '-' delimiter,
#   - duplicates are collapsed (a set has no repeats).
#
# Assumption: essence ids are positive integers (DB primary keys), so the
# '-' delimiter can never be confused with a minus sign.
#
from collections.abc import Iterable

FINGERPRINT_DELIMITER = "-"


def fingerprint(essence_ids: Iterable[int]) -> str:
    """
    Canonical, order-independent fingerprint of a set of essence ids.

    >>> fingerprint([7, 3])
    '3-7'
    >>> fingerprint([3, 7])
    '3-7'
    >>> fingerprint([5])
    '5'
    >>> fingerprint([7, 3, 7])   # duplicates collapse
    '3-7'

    Raises ValueError on an empty set or non-positive ids.
    """
    unique_sorted = sorted({int(eid) for eid in essence_ids})

    if not unique_sorted:
        raise ValueError("Cannot fingerprint an empty essence set.")
    if unique_sorted[0] <= 0:
        raise ValueError(
            f"Essence ids must be positive integers; got {unique_sorted[0]}."
        )

    return FINGERPRINT_DELIMITER.join(str(eid) for eid in unique_sorted)


def parse_fingerprint(fp: str) -> list[int]:
    """
    Inverse of fingerprint(): recover the sorted essence ids from a fingerprint.
    Useful for debugging / admin display.

    >>> parse_fingerprint('3-7')
    [3, 7]
    """
    if not fp:
        return []
    return [int(part) for part in fp.split(FINGERPRINT_DELIMITER)]
