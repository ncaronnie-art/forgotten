/**
 * Content preference — 3-level filter (Historical / Mature / Graphic Detail).
 * Stored as ps_content_pref in localStorage; default = "historical" (conservative).
 *
 * NOTE (future data task): the 719 curated events do not have per-event content
 * ratings yet. This preference is applied as rendering-level gating:
 *  - "historical" (default): description collapsed in story view behind
 *    "Sensitive content — tap to reveal"; cards stay short.
 *  - "mature": full descriptions shown.
 *  - "graphic": full descriptions shown (and future per-event images when rated).
 * TODO: add per-event content ratings (e.g. a `content_rating` field) to the
 * curated data as a follow-up data task; then gate per-event, not level-wide.
 */
export type ContentPref = "historical" | "mature" | "graphic";

export const CONTENT_PREFS: { id: ContentPref; label: string; hint: string }[] = [
  { id: "historical", label: "Historical", hint: "Facts & context — graphic details hidden" },
  { id: "mature", label: "Mature", hint: "Full descriptions with dark themes" },
  { id: "graphic", label: "Graphic Detail", hint: "Explicit violence & gore — 18+" },
];

interface ContentPreferencePickerProps {
  value: ContentPref;
  onChange: (v: ContentPref) => void;
  compact?: boolean;
}

export default function ContentPreferencePicker({ value, onChange, compact }: ContentPreferencePickerProps) {
  return (
    <div>
      {!compact && (
        <p className="mb-2 text-xs text-ghost-dim/80">
          Some locations have sensitive content. Choose how much detail to show.
        </p>
      )}
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Content preference">
        {CONTENT_PREFS.map((p) => {
          const active = value === p.id;
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(p.id)}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-3.5 py-2 text-left transition-all duration-200 active:scale-[0.99] ${
                active
                  ? "border-accent-gold bg-accent-gold/15 shadow-glow-red"
                  : "border-dark-600 bg-dark-800/60 hover:border-dark-500"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  active ? "border-accent-gold" : "border-dark-500"
                }`}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-accent-gold" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-bold ${active ? "text-accent-gold" : "text-ghost"}`}>{p.label}</span>
                {!compact && <span className="block text-xs text-ghost-dim/70">{p.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
