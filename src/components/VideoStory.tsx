import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { IconPlay, IconClose } from "~/components/icons";

// ─── Types ───
interface VideoStoryEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  year: number;
  lat: number;
  lng: number;
  source_url?: string;
  date_exact?: string;
  subcategory?: string;
  distanceKm?: number;
}

interface VideoStoryProps {
  event: VideoStoryEvent;
  userLat: number;
  userLng: number;
  onClose: () => void;
  userToken: string; // session token for the Pro-only export endpoint
}

// ─── Category gradients (mirrored from HistoryReel) ───
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

function getGradient(cat: string): string {
  return CATEGORY_GRADIENTS[cat] || "from-dark-800 via-dark-900 to-dark-900";
}

function formatDistance(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.1) return Math.round(miles * 5280) + " ft away";
  if (miles < 100) return miles.toFixed(1) + " mi away";
  return Math.round(miles).toLocaleString() + " mi away";
}

// ─── Fun facts (mirrored from HistoryReel) ───
function funFact(evt: VideoStoryEvent): string | null {
  const t = (evt.title + " " + evt.description).toLowerCase();
  const patterns: [RegExp, string][] = [
    [/pompeii|vesuvius/, "Pompeii was buried under 4-6m of ash for 1,500 years."],
    [/ripper|whitechapel/, "Jack the Ripper\u2019s identity remains unknown after 130+ years. Over 100 suspects have been proposed."],
    [/titanic/, "The Titanic\u2019s distress signal was received by 6 other ships. Only one arrived in time."],
    [/colosseum/, "The Colosseum had 80 entrance arches called \u2018vomitoria\u2019 \u2014 they let 50,000 people exit in minutes."],
    [/black death|plague/, "The Black Death killed 30-60% of Europe\u2019s population. It took 200 years to recover."],
    [/chernobyl/, "The Chernobyl Exclusion Zone remains radioactive for 20,000 years. It\u2019s now a wildlife sanctuary."],
    [/salem|witch/, "19 people were hanged in Salem (none burned). One man was pressed to death for refusing to plead."],
    [/great fire.+london/, "The Great Fire destroyed 87 churches but only 6 confirmed deaths."],
    [/alcatraz/, "No prisoner ever successfully escaped Alcatraz \u2014 36 tried, 14 attempts."],
    [/berlin wall/, "Over 100 people died trying to cross the Berlin Wall during its 28-year existence."],
    [/tower of london/, "The Tower of London has served as palace, prison, armory, zoo, and treasury over 1,000 years."],
    [/holmes|murder castle/, "H.H. Holmes built a \u2018Murder Castle\u2019 with secret passages, trap doors, and a basement crematorium."],
    [/gacy/, "John Wayne Gacy performed as \u2018Pogo the Clown\u2019 at children\u2019s parties while hiding a horrific secret."],
    [/manson/, "Charles Manson believed the Beatles\u2019 \u2018Helter Skelter\u2019 was a prophecy of an upcoming race war."],
    [/dahmer/, "Jeffrey Dahmer was only caught when a would-be victim escaped and flagged down police, handcuffs still dangling from his wrist."],
    [/dillinger/, "John Dillinger\u2019s body was put on public display at the morgue \u2014 15,000 people came to see it."],
    [/eastland/, "The SS Eastland capsized while still docked \u2014 bystanders watched in horror, unable to save those trapped below deck."],
    [/iroquois theatre|iroquois theater/, "The Iroquois Theatre was advertised as \u2018absolutely fireproof\u2019 \u2014 the day it burned, 602 people died."],
  ];
  for (const [re, fact] of patterns) {
    if (re.test(t)) return fact;
  }
  return null;
}

// ─── Ambient soundscape engine (mirrored from HistoryReel) ───
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

// ─── Extract Wikipedia page title from URL ───
function extractWikiTitle(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("wikipedia.org") && u.pathname.startsWith("/wiki/")) {
      return decodeURIComponent(u.pathname.replace("/wiki/", ""));
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Split description into words for highlighting ───
interface WordToken {
  text: string;
  index: number;
}

function tokenizeWords(text: string): WordToken[] {
  const words: WordToken[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    words.push({ text: match[0], index: match.index });
  }
  return words;
}

export default function VideoStory({ event, userLat, userLng, onClose, userToken }: VideoStoryProps) {
  const [images, setImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageTransitioning, setImageTransitioning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [narrationProgress, setNarrationProgress] = useState(0);
  const [ambientOn, setAmbientOn] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const wordsRef = useRef<WordToken[]>([]);
  const wordCharPositionsRef = useRef<number[]>([]);
  const totalCharsRef = useRef(0);
  const hasStartedRef = useRef(false);

  const [showStartOverlay, setShowStartOverlay] = useState(true);

  // ─── ElevenLabs TTS state ───
  const elevenlabsAudioRef = useRef<AudioBuffer | null>(null);
  const elevenlabsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const elevenlabsStartTimeRef = useRef(0);
  const [usingElevenLabs, setUsingElevenLabs] = useState(false);

  const eventFact = useMemo(() => funFact(event), [event]);

  // ─── Fetch Wikipedia images (multi-image slideshow) ───
  useEffect(() => {
    let cancelled = false;

    async function fetchImages() {
      setImageLoading(true);
      setImageError(false);
      let allImages: string[] = [];
      let wikiTitle: string | null = null;

      // Step 1: Get Wikipedia page title from source_url or event title
      if (event.source_url) {
        wikiTitle = extractWikiTitle(event.source_url);
      }

      async function tryFetchImages(title: string): Promise<string[]> {
        const result: string[] = [];
        try {
          // Fetch page summary for thumbnail
          const summaryResp = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
          );
          if (summaryResp.ok) {
            const data = await summaryResp.json();
            if (data.thumbnail?.source) {
              result.push(data.thumbnail.source);
            }
          }

          // Fetch media list for additional images
          const mediaResp = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`
          );
          if (mediaResp.ok) {
            const mediaData = await mediaResp.json();
            const extraImages = (mediaData.items || [])
              .filter((item: any) => {
                return (
                  item.type === "image" &&
                  !(item.title || "").includes(".svg") &&
                  !(item.title || "").includes("Flag_") &&
                  !(item.title || "").toLowerCase().includes("icon") &&
                  !(item.title || "").toLowerCase().includes("logo") &&
                  (item.width || 0) > 400 &&
                  (item.width || 0) > (item.height || 0) * 0.8
                );
              })
              .slice(0, 8)
              .map((item: any) => {
                const srcs = item.srcset || [];
                const best = srcs.find((s: any) => s.scale === "1x") || srcs[0];
                return best?.src || "";
              })
              .filter(Boolean);

            // Combine: thumbnail first, then extra images (deduped)
            for (const img of extraImages) {
              if (!result.includes(img)) result.push(img);
            }
          }
        } catch {}
        return result.slice(0, 8);
      }

      // Try source_url Wikipedia title first
      if (wikiTitle && !cancelled) {
        allImages = await tryFetchImages(wikiTitle);
      }

      // Fallback: try event title
      if (allImages.length === 0 && !cancelled) {
        allImages = await tryFetchImages(event.title);
      }

      if (cancelled) return;

      if (allImages.length > 0) {
        setImages(allImages);
        setCurrentImageIndex(0);
        setImageLoading(false);
      } else {
        setImageError(true);
        setImageLoading(false);
      }
    }

    fetchImages();
    return () => { cancelled = true; };
  }, [event.source_url, event.title]);

  // ─── Init map fallback ───
  useEffect(() => {
    if (!showMap || !mapRef.current) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    import("leaflet").then((leaflet) => {
      if (cancelled || !mapRef.current) return;
      const L = leaflet.default || leaflet;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      const map = L.map(mapRef.current, {
        center: [event.lat, event.lng], zoom: 14,
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
      const color = colorMap[event.category] || "#888";
      const icon = L.divIcon({
        html: `<div style="background:${color};width:20px;height:20px;border-radius:3px;border:3px solid rgba(232,232,232,0.9);transform:rotate(45deg);box-shadow:0 0 30px ${color}aa;"></div>`,
        className: "", iconSize: [20, 20], iconAnchor: [10, 10],
      });
      L.marker([event.lat, event.lng], { icon }).addTo(map);
      mapInstanceRef.current = map;
    });

    return () => { cancelled = true; };
  }, [showMap, event.lat, event.lng, event.category]);

  // ─── Web Speech API narration ───
  const stopNarration = useCallback(() => {
    window.speechSynthesis.cancel();
    try { elevenlabsSourceRef.current?.stop(); } catch {}
    elevenlabsSourceRef.current = null;
    utteranceRef.current = null;
    setUsingElevenLabs(false);
  }, []);

  // ─── Fetch ElevenLabs audio ───
  const fetchElevenLabsAudio = useCallback(async (text: string): Promise<AudioBuffer | null> => {
    try {
      const resp = await fetch("/api/elevenlabs-narrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pro-only endpoint (server-enforced) — send the token so Pro users pass.
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({ text })
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data.audioBase64) return null;

      const ctx = audioEngineRef.current?.ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
      const binaryStr = atob(data.audioBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      return audioBuffer;
    } catch {
      return null;
    }
  }, [userToken]);

  const startNarration = useCallback(() => {
    if (typeof window === "undefined") return;

    // Cancel any existing speech or audio
    window.speechSynthesis.cancel();
    try { elevenlabsSourceRef.current?.stop(); } catch {}

    // Try ElevenLabs first for natural-sounding narration
    setUsingElevenLabs(false);
    const text = event.description;
    const words = tokenizeWords(text);
    wordsRef.current = words;

    fetchElevenLabsAudio(text).then((audioBuffer) => {
      if (audioBuffer) {
        // Success! Play via AudioContext
        setUsingElevenLabs(true);
        elevenlabsAudioRef.current = audioBuffer;

        const ctx = audioEngineRef.current?.ctx;
        if (!ctx) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.9, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        elevenlabsSourceRef.current = source;
        elevenlabsStartTimeRef.current = ctx.currentTime;
        setIsPlaying(true);

        // Simulate progress for word highlighting
        const duration = audioBuffer.duration;
        const interval = setInterval(() => {
          const elapsed = (ctx.currentTime - elevenlabsStartTimeRef.current);
          const progress = Math.min(elapsed / duration, 1);
          setNarrationProgress(progress);

          // Update highlight index based on word positions
          if (words.length > 0) {
            const charProgress = Math.floor(progress * text.length);
            let found = -1;
            for (let i = wordCharPositionsRef.current.length - 1; i >= 0; i--) {
              if (wordCharPositionsRef.current[i] <= charProgress) {
                found = i;
                break;
              }
            }
            setHighlightIndex(found);
          }

          if (progress >= 1) {
            clearInterval(interval);
            setIsPlaying(false);
            setNarrationProgress(0);
            setHighlightIndex(-1);
          }
        }, 100);

        source.onended = () => {
          clearInterval(interval);
          setIsPlaying(false);
          setNarrationProgress(0);
          setHighlightIndex(-1);
        };
        return;
      }

      // Fall back to Web Speech API below
      startSpeechNarration(text, words);
    }).catch(() => {
      startSpeechNarration(text, words);
    });
  }, [event.description, fetchElevenLabsAudio]);

  // ─── Web Speech API fallback ───
  const startSpeechNarration = useCallback((text: string, words: { text: string; index: number }[]) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // Build character position array for each word
    const positions: number[] = [];
    totalCharsRef.current = text.length;
    for (const w of words) {
      positions.push(w.index);
    }
    wordCharPositionsRef.current = positions;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;

    // Try to find the most natural-sounding voice available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Tier 1: Chrome's Google voices (most natural free voices available)
      const googleVoice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"));
      // Tier 2: macOS Samantha (very natural on Apple devices)
      const samanthaVoice = voices.find(v => v.name === "Samantha" && v.lang.startsWith("en"));
      // Tier 3: Other premium/enhanced voices
      const premiumVoice = voices.find(v =>
        v.lang.startsWith("en") &&
        (v.name.includes("Premium") || v.name.includes("Enhanced") || v.name.includes("Wavenet"))
      );
      // Tier 4: Daniel (macOS British English, natural)
      const danielVoice = voices.find(v => v.name === "Daniel" && v.lang.startsWith("en"));
      // Tier 5: Any en-US voice
      const enUSVoice = voices.find(v => v.lang === "en-US");
      // Tier 6: Any English voice
      const anyEnVoice = voices.find(v => v.lang.startsWith("en"));

      if (googleVoice) utterance.voice = googleVoice;
      else if (samanthaVoice) utterance.voice = samanthaVoice;
      else if (premiumVoice) utterance.voice = premiumVoice;
      else if (danielVoice) utterance.voice = danielVoice;
      else if (enUSVoice) utterance.voice = enUSVoice;
      else if (anyEnVoice) utterance.voice = anyEnVoice;
    }

    // Track word highlighting
    utterance.onboundary = (evt) => {
      const charIdx = evt.charIndex;
      // Find which word we're at
      for (let i = wordsRef.current.length - 1; i >= 0; i--) {
        if (wordCharPositionsRef.current[i] <= charIdx) {
          setHighlightIndex(i);
          break;
        }
      }
    };

    utterance.onend = () => {
      setNarrationProgress(100);
      setIsPlaying(false);
      setHighlightIndex(-1);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setHighlightIndex(-1);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setNarrationProgress(0);
  }, [event.description]);

  const pauseNarration = useCallback(() => {
    if (usingElevenLabs) {
      try { audioEngineRef.current?.ctx.suspend(); } catch {}
    } else {
      window.speechSynthesis.pause();
    }
    setIsPlaying(false);
  }, [usingElevenLabs]);

  const resumeNarration = useCallback(() => {
    if (usingElevenLabs) {
      try { audioEngineRef.current?.ctx.resume(); } catch {}
    } else {
      window.speechSynthesis.resume();
    }
    setIsPlaying(true);
  }, [usingElevenLabs]);

  // ─── Progress tracking ───
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setNarrationProgress((prev) => {
        const next = prev + 0.6;
        return next >= 100 ? 100 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioEngineRef.current) audioEngineRef.current.stop();
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  // ─── Image slideshow auto-cycling ───
  useEffect(() => {
    if (!isPlaying || images.length <= 1 || showMap) return;
    const interval = setInterval(() => {
      setImageTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
        setImageTransitioning(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, images.length, showMap]);

  // ─── Ambient sound toggle ───
  const toggleAmbient = useCallback(() => {
    if (ambientOn) {
      if (audioEngineRef.current) { audioEngineRef.current.stop(); audioEngineRef.current = null; }
      setAmbientOn(false);
    } else {
      // Resume any suspended AudioContext (iOS requires user gesture)
      if (audioEngineRef.current?.ctx?.state === "suspended") {
        audioEngineRef.current.ctx.resume().then(() => setAmbientOn(true));
        return;
      }
      const engine = startSoundscape(event.category);
      if (engine) {
        // On iOS, AudioContext may start suspended — resume it
        if (engine.ctx.state === "suspended") {
          engine.ctx.resume().then(() => { audioEngineRef.current = engine; setAmbientOn(true); });
        } else {
          audioEngineRef.current = engine;
          setAmbientOn(true);
        }
      }
    }
  }, [ambientOn, event.category]);

  // ─── Export MP4 ───
  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    setExportDone(false);
    try {
      const resp = await fetch("/api/export-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pro-only endpoint (server-enforced) — send the token so Pro users pass.
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          year: event.year,
          category: event.category,
          images,
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Export failed (${resp.status})`);
      }
      const result = await resp.json();
      // Convert base64 to blob and download
      const byteChars = atob(result.videoBase64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
      const byteArr = new Uint8Array(byteNums);
      const blob = new Blob([byteArr], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err: any) {
      setExportError(err.message || "Export failed");
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setExporting(false);
    }
  }, [event, images, userToken]);

  // ─── Start experience (user gesture entry point for mobile audio) ───
  const handleStartExperience = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    setShowStartOverlay(false);

    // Resume any suspended AudioContext (iOS blocks AudioContext until user gesture)
    if (audioEngineRef.current?.ctx?.state === "suspended") {
      audioEngineRef.current.ctx.resume();
    }

    // Start narration — speechSynthesis requires user gesture on mobile
    startNarration();
  }, [startNarration]);

  // ─── Handle close ───
  const handleClose = useCallback(() => {
    stopNarration();
    if (audioEngineRef.current) audioEngineRef.current.stop();
    onClose();
  }, [stopNarration, onClose]);

  // ─── Keyboard controls ───
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === " ") { e.preventDefault(); if (isPlaying) pauseNarration(); else if (!hasStartedRef.current) startNarration(); else resumeNarration(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleClose, isPlaying, pauseNarration, resumeNarration, startNarration]);

  // ─── Touch handlers ───
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dx = e.changedTouches[0].clientX - (touchStartX || 0);

    // Swipe down to close
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
      if (dy > 60) handleClose();
    }
    // Tap-based navigation
    else if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      const rect = (e.target as HTMLElement).getBoundingClientRect?.();
      if (rect) {
        const x = e.changedTouches[0].clientX - rect.left;
        const third = rect.width / 3;
        if (x < third) {
          // Left third: restart narration
          stopNarration();
          setTimeout(() => startNarration(), 50);
        } else if (x > rect.width - third) {
          // Right third: close
          handleClose();
        } else {
          // Center: play/pause
          if (isPlaying) pauseNarration();
          else if (!hasStartedRef.current) startNarration();
          else resumeNarration();
        }
      }
    }

    setTouchStartY(null);
    setTouchStartX(null);
  };

  // ─── Tap handler for mouse clicks ───
  const handleClickArea = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) {
      stopNarration();
      setTimeout(() => startNarration(), 50);
    } else if (x > rect.width - third) {
      handleClose();
    } else {
      if (isPlaying) pauseNarration();
      else if (!hasStartedRef.current) startNarration();
      else resumeNarration();
    }
  }, [isPlaying, pauseNarration, resumeNarration, stopNarration, startNarration, handleClose]);

  // ─── (Auto-play removed — mobile requires user gesture to unlock speechSynthesis) ───

  // ─── Render: highlighted description ───
  const renderedDescription = useMemo(() => {
    if (highlightIndex < 0 || wordsRef.current.length === 0) {
      return <p className="mt-3 leading-relaxed text-ghost/85 text-sm">{event.description}</p>;
    }
    const words = wordsRef.current;
    const text = event.description;
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      // Add text before this word
      if (w.index > lastEnd) {
        parts.push(text.slice(lastEnd, w.index));
      }
      // Add highlighted word
      if (i === highlightIndex) {
        parts.push(
          <span key={i} className="bg-accent-gold/30 text-accent-gold rounded-sm px-0.5 font-medium animate-pulse">
            {w.text}
          </span>
        );
      } else if (i < highlightIndex) {
        // Words already spoken: slightly dim
        parts.push(
          <span key={i} className="text-ghost-dim/70">
            {w.text}
          </span>
        );
      } else {
        parts.push(w.text);
      }
      lastEnd = w.index + w.text.length;
    }
    // Add remaining text
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd));
    }

    return (
      <p className="mt-3 leading-relaxed text-ghost/85 text-sm">
        {parts}
      </p>
    );
  }, [highlightIndex, event.description]);

  const hasImage = images.length > 0 && !imageError;
  const showMapFallback = !hasImage || showMap;
  const hasMultipleImages = images.length > 1;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-dark-900 safe-top safe-bottom">
      {/* ─── Progress bar (thin, top edge) ─── */}
      <div className="absolute left-0 right-0 top-0 z-20 h-0.5 bg-white/10">
        <div
          className="h-full bg-accent-gold transition-all duration-100 ease-linear"
          style={{ width: `${narrationProgress}%` }}
        />
      </div>

      {/* ─── Start overlay (user gesture required on mobile for speechSynthesis + AudioContext) ─── */}
      {showStartOverlay && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-dark-900/90 backdrop-blur-md cursor-pointer"
          onClick={handleStartExperience}
          onTouchEnd={(e) => { e.preventDefault(); handleStartExperience(); }}
        >
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent-gold/40 bg-accent-gold/10">
              <svg className="ml-1.5 h-10 w-10 text-accent-gold" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="font-serif text-lg font-medium text-accent-gold">Tap to Start</p>
            <p className="text-xs text-ghost-dim/60">Audio narration requires a tap to begin</p>
          </div>
        </div>
      )}

      {/* ─── Close button (top-right) ─── */}
      <button
        onClick={handleClose}
        className="absolute right-3 top-4 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/40 text-ghost/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-ghost active:scale-90"
        aria-label="Close"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* ─── Ambient sound toggle (top-right, next to close) ─── */}
      <button
        onClick={toggleAmbient}
        className={`absolute right-16 top-4 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full backdrop-blur-sm transition-all active:scale-90 ${
          ambientOn
            ? "bg-accent-gold/20 text-accent-gold shadow-glow-red"
            : "bg-black/40 text-ghost-dim/70 hover:bg-black/60 hover:text-ghost"
        }`}
        aria-label={ambientOn ? "Mute ambient sound" : "Enable ambient sound"}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={
            ambientOn
              ? "M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.5H4a1 1 0 00-1 1v5a1 1 0 001 1h2.5l4 4V4.5l-4 4z"
              : "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          } />
        </svg>
      </button>

      {/* ─── Main content area ─── */}
      <div
        className="relative flex flex-1 flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClickArea}
      >
        {/* ─── Top 45%: Image/Map with Ken Burns ─── */}
        <div className="relative h-[45%] min-h-[200px] w-full overflow-hidden bg-dark-800">
          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-b ${getGradient(event.category)}`} />

          {imageLoading && !showMapFallback && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-gold/30 border-t-accent-gold" />
            </div>
          )}

          {showMapFallback ? (
            <div ref={mapRef} className="absolute inset-0 h-full w-full" />
          ) : hasImage ? (
            <div className="absolute inset-0 kenburns-container">
              {images.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={idx === 0 ? event.title : `${event.title} — image ${idx + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-in-out"
                  style={{
                    opacity: idx === currentImageIndex ? 1 : 0,
                    animation: idx === currentImageIndex && !imageTransitioning ? "kenburns 20s ease-in-out forwards" : "none",
                  }}
                  onError={(e) => {
                    // Skip failed image: remove it from consideration
                    const img = e.currentTarget;
                    img.style.display = "none";
                    // If this was the current image, advance
                    if (idx === currentImageIndex && images.length > 1) {
                      setCurrentImageIndex((prev) => (prev + 1) % images.length);
                    }
                    // If all images failed
                    if (images.filter((_, i) => i !== idx).length === 0 || images.every((_, i) => {
                      const el = document.querySelector(`[data-img-idx="${i}"]`) as HTMLImageElement;
                      return el && el.style.display === "none";
                    })) {
                      // Will be caught by hasImage check — all images gone
                    }
                  }}
                  data-img-idx={idx}
                />
              ))}
            </div>
          ) : null}

          {/* Image counter dots — only when 2+ images */}
          {hasMultipleImages && !showMapFallback && (
            <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setImageTransitioning(true); setTimeout(() => { setCurrentImageIndex(idx); setImageTransitioning(false); }, 150); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex
                      ? "w-4 bg-accent-gold"
                      : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Image ${idx + 1} of ${images.length}`}
                />
              ))}
            </div>
          )}

          {/* Image → map toggle (if image loaded) */}
          {hasImage && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowMap(!showMap); }}
              className="absolute left-3 bottom-2 z-10 rounded-lg bg-black/50 px-2.5 py-1 text-[10px] text-ghost-dim/70 backdrop-blur-sm hover:text-ghost transition-colors"
              aria-label={showMap ? "Show image" : "Show map"}
            >
              {showMap ? "🖼️ Image" : "🗺️ Map"}
            </button>
          )}

          {/* Category badge overlay */}
          <div className="absolute left-3 top-3 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-ghost">
              <span>{CATEGORY_ICONS[event.category] || "\u{1F4DC}"}</span>
              {CATEGORY_NAMES[event.category] || "Historical"}
            </span>
          </div>

          {/* Gradient overlay at bottom for text readability */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
        </div>

        {/* ─── Bottom 55%: Content ─── */}
        <div className="relative flex-1 overflow-y-auto smooth-scroll px-5 pt-4 pb-4">
          {/* Title */}
          <h2 className="title-card font-serif text-xl sm:text-2xl font-bold leading-tight text-accent-gold">
            {event.title}
          </h2>

          {/* Year + date */}
          <p className="mt-1.5 text-sm text-ghost-dim">
            {event.date_exact ? `${event.date_exact} · ` : ""}{event.year}
            {event.distanceKm !== undefined && (
              <span className="ml-2 text-xs text-ghost-dim/60">
                {formatDistance(event.distanceKm)}
              </span>
            )}
          </p>

          {/* Category pill */}
          <div className="mt-2">
            <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${
              event.category === "crime" ? "bg-crime/20 text-red-300 border-crime/40" :
              event.category === "death" ? "bg-death/20 text-gray-400 border-death/40" :
              event.category === "disaster" ? "bg-disaster/20 text-orange-300 border-disaster/40" :
              event.category === "mystery" ? "bg-mystery/20 text-purple-300 border-mystery/40" :
              event.category === "cemetery" ? "bg-cemetery/20 text-green-300 border-cemetery/40" :
              event.category === "war_conflict" ? "bg-war-conflict/20 text-amber-200 border-war-conflict/40" :
              event.category === "memorial" ? "bg-memorial/20 text-yellow-200 border-memorial/40" :
              event.category === "prison" ? "bg-prison/20 text-slate-300 border-prison/40" :
              event.category === "execution" ? "bg-execution/20 text-red-200 border-execution/40" :
              event.category === "riot" ? "bg-riot/20 text-orange-200 border-riot/40" :
              event.category === "historical" ? "bg-historical/20 text-amber-100 border-historical/40" :
              event.category === "local_legends" ? "bg-local-legends/20 text-purple-300 border-local-legends/40" :
              "bg-gray-800 text-gray-400"
            }`}>
              {CATEGORY_ICONS[event.category]} {event.category.charAt(0).toUpperCase() + event.category.slice(1).replace("_", " ")}
            </span>
          </div>

          {/* Description with word highlighting */}
          {renderedDescription}

          {/* Fun fact */}
          {eventFact && (
            <div className="mt-4 rounded-lg border border-accent-gold/20 bg-accent-gold/5 px-3 py-2.5">
              <p className="text-xs font-medium text-accent-gold/80">{"\u{1F4A1}"} Did you know?</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ghost/70">{eventFact}</p>
            </div>
          )}

          {/* Source link */}
          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-4 inline-flex items-center gap-1 text-xs text-accent-gold/60 hover:text-accent-gold transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Read full article on Wikipedia
            </a>
          )}

          {/* Playback hint */}
          {!isPlaying && hasStartedRef.current && (
            <p className="mt-3 text-xs text-accent-gold/40">{"⏸"} Paused — tap center to resume</p>
          )}

          {/* Spacer for controls bar */}
          <div className="h-16" />
        </div>
      </div>

      {/* ─── Controls bar (bottom) ─── */}
      <div className="relative z-10 border-t border-white/5 bg-dark-900/80 backdrop-blur-sm">
        {/* Export status toast */}
        {exporting && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-dark-800 border border-accent-gold/30 px-4 py-1.5 text-xs text-accent-gold whitespace-nowrap animate-pulse">
            <span className="inline-block h-3 w-3 mr-1.5 border-2 border-accent-gold/50 border-t-accent-gold rounded-full animate-spin align-[-2px]" />
            Generating video... (~30s)
          </div>
        )}
        {exportError && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-red-950/80 border border-red-500/30 px-4 py-1.5 text-xs text-red-300 whitespace-nowrap">
            {"\u26A0"} {exportError}
          </div>
        )}
        {exportDone && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-green-950/80 border border-green-500/30 px-4 py-1.5 text-xs text-green-300 whitespace-nowrap">
            {"\u2705"} Downloaded!
          </div>
        )}

        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5">
          {/* Restart button */}
          <button
            onClick={() => { stopNarration(); setTimeout(() => startNarration(), 50); }}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 sm:px-3 text-sm text-ghost-dim/60 transition-all hover:text-ghost hover:bg-white/5 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Restart</span>
          </button>

          {/* Export button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleExport(); }}
            disabled={exporting}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 sm:px-3 text-sm transition-all active:scale-95 ${
              exporting
                ? "text-accent-gold/40 cursor-wait"
                : "text-ghost-dim/60 hover:text-accent-gold hover:bg-accent-gold/5"
            }`}
            aria-label="Export video"
          >
            {exporting ? (
              <span className="h-4 w-4 border-2 border-accent-gold/40 border-t-accent-gold rounded-full animate-spin" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export"}</span>
          </button>

          {/* Play/Pause button */}
          <button
            onClick={() => { if (isPlaying) pauseNarration(); else if (!hasStartedRef.current) startNarration(); else resumeNarration(); }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-ghost transition-colors hover:bg-white/10 active:scale-90"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm text-ghost-dim/60 transition-all hover:text-ghost hover:bg-white/5 active:scale-95"
          >
            <span className="hidden sm:inline">Close</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
