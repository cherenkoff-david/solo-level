import { NavLink, useLocation } from "react-router-dom";

import { useAuthState } from "../auth/useAuth";
import { initialsFromEmail } from "../profile/profile";
import { Logo } from "./Logo";
import { NAV_ITEMS } from "./navigation";

export function Header() {
  const location = useLocation();
  const auth = useAuthState();
  const monochrome = location.pathname.startsWith("/finance");
  const isProfile = location.pathname.startsWith("/profile");

  const signedIn = auth.status === "signedIn" && auth.user !== null;
  const initials = signedIn ? initialsFromEmail(auth.user.email) : "";

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-6 md:gap-8">
        <NavLink
          to="/welcome"
          className="flex shrink-0 items-center gap-2 text-body font-medium tracking-[-0.01em]"
        >
          <Logo monochrome={monochrome} />
          Solo
        </NavLink>

        <nav aria-label="Основная навигация" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex w-max items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    [
                      "flex h-8 items-center rounded-md px-3 text-base transition-colors duration-[120ms] ease-out",
                      isActive
                        ? monochrome
                          ? "bg-surface-raised text-text"
                          : "bg-accent-muted text-text"
                        : "text-text-muted hover:bg-surface-raised hover:text-text",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {auth.status === "loading" ? (
          <span
            aria-hidden="true"
            className="size-8 shrink-0 animate-pulse rounded-full border border-border bg-surface-raised"
          />
        ) : signedIn ? (
          <NavLink
            to="/profile"
            aria-current={isProfile ? "page" : undefined}
            aria-label={`Профиль: ${auth.user.email}`}
            title={auth.user.email}
            className={[
              "group flex h-9 shrink-0 items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-1 transition-colors duration-[120ms]",
              isProfile
                ? "border-text bg-surface-raised"
                : "border-border hover:border-border-strong",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-surface-raised text-xs font-medium tracking-[0.02em] text-text"
            >
              {initials}
            </span>
            <span className="hidden max-w-[160px] truncate pr-2 text-xs text-text-muted group-hover:text-text md:block">
              {auth.user.email}
            </span>
          </NavLink>
        ) : (
          <NavLink
            to="/profile"
            className="flex h-8 shrink-0 items-center rounded-md px-3 text-base text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
          >
            Войти
          </NavLink>
        )}
      </div>
    </header>
  );
}
