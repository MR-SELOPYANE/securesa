import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { IdCard, ShieldCheck, Clock, LogOut, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, type Profile } from "@/lib/auth";
import { STATIONS, RANKS } from "@/lib/stations";

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary";

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid work email").max(255),
  password: z.string().min(10, "Password must be at least 10 characters").max(128),
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  badge: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,4}-[0-9]{3,6}$/, "Badge format: 2–4 letters, dash, 3–6 digits (e.g. BMA-4471)"),
  rank: z.string().min(2),
  station: z.string().min(2),
});

function Shell({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 bg-background flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-card/90 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="font-bold tracking-wide">{title}</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Err({ msg }: { msg: string | null }) {
  return msg ? (
    <p className="mt-4 text-sm text-signal-red" role="alert">
      {msg}
    </p>
  ) : null;
}

/** Email + password sign-in / registration. */
export function OperatorSignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        await logEvent("auth.sign_in");
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Shell title="CHECK YOUR EMAIL" subtitle="Account verification" icon={<MailCheck className="w-5 h-5 text-primary" />}>
        <p className="text-sm leading-relaxed">
          We sent a confirmation link to <span className="font-mono">{email}</span>. Open it, then sign in here to
          complete your officer registration.
        </p>
        <Button className="w-full mt-6" variant="secondary" onClick={() => { setSent(false); setMode("in"); }}>
          Back to sign-in
        </Button>
      </Shell>
    );
  }

  return (
    <Shell
      title={mode === "in" ? "OPERATOR SIGN-IN" : "REQUEST OFFICER ACCESS"}
      subtitle="Authorised personnel only"
      icon={<IdCard className="w-5 h-5 text-primary" aria-hidden />}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Work email">
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} aria-label="Work email" />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            aria-label="Password"
          />
        </Field>
        <Err msg={error} />
        <Button type="submit" size="lg" disabled={busy} className="w-full font-mono tracking-widest">
          <ShieldCheck className="w-4 h-4 mr-2" aria-hidden />
          {mode === "in" ? "SIGN IN" : "CREATE ACCOUNT"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }}
        className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground underline"
      >
        {mode === "in" ? "New officer? Request access" : "Already registered? Sign in"}
      </button>
      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Sessions end after 15 min of inactivity · all actions are audited
      </p>
    </Shell>
  );
}

/** Shown once after first sign-in: link the account to a badge. */
export function OfficerRegistration({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const [form, setForm] = useState({ full_name: "", badge: "", rank: RANKS[0], station: STATIONS[0] });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.rpc("register_profile", {
      _full_name: parsed.data.full_name,
      _badge: parsed.data.badge,
      _rank: parsed.data.rank,
      _station: parsed.data.station,
    });
    setBusy(false);
    if (error) return setError(error.message.includes("duplicate") ? "That badge ID is already registered." : error.message);
    onDone();
  };

  return (
    <Shell title="OFFICER REGISTRATION" subtitle="Link your account to your badge" icon={<IdCard className="w-5 h-5 text-primary" />}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} aria-label="Full name" />
        </Field>
        <Field label="Badge ID">
          <input
            value={form.badge}
            onChange={(e) => setForm({ ...form, badge: e.target.value })}
            placeholder="BMA-4471"
            className={inputCls + " font-mono uppercase tracking-widest"}
            aria-label="Badge ID"
          />
        </Field>
        <Field label="Rank">
          <select value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} className={inputCls} aria-label="Rank">
            {RANKS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Home station">
          <select value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} className={inputCls} aria-label="Home station">
            {STATIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Err msg={error} />
        <Button type="submit" size="lg" disabled={busy} className="w-full font-mono tracking-widest">SUBMIT FOR APPROVAL</Button>
      </form>
      <Button variant="ghost" size="sm" onClick={onSignOut} className="w-full mt-3"><LogOut className="w-4 h-4 mr-1" /> Sign out</Button>
    </Shell>
  );
}

export function PendingApproval({ profile, onRefresh, onSignOut }: { profile: Profile; onRefresh: () => void; onSignOut: () => void }) {
  return (
    <Shell title="AWAITING APPROVAL" subtitle={`${profile.badge} · ${profile.station}`} icon={<Clock className="w-5 h-5 text-signal-yellow" />}>
      <p className="text-sm leading-relaxed">
        Your registration has been received. An administrator must verify your badge before you can access the
        system. This protects travellers' personal information under POPIA.
      </p>
      <div className="flex gap-2 mt-6">
        <Button className="flex-1" onClick={onRefresh}>Check again</Button>
        <Button variant="ghost" onClick={onSignOut}><LogOut className="w-4 h-4 mr-1" /> Sign out</Button>
      </div>
    </Shell>
  );
}
