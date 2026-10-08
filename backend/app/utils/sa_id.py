from datetime import date


def sa_id_checksum_ok(id_number: str) -> bool:
    """Luhn check: the last digit of a SA ID number is a check digit."""
    if len(id_number) != 13 or not id_number.isdigit():
        return False
    total = 0
    for i, ch in enumerate(reversed(id_number)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0

def sa_id_matches_dob(id_number: str, dob: date) -> bool:
    """The first 6 digits of a SA ID number are the birth date as YYMMDD."""
    return id_number[:6] == dob.strftime("%y%m%d")

