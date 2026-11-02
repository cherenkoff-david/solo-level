import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_XP } from '../src/types.ts';
import {
  computeActionReward,
  computeMilestoneBonus,
  computeMilestoneReward,
  MILESTONE_BONUS_MAX,
  MILESTONE_BONUS_MIN,
} from '../src/reward.ts';

test('Базовый XP совпадает с таблицей усилий документа', () => {
  assert.equal(BASE_XP[1], 10);
  assert.equal(BASE_XP[2], 20);
  assert.equal(BASE_XP[3], 35);
  assert.equal(BASE_XP[4], 55);
  assert.equal(BASE_XP[5], 80);
});

test('Пример A: первое выполнение даёт базовый XP плюс бонус первого шага', () => {
  const reward = computeActionReward({
    effort: 2,
    isFirstActionInSphere: true,
    previousPeriods: [],
  });
  assert.equal(reward.totalXp, 25);
  assert.equal(reward.firstStepXp, 5);
  assert.equal(reward.rhythmBonusXp, 0);
});

test('Пример A: второе и третье выполнение идут без бонуса ритма (этап настройки)', () => {
  const second = computeActionReward({
    effort: 2,
    isFirstActionInSphere: false,
    previousPeriods: [true],
  });
  const third = computeActionReward({
    effort: 2,
    isFirstActionInSphere: false,
    previousPeriods: [true, true],
  });
  assert.equal(second.totalXp, 20);
  assert.equal(third.totalXp, 20);
});

test('Пример A: четвёртое выполнение при 100% ритма даёт +20%', () => {
  const fourth = computeActionReward({
    effort: 2,
    isFirstActionInSphere: false,
    previousPeriods: [true, true, true],
  });
  assert.equal(fourth.rhythmBonusXp, 4);
  assert.equal(fourth.totalXp, 24);
});

test('Этап настройки: двух периодов истории недостаточно для бонуса', () => {
  const reward = computeActionReward({
    effort: 2,
    isFirstActionInSphere: false,
    previousPeriods: [true, true],
  });
  assert.equal(reward.rhythmBonusXp, 0);
});

test('Окно бонуса — только последние 4 периода', () => {
  const reward = computeActionReward({
    effort: 2,
    isFirstActionInSphere: false,
    previousPeriods: [false, false, false, true, true, true, true],
  });
  assert.equal(reward.rhythmBonusXp, 4, 'старые пропуски вне окна не влияют');
});

test('Ступени бонуса: 75% даёт +10%, 50% даёт +5%', () => {
  const seventyFive = computeActionReward({
    effort: 2,
    isFirstActionInSphere: false,
    previousPeriods: [true, true, true, false],
  });
  const fifty = computeActionReward({
    effort: 2,
    isFirstActionInSphere: false,
    previousPeriods: [true, true, false, false],
  });
  assert.equal(seventyFive.rhythmBonusXp, 2);
  assert.equal(fifty.rhythmBonusXp, 1);
});

test('Ниже 50% бонуса нет', () => {
  const reward = computeActionReward({
    effort: 2,
    isFirstActionInSphere: false,
    previousPeriods: [true, false, false, false],
  });
  assert.equal(reward.rhythmBonusXp, 0);
});

test('Пример B: задача усилия 4 даёт 55 XP', () => {
  const reward = computeActionReward({
    effort: 4,
    isFirstActionInSphere: false,
    previousPeriods: [],
  });
  assert.equal(reward.totalXp, 55);
});

test('Пример B: первое действие в сфере добавляет 5 XP', () => {
  const reward = computeActionReward({
    effort: 4,
    isFirstActionInSphere: true,
    previousPeriods: [],
  });
  assert.equal(reward.totalXp, 60);
});

test('Пример D: надбавка за веху — 25% от XP вложенных действий', () => {
  assert.equal(computeMilestoneBonus(620), 155);
});

test('Надбавка за веху ограничена сверху 300 XP', () => {
  assert.equal(computeMilestoneBonus(5000), MILESTONE_BONUS_MAX);
});

test('Надбавка за веху имеет минимум 15 XP', () => {
  assert.equal(computeMilestoneBonus(20), MILESTONE_BONUS_MIN);
});

test('Веха без вложенных действий даёт базовый XP по усилию', () => {
  const reward = computeMilestoneReward(0, 4);
  assert.equal(reward.totalXp, 55);
  assert.equal(reward.rhythmBonusXp, 0);
});

test('Веха с вложенными действиями не даёт базовый XP повторно', () => {
  const reward = computeMilestoneReward(620, 4);
  assert.equal(reward.baseXp, 0);
  assert.equal(reward.totalXp, 155);
});

test('Веха экономически выгоднее обычной задачи того же усилия', () => {
  const milestone = computeMilestoneReward(620, 4);
  const task = computeActionReward({
    effort: 4,
    isFirstActionInSphere: false,
    previousPeriods: [],
  });
  assert.ok(
    milestone.totalXp > task.totalXp,
    'месяцы работы не должны быть дешевле одной задачи',
  );
});
