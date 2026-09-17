import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IdCard, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Operator } from "@/lib/operator";

const RANKS = ["Immigration Officer", "Senior Immigration Officer", "Border Guard", "Shift Supervisor"];

interface Props {
  onSignIn: (o: Omit<Operator, "shiftStart">) => void;
}

export function OperatorSignIn({ onSignIn }: Props) {
  const [badge, setBadge] = useState("");
  const [name, setName] = useState("");
  const [rank, setRank] = useState(RANKS[0]);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const b = badge.trim().toUpperCase();
    if (!/^[A-Z]{0,3}-?\d{4,6}$/.test(b) && b.length < 4) {
      setError("Badge ID must be at least 4 characters, e.g. BMA-4471.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter the officer name as it appears on the badge.");
      return;
    }
    onSignIn({ badge: b, name: name.trim(), rank });
  };

  return (
    <div className="fixed inset-0 z-40 bg-background flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-primary/30 bg-card/90 p-8 shadow-[0_0_60px_oklch(0.78_0.22_145/0.15)]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <IdCard className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="font-bold tracking-wide">OPERATOR SIGN-IN</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Shift authorisation required
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Badge ID">
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="BMA-4471"
              aria-label="Badge ID"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-sm uppercase tracking-widest outline-none focus:border-primary"
            />
          </Field>

          <Field label="Officer Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="N. Mokoena"
              aria-label="Officer name"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
            />
          </Field>

          <Field label="Rank">
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              aria-label="Rank"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
            >
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && (
          <p className="mt-4 text-sm text-signal-red" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full mt-6 font-mono tracking-widest">
          <ShieldCheck className="w-4 h-4 mr-2" aria-hidden />
          BEGIN SHIFT
        </Button>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          All scans and alerts are logged against this badge
        </p>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={cn("block")}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
