import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileSearch,
  Fingerprint,
  ClipboardList,
  Gavel,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { beep } from "@/lib/alerts";
import type { Traveller } from "@/lib/roster";

type Step = "document" | "fingerprint" | "interview" | "disposition";
type Disposition = "detain" | "release" | "refer_saps";

const STEPS: { key: Step; label: string; icon: typeof FileSearch }[] = [
  { key: "document", label: "Document Re-Check", icon: FileSearch },
  { key: "fingerprint", label: "Fingerprint Capture", icon: Fingerprint },
  { key: "interview", label: "Interview Notes", icon: ClipboardList },
  { key: "disposition", label: "Disposition", icon: Gavel },
];

const DISPOSITIONS: { key: Disposition; label: string; tone: string; desc: string }[] = [
  { key: "detain", label: "DETAIN", tone: "bg-signal-red/90 text-white hover:bg-signal-red", desc: "Subject held for immigration processing" },
  { key: "release", label: "RELEASE", tone: "bg-signal-green/90 text-white hover:bg-signal-green", desc: "Subject released — no grounds for holding" },
  { key: "refer_saps", label: "REFER TO SAPS", tone: "bg-primary/90 text-primary-foreground hover:bg-primary", desc: "Handover to South African Police Service" },
];

interface Props {
  subject: Traveller;
  station: string;
  operatorBadge: string;
  onComplete: (d: Disposition) => void;
  onDismiss: () => void;
}

export function SecondaryInspection({ subject, station, operatorBadge, onComplete, onDismiss }: Props) {
  const [step, setStep] = useState<Step>("document");
  const [docVerified, setDocVerified] = useState(false);
  const [fpScanning, setFpScanning] = useState(false);
  const [fpDone, setFpDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [disposition, setDisposition] = useState<Disposition | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const verifyDoc = () => {
    setDocVerified(true);
    beep("info");
    setTimeout(() => setStep("fingerprint"), 600);
  };

  const startFp = () => {
    setFpScanning(true);
    beep("info");
    setTimeout(() => {
      setFpScanning(false);
      setFpDone(true);
      setStep("interview");
    }, 2200);
  };

  const submitDisposition = (d: Disposition) => {
    setDisposition(d);
    beep(d === "release" ? "granted" : "denied");
    toast.success(`SECONDARY INSPECTION COMPLETE`, {
      description: `${subject.name} → ${DISPOSITIONS.find((x) => x.key === d)?.label} · ${operatorBadge}`,
    });
    onComplete(d);
  };

  return (
    <div className="rounded-xl border-2 border-signal-yellow/50 bg-signal-yellow/5 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-signal-yellow/10 border-b border-signal-yellow/30">
        <ShieldAlert className="w-5 h-5 text-signal-yellow" aria-hidden />
        <div className="flex-1">
          <div className="font-mono text-sm font-bold tracking-widest text-signal-yellow">
            SECONDARY INSPECTION
          </div>
          <div className="text-xs text-muted-foreground">
            {subject.name} · {subject.docId} · {station}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          aria-label="Cancel secondary inspection"
        >
          ✕ CANCEL
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 px-5 py-3 border-b border-border">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-colors",
                  active && "bg-primary text-primary-foreground",
                  done && "text-signal-green",
                  !active && !done && "text-muted-foreground"
                )}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="p-5 min-h-[160px]">
        {step === "document" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Document Type" value={subject.docType} />
              <Field label="Document ID" value={subject.docId} />
              <Field label="Nationality" value={subject.nationality} />
              <Field label="Biometric Match" value={`${subject.matchScore.toFixed(1)}%`} />
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
              <span className="font-mono uppercase tracking-widest text-muted-foreground">Flag: </span>
              <span className="text-foreground">{subject.reason}</span>
            </div>
            <Button onClick={verifyDoc} disabled={docVerified} size="sm" className="w-full font-mono tracking-widest">
              {docVerified ? (
                <><CheckCircle2 className="w-4 h-4 mr-1" /> DOCUMENT VERIFIED</>
              ) : (
                <><FileSearch className="w-4 h-4 mr-1" /> VERIFY DOCUMENT</>
              )}
            </Button>
          </div>
        )}

        {step === "fingerprint" && (
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <div className="relative w-24 h-24">
              <div
                className={cn(
                  "absolute inset-0 rounded-full border-2 transition-colors",
                  fpDone ? "border-signal-green" : fpScanning ? "border-primary animate-pulse" : "border-border"
                )}
              />
              {fpScanning && (
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="scan-line" aria-hidden />
                </div>
              )}
              <Fingerprint
                className={cn(
                  "absolute inset-0 m-auto w-12 h-12 transition-colors",
                  fpDone ? "text-signal-green" : fpScanning ? "text-primary animate-pulse" : "text-muted-foreground"
                )}
                aria-hidden
              />
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground text-center">
              {fpDone ? "FINGERPRINT CAPTURED · AFIS MATCH CONFIRMED" : fpScanning ? "SCANNING FINGERPRINT…" : "PRESS TO CAPTURE FINGERPRINT"}
            </p>
            <Button onClick={startFp} disabled={fpScanning || fpDone} size="sm" className="font-mono tracking-widest">
              {fpScanning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> SCANNING…</> : <><Fingerprint className="w-4 h-4 mr-1" /> CAPTURE</>}
            </Button>
          </div>
        )}

        {step === "interview" && (
          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Operator Interview Notes · {operatorBadge}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record subject statement, inconsistencies, observations…"
              rows={4}
              aria-label="Interview notes"
              className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary resize-none"
            />
            <Button onClick={() => setStep("disposition")} size="sm" className="w-full font-mono tracking-widest">
              <ChevronRight className="w-4 h-4 mr-1" /> PROCEED TO DISPOSITION
            </Button>
          </div>
        )}

        {step === "disposition" && (
          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Select Disposition
            </div>
            {DISPOSITIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => submitDisposition(d.key)}
                disabled={!!disposition}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-all",
                  disposition === d.key ? d.tone + " border-transparent" : "bg-background/60 hover:bg-accent",
                  disposition && disposition !== d.key && "opacity-40"
                )}
              >
                <Gavel className="w-4 h-4 shrink-0" aria-hidden />
                <div>
                  <div className="font-mono text-sm font-bold tracking-widest">{d.label}</div>
                  <div className={cn("text-xs", disposition === d.key ? "opacity-80" : "text-muted-foreground")}>
                    {d.desc}
                  </div>
                </div>
                {disposition === d.key && <CheckCircle2 className="w-5 h-5 ml-auto" />}
              </button>
            ))}
            {disposition && (
              <div className="rounded-lg border border-signal-green/40 bg-signal-green/10 p-3 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-signal-green">
                  ✓ Inspection logged · {operatorBadge} · {new Date().toLocaleTimeString("en-ZA", { hour12: false })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}
