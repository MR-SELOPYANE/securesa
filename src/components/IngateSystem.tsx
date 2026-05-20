import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, ScanFace, FileCheck2, FileX2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "./SignalLights";

interface Person {
  name: string;
  nationality: string;
  docId: string;
  status: "valid" | "invalid";
  reason: string;
}

const SAMPLE: Person[] = [
  { name: "Thandiwe Mokoena", nationality: "South Africa", docId: "ZA-8841-2207", status: "valid", reason: "Citizen ID verified" },
  { name: "Kwame Asante", nationality: "Ghana", docId: "GH-VISA-44102", status: "valid", reason: "Valid work visa, 2027" },
  { name: "Unknown Subject", nationality: "Unverified", docId: "—", status: "invalid", reason: "No matching document on file" },
  { name: "João Silva", nationality: "Mozambique", docId: "MZ-EXP-99812", status: "invalid", reason: "Travel permit expired 2024" },
  { name: "Aisha Bello", nationality: "Nigeria", docId: "NG-VISA-22018", status: "valid", reason: "Tourist visa valid 30 days" },
];

interface IngateSystemProps {
  onStatusChange: (s: SystemStatus) => void;
}

export function IngateSystem({ onStatusChange }: IngateSystemProps) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Person | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
          video: {
            facingMode: "user",
          },
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
    setTimeout(() => {
      const person = SAMPLE[Math.floor(Math.random() * SAMPLE.length)];
      setResult(person);
      setScanning(false);
      onStatusChange(person.status === "valid" ? "granted" : "denied");
    }, 2200);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/40">
        <div className="flex items-center gap-3">
          <ScanFace className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-bold tracking-wide">INGATE — Border Checkpoint</h2>
            <p className="text-xs text-muted-foreground">Face ID + Document Verification</p>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-primary/40 text-primary">
          STATION A-01
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 p-6">
        {/* Face scan window */}
        <div className="relative aspect-square rounded-xl border-2 border-border bg-background overflow-hidden grid-bg">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              cameraReady ? "opacity-100" : "opacity-0"
            )}
          />

          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 px-6 text-center">
              <div>
                <Fingerprint className="w-10 h-10 mx-auto mb-3 opacity-60 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {cameraError ?? "Starting camera feed…"}
                </p>
              </div>
            </div>
          )}

          {/* corner brackets */}
          {[
            "top-3 left-3 border-t-2 border-l-2",
            "top-3 right-3 border-t-2 border-r-2",
            "bottom-3 left-3 border-b-2 border-l-2",
            "bottom-3 right-3 border-b-2 border-r-2",
          ].map((c, i) => (
            <div key={i} className={cn("absolute w-8 h-8 border-primary", c)} />
          ))}

          <div className="absolute inset-0 flex items-center justify-center">
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

          {scanning && <div className="absolute inset-x-0 top-0 h-24 scan-line" />}

          <div className="absolute bottom-3 left-3 right-3 flex justify-between font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            <span>CAM 01 · {cameraReady ? "LIVE" : "OFFLINE"}</span>
            <span>{scanning ? "SCANNING…" : result ? "CAPTURE COMPLETE" : "READY"}</span>
          </div>
        </div>

        {/* Result panel */}
        <div className="flex flex-col">
          <div className="flex-1 rounded-xl border border-border bg-background/60 p-5 min-h-[280px]">
            {!result && !scanning && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <Fingerprint className="w-10 h-10 mb-3 opacity-60" />
                <p className="text-sm">Awaiting subject. Press SCAN to begin verification.</p>
              </div>
            )}
            {scanning && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" />
                <p className="font-mono text-sm uppercase tracking-widest">
                  Cross-referencing Home Affairs Database…
                </p>
              </div>
            )}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {result.status === "valid" ? (
                    <FileCheck2 className="w-7 h-7 text-signal-green" />
                  ) : (
                    <FileX2 className="w-7 h-7 text-signal-red" />
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
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Nationality" value={result.nationality} />
                  <Field label="Document ID" value={result.docId} />
                  <Field label="Match Score" value={result.status === "valid" ? "98.4%" : "—"} />
                  <Field label="Timestamp" value={new Date().toLocaleTimeString()} />
                </dl>

                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    Decision Reason
                  </div>
                  <p className="text-sm">{result.reason}</p>
                </div>
              </div>
            )}
          </div>

          <Button onClick={startScan} disabled={scanning} size="lg" className="mt-4 font-mono tracking-widest">
            {scanning ? "SCANNING…" : "INITIATE FACE SCAN"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <dl>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </dl>
  );
}
