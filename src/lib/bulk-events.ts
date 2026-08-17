import type {
  BulkEventSeriesInput,
  BulkRecurrence,
} from "@/types/content-event";

export interface BulkEventOccurrence {
  month: string;
  date: string;
}

type RecurrencePlan = Pick<
  BulkEventSeriesInput,
  "startMonth" | "recurrence" | "repeatCount"
>;

type OccurrencePlan = RecurrencePlan & Pick<BulkEventSeriesInput, "dayOfMonth">;

export const MAX_BULK_EVENT_REPEAT_COUNT = 120;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function parseMonth(month: string): { year: number; month: number } {
  const match = MONTH_RE.exec(month);
  if (!match) throw new RangeError(`Invalid month: ${month}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function addMonths(month: string, amount: number): string {
  if (!Number.isInteger(amount)) throw new RangeError("Month offset must be an integer");

  const parsed = parseMonth(month);
  const absoluteMonth = parsed.year * 12 + parsed.month - 1 + amount;
  const year = Math.floor(absoluteMonth / 12);
  const nextMonth = absoluteMonth - year * 12 + 1;
  return `${String(year).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}`;
}

export function daysInMonth(month: string): number {
  const { year, month: monthNumber } = parseMonth(month);
  if (monthNumber !== 2) return [4, 6, 9, 11].includes(monthNumber) ? 30 : 31;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return leapYear ? 29 : 28;
}

export function clampDayToMonth(month: string, dayOfMonth: number): number {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new RangeError("Day of month must be an integer from 1 to 31");
  }
  return Math.min(dayOfMonth, daysInMonth(month));
}

export function dateForMonth(month: string, dayOfMonth: number): string {
  const day = clampDayToMonth(month, dayOfMonth);
  return `${month}-${String(day).padStart(2, "0")}`;
}

function consecutiveMonths(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  for (let month = startMonth; month <= endMonth; month = addMonths(month, 1)) {
    months.push(month);
  }
  return months;
}

export function planOccurrenceMonths(
  series: RecurrencePlan,
  currentMonth: string,
): string[] {
  parseMonth(series.startMonth);
  parseMonth(currentMonth);
  if (
    !Number.isInteger(series.repeatCount)
    || series.repeatCount < 0
    || series.repeatCount > MAX_BULK_EVENT_REPEAT_COUNT
  ) {
    throw new RangeError(`Repeat count must be an integer from 0 to ${MAX_BULK_EVENT_REPEAT_COUNT}`);
  }
  if (series.recurrence !== "count" && series.repeatCount !== 0) {
    throw new RangeError("Repeat count must be 0 unless recurrence is count");
  }

  if (series.recurrence === "once") return [series.startMonth];
  if (series.recurrence === "count") {
    return Array.from(
      { length: series.repeatCount + 1 },
      (_, index) => addMonths(series.startMonth, index),
    );
  }

  const recurrence: BulkRecurrence = series.recurrence;
  if (recurrence !== "monthly") throw new RangeError(`Invalid recurrence: ${recurrence}`);

  const horizonMonth = addMonths(currentMonth, 12);
  if (series.startMonth > horizonMonth) return [series.startMonth];

  return consecutiveMonths(series.startMonth, horizonMonth);
}

export function planMaterializationOccurrences(
  series: OccurrencePlan,
  currentMonth: string,
): BulkEventOccurrence[] {
  return planOccurrenceMonths(series, currentMonth)
    .map((month) => ({ month, date: dateForMonth(month, series.dayOfMonth) }));
}

export function planFutureOccurrences(
  series: OccurrencePlan,
  today: string,
): BulkEventOccurrence[] {
  if (!DATE_RE.test(today)) throw new RangeError(`Invalid date: ${today}`);

  return planMaterializationOccurrences(series, today.slice(0, 7))
    .filter((occurrence) => occurrence.date >= today);
}
