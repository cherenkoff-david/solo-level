import { useSyncExternalStore } from "react";

import { getFinanceState, subscribe } from "./store";
import { todayIso } from "@solo/finance";
import type { FinanceState, IsoDate } from "@solo/finance";

export function useFinanceState(): FinanceState {
  return useSyncExternalStore(subscribe, getFinanceState, getFinanceState);
}

export function useToday(): IsoDate {
  return todayIso();
}
