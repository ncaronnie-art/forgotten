// ─── Past Shadows Icon Set — hand-crafted SVG icons ───
// Replaces all emoji icons throughout the app

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function mkIcon(viewBox: string, d: string, fillRule?: "evenodd") {
  return function Icon({ size = 20, className, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="currentColor"
        className={className}
        aria-hidden="true"
        fillRule={fillRule}
        {...props}
      >
        <path d={d} />
      </svg>
    );
  };
}

// ─── Category Icons ───

export const IconSkull = mkIcon(
  "0 0 24 24",
  "M12 2C9 2 6 5 6 9c0 2.5 1 5 2 6.5V17l-1 1v2l2-1 1-2h4l1 2 2 1v-2l-1-1v-1.5c1-1.5 2-4 2-6.5 0-4-3-7-6-7zm-1 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm2 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM7.5 14c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm9 0c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1z"
);

export const IconFlame = mkIcon(
  "0 0 24 24",
  "M12 2s-3 5-3 9a3 3 0 006 0c0-4-3-9-3-9zm0 14a2 2 0 100-4 2 2 0 000 4zm4-14c1 2 3 5 3 8a7 7 0 11-14 0c0-3 2-6 3-8l.5.5C7.5 4 6 7 6 10a6 6 0 0012 0c0-3-1.5-6-2.5-7.5L16 2z"
);

export const IconGhost = mkIcon(
  "0 0 24 24",
  "M12 2a8 8 0 00-8 8v10l3-2 3 2 3-2 3 2 3-2v-10a8 8 0 00-8-8zm-2 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm4 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"
);

export const IconDagger = mkIcon(
  "0 0 24 24",
  "M12 2l1.5 4h-3L12 2zM10 7l-4 4h2l-1 10h2l-.5-6h7l-.5 6h2l-1-10h2l-4-4h-4zM12 12a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"
);

export const IconChains = mkIcon(
  "0 0 24 24",
  "M3 7a2 2 0 012-2h1a2 2 0 012 2v4h8V7a2 2 0 012-2h1a2 2 0 012 2v3a4 4 0 01-4 4h-8v3a2 2 0 002 2h1a2 2 0 012 2v1a2 2 0 01-2 2H9a2 2 0 01-2-2v-1a2 2 0 012-2h1a2 2 0 002-2v-3H4a4 4 0 01-4-4V7zm4 4h12v-4h-1v3a1 1 0 01-1 1H7a1 1 0 01-1-1V7H5v4z"
);

export const IconRiot = mkIcon(
  "0 0 24 24",
  "M12 2L9 8l-4 2 4 2 3 6 3-6 4-2-4-2-3-6zm0 4.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM5 16l-1 4h4l-1-4H5zm8 0l-1 4h4l-1-4h-2zm4-2l-1 2h4l-1-2h-2z"
);

export const IconScroll = mkIcon(
  "0 0 24 24",
  "M4 2h14a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4a1 1 0 011-1h1v16h12V4H7v1H6a1 1 0 010-2h2V2h12a1 1 0 010 2zm2 4h10v1H6V6zm0 3h10v1H6V9zm0 3h7v1H6v-1z"
);

export const IconEye = mkIcon(
  "0 0 24 24",
  "M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"
);

export const IconTombstone = mkIcon(
  "0 0 24 24",
  "M8 2h8v2l4 2v4H4V6l4-2V2zm-2 10h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8zm4 2v4h4v-4h-4z"
);

export const IconWar = mkIcon(
  "0 0 24 24",
  "M6 2h12l-1 4h2l-1 4h-1.5L15 6h-3l-1 4H9l-1-4H5l-1 4H3l2-4V2h1zm-2 14l2-2v8h2v-6l2 2v4h2v-6l2-2v8h2v-8l2 2v6h2v-6l2-2v10H4v-10z"
);

export const IconMemorial = mkIcon(
  "0 0 24 24",
  "M3 21V7l6-3v17H3zm9-17l6 3v14h-6V4zm-1 4v2h2V8h-2zm0 4v2h2v-2h-2zM5 10v2h2v-2H5zm0 4v2h2v-2H5zm10-4v2h2v-2h-2zm0 4v2h2v-2h-2z"
);

export const IconExecution = mkIcon(
  "0 0 24 24",
  "M6 2l-2 8h2l-1 12h2l1-3h8l1 3h2l-1-12h2l-2-8H6zm2 4h8l1 4H7l1-4zm1 8h6l.5 2H8.5L9 14z"
);

export const IconMapPin = mkIcon(
  "0 0 24 24",
  "M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 10a3 3 0 110-6 3 3 0 010 6z"
);

// ─── UI Icons ───

export const IconPlay = mkIcon(
  "0 0 24 24",
  "M8 5v14l11-7L8 5z"
);

export const IconPause = mkIcon(
  "0 0 24 24",
  "M6 4h4v16H6V4zm8 0h4v16h-4V4z"
);

export const IconRestart = mkIcon(
  "0 0 24 24",
  "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
);

export const IconClose = mkIcon(
  "0 0 24 24",
  "M6 18L18 6M6 6l12 12"
);

export const IconExport = mkIcon(
  "0 0 24 24",
  "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
);

export const IconSearch = mkIcon(
  "0 0 24 24",
  "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
);

export const IconSpeaker = mkIcon(
  "0 0 24 24",
  "M11 5L6 9H2v6h4l5 4V5zm8.5 4.5a5 5 0 010 7M15 8a8 8 0 010 11.1"
);

export const IconSpeakerMuted = mkIcon(
  "0 0 24 24",
  "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
);

export const IconInfo = mkIcon(
  "0 0 24 24",
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
);

// ─── Category icon mapping ───
export const CATEGORY_ICON_MAP: Record<string, React.FC<IconProps>> = {
  crime: IconDagger,
  death: IconSkull,
  disaster: IconFlame,
  mystery: IconEye,
  cemetery: IconTombstone,
  war_conflict: IconWar,
  memorial: IconMemorial,
  prison: IconChains,
  execution: IconExecution,
  riot: IconRiot,
  historical: IconScroll,
  local_legends: IconGhost,
};

// ─── UI / Navigation Icons (mobile UX overhaul) ───
export const IconMenu = mkIcon(
  "0 0 24 24",
  "M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
);
export const IconFilter = mkIcon(
  "0 0 24 24",
  "M4 6h16l-6 7v5l-4 2v-7L4 6z"
);
export const IconChevronUp = mkIcon(
  "0 0 24 24",
  "M12 8l-6 6 1.5 1.5L12 11l4.5 4.5L18 14l-6-6z"
);
export const IconChevronDown = mkIcon(
  "0 0 24 24",
  "M12 16l6-6-1.5-1.5L12 13l-4.5-4.5L6 10l6 6z"
);
export const IconPlus = mkIcon(
  "0 0 24 24",
  "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z"
);
