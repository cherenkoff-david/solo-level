import { useState } from "react";

import { Button, Card, Field, TextInput } from "../finance/components/ui";
import {
  sendMagicLink,
  signInWithPassword,
  signOutUser,
  signUpWithPassword,
} from "./auth";
import type { AuthState } from "./auth";

export function AuthPanel({ auth }: { readonly auth: AuthState }) {
  const [email, setEmail] = useState(auth.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "password" | "signup" | "link">(null);

  const run = async (kind: "password" | "signup" | "link") => {
    setBusy(kind);
    try {
      if (kind === "password") await signInWithPassword(email.trim(), password);
      if (kind === "signup") await signUpWithPassword(email.trim(), password);
      if (kind === "link") await sendMagicLink(email.trim());
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <Card className="p-6">
        <h1 className="text-2xl font-medium tracking-[-0.01em] text-text">Вход в Solo</h1>
        <p className="mt-2 text-sm text-text-muted">
          Данные хранятся в Supabase и защищены политиками на уровне строк. Один аккаунт — один набор
          привычек и финансов.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Почта">
            <TextInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </Field>

          <Field label="Пароль" hint="для входа по ссылке можно оставить пустым">
            <TextInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {auth.error === null ? null : (
            <p role="alert" className="rounded-md border border-border px-3 py-2 text-sm text-text">
              {auth.error}
            </p>
          )}
          {auth.notice === null ? null : (
            <p role="status" className="rounded-md border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted">
              {auth.notice}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={busy !== null || email.trim() === "" || password === ""}
              onClick={() => void run("password")}
            >
              {busy === "password" ? "Входим…" : "Войти"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy !== null || email.trim() === ""}
              onClick={() => void run("link")}
            >
              {busy === "link" ? "Отправляем…" : "Войти по ссылке"}
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-text-faint">
              Первый вход: создайте аккаунт. На локальной среде письма не уходят наружу — они лежат в Mailpit
              на <span className="text-text-muted">http://127.0.0.1:54324</span>.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                disabled={busy !== null || email.trim() === "" || password === ""}
                onClick={() => void run("signup")}
              >
                {busy === "signup" ? "Создаём…" : "Создать аккаунт"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => void signOutUser()}>
      Выйти
    </Button>
  );
}
