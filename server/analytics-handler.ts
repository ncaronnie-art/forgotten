/**
 * Lightweight self-hosted analytics.
 *
 * POST /api/analytics/track   — client beacon (sendBeacon). Records a hit.
 * GET  /api/analytics/summary — aggregated stats for the internal dashboard.
 *
 * Storage: /home/team/shared/data/analytics.json (append-only hits log, capped).
 * No SDKs, no external services, no personal data (raw emails never sent).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = "/home/team/shared/data";
const FILE = join(DATA_DIR, "analytics.json");
const MAX_HITS = 50_000; // prune oldest beyond this

type Hit = {
  ts: number;
  event: string; // "pageview" | "waitlist_signup" | ...
  path: string;
  ref: string; // raw referrer ("" = direct / none)
  refDomain: string; // classified source label
  sid: string; // anonymous session id
  meta: Record<string, string | number | boolean | undefined>;
};

type Store = { hits: Hit[] };

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function load(): Store {
  ensureDir();
  try {
    if (existsSync(FILE)) {
      const parsed = JSON.parse(readFileSync(FILE, "utf-8"));
      if (Array.isArray(parsed.hits)) return parsed as Store;
    }
  } catch (e) {
    console.error("analytics: error reading store:", e);
  }
  return { hits: [] };
}

function save(store: Store) {
  ensureDir();
  try {
    writeFileSync(FILE, JSON.stringify(store), "utf-8");
  } catch (e) {
    console.error("analytics: error writing store:", e);
  }
}

/** Map a raw referrer URL to a short source label for reporting. */
export function classifyReferrer(raw: string): string {
  if (!raw) return "direct";
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const SITE_HOST = "pastshadows.ctonew.app";
    if (host === SITE_HOST || host === "localhost") return "internal";
    if (host === "x.com" || host === "twitter.com") return "x/twitter";
    if (host === "tiktok.com") return "tiktok";
    if (host === "reddit.com") return "reddit";
    if (host.endsWith("reddit.com")) return "reddit";
    if (host === "facebook.com") return "facebook";
    if (host === "instagram.com") return "instagram";
    if (host === "youtube.com") return "youtube";
    if (host === "t.co" || host === "bit.ly") return "x/twitter";
    if (host === "google.com" || host.endsWith(".google.com")) return "google";
    if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
    if (host === "duckduckgo.com") return "duckduckgo";
    return host;
  } catch {
    return raw.slice(0, 60) || "direct";
  }
}

export async function handleAnalyticsTrack(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as Partial<Hit> & { event?: string };
    const event = typeof body.event === "string" ? body.event.slice(0, 40) : "unknown";
    const path = typeof body.path === "string" ? body.path.slice(0, 300) : "/";
    const ref = typeof body.ref === "string" ? body.ref.slice(0, 500) : "";
    const sid = typeof body.sid === "string" ? body.sid.slice(0, 64) : "";
    const ts = typeof body.ts === "number" ? body.ts : Date.now();
    const meta =
      body.meta && typeof body.meta === "object" ? body.meta : {};

    const hit: Hit = {
      ts,
      event,
      path,
      ref,
      refDomain: classifyReferrer(ref),
      sid,
      meta,
    };

    const store = load();
    store.hits.push(hit);
    if (store.hits.length > MAX_HITS) {
      store.hits = store.hits.slice(store.hits.length - MAX_HITS);
    }
    save(store);

    // 204: beacon-style, nothing to return.
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
}

export function handleAnalyticsSummary(): Response {
  const store = load();
  const hits = store.hits;

  const pageviews = hits.filter((h) => h.event === "pageview");
  const signups = hits.filter((h) => h.event === "waitlist_signup");
  const uniqueSids = new Set(pageviews.map((h) => h.sid));
  const uniquePaths = new Set(pageviews.map((h) => h.path));

  // Views + unique visitors + signups per path.
  const byPath = new Map<
    string,
    { views: number; uniques: number; signups: number }
  >();
  const pathSids = new Map<string, Set<string>>();
  for (const h of pageviews) {
    const e = byPath.get(h.path) || { views: 0, uniques: 0, signups: 0 };
    e.views++;
    byPath.set(h.path, e);
    if (!pathSids.has(h.path)) pathSids.set(h.path, new Set());
    pathSids.get(h.path)!.add(h.sid);
  }
  for (const h of signups) {
    const e = byPath.get(h.path) || { views: 0, uniques: 0, signups: 0 };
    e.signups++;
    byPath.set(h.path, e);
  }
  for (const [p, sids] of pathSids) {
    const e = byPath.get(p)!;
    e.uniques = sids.size;
  }

  // Referrer breakdown: views + signups attributed to the referrer of that hit.
  const byReferrer = new Map<string, { views: number; signups: number }>();
  for (const h of hits) {
    const e = byReferrer.get(h.refDomain) || { views: 0, signups: 0 };
    if (h.event === "pageview") e.views++;
    if (h.event === "waitlist_signup") e.signups++;
    byReferrer.set(h.refDomain, e);
  }

  // Per-day totals.
  const byDay = new Map<string, { views: number; signups: number }>();
  for (const h of hits) {
    const day = new Date(h.ts).toISOString().slice(0, 10);
    const e = byDay.get(day) || { views: 0, signups: 0 };
    if (h.event === "pageview") e.views++;
    if (h.event === "waitlist_signup") e.signups++;
    byDay.set(day, e);
  }

  const sortEntries = <T>(m: Map<string, T>, key: (v: T) => number) =>
    [...m.entries()].sort((a, b) => key(b[1]) - key(a[1]));

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      totals: {
        hits: hits.length,
        pageviews: pageviews.length,
        uniqueVisitors: uniqueSids.size,
        uniquePaths: uniquePaths.size,
        waitlistSignups: signups.length,
      },
      byPath: sortEntries(byPath, (v) => v.views).map(([path, v]) => ({
        path,
        ...v,
      })),
      byReferrer: sortEntries(byReferrer, (v) => v.views + v.signups).map(
        ([source, v]) => ({ source, ...v }),
      ),
      byDay: sortEntries(byDay, (v) => v.views + v.signups).map(
        ([date, v]) => ({ date, ...v }),
      ),
      recent: hits
        .slice(-20)
        .reverse()
        .map((h) => ({
          ts: h.ts,
          when: new Date(h.ts).toISOString(),
          event: h.event,
          path: h.path,
          refDomain: h.refDomain,
        })),
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
