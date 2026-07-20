import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plane, AlertTriangle, ShieldCheck, Radar, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "./SignalLights";
import { useDroneAlerts } from "@/lib/history";
import { beep } from "@/lib/alerts";

interface Contact {
  id: string;
  x: number;
  y: number;
  threat: "clear" | "suspect" | "hostile";
  label: string;
  zone: string;
}

// Real South African border sectors along common illegal-crossing corridors.
const ZONES = [
  "Beitbridge N (ZW)",
  "Musina Farmlands",
  "Kruger East Boundary",
  "Lebombo Approach (MZ)",
  "Lesotho Highlands",
  "Vioolsdrift Corridor (NA)",
  "Kosi Bay Dunes (MZ)",
  "Kopfontein West (BW)",
];

function randomContact(id: number): Contact {
  const r = Math.random();
  const threat: Contact["threat"] = r < 0.55 ? "clear" : r < 0.85 ? "suspect" : "hostile";
  const labels = {
    clear: "Wildlife / Patrol",
    suspect: "Unidentified Group",
    hostile: "Illegal Crossing",
  } as const;
  return {
    id: `T-${1000 + id}`,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    threat,
    label: labels[threat],
    zone: ZONES[Math.floor(Math.random() * ZONES.length)],
  };
}

interface DroneSurveillanceProps {
  onStatusChange: (s: SystemStatus) => void;
}

export function DroneSurveillance({ onStatusChange }: DroneSurveillanceProps) {
  const [active, setActive] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>(() =>
    Array.from({ length: 5 }, (_, i) => randomContact(i))
  );
  const [selected, setSelected] = useState<Contact | null>(null);
  const seenHostiles = useRef<Set<string>>(new Set());
  const { addAlert, alerts, markDispatched } = useDroneAlerts();

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setContacts((prev) => {
        const next = prev.map((c) => ({
          ...c,
          x: Math.max(5, Math.min(95, c.x + (Math.random() - 0.5) * 6)),
          y: Math.max(5, Math.min(95, c.y + (Math.random() - 0.5) * 6)),
        }));
        if (Math.random() < 0.3) {
          next.shift();
          next.push(randomContact(Date.now() % 10000));
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(t);
  }, [active]);

  // Auto-alert on newly-appeared hostile contacts.
  useEffect(() => {
    if (!active) return;
    contacts.forEach((c) => {
      if (c.threat === "hostile" && !seenHostiles.current.has(c.id)) {
        seenHostiles.current.add(c.id);
        addAlert({
          contactId: c.id,
          zone: c.zone,
          threat: "hostile",
          label: c.label,
          dispatched: false,
        });
        beep("hostile");
        toast.error(`HOSTILE CONTACT · ${c.id}`, {
          description: `${c.label} · ${c.zone}`,
        });
      }
    });
  }, [contacts, active, addAlert]);

  const handleSelect = (c: Contact) => {
    setSelected(c);
    if (c.threat === "hostile") onStatusChange("denied");
    else if (c.threat === "clear") onStatusChange("granted");
    else onStatusChange("idle");
  };

  const dispatchUnit = () => {
    if (!selected) return;
    // find the latest matching alert for this contact
    const alert = alerts.find((a) => a.contactId === selected.id && !a.dispatched);
    if (alert) markDispatched(alert.id);
    beep("info");
    toast.success(`Ground unit dispatched · ${selected.id}`, {
      description: `Border Patrol en route to ${selected.zone}`,
    });
  };

  const alreadyDispatched = selected
    ? alerts.some((a) => a.contactId === selected.id && a.dispatched)
    : false;

  const hostiles = contacts.filter((c) => c.threat === "hostile").length;
  const suspects = contacts.filter((c) => c.threat === "suspect").length;

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/40">
        <div className="flex items-center gap-3">
          <Plane className="w-5 h-5 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold tracking-wide">DRONE GRID — Perimeter Watch</h2>
            <p className="text-xs text-muted-foreground">Unauthorised crossing detection</p>
          </div>
        </div>
        <Button
          variant={active ? "secondary" : "default"}
          size="sm"
          onClick={() => {
            setActive((a) => !a);
            onStatusChange(active ? "off" : "idle");
          }}
          className="font-mono text-xs tracking-widest"
        >
          {active ? "DISARM" : "ARM SWARM"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 p-6">
        {/* Radar */}
        <div className="relative aspect-square rounded-full border-2 border-border bg-background overflow-hidden" aria-label="Drone radar">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-border/60"
              style={{ inset: `${i * 10}%` }}
              aria-hidden
            />
          ))}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border/60" aria-hidden />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-border/60" aria-hidden />

          {active && <div className="radar-sweep" aria-hidden />}

          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              aria-label={`Contact ${c.id}, ${c.threat}, ${c.zone}`}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full ring-4 ring-offset-0 transition-all",
                  c.threat === "hostile" && "bg-signal-red ring-signal-red/30 animate-pulse",
                  c.threat === "suspect" && "bg-signal-yellow ring-signal-yellow/30",
                  c.threat === "clear" && "bg-signal-green ring-signal-green/30",
                  selected?.id === c.id && "scale-150"
                )}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap">
                {c.id}
              </span>
            </button>
          ))}

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary ring-4 ring-primary/30">
            <Radar className="w-3 h-3 text-primary-foreground absolute inset-0 m-auto" aria-hidden />
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Drones" value="12" tone="neutral" />
            <Stat label="Suspect" value={String(suspects)} tone="warn" />
            <Stat label="Hostile" value={String(hostiles)} tone="alert" />
          </div>

          <div className="flex-1 rounded-xl border border-border bg-background/60 p-4 min-h-[200px]">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
              Contact Feed
            </div>
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {selected.threat === "hostile" ? (
                    <AlertTriangle className="w-5 h-5 text-signal-red" aria-hidden />
                  ) : selected.threat === "suspect" ? (
                    <AlertTriangle className="w-5 h-5 text-signal-yellow" aria-hidden />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-signal-green" aria-hidden />
                  )}
                  <span className="font-bold">{selected.id}</span>
                  <span
                    className={cn(
                      "ml-auto font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded",
                      selected.threat === "hostile" && "bg-signal-red/20 text-signal-red",
                      selected.threat === "suspect" && "bg-signal-yellow/20 text-signal-yellow",
                      selected.threat === "clear" && "bg-signal-green/20 text-signal-green"
                    )}
                  >
                    {selected.threat}
                  </span>
                </div>
                <div className="text-sm">{selected.label}</div>
                <div className="text-xs text-muted-foreground">Zone: {selected.zone}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  Coords: {selected.x.toFixed(1)}°, {selected.y.toFixed(1)}°
                </div>
                {selected.threat === "hostile" && (
                  <div className="space-y-2">
                    <div className="rounded border border-signal-red/40 bg-signal-red/10 p-2 text-xs">
                      Border Patrol notified. Awaiting ground unit dispatch.
                    </div>
                    <Button
                      size="sm"
                      onClick={dispatchUnit}
                      disabled={alreadyDispatched}
                      className="w-full font-mono text-xs tracking-widest bg-signal-red/90 hover:bg-signal-red text-white"
                    >
                      <Send className="w-3 h-3 mr-1" aria-hidden />
                      {alreadyDispatched ? "UNIT DISPATCHED" : "DISPATCH GROUND UNIT"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click any contact on the radar to inspect.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-3 max-h-40 overflow-auto">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Live Log
            </div>
            <ul className="space-y-1 font-mono text-[11px]">
              {contacts.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      c.threat === "hostile" && "bg-signal-red",
                      c.threat === "suspect" && "bg-signal-yellow",
                      c.threat === "clear" && "bg-signal-green"
                    )}
                    aria-hidden
                  />
                  <span className="text-muted-foreground">{c.id}</span>
                  <span className="truncate">{c.label}</span>
                  <span className="ml-auto text-muted-foreground">{c.zone.split(" ")[0]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "neutral" | "warn" | "alert" }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-center",
        tone === "neutral" && "border-border bg-background/60",
        tone === "warn" && "border-signal-yellow/40 bg-signal-yellow/10",
        tone === "alert" && "border-signal-red/40 bg-signal-red/10"
      )}
    >
      <div className="text-2xl font-bold font-mono">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}
