import { test } from "node:test";
import assert from "node:assert/strict";

import {
  activeCategories,
  archivedCategories,
  filterCategories,
  moveCategoryBefore,
  nextSortOrder,
  normalizeCategoryOrder,
  sortCategories,
} from "../src/categories.ts";
import { monthRangeBounds } from "../src/periods.ts";
import type { Category, CategoryKind } from "../src/types.ts";

function cat(
  id: string,
  name: string,
  sortOrder: number,
  overrides: Partial<Category> = {},
): Category {
  return {
    id,
    name,
    kind: "expense" as CategoryKind,
    isEssential: false,
    icon: name.slice(0, 1).toUpperCase(),
    archivedAt: null,
    sortOrder,
    ...overrides,
  };
}

const base: Category[] = [
  cat("c", "Связь", 2),
  cat("a", "Аренда", 0),
  cat("b", "Продукты", 1),
];

test("Сортировка идёт по sortOrder, а не по порядку в массиве", () => {
  assert.deepEqual(
    sortCategories(base).map((category) => category.id),
    ["a", "b", "c"],
  );
});

test("При равном sortOrder порядок решает название", () => {
  const tied = [cat("z", "Яблоки", 0), cat("y", "Абрикосы", 0)];
  assert.deepEqual(
    sortCategories(tied).map((category) => category.id),
    ["y", "z"],
  );
});

test("Архивные не попадают в активные, но остаются в архиве", () => {
  const mixed = [
    cat("a", "Аренда", 0),
    cat("b", "Продукты", 1, { archivedAt: "2026-10-01" }),
  ];
  assert.deepEqual(activeCategories(mixed).map((category) => category.id), ["a"]);
  assert.deepEqual(archivedCategories(mixed).map((category) => category.id), ["b"]);
});

test("Перетаскивание вверх: категория встаёт перед целевой", () => {
  const moved = moveCategoryBefore(base, "c", "a");
  assert.deepEqual(
    sortCategories(moved).map((category) => category.id),
    ["c", "a", "b"],
  );
});

test("Перетаскивание вниз: категория встаёт на место целевой", () => {
  const moved = moveCategoryBefore(base, "a", "c");
  assert.deepEqual(
    sortCategories(moved).map((category) => category.id),
    ["b", "a", "c"],
  );
});

test("После перемещения sortOrder остаётся плотным рядом 0..n-1", () => {
  const moved = sortCategories(moveCategoryBefore(base, "c", "a"));
  assert.deepEqual(
    moved.map((category) => category.sortOrder),
    [0, 1, 2],
  );
});

test("Перемещение на себя ничего не меняет", () => {
  const moved = moveCategoryBefore(base, "a", "a");
  assert.deepEqual(
    sortCategories(moved).map((category) => category.id),
    ["a", "b", "c"],
  );
});

test("Перемещение с несуществующим идентификатором не ломает порядок", () => {
  const moved = moveCategoryBefore(base, "missing", "a");
  assert.deepEqual(
    sortCategories(moved).map((category) => category.id),
    ["a", "b", "c"],
  );
});

test("Порядок не влияет на состав: множество категорий сохраняется", () => {
  const moved = moveCategoryBefore(base, "c", "a");
  assert.deepEqual(
    sortCategories(moved)
      .map((category) => category.id)
      .sort(),
    ["a", "b", "c"],
  );
});

test("Фильтр по виду и поиску сохраняет пользовательский порядок", () => {
  const list = [
    cat("a", "Аренда", 0),
    cat("b", "Зарплата", 1, { kind: "income" }),
    cat("c", "Продукты", 2),
  ];
  assert.deepEqual(
    filterCategories(list, { kind: "expense" }).map((category) => category.id),
    ["a", "c"],
  );
  assert.deepEqual(
    filterCategories(list, { query: "прод" }).map((category) => category.id),
    ["c"],
  );
  assert.deepEqual(
    filterCategories(list, { query: "  ПРОД  " }).map((category) => category.id),
    ["c"],
  );
});

test("Пустой фильтр возвращает всё", () => {
  assert.equal(filterCategories(base, {}).length, 3);
});

test("Новая категория получает следующий свободный sortOrder", () => {
  assert.equal(nextSortOrder(base), 3);
  assert.equal(nextSortOrder([]), 0);
});

test("Нормализация старых данных расставляет порядок по виду и названию", () => {
  const legacy = [
    cat("x", "Продукты", Number.NaN),
    cat("y", "Аренда", Number.NaN),
  ];
  const normalized = normalizeCategoryOrder(legacy);
  assert.deepEqual(
    normalized.map((category) => category.id),
    ["y", "x"],
  );
  assert.deepEqual(
    normalized.map((category) => category.sortOrder),
    [0, 1],
  );
});

test("Нормализация сохраняет уже заданный пользователем порядок", () => {
  const normalized = normalizeCategoryOrder(base);
  assert.deepEqual(
    normalized.map((category) => category.id),
    ["a", "b", "c"],
  );
});

test("Диапазон месяцев: ноябрь 2026 — январь 2027", () => {
  assert.deepEqual(monthRangeBounds("2026-11", "2027-01"), {
    from: "2026-11-01",
    to: "2027-01-31",
  });
});

test("Диапазон месяцев переставляет границы, если их указали наоборот", () => {
  assert.deepEqual(monthRangeBounds("2027-01", "2026-11"), {
    from: "2026-11-01",
    to: "2027-01-31",
  });
});

test("Диапазон одного месяца закрывается концом месяца", () => {
  assert.deepEqual(monthRangeBounds("2026-02", "2026-02"), {
    from: "2026-02-01",
    to: "2026-02-28",
  });
});
