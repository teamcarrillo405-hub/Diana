export type AgeBracket = "under_13" | "13_to_17" | "adult";

export type DateOfBirthValidation =
  | Readonly<{
      valid: true;
      date: Date;
      years: number;
      bracket: AgeBracket;
    }>
  | Readonly<{
      valid: false;
      reason: "required" | "invalid" | "future" | "implausible";
    }>;

export function yearsBetween(dob: Date, now: Date = new Date()): number {
  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (
    monthDelta < 0
    || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())
  ) {
    years -= 1;
  }
  return years;
}

export function ageBracket(dob: Date, now: Date = new Date()): AgeBracket {
  const years = yearsBetween(dob, now);
  if (years < 13) return "under_13";
  if (years < 18) return "13_to_17";
  return "adult";
}

export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function validateDateOfBirth(
  value: string,
  now: Date = new Date(),
): DateOfBirthValidation {
  if (value.length === 0) return { valid: false, reason: "required" };
  const date = parseDateOnly(value);
  if (!date) return { valid: false, reason: "invalid" };

  const today = new Date(0);
  today.setUTCHours(0, 0, 0, 0);
  today.setUTCFullYear(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() > today.getTime()) {
    return { valid: false, reason: "future" };
  }

  const years = yearsBetween(date, today);
  if (years > 120) return { valid: false, reason: "implausible" };

  return {
    valid: true,
    date,
    years,
    bracket: ageBracket(date, today),
  };
}
