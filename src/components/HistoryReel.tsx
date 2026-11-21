import { useEffect, useRef, useState, useCallback, useMemo } from "react";

interface ReelEvent {
  id: string;
  title: string;
  date: string;
  year: number;
  description: string;
  category: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  source_url?: string;
}

interface HistoryReelProps {
  events: ReelEvent[];
  userLat: number;
  userLng: number;
  userAddress?: string;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  crime: "\u{1F52A}", death: "\u{1F480}", disaster: "\u{1F525}",
  mystery: "\u{1F441}\uFE0F", cemetery: "\u{1FAA6}",
  war_conflict: "\u{2694}\uFE0F", memorial: "\u{1F3DB}\uFE0F",
  prison: "\u{26D3}\uFE0F", execution: "\u{1F9D3}",
  riot: "\u{1F4A2}", historical: "\u{1F4DC}",
  local_legends: "\u{1F47B}",
};

const CATEGORY_NAMES: Record<string, string> = {
  crime: "True Crime", death: "Tragic Death", disaster: "Catastrophe",
  mystery: "Unsolved Mystery", cemetery: "Burial Ground",
  war_conflict: "War & Conflict", memorial: "Memorial",
  prison: "Incarceration", execution: "Execution",
  riot: "Civil Unrest", historical: "Historical",
  local_legends: "Local Legend & Lore",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  crime: "from-red-950/90 via-dark-900/95 to-dark-900",
  death: "from-gray-950/90 via-dark-900/95 to-dark-900",
  disaster: "from-orange-950/90 via-dark-900/95 to-dark-900",
  mystery: "from-purple-950/90 via-dark-900/95 to-dark-900",
  cemetery: "from-emerald-950/90 via-dark-900/95 to-dark-900",
  war_conflict: "from-amber-950/90 via-dark-900/95 to-dark-900",
  memorial: "from-yellow-950/90 via-dark-900/95 to-dark-900",
  prison: "from-slate-950/90 via-dark-900/95 to-dark-900",
  execution: "from-red-950/90 via-dark-900/95 to-dark-900",
  riot: "from-orange-950/90 via-dark-900/95 to-dark-900",
  historical: "from-amber-950/90 via-dark-900/95 to-dark-900",
  local_legends: "from-purple-950/90 via-dark-900/95 to-dark-900",
};

function getGradient(cat: string): string {
  return CATEGORY_GRADIENTS[cat] || "from-dark-800 via-dark-900 to-dark-900";
}

function formatDistance(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.1) return Math.round(miles * 5280) + " ft away";
  if (miles < 100) return miles.toFixed(1) + " mi away";
  return Math.round(miles).toLocaleString() + " mi away";
}

function narrate(evt: ReelEvent): string {
  const cat = evt.category;
  const desc = evt.description.replace(/^A |^The |^An /, "").trim();
  const upper = desc.charAt(0).toUpperCase() + desc.slice(1);
  const clean = upper.replace(/\.$/, "");
  if (cat === "crime") {
    if (/murder|kill|stab|shoot/.test(desc.toLowerCase())) return "A violent crime shook this area. " + clean + " \u2014 a chilling reminder of the darkness that lurked here.";
    return "This location witnessed a crime. " + clean + " The echoes of that day still linger.";
  }
  if (cat === "disaster") {
    if (/fire|burn|blaze/.test(desc.toLowerCase())) return "Flames consumed this place. " + clean + " The scars may have healed, but the memory burns on.";
    if (/flood|earthquake|erupt|volcano/.test(desc.toLowerCase())) return "Nature\u2019s fury struck here. " + clean + " It was a day this community would never forget.";
    return "A disaster unfolded here. " + clean + " Nothing was ever the same.";
  }
  if (cat === "mystery") return "A mystery lingers here. " + clean + " To this day, questions remain unanswered \u2014 and the truth may never be known.";
  if (cat === "cemetery") return "The final resting place of those who came before. " + clean + " Every headstone tells a story.";
  if (cat === "death") return "Death visited this place. " + clean + " A life \u2014 or lives \u2014 were lost here.";
  if (cat === "war_conflict") return "War scarred this land. " + clean + " The echoes of conflict still resonate through these streets.";
  if (cat === "memorial") return "A tribute stands in this place. " + clean + " \u2014 ensuring we never forget what happened here.";
  if (cat === "execution") return "Justice \u2014 or perhaps injustice \u2014 was served here. " + clean + " The ultimate price was paid on this spot.";
  if (cat === "prison") return "These walls held souls captive. " + clean + " Freedom was a distant memory within.";
  if (cat === "riot") return "The streets erupted here. " + clean + " Anger and chaos spilled into the open.";
  return clean + ".";
}

function funFact(evt: ReelEvent): string | null {
  const t = (evt.title + " " + evt.description).toLowerCase();
  const patterns: [RegExp, string][] = [
    [/pompeii|vesuvius/, "Pompeii was buried under 4-6m of ash for 1,500 years."],
    [/ripper|whitechapel/, "Jack the Ripper's identity remains unknown after 130+ years. Over 100 suspects have been proposed."],
    [/titanic/, "The Titanic's distress signal was received by 6 other ships. Only one arrived in time."],
    [/colosseum/, "The Colosseum had 80 entrance arches called 'vomitoria' \u2014 they let 50,000 people exit in minutes."],
    [/black death|plague/, "The Black Death killed 30-60% of Europe's population. It took 200 years to recover."],
    [/chernobyl/, "The Chernobyl Exclusion Zone remains radioactive for 20,000 years. It's now a wildlife sanctuary."],
    [/salem|witch/, "19 people were hanged in Salem (none burned). One man was pressed to death for refusing to plead."],
    [/great fire.+london/, "The Great Fire destroyed 87 churches but only 6 confirmed deaths."],
    [/alcatraz/, "No prisoner ever successfully escaped Alcatraz \u2014 36 tried, 14 attempts."],
    [/berlin wall/, "Over 100 people died trying to cross the Berlin Wall during its 28-year existence."],
    [/tower of london/, "The Tower of London has served as palace, prison, armory, zoo, and treasury over 1,000 years."],
  ];
  for (const [re, fact] of patterns) {
    if (re.test(t)) return fact;
  }
  return null;
}

interface AudioEngine { ctx: AudioContext; stop: () => void }

function startSoundscape(category: string): AudioEngine | null {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.03;
    master.connect(ctx.destination);

    if (category === "crime") {
      const o1 = ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = 50;
      const g1 = ctx.createGain(); g1.gain.value = 0.7; o1.connect(g1); g1.connect(master); o1.start();
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 120;
      const g2 = ctx.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(master); o2.start();
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 1.2;
      const lg = ctx.createGain(); lg.gain.value = 40; lfo.connect(lg); lg.connect(o1.frequency); lfo.start();
    } else if (category === "disaster") {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(Math.random(), 3);
      const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
      const ng = ctx.createGain(); ng.gain.value = 0.5; n.connect(ng); ng.connect(master); n.start();
      const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = 80;
      const g = ctx.createGain(); g.gain.value = 0.3; o.connect(g); g.connect(master); o.start();
    } else if (category === "mystery") {
      const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 220;
      const g1 = ctx.createGain(); g1.gain.value = 0.4; o1.connect(g1); g1.connect(master); o1.start();
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 330;
      const g2 = ctx.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(master); o2.start();
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.15;
      const lg = ctx.createGain(); lg.gain.value = 50; lfo.connect(lg); lg.connect(o1.frequency); lfo.start();
    } else if (category === "cemetery" || category === "death") {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
      const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
      const ng = ctx.createGain(); ng.gain.value = 0.3; n.connect(ng); ng.connect(master); n.start();
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 100;
      const g = ctx.createGain(); g.gain.value = 0.3; o.connect(g); g.connect(master); o.start();
    } else {
      const o1 = ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = 55;
      const g1 = ctx.createGain(); g1.gain.value = 0.5; o1.connect(g1); g1.connect(master); o1.start();
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 131.5;
      const g2 = ctx.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(master); o2.start();
    }
    return { ctx, stop: () => { try { ctx.close(); } catch {} } };
  } catch { return null; }
}

export default function HistoryReel({ events, userLat, userLng, userAddress, onClose }: HistoryReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDir, setTransitionDir] = useState<"up" | "down">("up");
  const [ambientOn, setAmbientOn] = useState(false);
  const [copied, setCopied] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const progressRef = useRef(0);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.year - b.year).slice(0, 8), [events]);

  const slideData = useMemo(() => {
    const s = sortedEvents;
    const slides: Array<{
      kind: "intro" | "event" | "outro";
      event?: ReelEvent;
      chapterLabel?: string;
      narrative?: string;
      funFact?: string | null;
    }> = [];

    const locStr = userAddress || userLat.toFixed(4) + ", " + userLng.toFixed(4);
    slides.push({ kind: "intro", narrative: "You're standing near " + locStr + ". Let's go back in time and uncover what happened here..." });

    s.forEach((evt, idx) => {
      const yearsAgo = new Date().getFullYear() - evt.year;
      const timeLabel = yearsAgo > 1000 ? Math.round(yearsAgo / 100) + " centuries ago" :
        yearsAgo > 100 ? Math.round(yearsAgo / 10) + " decades ago" : yearsAgo + " years ago";
      slides.push({
        kind: "event", event: evt,
        chapterLabel: "Chapter " + (idx + 1) + ": " + evt.year + " \u2014 " + timeLabel,
        narrative: narrate(evt), funFact: funFact(evt),
      });
    });

    const oldYear = s.length > 0 ? s[0].year : "long ago";
    slides.push({
      kind: "outro",
      narrative: s.length > 0
        ? "From " + oldYear + " to the present, this area has witnessed history \u2014 both glorious and dark. The past is never truly buried. It lives on beneath our feet."
        : "Every place has a story. This one is still being written.",
    });
    return slides;
  }, [sortedEvents, userLat, userLng, userAddress]);

  const totalSlides = slideData.length;
  const currentSlide = slideData[currentIndex];

  // Init map for event slides
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentSlide?.kind !== "event" || !currentSlide.event) {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      return;
    }
    const evt = currentSlide.event;
    import("leaflet").then((leaflet) => {
      const L = leaflet.default || leaflet;
      if (!mapRef.current) return;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      const map = L.map(mapRef.current, {
        center: [evt.lat, evt.lng], zoom: 14,
        zoomControl: false, attributionControl: false,
        dragging: false, scrollWheelZoom: false, touchZoom: false,
        doubleClickZoom: false, boxZoom: false, keyboard: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "", subdomains: "abcd", maxZoom: 19,
      }).addTo(map);
      const colorMap: Record<string, string> = {
        crime: "#8b0000", death: "#555555", disaster: "#cc5500",
        mystery: "#7b68ee", cemetery: "#6b8e6b", war_conflict: "#5c4033",
        memorial: "#b8860b", prison: "#708090", execution: "#4a0000",
        riot: "#ff4500", historical: "#8b7355",
        local_legends: "#9b59b6",
      };
      const color = colorMap[evt.category] || "#888";
      const icon = L.divIcon({
        html: '<div class="animate-marker-pulse" style="background:' + color + ';width:20px;height:20px;border-radius:3px;border:3px solid rgba(232,232,232,0.9);transform:rotate(45deg);box-shadow:0 0 30px ' + color + 'aa;"></div>',
        className: "", iconSize: [20, 20], iconAnchor: [10, 10],
      });
      L.marker([evt.lat, evt.lng], { icon }).addTo(map);
      L.circleMarker([userLat, userLng], {
        radius: 6, color: "#c9a96e", fillColor: "#c9a96e44",
        fillOpacity: 0.3, weight: 2, className: "animate-pulse-glow",
      }).addTo(map);
      mapInstanceRef.current = map;
      setTimeout(() => {
        const bounds = L.latLngBounds([evt.lat, evt.lng], [userLat, userLng]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 1.2 });
      }, 100);
    });
  }, [currentIndex, currentSlide?.kind, currentSlide?.event?.id, userLat, userLng]);

  // Auto-play
  const resetProgress = useCallback(() => { setProgress(0); progressRef.current = 0; }, []);
  const goToSlide = useCallback((idx: number, dir: "up" | "down") => {
    if (idx < 0 || idx >= totalSlides) return;
    setTransitionDir(dir);
    setIsTransitioning(true);
    setTimeout(() => { setCurrentIndex(idx); resetProgress(); setIsTransitioning(false); setIsPlaying(true); }, 150);
  }, [totalSlides, resetProgress]);

  const slideDuration = currentSlide?.kind === "intro" ? 7000 : currentSlide?.kind === "outro" ? 10000 : 10000;

  useEffect(() => {
    if (!isPlaying || totalSlides <= 0) return;
    const interval = setInterval(() => {
      const np = progressRef.current + (50 / slideDuration) * 100;
      progressRef.current = np;
      setProgress(np);
      if (np >= 100) {
        if (currentIndex < totalSlides - 1) goToSlide(currentIndex + 1, "up");
        else onClose();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, totalSlides, goToSlide, onClose, slideDuration]);

  // Update audio on slide change
  useEffect(() => {
    if (!ambientOn) return;
    const cat = currentSlide?.event?.category || "default";
    if (audioEngineRef.current) { audioEngineRef.current.stop(); audioEngineRef.current = null; }
    const engine = startSoundscape(cat);
    if (engine) audioEngineRef.current = engine;
  }, [currentIndex, ambientOn, currentSlide?.event?.category]);

  useEffect(() => { return () => { if (audioEngineRef.current) audioEngineRef.current.stop(); }; }, []);

  // Auto-play on start
  useEffect(() => {
    const t = setTimeout(() => setIsPlaying(true), 500);
    return () => clearTimeout(t);
  }, []);

  const progressSegments = slideData.map((_, idx) => {
    if (idx < currentIndex) return 100;
    if (idx === currentIndex) return progress;
    return 0;
  });

  const handleTouchStart = (e: React.TouchEvent) => { setTouchStartY(e.touches[0].clientY); setIsPlaying(false); };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const diff = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(diff) > 60) {
      if (diff < 0 && currentIndex < totalSlides - 1) goToSlide(currentIndex + 1, "up");
      else if (diff > 0 && currentIndex > 0) goToSlide(currentIndex - 1, "down");
      else if (diff > 0 && currentIndex === 0) onClose();
    } else { setIsPlaying((p) => !p); }
    setTouchStartY(null);
  };

  const handleSlideClick = (e: React.MouseEvent) => {
    if (isTransitioning) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third && currentIndex > 0) { setIsPlaying(false); goToSlide(currentIndex - 1, "down"); }
    else if (x > rect.width - third && currentIndex < totalSlides - 1) { setIsPlaying(false); goToSlide(currentIndex + 1, "up"); }
    else { setIsPlaying((p) => !p); }
  };

  const toggleAmbient = () => {
    if (ambientOn) {
      if (audioEngineRef.current) { audioEngineRef.current.stop(); audioEngineRef.current = null; }
      setAmbientOn(false);
    } else {
      const cat = currentSlide?.event?.category || "default";
      const engine = startSoundscape(cat);
      if (engine) { audioEngineRef.current = engine; setAmbientOn(true); }
    }
  };

  const handleShare = async () => {
    const evt = currentSlide?.event;
    const shareText = evt
      ? "\u{1F56F}\uFE0F Past Shadows \u2014 " + evt.title + "\n" + narrate(evt)
      : "\u{1F56F}\uFE0F Past Shadows \u2014 Exploring history at " + userLat.toFixed(4) + ", " + userLng.toFixed(4);
    if (navigator.share) {
      try { await navigator.share({ title: "Past Shadows", text: shareText, url: window.location.href }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareText + "\n\n" + window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { if (currentIndex < totalSlides - 1) goToSlide(currentIndex + 1, "up"); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { if (currentIndex > 0) goToSlide(currentIndex - 1, "down"); }
      if (e.key === " ") { e.preventDefault(); setIsPlaying((p) => !p); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [currentIndex, totalSlides, goToSlide, onClose]);

  if (totalSlides === 0) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-dark-900">
        <div className="text-center"><span className="text-4xl">{"\u{1F9B8}"}</span><p className="mt-4 text-lg text-ghost-dim">No events to show</p>
          <button onClick={onClose} className="mt-6 min-h-[44px] rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-6 text-sm text-accent-gold">Close</button></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-dark-900 safe-top safe-bottom">
      <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-2 pt-2 pb-1">
        {progressSegments.map((pct, idx) => (
          <div key={idx} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-accent-gold transition-all duration-100 ease-linear" style={{ width: pct + "%" }} />
          </div>
        ))}
      </div>

      <button onClick={onClose} className="absolute left-4 top-3 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/40 text-ghost/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-ghost active:scale-90" aria-label="Close">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <div className="absolute right-4 top-3 z-20 flex items-center gap-2">
        <button onClick={toggleAmbient} className={"flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full backdrop-blur-sm transition-all active:scale-90 " + (ambientOn ? "bg-accent-gold/20 text-accent-gold shadow-glow-red" : "bg-black/40 text-ghost-dim/70 hover:bg-black/60 hover:text-ghost")} aria-label={ambientOn ? "Mute" : "Ambient"}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={ambientOn ? "M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.5H4a1 1 0 00-1 1v5a1 1 0 001 1h2.5l4 4V4.5l-4 4z" : "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"} />
          </svg>
        </button>
        <button onClick={handleShare} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/40 text-ghost-dim/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-ghost active:scale-90" aria-label="Share">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      </div>

      {copied && <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-lg bg-dark-700 px-4 py-2 text-sm text-accent-gold shadow-lg animate-fade-in-up">{"\u{1F4CB}"} Copied!</div>}

      <div className="relative flex flex-1 flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={handleSlideClick}>
        <div className={"absolute inset-0 flex flex-col transition-all duration-300 ease-out " + (isTransitioning ? transitionDir === "up" ? "opacity-0 -translate-y-8 scale-95" : "opacity-0 translate-y-8 scale-95" : "opacity-100 translate-y-0 scale-100")}>

          {currentSlide?.kind === "intro" && (
            <div className="absolute inset-0 bg-gradient-to-b from-dark-800 via-dark-900 to-dark-900 flex items-center justify-center">
              <div className="px-8 text-center max-w-lg">
                <span className="mb-6 inline-block text-5xl animate-float">{"\u{1F56F}\uFE0F"}</span>
                <p className="font-serif text-2xl sm:text-3xl font-bold leading-relaxed text-accent-gold text-glow">
                  {currentSlide.narrative}
                </p>
                <p className="mt-8 text-sm text-ghost-dim/50 animate-pulse">Scroll through time...</p>
              </div>
            </div>
          )}

          {currentSlide?.kind === "outro" && (
            <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-900 to-dark-800 flex items-center justify-center">
              <div className="px-8 text-center max-w-lg">
                <span className="mb-6 inline-block text-5xl">{"\u{1F30D}"}</span>
                <p className="font-serif text-xl sm:text-2xl font-bold leading-relaxed text-accent-gold">
                  {currentSlide.narrative}
                </p>
                <p className="mt-6 text-xs text-ghost-dim/50">Past Shadows \u2014 history lives beneath your feet</p>
              </div>
            </div>
          )}

          {currentSlide?.kind === "event" && currentSlide.event && (
            <>
              <div className={"absolute inset-0 bg-gradient-to-b " + getGradient(currentSlide.event.category)} />
              <div className="relative h-3/5 min-h-[220px] w-full overflow-hidden">
                <div ref={mapRef} className="h-full w-full" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-dark-900 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-dark-900/60 to-transparent" />
              </div>
              <div className="relative flex-1 overflow-y-auto px-6 pt-4 pb-4">
                <span className="mb-2 inline-block rounded-full bg-accent-gold/15 px-3 py-1 text-xs font-medium text-accent-gold">
                  {currentSlide.chapterLabel}
                </span>
                <div className="mb-2 flex items-center gap-2 mt-2">
                  <span className="text-2xl">{CATEGORY_ICONS[currentSlide.event.category] || "\u{1F4DC}"}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-ghost-dim">
                    {CATEGORY_NAMES[currentSlide.event.category] || "Historical"}
                  </span>
                  {currentSlide.event.distanceKm !== undefined && (
                    <span className="text-xs text-ghost-dim/60">{formatDistance(currentSlide.event.distanceKm)}</span>
                  )}
                </div>
                <h2 className="font-serif text-xl font-bold leading-tight text-accent-gold">{currentSlide.event.title}</h2>
                <p className="mt-1 text-sm text-ghost-dim/70">{currentSlide.event.date}</p>
                <p className="mt-3 leading-relaxed text-ghost/85 text-sm">{currentSlide.narrative}</p>
                {currentSlide.event.source_url && (
                  <a href={currentSlide.event.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 inline-flex items-center gap-1 text-xs text-accent-gold/60 hover:text-accent-gold transition-colors">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg> Source
                  </a>
                )}
                {currentSlide.funFact && (
                  <div className="mt-3 rounded-lg border border-accent-gold/20 bg-accent-gold/5 px-3 py-2">
                    <p className="text-xs font-medium text-accent-gold/80">{"\u{1F4A1}"} Did you know?</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ghost/70">{currentSlide.funFact}</p>
                  </div>
                )}
                <p className="mt-4 text-xs text-ghost-dim/30">{currentIndex + 1} of {totalSlides}</p>
                {!isPlaying && <p className="mt-1 text-xs text-accent-gold/40">{"\u275A\u275A"} Paused</p>}
              </div>
            </>
          )}

        </div>
      </div>

      <div className="relative z-10 border-t border-white/5 bg-dark-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-2.5">
          <button onClick={() => { if (currentIndex > 0) { setIsPlaying(false); goToSlide(currentIndex - 1, "down"); } }} disabled={currentIndex === 0}
            className={"flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm transition-all active:scale-95 " + (currentIndex === 0 ? "text-ghost-dim/20 cursor-not-allowed" : "text-ghost-dim/60 hover:text-ghost hover:bg-white/5")}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <button onClick={() => setIsPlaying((p) => !p)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-ghost transition-colors hover:bg-white/10 active:scale-90" aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            ) : (
              <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button onClick={() => { if (currentIndex < totalSlides - 1) { setIsPlaying(false); goToSlide(currentIndex + 1, "up"); } else onClose(); }}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm text-ghost-dim/60 transition-all hover:text-ghost hover:bg-white/5 active:scale-95">
            <span className="hidden sm:inline">{currentIndex < totalSlides - 1 ? "Next" : "Finish"}</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}