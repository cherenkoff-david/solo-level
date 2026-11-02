import { NavLink } from "react-router-dom";

import { NAV_ITEMS } from "./navigation";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-8 px-6">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-body font-medium tracking-[-0.01em]"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          Solo
        </NavLink>

        <nav aria-label="Основная навигация">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    [
                      "flex h-8 items-center rounded-md px-3 text-base transition-colors duration-[120ms] ease-out",
                      isActive
                        ? "bg-accent-muted text-text"
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
