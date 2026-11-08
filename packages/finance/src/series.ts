import { addDays, addMonths, clampDay, monthKeyOf } from "./periods.ts";
import type { IsoDate, Series } from "./types.ts";

const HARD_CAP = 1000;

export function seriesOccurrences(series: Series, until?: IsoDate): IsoDate[] {
  const dates: IsoDate[] = [];
  const limit = series.occurrencesCount ?? HARD_CAP;
  const stop = series.endsOn ?? until ?? null;

  if (series.recurrence === "daily") {
    for (let index = 0; index < limit; index += 1) {
      const date = addDays(series.startDate, index);
      if (stop !== null && date > stop) break;
      if (until !== undefined && date > until) break;
      dates.push(date);
    }
    return dates;
  }

  if (series.recurrence === "weekly") {
    for (let index = 0; index < limit; index += 1) {
      const date = addDays(series.startDate, index * 7);
      if (stop !== null && date > stop) break;
      if (until !== undefined && date > until) break;
      dates.push(date);
    }
    return dates;
  }

  const startMonth = monthKeyOf(series.startDate);
  const desiredDay = series.dayOfMonth ?? Number(series.startDate.slice(8, 10));
  for (let index = 0; index < limit; index += 1) {
    const monthKey = addMonths(startMonth, index);
    const day = clampDay(monthKey, desiredDay);
    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    if (index === 0 && date < series.startDate) continue;
    if (stop !== null && date > stop) break;
    if (until !== undefined && date > until) break;
    dates.push(date);
  }
  return dates;
}

export function seriesEndDate(series: Series): IsoDate | null {
  const dates = seriesOccurrences(series);
  return dates.at(-1) ?? null;
}

export function seriesLabel(series: Series): string {
  if (series.recurrence === "daily") return "каждый день";
  if (series.recurrence === "weekly") return "каждую неделю";
  return `каждый месяц, ${series.dayOfMonth ?? Number(series.startDate.slice(8, 10))}-го`;
}

export function boundLabel(series: Series): string {
  if (series.occurrencesCount !== null) {
    const end = seriesEndDate(series);
    return `${series.occurrencesCount} раз${end === null ? "" : `, до ${end}`}`;
  }
  return series.endsOn === null ? "без границы" : `до ${series.endsOn}`;
}
