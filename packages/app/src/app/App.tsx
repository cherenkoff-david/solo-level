import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./shell/AppShell";
import { EmptyState } from "./screens/EmptyState";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <EmptyState
              title="Сегодня"
              hint="Что полезно сделать сейчас. Здесь появится посильный маршрут на день."
            />
          }
        />
        <Route
          path="progress"
          element={
            <EmptyState
              title="Прогресс"
              hint="История активности и обзор недели: что сделано, сколько получено и почему."
            />
          }
        />
        <Route
          path="spheres"
          element={
            <EmptyState
              title="Сферы"
              hint="Направления жизни и их уровни: куда идёт вклад и как он растёт."
            />
          }
        />
        <Route
          path="settings"
          element={
            <EmptyState
              title="Настройки"
              hint="Сферы, период, часовой пояс, экспорт данных."
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
