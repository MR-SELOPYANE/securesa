import { useEffect, useState, useCallback } from "react";

export type ScanOutcome = "granted" | "denied";

export interface ScanRecord {
  id: string;
  ts: number;
  name: string;
  nationality: string;
  docId: string;
  outcome: ScanOutcome;
  reason: string;
  station: string;
}

export interface DroneAlert {
  id: string;
  ts: number;
  contactId: string;
  zone: string;
  threat: "suspect" | "hostile";
  label: string;
  dispatched: boolean;
}

const SCAN_KEY = "sentry-za.scans.v1";
const ALERT_KEY = "sentry-za.alerts.v1";

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value.slice(0, 500)));
  } catch {
    /* ignore */
  }
}

export function useScanHistory() {
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    setScans(load<ScanRecord>(SCAN_KEY));
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCAN_KEY) setScans(load<ScanRecord>(SCAN_KEY));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addScan = useCallback((r: Omit<ScanRecord, "id" | "ts">) => {
    const rec: ScanRecord = { ...r, id: crypto.randomUUID(), ts: Date.now() };
    setScans((prev) => {
      const next = [rec, ...prev];
      save(SCAN_KEY, next);
      return next;
    });
    return rec;
  }, []);

  const clear = useCallback(() => {
    setScans([]);
    save(SCAN_KEY, []);
  }, []);

  return { scans, addScan, clear };
}

export function useDroneAlerts() {
  const [alerts, setAlerts] = useState<DroneAlert[]>([]);

  useEffect(() => {
    setAlerts(load<DroneAlert>(ALERT_KEY));
  }, []);

  const addAlert = useCallback((a: Omit<DroneAlert, "id" | "ts">) => {
    const rec: DroneAlert = { ...a, id: crypto.randomUUID(), ts: Date.now() };
    setAlerts((prev) => {
      const next = [rec, ...prev];
      save(ALERT_KEY, next);
      return next;
    });
    return rec;
  }, []);

  const markDispatched = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, dispatched: true } : a));
      save(ALERT_KEY, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setAlerts([]);
    save(ALERT_KEY, []);
  }, []);

  return { alerts, addAlert, markDispatched, clear };
}

export function toCSV(scans: ScanRecord[]): string {
  const header = ["timestamp", "station", "name", "nationality", "documentId", "outcome", "reason"];
  const rows = scans.map((s) => [
    new Date(s.ts).toISOString(),
    s.station,
    s.name,
    s.nationality,
    s.docId,
    s.outcome,
    s.reason,
  ]);
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadCSV(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
