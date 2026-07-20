import { useMemo } from "react";
import { useScanHistory, useDroneAlerts } from "@/lib/history";
import { cn } from "@/lib/utils";

export function OperatorStats() {
  const { scans } = useScanHistory();
  const { alerts } = useDroneAlerts();

  const stats = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const t = dayStart.getTime();
    const today = scans.filter((s) => s.ts >= t);
    const denied = today.filter((s) => s.outcome === "denied").length;
    const granted = today.filter((s) => s.outcome === "granted").length;
    const hostiles = alerts.filter((a) => a.ts >= t && a.threat === "hostile").length;
    const denialRate = today.length ? Math.round((denied / today.length) * 100) : 0;
    return { total: today.length, granted, denied, hostiles, denialRate };
  }, [scans, alerts]);

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Today · Operator Stats
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {new Date().toLocaleDateString()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Cell label="Scans" value={stats.total} />
        <Cell label="Denials" value={stats.denied} tone="red" />
        <Cell label="Granted" value={stats.granted} tone="green" />
        <Cell label="Drone Hits" value={stats.hostiles} tone="red" />
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono uppercase tracking-widest">
          Denial rate
        </span>
        <span className="font-mono font-bold">{stats.denialRate}%</span>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "red" | "green";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "neutral" && "border-border bg-background/60",
        tone === "red" && "border-signal-red/30 bg-signal-red/10",
        tone === "green" && "border-signal-green/30 bg-signal-green/10"
      )}
    >
      <div
        className={cn(
          "text-2xl font-bold font-mono",
          tone === "red" && "text-signal-red",
          tone === "green" && "text-signal-green"
        )}
      >
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}
