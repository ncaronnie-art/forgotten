// ─── ParticleOverlay — subtle floating embers/ash ───
// CSS-only, no JS animation loop — uses .particle class from app.css

import { useMemo } from "react";

interface ParticleOverlayProps {
  count?: number;
  className?: string;
}

export default function ParticleOverlay({ count = 18, className = "" }: ParticleOverlayProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `${60 + Math.random() * 40}%`,
        animationDuration: `${3 + Math.random() * 5}s`,
        animationDelay: `${Math.random() * 4}s`,
        width: `${1.5 + Math.random() * 3}px`,
        height: `${1.5 + Math.random() * 3}px`,
        background: Math.random() > 0.5
          ? `rgba(201,169,110,${0.2 + Math.random() * 0.3})`
          : `rgba(139,0,0,${0.15 + Math.random() * 0.25})`,
        boxShadow: Math.random() > 0.6
          ? "0 0 4px rgba(201,169,110,0.3)"
          : "none",
      },
    }));
  }, [count]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            ...p.style,
            "--i": p.id,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
