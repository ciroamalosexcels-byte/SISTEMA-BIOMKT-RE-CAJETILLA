import { BA_TIME_ZONE } from "./constants";

export interface BAParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

/** Returns date parts in Buenos Aires timezone. Use this instead of new Date() for display. */
export function baParts(date: Date = new Date()): BAParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === "24" ? "00" : parts.hour,
    minute: parts.minute,
  };
}

/** Returns today's date string in BA timezone as YYYY-MM-DD */
export function todayBA(): string {
  const { year, month, day } = baParts();
  return `${year}-${month}-${day}`;
}

/** Returns current month key as YYYY-MM in BA timezone */
export function currentMonthBA(): string {
  const { year, month } = baParts();
  return `${year}-${month}`;
}

/** Formats an ISO date string for display: DD/MM/YYYY */
export function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Returns the number of days from today to a future date in BA tz */
export function daysFromToday(isoDate: string): number {
  const today = todayBA();
  const a = new Date(today + "T00:00:00");
  const b = new Date(isoDate + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
