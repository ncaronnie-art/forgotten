import { useState } from "react";
import type { ComponentType } from "react";
import { IconDagger, IconSkull, IconFlame, IconEye, IconTombstone, IconWar, IconMemorial, IconChains, IconExecution, IconRiot, IconScroll, IconGhost } from "~/components/icons";

export interface CategoryOption {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "crime", label: "Crime", icon: IconDagger },
  { id: "death", label: "Death", icon: IconSkull },
  { id: "disaster", label: "Disaster", icon: IconFlame },
  { id: "war_conflict", label: "War & Conflict", icon: IconWar },
  { id: "memorial", label: "Memorial", icon: IconMemorial },
  { id: "prison", label: "Prison", icon: IconChains },
  { id: "execution", label: "Execution", icon: IconExecution },
  { id: "riot", label: "Riot", icon: IconRiot },
  { id: "historical", label: "Historical", icon: IconScroll },
  { id: "mystery", label: "Mystery", icon: IconEye },
  { id: "cemetery", label: "Cemetery", icon: IconTombstone },
  { id: "local_legends", label: "Legends & Lore", icon: IconGhost },
];

const CATEGORY_COLORS: Record<string, string> = {
  crime: "#ef4444",
  death: "#9ca3af",
  disaster: "#f97316",
  war_conflict: "#f59e0b",
  memorial: "#eab308",
  prison: "#94a3b8",
  execution: "#ef4444",
  riot: "#f97316",
  historical: "#d97706",
  mystery: "#a855f7",
  cemetery: "#22c55e",
  local_legends: "#c084fc",
};

interface CategoryPreferencePickerProps {
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
}

export default function CategoryPreferencePicker({ onConfirm, onClose }: CategoryPreferencePickerProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(CATEGORY_OPTIONS.map((c) => c.id))
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // prevent deselecting all
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(selected));
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm safe-bottom" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-dark-600 bg-dark-900/95 backdrop-blur-xl p-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 text-center">
          <h2 className="font-serif text-xl font-bold text-accent-gold text-glow">
            What Are You Curious About?
          </h2>
          <p className="mt-2 text-sm text-ghost-dim">
            Pick the kinds of history you want to explore. We'll only show those.
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selected.has(cat.id);
            const color = CATEGORY_COLORS[cat.id] || "#6b7280";
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => toggle(cat.id)}
                className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 active:scale-[0.97] touch-manipulation ${
                  isSelected
                    ? "border-accent-gold/40 bg-accent-gold/10 text-ghost"
                    : "border-dark-600 bg-dark-800/40 text-ghost-dim/50"
                }`}
                style={isSelected ? { borderColor: color + "66", backgroundColor: color + "18" } : {}}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-dark-700/60">
                  <Icon size={16} className={isSelected ? "" : "opacity-40"} style={isSelected ? { color } : {}} />
                </span>
                <span className="text-sm font-medium">{cat.label}</span>
                {isSelected && (
                  <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-gold/20">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-accent-gold">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Counter */}
        <p className="mb-4 text-center text-xs text-ghost-dim/60">
          {selected.size} of {CATEGORY_OPTIONS.length} categories selected
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-dark-600 bg-dark-800/60 text-ghost-dim text-sm font-medium transition-colors hover:bg-dark-700/60 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] min-h-[48px] rounded-xl border border-accent-gold/40 bg-accent-gold/15 text-accent-gold text-sm font-bold transition-all duration-200 hover:bg-accent-gold/25 hover:shadow-glow-red active:scale-[0.97] btn-glow"
          >
            Show Me →
          </button>
        </div>
      </div>
    </div>
  );
}
