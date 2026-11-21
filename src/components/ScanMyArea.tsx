import { useState, useCallback, useRef } from "react";

interface ScanCandidate {
  id: string;
  title: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  source: string;
  sourceUrl: string;
  year: number;
  relevance: number;
}

interface ScanMyAreaProps {
  lat: number;
  lng: number;
  userTier: string;
  userToken: string;
  onClose: () => void;
  onEventGenerated: (event: any) => void;
}

const RADIUS_OPTIONS = [0.25, 0.5, 0.75, 1.0] as const;

const SOURCE_EMOJIS: Record<string, string> = {
  Wikipedia: "📚",
  OpenStreetMap: "🗺️",
  ChroniclingAmerica: "📰",
};

export default function ScanMyArea({ lat, lng, userTier, userToken, onClose, onEventGenerated }: ScanMyAreaProps) {
  const [radius, setRadius] = useState<number>(0.5);
  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState<Set<string>>(new Set());
  const [sourcesQueried, setSourcesQueried] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const scanRef = useRef<HTMLDivElement>(null);

  const isPro = userTier !== "free";

  // ─── Start scan ───
  const handleScan = useCallback(async () => {
    if (!isPro) {
      setShowUpsell(true);
      return;
    }
    setScanning(true);
    setError(null);
    setCandidates([]);
    setSelected(new Set());
    setSourcesQueried([]);

    try {
      const res = await fetch("/api/scan-area", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ lat, lng, radiusMiles: radius }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCandidates(data.candidates || []);
        setSourcesQueried(data.sourcesQueried || []);
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setScanning(false);
    }
  }, [lat, lng, radius, isPro]);

  // ─── Toggle selection ───
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Generate details for selected ───
  const handleGenerate = useCallback(async () => {
    const toGenerate = candidates.filter((c) => selected.has(c.id) && !generated.has(c.id));
    for (const candidate of toGenerate) {
      setGenerating((prev) => new Set(prev).add(candidate.id));
      try {
        const res = await fetch("/api/scan-area/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
          body: JSON.stringify(candidate),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error((errData as any).error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.event) {
          onEventGenerated(data.event);
          setGenerated((prev) => new Set(prev).add(candidate.id));
        }
      } catch (err: any) {
        console.error("Generate failed:", err?.message || err);
        setError("Failed to generate details for " + candidate.title + ". Try again.");
      } finally {
        setGenerating((prev) => {
          const next = new Set(prev);
          next.delete(candidate.id);
          return next;
        });
      }
    }
  }, [candidates, selected, generated, onEventGenerated]);

  // ─── Select all ───
  const selectAll = useCallback(() => {
    if (selected.size === candidates.filter((c) => !generated.has(c.id)).length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.filter((c) => !generated.has(c.id)).map((c) => c.id)));
    }
  }, [candidates, selected, generated]);

  return (
    <div className="glass-panel fixed inset-x-4 bottom-4 z-[9999] max-h-[70vh] overflow-hidden rounded-2xl border border-dark-500 shadow-2xl sm:inset-x-auto sm:left-4 sm:right-auto sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <h3 className="font-serif text-base font-bold text-accent-gold">Scan My Area</h3>
        </div>
        <button
          onClick={onClose}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ghost-dim/60 hover:text-ghost hover:bg-dark-600 active:scale-90"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: "calc(70vh - 60px)" }}>
        {/* Radius slider */}
        <div className="mb-4">
          <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ghost-dim/60">
            <span>Scan Radius</span>
            <span className="font-mono text-accent-gold">{radius} mi</span>
          </label>
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={RADIUS_OPTIONS.indexOf(radius as typeof RADIUS_OPTIONS[number])}
            onChange={(e) => setRadius(RADIUS_OPTIONS[parseInt(e.target.value)] || 0.5)}
            className="scan-slider w-full"
            disabled={scanning}
          />
          <div className="mt-1 flex justify-between text-[10px] text-ghost-dim/40">
            {RADIUS_OPTIONS.map((r) => (
              <span key={r} className={radius === r ? "text-accent-gold" : ""}>{r}</span>
            ))}
          </div>
        </div>

        {/* Scan button / Radar animation */}
        <div ref={scanRef} className="mb-4">
          <button
            onClick={handleScan}
            disabled={scanning}
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
              scanning
                ? "border-accent-gold/30 bg-accent-gold/10 text-accent-gold cursor-wait"
                : isPro
                  ? "btn-glow border-accent-gold/40 bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25"
                  : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:border-accent-gold/30"
            }`}
          >
            {scanning ? (
              <>
                <span className="scan-radar inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent-gold/30 border-t-accent-gold" />
                <span>Scanning...</span>
              </>
            ) : isPro ? (
              <>
                <span>🔍</span>
                <span>Scan Now</span>
              </>
            ) : (
              <>
                <span>⭐</span>
                <span>Scan My Area (Pro)</span>
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 underline">Dismiss</button>
          </div>
        )}

        {/* Sources queried */}
        {sourcesQueried.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {sourcesQueried.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-accent-blue/30 bg-accent-blue/10 px-2 py-0.5 text-[10px] text-accent-blue">
                {SOURCE_EMOJIS[s] || "📊"} {s}
              </span>
            ))}
          </div>
        )}

        {/* Results */}
        {candidates.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-ghost-dim">
                <span className="font-bold text-ghost">{candidates.length}</span> results
              </p>
              <button
                onClick={selectAll}
                className="text-xs text-accent-gold/70 hover:text-accent-gold transition-colors min-h-[36px] px-2"
              >
                {selected.size === candidates.filter((c) => !generated.has(c.id)).length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="space-y-2">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl border p-3 transition-all duration-200 ${
                    selected.has(c.id)
                      ? "border-accent-gold/40 bg-accent-gold/5"
                      : generated.has(c.id)
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-dark-600 bg-dark-700/30 hover:border-dark-500"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => !generated.has(c.id) && toggleSelect(c.id)}
                      disabled={generated.has(c.id)}
                      className={`mt-0.5 flex min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        selected.has(c.id)
                          ? "border-accent-gold bg-accent-gold text-dark-900"
                          : generated.has(c.id)
                            ? "border-green-500 bg-green-500 text-dark-900"
                            : "border-dark-500 hover:border-accent-gold/50"
                      }`}
                    >
                      {selected.has(c.id) ? "✓" : generated.has(c.id) ? "✓" : ""}
                    </button>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif text-sm font-bold leading-tight text-ghost line-clamp-2">
                        {c.title}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-dark-500 bg-dark-800 px-2 py-0.5 text-[10px] text-ghost-dim">
                          {c.category.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-ghost-dim/50">
                          {SOURCE_EMOJIS[c.source] || ""} {c.source}
                        </span>
                        {c.year > 0 && (
                          <span className="text-[10px] text-ghost-dim/50">{c.year}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ghost-dim/70 line-clamp-2">
                        {c.description}
                      </p>
                    </div>
                    {generating.has(c.id) && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-gold/30 border-t-accent-gold shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Generate button */}
            {selected.size > 0 && (
              <button
                onClick={handleGenerate}
                disabled={generating.size > 0}
                className="btn-glow mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 text-sm font-bold text-accent-gold transition-all hover:bg-accent-gold/25 active:scale-95 disabled:opacity-50"
              >
                {generating.size > 0 ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-gold/30 border-t-accent-gold" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate {selected.size} Event{selected.size !== 1 ? "s" : ""}</span>
                  </>
                )}
              </button>
            )}
          </>
        )}

        {/* Empty state after scan */}
        {!scanning && candidates.length === 0 && sourcesQueried.length > 0 && !error && (
          <p className="py-6 text-center text-sm text-ghost-dim/60">
            No historical events found in this area. Try a larger radius.
          </p>
        )}
      </div>

      {/* Premium upsell modal */}
      {showUpsell && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-dark-900/95 backdrop-blur-sm p-6">
          <div className="text-center">
            <span className="text-4xl">⭐</span>
            <h3 className="mt-3 font-serif text-lg font-bold text-accent-gold">Pro Feature</h3>
            <p className="mt-2 text-sm leading-relaxed text-ghost-dim">
              Scan My Area lets you discover hidden history from Wikipedia, historical archives, and public records — right where you're standing.
            </p>
            <p className="mt-2 text-xs text-ghost-dim/50">
              $6.99/month or $49.99/year
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowUpsell(false)}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-dark-500 bg-dark-700 text-sm text-ghost-dim transition-colors hover:bg-dark-600 active:scale-95"
              >
                Maybe Later
              </button>
              <a
                href="/auth"
                className="btn-glow flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-accent-gold/40 bg-accent-gold/15 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25 active:scale-95"
              >
                Upgrade to Pro
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
