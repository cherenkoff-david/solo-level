import { useState } from "react";

import { addSeries, getCategoriesInUse } from "./store";
import { Button, Dialog, Field, Select, TextInput } from "./components/ui";
import { parseRub, seriesOccurrences } from "@solo/finance";
import type { IsoDate, Recurrence, Series } from "@solo/finance";

export function SeriesDialog({ today, onClose }: { today: IsoDate; onClose: () => void }) {
  const categories = getCategoriesInUse();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(
    categories.find((category) => category.kind === "expense")?.id ?? "",
  );
  const [recurrence, setRecurrence] = useState<Recurrence>("monthly");
  const [startDate, setStartDate] = useState(today);
  const [boundMode, setBoundMode] = useState<"count" | "date">("count");
  const [count, setCount] = useState("12");
  const [endsOn, setEndsOn] = useState(today);
  const [error, setError] = useState<string | null>(null);

  const amountMinor = parseRub(amount);
  const countValue = Number.parseInt(count, 10);

  const preview = (): string => {
    if (amountMinor === null || amountMinor <= 0) return "";
    const draft: Series = {
      id: "draft",
      title,
      categoryId,
      amountMinor,
      recurrence,
      startDate,
      dayOfMonth: recurrence === "monthly" ? Number(startDate.slice(8, 10)) : null,
      weekday: null,
      occurrencesCount: boundMode === "count" ? countValue : null,
      endsOn: boundMode === "date" ? endsOn : null,
      archivedAt: null,
    };
    const dates = seriesOccurrences(draft);
    if (dates.length === 0) return "";
    return `${dates.length} вхождений: ${dates[0]} … ${dates.at(-1)}`;
  };

  const submit = () => {
    if (title.trim() === "") {
      setError("Название не может быть пустым");
      return;
    }
    if (amountMinor === null || amountMinor <= 0) {
      setError("Сумма должна быть больше нуля");
      return;
    }
    if (boundMode === "count" && (!Number.isFinite(countValue) || countValue <= 0)) {
      setError("Количество повторов должно быть положительным");
      return;
    }
    if (boundMode === "date" && endsOn < startDate) {
      setError("Дата окончания раньше даты начала");
      return;
    }
    addSeries({
      title,
      categoryId,
      amountMinor,
      recurrence,
      startDate,
      occurrencesCount: boundMode === "count" ? countValue : null,
      endsOn: boundMode === "date" ? endsOn : null,
    });
    onClose();
  };

  return (
    <Dialog
      title="Новая серия"
      description="Повторяющаяся операция с конечной границей: число повторов или дата окончания"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit}>
            Создать серию
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Название">
            <TextInput
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError(null);
              }}
              placeholder="Аренда"
              autoFocus
            />
          </Field>
          <Field label="Сумма, ₽">
            <TextInput
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              placeholder="0,00"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Категория">
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.kind === "income" ? "↓" : "↑"} {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Повтор">
            <Select value={recurrence} onChange={(event) => setRecurrence(event.target.value as Recurrence)}>
              <option value="monthly">Каждый месяц</option>
              <option value="weekly">Каждую неделю</option>
              <option value="daily">Каждый день</option>
            </Select>
          </Field>
        </div>

        <Field label="Первое вхождение">
          <TextInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </Field>

        <div>
          <span className="text-xs uppercase tracking-[0.08em] text-text-faint">Граница серии</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setBoundMode("count")}
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                boundMode === "count" ? "border-text bg-surface-raised" : "border-border text-text-muted"
              }`}
            >
              По количеству
            </button>
            <button
              type="button"
              onClick={() => setBoundMode("date")}
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                boundMode === "date" ? "border-text bg-surface-raised" : "border-border text-text-muted"
              }`}
            >
              По дате
            </button>
          </div>
        </div>

        {boundMode === "count" ? (
          <Field label="Сколько раз повторить">
            <TextInput inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} />
          </Field>
        ) : (
          <Field label="Последнее вхождение — не позже">
            <TextInput type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
          </Field>
        )}

        {preview() === "" ? null : <p className="text-xs text-text-faint">{preview()}</p>}
        {error === null ? null : <p className="text-sm text-text">{error}</p>}
      </div>
    </Dialog>
  );
}
