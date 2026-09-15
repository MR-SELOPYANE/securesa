import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SignalLights, type SystemStatus } from "@/components/SignalLights";
import { IngateSystem } from "@/components/IngateSystem";
import { DroneSurveillance } from "@/components/DroneSurveillance";
import { CameraGrid } from "@/components/CameraGrid";
import { ScanHistory } from "@/components/ScanHistory";
import { IncidentBoard } from "@/components/IncidentBoard";
import { OperatorStats } from "@/components/OperatorStats";
import { OperatorSignIn } from "@/components/OperatorSignIn";
import { BootSequence } from "@/components/BootSequence";
import { LockdownOverlay } from "@/components/LockdownOverlay";
import { Shield, Power, Maximize2, Minimize2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOperator, useClock, formatElapsed, jhbTime, jhbDate } from "@/lib/operator";


export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SENTRY-ZA — Border Integrity System" },
      {
        name: "description",
        content:
          "SENTRY-ZA: integrated border control with face-ID checkpoints and drone perimeter surveillance for South Africa.",
      },
    ],
  }),
});

type Module = "ingate" | "drone" | "cameras" | "incidents" | "history";

function Index() {
  const [booted, setBooted] = useState(false);
  const [systemOn, setSystemOn] = useState(true);
  const [module, setModule] = useState<Module>("ingate");
  const [status, setStatus] = useState<SystemStatus>("idle");
  const [kiosk, setKiosk] = useState(false);
  const [lockdown, setLockdown] = useState<string | null>(null);
  const { operator, loaded, signIn, signOut } = useOperator();
  const now = useClock();
  const badge = operator?.badge ?? "UNASSIGNED";

  const effectiveStatus: SystemStatus = systemOn ? status : "off";


  const handleStatusChange = useCallback(
    (s: SystemStatus) => {
      setStatus(s);
      if (s === "denied" && module === "ingate") {
        setLockdown("Unauthorised entry attempt at ingate checkpoint. Perimeter barrier sealed pending supervisor review.");
      }
    },
    [module]
  );

  const standDown = () => {
    setLockdown(null);
    setStatus("idle");
    toast.success("LOCKDOWN LIFTED", {
      description: "Supervisor override accepted · logged to audit trail",
    });
  };

  const toggleKiosk = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setKiosk(true);
      } else {
        await document.exitFullscreen();
        setKiosk(false);
      }
    } catch {
      setKiosk((k) => !k);
    }
  };

  useEffect(() => {
    const onChange = () => setKiosk(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <main className="min-h-dvh">
      {!booted && <BootSequence onComplete={() => setBooted(true)} />}
      {booted && loaded && !operator && (
        <OperatorSignIn
          onSignIn={(o) => {
            signIn(o);
            toast.success(`SHIFT STARTED · ${o.badge}`, { description: `${o.name} · ${o.rank}` });
          }}
        />
      )}
      {lockdown && <LockdownOverlay reason={lockdown} onStandDown={standDown} />}


      {/* SA flag accent stripe */}
      <div className="h-1 w-full flex" aria-hidden>
        <span className="flex-1" style={{ backgroundColor: "var(--sa-green)" }} />
        <span className="flex-1" style={{ backgroundColor: "var(--sa-gold)" }} />
        <span className="flex-1" style={{ backgroundColor: "var(--sa-blue)" }} />
        <span className="flex-1 bg-signal-red" />
        <span className="flex-1 bg-foreground" />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="font-bold tracking-wide leading-tight">SENTRY-ZA</h1>
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-widest">
                Border Integrity Command
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Ops clock */}
            <div className="hidden sm:block text-right leading-tight">
              <div className="font-mono text-sm tracking-widest text-primary">{jhbTime(now)}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {jhbDate(now)} · SAST
              </div>
            </div>

            {/* Operator + shift */}
            {operator && (
              <div className="hidden md:block rounded-lg border border-border bg-background/60 px-3 py-1.5 leading-tight">
                <div className="font-mono text-[11px] tracking-widest">
                  {operator.badge} · {operator.name}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Shift {formatElapsed(operator.shiftStart, now.getTime())} · {operator.rank}
                </div>
              </div>
            )}

            {operator && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  signOut();
                  toast.message("SHIFT ENDED", { description: `${operator.badge} signed out` });
                }}
                aria-label="End shift and sign out"
                className="font-mono tracking-widest"
              >
                <LogOut className="w-4 h-4" aria-hidden />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleKiosk}
              aria-label={kiosk ? "Exit kiosk mode" : "Enter kiosk mode"}
              className="font-mono tracking-widest"
            >
              {kiosk ? <Minimize2 className="w-4 h-4" aria-hidden /> : <Maximize2 className="w-4 h-4" aria-hidden />}
            </Button>
            <Button
              variant={systemOn ? "secondary" : "default"}
              size="sm"
              onClick={() => {
                setSystemOn((s) => !s);
                setStatus(systemOn ? "off" : "idle");
              }}
              className="font-mono tracking-widest"
              aria-label={systemOn ? "Power off system" : "Power on system"}
            >
              <Power className="w-4 h-4 mr-1" aria-hidden />
              {systemOn ? "POWER OFF" : "POWER ON"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main panel */}
        <div className="space-y-6">
          {/* Module switcher */}
          <div className="inline-flex flex-wrap rounded-xl border border-border bg-card p-1" role="tablist">
            <ModuleTab active={module === "ingate"} onClick={() => setModule("ingate")}>
              Ingate Checkpoint
            </ModuleTab>
            <ModuleTab active={module === "drone"} onClick={() => setModule("drone")}>
              Drone Perimeter
            </ModuleTab>
            <ModuleTab active={module === "cameras"} onClick={() => setModule("cameras")}>
              Camera Wall
            </ModuleTab>
            <ModuleTab active={module === "history"} onClick={() => setModule("history")}>
              History
            </ModuleTab>
          </div>

          {!systemOn ? (
            <div className="rounded-2xl border border-border bg-card/60 p-16 text-center">
              <Power className="w-10 h-10 mx-auto text-muted-foreground mb-4" aria-hidden />
              <p className="font-mono uppercase tracking-widest text-muted-foreground">
                System offline. Power on to begin operations.
              </p>
            </div>
          ) : module === "ingate" ? (
            <IngateSystem onStatusChange={handleStatusChange} />
          ) : module === "drone" ? (
            <DroneSurveillance onStatusChange={handleStatusChange} />
          ) : module === "cameras" ? (
            <CameraGrid />
          ) : (
            <ScanHistory />
          )}

          {/* Mission strip */}
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Mission
            </div>
            <p className="text-sm leading-relaxed">
              SENTRY-ZA reduces illegal immigration by combining biometric verification at official
              ports of entry with autonomous drone surveillance along unguarded stretches of the
              border. Lawful travellers pass quickly; unauthorised crossings are flagged in
              real time.
            </p>
          </div>
        </div>

        {/* Side: signal tower + status + stats */}
        <aside className="space-y-6">
          <SignalLights status={effectiveStatus} />

          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-5">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Current State
            </h3>
            <StatusRow label="System" value={systemOn ? "ARMED" : "OFFLINE"} on={systemOn} />
            <StatusRow
              label="Decision"
              value={
                effectiveStatus === "granted"
                  ? "ACCESS GRANTED"
                  : effectiveStatus === "denied"
                  ? "ACCESS DENIED"
                  : effectiveStatus === "idle"
                  ? "STANDBY"
                  : "—"
              }
              tone={
                effectiveStatus === "granted"
                  ? "green"
                  : effectiveStatus === "denied"
                  ? "red"
                  : "neutral"
              }
            />
            <StatusRow
              label="Module"
              value={
                module === "ingate"
                  ? "INGATE"
                  : module === "drone"
                  ? "DRONE GRID"
                  : module === "cameras"
                  ? "CAM WALL"
                  : "HISTORY"
              }
              on
            />
          </div>

          <OperatorStats />
        </aside>
      </div>

      <footer className="border-t border-border mt-8 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>SENTRY-ZA v1.1 · Prototype</span>
          <span>Secure channel · AES-256</span>
        </div>
      </footer>
    </main>
  );
}

function ModuleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-widest transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function StatusRow({
  label,
  value,
  on,
  tone = "neutral",
}: {
  label: string;
  value: string;
  on?: boolean;
  tone?: "neutral" | "green" | "red";
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-xs tracking-widest",
          tone === "green" && "text-signal-green",
          tone === "red" && "text-signal-red",
          tone === "neutral" && (on ? "text-foreground" : "text-muted-foreground")
        )}
      >
        {value}
      </span>
    </div>
  );
}
