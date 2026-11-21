/**
 * Lightweight self-hosted analytics beacon.
 * No SDKs — a tiny `sendBeacon` POST to /api/analytics/track.
 *
 * Events:
 *   - "pageview"        sent on every route change (deduped per session per path)
 *   - "waitlist_signup" sent when a new email joins the waitlist
 *   - "cta_click"       reserved for future CTA tracking
 *
 * The payload carries path, referrer, a session id and a timestamp. No raw
 * emails or personal data are ever sent.
 */

let sessionId = "";

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem("ps_analytics_sid") || "";
    if (!sessionId) {
      sessionId =
        (crypto?.randomUUID?.() as string) ||
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("ps_analytics_sid", sessionId);
    }
  } catch {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return sessionId;
}

/** Paths already counted as a pageview this session (avoids double counts on hydration/re-visits). */
const countedPaths = new Set<string>();
let initialized = false;

function sessionPaths(): Set<string> {
  try {
    const raw = sessionStorage.getItem("ps_analytics_paths") || "";
    return new Set(raw.split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

function rememberPath(path: string) {
  try {
    const set = sessionPaths();
    set.add(path);
    sessionStorage.setItem("ps_analytics_paths", [...set].join(","));
  } catch {
    /* ignore */
  }
}

export type AnalyticsMeta = Record<string, string | number | boolean | undefined>;

export function track(event: string, meta?: AnalyticsMeta) {
  try {
    if (typeof window === "undefined") return;
    const path = location.pathname + location.search;
    // Dedupe pageviews per session per path. Explicit events (signups, clicks)
    // always fire.
    if (event === "pageview") {
      if (countedPaths.has(path)) return;
      if (!initialized) {
        // First run of the page — hydrate from sessionStorage so a full page
        // load doesn't double count after an SPA visit.
        const prior = sessionPaths();
        if (prior.has(path)) return;
        prior.forEach((p) => countedPaths.add(p));
        initialized = true;
      }
      countedPaths.add(path);
      rememberPath(path);
    }

    const payload = {
      event,
      path,
      ref: (document.referrer || "").slice(0, 500),
      sid: getSessionId(),
      ts: Date.now(),
      meta: meta || {},
    };

    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/track",
        new Blob([body], { type: "application/json" }),
      );
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* analytics must never break the page */
  }
}
