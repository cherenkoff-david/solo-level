import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PERIOD_CONTEXT,
  expectedPeriodsPerCycle,
  isoWeekKey,
  localDateKey,
  monthKey,
  periodKeyFor,
  type PeriodContext,
} from '../src/periods.ts';

const MSK: PeriodContext = { timezoneOffsetMinutes: 180, dayStartHour: 4 };
const UTC: PeriodContext = { timezoneOffsetMinutes: 0, dayStartHour: 4 };

test('Дневной период: обычная дата', () => {
  assert.equal(
    periodKeyFor({ kind: 'daily' }, new Date('2026-10-28T10:00:00Z'), MSK),
    '2026-10-28',
  );
});

test('Логический день: отметка в 03:30 относится к предыдущему дню', () => {
  assert.equal(localDateKey(new Date('2026-10-28T00:30:00Z'), MSK), '2026-10-27');
});

test('Логический день: отметка в 04:30 относится к текущему дню', () => {
  assert.equal(localDateKey(new Date('2026-10-28T01:30:00Z'), MSK), '2026-10-28');
});

test('Часовой пояс сдвигает дату, если считать от полуночи', () => {
  const midnightCtx: PeriodContext = { timezoneOffsetMinutes: 180, dayStartHour: 0 };
  const utcMidnight: PeriodContext = { timezoneOffsetMinutes: 0, dayStartHour: 0 };
  const instant = new Date('2026-10-28T22:00:00Z');
  assert.equal(localDateKey(instant, midnightCtx), '2026-10-29');
  assert.equal(localDateKey(instant, utcMidnight), '2026-10-28');
});

test('Начало дня в 04:00 переводит ночную отметку в предыдущий логический день', () => {
  const instant = new Date('2026-10-28T22:00:00Z');
  const midnightCtx: PeriodContext = { timezoneOffsetMinutes: 180, dayStartHour: 0 };
  assert.equal(localDateKey(instant, midnightCtx), '2026-10-29');
  assert.equal(localDateKey(instant, MSK), '2026-10-28');
});

test('Период не пересчитывается при смене пояса: ключ хранится, а не выводится', () => {
  const instant = new Date('2026-10-28T02:00:00Z');
  const stored = localDateKey(instant, MSK);
  const recomputedWithAnotherZone = localDateKey(instant, {
    timezoneOffsetMinutes: -300,
    dayStartHour: 4,
  });
  assert.equal(stored, '2026-10-28');
  assert.equal(recomputedWithAnotherZone, '2026-10-27');
  assert.notEqual(
    stored,
    recomputedWithAnotherZone,
    'один и тот же момент попадает в разные календарные дни при смене пояса — поэтому ключ хранится, а не пересчитывается',
  );
});

test('ISO-неделя: конец декабря может принадлежать следующему году', () => {
  assert.equal(isoWeekKey(new Date('2025-12-29T10:00:00Z'), UTC), '2026-W01');
});

test('ISO-неделя: 1 января может принадлежать последней неделе прошлого года', () => {
  assert.equal(isoWeekKey(new Date('2027-01-01T10:00:00Z'), UTC), '2026-W53');
});

test('Недельный период привычки «N раз в неделю»', () => {
  assert.equal(
    periodKeyFor({ kind: 'times_per_week', times: 3 }, new Date('2026-10-28T10:00:00Z'), MSK),
    '2026-W44',
  );
});

test('Месячный период привычки «N раз в месяц»', () => {
  assert.equal(
    periodKeyFor({ kind: 'times_per_month', times: 2 }, new Date('2026-10-28T10:00:00Z'), MSK),
    '2026-10',
  );
});

test('Привычка по выбранным дням использует дату, как ежедневная', () => {
  assert.equal(
    periodKeyFor({ kind: 'selected_days', days: [1, 3, 5] }, new Date('2026-10-28T10:00:00Z'), MSK),
    '2026-10-28',
  );
});

test('Ожидаемое число периодов за цикл', () => {
  assert.equal(expectedPeriodsPerCycle({ kind: 'daily' }), 1);
  assert.equal(expectedPeriodsPerCycle({ kind: 'selected_days', days: [1, 3] }), 1);
  assert.equal(expectedPeriodsPerCycle({ kind: 'times_per_week', times: 3 }), 3);
  assert.equal(expectedPeriodsPerCycle({ kind: 'times_per_month', times: 2 }), 2);
});

test('Контекст по умолчанию: UTC и начало дня в 04:00', () => {
  assert.equal(DEFAULT_PERIOD_CONTEXT.dayStartHour, 4);
  assert.equal(DEFAULT_PERIOD_CONTEXT.timezoneOffsetMinutes, 0);
});

test('Месяц строится из локальной даты с учётом начала дня', () => {
  const instant = new Date('2026-10-31T22:00:00Z');
  const midnightCtx: PeriodContext = { timezoneOffsetMinutes: 180, dayStartHour: 0 };
  assert.equal(monthKey(instant, midnightCtx), '2026-11');
  assert.equal(monthKey(instant, MSK), '2026-10');
});
