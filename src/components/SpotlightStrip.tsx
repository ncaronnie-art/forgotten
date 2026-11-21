import { useRef, useEffect, useState, useCallback } from "react";
import type { HistoricalEvent } from "~/data/events";

interface SpotlightStripProps {
  events: HistoricalEvent[];
  onSelect: (event: HistoricalEvent) => void;
}

/** Category → color map for gradient placeholders */
const CAT_GRADIENTS: Record<string, string> = {
  crime: "linear-gradient(135deg, #4a0e0e, #1a0a0a)",
  death: "linear-gradient(135deg, #1a1a2e, #0a0a14)",
  disaster: "linear-gradient(135deg, #5c2a0a, #1a0a05)",
  mystery: "linear-gradient(135deg, #1a1040, #0a0820)",
  cemetery: "linear-gradient(135deg, #1a2e1a, #0a140a)",
  war_conflict: "linear-gradient(135deg, #3a1a0a, #1a0a05)",
  memorial: "linear-gradient(135deg, #2a2a3a, #151525)",
  prison: "linear-gradient(135deg, #2a2a2a, #151515)",
  execution: "linear-gradient(135deg, #3a1010, #1a0808)",
  riot: "linear-gradient(135deg, #3a1a0a, #1a0805)",
  historical: "linear-gradient(135deg, #2a1a10, #150a05)",
  local_legends: "linear-gradient(135deg, #1a1a3a, #0a0a20)",
};

export default function SpotlightStrip({ events, onSelect }: SpotlightStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    updateArrows();
    return () => el.removeEventListener("scroll", updateArrows);
  }, [events, updateArrows]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  if (events.length === 0) return null;

  return (
    <div className="spotlight-strip relative mb-5">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent-gold animate-mapPing" />
        <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-accent-gold/80">
          Spotlight
        </h3>
      </div>

      {/* Left arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-r-xl bg-black/60 px-3 py-4 text-accent-gold backdrop-blur-sm transition-opacity hover:bg-black/80 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Scroll left"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Cards strip */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {events.map((evt, idx) => (
          <div
            key={evt.id}
            className="spotlight-card group flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl"
            style={{
              scrollSnapAlign: "start",
              width: "min(75vw, 320px)",
              animationDelay: `${idx * 80}ms`,
            }}
            onClick={() => onSelect(evt)}
          >
            {/* Image or gradient background */}
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              {evt.imageUrl ? (
                <img
                  src={evt.imageUrl}
                  alt={evt.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: CAT_GRADIENTS[evt.category] || CAT_GRADIENTS.historical }}
                />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/30 to-transparent" />
              
              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="mb-2 inline-block rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-gold">
                  {evt.category.replace("_", " ")}
                </span>
                <h4 className="font-serif text-lg font-bold leading-tight text-ghost line-clamp-2">
                  {evt.title}
                </h4>
                <p className="mt-1 text-xs text-ghost-dim">
                  {evt.date} · {evt.year < 0 ? `${Math.abs(evt.year)} BC` : `${Math.abs(new Date().getFullYear() - evt.year)} years ago`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-l-xl bg-black/60 px-3 py-4 text-accent-gold backdrop-blur-sm transition-opacity hover:bg-black/80 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Scroll right"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
