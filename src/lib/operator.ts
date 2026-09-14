import { useCallback, useEffect, useState } from "react";

export interface Operator {
  badge: string;
  name: string;
  rank: string;
  shiftStart: number;
}

const KEY = "sentry-za.operator.v1";

function read(): Operator | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Operator) : null;
  } catch {
    return null;
  }
}

export function useOperator() {
  const [operator, setOperatorState] = useState<Operator | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOperatorState(read());
    setLoaded(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setOperatorState(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = useCallback((o: Omit<Operator, "shiftStart">) => {
    const rec: Operator = { ...o, shiftStart: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(rec));
    setOperatorState(rec);
    return rec;
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(KEY);
    setOperatorState(null);
  }, []);

  return { operator, loaded, signIn, signOut };
}

/** Ticking clock; returns a Date updated every second. */
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function formatElapsed(fromMs: number, now: number): string {
  const s = Math.max(0, Math.floor((now - fromMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

export function jhbTime(d: Date): string {
  return d.toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false });
}

export function jhbDate(d: Date): string {
  return d.toLocaleDateString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
