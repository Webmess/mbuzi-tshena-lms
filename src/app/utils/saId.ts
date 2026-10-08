// Luhn check: the last digit of a SA ID number is a check digit
export function isValidSaId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let total = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(id[12 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
  }
  return total % 10 === 0;
}