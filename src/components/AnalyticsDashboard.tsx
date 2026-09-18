import { useMemo } from "react";
import { useScanHistory, useDroneAlerts } from "@/lib/history";
import { cn } from "@/lib/utils";
import { BarChart3, PieChart, Activity, MapPin } from "lucide-react";

export function AnalyticsDashboard() {
  const { scans } = useScanHistory();
  const { alerts } = useDroneAlerts();

  const data = useMemo(() => {
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const t = dayStart.getTime();

    // Scans by hour (last 8 hours)
    const hours: { label: string; granted: number; denied: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const hStart = now - (i + 1) * 3600_000;
      const hEnd = now - i * 3600_000;
      const inRange = scans.filter((s) => s.ts >= hStart && s.ts < hEnd);
      hours.push({
        label: new Date(hEnd).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }),
        granted: inRange.filter((s) => s.outcome === "granted").length,
        denied: inRange.filter((s) => s.outcome === "denied").length,
      });
    }

    // Outcome breakdown
    const todayScans = scans.filter((s) => s.ts >= t);
    const granted = todayScans.filter((s) => s.outcome === "granted").length;
    const denied = todayScans.filter((s) => s.outcome === "denied").length;
    const total = granted + denied;

    // Incidents by zone
    const zoneMap = new Map<string, number>();
    alerts.forEach((a) => zoneMap.set(a.zone, (zoneMap.get(a.zone) ?? 0) + 1));
    const zones = [...zoneMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Denial rate trend (last 8 hours, as percentages)
    const trend = hours.map((h) => {
      const tot = h.granted + h.denied;
      return tot ? Math.round((h.denied / tot) * 100) : 0;
    });

    // Category breakdown
    const catMap = new Map<string, number>();
    todayScans.forEach((s) => catMap.set(s.category ?? "Unknown", (catMap.get(s.category ?? "Unknown") ?? 0) + 1));
    const categories = [...catMap.entries()].sort((a, b) => b[1] - a[1]);

    return { hours, granted, denied, total, zones, trend, categories };
  }, [scans, alerts]);

  const maxHour = Math.max(1, ...data.hours.map((h) => h.granted + h.denied));
  const maxZone = Math.max(1, ...data.zones.map(([, n]) => n));

  // Donut math
  const donutTotal = data.total || 1;
  const grantedPct = (data.granted / donutTotal) * 100;
  const deniedPct = (data.denied / donutTotal) * 100;
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/40">
          <BarChart3 className="w-5 h-5 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold tracking-wide">COMMAND ANALYTICS</h2>
            <p className="text-xs text-muted-foreground">Real-time operational intelligence · today</p>
          </div>
        </div>

        <div className="p-6 grid lg:grid-cols-2 gap-6">
          {/* Scans by hour */}
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" aria-hidden />
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Throughput · Last 8 Hours
              </h3>
            </div>
            <div className="flex items-end justify-between gap-2 h-40">
              {data.hours.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end h-full gap-px">
                    <div
                      className="w-full rounded-t bg-signal-red/80 transition-all"
                      style={{ height: `${(h.denied / maxHour) * 100}%`, minHeight: h.denied ? "4px" : "0" }}
                      title={`Denied: ${h.denied}`}
                    />
                    <div
                      className="w-full rounded-t bg-signal-green/80 transition-all"
                      style={{ height: `${(h.granted / maxHour) * 100}%`, minHeight: h.granted ? "4px" : "0" }}
                      title={`Granted: ${h.granted}`}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground -rotate-45 origin-top whitespace-nowrap">
                    {h.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-signal-green/80" /> Granted</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-signal-red/80" /> Denied</span>
            </div>
          </div>

          {/* Outcome donut */}
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-primary" aria-hidden />
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Outcome Breakdown
              </h3>
            </div>
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0" aria-label="Outcome donut">
                <circle cx="70" cy="70" r="52" fill="none" stroke="var(--border)" strokeWidth="16" />
                {data.granted > 0 && (
                  <circle
                    cx="70" cy="70" r="52" fill="none"
                    stroke="var(--signal-green)" strokeWidth="16"
                    strokeDasharray={`${(grantedPct / 100) * circumference} ${circumference}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 70 70)"
                    strokeLinecap="round"
                  />
                )}
                {data.denied > 0 && (
                  <circle
                    cx="70" cy="70" r="52" fill="none"
                    stroke="var(--signal-red)" strokeWidth="16"
                    strokeDasharray={`${(deniedPct / 100) * circumference} ${circumference}`}
                    strokeDashoffset={`${-(grantedPct / 100) * circumference}`}
                    transform="rotate(-90 70 70)"
                    strokeLinecap="round"
                  />
                )}
                <text x="70" y="66" textAnchor="middle" className="fill-foreground font-mono" fontSize="22" fontWeight="bold">
                  {data.total}
                </text>
                <text x="70" y="82" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="9">
                  TOTAL
                </text>
              </svg>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-signal-green" />
                    <span className="font-mono text-sm font-bold text-signal-green">{data.granted}</span>
                    <span className="font-mono text-xs text-muted-foreground">Granted</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-signal-green">
                    {data.total ? Math.round((data.granted / data.total) * 100) : 0}%
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-signal-red" />
                    <span className="font-mono text-sm font-bold text-signal-red">{data.denied}</span>
                    <span className="font-mono text-xs text-muted-foreground">Denied</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-signal-red">
                    {data.total ? Math.round((data.denied / data.total) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Incidents by zone */}
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-primary" aria-hidden />
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Incident Hotspots · By Border Sector
              </h3>
            </div>
            {data.zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drone incidents logged yet.</p>
            ) : (
              <div className="space-y-3">
                {data.zones.map(([zone, count]) => (
                  <div key={zone}>
                    <div className="flex justify-between font-mono text-xs mb-1">
                      <span className="text-muted-foreground">{zone}</span>
                      <span className="text-foreground font-bold">{count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-signal-red/80 transition-all duration-700"
                        style={{ width: `${(count / maxZone) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Denial rate trend */}
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" aria-hidden />
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Denial Rate Trend · 8 Hours
              </h3>
            </div>
            <DenialSparkline values={data.trend} />
            <div className="flex items-center justify-between mt-3 font-mono text-xs">
              <span className="text-muted-foreground">Peak: {Math.max(...data.trend, 0)}%</span>
              <span className="text-muted-foreground">Now: {data.trend[data.trend.length - 1] ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Subject Categories · Today
        </h3>
        {data.categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans recorded today.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.categories.map(([cat, count]) => (
              <div key={cat} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="font-mono text-2xl font-bold">{count}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  {cat}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DenialSparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 300;
  const h = 80;
  const step = w / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - (v / max) * h}`);
  const path = `M ${points.join(" L ")}`;
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--signal-red)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--signal-red)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke="var(--signal-red)" strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - (v / max) * h} r="2.5" fill="var(--signal-red)" />
      ))}
    </svg>
  );
}
