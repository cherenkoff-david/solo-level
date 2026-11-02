import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cumulativeXp,
  cumulativeSphereXp,
  xpNext,
  xpNextSphere,
} from '../src/xp.ts';
import { levelForXp, levelState, sphereLevelForXp } from '../src/levels.ts';

test('XPNext: первый переход стоит 100 XP', () => {
  assert.equal(xpNext(1), 100);
});

test('XPNext: значения кривой 1.05 совпадают с документом', () => {
  assert.equal(xpNext(1), 100);
  assert.equal(xpNext(2), 105);
  assert.equal(xpNext(10), 155);
  assert.equal(xpNext(20), 253);
});

test('Накопительный XP до уровня 20 равен 3056 (кривая 1.05)', () => {
  assert.equal(cumulativeXp(20), 3056);
});

test('Накопительный XP до уровня 55 равен 25880 (кривая 1.05)', () => {
  assert.equal(cumulativeXp(55), 25880);
});

test('Верхняя ступень достижима за ~17 месяцев при 50 XP в день', () => {
  const days = cumulativeXp(55) / 50;
  assert.ok(days > 510 && days < 525, `получилось ${days} дней`);
});

test('Кривая 1.12 даёт вырожденный хвост (регрессия к старой версии)', () => {
  const days = cumulativeXp(55, 1.12) / 50;
  assert.ok(days > 7000, `старая кривая должна быть неприемлемой, дней: ${days}`);
});

test('Уровень 1 начинается с нуля XP', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(99), 1);
  assert.equal(levelForXp(100), 2);
});

test('Состояние уровня: сколько осталось до следующего', () => {
  const state = levelState(120);
  assert.equal(state.level, 2);
  assert.equal(state.xpIntoLevel, 20);
  assert.equal(state.xpForNext, 105);
  assert.equal(state.xpToNext, 85);
});

test('Кривая сферы 1.03: значения совпадают с документом', () => {
  assert.equal(xpNextSphere(1), 100);
  assert.equal(cumulativeSphereXp(10), 1016);
  assert.equal(cumulativeSphereXp(20), 2510);
});

test('Сфера растёт медленнее общего уровня', () => {
  const total = cumulativeXp(20);
  const sphere = cumulativeSphereXp(20);
  assert.ok(sphere < total, 'сфера должна требовать меньше XP за тот же уровень');
  assert.ok(
    cumulativeSphereXp(10) < cumulativeXp(10),
    'кривая сферы мягче на всём диапазоне',
  );
});

test('Уровень сферы при 34% внимания доходит до 10 за ~60 дней', () => {
  const days = cumulativeSphereXp(10) / (50 * 0.34);
  assert.ok(days > 55 && days < 65, `получилось ${days} дней`);
});

test('Отрицательный XP не опускает уровень ниже первого', () => {
  assert.equal(levelForXp(-500), 1);
  assert.equal(sphereLevelForXp(-500), 1);
});
