import React, { useEffect } from "react";
import { IconClose, IconMapPin, IconPlay } from "~/components/icons";

/**
 * Tonight's Trail — curated ~3 nearby stories (guided engagement).
 * Mobile bottom sheet / desktop modal. Kept lightweight: no heavy gamification,
 * just a clear "3 stories near you" hook + explored progress.
 */
interface TrailItem {
  id: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  distanceKm?: number;
  imageUrl?: string | null;
}

interface TrailPanelProps {
  events: TrailItem[];
  formatDistance: (km: number) => string;
  onOpen: (evt: TrailItem) => void;
  onClose: () => void;
  exploredIds: string[];
  onToggleExplored: (id: string) => void;
  categoryDefs: readonly { id: string; label: string; icon?: React.FC<{ size?: number; className?: string }> }[];
}

export default function TrailPanel({
  events,
  formatDistance,
  onOpen,
  onClose,
  exploredIds,
  onToggleExplored,
  categoryDefs,
}: TrailPanelProps) {
  // Lock body scroll while open (mobile)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const doneHere = events.filter((e) => exploredIds.includes(e.id)).length;

  return (
    <div className="fixed inset-0 z-[99990] flex items-end justify-center sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-dark-500 bg-dark-800 shadow-2xl animate-slide-up sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag-handle visual */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-dark-500 sm:hidden" />
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent-gold/40 bg-accent-gold/10 text-accent-gold">
              {React.createElement(IconPlay, { size: 16 })}
            </span>
            <div>
              <h2 className="font-serif text-base font-bold text-ghost">Tonight's Trail</h2>
              <p className="text-xs text-ghost-dim/70">
                {events.length > 0
                  ? `${events.length} curated ${events.length === 1 ? "story" : "stories"} near you`
                  : "Curated stories for your location"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Tonight's Trail"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ghost-dim transition-colors hover:bg-dark-600 hover:text-ghost active:scale-90"
          >
            {React.createElement(IconClose, { size: 18 })}
          </button>
        </div>

        {/* Explored progress (lightweight) */}
        {events.length > 0 && (
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ghost-dim/80">
                Explored {doneHere} of {events.length} on this trail
              </span>
              <span className="text-accent-gold/80">
                {doneHere === events.length ? "Trail complete ✦" : `${Math.round((doneHere / events.length) * 100)}%`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-dark-600">
              <div
                className="h-full rounded-full bg-accent-gold transition-all duration-500"
                style={{ width: `${(doneHere / Math.max(1, events.length)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Trail stories */}
        <div className="flex-1 overflow-y-auto px-5 py-4 smooth-scroll">
          {events.length === 0 && (
            <p className="py-6 text-center text-sm text-ghost-dim">
              No nearby stories yet. Allow location or search a city, then reopen Tonight's Trail.
            </p>
          )}
          <div className="space-y-3">
            {events.map((evt, idx) => {
              const def = categoryDefs.find((c) => c.id === evt.category);
              const explored = exploredIds.includes(evt.id);
              return (
                <div
                  key={evt.id}
                  className="rounded-xl border border-dark-600 bg-dark-900/60 p-4 transition-colors hover:border-accent-gold/40"
                >
                  <div className="flex items-start gap-3">
                    {evt.imageUrl ? (
                      <img
                        src={evt.imageUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg border border-dark-600 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dark-600 bg-dark-800/80 text-accent-gold/70">
                        {def?.icon ? React.createElement(def.icon, { size: 22 }) : React.createElement(IconMapPin, { size: 22 })}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 font-serif text-sm font-bold leading-snug text-ghost">{evt.title}</h3>
                        <button
                          onClick={() => onToggleExplored(evt.id)}
                          aria-label={explored ? "Mark as not explored" : "Mark as explored"}
                          aria-pressed={explored}
                          title={explored ? "Explored" : "Mark as explored"}
                          className={`flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-full border transition-colors active:scale-90 ${
                            explored
                              ? "border-accent-gold/60 bg-accent-gold/15 text-accent-gold"
                              : "border-dark-500 bg-dark-700/50 text-ghost-dim/60 hover:text-ghost"
                          }`}
                        >
                          <svg className="h-4 w-4" fill={explored ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ghost-dim">
                        {evt.category && (
                          <span className="rounded-full border border-dark-500 bg-dark-700/50 px-2 py-0.5 capitalize">
                            {String(evt.category).replace("_", " ")}
                          </span>
                        )}
                        {typeof evt.distanceKm === "number" && <span>{formatDistance(evt.distanceKm)}</span>}
                        {evt.date && <span>· {evt.date}</span>}
                      </div>
                      {evt.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ghost/70">{evt.description}</p>
                      )}
                      <button
                        onClick={() => onOpen(evt)}
                        className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-accent-gold/40 bg-accent-gold/10 px-3 text-xs font-bold text-accent-gold transition-colors hover:bg-accent-gold/20 active:scale-95"
                      >
                        <span className="font-serif">#{idx + 1}</span> Read story
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
