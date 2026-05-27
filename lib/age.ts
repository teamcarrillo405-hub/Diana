export type AgeBracket = "under_13" | "13_to_17" | "adult";

export function yearsBetween(dob: Date, now: Date = new Date()): number {
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  return years;
}

export function ageBracket(dob: Date, now: Date = new Date()): AgeBracket {
  const years = yearsBetween(dob, now);
  if (years < 13) return "under_13";
  if (years < 18) return "13_to_17";
  return "adult";
}
