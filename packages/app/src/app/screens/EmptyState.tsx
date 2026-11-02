interface EmptyStateProps {
  readonly title: string;
  readonly hint: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <section
      aria-labelledby="page-title"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-6 py-8"
    >
      <h1 id="page-title" className="text-xl font-semibold tracking-[-0.01em]">
        {title}
      </h1>
      <p className="max-w-[48ch] text-sm text-text-muted">{hint}</p>
      <p className="nums mt-2 text-xs text-text-faint">экрана ещё нет — идёт работа над каркасом</p>
    </section>
  );
}
