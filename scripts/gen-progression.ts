import {
  cumulativeSphereXp,
  cumulativeXp,
  DEFAULT_LEVEL_CURVE,
  DEFAULT_SPHERE_CURVE,
  xpNext,
  xpNextSphere,
} from '../packages/domain/src/xp.ts';

const DAILY_XP = 50;

function daysTo(level: number, perDay: number, k: number): number {
  return cumulativeXp(level, k) / perDay;
}

function formatDays(days: number): string {
  return days.toFixed(0);
}

function months(days: number): string {
  return (days / 30.44).toFixed(1);
}

console.log('=== Числа прогрессии (получены запуском кода) ===');
console.log(`Общая кривая k = ${DEFAULT_LEVEL_CURVE}`);
console.log(`Кривая сферы  k = ${DEFAULT_SPHERE_CURVE}`);
console.log(`Ориентир темпа: ${DAILY_XP} XP/день\n`);

console.log('--- Общий уровень: накопительный XP и время ---');
console.log('Уровень | Накопительный XP | Дней при 50 XP/день | Месяцев');
for (const level of [2, 5, 10, 20, 35, 55]) {
  const xp = cumulativeXp(level);
  const days = daysTo(level, DAILY_XP, DEFAULT_LEVEL_CURVE);
  console.log(
    `${String(level).padStart(7)} | ${String(xp).padStart(16)} | ${formatDays(days).padStart(19)} | ${months(days)}`,
  );
}

console.log('\n--- Ступени ---');
console.log('Ступень | Диапазон | Начало (дней) | Длительность (месяцев)');
const ranks: Array<[string, number, number]> = [
  ['Начало пути', 1, 9],
  ['Разгон', 10, 19],
  ['Устойчивость', 20, 34],
  ['Мастер практики', 35, 54],
  ['Вершина', 55, 55],
];
for (const [name, from, to] of ranks) {
  const start = daysTo(from, DAILY_XP, DEFAULT_LEVEL_CURVE);
  const end = daysTo(to + 1, DAILY_XP, DEFAULT_LEVEL_CURVE);
  const duration = (end - start) / 30.44;
  console.log(
    `${name} | ${from}–${to} | ${formatDays(start)} | ${duration.toFixed(1)}`,
  );
}

console.log('\n--- Уровень сферы: время при разной доле внимания ---');
console.log('Доля внимания | XP/день на сферу | L5 (дней) | L10 (дней) | L20 (дней)');
for (const share of [0.5, 0.34, 0.25]) {
  const perDay = DAILY_XP * share;
  const row = [5, 10, 20]
    .map((l) => formatDays(cumulativeSphereXp(l) / perDay))
    .join(' | ');
  console.log(`${(share * 100).toFixed(0)}% | ${perDay.toFixed(1)} | ${row}`);
}

console.log('\n--- Сравнение с прежней кривой 1.12 (почему отказались) ---');
console.log('Уровень | Дней при 1.12 | Дней при 1.05');
for (const level of [10, 20, 35, 55]) {
  const old = daysTo(level, DAILY_XP, 1.12);
  const now = daysTo(level, DAILY_XP, DEFAULT_LEVEL_CURVE);
  console.log(
    `${String(level).padStart(7)} | ${formatDays(old).padStart(13)} | ${formatDays(now).padStart(13)}`,
  );
}

console.log('\n--- Ключевые константы для тестов ---');
console.log(`XPNext(1) = ${xpNext(1)}`);
console.log(`XPNext(10) = ${xpNext(10)}`);
console.log(
  `Накопительный XP до L20 = ${cumulativeXp(20)}`,
);
console.log(
  `Накопительный XP до L55 = ${cumulativeXp(55)}`,
);
console.log(
  `Сфера: накопительный XP до L10 = ${cumulativeSphereXp(10)}`,
);
console.log(
  `Сфера: накопительный XP до L20 = ${cumulativeSphereXp(20)}`,
);
console.log(`XPNextSphere(1) = ${xpNextSphere(1)}`);
console.log(
  `\nДней из 8-недельного цикла (56) при 50 XP/день: уровень ${levelFromSimulation(56, DAILY_XP)}`,
);

function levelFromSimulation(days: number, perDay: number): number {
  let total = 0;
  let level = 1;
  for (let day = 0; day < days; day += 1) {
    total += perDay;
    while (total >= cumulativeXp(level + 1)) {
      level += 1;
    }
  }
  return level;
}
