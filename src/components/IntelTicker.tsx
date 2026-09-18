import { useEffect, useState } from "react";

interface IntelMsg {
  id: number;
  text: string;
  tone: "info" | "warn" | "alert";
}

const TEMPLATES: { text: string; tone: IntelMsg["tone"] }[] = [
  { text: "SIGINT — Beitbridge corridor: 3 subjects moving south on foot, ETA fence line 40min", tone: "warn" },
  { text: "DRONE-07 battery 78%, returning to base Musina for recharge cycle", tone: "info" },
  { text: "SAPS Musina: 12 arrests overnight, Operation Hard Rail continues", tone: "info" },
  { text: "HOME AFFAIRS — 15 fraudulent visas intercepted at Lebombo, syndicate flag raised", tone: "alert" },
  { text: "INTEL — Smuggling route identified near Kosi Bay dunes, drone surveillance increased", tone: "warn" },
  { text: "BORDER PATROL Unit 3 responding to T-1047, ETA 8 minutes", tone: "info" },
  { text: "INTERPOL — Red notice subject flagged at Ficksburg Bridge, detain on sight", tone: "alert" },
  { text: "DRONE-04 thermal anomaly detected, Lesotho Highlands sector, investigating", tone: "warn" },
  { text: "VIOOLSDRIFT — River crossing activity below seasonal average, no threats", tone: "info" },
  { text: "HOME AFFAIRS — ZEP renewal queue at Maseru Bridge: 47 processed, 3 denied", tone: "info" },
  { text: "SAPS — Joint operation with SANDF approved for Kopfontein corridor tonight", tone: "warn" },
  { text: "SIGINT — Intercepted comms suggest group staging at Kruger East boundary", tone: "alert" },
  { text: "DRONE-09 NVG feed active, fence line N sector, all clear", tone: "info" },
  { text: "INTEL — Asylum application spike at Lebombo, 300% above weekly average", tone: "warn" },
  { text: "SAPS — Warrant executed, subject from SENTRY-ZA flag at Oshoek crossing", tone: "alert" },
  { text: "BORDER PATROL — Unit 7 standby at Vioolsdrift, awaiting drone confirmation", tone: "info" },
];

let counter = 0;

function genMsg(): IntelMsg {
  const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  return { id: counter++, text: t.text, tone: t.tone };
}

export function IntelTicker() {
  const [messages, setMessages] = useState<IntelMsg[]>(() =>
    Array.from({ length: 6 }, () => genMsg())
  );

  useEffect(() => {
    const t = setInterval(() => {
      setMessages((prev) => [...prev.slice(-5), genMsg()]);
    }, 4500 + Math.random() * 3000);
    return () => clearInterval(t);
  }, []);

  // Duplicate the list for seamless scroll
  const display = [...messages, ...messages];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <div className="flex items-center">
        <div className="shrink-0 px-4 py-2 border-r border-border bg-background/60">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold whitespace-nowrap">
            ⚡ INTEL FEED
          </span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="intel-scroll flex items-center gap-8 py-2 whitespace-nowrap">
            {display.map((m, i) => (
              <span key={`${m.id}-${i}`} className="flex items-center gap-2 font-mono text-[11px]">
                <span
                  className={
                    m.tone === "alert"
                      ? "text-signal-red"
                      : m.tone === "warn"
                      ? "text-signal-yellow"
                      : "text-muted-foreground"
                  }
                >
                  {m.tone === "alert" ? "●" : m.tone === "warn" ? "▲" : "◆"}
                </span>
                <span className="text-muted-foreground">
                  {new Date().toLocaleTimeString("en-ZA", { hour12: false })} ·
                </span>
                <span className={
                  m.tone === "alert"
                    ? "text-signal-red"
                    : m.tone === "warn"
                    ? "text-signal-yellow"
                    : "text-foreground/80"
                }>
                  {m.text}
                </span>
                <span className="text-border">|</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
