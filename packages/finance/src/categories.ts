import type { Category, CategoryKind } from "./types.ts";

export function compareCategories(left: Category, right: Category): number {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return left.name.localeCompare(right.name, "ru");
}

/** Все категории в пользовательском порядке, включая архивные. */
export function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort(compareCategories);
}

/** Только активные категории в пользовательском порядке. */
export function activeCategories(categories: readonly Category[]): Category[] {
  return sortCategories(categories.filter((category) => category.archivedAt === null));
}

/** Только архивные категории в пользовательском порядке. */
export function archivedCategories(categories: readonly Category[]): Category[] {
  return sortCategories(categories.filter((category) => category.archivedAt !== null));
}

export interface CategoryFilter {
  readonly query?: string;
  readonly kind?: CategoryKind | "all";
}

/** Фильтрация для поиска по списку; порядок сохраняется. */
export function filterCategories(
  categories: readonly Category[],
  filter: CategoryFilter,
): Category[] {
  const query = (filter.query ?? "").trim().toLowerCase();
  const kind = filter.kind ?? "all";
  return sortCategories(categories).filter((category) => {
    if (kind !== "all" && category.kind !== kind) return false;
    if (query === "") return true;
    return category.name.toLowerCase().includes(query);
  });
}

function rebalanced(categories: readonly Category[]): Category[] {
  return categories.map((category, index) =>
    category.sortOrder === index ? category : { ...category, sortOrder: index },
  );
}

/**
 * Перемещает категорию перед целевой. Порядок пересобирается заново,
 * чтобы sortOrder оставался плотным рядом 0..n-1 и не «разъезжался»
 * после множества перетаскиваний.
 */
export function moveCategoryBefore(
  categories: readonly Category[],
  draggedId: string,
  targetId: string,
): Category[] {
  if (draggedId === targetId) return [...categories];
  const current = sortCategories(categories);
  const dragged = current.find((category) => category.id === draggedId);
  const target = current.find((category) => category.id === targetId);
  if (dragged === undefined || target === undefined) return [...categories];
  const rest = current.filter((category) => category.id !== draggedId);
  const targetIndex = rest.findIndex((category) => category.id === targetId);
  const next = [...rest.slice(0, targetIndex), dragged, ...rest.slice(targetIndex)];
  return rebalanced(next);
}

/** Ближайший свободный sortOrder для новой категории. */
export function nextSortOrder(categories: readonly Category[]): number {
  return categories.reduce((max, category) => Math.max(max, category.sortOrder + 1), 0);
}

/**
 * Приводит категории из сохранённого состояния к актуальному виду:
 * добавляет sortOrder там, где его не было (данные прошлых версий),
 * и делает нумерацию плотной.
 */
export function normalizeCategoryOrder(categories: readonly Category[]): Category[] {
  const hasOrder = categories.every((category) => Number.isFinite(category.sortOrder));
  const base = hasOrder
    ? sortCategories(categories)
    : [...categories].sort((left, right) => {
        if (left.kind !== right.kind) return left.kind === "expense" ? -1 : 1;
        return left.name.localeCompare(right.name, "ru");
      });
  return rebalanced(base);
}
