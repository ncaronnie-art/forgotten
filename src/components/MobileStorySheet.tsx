import React, { useCallback, useEffect, useRef, useState } from "react";
import { IconFilter, IconChevronUp, IconMapPin, IconSearch, IconPlay } from "~/components/icons";

export type SheetState = "peek" | "half" | "full";

interface CategoryDef {
  id: string;
  label: string;
  icon?: React.FC<{ size?: number; className?: string }>;
}

interface MobileStorySheetProps {
  events: any[];
  loading: boolean;
  hasLocation: boolean;
  isBlocked: boolean;
  formatDistance: (km: number) => string;
  onOpenEvent: (evt: any) => void;
  onAllowLocation: () => void;
  onSearchCity: () => void;
  onUseDemo: () => void;
  onOpenFilters: () => void;
  activeCats: string[];
  onToggleCat: (id: string) => void;
  filterCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categoryDefs: readonly CategoryDef[];
  onUpgrade: () => void;
  onOpenTrail: () => void;
  onOpenSaved: () => void;
  savedIds: string[];
  onToggleSave: (id: string) => void;
  trailCount: number;
  exploredNearbyCount: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function MobileStorySheet(props: MobileStorySheetProps) {
  const {
    events,
    loading,
    hasLocation,
    isBlocked,
    formatDistance,
    onOpenEvent,
    onAllowLocation,
    onSearchCity,
    onUseDemo,
    onOpenFilters,
    activeCats,
    onToggleCat,
    filterCount,
    searchQuery,
    onSearchChange,
    categoryDefs,
    onUpgrade,
    onOpenTrail,
    onOpenSaved,
    savedIds,
    onToggleSave,
    trailCount,
    exploredNearbyCount,
  } = props;

  const [state, setState] = useState<SheetState>("peek");
  const [height, setHeight] = useState<number>(() => (typeof window === "undefined" ? 280 : Math.min(280, window.innerHeight * 0.42)));
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);
  const [visibleCount, setVisibleCount] = useState(5);

  const vh = () => (typeof window === "undefined" ? 812 : window.innerHeight);
  const HEADER_PX = 64; // approximate compact header height to leave visible in full state

  const heights = useCallback((): Record<SheetState, number> => {
    const h = vh();
    return {
      peek: Math.min(280, Math.round(h * 0.42)),
      half: Math.round(h * 0.58),
      full: Math.max(h - HEADER_PX, Math.round(h * 0.7)),
    };
  }, []);

  const snapTo = useCallback((s: SheetState) => {
    setState(s);
    setHeight(heights()[s]);
  }, [heights]);

  // Re-clamp height when viewport resizes
  useEffect(() => {
    const onResize = () => {
      setHeight(() => {
        const hh = heights();
        if (state === "peek") return hh.peek;
        if (state === "half") return hh.half;
        return hh.full;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [state, heights]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartH.current = height;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const hh = heights();
    const delta = dragStartY.current - e.clientY; // drag up → grow
    setHeight(clamp(dragStartH.current + delta, hh.peek, hh.full));
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const hh = heights();
    const h = height;
    // Snap to nearest of the three states
    const targets: [SheetState, number][] = [
      ["peek", hh.peek],
      ["half", hh.half],
      ["full", hh.full],
    ];
    let best: SheetState = "peek";
    let bestDist = Infinity;
    for (const [s, th] of targets) {
      const d = Math.abs(h - th);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    snapTo(best);
  };

  const onHandleTap = () => {
    const order: SheetState[] = ["peek", "half", "full"];
    const next = order[(order.indexOf(state) + 1) % order.length];
    snapTo(next);
  };

  const visibleEvents = events.slice(0, visibleCount);
  const hasMore = visibleCount < events.length;

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[1200] flex flex-col rounded-t-3xl border-t border-x border-dark-500/60 bg-dark-800/95 shadow-2xl backdrop-blur-xl safe-bottom"
      style={{
        height,
        transition: dragging ? "none" : "height 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
        touchAction: "none",
      }}
    >
      {/* ─── Drag handle ─── */}
      <div
        className="flex shrink-0 cursor-grab flex-col items-center pt-2 pb-1 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onHandleTap}
        role="button"
        aria-label="Drag to resize story list"
      >
        <div className="h-1.5 w-12 rounded-full bg-dark-500" />
        <div className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-ghost-dim/50">
          <IconChevronUp size={12} />
          <span>drag</span>
        </div>
      </div>

      {/* ─── Header row: title + Trail / Saved / Filters buttons ─── */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1">
        <div className="min-w-0">
          <h2 className="font-serif text-base font-bold text-ghost">Nearby Stories</h2>
          <p className="text-sm text-ghost-dim">
            {exploredNearbyCount > 0
              ? `You've explored ${exploredNearbyCount} ${exploredNearbyCount === 1 ? "story" : "stories"} nearby`
              : `${events.length} found`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onOpenTrail}
            disabled={trailCount === 0}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-accent-gold/40 bg-accent-gold/15 px-3.5 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25 active:scale-95 disabled:opacity-40"
            aria-label="Open Tonight's Trail"
          >
            <IconPlay size={15} />
            <span className="hidden min-[380px]:inline">Trail</span>
          </button>
          <button
            onClick={onOpenSaved}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-dark-500 bg-dark-700/60 text-accent-gold/80 transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-95"
            aria-label="Saved stories"
          >
            <svg className="h-4 w-4" fill={savedIds.length > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.99 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            onClick={onOpenFilters}
            className={`flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors active:scale-95 ${
              filterCount > 0
                ? "border-accent-gold/60 bg-accent-gold/15 text-accent-gold"
                : "border-dark-500 bg-dark-700/60 text-ghost-dim hover:border-accent-gold/40 hover:text-accent-gold"
            }`}
            aria-label="Open filters"
          >
            <IconFilter size={16} />
            <span>Filters{filterCount > 0 ? ` (${filterCount})` : ""}</span>
          </button>
        </div>
      </div>
      {/* Explored progress bar (lightweight) */}
      {exploredNearbyCount > 0 && (
        <div className="shrink-0 px-4 pb-1">
          <div className="h-1 overflow-hidden rounded-full bg-dark-600">
            <div
              className="h-full rounded-full bg-accent-gold/80 transition-all duration-500"
              style={{ width: `${Math.min(100, (exploredNearbyCount / Math.max(1, trailCount)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── Search input ─── */}
      <div className="shrink-0 px-4 pb-1">
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost-dim" />
          <input
            type="text"
            placeholder="Search events, places, years..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-dark-600 bg-dark-900/70 pl-9 pr-4 text-base text-ghost placeholder-ghost-dim/50 transition-colors focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full text-ghost-dim hover:text-ghost"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── Category chip rail ─── */}
      <div className="shrink-0 overflow-x-auto px-4 py-1 scrollbar-none">
        <div className="flex gap-1.5">
          <button
            onClick={() => onToggleCat("all")}
            className={`flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-all active:scale-95 ${
              activeCats.length === 0
                ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:text-ghost"
            }`}
          >
            All
          </button>
          {categoryDefs.filter((c) => c.id !== "all").map((cat) => {
            const active = activeCats.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => onToggleCat(cat.id)}
                className={`flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-all active:scale-95 ${
                  active
                    ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                    : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:text-ghost"
                }`}
              >
                {cat.icon ? React.createElement(cat.icon, { size: 14 }) : null}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Scrollable card list ─── */}
      <div className="smooth-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1" style={{ touchAction: "pan-y" }}>
        {/* Free tier blocked banner */}
        {isBlocked && (
          <button
            onClick={onUpgrade}
            className="mb-3 flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-4 text-left text-sm font-bold text-accent-gold active:scale-[0.99]"
          >
            <span>Free limit reached — go Pro for unlimited stories</span>
            <IconPlay size={16} />
          </button>
        )}

        {/* Location denied / no location */}
        {!hasLocation && !loading && (
          <div className="py-4 text-center">
            <p className="text-base text-ghost-dim">Allow location to see nearby stories — or pick one:</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={onAllowLocation}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 text-sm font-bold text-accent-gold active:scale-95"
              >
                <IconMapPin size={18} /> Allow location
              </button>
              <button
                onClick={onSearchCity}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dark-500 bg-dark-700/50 text-sm text-ghost-dim hover:text-ghost active:scale-95"
              >
                <IconSearch size={16} /> Search a city
              </button>
              <button
                onClick={onUseDemo}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dark-500 bg-dark-700/50 text-sm text-ghost-dim hover:text-ghost active:scale-95"
              >
                <IconMapPin size={16} /> Use New York demo
              </button>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && events.length === 0 && (
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-xl border border-dark-600 bg-dark-800/70 p-3 animate-shimmer">
                <div className="skeleton h-4 w-2/3 mb-2"></div>
                <div className="skeleton h-3 w-1/3 mb-1"></div>
                <div className="skeleton h-3 w-full"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty with location */}
        {hasLocation && !loading && events.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-base text-ghost-dim">
              {searchQuery ? `No stories match "${searchQuery}".` : "No dark history found near this spot yet."}
            </p>
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="mt-3 min-h-[44px] rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-5 text-sm text-accent-gold active:scale-95"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Compact story cards */}
        {events.length > 0 && (
          <div className="space-y-2">
            {visibleEvents.map((evt, idx) => (
              <button
                key={evt.id}
                onClick={() => onOpenEvent(evt)}
                className="block w-full rounded-xl border border-dark-600 bg-dark-800/60 p-3 text-left transition-colors hover:border-accent-gold/40 active:scale-[0.99]"
                style={{ animationDelay: `${(idx % 6) * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-ghost">
                    {evt.title}
                  </h3>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                    <span className="text-accent-gold/80">
                      {(() => {
                        const def = categoryDefs.find((c) => c.id === evt.category);
                        return def?.icon ? React.createElement(def.icon, { size: 18 }) : null;
                      })()}
                    </span>
                    <span
                      role="button"
                      aria-label={savedIds.includes(evt.id) ? "Remove from saved" : "Save story"}
                      aria-pressed={savedIds.includes(evt.id)}
                      onClick={(e) => { e.stopPropagation(); onToggleSave(evt.id); }}
                      className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full border transition-colors active:scale-90 ${
                        savedIds.includes(evt.id)
                          ? "border-accent-gold/60 bg-accent-gold/15 text-accent-gold"
                          : "border-dark-500 bg-dark-700/50 text-ghost-dim/60 hover:text-accent-gold"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill={savedIds.includes(evt.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.99 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ghost-dim">
                  <span className="rounded-full border border-dark-500 bg-dark-700/50 px-2 py-0.5 capitalize">
                    {String(evt.category).replace("_", " ")}
                  </span>
                  <span>{typeof evt.distanceKm === "number" ? formatDistance(evt.distanceKm) : ""}</span>
                  <span>·</span>
                  <span>{evt.date}</span>
                  {(evt as any).recentlyLabel && <span className="text-accent-blue">· {evt.recentlyLabel}</span>}
                </div>
                <p className="mt-1.5 line-clamp-2 text-base leading-relaxed text-ghost/75">{evt.description}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-accent-gold">
                  Open story <IconChevronUp size={14} className="rotate-90" />
                </span>
              </button>
            ))}

            {/* Load more — free tier: gated by isBlocked (5-event cap); surfaces upgrade prompt */}
            {hasMore && (
              <button
                onClick={isBlocked ? onUpgrade : () => setVisibleCount((c) => c + 10)}
                aria-label={isBlocked ? "Upgrade to Pro to see more stories" : "Load more stories"}
                className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors active:scale-[0.99] ${
                  isBlocked
                    ? "border-accent-gold/40 bg-accent-gold/10 font-bold text-accent-gold hover:bg-accent-gold/15"
                    : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:text-ghost"
                }`}
              >
                {isBlocked
                  ? `Go Pro to see ${events.length - visibleCount} more stories`
                  : `Load more (${events.length - visibleCount} more)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
