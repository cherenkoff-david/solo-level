import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export const AMOUNT_MASK_DELAY_MS = 30_000;

const AmountsMaskedContext = createContext(false);

export function useAmountsMasked(): boolean {
  return useContext(AmountsMaskedContext);
}

export function AmountsPrivacyProvider({
  masked,
  children,
}: {
  masked: boolean;
  children: ReactNode;
}) {
  return <AmountsMaskedContext.Provider value={masked}>{children}</AmountsMaskedContext.Provider>;
}

export function useInactivityMask(delayMs: number = AMOUNT_MASK_DELAY_MS): boolean {
  const [masked, setMasked] = useState(false);

  useEffect(() => {
    let timer = 0;

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMasked(true), delayMs);
    };

    const onActivity = () => {
      setMasked(false);
      schedule();
    };

    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    schedule();

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [delayMs]);

  return masked;
}
