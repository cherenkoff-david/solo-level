import { useState } from "react";

import { addOperation, updateOperation, getCategoriesInUse } from "./store";
import { Button, Dialog, Field, Money, Select, TextInput } from "./components/ui";
import { parseRub } from "@solo/finance";
import type { EntryType, IsoDate, Operation } from "@solo/finance";

export interface OperationDialogProps {
  readonly today: IsoDate;
  readonly operation?: Operation;
  readonly presetDate?: IsoDate;
  readonly onClose: () => void;
}

export function OperationDialog({ today, operation, presetDate, onClose }: OperationDialogProps) {
  const categories = getCategoriesInUse();
  const isEdit = operation !== undefined;
  const [entryType, setEntryType] = useState<EntryType>(operation?.entryType ?? "actual");
  const [amount, setAmount] = useState(
    operation === undefined ? "" : String(operation.amountMinor / 100).replace(".", ","),
  );
  const [categoryId, setCategoryId] = useState(
    operation?.categoryId ?? categories.find((category) => category.kind === "expense")?.id ?? "",
  );
  const [onDate, setOnDate] = useState(operation?.onDate ?? presetDate ?? today);
  const [note, setNote] = useState(operation?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const amountMinor = parseRub(amount);
  const options = categories;

  const submit = () => {
    if (amountMinor === null || amountMinor <= 0) {
      setError("Сумма должна быть больше нуля");
      return;
    }
    if (categoryId === "") {
      setError("Выберите категорию");
      return;
    }
    if (isEdit) {
      updateOperation(operation.id, {
        categoryId,
        onDate,
        amountMinor,
        note: note.trim() === "" ? null : note.trim(),
      });
    } else {
      addOperation({
        entryType,
        categoryId,
        onDate,
        amountMinor,
        note: note.trim() === "" ? undefined : note.trim(),
      });
    }
    onClose();
  };

  return (
    <Dialog
      title={isEdit ? "Изменить операцию" : "Новая операция"}
      description={
        isEdit
          ? "Правка суммы или даты сразу пересчитывает баланс"
          : "План — намерение на будущую дату, факт — то, что уже произошло"
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit}>
            {isEdit ? "Сохранить" : "Добавить"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isEdit ? null : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEntryType("actual")}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                entryType === "actual" ? "border-text bg-surface-raised text-text" : "border-border text-text-muted"
              }`}
            >
              Факт
              <span className="mt-0.5 block text-xs text-text-faint">уже случилось</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryType("planned")}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                entryType === "planned" ? "border-text bg-surface-raised text-text" : "border-border text-text-muted"
              }`}
            >
              План
              <span className="mt-0.5 block text-xs text-text-faint">на будущую дату</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Сумма, ₽">
            <TextInput
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              placeholder="0,00"
              autoFocus
            />
          </Field>
          <Field label="Дата">
            <TextInput type="date" value={onDate} onChange={(event) => setOnDate(event.target.value)} />
          </Field>
        </div>

        <Field label="Категория">
          <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <optgroup label="Доходы">
              {options
                .filter((category) => category.kind === "income")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Расходы">
              {options
                .filter((category) => category.kind === "expense")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isEssential ? " · обязательная" : ""}
                  </option>
                ))}
            </optgroup>
          </Select>
        </Field>

        <Field label="Заметка" hint="необязательно">
          <TextInput
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Например: продукты на неделю"
          />
        </Field>

        {error === null ? null : <p className="text-sm text-text">{error}</p>}
        {amountMinor === null || amountMinor === 0 ? null : (
          <p className="text-xs text-text-faint">
            Будет записано <Money amountMinor={amountMinor} />
          </p>
        )}
      </div>
    </Dialog>
  );
}
