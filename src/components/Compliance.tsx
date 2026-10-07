import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Scale, Search, Trash2, UserCheck, AlertOctagon, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rowToScan, type ScanRecord } from "@/lib/history";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole, Profile } from "@/lib/auth";

type Settings = Database["public"]["Tables"]["settings"]["Row"];
const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary";

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6">
      <h3 className="flex items-center gap-2 font-bold tracking-wide mb-4">{icon}{title}</h3>
      {children}
    </section>
  );
}

export function Compliance({ isSupervisor, isAdmin }: { isSupervisor: boolean; isAdmin: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    setSettings(data);
  }, []);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  return (
    <div className="space-y-6">
      <Card title="POPIA PROCESSING NOTICE" icon={<Scale className="w-5 h-5 text-primary" />}>
        <ul className="text-sm space-y-2 leading-relaxed text-muted-foreground">
          <li><b className="text-foreground">Purpose:</b> verifying lawful entry under the Immigration Act 13 of 2002.</li>
          <li><b className="text-foreground">Minimisation:</b> face images and fingerprints are compared live and never stored. Only name, nationality, a masked document number and the match score are kept.</li>
          <li><b className="text-foreground">Retention:</b> records are purged after {settings?.retention_days ?? 90} days.</li>
          <li><b className="text-foreground">Access:</b> officers see their own station only; every view, change and export is logged.</li>
          <li><b className="text-foreground">Information Officer:</b> {settings?.info_officer_name} · {settings?.info_officer_email} · {settings?.info_officer_phone}</li>
        </ul>
      </Card>

      <BreachReport />
      {isSupervisor && <SubjectRequests />}
      {isSupervisor && <Retention isAdmin={isAdmin} />}
      {isAdmin && settings && <SettingsForm settings={settings} onSaved={loadSettings} />}
      {isAdmin && <Officers />}
    </div>
  );
}

const breachSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().trim().min(10, "Describe the incident (min 10 characters)").max(2000),
});

function BreachReport() {
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const submit = async () => {
    const p = breachSchema.safeParse({ severity, description });
    if (!p.success) return toast.error(p.error.issues[0].message);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("breach_reports").insert({ ...p.data, reporter_id: u.user!.id });
    if (error) return toast.error(error.message);
    setDescription("");
    toast.success("BREACH REPORTED", { description: "The Information Officer has been notified via the audit trail." });
  };
  return (
    <Card title="REPORT A DATA BREACH" icon={<AlertOctagon className="w-5 h-5 text-signal-red" />}>
      <p className="text-xs text-muted-foreground mb-3">POPIA s.22 requires suspected compromises of personal information to be reported promptly.</p>
      <div className="grid sm:grid-cols-[160px_1fr] gap-3">
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputCls} aria-label="Severity">
          {["low", "medium", "high", "critical"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="What happened, when, and which records may be affected?" className={inputCls} aria-label="Breach description" />
      </div>
      <Button size="sm" className="mt-3" onClick={submit}>Submit report</Button>
    </Card>
  );
}

function SubjectRequests() {
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [results, setResults] = useState<ScanRecord[]>([]);
  const [edit, setEdit] = useState<{ id: string; name: string; nationality: string; reason: string } | null>(null);

  const lookup = async () => {
    if (query.trim().length < 2 || reason.trim().length < 5) return toast.error("Enter a name/document and a reason (min 5 characters).");
    const { data, error } = await supabase.rpc("dsr_lookup", { _query: query.trim(), _reason: reason.trim() });
    if (error) return toast.error(error.message);
    setResults((data ?? []).map(rowToScan));
  };

  const saveCorrection = async () => {
    if (!edit) return;
    if (edit.reason.trim().length < 5) return toast.error("A reason is required for corrections.");
    const { error } = await supabase.rpc("dsr_correct", { _id: edit.id, _name: edit.name, _nationality: edit.nationality, _reason: edit.reason });
    if (error) return toast.error(error.message);
    toast.success("RECORD CORRECTED", { description: "Change logged to audit trail" });
    setEdit(null);
    lookup();
  };

  return (
    <Card title="DATA SUBJECT REQUESTS" icon={<Search className="w-5 h-5 text-primary" />}>
      <p className="text-xs text-muted-foreground mb-3">Look up, export or correct a person's records (POPIA s.23–24). Every lookup is logged with its reason.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or last digits of document" className={inputCls} aria-label="Subject search" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. access request ref #123" className={inputCls} aria-label="Lookup reason" />
      </div>
      <Button size="sm" className="mt-3" onClick={lookup}>Search records</Button>
      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
              {edit?.id === r.id ? (
                <div className="grid sm:grid-cols-3 gap-2">
                  <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} aria-label="Corrected name" />
                  <input value={edit.nationality} onChange={(e) => setEdit({ ...edit, nationality: e.target.value })} className={inputCls} aria-label="Corrected nationality" />
                  <input value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} placeholder="Reason for correction" className={inputCls} aria-label="Correction reason" />
                  <div className="sm:col-span-3 flex gap-2">
                    <Button size="sm" onClick={saveCorrection}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    <b>{r.name}</b> · {r.nationality} · <span className="font-mono">{r.docId}</span> · {r.outcome} · {r.station} ·{" "}
                    {new Date(r.ts).toLocaleString("en-ZA")}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => setEdit({ id: r.id, name: r.name, nationality: r.nationality, reason: "" })}>Correct</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Retention({ isAdmin }: { isAdmin: boolean }) {
  const [status, setStatus] = useState<{ days: number; expired_scans: number; expired_incidents: number } | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.rpc("retention_status");
    setStatus(data as typeof status);
  }, []);
  useEffect(() => { load(); }, [load]);
  const purge = async () => {
    if (!confirm("Permanently delete all records past the retention period? This is logged.")) return;
    const { data, error } = await supabase.rpc("purge_expired");
    if (error) return toast.error(error.message);
    const d = data as { scans: number; incidents: number };
    toast.success("RETENTION PURGE COMPLETE", { description: `${d.scans} scans, ${d.incidents} incidents removed` });
    load();
  };
  return (
    <Card title="DATA RETENTION" icon={<Trash2 className="w-5 h-5 text-signal-yellow" />}>
      <p className="text-sm">
        Retention period: <b>{status?.days ?? "—"} days</b>. Past retention: <b>{status?.expired_scans ?? 0}</b> scans,{" "}
        <b>{status?.expired_incidents ?? 0}</b> resolved incidents.
      </p>
      {isAdmin && (
        <Button size="sm" variant="destructive" className="mt-3" onClick={purge} disabled={!status || status.expired_scans + status.expired_incidents === 0}>
          Purge expired records
        </Button>
      )}
    </Card>
  );
}

const settingsSchema = z.object({
  retention_days: z.number().int().min(7).max(3650),
  info_officer_name: z.string().trim().min(2).max(100),
  info_officer_email: z.string().trim().email().max(255),
  info_officer_phone: z.string().trim().min(5).max(30),
});

function SettingsForm({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [f, setF] = useState({
    retention_days: settings.retention_days,
    info_officer_name: settings.info_officer_name,
    info_officer_email: settings.info_officer_email,
    info_officer_phone: settings.info_officer_phone,
  });
  const save = async () => {
    const p = settingsSchema.safeParse(f);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const { error } = await supabase.rpc("admin_update_settings", {
      _retention: p.data.retention_days, _name: p.data.info_officer_name, _email: p.data.info_officer_email, _phone: p.data.info_officer_phone,
    });
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    onSaved();
  };
  return (
    <Card title="COMPLIANCE SETTINGS" icon={<Settings2 className="w-5 h-5 text-primary" />}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs">Retention (days)<input type="number" value={f.retention_days} onChange={(e) => setF({ ...f, retention_days: Number(e.target.value) })} className={inputCls} /></label>
        <label className="text-xs">Information Officer<input value={f.info_officer_name} onChange={(e) => setF({ ...f, info_officer_name: e.target.value })} className={inputCls} /></label>
        <label className="text-xs">Email<input value={f.info_officer_email} onChange={(e) => setF({ ...f, info_officer_email: e.target.value })} className={inputCls} /></label>
        <label className="text-xs">Phone<input value={f.info_officer_phone} onChange={(e) => setF({ ...f, info_officer_phone: e.target.value })} className={inputCls} /></label>
      </div>
      <Button size="sm" className="mt-3" onClick={save}>Save settings</Button>
    </Card>
  );
}

function Officers() {
  const [list, setList] = useState<(Profile & { role: AppRole })[]>([]);
  const load = useCallback(async () => {
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const top = (uid: string): AppRole => {
      const r = (rs ?? []).filter((x) => x.user_id === uid).map((x) => x.role);
      return r.includes("admin") ? "admin" : r.includes("supervisor") ? "supervisor" : "officer";
    };
    setList((ps ?? []).map((p) => ({ ...p, role: top(p.id) })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (id: string, approved: boolean, role: AppRole) => {
    const { error } = await supabase.rpc("admin_set_officer", { _user_id: id, _approved: approved, _role: role });
    if (error) return toast.error(error.message);
    toast.success("Officer updated");
    load();
  };

  return (
    <Card title="OFFICER ACCESS" icon={<UserCheck className="w-5 h-5 text-signal-green" />}>
      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
            <span>
              <span className="font-mono">{p.badge}</span> · {p.full_name} · {p.station}{" "}
              <span className={p.approved ? "text-signal-green" : "text-signal-yellow"}>{p.approved ? "ACTIVE" : "PENDING"}</span>
            </span>
            <div className="flex gap-2">
              <select value={p.role} onChange={(e) => update(p.id, p.approved, e.target.value as AppRole)} className="px-2 py-1 rounded border border-border bg-background text-xs" aria-label={`Role for ${p.badge}`}>
                <option value="officer">officer</option>
                <option value="supervisor">supervisor</option>
                <option value="admin">admin</option>
              </select>
              <Button size="sm" variant={p.approved ? "ghost" : "default"} onClick={() => update(p.id, !p.approved, p.role)}>
                {p.approved ? "Suspend" : "Approve"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
