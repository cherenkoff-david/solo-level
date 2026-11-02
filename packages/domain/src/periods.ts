export type ScheduleKind =
  | 'daily'
  | 'selected_days'
  | 'times_per_week'
  | 'times_per_month';

export interface DailySchedule {
  kind: 'daily';
}

export interface SelectedDaysSchedule {
  kind: 'selected_days';
  days: number[];
}

export interface TimesPerWeekSchedule {
  kind: 'times_per_week';
  times: number;
}

export interface TimesPerMonthSchedule {
  kind: 'times_per_month';
  times: number;
}

export type Schedule =
  | DailySchedule
  | SelectedDaysSchedule
  | TimesPerWeekSchedule
  | TimesPerMonthSchedule;

export interface PeriodContext {
  timezoneOffsetMinutes: number;
  dayStartHour: number;
}

export const DEFAULT_PERIOD_CONTEXT: PeriodContext = {
  timezoneOffsetMinutes: 0,
  dayStartHour: 4,
};

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function shiftedLocalDate(
  occurredAt: Date,
  context: PeriodContext = DEFAULT_PERIOD_CONTEXT,
): Date {
  return new Date(
    occurredAt.getTime() +
      context.timezoneOffsetMinutes * 60_000 -
      context.dayStartHour * 3_600_000,
  );
}

export function localDateKey(
  occurredAt: Date,
  context: PeriodContext = DEFAULT_PERIOD_CONTEXT,
): string {
  const shifted = shiftedLocalDate(occurredAt, context);
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1, 2)}-${pad(shifted.getUTCDate(), 2)}`;
}

export function monthKey(
  occurredAt: Date,
  context: PeriodContext = DEFAULT_PERIOD_CONTEXT,
): string {
  return localDateKey(occurredAt, context).slice(0, 7);
}

export function isoWeekKey(
  occurredAt: Date,
  context: PeriodContext = DEFAULT_PERIOD_CONTEXT,
): string {
  const shifted = shiftedLocalDate(occurredAt, context);
  const date = new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
  const dayNumber = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
  const isoYear = date.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${pad(isoYear, 4)}-W${pad(week, 2)}`;
}

export function periodKeyFor(
  schedule: Schedule,
  occurredAt: Date,
  context: PeriodContext = DEFAULT_PERIOD_CONTEXT,
): string {
  switch (schedule.kind) {
    case 'daily':
    case 'selected_days':
      return localDateKey(occurredAt, context);
    case 'times_per_week':
      return isoWeekKey(occurredAt, context);
    case 'times_per_month':
      return monthKey(occurredAt, context);
  }
}

export function expectedPeriodsPerCycle(schedule: Schedule): number {
  switch (schedule.kind) {
    case 'daily':
    case 'selected_days':
      return 1;
    case 'times_per_week':
    case 'times_per_month':
      return schedule.times;
  }
}
