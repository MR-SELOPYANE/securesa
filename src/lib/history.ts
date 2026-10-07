import { useEffect, useState, useCallback, useId } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ScanOutcome = "granted" | "denied";
export type IncidentStage = "detected" | "confirmed" | "dispatched" | "resolved";
export const STAGE_ORDER: IncidentStage[] = ["detected", "confirmed", "dispatched", "resolved"];

export interface ScanRecord {
  id: string;
  ts: number;
  name: string;
  nationality: string;
  docId: string; // always masked (server-side)
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

const SCANS_EVENT = "sentry-za:scans-changed";
const ALERT_EVENT = "sentry-za:alerts-changed";

type ScanRow = {
  id: string; created_at: string; subject_name: string; nationality: string; doc_masked: string;
  outcome: string; reason: string; station: string; officer_badge: string;
  match_score: number | null; category: string | null;
};

export function rowToScan(r: ScanRow): ScanRecord {
  return {
    id: r.id,
    ts: new Date(r.created_at).getTime(),
    name: r.subject_name,
    nationality: r.nationality,
    docId: r.doc_masked,
    outcome: r.outcome as ScanOutcome,
    reason: r.reason,
    station: r.station,
    operator: r.officer_badge,
    matchScore: r.match_score != null ? Number(r.match_score) : undefined,
    category: r.category ?? undefined,
  };
}

function useRealtime(table: string, event: string, reload: () => void) {
  const id = useId();
  useEffect(() => {
    reload();
    window.addEventListener(event, reload);
    const ch = supabase
      .channel(`${table}-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => reload())
      .subscribe();
    return () => {
      window.removeEventListener(event, reload);
      supabase.removeChannel(ch);
    };
  }, [table, event, reload, id]);
}

export function useScanHistory() {
  const [scans, setScans] = useState<ScanRecord[]>([]);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("scans")
      .select("id,created_at,subject_name,nationality,doc_masked,outcome,reason,station,officer_badge,match_score,category")
      .order("created_at", { ascending: false })
      .limit(500);
    setScans((data ?? []).map(rowToScan));
  }, []);
  useRealtime("scans", SCANS_EVENT, reload);

  const addScan = useCallback(async (r: Omit<ScanRecord, "id" | "ts">) => {
    const { error } = await supabase.from("scans").insert({
      subject_name: r.name.slice(0, 120),
      nationality: r.nationality.slice(0, 80),
      doc_masked: r.docId.slice(0, 40), // masked by the server before storage
      outcome: r.outcome,
      reason: r.reason.slice(0, 200),
      station: r.station.slice(0, 80),
      match_score: r.matchScore != null ? Math.round(r.matchScore * 10) / 10 : null,
      category: r.category?.slice(0, 60) ?? null,
    });
    if (error) throw error;
    window.dispatchEvent(new Event(SCANS_EVENT));
  }, []);

  return { scans, addScan, reload };
}

export function useDroneAlerts() {
  const [alerts, setAlerts] = useState<DroneAlert[]>([]);

  const reload = useCallback(async () => {
    const [{ data: inc }, { data: ev }] = await Promise.all([
      supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("incident_events").select("*").order("id", { ascending: true }).limit(2000),
    ]);
    const byInc = new Map<string, DroneAlert["timeline"]>();
    (ev ?? []).forEach((e) => {
      const list = byInc.get(e.incident_id) ?? [];
      list.push({ stage: e.stage as IncidentStage, ts: new Date(e.created_at).getTime(), by: e.by_badge });
      byInc.set(e.incident_id, list);
    });
    setAlerts(
      (inc ?? []).map((a) => ({
        id: a.id,
        ts: new Date(a.created_at).getTime(),
        contactId: a.contact_id,
        zone: a.zone,
        threat: a.threat as DroneAlert["threat"],
        label: a.label,
        dispatched: a.dispatched,
        stage: a.stage as IncidentStage,
        operator: a.officer_badge,
        timeline: byInc.get(a.id) ?? [],
      }))
    );
  }, []);
  useRealtime("incidents", ALERT_EVENT, reload);

  const addAlert = useCallback(
    async (a: Pick<DroneAlert, "contactId" | "zone" | "threat" | "label">) => {
      await supabase.from("incidents").insert({
        contact_id: a.contactId.slice(0, 40),
        zone: a.zone.slice(0, 80),
        threat: a.threat,
        label: a.label.slice(0, 120),
      });
      window.dispatchEvent(new Event(ALERT_EVENT));
    },
    []
  );

  const setStage = useCallback(async (id: string, stage: IncidentStage) => {
    const { error } = await supabase.rpc("advance_incident", { _id: id, _stage: stage });
    if (error) throw error;
    window.dispatchEvent(new Event(ALERT_EVENT));
  }, []);

  const markDispatched = useCallback((id: string) => setStage(id, "dispatched"), [setStage]);

  return { alerts, addAlert, markDispatched, setStage, reload };
}

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export const rowsToCSV = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(",")).join("\n");

export function alertsToCSV(alerts: DroneAlert[]): string {
  const header = ["timestamp", "contactId", "zone", "threat", "classification", "stage", "operator", "lastUpdate"];
  return rowsToCSV([
    header,
    ...alerts.map((a) => {
      const last = a.timeline?.[a.timeline.length - 1];
      return [
        new Date(a.ts).toISOString(), a.contactId, a.zone, a.threat, a.label,
        a.stage ?? "detected", a.operator ?? "—", last ? new Date(last.ts).toISOString() : "—",
      ];
    }),
  ]);
}

export function toCSV(scans: ScanRecord[]): string {
  const header = ["timestamp", "station", "operator", "name", "nationality", "documentId(masked)", "category", "matchScore", "outcome", "reason"];
  return rowsToCSV([
    header,
    ...scans.map((s) => [
      new Date(s.ts).toISOString(), s.station, s.operator ?? "—", s.name, s.nationality, s.docId,
      s.category ?? "—", s.matchScore != null ? s.matchScore.toFixed(1) : "—", s.outcome, s.reason,
    ]),
  ]);
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
