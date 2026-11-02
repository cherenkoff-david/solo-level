import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendEntry,
  appendEntryIdempotent,
  createReversal,
  DuplicateRewardError,
  idempotencyKey,
  isReversed,
  sphereXpFromLedger,
  totalXpFromLedger,
  type LedgerEntry,
} from '../src/ledger.ts';

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'e1',
    occurredAt: '2026-10-28T10:00:00Z',
    sourceType: 'habit',
    sourceId: 'h1',
    eventType: 'base_xp',
    periodKey: '2026-10-28',
    sphereId: 's1',
    baseXp: 20,
    bonusXp: 0,
    totalXp: 20,
    ruleVersion: 'v1',
    reversesId: null,
    ...overrides,
  };
}

test('Ключ идемпотентности строится детерминированно', () => {
  assert.equal(
    idempotencyKey('habit', 'h1', '2026-10-28', 'base_xp'),
    'habit:h1:2026-10-28:base_xp',
  );
});

test('Одинаковые ключи у одинаковых фактов', () => {
  const a = idempotencyKey('habit', 'h1', '2026-10-28', 'base_xp');
  const b = idempotencyKey('habit', 'h1', '2026-10-28', 'base_xp');
  assert.equal(a, b);
});

test('Разные периоды дают разные ключи', () => {
  assert.notEqual(
    idempotencyKey('habit', 'h1', '2026-10-28', 'base_xp'),
    idempotencyKey('habit', 'h1', '2026-10-29', 'base_xp'),
  );
});

test('Разные типы событий дают разные ключи: база и бонус не конфликтуют', () => {
  assert.notEqual(
    idempotencyKey('habit', 'h1', '2026-10-28', 'base_xp'),
    idempotencyKey('habit', 'h1', '2026-10-28', 'rhythm_bonus'),
  );
});

test('Повторная вставка того же факта выбрасывает ошибку', () => {
  const entries = appendEntry([], entry());
  assert.throws(
    () => appendEntry(entries, entry({ id: 'e2' })),
    DuplicateRewardError,
  );
});

test('Идемпотентная вставка молча игнорирует дубль', () => {
  const entries = appendEntryIdempotent([], entry());
  const after = appendEntryIdempotent(entries, entry({ id: 'e2' }));
  assert.equal(after.length, 1, 'дубль не создаёт вторую награду');
});

test('Идемпотентная вставка сохраняет исходные данные', () => {
  const entries = appendEntryIdempotent([], entry({ totalXp: 20 }));
  const after = appendEntryIdempotent(entries, entry({ id: 'e2', totalXp: 999 }));
  assert.equal(totalXpFromLedger(after), 20, 'повтор не меняет начисленное');
});

test('Сумма XP по журналу', () => {
  const entries = appendEntryIdempotent(
    appendEntryIdempotent([], entry({ totalXp: 20 })),
    entry({ id: 'e2', eventType: 'rhythm_bonus', totalXp: 4 }),
  );
  assert.equal(totalXpFromLedger(entries), 24);
});

test('Вклад в сферу считается отдельно от общего XP', () => {
  const entries = appendEntryIdempotent(
    appendEntryIdempotent([], entry({ sphereId: 's1', totalXp: 20 })),
    entry({ id: 'e2', sphereId: 's2', sourceId: 'h2', totalXp: 35 }),
  );
  assert.equal(totalXpFromLedger(entries), 55);
  assert.equal(sphereXpFromLedger(entries, 's1'), 20);
  assert.equal(sphereXpFromLedger(entries, 's2'), 35);
});

test('Отмена создаёт компенсирующую запись с отрицательным XP', () => {
  const entries = appendEntry([], entry({ totalXp: 20 }));
  const after = createReversal(entries, 'e1', 'r1', '2026-10-28T11:00:00Z');
  assert.equal(after.length, 2);
  assert.equal(totalXpFromLedger(after), 0);
  const reversal = after[1];
  assert.ok(reversal);
  assert.equal(reversal.totalXp, -20);
  assert.equal(reversal.reversesId, 'e1');
  assert.equal(reversal.eventType, 'reversal');
});

test('Исходная запись не изменяется при отмене (append-only)', () => {
  const entries = appendEntry([], entry({ totalXp: 20 }));
  const original = entries[0];
  const after = createReversal(entries, 'e1', 'r1', '2026-10-28T11:00:00Z');
  assert.deepEqual(after[0], original, 'первая запись осталась прежней');
});

test('Отмена сохраняет период и сферу исходной записи', () => {
  const entries = appendEntry([], entry({ sphereId: 's1', periodKey: '2026-10-28' }));
  const after = createReversal(entries, 'e1', 'r1', '2026-10-28T11:00:00Z');
  const reversal = after[1];
  assert.ok(reversal);
  assert.equal(reversal.sphereId, 's1');
  assert.equal(reversal.periodKey, '2026-10-28');
});

test('Повторная отмена той же записи не создаёт вторую компенсацию', () => {
  const entries = appendEntry([], entry({ totalXp: 20 }));
  const once = createReversal(entries, 'e1', 'r1', '2026-10-28T11:00:00Z');
  const twice = createReversal(once, 'e1', 'r2', '2026-10-28T12:00:00Z');
  assert.equal(twice.length, 2, 'вторая отмена игнорируется');
  assert.equal(totalXpFromLedger(twice), 0);
});

test('Отменённость выводится из журнала, а не хранится в исходной записи', () => {
  const entries = appendEntry([], entry({ totalXp: 20 }));
  assert.equal(isReversed(entries, 'e1'), false);
  const after = createReversal(entries, 'e1', 'r1', '2026-10-28T11:00:00Z');
  assert.equal(isReversed(after, 'e1'), true);
});

test('Отмена несуществующей записи — ошибка', () => {
  assert.throws(() => createReversal([], 'missing', 'r1', '2026-10-28T11:00:00Z'));
});

test('Порядок записей не влияет на сумму', () => {
  const orderA = appendEntryIdempotent(
    appendEntryIdempotent(
      appendEntryIdempotent([], entry({ totalXp: 20 })),
      entry({ id: 'e2', eventType: 'rhythm_bonus', totalXp: 4 }),
    ),
    entry({ id: 'e3', sourceId: 'h2', totalXp: 35 }),
  );
  const orderB = appendEntryIdempotent(
    appendEntryIdempotent(
      appendEntryIdempotent([], entry({ id: 'e3', sourceId: 'h2', totalXp: 35 })),
      entry({ id: 'e2', eventType: 'rhythm_bonus', totalXp: 4 }),
    ),
    entry({ id: 'e1', totalXp: 20 }),
  );
  assert.equal(totalXpFromLedger(orderA), 59);
  assert.equal(totalXpFromLedger(orderB), 59);
});

test('Разные источники не считаются дублями', () => {
  const entries = appendEntryIdempotent(
    appendEntryIdempotent([], entry({ sourceId: 'h1', totalXp: 20 })),
    entry({ id: 'e2', sourceId: 'h2', totalXp: 20 }),
  );
  assert.equal(entries.length, 2, 'разные привычки начисляются независимо');
});
