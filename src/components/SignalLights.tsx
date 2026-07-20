import { cn } from "@/lib/utils";

export type SystemStatus = "off" | "idle" | "granted" | "denied";

interface SignalLightsProps {
  status: SystemStatus;
}

export function SignalLights({ status }: SignalLightsProps) {
  const powerOn = status !== "off";
  // Yellow = current flowing / system powered. Always on while the tower has power.
  const yellowOn = powerOn;
  const greenOn = status === "granted";
  const redOn = status === "denied";

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Signal Tower
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {powerOn ? "ONLINE" : "OFFLINE"}
        </span>
      </div>

      <div className="flex flex-col items-center gap-5 py-4 px-6 rounded-xl bg-background/60 border border-border">
        <Light label="DENY" sublabel="Access Refused" on={redOn} variant="red" />
        <Light label="POWER" sublabel="Current Flowing" on={yellowOn} variant="yellow" />
        <Light label="GRANT" sublabel="Access Approved" on={greenOn} variant="green" />
        <div className="w-12 h-3 rounded-b-lg bg-gradient-to-b from-muted to-background border border-border mt-1" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] font-mono uppercase tracking-wider">
        <StatusBadge label="RED" active={redOn} color="signal-red" />
        <StatusBadge label="YEL" active={yellowOn} color="signal-yellow" />
        <StatusBadge label="GRN" active={greenOn} color="signal-green" />
      </div>
    </div>
  );
}

function Light({
  label,
  sublabel,
  on,
  variant,
}: {
  label: string;
  sublabel: string;
  on: boolean;
  variant: "red" | "yellow" | "green";
}) {
  return (
    <div className="flex items-center gap-4 w-full">
      <div
        className={cn(
          "signal-light w-16 h-16 shrink-0 border-4 border-background",
          on
            ? variant === "red"
              ? "signal-on-red"
              : variant === "yellow"
              ? "signal-on-yellow"
              : "signal-on-green"
            : "signal-off"
        )}
      />
      <div className="flex-1">
        <div className="font-mono text-sm font-bold tracking-widest text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{sublabel}</div>
      </div>
    </div>
  );
}

function StatusBadge({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <div
      className={cn(
        "rounded border px-2 py-1 text-center transition-colors",
        active
          ? "border-transparent text-background"
          : "border-border text-muted-foreground bg-background/40"
      )}
      style={active ? { backgroundColor: `var(--${color})` } : undefined}
    >
      {label} {active ? "1" : "0"}
    </div>
  );
}
