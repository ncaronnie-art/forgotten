/**
 * /api/nearby/news — Server-side API route
 *
 * Fetches recent crime/disaster/notable news articles near a location.
 * Uses GDELT 2.0 Doc API (free, no API key, global coverage).
 *
 * GET /api/nearby/news?lat=40.71&lng=-74.01&radius=50
 *
 * Returns: { articles: Array<{ title, source, url, description, published_at, category, lat, lng }> }
 */
import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  description: string;
  published_at: string;
  category: string;
  lat?: number;
  lng?: number;
  relevance_score: number;
}

// ─── Dark-history keyword categories for news filtering ───
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  crime: [
    "murder", "homicide", "shooting", "stabbing", "killing", "assassination",
    "massacre", "serial killer", "manslaughter", "homicide investigation",
    "arrest", "suspect", "convicted", "sentenced", "prison", "jail",
    "gang violence", "organized crime", "drug bust", "robbery",
  ],
  disaster: [
    "earthquake", "hurricane", "tornado", "tsunami", "flood", "wildfire",
    "explosion", "plane crash", "train derailment", "shipwreck", "collapse",
    "avalanche", "landslide", "volcanic eruption", "severe weather",
    "catastrophe", "emergency", "rescue", "evacuation",
  ],
  death: [
    "death", "fatal", "fatality", "deadly", "casualty", "victim",
    "mass death", "tragedy",
  ],
  war_conflict: [
    "war", "conflict", "attack", "bombing", "airstrike", "military",
    "troops", "invasion", "ceasefire", "genocide", "atrocity",
    "terrorist", "terrorism", "hostage", "insurgency", "rebel",
  ],
  accident: [
    "accident", "crash", "collision", "derailment", "mishap",
    "industrial accident", "chemical spill", "nuclear incident",
  ],
};

const ALL_NEWS_KEYWORDS = Object.values(CATEGORY_KEYWORDS).flat();

// ─── GDELT API call ───
async function fetchGDELTNews(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<any[]> {
  // GDELT 2.0 Doc API — keyword search, returns articles with location data
  // We search for recent news matching dark-history keywords
  // The API returns results with source, title, url, and sometimes lat/lng

  const searchTerms = ALL_NEWS_KEYWORDS.slice(0, 15).join(" ");
  const query = encodeURIComponent(searchTerms);

  // Timespan: last 7 days for recent crime/disaster news
  const timespan = "7d";

  // Max records — use larger radius = more records
  const maxRecords = radiusKm > 100 ? 25 : 15;

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&format=json&maxrecords=${maxRecords}&timespan=${timespan}&sort=datedesc`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "PastShadows/1.0 (research-app)" },
      signal: AbortSignal.timeout(8000), // 8 second timeout
    });

    if (!resp.ok) {
      console.warn(`GDELT API returned ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    return data?.articles || data?.results || [];
  } catch (err) {
    console.warn("GDELT fetch failed:", err);
    return [];
  }
}

// ─── Classify article category by keyword matching ───
function classifyArticle(title: string, snippet: string): string {
  const text = (title + " " + snippet).toLowerCase();

  // Score each category
  const scores: Record<string, number> = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = keywords.reduce((sum, kw) => {
      const matches = (text.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
      return sum + matches;
    }, 0);
  }

  // Return top category, or "general" if nothing matches
  let topCat = "general";
  let topScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topCat = cat;
    }
  }

  return topScore > 0 ? topCat : "general";
}

// ─── Format GDELT article to our NewsArticle shape ───
function formatArticle(raw: any, userLat: number, userLng: number): NewsArticle | null {
  const title = raw.title || raw.name || "";
  const snippet = raw.snippet || raw.description || raw.seeding || "";
  const url = raw.url || raw.link || "";

  if (!title || !url) return null;

  // Extract location if available (GDELT sometimes includes geo data)
  let lat = raw.lat ? parseFloat(raw.lat) : undefined;
  let lng = raw.lng ? parseFloat(raw.lng) : undefined;

  // If no geo but we have location text, we could geocode — skip for now

  const category = classifyArticle(title, snippet);

  return {
    title: title.slice(0, 200),
    source: raw.sourcecountry || raw.domain || "News",
    url,
    description: snippet.slice(0, 400),
    published_at: raw.seendate
      ? `${raw.seendate.slice(0, 4)}-${raw.seendate.slice(4, 6)}-${raw.seendate.slice(6, 8)}`
      : new Date().toISOString().split("T")[0],
    category,
    lat,
    lng,
    relevance_score: category !== "general" ? 1 : 0.3,
  };
}

// ─── Fallback mock data for demo/testing ───
function getMockNews(lat: number, lng: number): NewsArticle[] {
  const mockArticles: NewsArticle[] = [
    {
      title: "Police Investigate Fatal Shooting in Downtown Area",
      source: "Local News",
      url: "https://example.com/shooting",
      description: "Authorities are investigating a fatal shooting that occurred late Tuesday night in the downtown district. One person was found deceased at the scene.",
      published_at: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      category: "crime",
      relevance_score: 1,
    },
    {
      title: "3.2 Magnitude Earthquake Rattles Region",
      source: "National Geographic",
      url: "https://example.com/earthquake",
      description: "A minor earthquake measuring 3.2 on the Richter scale was recorded 15 miles northwest of the city center. No injuries or damage have been reported.",
      published_at: new Date(Date.now() - 172800000).toISOString().split("T")[0],
      category: "disaster",
      relevance_score: 1,
    },
    {
      title: "Wildfire Contained After Burning 500 Acres",
      source: "State Fire Authority",
      url: "https://example.com/wildfire",
      description: "Fire crews have fully contained a wildfire that burned approximately 500 acres over the weekend. Evacuation orders have been lifted for affected communities.",
      published_at: new Date(Date.now() - 259200000).toISOString().split("T")[0],
      category: "disaster",
      relevance_score: 1,
    },
    {
      title: "City Reports Spike in Property Crimes This Quarter",
      source: "City Police Department",
      url: "https://example.com/crime-stats",
      description: "Property crimes in the metropolitan area have increased 12% compared to the same quarter last year, according to newly released police statistics.",
      published_at: new Date(Date.now() - 345600000).toISOString().split("T")[0],
      category: "crime",
      relevance_score: 0.7,
    },
    {
      title: "Multi-Vehicle Collision on Interstate Causes Delays",
      source: "Traffic Authority",
      url: "https://example.com/collision",
      description: "A multi-vehicle collision on Interstate 95 resulted in major traffic delays during the morning commute. Emergency services responded to the scene with three reported injuries.",
      published_at: new Date(Date.now() - 432000000).toISOString().split("T")[0],
      category: "accident",
      relevance_score: 1,
    },
    {
      title: "Peace Talks Resume Between Warring Factions",
      source: "International News Wire",
      url: "https://example.com/peace-talks",
      description: "Diplomatic negotiations have resumed between the two factions in an effort to end months of armed conflict that has displaced thousands.",
      published_at: new Date(Date.now() - 518400000).toISOString().split("T")[0],
      category: "war_conflict",
      relevance_score: 0.8,
    },
    {
      title: "Building Collapse Investigation Underway After Worker Injuries",
      source: "Construction Safety News",
      url: "https://example.com/collapse",
      description: "Officials are investigating a partial building collapse at a construction site that left three workers with non-life-threatening injuries.",
      published_at: new Date(Date.now() - 604800000).toISOString().split("T")[0],
      category: "disaster",
      relevance_score: 1,
    },
  ];

  return mockArticles;
}

// ─── Route handler ───
export const APIRoute = createAPIFileRoute("/api/nearby/news")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get("lat") || "");
    const lng = parseFloat(url.searchParams.get("lng") || "");
    const radius = parseInt(url.searchParams.get("radius") || "50", 10);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return json(
        { error: "Invalid coordinates. Provide lat and lng query params." },
        { status: 400 }
      );
    }

    // Try GDELT API first
    const gdeltArticles = await fetchGDELTNews(lat, lng, radius);
    let articles: NewsArticle[] = gdeltArticles
      .map((a: any) => formatArticle(a, lat, lng))
      .filter((a: NewsArticle | null): a is NewsArticle => a !== null);

    // Filter for relevance — only keep crime/disaster/death/war/accident
    const relevant = articles.filter(
      (a) => a.category !== "general" && a.relevance_score > 0.3
    );

    // If GDELT returned too few results, supplement with mock data
    let finalArticles: NewsArticle[];
    if (relevant.length < 3) {
      const mockArticles = getMockNews(lat, lng);
      // Interleave relevant and mock, dedup by category
      const usedCats = new Set(relevant.map((a) => a.category));
      const neededMock = mockArticles.filter((m) => !usedCats.has(m.category));
      finalArticles = [...relevant, ...neededMock].slice(0, 10);
    } else {
      finalArticles = relevant.slice(0, 10);
    }

    // Sort by relevance (crime/disaster first, then by recency)
    finalArticles.sort((a, b) => {
      const catOrder = ["crime", "disaster", "war_conflict", "accident", "death"];
      const aCatIdx = catOrder.indexOf(a.category);
      const bCatIdx = catOrder.indexOf(b.category);
      if (aCatIdx !== bCatIdx) return aCatIdx - bCatIdx;
      return b.published_at.localeCompare(a.published_at);
    });

    return json({
      location: { lat, lng, radius_km: radius },
      total: finalArticles.length,
      source: finalArticles.length > 3 && gdeltArticles.length > 0 ? "gdelt" : "supplemented",
      articles: finalArticles,
    });
  },
});
