import { useEffect, useState, useCallback } from "react";

export type ScanOutcome = "granted" | "denied";

export type IncidentStage = "detected" | "confirmed" | "dispatched" | "resolved";

export const STAGE_ORDER: IncidentStage[] = ["detected", "confirmed", "dispatched", "resolved"];

export interface ScanRecord {
  id: string;
  ts: number;
  name: string;
  nationality: string;
  docId: string;
  outcome: ScanOutcome;
  reason: string;
  station: string;
  operator?: string;
  matchScore?: number;
  category?: string;
}

export interface DroneAlert {
  id: string;
  ts: number;
  contactId: string;
  zone: string;
  threat: "suspect" | "hostile";
  label: string;
  dispatched: boolean;
  stage?: IncidentStage;
  operator?: string;
  timeline?: { stage: IncidentStage; ts: number; by: string }[];
  notes?: string;
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

const ALERT_EVENT = "sentry-za:alerts-changed";

function saveAlerts(next: DroneAlert[]) {
  save(ALERT_KEY, next);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ALERT_EVENT));
}

export function useDroneAlerts() {
  const [alerts, setAlerts] = useState<DroneAlert[]>([]);

  useEffect(() => {
    const sync = () => setAlerts(load<DroneAlert>(ALERT_KEY));
    sync();
    window.addEventListener(ALERT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ALERT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addAlert = useCallback((a: Omit<DroneAlert, "id" | "ts">) => {
    const rec: DroneAlert = {
      stage: "detected",
      timeline: [{ stage: "detected", ts: Date.now(), by: a.operator ?? "SYSTEM" }],
      ...a,
      id: crypto.randomUUID(),
      ts: Date.now(),
    };
    setAlerts((prev) => {
      const next = [rec, ...prev];
      saveAlerts(next);
      return next;
    });
    return rec;
  }, []);

  const setStage = useCallback((id: string, stage: IncidentStage, by = "SYSTEM") => {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === id
          ? {
              ...a,
              stage,
              dispatched: a.dispatched || stage === "dispatched" || stage === "resolved",
              timeline: [...(a.timeline ?? []), { stage, ts: Date.now(), by }],
            }
          : a
      );
      saveAlerts(next);
      return next;
    });
  }, []);

  const markDispatched = useCallback(
    (id: string, by = "SYSTEM") => setStage(id, "dispatched", by),
    [setStage]
  );

  const clear = useCallback(() => {
    setAlerts([]);
    saveAlerts([]);
  }, []);

  return { alerts, addAlert, markDispatched, setStage, clear };
}

export function alertsToCSV(alerts: DroneAlert[]): string {
  const header = [
    "timestamp",
    "contactId",
    "zone",
    "threat",
    "classification",
    "stage",
    "operator",
    "lastUpdate",
  ];
  const rows = alerts.map((a) => {
    const last = a.timeline?.[a.timeline.length - 1];
    return [
      new Date(a.ts).toISOString(),
      a.contactId,
      a.zone,
      a.threat,
      a.label,
      a.stage ?? (a.dispatched ? "dispatched" : "detected"),
      a.operator ?? "—",
      last ? new Date(last.ts).toISOString() : "—",
    ];
  });
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
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
