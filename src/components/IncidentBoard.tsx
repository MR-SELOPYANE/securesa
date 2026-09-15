import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2, AlertTriangle, CheckCircle2, Radio, Send, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDroneAlerts,
  alertsToCSV,
  downloadCSV,
  STAGE_ORDER,
  type IncidentStage,
  type DroneAlert,
} from "@/lib/history";
import { toast } from "sonner";

const STAGE_LABEL: Record<IncidentStage, string> = {
  detected: "Detected",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  resolved: "Resolved",
};

const STAGE_TONE: Record<IncidentStage, string> = {
  detected: "bg-signal-yellow/15 text-signal-yellow border-signal-yellow/40",
  confirmed: "bg-signal-red/15 text-signal-red border-signal-red/40",
  dispatched: "bg-primary/15 text-primary border-primary/40",
  resolved: "bg-signal-green/15 text-signal-green border-signal-green/40",
};

interface Props {
  operatorBadge?: string;
}

export function IncidentBoard({ operatorBadge = "SYSTEM" }: Props) {
  const { alerts, setStage, clear } = useDroneAlerts();
  const [filter, setFilter] = useState<"open" | "all" | IncidentStage>("open");
  const [q, setQ] = useState("");

  const stageOf = (a: DroneAlert): IncidentStage =>
    a.stage ?? (a.dispatched ? "dispatched" : "detected");

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const st = stageOf(a);
      if (filter === "open" && st === "resolved") return false;
      if (filter !== "open" && filter !== "all" && st !== filter) return false;
      if (q) {
        const t = `${a.contactId} ${a.zone} ${a.label} ${a.operator ?? ""}`.toLowerCase();
        if (!t.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [alerts, filter, q]);

  const counts = useMemo(() => {
    const c: Record<IncidentStage, number> = { detected: 0, confirmed: 0, dispatched: 0, resolved: 0 };
    alerts.forEach((a) => (c[stageOf(a)] += 1));
    return c;
  }, [alerts]);

  const advance = (a: DroneAlert) => {
    const st = stageOf(a);
    const next = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, STAGE_ORDER.indexOf(st) + 1)];
    if (next === st) return;
    setStage(a.id, next, operatorBadge);
    toast.success(`${a.contactId} → ${STAGE_LABEL[next].toUpperCase()}`, {
      description: `${a.zone} · logged by ${operatorBadge}`,
    });
  };

  const exportCsv = () =>
    downloadCSV(
      `sentry-za-incidents-${new Date().toISOString().slice(0, 10)}.csv`,
      alertsToCSV(filtered)
    );

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border bg-background/40">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-signal-red" aria-hidden />
          <div>
            <h2 className="font-bold tracking-wide">INCIDENT BOARD</h2>
            <p className="text-xs text-muted-foreground">
              {alerts.length} incidents · {counts.detected + counts.confirmed + counts.dispatched} open ·{" "}
              {counts.resolved} resolved
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="font-mono text-xs tracking-widest"
          >
            <Download className="w-4 h-4 mr-1" aria-hidden />
            EXPORT CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={alerts.length === 0}
            className="font-mono text-xs tracking-widest text-signal-red hover:text-signal-red"
            aria-label="Clear incident board"
          >
            <Trash2 className="w-4 h-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAGE_ORDER.map((s) => (
            <div key={s} className={cn("rounded-lg border p-3 text-center", STAGE_TONE[s])}>
              <div className="text-2xl font-bold font-mono">{counts[s]}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest mt-1">{STAGE_LABEL[s]}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contact, zone, operator…"
              aria-label="Search incidents"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="inline-flex flex-wrap rounded-lg border border-border bg-background p-1">
            {(["open", "all", ...STAGE_ORDER] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-md font-mono text-[11px] uppercase tracking-widest transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-background/50 p-10 text-center text-sm text-muted-foreground">
            No incidents match the current filter. Hostile drone contacts appear here automatically.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((a) => {
              const st = stageOf(a);
              return (
                <li key={a.id} className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {st === "resolved" ? (
                      <CheckCircle2 className="w-5 h-5 text-signal-green" aria-hidden />
                    ) : (
                      <Radio className="w-5 h-5 text-signal-red" aria-hidden />
                    )}
                    <span className="font-bold font-mono">{a.contactId}</span>
                    <span className="text-sm">{a.label}</span>
                    <span className="text-xs text-muted-foreground">· {a.zone}</span>
                    <span
                      className={cn(
                        "ml-auto font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border",
                        STAGE_TONE[st]
                      )}
                    >
                      {STAGE_LABEL[st]}
                    </span>
                  </div>

                  {/* Escalation chain */}
                  <div className="mt-3 flex items-center gap-1">
                    {STAGE_ORDER.map((s, i) => {
                      const reached = STAGE_ORDER.indexOf(st) >= i;
                      const hit = a.timeline?.find((t) => t.stage === s);
                      return (
                        <div key={s} className="flex-1">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-colors",
                              reached ? "bg-primary" : "bg-border"
                            )}
                            aria-hidden
                          />
                          <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                            {STAGE_LABEL[s]}
                            {hit && (
                              <span className="block text-[9px] opacity-70">
                                {new Date(hit.ts).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Raised {new Date(a.ts).toLocaleString()} · {a.operator ?? "SYSTEM"}
                    </span>
                    {st !== "resolved" && (
                      <Button
                        size="sm"
                        onClick={() => advance(a)}
                        className="ml-auto font-mono text-[11px] tracking-widest"
                      >
                        <Send className="w-3 h-3 mr-1" aria-hidden />
                        ESCALATE → {STAGE_LABEL[STAGE_ORDER[STAGE_ORDER.indexOf(st) + 1]].toUpperCase()}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
