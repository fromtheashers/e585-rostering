/** Dates are plain "YYYY-MM-DD" strings; all arithmetic is done in UTC so time zones never shift a day. */

export function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function toUtc(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

export function addDays(day: string, days: number): string {
  const d = toUtc(day);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isFriday(day: string): boolean {
  return toUtc(day).getUTCDay() === 5;
}

/** The first Friday on or after `day`. */
export function fridayOnOrAfter(day: string): string {
  const offset = (5 - toUtc(day).getUTCDay() + 7) % 7;
  return addDays(day, offset);
}

export function monthKey(day: string): string {
  return day.slice(0, 7);
}

/** Every Friday in the month that contains `day`. */
export function fridaysInMonth(month: string): string[] {
  const first = fridayOnOrAfter(`${month}-01`);
  const out: string[] = [];
  for (let d = first; monthKey(d) === month; d = addDays(d, 7)) out.push(d);
  return out;
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" });

/** "Fri 30 Oct" */
export function shortDate(day: string): string {
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(toUtc(day));
}

/** "Friday 30 October" */
export function longDate(day: string): string {
  return fmt({ weekday: "long", day: "numeric", month: "long" }).format(toUtc(day));
}

/** "November 2026" */
export function monthName(month: string): string {
  return fmt({ month: "long", year: "numeric" }).format(toUtc(`${month}-01`));
}

/** "7:30pm" from "19:30" */
export function prettyTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

/** "this Friday", "next Friday", "in 3 weeks", "today" */
export function relativeFriday(today: string, day: string): string {
  const days = daysBetween(today, day);
  if (days === 0) return "tonight";
  if (days > 0 && days < 7) return "this Friday";
  if (days >= 7 && days < 14) return "next Friday";
  if (days >= 14) return `in ${Math.round(days / 7)} weeks`;
  return shortDate(day);
}
