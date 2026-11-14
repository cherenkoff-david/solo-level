import { useState } from "react";

import { filterCategories } from "@solo/finance";
import type { Category, CategoryKind } from "@solo/finance";

import { Button, Card, CardHeader, Chip, Field, Select, TextInput } from "./components/ui";
import {
  addCategory,
  archiveCategory,
  getArchivedCategories,
  getCategoriesInUse,
  moveCategory,
  renameCategory,
  restoreCategory,
  toggleCategoryEssential,
} from "./store";
import { useFinanceState } from "./useFinance";

type KindFilter = CategoryKind | "all";

export function CategoryManager() {
  const state = useFinanceState();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [showArchive, setShowArchive] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<CategoryKind>("expense");
  const [newEssential, setNewEssential] = useState(false);

  const active = getCategoriesInUse(state);
  const archived = getArchivedCategories(state);
  const visible = filterCategories(active, { query, kind });
  const filtered = query.trim() !== "" || kind !== "all";

  const dropOn = (targetId: string) => {
    if (dragId !== null && dragId !== targetId) moveCategory(dragId, targetId);
    setDragId(null);
    setOverId(null);
  };

  const moveUp = (id: string) => {
    const index = visible.findIndex((category) => category.id === id);
    const previous = index > 0 ? visible[index - 1] : undefined;
    if (previous !== undefined) moveCategory(id, previous.id);
  };

  const moveDown = (id: string) => {
    const index = visible.findIndex((category) => category.id === id);
    const next = index >= 0 ? visible[index + 1] : undefined;
    if (next !== undefined) moveCategory(next.id, id);
  };

  return (
    <Card dataTour="categories">
      <CardHeader
        title="Категории"
        hint="Порядок — только для удобства: на расчёты он не влияет. Архивированные скрываются из списка"
      />
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Поиск" className="min-w-44 flex-1">
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="название категории"
            />
          </Field>
          <Field label="Вид" className="w-36">
            <Select value={kind} onChange={(event) => setKind(event.target.value as KindFilter)}>
              <option value="all">Все</option>
              <option value="expense">Расходы</option>
              <option value="income">Доходы</option>
            </Select>
          </Field>
          <div className="flex items-center gap-2 pb-1">
            {filtered ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setKind("all");
                }}
              >
                сбросить
              </Button>
            ) : null}
            <span className="text-xs text-text-faint">
              {visible.length} из {active.length}
            </span>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-sm text-text-muted">
            {active.length === 0
              ? "Активных категорий нет. Добавьте первую ниже."
              : "Под фильтр ничего не подошло."}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {visible.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                isFirst={index === 0}
                isLast={index === visible.length - 1}
                isDragging={dragId === category.id}
                isOver={overId === category.id && dragId !== null && dragId !== category.id}
                onDragStart={() => setDragId(category.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={() => setOverId(category.id)}
                onDrop={() => dropOn(category.id)}
                onUp={() => moveUp(category.id)}
                onDown={() => moveDown(category.id)}
              />
            ))}
          </ul>
        )}

        {archived.length === 0 ? null : (
          <div className="mt-4 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setShowArchive(!showArchive)}
              aria-expanded={showArchive}
              className="flex items-center gap-2 text-xs text-text-muted transition-colors hover:text-text"
            >
              <span aria-hidden="true">{showArchive ? "▾" : "▸"}</span>
              Архив · {archived.length}
            </button>
            {showArchive ? (
              <ul className="mt-2 flex flex-col gap-1">
                {archived.map((category) => (
                  <li
                    key={category.id}
                    className="flex flex-wrap items-center gap-3 py-1.5 text-text-faint"
                  >
                    <span className="flex size-5 items-center justify-center rounded border border-border text-[10px]">
                      {category.icon}
                    </span>
                    <span className="min-w-40 flex-1 truncate text-sm">{category.name}</span>
                    <Chip>{category.kind === "income" ? "доход" : "расход"}</Chip>
                    <span className="text-xs">в архиве с {category.archivedAt}</span>
                    <Button size="sm" variant="ghost" onClick={() => restoreCategory(category.id)}>
                      вернуть
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <Field label="Новая категория" className="min-w-48 flex-1">
            <TextInput
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Спортзал"
            />
          </Field>
          <Field label="Вид" className="w-32">
            <Select value={newKind} onChange={(event) => setNewKind(event.target.value as CategoryKind)}>
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </Select>
          </Field>
          {newKind === "expense" ? (
            <label className="flex items-center gap-1.5 pb-2.5 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={newEssential}
                onChange={() => setNewEssential(!newEssential)}
                className="size-3.5 accent-white"
              />
              обязательная
            </label>
          ) : null}
          <Button
            variant="primary"
            onClick={() => {
              addCategory({ name: newName, kind: newKind, isEssential: newEssential });
              setNewName("");
              setNewEssential(false);
            }}
          >
            Добавить
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface CategoryRowProps {
  readonly category: Category;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly isDragging: boolean;
  readonly isOver: boolean;
  readonly onDragStart: () => void;
  readonly onDragEnd: () => void;
  readonly onDragOver: () => void;
  readonly onDrop: () => void;
  readonly onUp: () => void;
  readonly onDown: () => void;
}

function CategoryRow({
  category,
  isFirst,
  isLast,
  isDragging,
  isOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onUp,
  onDown,
}: CategoryRowProps) {
  return (
    <li
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={[
        "flex flex-wrap items-center gap-2 py-2 transition-colors",
        isDragging ? "opacity-40" : "",
        isOver ? "border-t-2 border-t-text" : "border-t-2 border-t-transparent",
      ].join(" ")}
    >
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", category.id);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        aria-label={`Перетащить категорию ${category.name}`}
        title="Перетащите, чтобы изменить порядок"
        className="h-7 w-6 cursor-grab text-text-faint transition-colors hover:text-text active:cursor-grabbing"
      >
        ⠿
      </button>

      <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-text-muted">
        {category.icon}
      </span>

      <TextInput
        defaultValue={category.name}
        onBlur={(event) => {
          if (event.target.value.trim() !== category.name) renameCategory(category.id, event.target.value);
        }}
        className="h-8 max-w-56 min-w-32 flex-1 border-transparent bg-transparent px-1 hover:border-border focus:border-text"
        aria-label={`Название категории ${category.name}`}
      />

      <Chip>
        <span className={category.kind === "income" ? "text-income" : "text-expense"}>
          {category.kind === "income" ? "доход" : "расход"}
        </span>
      </Chip>

      {category.kind === "expense" ? (
        <label className="flex items-center gap-1.5 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={category.isEssential}
            onChange={() => toggleCategoryEssential(category.id)}
            className="size-3.5 accent-white"
          />
          обязательная
        </label>
      ) : null}

      <span className="flex items-center">
        <button
          type="button"
          onClick={onUp}
          disabled={isFirst}
          aria-label={`Поднять категорию ${category.name}`}
          className="h-7 w-6 text-text-faint transition-colors hover:text-text disabled:opacity-25"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onDown}
          disabled={isLast}
          aria-label={`Опустить категорию ${category.name}`}
          className="h-7 w-6 text-text-faint transition-colors hover:text-text disabled:opacity-25"
        >
          ↓
        </button>
      </span>

      <Button size="sm" variant="ghost" onClick={() => archiveCategory(category.id)}>
        в архив
      </Button>
    </li>
  );
}
