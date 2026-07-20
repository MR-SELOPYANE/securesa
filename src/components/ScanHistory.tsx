import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Search, FileCheck2, FileX2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScanHistory, toCSV, downloadCSV } from "@/lib/history";

type Filter = "all" | "granted" | "denied";

export function ScanHistory() {
  const { scans, clear } = useScanHistory();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return scans.filter((s) => {
      if (filter !== "all" && s.outcome !== filter) return false;
      if (q) {
        const t = `${s.name} ${s.nationality} ${s.docId} ${s.station}`.toLowerCase();
        if (!t.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [scans, filter, q]);

  const totals = useMemo(() => {
    const granted = scans.filter((s) => s.outcome === "granted").length;
    const denied = scans.filter((s) => s.outcome === "denied").length;
    return { total: scans.length, granted, denied };
  }, [scans]);

  const exportCsv = () => {
    downloadCSV(`sentry-za-scans-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(filtered));
  };

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/40">
        <div>
          <h2 className="font-bold tracking-wide">SCAN HISTORY</h2>
          <p className="text-xs text-muted-foreground">
            {totals.total} records · {totals.granted} granted · {totals.denied} denied
          </p>
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
            disabled={scans.length === 0}
            className="font-mono text-xs tracking-widest text-signal-red hover:text-signal-red"
            aria-label="Clear all history"
          >
            <Trash2 className="w-4 h-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, nationality, doc ID…"
              aria-label="Search scan history"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            {(["all", "granted", "denied"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-md font-mono text-[11px] uppercase tracking-widest transition-colors",
                  filter === f
                    ? f === "granted"
                      ? "bg-signal-green/20 text-signal-green"
                      : f === "denied"
                      ? "bg-signal-red/20 text-signal-red"
                      : "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/60 sticky top-0">
                <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Nationality</th>
                  <th className="px-3 py-2">Doc ID</th>
                  <th className="px-3 py-2">Station</th>
                  <th className="px-3 py-2">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground text-sm">
                      No scans match the current filter.
                    </td>
                  </tr>
                )}
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-background/40">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(s.ts).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.nationality}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.docId}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.station}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded",
                          s.outcome === "granted"
                            ? "bg-signal-green/15 text-signal-green"
                            : "bg-signal-red/15 text-signal-red"
                        )}
                      >
                        {s.outcome === "granted" ? (
                          <FileCheck2 className="w-3 h-3" aria-hidden />
                        ) : (
                          <FileX2 className="w-3 h-3" aria-hidden />
                        )}
                        {s.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
