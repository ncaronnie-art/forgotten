import curatedData from "./curated_events.json";

/** Known AI-generated event images in public/images/events/ */
const KNOWN_IMAGES = new Set([
  "event-001", "event-002", "event-004", "event-005",
  "event-007", "event-008", "event-009", "event-010",
  "event-016", "event-019", "event-020", "event-024",
  "event-025", "event-026", "event-028", "event-029",
  "event-033", "event-035", "event-036", "event-048",
  "event-067", "event-071", "event-100", "event-101",
  "event-103",
]);

export function getEventImageUrl(eventId: string): string | null {
  if (KNOWN_IMAGES.has(eventId)) {
    return `/images/events/${eventId}.jpg`;
  }
  return null;
}

export interface HistoricalEvent {
  id: string;
  title: string;
  date: string;
  year: number;
  description: string;
  category: "crime" | "death" | "disaster" | "mystery" | "cemetery" | "war_conflict" | "memorial" | "prison" | "execution" | "riot" | "historical" | "local_legends";
  lat: number;
  lng: number;
  source?: string;
  source_url?: string;
  imageUrl?: string | null;
}

/** Convert the curated JSON events to our HistoricalEvent format */
function loadEvents(): HistoricalEvent[] {
  const raw = curatedData as { events: Array<{
    id: string;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    category: string;
    subcategory?: string;
    year: number;
    source?: string;
    source_url?: string;
    confidence?: string;
    image?: string;
  }> };

  return raw.events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.year <= 0 ? `${Math.abs(e.year)} BC` : String(e.year),
    year: e.year <= 0 ? Math.abs(e.year) : e.year,
    description: e.description,
    category: mapCategory(e.category),
    lat: e.latitude,
    lng: e.longitude,
    source: e.source || undefined,
    source_url: e.source_url || undefined,
    imageUrl: e.image || null,
  }));
}

/** Map JSON category strings to our type system */
function mapCategory(cat: string): HistoricalEvent["category"] {
  const validCats: Record<string, HistoricalEvent["category"]> = {
    crime: "crime",
    death: "death",
    disaster: "disaster",
    mystery: "mystery",
    cemetery: "cemetery",
    war_conflict: "war_conflict",
    memorial: "memorial",
    prison: "prison",
    execution: "execution",
    riot: "riot",
    historical: "historical",
    local_legends: "local_legends",
  };
  return validCats[cat] || "historical";
}

const events = loadEvents();

export default events;

/** Calculate distance between two lat/lng points using Haversine formula (returns km) */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Get events within a radius (km), sorted by preference */
export function getNearbyEvents(
  lat: number,
  lng: number,
  radiusKm: number = 5000,
  category?: string,
  sort: "distance" | "date-desc" | "date-asc" = "distance",
  searchQuery?: string
): (HistoricalEvent & { distanceKm: number })[] {
  let filtered = events;
  if (category && category !== "all") {
    filtered = filtered.filter((e) => e.category === category);
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.date.toLowerCase().includes(q)
    );
  }
  const withDistance = filtered.map((e) => ({
    ...e,
    distanceKm: Math.round(haversineKm(lat, lng, e.lat, e.lng) * 10) / 10,
  }));

  if (sort === "distance") {
    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (sort === "date-desc") {
    withDistance.sort((a, b) => b.year - a.year);
  } else if (sort === "date-asc") {
    withDistance.sort((a, b) => a.year - b.year);
  }

  return withDistance.filter((e) => e.distanceKm <= radiusKm);
}