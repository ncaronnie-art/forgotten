import React from "react";
import { IconClose, IconFilter } from "~/components/icons";

export type SortMode = "distance" | "date-desc" | "date-asc";

interface CategoryDef {
  id: string;
  label: string;
  icon?: React.FC<{ size?: number; className?: string }>;
}

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  categoryDefs: readonly CategoryDef[];
  activeCats: string[];
  onToggleCat: (id: string) => void;
  radiusKm: number | null;
  setRadiusKm: (r: number | null) => void;
  minYear: number | null;
  maxYear: number | null;
  setMinYear: (y: number | null) => void;
  setMaxYear: (y: number | null) => void;
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  onReset: () => void;
  filterCount: number;
  contentPref: string;
  setContentPref: (v: string) => void;
}

const RADIUS_OPTIONS: { label: string; km: number | null }[] = [
  { label: "Any", km: null },
  { label: "1 mi", km: 1.609 },
  { label: "3 mi", km: 4.828 },
  { label: "5 mi", km: 8.047 },
  { label: "10 mi", km: 16.093 },
  { label: "25 mi", km: 40.234 },
];

const DATE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Any time", min: null, max: null },
  { label: "Before 1800", min: null, max: 1799 },
  { label: "1800s", min: 1800, max: 1899 },
  { label: "1900s", min: 1900, max: 1999 },
  { label: "2000+", min: 2000, max: null },
];

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "distance", label: "Nearest" },
  { id: "date-desc", label: "Newest" },
  { id: "date-asc", label: "Oldest" },
];

export default function FiltersSheet({
  open,
  onClose,
  categoryDefs,
  activeCats,
  onToggleCat,
  radiusKm,
  setRadiusKm,
  minYear,
  maxYear,
  setMinYear,
  setMaxYear,
  sortMode,
  setSortMode,
  onReset,
  filterCount,
  contentPref,
  setContentPref,
}: FiltersSheetProps) {
  if (!open) return null;

  const datePresetActive = (p: { min: number | null; max: number | null }) =>
    minYear === p.min && maxYear === p.max;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Filter events"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet / Modal */}
      <div
        className="relative w-full max-w-lg rounded-t-3xl border border-dark-500 bg-dark-800 p-5 shadow-2xl animate-slide-up sm:rounded-2xl sm:mx-4 safe-bottom"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "85vh" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-dark-500 sm:hidden" />
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ghost-dim transition-colors hover:bg-dark-600 hover:text-ghost active:scale-90"
          aria-label="Close filters"
        >
          <IconClose size={18} />
        </button>

        <div className="flex items-center gap-2 pr-12">
          <IconFilter size={18} className="text-accent-gold" />
          <h2 className="font-serif text-lg font-bold text-ghost">
            Filters{filterCount > 0 ? ` (${filterCount} active)` : ""}
          </h2>
        </div>

        <div className="mt-4 max-h-[62vh] space-y-5 overflow-y-auto pr-1 smooth-scroll">
          {/* Categories */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ghost-dim/60">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (activeCats.length > 0) onToggleCat("all");
                }}
                className={`flex min-h-[44px] items-center gap-1 rounded-full border px-3.5 text-sm font-medium transition-all active:scale-95 ${
                  activeCats.length === 0
                    ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                    : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:text-ghost"
                }`}
              >
                All
              </button>
              {categoryDefs
                .filter((c) => c.id !== "all")
                .map((cat) => {
                  const active = activeCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => onToggleCat(cat.id)}
                      className={`flex min-h-[44px] items-center gap-1 rounded-full border px-3.5 text-sm font-medium transition-all active:scale-95 ${
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

          {/* Distance */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ghost-dim/60">Distance</h3>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((opt) => {
                const active = radiusKm === opt.km;
                return (
                  <button
                    key={opt.label}
                    onClick={() => setRadiusKm(opt.km)}
                    className={`flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                        : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:text-ghost"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ghost-dim/60">Time Period</h3>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => {
                const active = datePresetActive(preset);
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setMinYear(preset.min);
                      setMaxYear(preset.max);
                    }}
                    className={`flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                        : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:text-ghost"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ghost-dim/60">Sort</h3>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => {
                const active = sortMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSortMode(opt.id)}
                    className={`flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                        : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:text-ghost"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Content preference */}
          <div className="mt-5 border-t border-dark-600/50 pt-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ghost-dim/60">Content level</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "historical", label: "Historical", hint: "Safe" },
                { id: "mature", label: "Mature", hint: "Dark themes" },
                { id: "graphic", label: "Graphic Detail", hint: "18+" },
              ].map((opt) => {
                const active = contentPref === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setContentPref(opt.id)}
                    title={opt.hint}
                    className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                        : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:text-ghost"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ghost-dim/60">
              Historical keeps descriptions brief. Graphic Detail shows explicit content.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onReset}
            className="flex min-h-[48px] items-center justify-center rounded-xl border border-dark-500 bg-dark-700/50 px-5 text-sm font-medium text-ghost-dim transition-colors hover:bg-dark-600 hover:text-ghost active:scale-95"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="btn-glow flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-accent-gold/40 bg-accent-gold/15 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
