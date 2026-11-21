import { useState, useMemo, useCallback } from "react";
import demoData from "~/data/what_was_here.json";

interface TimelineEntry {
  era: string;
  title: string;
  description: string;
  category: string;
  darkness_rating: number;
  date_exact: string | null;
  source: string;
}

interface LocationData {
  location_id: string;
  address: string;
  current_use: string;
  coordinates: { lat: number; lng: number };
  timeline: TimelineEntry[];
}

interface WhatWasHereProps {
  currentLat: number;
  currentLng: number;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  crime: "\u{1F52A}", death: "\u{1F480}", disaster: "\u{1F525}",
  mystery: "\u{1F441}\uFE0F", cemetery: "\u{1FAA6}", war_conflict: "\u{2694}\uFE0F",
  memorial: "\u{1F3DB}\uFE0F", prison: "\u{26D3}\uFE0F", execution: "\u{1F9D3}",
  riot: "\u{1F4A2}", historical: "\u{1F4DC}",
  local_legends: "\u{1F47B}",
};

function darknessColor(rating: number): string {
  if (rating >= 9) return "#8b0000";
  if (rating >= 7) return "#cc5500";
  if (rating >= 5) return "#b8860b";
  if (rating >= 3) return "#708090";
  return "#4a7c59";
}

function darknessLabel(rating: number): string {
  if (rating >= 9) return "Extremely Dark";
  if (rating >= 7) return "Very Dark";
  if (rating >= 5) return "Dark";
  if (rating >= 3) return "Somewhat Dark";
  return "Historical";
}

// ─── Imperial distance formatter ───
function formatDist(km: number): string {
  const mi = km * 0.621371;
  if (mi < 0.1) return `${Math.round(mi * 5280)} ft`;
  if (mi < 100) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi).toLocaleString()} mi`;
}

export default function WhatWasHere({ currentLat, currentLng, onClose }: WhatWasHereProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [expandedEra, setExpandedEra] = useState<number | null>(null);

  // ─── Hide controls ───
  const [hiddenEntries, setHiddenEntries] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("ps_whw_hidden") || "[]")); }
    catch { return new Set(); }
  });

  const persistHidden = useCallback((s: Set<string>) => {
    setHiddenEntries(s);
    try { localStorage.setItem("ps_whw_hidden", JSON.stringify([...s])); } catch {}
  }, []);

  const hideEntry = useCallback((entryKey: string) => {
    const next = new Set(hiddenEntries);
    next.add(entryKey);
    persistHidden(next);
  }, [hiddenEntries, persistHidden]);

  const resetHidden = useCallback(() => {
    persistHidden(new Set());
  }, [persistHidden]);

  const locations: LocationData[] = (demoData as any).locations || [];

  const sortedLocations = useMemo(() => {
    return locations.map((loc) => {
      const R = 6371;
      const dLat = ((loc.coordinates.lat - currentLat) * Math.PI) / 180;
      const dLng = ((loc.coordinates.lng - currentLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((currentLat * Math.PI) / 180) * Math.cos((loc.coordinates.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...loc, distanceKm: Math.round(dist * 10) / 10 };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [currentLat, currentLng, locations]);

  const location = selectedLocation ? locations.find((l) => l.location_id === selectedLocation) : sortedLocations[0];
  const locationDist = sortedLocations.find((l: any) => l.location_id === location?.location_id) as any;

  // Filter out hidden entries
  const visibleTimeline = useMemo(() => {
    if (!location) return [];
    return location.timeline.filter((_, idx) => !hiddenEntries.has(`${location.location_id}:${idx}`));
  }, [location, hiddenEntries]);

  const hiddenCount = location ? location.timeline.length - visibleTimeline.length : 0;

  if (!sortedLocations.length || !location) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <span className="text-4xl">{"\u{1F5FA}\uFE0F"}</span>
          <p className="mt-4 text-lg text-ghost-dim">No dark history locations available</p>
          <button onClick={onClose} className="mt-6 min-h-[44px] rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-6 text-sm text-accent-gold">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-dark-900 safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-600 px-4 py-3">
        <button onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ghost-dim transition-colors hover:text-ghost active:scale-90" aria-label="Close">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="font-serif text-lg font-bold text-accent-gold">What Was Here Before</h2>
        {hiddenCount > 0 ? (
          <button onClick={resetHidden} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-ghost-dim/50 hover:text-accent-gold transition-colors" title="Reset hidden entries">
            <span className="text-sm">🔄</span>
          </button>
        ) : (
          <div className="w-[44px]" />
        )}
      </div>

      {/* Location info */}
      <div className="border-b border-dark-600 bg-dark-800/40 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-base font-bold text-ghost truncate">{location.address.split(",")[0]}</h3>
            <p className="text-xs text-ghost-dim/60">
              {locationDist?.distanceKm ? formatDist(locationDist.distanceKm) : "?"} away
              {" \u2022 "}
              <span className="text-accent-red/70">{location.current_use}</span>
            </p>
            {hiddenCount > 0 && (
              <p className="mt-1 text-xs text-ghost-dim/50">
                🙈 {hiddenCount} timeline entr{hiddenCount !== 1 ? "ies" : "y"} hidden ·{" "}
                <button onClick={resetHidden} className="underline hover:text-accent-gold transition-colors">Show all</button>
              </p>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {sortedLocations.slice(0, 6).map((loc: any) => (
              <button
                key={loc.location_id}
                onClick={() => setSelectedLocation(loc.location_id)}
                className={"rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95 " + (selectedLocation === loc.location_id || (!selectedLocation && loc.location_id === sortedLocations[0]?.location_id) ? "bg-accent-red/20 text-accent-red-light border border-accent-red/30" : "bg-dark-700 text-ghost-dim border border-dark-500 hover:border-ghost-dim/30")}
                title={`${loc.address} — ${formatDist(loc.distanceKm)} away`}
              >
                {loc.address.split(",")[0].split(" ").slice(0, 2).join(" ")}
                <span className="ml-1 opacity-60">{formatDist(loc.distanceKm)}</span>
              </button>
            ))}
            {sortedLocations.length > 6 && (
              <span className="rounded-full bg-dark-800 px-3 py-1 text-xs text-ghost-dim/50 border border-dark-600">
                +{sortedLocations.length - 6} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="relative mx-auto max-w-2xl">
          <div className="absolute left-[18px] top-2 h-[calc(100%-30px)] w-0.5 bg-dark-600" />

          {visibleTimeline.map((entry, idx) => {
            const isExpanded = expandedEra === idx;
            const col = darknessColor(entry.darkness_rating);
            // Find original index for hide key
            const origIdx = location.timeline.findIndex(
              (e, i) => e.title === entry.title && e.era === entry.era && !hiddenEntries.has(`${location.location_id}:${i}`)
            );
            return (
              <div key={idx} className="relative mb-6 pl-12 cursor-pointer group" onClick={() => setExpandedEra(isExpanded ? null : idx)}>
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-2 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 transition-all duration-300 group-hover:scale-110"
                  style={{ borderColor: col, backgroundColor: col + "22" }}>
                  <span className="text-sm">{CATEGORY_ICONS[entry.category] || "\u{1F4DC}"}</span>
                </div>

                {/* Entry card */}
                <div className={"rounded-xl border bg-dark-800/60 p-4 transition-all duration-300 " + (isExpanded ? "border-accent-gold/40 shadow-glow-red" : "border-dark-600 hover:border-dark-500")}
                  style={{ borderLeftColor: col, borderLeftWidth: "3px" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-mono font-bold"
                          style={{ backgroundColor: col + "22", color: col }}>
                          {entry.era}
                        </span>
                        {entry.darkness_rating >= 8 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-red/15 px-2 py-0.5 text-xs font-medium text-red-300">
                            <span className="text-xs">{"\u{2620}\uFE0F"}</span> {darknessLabel(entry.darkness_rating)}
                          </span>
                        )}
                        {idx === 0 && entry.darkness_rating >= 9 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-red/20 px-2 py-0.5 text-xs font-bold text-red-200 animate-badge-pulse">
                            Darkest Chapter
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif text-sm font-bold leading-tight text-ghost">{entry.title}</h4>
                      {entry.date_exact && (
                        <p className="mt-0.5 text-xs text-ghost-dim/50">{entry.date_exact}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-mono"
                        style={{ backgroundColor: col + "15", color: col }}>
                        {"\u{1F4A5}"} {entry.darkness_rating}/10
                      </div>
                      {/* Hide button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); hideEntry(`${location.location_id}:${origIdx}`); }}
                        className="flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full text-ghost-dim/25 hover:text-ghost-dim/60 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                        title="Hide this entry"
                        aria-label="Hide this timeline entry"
                      >
                        ✕
                      </button>
                      <svg className={"h-5 w-5 text-ghost-dim transition-transform duration-300 " + (isExpanded ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 animate-fade-in-up">
                      <p className="text-sm leading-relaxed text-ghost/85">{entry.description}</p>
                      <div className="flex items-center gap-2 rounded-lg bg-dark-700/40 px-3 py-2">
                        <span className="text-xs shrink-0">{"\u{1F4CE}"}</span>
                        <span className="text-xs text-ghost-dim/70">Source: {entry.source}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-dark-600 bg-dark-900 py-3 text-center text-xs text-ghost-dim/40">
        Tap any era to reveal the full dark history
      </div>
    </div>
  );
}