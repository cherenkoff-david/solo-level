import { useState } from "react";

import { confirmPlan, findCategory, skipPlan } from "./store";
import { Button, Dialog, Field, Money, TextInput } from "./components/ui";
import { parseRub, planRemaining, formatDayLabel } from "@solo/finance";
import type { FinanceState, IsoDate, Operation } from "@solo/finance";

export function ConfirmPlanDialog({
  plan,
  state,
  today,
  onClose,
}: {
  plan: Operation;
  state: FinanceState;
  today: IsoDate;
  onClose: () => void;
}) {
  const category = findCategory(plan.categoryId, state);
  const remaining = planRemaining(plan, state.operations);
  const [amount, setAmount] = useState(String(remaining / 100).replace(".", ","));
  const [onDate, setOnDate] = useState(plan.onDate <= today ? today : plan.onDate);
  const [keepOpen, setKeepOpen] = useState(category?.isEssential ?? false);
  const [note, setNote] = useState(plan.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const amountMinor = parseRub(amount);

  const submit = () => {
    if (amountMinor === null || amountMinor <= 0) {
      setError("Сумма должна быть больше нуля");
      return;
    }
    confirmPlan({
      planId: plan.id,
      amountMinor,
      onDate,
      keepOpen,
      note: note.trim() === "" ? undefined : note.trim(),
    });
    onClose();
  };

  return (
    <Dialog
      title="Подтвердить операцию"
      description={`${category?.name ?? "Операция"} · план на ${formatDayLabel(plan.onDate)}`}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="danger"
            onClick={() => {
              skipPlan(plan.id);
              onClose();
            }}
          >
            Не было
          </Button>
          <Button variant="primary" onClick={submit}>
            Подтвердить
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between rounded-md border border-border px-3 py-2">
          <span className="text-xs uppercase tracking-[0.08em] text-text-faint">По плану</span>
          <Money amountMinor={plan.amountMinor} className="text-lg" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Сколько вышло, ₽">
            <TextInput
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              autoFocus
            />
          </Field>
          <Field label="Дата">
            <TextInput type="date" value={onDate} onChange={(event) => setOnDate(event.target.value)} />
          </Field>
        </div>

        <Field label="Заметка" hint="необязательно">
          <TextInput value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>

        <label className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2.5">
          <input
            type="checkbox"
            checked={keepOpen}
            onChange={() => setKeepOpen(!keepOpen)}
            className="mt-0.5 size-3.5 accent-white"
          />
          <span>
            <span className="block text-sm text-text">Остаток ещё должен</span>
            <span className="mt-0.5 block text-xs text-text-muted">
              {keepOpen
                ? "План останется открытым и продолжит влиять на прогноз"
                : "Разница уйдёт в экономию и останется в балансе"}
              {amountMinor === null ? null : (
                <>
                  {" · остаток "}
                  <Money amountMinor={Math.max(plan.amountMinor - amountMinor, 0)} />
                </>
              )}
            </span>
          </span>
        </label>

        {error === null ? null : <p className="text-sm text-text">{error}</p>}
      </div>
    </Dialog>
  );
}
