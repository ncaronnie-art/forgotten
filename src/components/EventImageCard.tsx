import React from "react";
import type { HistoricalEvent } from "~/data/events";

const CAT_GRADIENTS: Record<string, string> = {
  crime: "linear-gradient(135deg, #4a0e0e 0%, #1a0a0a 100%)",
  death: "linear-gradient(135deg, #1a1a2e 0%, #0a0a14 100%)",
  disaster: "linear-gradient(135deg, #5c2a0a 0%, #1a0a05 100%)",
  mystery: "linear-gradient(135deg, #1a1040 0%, #0a0820 100%)",
  cemetery: "linear-gradient(135deg, #1a2e1a 0%, #0a140a 100%)",
  war_conflict: "linear-gradient(135deg, #3a1a0a 0%, #1a0a05 100%)",
  memorial: "linear-gradient(135deg, #2a2a3a 0%, #151525 100%)",
  prison: "linear-gradient(135deg, #2a2a2a 0%, #151515 100%)",
  execution: "linear-gradient(135deg, #3a1010 0%, #1a0808 100%)",
  riot: "linear-gradient(135deg, #3a1a0a 0%, #1a0805 100%)",
  historical: "linear-gradient(135deg, #2a1a10 0%, #150a05 100%)",
  local_legends: "linear-gradient(135deg, #1a1a3a 0%, #0a0a20 100%)",
};

interface EventImageCardProps {
  event: HistoricalEvent;
  isSelected?: boolean;
  isNews?: boolean;
  recentlyLabel?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onSelect?: () => void;
}

export default function EventImageCard({ event, isSelected, isNews, recentlyLabel, style, children, onSelect }: EventImageCardProps) {
  return (
    <article
      className={`event-image-card group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
        isSelected
          ? "ring-1 ring-accent-gold/50 border-accent-gold/40"
          : isNews
            ? "border-accent-blue/40 bg-accent-blue/[0.04] hover:border-accent-blue/70 hover:bg-accent-blue/[0.07]"
            : "border-dark-600 hover:border-accent-gold/30"
      }`}
      style={style}
    >
      {/* Image area — 16:9 */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: CAT_GRADIENTS[event.category] || CAT_GRADIENTS.historical }}
          />
        )}
        {/* Dark gradient overlay — bottom half */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/95 via-dark-900/30 to-dark-900/10" />
        
        {/* Overlaid title & badge for image cards */}
        {event.imageUrl && (
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
            <span className="mb-1.5 inline-block rounded-full border border-accent-gold/50 bg-accent-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-gold backdrop-blur-sm">
              {event.category.replace("_", " ")}
            </span>
            <h3
              className="font-serif text-[15px] font-bold leading-tight text-ghost line-clamp-2 cursor-pointer hover:text-accent-gold transition-colors sm:text-base"
              onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
            >
              {event.title}
            </h3>
          </div>
        )}
      </div>

      {/* Card body — shown below image for cards without images, and for news cards */}
      <div className="p-3 sm:p-4">
        {/* "Recently Reported" badge for news items */}
        {isNews && recentlyLabel && (
          <div className="mb-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-blue">
              🔥 Recently Reported
            </span>
            <span className="text-[10px] text-accent-blue/60">{recentlyLabel}</span>
          </div>
        )}

        {/* Title — only shown when no image overlay */}
        {!event.imageUrl && (
          <>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3
                className="font-serif text-[15px] font-bold leading-tight text-ghost line-clamp-2 cursor-pointer hover:text-accent-gold transition-colors sm:text-base"
                onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
              >
                {isNews && "📰 "}{event.title}
              </h3>
            </div>
            <p className="mb-1 text-xs text-ghost-dim">{event.date}</p>
          </>
        )}
        {isNews && !event.imageUrl && (
          event.date && <p className="mb-1 text-xs text-ghost-dim">{event.date}</p>
        )}

        {/* Description — only when no image */}
        {!event.imageUrl && (
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-ghost/80">
            {event.description}
          </p>
        )}

        {/* Footer: category + distance + action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {!event.imageUrl && (
              <span className="rounded-full border px-2.5 py-1 text-xs font-medium text-ghost-dim/80 border-dark-500 bg-dark-700/50">
                {event.category.charAt(0).toUpperCase() + event.category.slice(1).replace("_", " ")}
              </span>
            )}
            {isNews && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-blue/40 bg-accent-blue/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-blue">
                📰 News
              </span>
            )}
          </div>
          {/* children = action buttons */}
          {children}
        </div>
      </div>
    </article>
  );
}
