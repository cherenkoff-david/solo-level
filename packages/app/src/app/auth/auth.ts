import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "../../lib/supabase";

export type AuthStatus = "unconfigured" | "loading" | "signedOut" | "signedIn";

export interface AuthState {
  readonly status: AuthStatus;
  readonly session: Session | null;
  readonly email: string | null;
  readonly error: string | null;
  readonly notice: string | null;
}

const listeners = new Set<() => void>();
let initialized = false;
let state: AuthState = {
  status: isSupabaseConfigured ? "loading" : "unconfigured",
  session: null,
  email: null,
  error: null,
  notice: null,
};

function notify(): void {
  for (const listener of listeners) listener();
}

function applySession(session: Session | null): void {
  state = {
    status: session === null ? "signedOut" : "signedIn",
    session,
    email: session?.user.email ?? null,
    error: null,
    notice: session === null ? state.notice : null,
  };
  notify();
}

function setError(error: string | null): void {
  state = { ...state, error };
  notify();
}

function setNotice(notice: string | null): void {
  state = { ...state, notice };
  notify();
}

export function initAuth(): void {
  if (initialized || supabase === null) return;
  initialized = true;

  void supabase.auth.getSession().then(({ data, error }) => {
    if (error !== null) {
      state = { ...state, status: "signedOut", error: error.message };
      notify();
      return;
    }
    applySession(data.session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthState(): AuthState {
  return state;
}

export async function signInWithPassword(email: string, password: string): Promise<boolean> {
  if (supabase === null) {
    setError("Supabase не настроен");
    return false;
  }
  setError(null);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error !== null) {
    setError(error.message);
    return false;
  }
  return true;
}

export async function signUpWithPassword(email: string, password: string): Promise<boolean> {
  if (supabase === null) {
    setError("Supabase не настроен");
    return false;
  }
  setError(null);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error !== null) {
    setError(error.message);
    return false;
  }
  if (data.session === null) {
    setNotice("Аккаунт создан. Подтвердите адрес по ссылке из письма, затем войдите.");
  }
  return true;
}

export async function sendMagicLink(email: string): Promise<boolean> {
  if (supabase === null) {
    setError("Supabase не настроен");
    return false;
  }
  setError(null);
  const redirectTo = `${window.location.origin}/finance`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error !== null) {
    setError(error.message);
    return false;
  }
  setNotice("Ссылка для входа отправлена. Локально письмо лежит в Mailpit.");
  return true;
}

export async function signOutUser(): Promise<void> {
  if (supabase === null) return;
  await supabase.auth.signOut();
  setNotice(null);
}
