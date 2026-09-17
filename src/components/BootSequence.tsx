import { useEffect, useRef, useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const BOOT_LINES = [
  "SENTRY-ZA KERNEL v1.1.0 — INITIALISING",
  "RSA HOME AFFAIRS SECURE CHANNEL ......... OK",
  "AES-256 LINK ESTABLISHED",
  "SIGNAL TOWER ARRAY ...................... OK",
  "BIOMETRIC ENGINE (FACE-ID) .............. OK",
  "HOME AFFAIRS DATABASE LINK .............. OK",
  "DRONE SWARM UPLINK (12 UNITS) ........... OK",
  "PERIMETER SENSORS (8 SECTORS) ........... OK",
  "CAMERA WALL (4 FEEDS) ................... OK",
  "ALL SYSTEMS NOMINAL",
];

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [lineCount, setLineCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    const lineTimer = setInterval(() => {
      setLineCount((n) => {
        if (n >= BOOT_LINES.length) {
          clearInterval(lineTimer);
          return n;
        }
        return n + 1;
      });
    }, 260);

    const progTimer = setInterval(() => {
      setProgress((p) => Math.min(100, p + Math.random() * 9));
    }, 140);

    return () => {
      clearInterval(lineTimer);
      clearInterval(progTimer);
    };
  }, []);

  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (lineCount >= BOOT_LINES.length && !done.current) {
      done.current = true;
      setProgress(100);
      setTimeout(() => setFading(true), 700);
      setTimeout(() => completeRef.current(), 1400);
    }
  }, [lineCount]);


  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background flex items-center justify-center transition-opacity duration-700",
        fading && "opacity-0 pointer-events-none"
      )}
      aria-hidden={fading}
    >
      <div className="w-full max-w-xl px-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center boot-emblem">
            <Shield className="w-6 h-6 text-primary" aria-hidden />
          </div>
          <div>
            <div className="font-bold text-xl tracking-[0.3em]">SENTRY-ZA</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Border Integrity Command
            </div>
          </div>
        </div>

        <div className="font-mono text-xs space-y-1.5 min-h-[220px]">
          {BOOT_LINES.slice(0, lineCount).map((line, i) => (
            <div
              key={i}
              className={cn(
                "boot-line",
                i === BOOT_LINES.length - 1 ? "text-signal-green font-bold" : "text-muted-foreground"
              )}
            >
              <span className="text-primary mr-2">▸</span>
              {line}
            </div>
          ))}
          {lineCount < BOOT_LINES.length && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse" aria-hidden />
          )}
        </div>

        <div className="mt-6">
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            <span>System Check</span>
            <span>{Math.floor(progress)}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
