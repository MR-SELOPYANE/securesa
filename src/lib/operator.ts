import { useEffect, useState } from "react";
import type { Profile } from "@/lib/auth";

export interface Operator {
  badge: string;
  name: string;
  rank: string;
  station: string;
  shiftStart: number;
}

const SHIFT_KEY = "sentry-za.shift-start";

/** Derives the on-shift operator from the verified, server-side profile. */
export function operatorFromProfile(p: Profile | null): Operator | null {
  if (!p || !p.approved) return null;
  let start = Number(sessionStorage.getItem(SHIFT_KEY));
  if (!start) {
    start = Date.now();
    sessionStorage.setItem(SHIFT_KEY, String(start));
  }
  return { badge: p.badge, name: p.full_name, rank: p.rank, station: p.station, shiftStart: start };
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
