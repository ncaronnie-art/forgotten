// Production server for the built site. Intercepts /api/ requests for live data,
// passes everything else to the TanStack Start SSR handler.
import handler from "./dist/server/server.js";
import {
  handleNearbyRequest,
  handleNewsRequest,
  handleSignup,
  handleSignin,
  handleSignout,
  handleStripeWebhook,
  handleStripeSuccess,
  handleUserStatus,
  handleTrackEvent,
  handleAdminUsers,
  requireProRequest,
  queryWikipedia,
  queryOSM,
  queryWikidata,
} from "./server/api-handler.ts";
import {
  handleAnalyticsTrack,
  handleAnalyticsSummary,
} from "./server/analytics-handler.ts";
const PORT = 3000;
const HOST = "0.0.0.0";
const CLIENT_DIR = `${import.meta.dir}/dist/client`;
const PUBLIC_DIR = `${import.meta.dir}/public`;

const freePort =
  `for _ in $(seq 1 25); do ` +
  `pids=$(lsof -t -iTCP:${String(PORT)} -sTCP:LISTEN 2>/dev/null || true); ` +
  `if [ -z "$pids" ]; then exit 0; fi; ` +
  `kill $pids 2>/dev/null || true; sleep 0.2; ` +
  `done`;

for (let attempt = 1; ; attempt++) {
  await Bun.$`sudo sh -c ${freePort}`.quiet().nothrow();
  try {
    Bun.serve({
      port: PORT,
      hostname: HOST,
      async fetch(req) {
        const url = new URL(req.url);
        const method = req.method;

        // ─── User Auth ───
        if (url.pathname === "/api/auth/signup" && method === "POST") {
          return handleSignup(req);
        }
        if (url.pathname === "/api/auth/signin" && method === "POST") {
          return handleSignin(req);
        }
        if (url.pathname === "/api/auth/signout" && method === "POST") {
          return handleSignout(req);
        }

        // ─── Stripe ───
        if (url.pathname === "/api/stripe/webhook" && method === "POST") {
          return handleStripeWebhook(req);
        }
        if (url.pathname === "/api/stripe/success") {
          return handleStripeSuccess(url);
        }

        // ─── User Status ───
        if (url.pathname === "/api/user/status") {
          return handleUserStatus(url);
        }
        if (url.pathname === "/api/user/track-event" && method === "POST") {
          return handleTrackEvent(req);
        }

        // ─── Analytics (self-hosted beacon) ───
        if (url.pathname === "/api/analytics/track" && method === "POST") {
          return handleAnalyticsTrack(req);
        }
        if (url.pathname === "/api/analytics/summary") {
          return handleAnalyticsSummary();
        }
        // ─── Admin ───
        if (url.pathname === "/api/admin/users") {
          return handleAdminUsers(url);
        }

        // ─── Scan My Area ───
        if (url.pathname === "/api/scan-area" && method === "POST") {
          return handleScanArea(req);
        }
        if (url.pathname === "/api/scan-area/generate" && method === "POST") {
          return handleScanAreaGenerate(req);
        }

        // ─── News (Pro-only server enforcement — re-audit LOW-1) ───
        // News articles are a Pro feature in the business plan; gate identically to
        // scan-area: 401 without/with-invalid token, 403 for free/expired, 200 for Pro.
        if (url.pathname === "/api/nearby/news") {
          const gate = requireProRequest(req);
          if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
          return handleNewsRequest(url);
        }

        // ─── Nearby Events ───
        if (url.pathname.startsWith("/api/nearby")) {
          return handleNearbyRequest(url);
        }

        // ─── Video Export (Pro feature: server enforcement — re-audit LOW-1) ───
        // MP4 export is Pro-only in the UI; enforce it here BEFORE any work happens so
        // free/anonymous callers never reach the ffmpeg render pipeline. Pro callers
        // are forwarded to the SSR handler, where patch-server.cjs injects the real logic.
        if (url.pathname === "/api/export-video" && method === "POST") {
          const gate = requireProRequest(req);
          if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
          return (handler as { fetch: (r: Request) => Response | Promise<Response> }).fetch(req);
        }

        // ─── ElevenLabs narration (Pro feature: server enforcement — post-cleanup) ───
        // Paid TTS quota must be protected server-side. 401 no/invalid token, 403
        // free/expired; Pro passes through to the SSR handler (patched with the logic).
        if (url.pathname === "/api/elevenlabs-narrate" && method === "POST") {
          const gate = requireProRequest(req);
          if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
          return (handler as { fetch: (r: Request) => Response | Promise<Response> }).fetch(req);
        }

        // Static files from dist/client, then public/
        if (url.pathname !== "/") {
          const file = Bun.file(CLIENT_DIR + url.pathname);
          if (await file.exists()) return new Response(file);
          const pubFile = Bun.file(PUBLIC_DIR + url.pathname);
          if (await pubFile.exists()) {
            const ext = url.pathname.split(".").pop()?.toLowerCase();
            const mimeTypes: Record<string, string> = {
              jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
              webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
              mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg",
              woff2: "font/woff2", woff: "font/woff", css: "text/css",
              js: "application/javascript", json: "application/json",
            };
            const contentType = mimeTypes[ext || ""];
            const headers: Record<string, string> = {};
            if (contentType) headers["Content-Type"] = contentType;
            headers["Cache-Control"] = "public, max-age=86400";
            return new Response(pubFile, { headers });
          }
        }

        // SSR handler
        return (
          handler as { fetch: (r: Request) => Response | Promise<Response> }
        ).fetch(req);
      },
    });
    break;
  } catch (err) {
    if (attempt >= 10) throw err;
    await Bun.sleep(200);
  }
}
console.log(`team-site serving on http://${HOST}:${String(PORT)}`);

// ─── Scan My Area handlers ───

async function handleScanArea(req: Request): Promise<Response> {
  try {
    // BUG-2 audit fix: Scan My Area (Pro feature) is server-enforced. Requires a valid
    // session token AND a non-free tier; 401 without token, 403 for free/expired.
    const gate = requireProRequest(req);
    if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
    const body = await req.json() as { lat?: number; lng?: number; radiusMiles?: number };
    const { lat, lng, radiusMiles } = body;
    if (!lat || !lng || !radiusMiles) {
      return Response.json({ error: "Missing lat, lng, or radiusMiles" }, { status: 400 });
    }
    const clampedRadius = Math.min(1.0, Math.max(0.25, Number(radiusMiles)));
    const radiusMeters = Math.round(clampedRadius * 1609.34);

    const sourcesQueried: string[] = [];

    // Use existing api-handler functions (cached, dark-history filtered)
    const [wikiResults, osmResults, wdResults, locResults] = await Promise.allSettled([
      queryWikipedia(lat, lng, radiusMeters).then((r) => { sourcesQueried.push("Wikipedia"); return r; }),
      queryOSM(lat, lng, radiusMeters).then((r) => { sourcesQueried.push("OpenStreetMap"); return r; }),
      queryWikidata(lat, lng, radiusMeters).then((r) => { sourcesQueried.push("Wikidata"); return r; }),
      queryChroniclingAmerica(lat, lng, clampedRadius).then((r) => { sourcesQueried.push("ChroniclingAmerica"); return r; }),
    ]);

    const candidates = [
      ...(wikiResults.status === "fulfilled" ? wikiResults.value : []),
      ...(osmResults.status === "fulfilled" ? osmResults.value : []),
      ...(wdResults.status === "fulfilled" ? wdResults.value : []),
      ...(locResults.status === "fulfilled" ? locResults.value : []),
    ];

    // Deduplicate by title prefix + proximity
    const seen = new Set<string>();
    const deduped = candidates.filter((c: any) => {
      const key = `${(c.title || "").slice(0, 30)}_${c.lat.toFixed(4)}_${c.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return Response.json({ candidates: deduped.slice(0, 30), totalFound: deduped.length, sourcesQueried });
  } catch (err: any) {
    return Response.json({ error: err.message || "Scan failed" }, { status: 500 });
  }
}

// ─── Geographic scoping helpers (Nominatim reverse/forward geocoding, cached) ───
// Used to scope Chronicling America results to the scanned region. Without this,
// loc.gov returns national keyword matches (e.g. an Omaha, NE paper for a New York
// scan) and the old code stamped them with fabricated coordinates near the scan point.
const geoCache = new Map<string, any>();
function normPlace(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
async function reverseGeocode(lat: number, lng: number): Promise<{ state: string | null; city: string | null; county: string | null } | null> {
  const key = `rev:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  if (geoCache.has(key)) return geoCache.get(key);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "PastShadows/1.0" } });
    clearTimeout(timer);
    if (!res.ok) { geoCache.set(key, null); return null; }
    const data: any = await res.json();
    const addr = data?.address || {};
    const place = {
      state: addr.state || addr.province || null,
      city: addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || null,
      county: addr.county || null,
    };
    geoCache.set(key, place);
    return place;
  } catch { geoCache.set(key, null); return null; }
}
async function forwardGeocodeCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  const key = `fwd:${normPlace(city)}|${normPlace(state)}`;
  if (geoCache.has(key)) return geoCache.get(key);
  try {
    const q = encodeURIComponent(`${city}, ${state}, USA`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "PastShadows/1.0" } });
    clearTimeout(timer);
    if (!res.ok) { geoCache.set(key, null); return null; }
    const rows: any[] = await res.json();
    if (!rows?.length) { geoCache.set(key, null); return null; }
    const pt = { lat: parseFloat(rows[0].lat), lng: parseFloat(rows[0].lon) };
    geoCache.set(key, pt);
    return pt;
  } catch { geoCache.set(key, null); return null; }
}
// ─── Chronicling America (LOC) — geographically scoped endpoint ───
async function queryChroniclingAmerica(lat: number, lng: number, _radiusMiles: number): Promise<any[]> {
  try {
    // Scope CA results to the scan region. Reverse-geocode the scan point, then require
    // every returned newspaper issue to be PUBLISHED in the same state (and city/county
    // when known). If we cannot determine where the scan point is, return no CA results
    // rather than national noise. Coordinates are the issue's real publication-city
    // centroid (via forward geocoding) — never fabricated.
    const place = await reverseGeocode(lat, lng);
    if (!place || !place.state) return [];
    const scanState = normPlace(place.state);
    const scanCity = place.city ? normPlace(place.city) : null;
    const scanCounty = place.county ? normPlace(place.county).replace("county", "").trim() : null;
    const darkTerms = "murder+death+fire+disaster+killed+massacre+tragedy+hanging+execution+lynching";

    const fetchLoc = async (scoped: boolean): Promise<any[]> => {
      const scope = scoped ? `&fa=location:${encodeURIComponent(place!.state)}` : "";
      const url = `https://www.loc.gov/collections/chronicling-america/?andtext=${darkTerms}&dateFilterType=yearRange&date1=1850&date2=1963&fo=json&at=results&c=100${scope}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "PastShadows/1.0" } });
      clearTimeout(timer);
      if (!res.ok) return [];
      const data: any = await res.json();
      return data?.results || data?.items || [];
    };

    // Strict local filter: state must match; if the scan point has a known city, the
    // paper must be published in that city or county (state-level only for rural scans).
    const filterLocal = (list: any[]) => list.filter((item: any) => {
      const states: string[] = Array.isArray(item.location_state) ? item.location_state : [item.location_state].filter(Boolean);
      const cities: string[] = Array.isArray(item.location_city) ? item.location_city : [item.location_city].filter(Boolean);
      const counties: string[] = Array.isArray(item.location_county) ? item.location_county : [item.location_county].filter(Boolean);
      const stateOk = states.some((s: string) => normPlace(s) === scanState);
      if (!stateOk) return false;
      if (scanCity) {
        const cityOk = cities.some((c: string) => normPlace(c) === scanCity);
        const countyOk = scanCounty && counties.some((c: string) => normPlace(c).replace("county", "").trim() === scanCounty);
        return cityOk || countyOk;
      }
      return true;
    });

    let items: any[] = [];
    try { items = await fetchLoc(true); } catch { items = []; }
    let local = filterLocal(items);
    // Fallback: if the state-scoped query returned nothing, retry unscoped (some states
    // are finicky with fa=location) and apply the same strict filter.
    if (local.length === 0 && items.length === 0) {
      try { items = await fetchLoc(false); } catch { items = []; }
      local = filterLocal(items);
    }

    // Assign REAL coordinates: forward-geocode each unique publication city once.
    // For multi-city papers (LOC lists every place a paper was published), prefer the
    // city matching the scan city so e.g. a paper titled "([New York, N.Y.])" that was
    // also printed in Detroit is placed in New York, not Detroit.
    const cityCoord = new Map<string, { lat: number; lng: number } | null>();
    const out: any[] = [];
    for (const item of local) {
      const cities: string[] = Array.isArray(item.location_city) ? item.location_city : [];
      const states: string[] = Array.isArray(item.location_state) ? item.location_state : [];
      const city = (scanCity && cities.find((c: string) => normPlace(c) === scanCity)) || cities[0] || null;
      // Pair the chosen city with a matching state: prefer the scan state (the item
      // passed the state filter, so one of its states equals it) over positional states[0].
      const st = states.find((s: string) => normPlace(s) === scanState) || states[0] || place.state;
      if (!city) continue; // no publication city → can't place honestly
      const ck = `${city}|${st}`;
      if (!cityCoord.has(ck)) cityCoord.set(ck, await forwardGeocodeCity(city, st));
      const pt = cityCoord.get(ck);
      if (!pt) continue; // geocode failed → skip, never fabricate
      const year = item.date ? parseInt(String(item.date).slice(0, 4)) || 0 : 0;
      out.push({
        id: `loc-${item.id || `${item.title}-${item.date}`}`,
        title: item.title || "Historical newspaper article",
        description: (Array.isArray(item.description) ? item.description.join(" ") : item.description || item.snippet || "").slice(0, 300),
        category: "historical",
        lat: pt.lat,
        lng: pt.lng,
        source: "Chronicling America (LOC)",
        sourceUrl: item.url || item.id || `https://www.loc.gov/collections/chronicling-america/`,
        year,
        relevance: 0.35,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function handleScanAreaGenerate(req: Request): Promise<Response> {
  try {
    // BUG-2 audit fix: generate endpoint is also Pro-only.
    const gate = requireProRequest(req);
    if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
    const body = await req.json() as any;
    const { title, lat, lng, category, source, sourceUrl, year, description: bodyDesc } = body;
    if (!title) return Response.json({ error: "Missing title" }, { status: 400 });

    // Fetch Wikipedia extract
    let extract = bodyDesc || "";
    let pageUrl = sourceUrl || "";
    let imageUrl: string | null = null;
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&pithumbsize=400&titles=${encodeURIComponent(title)}&format=json&origin=*`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const wRes = await fetch(wikiUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (wRes.ok) {
        const wData = await wRes.json();
        const pages: any = wData?.query?.pages || {};
        const page: any = Object.values(pages)[0] || {};
        if (!page.missing) {
          extract = (page.extract || "").slice(0, 500) || extract;
          pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
          imageUrl = page.thumbnail?.source || null;
        }
      }
    } catch { /* ok */ }

    // Rule-based category detection
    let detectedCategory = category || "historical";
    if (extract) {
      const lower = extract.toLowerCase();
      const patterns: Record<string, RegExp[]> = {
        crime: [/murder/, /killed/, /assassinat/, /crime/, /robbery/, /gang/, /serial killer/, /massacre/],
        disaster: [/fire/, /flood/, /earthquake/, /hurricane/, /tornado/, /disaster/, /explosion/, /volcanic/, /tsunami/],
        death: [/died/, /death/, /funeral/, /burial/, /obituary/],
        cemetery: [/cemetery/, /grave/, /tomb/, /burial ground/],
        war_conflict: [/war/, /battle/, /conflict/, /military/, /soldier/, /army/, /fought/],
        execution: [/execution/, /hanged/, /executed/, /death penalty/],
        riot: [/riot/, /protest/, /uprising/, /rebellion/, /revolt/],
        mystery: [/mystery/, /unsolved/, /strange/, /unknown/, /disappearance/, /unexplained/],
        prison: [/prison/, /jail/, /penitentiary/, /incarcerated/],
        memorial: [/memorial/, /monument/, /plaque/, /commemorat/],
      };
      const scores: Record<string, number> = {};
      for (const [cat, regexes] of Object.entries(patterns)) {
        scores[cat] = regexes.filter((r) => r.test(lower)).length;
      }
      const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] > 0) detectedCategory = best[0];
    }

    // Detect year
    let detectedYear = year || 0;
    if (extract) {
      const m = extract.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
      if (m) { const y = parseInt(m[0]); if (y >= 100 && y <= 2026) detectedYear = y; }
    }

    const eventId = `scan-${Date.now()}`;

    // ─── AI Image Generation via Pollinations.ai ───
    let aiImageUrl: string | null = null;
    try {
      const promptText = `dark cinematic photograph of ${title}, ${(extract || bodyDesc || "").slice(0, 200)}, haunting, atmospheric, dim lighting, dark theme, historical`;
      const encoded = encodeURIComponent(promptText);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&seed=${Date.now()}`;
      
      const imgController = new AbortController();
      const imgTimer = setTimeout(() => imgController.abort(), 15000);
      const imgRes = await fetch(pollinationsUrl, { signal: imgController.signal });
      clearTimeout(imgTimer);
      
      if (imgRes.ok) {
        const imgBuffer = await imgRes.arrayBuffer();
        const imagePath = `public/images/events/${eventId}.jpg`;
        await Bun.write(imagePath, new Uint8Array(imgBuffer));
        aiImageUrl = `/images/events/${eventId}.jpg`;
      }
    } catch {
      // Image generation failed — keep Wikipedia thumbnail or null
    }

    // Prefer AI image, fall back to Wikipedia thumbnail
    const finalImageUrl = aiImageUrl || imageUrl;

    const event = {
      id: eventId,
      title,
      description: extract || bodyDesc || "",
      latitude: lat || 0,
      longitude: lng || 0,
      category: detectedCategory,
      year: detectedYear,
      source: source || "Scan My Area",
      source_url: pageUrl,
      confidence: "scanned",
      imageUrl: finalImageUrl,
    };

    return Response.json({ event, message: "Event generated and saved" });
  } catch (err: any) {
    return Response.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}
