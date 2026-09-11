import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Moon, Sun, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { beep } from "@/lib/alerts";

interface Feed {
  id: string;
  name: string;
  location: string;
}

const FEEDS: Feed[] = [
  { id: "CAM-01", name: "Ingate Lane A", location: "Beitbridge" },
  { id: "CAM-02", name: "Fence Line N", location: "Musina" },
  { id: "CAM-03", name: "River Crossing", location: "Limpopo" },
  { id: "CAM-04", name: "Vehicle Bay", location: "Lebombo" },
];

interface MotionEvent {
  feed: string;
  ts: number;
}

export function CameraGrid() {
  const [nightVision, setNightVision] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [motionFeed, setMotionFeed] = useState<string | null>(null);
  const [events, setEvents] = useState<MotionEvent[]>([]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Simulated motion-detection events
  useEffect(() => {
    const schedule = () => {
      const delay = 6000 + Math.random() * 9000;
      return setTimeout(() => {
        const feed = FEEDS[Math.floor(Math.random() * FEEDS.length)];
        setMotionFeed(feed.id);
        setEvents((prev) => [{ feed: feed.id, ts: Date.now() }, ...prev].slice(0, 6));
        beep("info");
        toast.warning(`MOTION DETECTED · ${feed.id}`, {
          description: `${feed.name} · ${feed.location}`,
        });
        setTimeout(() => setMotionFeed(null), 3500);
        timer = schedule();
      }, delay);
    };
    let timer = schedule();
    return () => clearTimeout(timer);
  }, []);

  const ts = clock.toLocaleTimeString("en-ZA", { hour12: false });

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/40">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold tracking-wide">CAMERA WALL — Perimeter Feeds</h2>
            <p className="text-xs text-muted-foreground">4 feeds · motion detection armed</p>
          </div>
        </div>
        <Button
          variant={nightVision ? "default" : "secondary"}
          size="sm"
          onClick={() => setNightVision((v) => !v)}
          className="font-mono text-xs tracking-widest"
          aria-pressed={nightVision}
        >
          {nightVision ? <Moon className="w-3 h-3 mr-1" aria-hidden /> : <Sun className="w-3 h-3 mr-1" aria-hidden />}
          {nightVision ? "NVG ON" : "NVG OFF"}
        </Button>
      </div>

      <div className="p-6">
        <div className="grid sm:grid-cols-2 gap-4">
          {FEEDS.map((feed) => (
            <div
              key={feed.id}
              className={cn(
                "relative aspect-video rounded-xl border overflow-hidden cam-noise",
                motionFeed === feed.id ? "border-signal-red" : "border-border",
                nightVision && "cam-nvg"
              )}
              aria-label={`${feed.name} camera feed`}
            >
              {/* HUD overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-signal-red animate-pulse" aria-hidden />
                  <span className="font-mono text-[10px] tracking-widest text-foreground/90">
                    {feed.id} · REC
                  </span>
                </div>
                <div className="absolute top-2 right-2 font-mono text-[10px] tracking-widest text-foreground/90">
                  {ts}
                </div>
                <div className="absolute bottom-2 left-2 font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                  {feed.name} — {feed.location}
                </div>
                <div className="absolute bottom-2 right-2 font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                  {nightVision ? "NVG · IR" : "OPTICAL"}
                </div>

                {/* crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" aria-hidden>
                  <div className="w-8 h-px bg-foreground absolute -left-4" />
                  <div className="h-8 w-px bg-foreground absolute -top-4" />
                </div>

                {motionFeed === feed.id && (
                  <div className="absolute inset-0 border-2 border-signal-red cam-motion-alert flex items-start justify-center pt-8" aria-hidden>
                    <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest bg-signal-red/90 text-white px-3 py-1 rounded">
                      <AlertTriangle className="w-3 h-3" aria-hidden />
                      Motion Detected
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Motion Event Log
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No motion events yet. Sensors armed.</p>
          ) : (
            <ul className="space-y-1 font-mono text-[11px]">
              {events.map((e, i) => (
                <li key={`${e.ts}-${i}`} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-yellow" aria-hidden />
                  <span className="text-muted-foreground">
                    {new Date(e.ts).toLocaleTimeString("en-ZA", { hour12: false })}
                  </span>
                  <span>{e.feed}</span>
                  <span className="text-muted-foreground">motion detected</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
