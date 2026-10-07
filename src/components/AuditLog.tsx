import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/auth";
import { downloadCSV, rowsToCSV } from "@/lib/history";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["audit_log"]["Row"];

export function AuditLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [integrity, setIntegrity] = useState<{ ok: boolean; checked: number; broken_id: number | null } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("audit_log").select("*").order("id", { ascending: false }).limit(500);
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    load();
    logEvent("view.audit");
  }, [load]);

  const verify = async () => {
    const { data, error } = await supabase.rpc("verify_audit_chain");
    if (error) return toast.error(error.message);
    const r = data?.[0];
    if (!r) return;
    setIntegrity({ ok: r.ok, checked: Number(r.checked), broken_id: r.broken_id });
    if (r.ok) toast.success("AUDIT CHAIN INTACT", { description: `${r.checked} entries verified` });
    else toast.error("TAMPERING DETECTED", { description: `Chain broken at entry #${r.broken_id}` });
  };

  const exportCsv = async () => {
    await logEvent("export.audit", { rows: rows.length });
    downloadCSV(
      `sentry-za-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCSV([
        ["id", "timestamp", "badge", "action", "entity", "entityId", "details", "prevHash", "hash"],
        ...rows.map((r) => [r.id, r.created_at, r.actor_badge, r.action, r.entity, r.entity_id, JSON.stringify(r.details), r.prev_hash, r.hash]),
      ])
    );
  };

  const filtered = rows.filter((r) =>
    !q ? true : `${r.action} ${r.actor_badge} ${r.entity} ${JSON.stringify(r.details)}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-border bg-card/80 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border bg-background/40">
        <div>
          <h2 className="font-bold tracking-wide">AUDIT TRAIL</h2>
          <p className="text-xs text-muted-foreground">Append-only · each entry is hash-chained to the previous one</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={load} aria-label="Refresh"><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={verify} className="font-mono text-xs tracking-widest">
            <ShieldCheck className="w-4 h-4 mr-1" /> VERIFY INTEGRITY
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!rows.length} className="font-mono text-xs tracking-widest">
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {integrity && (
        <div className={`px-6 py-3 text-sm flex items-center gap-2 border-b border-border ${integrity.ok ? "text-signal-green" : "text-signal-red"}`}>
          {integrity.ok ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          {integrity.ok
            ? `Chain intact — ${integrity.checked} entries verified.`
            : `Tampering detected at entry #${integrity.broken_id}. Escalate to the Information Officer.`}
        </div>
      )}

      <div className="p-6 space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by action, badge, details…"
          aria-label="Filter audit log"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
        />
        <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-card text-muted-foreground uppercase tracking-widest text-[10px]">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Badge</th>
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Details</th>
                <th className="text-left p-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top">
                  <td className="p-2 text-muted-foreground">{r.id}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-ZA")}</td>
                  <td className="p-2">{r.actor_badge}</td>
                  <td className="p-2 text-primary">{r.action}</td>
                  <td className="p-2 break-all max-w-[260px] text-muted-foreground">{JSON.stringify(r.details)}</td>
                  <td className="p-2 text-muted-foreground" title={r.hash}>{r.hash.slice(0, 10)}…</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No audit entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
