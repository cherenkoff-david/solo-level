import { useSyncExternalStore } from "react";

import {
  getFinanceError,
  getFinanceState,
  getFinanceStatus,
  subscribe,
} from "./store";
import type { FinanceStatus } from "./store";
import { todayIso } from "@solo/finance";
import type { FinanceState, IsoDate } from "@solo/finance";

export function useFinanceState(): FinanceState {
  return useSyncExternalStore(subscribe, getFinanceState, getFinanceState);
}

export function useFinanceStatus(): FinanceStatus {
  return useSyncExternalStore(subscribe, getFinanceStatus, getFinanceStatus);
}

export function useFinanceError(): string | null {
  return useSyncExternalStore(subscribe, getFinanceError, getFinanceError);
}

export function useToday(): IsoDate {
  return todayIso();
}
