import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, ScanFace, FileCheck2, FileX2, Loader2, ShieldAlert, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "./SignalLights";
import { useScanHistory } from "@/lib/history";
import { beep } from "@/lib/alerts";
import { generateTraveller, CATEGORY_LABEL, type Traveller } from "@/lib/roster";
import { SecondaryInspection } from "./SecondaryInspection";

const STATIONS = [
  "Beitbridge (ZW)",
  "Lebombo (MZ)",
  "Maseru Bridge (LS)",
  "Ficksburg Bridge (LS)",
  "Oshoek (SZ)",
  "Kopfontein (BW)",
  "Vioolsdrift (NA)",
  "Kosi Bay (MZ)",
];

interface IngateSystemProps {
  onStatusChange: (s: SystemStatus) => void;
  operatorBadge?: string;
}

export function IngateSystem({ onStatusChange, operatorBadge = "UNASSIGNED" }: IngateSystemProps) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Traveller | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [station, setStation] = useState<string>(STATIONS[0]);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { addScan } = useScanHistory();

  const needsInspection = result && result.status === "invalid" && secondaryOpen;


  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera not supported in this browser.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
        setCameraError(null);
      } catch {
        if (!cancelled) {
          setCameraError("Camera permission denied or unavailable.");
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startScan = () => {
    setScanning(true);
    setResult(null);
    onStatusChange("idle");
    // Scan duration varies like a real capture.
    const duration = 1600 + Math.random() * 1600;
    setTimeout(() => {
      const person = generateTraveller();
      setResult(person);
      setScanning(false);
      const outcome = person.status === "valid" ? "granted" : "denied";
      onStatusChange(outcome);

      addScan({
        name: person.name,
        nationality: person.nationality,
        docId: person.docId,
        outcome,
        reason: person.reason,
        station,
        operator: operatorBadge,
        matchScore: person.matchScore,
        category: CATEGORY_LABEL[person.category],
      });

      beep(outcome);
      if (outcome === "granted") {
        toast.success(`ACCESS GRANTED · ${person.name}`, {
          description: `${person.nationality} · ${station} · ${person.matchScore.toFixed(1)}% match`,
        });
      } else {
        toast.error(`ACCESS DENIED · ${person.name}`, {
          description: `${person.reason} · ${station}`,
        });
      }
    }, duration);
  };


  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border bg-background/40">
        <div className="flex items-center gap-3">
          <ScanFace className="w-5 h-5 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold tracking-wide">INGATE — Border Checkpoint</h2>
            <p className="text-xs text-muted-foreground">Face ID + Document Verification</p>
          </div>
        </div>
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="hidden sm:inline">Station</span>
          <select
            value={station}
            onChange={(e) => setStation(e.target.value)}
            aria-label="Border station"
            className="bg-background border border-primary/40 text-primary rounded px-2 py-1 font-mono text-[11px]"
          >
            {STATIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-6 p-6">
        {/* Face scan window */}
        <div className="relative aspect-square rounded-xl border-2 border-border bg-background overflow-hidden grid-bg">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Live camera preview"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              cameraReady ? "opacity-100" : "opacity-0"
            )}
          />

          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 px-6 text-center">
              <div>
                <Fingerprint className="w-10 h-10 mx-auto mb-3 opacity-60 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  {cameraError ?? "Starting camera feed…"}
                </p>
              </div>
            </div>
          )}

          {[
            "top-3 left-3 border-t-2 border-l-2",
            "top-3 right-3 border-t-2 border-r-2",
            "bottom-3 left-3 border-b-2 border-l-2",
            "bottom-3 right-3 border-b-2 border-r-2",
          ].map((c, i) => (
            <div key={i} className={cn("absolute w-8 h-8 border-primary", c)} aria-hidden />
          ))}

          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <div
              className={cn(
                "w-48 h-56 rounded-[40%] border-2 border-dashed transition-colors",
                scanning
                  ? "border-primary"
                  : result?.status === "valid"
                  ? "border-signal-green"
                  : result?.status === "invalid"
                  ? "border-signal-red"
                  : "border-muted-foreground/40"
              )}
            />
          </div>

          {scanning && <div className="absolute inset-x-0 top-0 h-24 scan-line" aria-hidden />}

          <div className="absolute bottom-3 left-3 right-3 flex justify-between font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            <span>CAM 01 · {cameraReady ? "LIVE" : "OFFLINE"}</span>
            <span aria-live="polite">{scanning ? "SCANNING…" : result ? "CAPTURE COMPLETE" : "READY"}</span>
          </div>
        </div>

        {/* Result panel */}
        <div className="flex flex-col">
          <div
            className="flex-1 rounded-xl border border-border bg-background/60 p-5 min-h-[280px]"
            aria-live="polite"
          >
            {!result && !scanning && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <Fingerprint className="w-10 h-10 mb-3 opacity-60" aria-hidden />
                <p className="text-sm">Awaiting subject. Press SCAN to begin verification.</p>
              </div>
            )}
            {scanning && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" aria-hidden />
                <p className="font-mono text-sm uppercase tracking-widest">
                  Cross-referencing Home Affairs Database…
                </p>
              </div>
            )}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {result.status === "valid" ? (
                    <FileCheck2 className="w-7 h-7 text-signal-green" aria-hidden />
                  ) : (
                    <FileX2 className="w-7 h-7 text-signal-red" aria-hidden />
                  )}
                  <div>
                    <div
                      className={cn(
                        "font-mono text-xs uppercase tracking-widest",
                        result.status === "valid" ? "text-signal-green" : "text-signal-red"
                      )}
                    >
                      {result.status === "valid" ? "ACCESS GRANTED" : "ACCESS DENIED"}
                    </div>
                    <div className="text-lg font-bold">{result.name}</div>
                  </div>
                  <span
                    className={cn(
                      "ml-auto font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border",
                      result.category === "flagged"
                        ? "border-signal-red/50 bg-signal-red/15 text-signal-red"
                        : result.status === "valid"
                        ? "border-signal-green/40 bg-signal-green/10 text-signal-green"
                        : "border-signal-yellow/40 bg-signal-yellow/10 text-signal-yellow"
                    )}
                  >
                    {CATEGORY_LABEL[result.category]}
                  </span>
                </div>

                {result.watchlist && (
                  <div className="flex items-center gap-2 rounded-lg border border-signal-red/50 bg-signal-red/10 p-3">
                    <ShieldAlert className="w-4 h-4 text-signal-red shrink-0" aria-hidden />
                    <span className="font-mono text-[11px] uppercase tracking-widest text-signal-red">
                      Watchlist hit — detain and notify SAPS
                    </span>
                  </div>
                )}

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Nationality" value={result.nationality} />
                  <Field label="Document" value={result.docType} />
                  <Field label="Document ID" value={result.docId} />
                  <Field label="Age / Sex" value={`${result.age} · ${result.sex}`} />
                  <Field label="Station" value={station} />
                  <Field label="Operator" value={operatorBadge} />
                </dl>

                <div>
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    <span>Biometric Match</span>
                    <span
                      className={cn(
                        result.matchScore >= 90
                          ? "text-signal-green"
                          : result.matchScore >= 70
                          ? "text-signal-yellow"
                          : "text-signal-red"
                      )}
                    >
                      {result.matchScore.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        result.matchScore >= 90
                          ? "bg-signal-green"
                          : result.matchScore >= 70
                          ? "bg-signal-yellow"
                          : "bg-signal-red"
                      )}
                      style={{ width: `${Math.min(100, result.matchScore)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    Decision Reason
                  </div>
                  <p className="text-sm">{result.reason}</p>
                </div>

              </div>
            )}
          </div>

          <Button
            onClick={startScan}
            disabled={scanning}
            size="lg"
            className="mt-4 font-mono tracking-widest"
            aria-label="Initiate face scan"
          >
            {scanning ? "SCANNING…" : "INITIATE FACE SCAN"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
