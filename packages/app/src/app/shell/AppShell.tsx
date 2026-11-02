import { Outlet } from "react-router-dom";

import { Header } from "./Header";
import { SphereRadar } from "../spheres/SphereRadar";
import { getSphereProgress, SPHERES } from "../spheres/spheres";

const progress = getSphereProgress(SPHERES);

export function AppShell() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[300px_1fr] gap-10 px-6 py-10">
          <aside>
            <SphereRadar progress={progress} />
          </aside>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
