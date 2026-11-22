import { useState } from "react";
import { Link } from "react-router-dom";

import { AuthPanel } from "../auth/AuthPanel";
import { signOutUser } from "../auth/auth";
import { useAuthState } from "../auth/useAuth";
import { useFinanceState } from "../finance/useFinance";
import { Button, Card, CardHeader, Chip } from "../finance/components/ui";
import { formatMoment, initialsFromEmail, providerLabel, shortUserId } from "./profile";

export function ProfileScreen() {
  const auth = useAuthState();

  if (auth.status === "unconfigured") return <ProfileUnavailable />;
  if (auth.status === "loading") return <ProfileLoading />;
  if (auth.status === "signedOut" || auth.user === null) return <AuthPanel auth={auth} />;

  return <ProfileAccount />;
}

function ProfileAccount() {
  const auth = useAuthState();
  const user = auth.user;
  const state = useFinanceState();
  const [signOutBusy, setSignOutBusy] = useState(false);

  if (user === null) return null;

  const initials = initialsFromEmail(user.email);
  const financeStarted = state.baselines.length > 0;

  const signOut = async () => {
    setSignOutBusy(true);
    try {
      await signOutUser();
    } finally {
      setSignOutBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-raised text-lg font-medium tracking-[0.02em] text-text"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-medium tracking-[-0.01em] text-text">
              {user.email}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Личный аккаунт Solo. Один аккаунт — один набор привычек и финансов.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Chip tone="outline">вход: {providerLabel(user.provider)}</Chip>
          </div>
        </div>
      </Card>

      <Card dataTour="profile-account">
        <CardHeader
          title="Аккаунт"
          hint="Данные профиля приходят из сервиса аутентификации и здесь только читаются"
        />
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-text-faint">Почта</dt>
            <dd className="mt-0.5 break-all text-text">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-text-faint">Способ входа</dt>
            <dd className="mt-0.5 text-text">{providerLabel(user.provider)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-text-faint">Аккаунт создан</dt>
            <dd className="mt-0.5 text-text">{formatMoment(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-text-faint">
              Последний вход
            </dt>
            <dd className="mt-0.5 text-text">{formatMoment(user.lastSignInAt, { withTime: true })}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-text-faint">Идентификатор</dt>
            <dd className="mt-0.5 font-mono text-xs text-text-muted" title={user.id}>
              {shortUserId(user.id)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Мои данные" hint="Привязаны к аккаунту и видны только вам" />
        <div className="flex flex-col gap-3 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-text-muted">Финансы</span>
            <span className="flex items-center gap-3">
              <span className="text-text">
                {financeStarted ? "раздел настроен" : "учёт ещё не начат"}
              </span>
              <Link to="/finance" className="text-text-muted underline-offset-2 hover:text-text hover:underline">
                открыть
              </Link>
            </span>
          </div>
          <p className="text-xs text-text-faint">
            Доступ к строкам ограничен политиками на уровне базы: чужой аккаунт не увидит ваши
            операции ни при каком запросе.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Сессия" hint="Выход завершает сессию на этом устройстве" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <span className="text-xs text-text-faint">
            После выхода данные остаются в аккаунте — их увидите при следующем входе.
          </span>
          <Button variant="secondary" busy={signOutBusy} onClick={() => void signOut()}>
            {signOutBusy ? "Выходим…" : "Выйти из аккаунта"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card className="p-6">
        <h1 className="text-2xl font-medium tracking-[-0.01em] text-text">Профиль</h1>
        <p className="mt-2 text-sm text-text-muted">Проверяем сессию…</p>
      </Card>
    </div>
  );
}

function ProfileUnavailable() {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card className="p-6">
        <h1 className="text-2xl font-medium tracking-[-0.01em] text-text">Профиль</h1>
        <p className="mt-2 text-sm text-text-muted">
          Вход не настроен: заполните <span className="text-text">packages/app/.env.local</span> и
          перезапустите сборку. Без сервиса аутентификации профиль показать нечего.
        </p>
      </Card>
    </div>
  );
}
