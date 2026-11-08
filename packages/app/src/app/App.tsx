import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./shell/AppShell";
import { LandingPage } from "./landing/LandingPage";
import { SoloPlaceholder } from "./screens/SoloPlaceholder";
import { FinanceSection } from "./finance/FinanceSection";
import { OverviewScreen } from "./finance/OverviewScreen";
import { CalendarScreen } from "./finance/CalendarScreen";
import { OperationsScreen } from "./finance/OperationsScreen";
import { SettingsScreen } from "./finance/SettingsScreen";

export function App() {
  return (
    <Routes>
      <Route path="welcome" element={<LandingPage />} />
      <Route element={<AppShell />}>
        <Route index element={<SoloPlaceholder />} />
        <Route path="progress" element={<SoloPlaceholder />} />
        <Route path="spheres" element={<SoloPlaceholder />} />
        <Route path="settings" element={<SoloPlaceholder />} />
        <Route path="finance" element={<FinanceSection />}>
          <Route index element={<OverviewScreen />} />
          <Route path="calendar" element={<CalendarScreen />} />
          <Route path="operations" element={<OperationsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
