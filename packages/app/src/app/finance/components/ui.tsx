import { useEffect } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { formatRub, formatRubCompact } from "@solo/finance";
import type { Money } from "@solo/finance";

import { useAmountsMasked } from "../privacy";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border border-text bg-text text-bg hover:bg-transparent hover:text-text transition-colors",
  secondary:
    "border border-border-strong text-text hover:border-text hover:bg-surface-raised transition-colors",
  ghost: "text-text-muted hover:text-text transition-colors",
  danger: "border border-border text-text-muted hover:border-text hover:text-text transition-colors",
};

export function Button({
  variant = "secondary",
  size = "md",
  busy = false,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  busy?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled ?? busy}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-base",
        "disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTS[variant],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  dataTour,
}: {
  children: ReactNode;
  className?: string;
  dataTour?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-border bg-surface ${className}`}
      {...(dataTour === undefined ? {} : { "data-tour": dataTour })}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  actions,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-base font-medium text-text">{title}</h2>
        {hint === undefined ? null : <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      </div>
      {actions === undefined ? null : <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs uppercase tracking-[0.08em] text-text-faint">{label}</span>
      {children}
      {hint === undefined ? null : <span className="text-xs text-text-faint">{hint}</span>}
    </label>
  );
}

const INPUT_CLASS =
  "h-9 w-full rounded-md border border-border bg-bg/40 px-3 text-base text-text placeholder:text-text-faint focus:border-text";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${INPUT_CLASS} ${className}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select {...rest} className={`${INPUT_CLASS} appearance-none ${className}`}>
      {children}
    </select>
  );
}

export const MASKED_AMOUNT = "••• ₽";

export function MaskedAmount({ className = "" }: { className?: string }) {
  return (
    <span className={`nums ${className}`}>
      <span aria-hidden="true">{MASKED_AMOUNT}</span>
      <span className="sr-only">Сумма скрыта</span>
    </span>
  );
}

export function Money({
  amountMinor,
  className = "",
  compact = false,
}: {
  amountMinor: Money;
  className?: string;
  compact?: boolean;
}) {
  const masked = useAmountsMasked();
  if (masked) return <MaskedAmount className={className} />;
  return (
    <span className={`nums ${className}`}>
      {compact ? formatRubCompact(amountMinor) : formatRub(amountMinor)}
    </span>
  );
}

export function SignedMoney({
  amountMinor,
  className = "",
  compact = false,
}: {
  amountMinor: Money;
  className?: string;
  compact?: boolean;
}) {
  const masked = useAmountsMasked();
  if (masked) return <MaskedAmount className={className} />;
  const sign = amountMinor > 0 ? "+" : amountMinor < 0 ? "−" : "";
  const abs = Math.abs(amountMinor);
  return (
    <span className={`nums ${className}`}>
      {sign}
      {compact ? formatRubCompact(abs) : formatRub(abs)}
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "outline" | "solid";
}) {
  const cls =
    tone === "solid"
      ? "bg-text text-bg"
      : tone === "outline"
        ? "border border-border-strong text-text"
        : "border border-border text-text-muted";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-5 py-8">
      <div>
        <p className="text-base text-text">{title}</p>
        <p className="mt-1 text-sm text-text-muted">{hint}</p>
      </div>
      {action}
    </div>
  );
}

export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  width = "max-w-lg",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width} rounded-lg border border-border-strong bg-bg shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-medium text-text">{title}</h2>
            {description === undefined ? null : (
              <p className="mt-1 text-xs text-text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="h-7 w-7 rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer === undefined ? null : (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div>
        <p className="text-base text-text">{label}</p>
        {hint === undefined ? null : <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
          checked ? "border-text bg-text" : "border-border-strong bg-transparent"
        }`}
      >
        <span
          className={`absolute top-0.5 size-3.5 rounded-full transition-transform ${
            checked ? "translate-x-[18px] bg-bg" : "translate-x-0.5 bg-text-muted"
          }`}
        />
      </button>
    </div>
  );
}
