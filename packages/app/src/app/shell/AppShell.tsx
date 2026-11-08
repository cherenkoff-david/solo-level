import { Outlet, useLocation } from "react-router-dom";

import { Header } from "./Header";

export function AppShell() {
  const location = useLocation();
  const wide = location.pathname.startsWith("/finance");

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className={["flex flex-1 flex-col", wide ? "" : "justify-center"].join(" ")}>
        <div
          className={[
            "mx-auto w-full px-6 py-10",
            wide ? "max-w-[1080px]" : "max-w-[780px]",
          ].join(" ")}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
