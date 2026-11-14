import { useEffect, useSyncExternalStore } from "react";

import { getAuthState, initAuth, subscribeAuth } from "./auth";
import type { AuthState } from "./auth";

export function useAuthState(): AuthState {
  useEffect(() => {
    initAuth();
  }, []);
  return useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
}
