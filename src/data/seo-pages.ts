/**
 * SEO index-page data — shared by /city/<city> and /category/<category> routes.
 *
 * City membership is determined by haversine distance from the city center
 * (30 km radius — covers the city plus close suburbs, which matches the
 * "what happened near here" mental model).
 */
import events, { haversineKm } from "./events";
import type { HistoricalEvent } from "./events";

export const CITY_RADIUS_KM = 30;

export interface CityMeta {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  tagline: string;
  blurb: string;
}

export interface CategoryMeta {
  slug: string;
  label: string;
  color: string; // tailwind badge classes
  description: string;
}

/** Cities with real event density (>= 10 curated events within 30 km) */
export const CITIES: CityMeta[] = [
  {
    slug: "chicago",
    name: "Chicago",
    lat: 41.8781,
    lng: -87.6298,
    tagline: "The dark history of Chicago",
    blurb:
      "From the Great Chicago Fire and the H.H. Holmes Murder Castle to Al Capone's St. Valentine's Day Massacre and the 1919 race riots, Chicago's streets have soaked up more than a century of violence and mystery.",
  },
  {
    slug: "new-york",
    name: "New York",
    lat: 40.7128,
    lng: -74.006,
    tagline: "The dark history of New York City",
    blurb:
      "The Triangle Shirtwaist Fire, the St. Valentine's-era mob wars, the Son of Sam panic, and the ruins of the World Trade Center — Manhattan and its boroughs hide a century of crime, disaster, and unsolved mystery.",
  },
  {
    slug: "dallas",
    name: "Dallas",
    lat: 32.7767,
    lng: -96.797,
    tagline: "The dark history of Dallas",
    blurb:
      "Dealey Plaza, where JFK was assassinated in 1963, anchors a deep catalog of Texas crime and tragedy — from Bonnie and Clyde's final run to industrial disasters and frontier violence.",
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    lat: 34.0522,
    lng: -118.2437,
    tagline: "The dark history of Los Angeles",
    blurb:
      "The Black Dahlia, the Manson Family, the North Hollywood shootout, and the Watts riots — Los Angeles pairs its glamour with one of the darkest true-crime records in America.",
  },
  {
    slug: "detroit",
    name: "Detroit",
    lat: 42.3314,
    lng: -83.0458,
    tagline: "The dark history of Detroit",
    blurb:
      "The Motor City's rise and fall left a trail of abandoned factories, labor riots, and organized crime — from the Purple Gang to the 1967 rebellion and a vanishing population's forgotten neighborhoods.",
  },
  {
    slug: "san-francisco",
    name: "San Francisco",
    lat: 37.7749,
    lng: -122.4194,
    tagline: "The dark history of San Francisco",
    blurb:
      "The Zodiac Killer stalked these hills, Alcatraz held America's worst, and the 1906 earthquake burned the city to ash — San Francisco's fog hides a violent, fascinating past.",
  },
  {
    slug: "new-orleans",
    name: "New Orleans",
    lat: 29.9511,
    lng: -90.0715,
    tagline: "The dark history of New Orleans",
    blurb:
      "Voodoo queens, the Axeman's murders, Hurricane Katrina's flood, and the cemeteries where the dead lie above ground — New Orleans is America's most haunted city for a reason.",
  },
  {
    slug: "philadelphia",
    name: "Philadelphia",
    lat: 39.9526,
    lng: -75.1652,
    tagline: "The dark history of Philadelphia",
    blurb:
      "Eastern State Penitentiary's crumbling cellblocks, the MOVE bombing, and the city where the nation's founding blood was spilled — Philadelphia's cobblestones remember.",
  },
  {
    slug: "atlanta",
    name: "Atlanta",
    lat: 33.749,
    lng: -84.388,
    tagline: "The dark history of Atlanta",
    blurb:
      "From the burning of Atlanta in the Civil War to the Atlanta Child Murders and the 1996 Centennial Park bombing, Georgia's capital carries a heavy, complicated history.",
  },
  {
    slug: "london",
    name: "London",
    lat: 51.5074,
    lng: -0.1278,
    tagline: "The dark history of London",
    blurb:
      "Jack the Ripper's Whitechapel, the Great Fire of 1666, the Blitz, and centuries of plague pits beneath the pavement — few cities hide their dead as thoroughly as London.",
  },
  {
    slug: "paris",
    name: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    tagline: "The dark history of Paris",
    blurb:
      "The Catacombs hold the bones of millions, the Terror sent thousands to the guillotine, and the 2015 attacks scarred the modern city — Paris is beautiful and deeply haunted.",
  },
  {
    slug: "seattle",
    name: "Seattle",
    lat: 47.6062,
    lng: -122.3321,
    tagline: "The dark history of Seattle",
    blurb:
      "Beneath the Pioneer Square sidewalks lie the ruins of old Seattle — burned in 1889, rebuilt on top of itself, and haunted by the violence of the Klondike gold rush era.",
  },
  {
    slug: "boston",
    name: "Boston",
    lat: 42.3601,
    lng: -71.0589,
    tagline: "The dark history of Boston",
    blurb:
      "The Boston Massacre, the Great Molasses Flood of 1919, the 2013 Marathon bombing, and a deep catalog of colonial violence — Boston's history is written in blood and, occasionally, molasses.",
  },
  {
    slug: "washington-dc",
    name: "Washington, D.C.",
    lat: 38.9072,
    lng: -77.0369,
    tagline: "The dark history of Washington, D.C.",
    blurb:
      "Lincoln's assassination at Ford's Theatre, the burning of the capital in 1814, and the city's long struggle with crime and political violence — power leaves a dark residue.",
  },
  {
    slug: "salem",
    name: "Salem",
    lat: 42.5195,
    lng: -70.8967,
    tagline: "The dark history of Salem, Massachusetts",
    blurb:
      "The 1692 witch trials hanged nineteen people and condemned two hundred more. Salem's name is forever synonymous with fear, hysteria, and the machinery of accusation.",
  },
];

/** The 11 real categories present in the curated dataset */
export const CATEGORIES: CategoryMeta[] = [
  {
    slug: "crime",
    label: "Crime",
    color: "bg-crime/20 text-red-300 border-crime/40",
    description:
      "Murders, robberies, organized crime, and criminal investigations — the violent underside of everyday streets.",
  },
  {
    slug: "disaster",
    label: "Disaster",
    color: "bg-disaster/20 text-orange-300 border-disaster/40",
    description:
      "Fires, earthquakes, floods, explosions, and industrial catastrophes that reshaped cities and took thousands of lives.",
  },
  {
    slug: "war_conflict",
    label: "War & Conflict",
    color: "bg-war-conflict/20 text-amber-200 border-war-conflict/40",
    description:
      "Battles, sieges, genocides, and civil conflicts — the places where wars were fought on home ground.",
  },
  {
    slug: "mystery",
    label: "Mystery",
    color: "bg-mystery/20 text-purple-300 border-mystery/40",
    description:
      "Unsolved murders, strange disappearances, and cases that still defy explanation.",
  },
  {
    slug: "death",
    label: "Death",
    color: "bg-death/20 text-gray-400 border-death/40",
    description:
      "Plague, famine, mass graves, and notable deaths — the ways a place becomes associated with mortality.",
  },
  {
    slug: "local_legends",
    label: "Legends",
    color: "bg-local-legends/20 text-purple-300 border-local-legends/40",
    description:
      "Mothman, the Bell Witch, the Jersey Devil — folklore and legends rooted in real places.",
  },
  {
    slug: "riot",
    label: "Riot",
    color: "bg-riot/20 text-orange-200 border-riot/40",
    description:
      "Race riots, labor uprisings, and civil unrest — when a city's tensions boil onto the streets.",
  },
  {
    slug: "execution",
    label: "Execution",
    color: "bg-execution/20 text-red-200 border-execution/40",
    description:
      "Executions, hangings, and death sentences carried out — legal violence as public spectacle and punishment.",
  },
  {
    slug: "prison",
    label: "Prison",
    color: "bg-prison/20 text-slate-300 border-prison/40",
    description:
      "Notorious prisons, escapes, and the institutional dark history of confinement.",
  },
  {
    slug: "cemetery",
    label: "Cemetery",
    color: "bg-cemetery/20 text-green-300 border-cemetery/40",
    description:
      "Graveyards, burial grounds, and places where the dead are laid to rest — sometimes above ground.",
  },
  {
    slug: "historical",
    label: "Historical",
    color: "bg-historical/20 text-amber-100 border-historical/40",
    description:
      "Significant historical events with a dark edge — removals, betrayals, and forgotten tragedies.",
  },
];

export function getCity(slug: string): CityMeta | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function getCategory(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Events within CITY_RADIUS_KM of the city center, sorted by distance */
export function getEventsByCity(slug: string): (HistoricalEvent & { distanceKm: number })[] {
  const city = getCity(slug);
  if (!city) return [];
  return events
    .map((e) => ({ ...e, distanceKm: Math.round(haversineKm(city.lat, city.lng, e.lat, e.lng) * 10) / 10 }))
    .filter((e) => e.distanceKm <= CITY_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Events of a given category, newest first */
export function getEventsByCategory(slug: string): HistoricalEvent[] {
  const cat = getCategory(slug);
  if (!cat) return [];
  return events.filter((e) => e.category === slug).sort((a, b) => b.year - a.year);
}

/** Deterministic slug from any title string — future /event/<slug> pages will use this */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Deterministic slug for an event — future /event/<slug> pages will use this */
export function slugifyEvent(event: HistoricalEvent): string {
  return slugify(event.title);
}

/** Human date string with year */
export function eventDateLabel(e: HistoricalEvent): string {
  if (e.year <= 0) return `${Math.abs(e.year)} BC`;
  return String(e.year);
}

/* ------------------- /event/<slug> landing page helpers ------------------- */
/** Slug → event lookup (719 events, unique slugs — verified no collisions). */
const EVENT_BY_SLUG = new Map<string, HistoricalEvent>(
  events.map((e) => [slugifyEvent(e), e]),
);
export function getEventBySlug(slug: string): HistoricalEvent | undefined {
  return EVENT_BY_SLUG.get(slug);
}
export function getEventSlug(e: HistoricalEvent): string {
  return slugifyEvent(e);
}
/** Nearest city with curated coverage (within CITY_RADIUS_KM), if any. */
export function getNearestCity(e: HistoricalEvent): CityMeta | undefined {
  let best: { city: CityMeta; d: number } | undefined;
  for (const city of CITIES) {
    const d = haversineKm(city.lat, city.lng, e.lat, e.lng);
    if (d <= CITY_RADIUS_KM && (!best || d < best.d)) best = { city, d };
  }
  return best?.city;
}
/**
 * Related events for internal linking: same category first (closest first),
 * then any nearby events (closest by distance) until `count` are filled.
 */
export function getRelatedEvents(
  event: HistoricalEvent,
  count = 3,
): (HistoricalEvent & { distanceKm: number })[] {
  const withDist = (e: HistoricalEvent) => ({
    ...e,
    distanceKm: Math.round(haversineKm(event.lat, event.lng, e.lat, e.lng) * 10) / 10,
  });
  const sameCat = events
    .filter((e) => e.id !== event.id && e.category === event.category)
    .map(withDist)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  if (sameCat.length >= count) return sameCat.slice(0, count);
  const seen = new Set([event.id, ...sameCat.map((e) => e.id)]);
  const fillers = events
    .filter((e) => !seen.has(e.id))
    .map(withDist)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return [...sameCat, ...fillers].slice(0, count);
}
