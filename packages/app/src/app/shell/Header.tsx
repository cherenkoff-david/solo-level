import { NavLink, useLocation } from "react-router-dom";

import { Logo } from "./Logo";
import { NAV_ITEMS } from "./navigation";

export function Header() {
  const location = useLocation();
  const monochrome = location.pathname.startsWith("/finance");

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
      </div>
    </header>
  );
}
