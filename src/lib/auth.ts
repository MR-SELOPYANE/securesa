import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export async function logEvent(
  action: string,
  details: Record<string, unknown> = {},
  entity?: string,
  entityId?: string
) {
  try {
    await supabase.rpc("log_event", {
      _action: action,
      _entity: entity,
      _entity_id: entityId,
      _details: details as never,
    });
  } catch {
    /* audit failures must not crash the UI */
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p ?? null);
    setRoles((r ?? []).map((x) => x.role));
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => loadProfile(s?.user.id), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);

  const signOut = useCallback(async (reason: "manual" | "idle" = "manual") => {
    await logEvent(reason === "idle" ? "auth.idle_timeout" : "auth.sign_out");
    sessionStorage.removeItem("sentry-za.shift-start");
    await supabase.auth.signOut();
  }, []);

  const isAdmin = !!profile?.approved && roles.includes("admin");
  const isSupervisor = !!profile?.approved && (roles.includes("supervisor") || isAdmin);

  return { session, profile, roles, loading, refresh, signOut, isAdmin, isSupervisor };
}

/** Calls onIdle after `ms` without pointer/keyboard activity. */
export function useIdleTimeout(enabled: boolean, onIdle: () => void, ms = IDLE_TIMEOUT_MS) {
  const cb = useRef(onIdle);
  cb.current = onIdle;
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(() => cb.current(), ms);
    };
    const evs = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, ms]);
}
