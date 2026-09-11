import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Lock, Unlock } from "lucide-react";
import { sirenLoop } from "@/lib/alerts";

interface LockdownOverlayProps {
  reason: string;
  onStandDown: () => void;
}

export function LockdownOverlay({ reason, onStandDown }: LockdownOverlayProps) {
  const stopSiren = useRef<(() => void) | null>(null);

  useEffect(() => {
    stopSiren.current = sirenLoop();
    return () => stopSiren.current?.();
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 lockdown-vignette flex items-center justify-center p-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-lg rounded-2xl border-2 border-signal-red bg-background/95 backdrop-blur p-8 text-center lockdown-panel">
        <div className="w-16 h-16 mx-auto rounded-full bg-signal-red/20 border border-signal-red flex items-center justify-center mb-4 lockdown-icon">
          <ShieldAlert className="w-8 h-8 text-signal-red" aria-hidden />
        </div>

        <div className="font-mono text-xs uppercase tracking-[0.3em] text-signal-red mb-2">
          Checkpoint Lockdown
        </div>
        <h2 className="text-2xl font-bold tracking-wide mb-2">ACCESS DENIED — BARRIER SEALED</h2>
        <p className="text-sm text-muted-foreground mb-6">{reason}</p>

        <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-xs">
          <div className="rounded-lg border border-signal-red/50 bg-signal-red/10 p-3">
            <Lock className="w-4 h-4 mx-auto mb-1 text-signal-red" aria-hidden />
            <div className="uppercase tracking-widest text-signal-red">Barrier</div>
            <div className="text-foreground mt-1">SEALED</div>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-signal-yellow" aria-hidden />
            <div className="uppercase tracking-widest text-muted-foreground">Supervisor</div>
            <div className="text-foreground mt-1">NOTIFIED</div>
          </div>
        </div>

        <Button
          size="lg"
          onClick={onStandDown}
          className="w-full font-mono tracking-widest bg-signal-red/90 hover:bg-signal-red text-white"
        >
          <Unlock className="w-4 h-4 mr-2" aria-hidden />
          SUPERVISOR OVERRIDE — STAND DOWN
        </Button>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Override is logged to the audit trail
        </p>
      </div>
    </div>
  );
}
