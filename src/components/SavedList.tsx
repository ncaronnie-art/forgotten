import React, { useEffect } from "react";
import { IconClose } from "~/components/icons";

/** Saved Stories — bookmark list persisted in localStorage (ps_saved_events). */
interface SavedItem {
  id: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  distanceKm?: number;
  imageUrl?: string | null;
}

interface SavedListProps {
  events: SavedItem[];
  formatDistance: (km: number) => string;
  onOpen: (evt: SavedItem) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
  categoryDefs: readonly { id: string; label: string; icon?: React.FC<{ size?: number; className?: string }> }[];
}

export default function SavedList({ events, formatDistance, onOpen, onClose, onRemove, categoryDefs }: SavedListProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[99989] flex items-end justify-center sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-dark-500 bg-dark-800 shadow-2xl animate-slide-up sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-dark-500 sm:hidden" />
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <h2 className="font-serif text-base font-bold text-ghost">Saved Stories</h2>
            <p className="text-xs text-ghost-dim/70">
              {events.length === 0 ? "Bookmark stories to revisit them later" : `${events.length} saved`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close saved stories"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ghost-dim transition-colors hover:bg-dark-600 hover:text-ghost active:scale-90"
          >
            {React.createElement(IconClose, { size: 18 })}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 smooth-scroll">
          {events.length === 0 && (
            <div className="py-8 text-center">
              <span className="text-2xl text-accent-gold/50">☆</span>
              <p className="mt-2 text-sm text-ghost-dim">
                No saved stories yet. Tap the star on any story to bookmark it here.
              </p>
            </div>
          )}
          <div className="space-y-2">
            {events.map((evt) => {
              const def = categoryDefs.find((c) => c.id === evt.category);
              return (
                <button
                  key={evt.id}
                  onClick={() => onOpen(evt)}
                  className="flex w-full items-center gap-3 rounded-xl border border-dark-600 bg-dark-900/60 p-3 text-left transition-colors hover:border-accent-gold/40 active:scale-[0.99]"
                >
                  {evt.imageUrl ? (
                    <img src={evt.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-dark-600 object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dark-600 bg-dark-800 text-accent-gold/60">
                      {def?.icon ? React.createElement(def.icon, { size: 20 }) : "☆"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 font-serif text-sm font-bold text-ghost">{evt.title}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ghost-dim">
                      {evt.category && <span className="capitalize">{String(evt.category).replace("_", " ")}</span>}
                      {typeof evt.distanceKm === "number" && <span>· {formatDistance(evt.distanceKm)}</span>}
                      {evt.date && <span>· {evt.date}</span>}
                    </div>
                  </div>
                  <span
                    role="button"
                    aria-label={`Remove ${evt.title} from saved`}
                    onClick={(e) => { e.stopPropagation(); onRemove(evt.id); }}
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-accent-gold/70 transition-colors hover:bg-dark-700 hover:text-accent-gold active:scale-90"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.99 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
