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

          {/* Face landmark biometric overlay */}
          {scanning && <FaceLandmarkOverlay />}

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

                {/* Secondary inspection trigger */}
                {result.status === "invalid" && !secondaryOpen && (
                  <Button
                    onClick={() => setSecondaryOpen(true)}
                    variant="secondary"
                    size="sm"
                    className="w-full font-mono tracking-widest border-signal-yellow/40"
                  >
                    <Search className="w-4 h-4 mr-1" aria-hidden />
                    INITIATE SECONDARY INSPECTION
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Secondary inspection panel */}
          {needsInspection && (
            <div className="mt-4">
              <SecondaryInspection
                subject={result}
                station={station}
                operatorBadge={operatorBadge}
                onComplete={() => {
                  setSecondaryOpen(false);
                  setTimeout(() => {
                    setResult(null);
                    onStatusChange("idle");
                  }, 1500);
                }}
                onDismiss={() => setSecondaryOpen(false)}
              />
            </div>
          )}

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

// Biometric facial landmark overlay — simulated face-detection mesh
function FaceLandmarkOverlay() {
  // Landmark points roughly positioned on a face (percentages of container)
  const points: { x: number; y: number; delay: number }[] = [
    { x: 50, y: 28, delay: 0.1 },   // forehead center
    { x: 42, y: 33, delay: 0.15 },  // left eyebrow
    { x: 58, y: 33, delay: 0.2 },  // right eyebrow
    { x: 40, y: 42, delay: 0.25 },  // left eye outer
    { x: 46, y: 42, delay: 0.3 },   // left eye inner
    { x: 54, y: 42, delay: 0.35 },  // right eye inner
    { x: 60, y: 42, delay: 0.4 },   // right eye outer
    { x: 50, y: 50, delay: 0.45 },  // nose bridge
    { x: 50, y: 56, delay: 0.5 },   // nose tip
    { x: 38, y: 55, delay: 0.55 },  // left cheek
    { x: 62, y: 55, delay: 0.6 },   // right cheek
    { x: 42, y: 64, delay: 0.65 },  // left mouth corner
    { x: 50, y: 66, delay: 0.7 },   // mouth center
    { x: 58, y: 64, delay: 0.75 },  // right mouth corner
    { x: 50, y: 72, delay: 0.8 },   // chin
    { x: 30, y: 50, delay: 0.85 }, // left ear
    { x: 70, y: 50, delay: 0.9 },  // right ear
  ];

  // Mesh lines connecting key landmarks
  const lines: { x1: number; y1: number; x2: number; y2: number; delay: number }[] = [
    { x1: 42, y1: 33, x2: 58, y2: 33, delay: 0.3 },  // eyebrows
    { x1: 40, y1: 42, x2: 46, y2: 42, delay: 0.35 }, // left eye
    { x1: 54, y1: 42, x2: 60, y2: 42, delay: 0.4 }, // right eye
    { x1: 50, y1: 50, x2: 50, y2: 56, delay: 0.5 },  // nose
    { x1: 42, y1: 64, x2: 58, y2: 64, delay: 0.65 }, // mouth
    { x1: 38, y1: 55, x2: 62, y2: 55, delay: 0.55 }, // cheeks
    { x1: 30, y1: 50, x2: 70, y2: 50, delay: 0.85 }, // ear line
    { x1: 50, y1: 28, x2: 50, y2: 72, delay: 0.3 },  // vertical center
    { x1: 42, y1: 33, x2: 40, y2: 42, delay: 0.35 }, // brow to eye L
    { x1: 58, y1: 33, x2: 60, y2: 42, delay: 0.4 }, // brow to eye R
    { x1: 50, y1: 56, x2: 42, y2: 64, delay: 0.55 }, // nose to mouth L
    { x1: 50, y1: 56, x2: 58, y2: 64, delay: 0.6 }, // nose to mouth R
  ];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* Mesh lines */}
      {lines.map((l, i) => (
        <line
          key={`l-${i}`}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="oklch(0.78 0.22 145 / 0.5)"
          strokeWidth="0.3"
          className="face-landmark-line"
          style={{ animationDelay: `${l.delay}s` }}
        />
      ))}
      {/* Landmark dots */}
      {points.map((p, i) => (
        <circle
          key={`p-${i}`}
          cx={p.x}
          cy={p.y}
          r="0.8"
          fill="oklch(0.78 0.22 145)"
          className="face-landmark-dot face-landmark-pulse"
          style={{ animationDelay: `${p.delay}s` }}
        />
      ))}
      {/* Bounding box */}
      <rect
        x="28"
        y="22"
        width="44"
        height="56"
        rx="8"
        fill="none"
        stroke="oklch(0.78 0.22 145 / 0.4)"
        strokeWidth="0.3"
        strokeDasharray="2 1.5"
        className="face-landmark-line"
        style={{ animationDelay: "0.05s" }}
      />
    </svg>
  );
}
