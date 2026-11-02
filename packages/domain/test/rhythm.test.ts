import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  displayRhythmPercent,
  rhythmBonusTier,
  rhythmBonusTierFromHistory,
  rhythmLabel,
} from '../src/rhythm.ts';

test('Ступени бонуса: пороги 50/75/100', () => {
  assert.equal(rhythmBonusTier(0), 0);
  assert.equal(rhythmBonusTier(25), 0);
  assert.equal(rhythmBonusTier(49), 0);
  assert.equal(rhythmBonusTier(50), 0.05);
  assert.equal(rhythmBonusTier(74), 0.05);
  assert.equal(rhythmBonusTier(75), 0.1);
  assert.equal(rhythmBonusTier(99), 0.1);
  assert.equal(rhythmBonusTier(100), 0.2);
});

test('Этап настройки: меньше трёх периодов — бонуса нет', () => {
  assert.equal(rhythmBonusTierFromHistory([]), 0);
  assert.equal(rhythmBonusTierFromHistory([true]), 0);
  assert.equal(rhythmBonusTierFromHistory([true, true]), 0);
});

test('Три успешных периода из трёх дают максимальный бонус', () => {
  assert.equal(rhythmBonusTierFromHistory([true, true, true]), 0.2);
});

test('Окно ограничено четырьмя последними периодами', () => {
  assert.equal(
    rhythmBonusTierFromHistory([false, false, false, true, true, true, true]),
    0.2,
  );
});

test('Один пропуск из четырёх даёт +10%, а не обнуляет бонус', () => {
  assert.equal(rhythmBonusTierFromHistory([true, true, true, false]), 0.1);
});

test('Отображаемый ритм за 28 дней слабо реагирует на один пропуск', () => {
  const percent = displayRhythmPercent(27, 28);
  assert.ok(percent > 96 && percent < 97, `получилось ${percent}`);
});

test('Ритм не наказывает за молодую привычку: знаменатель — прошедшие периоды', () => {
  assert.equal(displayRhythmPercent(3, 3), 100);
});

test('При нуле ожидаемых периодов ритм равен нулю, а не делению на ноль', () => {
  assert.equal(displayRhythmPercent(0, 0), 0);
});

test('Ритм описывается человеческим языком', () => {
  assert.equal(rhythmLabel(95), 'устойчиво');
  assert.equal(rhythmLabel(80), 'набирает форму');
  assert.equal(rhythmLabel(50), 'возвращаем ритм');
  assert.equal(rhythmLabel(20), 'начинаем заново');
});

test('Сравнение: серия и ритм ведут себя по-разному', () => {
  const afterOneMiss = displayRhythmPercent(27, 28);
  assert.ok(afterOneMiss >= 90, 'отображаемый ритм остался высоким после одного пропуска');
  assert.equal(rhythmLabel(afterOneMiss), 'устойчиво');
  assert.notEqual(rhythmBonusTier(afterOneMiss), 0.2, 'но бонус ритма считается по короткому окну, а не по 28 дням');
});
