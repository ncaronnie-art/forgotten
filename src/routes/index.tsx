import React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { HistoricalEvent } from "~/data/events";
import curatedEvents, { getNearbyEvents, haversineKm } from "~/data/events";
import HistoryReel from "~/components/HistoryReel";
import WhatWasHere from "~/components/WhatWasHere";
import ScanMyArea from "~/components/ScanMyArea";
import VideoStory from "~/components/VideoStory";
import ParticleOverlay from "~/components/ParticleOverlay";
import { track } from "~/lib/analytics";
import SpotlightStrip from "~/components/SpotlightStrip";
import EventImageCard from "~/components/EventImageCard";
import { CATEGORY_ICON_MAP, IconDagger, IconSkull, IconFlame, IconEye, IconTombstone, IconWar, IconMemorial, IconChains, IconExecution, IconRiot, IconScroll, IconGhost, IconPlay, IconClose, IconExport, IconSearch, IconSpeaker, IconSpeakerMuted, IconMapPin, IconInfo, IconMenu, IconFilter, IconPlus } from "~/components/icons";
import CategoryPreferencePicker, { CATEGORY_OPTIONS } from "~/components/CategoryPreferencePicker";
import MobileStorySheet from "~/components/MobileStorySheet";
import FiltersSheet from "~/components/FiltersSheet";
import TrailPanel from "~/components/TrailPanel";
import SavedList from "~/components/SavedList";
import ContentPreferencePicker from "~/components/ContentPreferencePicker";

const CATEGORIES = [
  { id: "all", label: "All" },
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
  { id: "local_legends", label: "Legends", icon: IconGhost },
] as const;

type SortMode = "distance" | "date-desc" | "date-asc";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "distance", label: "Nearest" },
  { id: "date-desc", label: "Newest" },
  { id: "date-asc", label: "Oldest" },
];

// Famous curated stories shown on the landing page preview strip (id order = display order)
const SAMPLE_LANDING_IDS = [
  "event-001", // Mount Vesuvius Eruption (Pompeii) — disaster
  "event-048", // Dyatlov Pass incident — mystery
  "event-019", // Jack the Ripper Murders — crime
  "event-026", // Sinking of the RMS Titanic — disaster
  "event-330", // H.H. Holmes' Murder Castle — crime
];
const CATEGORY_ICONS: Record<string, any> = {
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

export const Route = createFileRoute("/")({
  component: Home,
});

// ─── Helper: detect iOS ───
function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// ─── Helper: format distance (imperial) ───
function formatDistance(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  if (miles < 100) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles).toLocaleString()} mi`;
}

// ─── Helper: today date string ───
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Helper: category color ───
function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    crime: "bg-crime/20 text-red-300 border-crime/40",
    death: "bg-death/20 text-gray-400 border-death/40",
    disaster: "bg-disaster/20 text-orange-300 border-disaster/40",
    mystery: "bg-mystery/20 text-purple-300 border-mystery/40",
    cemetery: "bg-cemetery/20 text-green-300 border-cemetery/40",
    war_conflict: "bg-war-conflict/20 text-amber-200 border-war-conflict/40",
    memorial: "bg-memorial/20 text-yellow-200 border-memorial/40",
    prison: "bg-prison/20 text-slate-300 border-prison/40",
    execution: "bg-execution/20 text-red-200 border-execution/40",
    riot: "bg-riot/20 text-orange-200 border-riot/40",
    historical: "bg-historical/20 text-amber-100 border-historical/40",
    local_legends: "bg-local-legends/20 text-purple-300 border-local-legends/40",
  };
  return map[cat] || "bg-gray-800 text-gray-400";
}

// ─── Helper: get nav URL ───
function getNavUrl(lat: number, lng: number): { url: string; label: string } {
  if (isIOS()) {
    return {
      url: `https://maps.apple.com/?daddr=${lat},${lng}`,
      label: "Open in Apple Maps",
    };
  }
  return {
    url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    label: "Open in Google Maps",
  };
}

function Home() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const markersRef = useRef<any[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pulling, setPulling] = useState(false);

  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [loading, setLoading] = useState(true);
  // ─── Multi-select category + advanced filters (mobile UX overhaul) ───
  const [activeCats, setActiveCats] = useState<string[]>([]); // [] = all
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [minYear, setMinYear] = useState<number | null>(null);
  const [maxYear, setMaxYear] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  // ─── Saved / explored (localStorage persistence) ───
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("ps_saved_events") || "[]"); } catch { return []; }
  });
  const [exploredIds, setExploredIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("ps_explored_events") || "[]"); } catch { return []; }
  });
  // ─── Content preference (Historical default / Mature / Graphic Detail) ───
  const [contentPref, setContentPref] = useState<string>(() => {
    if (typeof window === "undefined") return "historical";
    try { return localStorage.getItem("ps_content_pref") || "historical"; } catch { return "historical"; }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(
    null
  );
  // "Sensitive content — tap to reveal" (content-preference gating; reset per event)
  const [revealSensitive, setRevealSensitive] = useState(false);
  useEffect(() => {
    setRevealSensitive(false);
  }, [selectedEvent?.id]);
  const [mapReady, setMapReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiEvents, setApiEvents] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiSearchRadius, setApiSearchRadius] = useState(5000);
  const [showReel, setShowReel] = useState(false);
  const [showWhatWasHere, setShowWhatWasHere] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState<"reel" | "timeline" | null>(null);
  const [preferredCategories, setPreferredCategories] = useState<string[] | null>(null);
  const [showScanArea, setShowScanArea] = useState(false);
  const [videoStoryEvent, setVideoStoryEvent] = useState<HistoricalEvent | null>(null);
  // ─── Hide controls state (localStorage persisted) ───
  const [hiddenEventIds, setHiddenEventIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("ps_hidden_events") || "[]"); } catch { return []; }
  });
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("ps_hidden_cats") || "[]"); } catch { return []; }
  });
  const [showHideSettings, setShowHideSettings] = useState(false);
  // ─── Refine Location state ───
  const [refineLoading, setRefineLoading] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");

  const handleRefreshLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not available.");
      return;
    }
    setRefineLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError("");
        setRefineLoading(false);
      },
      (err) => {
        let msg = "Could not get your location.";
        if (err.code === 1) msg = "Location access denied. Enable it in your browser settings.";
        else if (err.code === 2) msg = "Location unavailable. Try again.";
        else if (err.code === 3) msg = "Location request timed out. Try again.";
        setLocationError(msg);
        setRefineLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // ─── Toggle a category in the multi-select filter (""/all clears) ───
  const handleToggleCat = useCallback((id: string) => {
    if (id === "all") { setActiveCats([]); return; }
    setActiveCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  // ─── Number of active filter dimensions (badge on Filters button) ───
  const filterCount =
    (activeCats.length > 0 ? 1 : 0) +
    (radiusKm != null ? 1 : 0) +
    (minYear != null || maxYear != null ? 1 : 0);

  // ─── Save / explore handlers (PART 2) ───
  const handleToggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("ps_saved_events", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const handleToggleExplored = useCallback((id: string) => {
    setExploredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("ps_explored_events", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const handleSetContentPref = useCallback((v: string) => {
    setContentPref(v);
    try { localStorage.setItem("ps_content_pref", v); } catch {}
  }, []);

  // ─── Tonight's Trail: up to 3 curated nearby stories (guided engagement) ───
  const trailEvents = useMemo(() => {
    if (!location) return [];
    return getNearbyEvents(location.lat, location.lng, 10000, "all", "distance", "")
      .filter((e) => !hiddenEventIds.includes(e.id) && !hiddenCategories.includes(e.category))
      .filter((e) => !(e as any).is_source || (e as any).is_source !== "news")
      .slice(0, 3);
  }, [location, hiddenEventIds, hiddenCategories]);

  // ─── Explored progress: count explored ids that exist in the nearby pool ───
  const exploredNearbyCount = useMemo(() => {
    const nearbyIds = new Set((location ? getNearbyEvents(location.lat, location.lng, 10000, "all", "distance", "") : []).map((e) => e.id));
    return exploredIds.filter((id) => nearbyIds.has(id)).length;
  }, [location, exploredIds]);

  // ─── Personalized count: "18 stories within 2 miles" when location available ───
  const personalizedCountLabel = useMemo(() => {
    if (!location) return null;
    const within2 = getNearbyEvents(location.lat, location.lng, 3.218, "all", "distance", "")
      .filter((e) => !hiddenEventIds.includes(e.id) && !hiddenCategories.includes(e.category))
      .filter((e) => !(e as any).is_source || (e as any).is_source !== "news");
    if (within2.length > 0) {
      return `${within2.length} ${within2.length === 1 ? "story" : "stories"} within 2 miles`;
    }
    const any = getNearbyEvents(location.lat, location.lng, 10000, "all", "distance", "")
      .filter((e) => !hiddenEventIds.includes(e.id) && !hiddenCategories.includes(e.category))
      .filter((e) => !(e as any).is_source || (e as any).is_source !== "news");
    return `${any.length} ${any.length === 1 ? "story" : "stories"} near you`;
  }, [location, hiddenEventIds, hiddenCategories]);

  // ─── Demo location (location-denied panel action) ───
  const handleUseDemoLocation = useCallback(() => {
    setLocation({ lat: 40.7128, lng: -74.006 });
    setLocationError("");
    setShowLocationSearch(false);
  }, []);

  const handleManualLocationSearch = useCallback(async (address: string) => {
    if (!address.trim()) return;
    setLocationSearchLoading(true);
    setLocationSearchError("");
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { "User-Agent": "PastShadows/1.0" } }
      );
      if (!resp.ok) throw new Error("Search failed");
      const data = await resp.json();
      if (!data || data.length === 0) {
        setLocationSearchError("Address not found. Try a different search.");
        setLocationSearchLoading(false);
        return;
      }
      const result = data[0];
      setLocation({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
      setLocationError("");
      setShowLocationSearch(false);
      setManualAddress("");
    } catch {
      setLocationSearchError("Could not search for this address. Try again.");
    }
    setLocationSearchLoading(false);
  }, []);

  // ─── User session token (declared before handleExportVideo so its useCallback
  // deps can reference it — SSR evaluates the deps array eagerly, before the old
  // declaration site, which caused "Cannot access 'userToken' before initialization")
  const [userToken, setUserToken] = useState<string>("");

  // ─── Export video handler (called from event card buttons) ───
  const [exportingEventId, setExportingEventId] = useState<string | null>(null);
  const [exportToast, setExportToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleExportVideo = useCallback(async (evt: HistoricalEvent) => {
    setExportingEventId(evt.id);
    setExportToast(null);
    try {
      const resp = await fetch("/api/export-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pro-only endpoint (server-enforced) — send the session token so Pro
          // users pass the gate; free/anon get a clean 401/403 from the server.
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({
          title: evt.title,
          description: evt.description,
          year: evt.year,
          category: evt.category,
          images: [],
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Export failed (${resp.status})`);
      }
      const result = await resp.json();
      // Convert base64 to blob and download
      const byteChars = atob(result.videoBase64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
      const byteArr = new Uint8Array(byteNums);
      const blob = new Blob([byteArr], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportToast({ type: "success", msg: "\u2705 Downloaded!" });
      setTimeout(() => setExportToast(null), 3000);
    } catch (err: any) {
      setExportToast({ type: "error", msg: err.message || "Export failed" });
      setTimeout(() => setExportToast(null), 5000);
    } finally {
      setExportingEventId(null);
    }
  }, [userToken]);
  // ─── Scan area event handler ───
  const handleScanEventGenerated = useCallback((event: any) => {
    // Add newly generated event to the map
    setAllEvents((prev: any[]) => {
      const exists = prev.some((e: any) => e.id === event.id);
      if (exists) return prev;
      return [...prev, event];
    });
    if (mapRef.current) {
      const ll = L.latLng(event.latitude || event.lat, event.longitude || event.lng);
      mapRef.current.flyTo(ll, 15, { duration: 1 });
    }
  }, []);

  // ─── Hide controls handlers ───
  const persistHiddenEvents = useCallback((ids: string[]) => {
    setHiddenEventIds(ids);
    try { localStorage.setItem("ps_hidden_events", JSON.stringify(ids)); } catch {}
  }, []);
  const persistHiddenCategories = useCallback((cats: string[]) => {
    setHiddenCategories(cats);
    try { localStorage.setItem("ps_hidden_cats", JSON.stringify(cats)); } catch {}
  }, []);
  const handleHideCategory = useCallback((cat: string) => {
    if (!hiddenCategories.includes(cat)) persistHiddenCategories([...hiddenCategories, cat]);
  }, [hiddenCategories, persistHiddenCategories]);
  const handleShowCategory = useCallback((cat: string) => {
    persistHiddenCategories(hiddenCategories.filter(c => c !== cat));
  }, [hiddenCategories, persistHiddenCategories]);
  const handleHideEvent = useCallback((evtId: string, cat: string) => {
    const newHiddenCats = hiddenCategories.includes(cat) ? hiddenCategories : [...hiddenCategories, cat];
    const newHiddenEvents = hiddenEventIds.includes(evtId) ? hiddenEventIds : [...hiddenEventIds, evtId];
    persistHiddenCategories(newHiddenCats);
    persistHiddenEvents(newHiddenEvents);
  }, [hiddenCategories, hiddenEventIds, persistHiddenCategories, persistHiddenEvents]);
  const handleUnhideEvent = useCallback((evtId: string) => {
    persistHiddenEvents(hiddenEventIds.filter(id => id !== evtId));
  }, [hiddenEventIds, persistHiddenEvents]);
  const handleResetHidden = useCallback(() => {
    persistHiddenEvents([]);
    persistHiddenCategories([]);
  }, [persistHiddenEvents, persistHiddenCategories]);
  // ─── Landing page state ───
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      // Map-first on mobile: skip the landing/hero overlay entirely.
      if (window.matchMedia("(max-width: 640px)").matches) return false;
      return localStorage.getItem("ps_landing_dismissed") !== "true";
    }
    catch { return true; }
  });
  const [landingEmail, setLandingEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    try { return parseInt(localStorage.getItem("ps_waitlist_count") || "0", 10); }
    catch { return 0; }
  });

  const handleDismissLanding = () => {
    setShowLanding(false);
    try { localStorage.setItem("ps_landing_dismissed", "true"); } catch {}
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!landingEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(landingEmail)) return;
    let isNew = false;
    try {
      const existing = JSON.parse(localStorage.getItem("ps_waitlist") || "[]");
      if (!existing.includes(landingEmail.trim())) {
        existing.push(landingEmail.trim());
        localStorage.setItem("ps_waitlist", JSON.stringify(existing));
        const newCount = existing.length;
        localStorage.setItem("ps_waitlist_count", String(newCount));
        setWaitlistCount(newCount);
        isNew = true;
      }
    } catch {}
    setEmailSubmitted(true);
    setLandingEmail("");
    // Analytics: waitlist conversion (counted once per new email).
    if (isNew) track("waitlist_signup");
  };
  // ─── News articles state ───
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // ─── User auth state ───
  const navigate = useNavigate();
  const [userTier, setUserTier] = useState<string>("free");
  const [userEmail, setUserEmail] = useState<string>("");
  const [eventsUsed, setEventsUsed] = useState(0);
  const [eventsLimit, setEventsLimit] = useState(5);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // ─── Pro gating: blocked if free user hit daily limit ───
  const isBlocked = useMemo(() => {
    if (userTier !== "free") return false;
    return eventsUsed >= eventsLimit;
  }, [userTier, eventsUsed, eventsLimit]);

  // Fetch user status on mount
  useEffect(() => {
    const token = localStorage.getItem("ps_token") || "";
    const email = localStorage.getItem("ps_email") || "";
    setUserToken(token);
    setUserEmail(email);
    if (token) {
      fetch(`/api/user/status?token=${token}`)
        .then(r => r.json())
        .then(data => {
          setUserTier(data.tier || "free");
          setEventsUsed(data.events_used_today || 0);
          setEventsLimit(data.events_limit || 5);
          localStorage.setItem("ps_tier", data.tier || "free");
        })
        .catch(() => {});
    }
  }, []);
  // Anonymous users: sync the local 5-event counter into eventsUsed so the
  // free-tier gate (isBlocked: banner / Reel / Scan / Load more) applies to them too
  useEffect(() => {
    const token = localStorage.getItem("ps_token") || "";
    if (!token) {
      const anonKey = `ps_anon_events_${getToday()}`;
      const count = parseInt(localStorage.getItem(anonKey) || "0", 10);
      setEventsUsed(count);
    }
  }, []);

  // ─── Featured events pool (for empty states) ───
  const FEATURED_EVENTS = [
    { id: "feat-1", title: "Mount Vesuvius Erupts (Pompeii)", date: "79 AD", year: 79, description: "The catastrophic eruption of Mount Vesuvius buried Pompeii and Herculaneum in ash, preserving Roman life in haunting detail. Thousands perished in one of history's most famous disasters.", category: "disaster", lat: 40.7489, lng: 14.4813, distanceKm: 0 },
    { id: "feat-2", title: "Jack the Ripper's First Murder", date: "1888", year: 1888, description: "The unidentified serial killer known as Jack the Ripper terrorized London's Whitechapel district, murdering at least five women in brutal fashion. The case remains one of history's greatest unsolved mysteries.", category: "crime", lat: 51.5140, lng: -0.0680, distanceKm: 0 },
    { id: "feat-3", title: "The Great Fire of London", date: "1666", year: 1666, description: "A catastrophic fire swept through central London, destroying 87 churches, 13,200 houses, and leaving tens of thousands homeless over four days.", category: "disaster", lat: 51.5179, lng: -0.0920, distanceKm: 0 },
    { id: "feat-4", title: "Titanic Sinks on Maiden Voyage", date: "1912", year: 1912, description: "The 'unsinkable' RMS Titanic struck an iceberg on its maiden voyage and sank, claiming over 1,500 lives. The disaster led to major maritime safety reforms.", category: "disaster", lat: 41.7325, lng: -49.9470, distanceKm: 0 },
    { id: "feat-5", title: "Colosseum Gladiator Games", date: "80 AD", year: 80, description: "The Roman Colosseum hosted its inaugural games, featuring 100 days of gladiatorial combat and animal hunts. Over 9,000 animals were slaughtered during the festivities.", category: "death", lat: 41.8902, lng: 12.4922, distanceKm: 0 },
    { id: "feat-6", title: "The Black Death Arrives in Europe", date: "1347", year: 1347, description: "The bubonic plague pandemic arrived in Europe via merchant ships, eventually killing 30-60% of Europe's population — one of the deadliest pandemics in human history.", category: "death", lat: 43.2965, lng: 5.3698, distanceKm: 0 },
    { id: "feat-7", title: "Chernobyl Nuclear Disaster", date: "1986", year: 1986, description: "A catastrophic nuclear accident at the Chernobyl power plant released massive radiation, forcing the evacuation of 350,000 people and creating an exclusion zone that remains today.", category: "disaster", lat: 51.3890, lng: 30.0990, distanceKm: 0 },
    { id: "feat-8", title: "The Salem Witch Trials", date: "1692", year: 1692, description: "A wave of hysteria in colonial Massachusetts led to 200 accusations of witchcraft and 20 executions. The trials remain a dark cautionary tale of mass delusion.", category: "mystery", lat: 42.5195, lng: -70.8967, distanceKm: 0 },
  ] as const;

  // ─── Engagement stats (localStorage) ───
  const [exploredCount, setExploredCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      return parseInt(localStorage.getItem("ps_explored") || "0", 10);
    } catch { return 0; }
  });
  const trackExplore = useCallback(() => {
    // Server-side tracking
    if (userToken) {
      fetch(`/api/user/track-event?token=${userToken}`, { method: "POST" })
        .then(r => r.json())
        .then(data => {
          if (data.blocked) {
            setShowUpgradePrompt(true);
          }
          setEventsUsed(data.events_used_today || eventsUsed + 1);
          setEventsLimit(data.events_limit || 5);
        })
        .catch(() => {});
    }
    setExploredCount((prev) => {
      const next = prev + 1;
      try { localStorage.setItem("ps_explored", String(next)); } catch {}
      return next;
    });
    // Check if free user hit the limit
    if (userTier === "free" && !userToken) {
      // Anonymous users: track in local storage
      const anonKey = `ps_anon_events_${getToday()}`;
      const count = parseInt(localStorage.getItem(anonKey) || "0", 10);
      localStorage.setItem(anonKey, String(count + 1));
      setEventsUsed(count + 1);
      if (count + 1 >= 5) {
        setShowUpgradePrompt(true);
      }
    }
  }, [userToken, userTier, eventsUsed]);

  // Merge curated + API events into a unified list
  const allEvents = useMemo(() => {
    if (!location) return [];
    const nearby = getNearbyEvents(location.lat, location.lng, 5000, "all", "distance", "");
    const curatedWithSource = nearby.map((e) => ({
      ...e,
      is_source: "curated" as const,
    }));
    // Merge API results (no duplicates within 50m of curated)
    const apiWithSource = apiEvents
      .filter((apiEvt) => {
        return !nearby.some(
          (cur) =>
            haversineKm(cur.lat, cur.lng, apiEvt.lat, apiEvt.lng) < 0.05
        );
      })
      .map((e) => ({ ...e, is_source: "live" as const }));

    // Merge dark-history news articles into the feed
    const now = new Date();
    const newsWithSource = newsArticles
      .filter(a => ["crime", "disaster", "death", "war_conflict", "accident"].includes(a.category))
      .slice(0, 5) // show top 5 relevant news
      .map((a, i) => {
        const pubDate = a.published_at ? new Date(a.published_at) : null;
        const daysAgo = pubDate ? Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
        const recentlyLabel = daysAgo !== null
          ? daysAgo === 0 ? "Today"
            : daysAgo === 1 ? "Yesterday"
            : daysAgo <= 7 ? `${daysAgo} days ago`
            : daysAgo <= 30 ? `${Math.floor(daysAgo / 7)} weeks ago`
            : null
          : null;
        return {
          id: `news-${i}`,
          title: a.title,
          description: a.description,
          category: a.category,
          year: parseInt((a.published_at || "").slice(0, 4)) || new Date().getFullYear(),
          date: a.published_at || "Recent",
          recentlyLabel,
          publishedAt: a.published_at,
          lat: location.lat,
          lng: location.lng,
          distanceKm: 0.5 + i * 0.5, // fake distance so they sort among events
          is_source: "news" as const,
          source: a.source,
          url: a.url,
        };
      });

    const combined = [...curatedWithSource, ...apiWithSource, ...newsWithSource];

    // Apply category and search filters on combined list
    let filtered = combined;
    if (activeCats.length > 0) {
      filtered = filtered.filter((e) => activeCats.includes(e.category));
    }
    if (radiusKm != null) {
      filtered = filtered.filter((e) => e.distanceKm <= radiusKm);
    }
    if (minYear != null) {
      filtered = filtered.filter((e) => e.year >= minYear);
    }
    if (maxYear != null) {
      filtered = filtered.filter((e) => e.year <= maxYear);
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }
    // Sort
    if (sortMode === "distance") {
      filtered.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortMode === "date-desc") {
      filtered.sort((a, b) => b.year - a.year);
    } else if (sortMode === "date-asc") {
      filtered.sort((a, b) => a.year - b.year);
    }
    // Filter out hidden categories and events
    if (hiddenCategories.length > 0 || hiddenEventIds.length > 0) {
      filtered = filtered.filter(e => !hiddenCategories.includes(e.category) && !hiddenEventIds.includes(e.id));
    }
    // Apply category preferences from picker (session-only)
    if (preferredCategories && preferredCategories.length > 0) {
      filtered = filtered.filter(e => preferredCategories.includes(e.category));
    }
    return filtered;
  }, [location, activeCats, radiusKm, minYear, maxYear, sortMode, searchQuery, apiEvents, hiddenCategories, hiddenEventIds, preferredCategories]);

  // ─── Saved stories resolved against the current pool (needs allEvents) ───
  const savedEvents = useMemo(() => {
    if (savedIds.length === 0) return [];
    return allEvents.filter((e) => savedIds.includes(e.id));
  }, [savedIds, allEvents]);

  // ─── Landing page preview cards (famous curated stories, display order) ───
  const landingPreviewEvents = useMemo(() => {
    // Resolve against the full curated dataset (not allEvents, which is empty
    // before the user grants location — the landing shows pre-location).
    const byId = new Map(curatedEvents.map((e) => [e.id, e]));
    return SAMPLE_LANDING_IDS.map((id) => byId.get(id)).filter(Boolean) as HistoricalEvent[];
  }, []);

  // ─── Events with images for spotlight strip ───
  const eventsWithImages = useMemo(() => {
    // Only show curated (non-scanned) dark-history events in the reel
    const darkCats = ['crime','disaster','death','cemetery','war_conflict','execution','riot','mystery','prison','memorial'];
    return allEvents
      .filter(e => e.imageUrl && !e.id?.startsWith('scan-') && (!e.category || darkCats.includes(e.category)))
      .slice(0, 15);
  }, [allEvents]);

  // ─── Today in History ───
  const todayRef = useRef(new Date());
  const todayStr = todayRef.current.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const todayInHistoryEvent = useMemo(() => {
    if (!allEvents || allEvents.length === 0) return null;
    const dayOfYear = Math.floor(
      (todayRef.current.getTime() - new Date(todayRef.current.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const idx = dayOfYear % allEvents.length;
    return allEvents[idx];
  }, [allEvents]);

  // ─── Fetch live API events when location loads ───
  useEffect(() => {
    if (!location) return;
    let cancelled = false;

    async function fetchApi() {
      setApiLoading(true);
      for (const radius of [5000, 10000, 50000]) {
        if (cancelled) return;
        setApiSearchRadius(radius);
        try {
          const tokenParam = userToken ? `&token=${encodeURIComponent(userToken)}` : "";
          const resp = await fetch(
            `/api/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}${tokenParam}`
          );
          if (!resp.ok) continue;
          const data = await resp.json();
          if (cancelled) return;
          const results = (data.results || []).map((r: any) => ({
            ...r,
            date: r.year ? String(r.year) : "Unknown",
          }));
          setApiEvents(results);
          // Check if we have enough events; if so, stop expanding
          if (results.length >= 5) break;
        } catch {
          // Silently fail — curated data is fallback
        }
      }
      if (!cancelled) setApiLoading(false);
    }

    fetchApi();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, userToken]);

  // ─── Fetch recent news when location loads ───
  useEffect(() => {
    if (!location) return;
    // News articles are a Pro feature (server-enforced LOW-1): only signed-in
    // users fetch; the server returns 401/403 if the account isn't Pro, which we
    // surface as an empty list (free/anonymous news UI is intentionally absent).
    if (!userToken) {
      setNewsArticles([]);
      setNewsLoading(false);
      return;
    }
    let cancelled = false;

    async function fetchNews() {
      setNewsLoading(true);
      try {
        const resp = await fetch(
          `/api/nearby/news?lat=${location.lat}&lng=${location.lng}&radius=100&token=${encodeURIComponent(userToken)}`
        );
        if (!resp.ok) throw new Error("News API error");
        const data = await resp.json();
        if (cancelled) return;
        setNewsArticles(data.articles || []);
      } catch {
        // Silently fail — news is supplementary
        if (!cancelled) setNewsArticles([]);
      }
      if (!cancelled) setNewsLoading(false);
    }

    fetchNews();
    return () => { cancelled = true; };
  }, [location, userToken]);

  // ─── Get user's location ───
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not available. Try a modern browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        let msg = "Could not get your location.";
        if (err.code === 1)
          msg = "Location access denied. Allow it in your browser, or pick an option below.";
        else if (err.code === 2) msg = "Location unavailable. Try again, or pick an option below.";
        else if (err.code === 3) msg = "Location request timed out. Try again, or pick an option below.";
        setLocationError(msg);
        setLoading(false);
        // Do NOT silently fall back to a default location — the 3-action panel
        // (Allow location / Search a city / Use New York demo) stays visible.
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // ─── Init Leaflet map (client-side only) ───
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Poll until map container is attached, then init Leaflet (fixes BUG-02 retry)
    let attempts = 0;
    const MAX_ATTEMPTS = 50; // 5 seconds
    const initTimer = setInterval(() => {
      attempts++;
      if (mapInstanceRef.current) { clearInterval(initTimer); return; }
      if (!mapRef.current) {
        if (attempts >= MAX_ATTEMPTS) { clearInterval(initTimer); console.error("Map container never mounted"); }
        return;
      }
      // Container is ready — stop polling and init
      clearInterval(initTimer);

      import("leaflet").then((leaflet) => {
        const L = leaflet.default || leaflet;
        if (!mapRef.current || mapInstanceRef.current) return;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const center: [number, number] = location
          ? [location.lat, location.lng]
          : [40.7128, -74.006];

        const isMobile = window.matchMedia("(max-width: 640px)").matches;
        const userLocated = !!location;

        const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        const map = L.map(mapRef.current!, {
          center,
          zoom: userLocated ? 14 : 4,
          zoomControl: true,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: !isTouch,
          touchZoom: isTouch,
          bounceAtZoomLimits: false,
        });

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution: "",
            subdomains: "abcd",
            maxZoom: 19,
          }
        ).addTo(map);

        // User marker
        if (location) {
          const userIcon = L.divIcon({
            html: `<div style="background:#8b0000;width:16px;height:16px;border-radius:50%;border:3px solid #e8e8e8;box-shadow:0 0 12px rgba(139,0,0,0.6);"></div>`,
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          L.marker([location.lat, location.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup("<strong>You are here</strong>");
        }

        mapInstanceRef.current = map;
        setMapReady(true);

        // Mobile: invalidateSize on resize
        const handleResize = () => { if (mapInstanceRef.current) { requestAnimationFrame(() => { mapInstanceRef.current?.invalidateSize(); }); } }; resizeHandlerRef.current = handleResize;
        window.addEventListener("resize", handleResize);
        requestAnimationFrame(() => map.invalidateSize());
      });
    }, 100);

    return () => {
      clearInterval(initTimer);
      if (resizeHandlerRef.current) window.removeEventListener("resize", resizeHandlerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!location, showLanding]);

  // ─── Re-invalidate map when landing dismisses (fixes BUG-02) ───
  useEffect(() => {
    if (!showLanding && mapInstanceRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mapInstanceRef.current?.invalidateSize();
        });
      });
    }
  }, [showLanding]);

  // ─── Update map markers ───
  const addEventMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    const L = (window as any).L;
    if (!L) return;

    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const colorMap: Record<string, string> = {
      crime: "#8b0000",
      death: "#555555",
      disaster: "#cc5500",
      mystery: "#7b68ee",
      cemetery: "#6b8e6b",
      war_conflict: "#5c4033",
      memorial: "#b8860b",
      prison: "#708090",
      execution: "#4a0000",
      riot: "#ff4500",
      historical: "#8b7355",
      local_legends: "#9b59b6",
    };

    allEvents.slice(0, 30).forEach((evt) => {
      const color = colorMap[evt.category] || "#888";
      const icon = L.divIcon({
        html: `<div class="animate-marker-pulse" style="background:${color};width:12px;height:12px;border-radius:2px;border:2px solid #e8e8e8;transform:rotate(45deg);box-shadow:0 0 10px ${color}66;cursor:pointer;"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([evt.lat, evt.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="max-width:200px">
            <strong style="color:#c9a96e;font-family:Georgia,serif;">${evt.title}</strong><br/>
            <span style="color:#a0a0b0;font-size:0.85em;">${evt.date}</span><br/>
            <span style="color:#e8e8e8;font-size:0.85em;">${evt.description.substring(0, 100)}...</span>
            <button onclick="window.__psNavigate && window.__psNavigate(${evt.lat},${evt.lng})" style="margin-top:6px;background:#c9a96e20;border:1px solid #c9a96e40;border-radius:4px;padding:4px 12px;color:#c9a96e;cursor:pointer;font-size:12px;">📍 Navigate</button>
           </div>`,
          { maxWidth: 220 }
        );

      marker.on("click", () => setSelectedEvent(evt));
      markersRef.current.push(marker);
    });
  }, [allEvents, mapReady]);

  useEffect(() => {
    addEventMarkers();
  }, [addEventMarkers]);

  // Expose navigate helper for popup buttons
  useEffect(() => {
    (window as any).__psNavigate = (lat: number, lng: number) => {
      const nav = getNavUrl(lat, lng);
      window.open(nav.url, "_blank");
    };
    return () => {
      delete (window as any).__psNavigate;
    };
  }, []);

  // ─── Pull to refresh ───
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (feedRef.current && feedRef.current.scrollTop === 0) {
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 60) {
        setPulling(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pulling) {
      setPulling(false);
      setRefreshing(true);
      // Simulate refresh: re-trigger allEvents computation
      setTimeout(() => {
        setRefreshing(false);
      }, 600);
    }
  };

  // ─── Navigate handler ───
  const handleNavigate = (evt: HistoricalEvent) => {
    const nav = getNavUrl(evt.lat, evt.lng);
    window.open(nav.url, "_blank");
  };

  // ─── Fly to event on map ───
  const flyToEvent = (evt: HistoricalEvent) => {
    if (mapInstanceRef.current && mapReady) {
      mapInstanceRef.current.flyTo([evt.lat, evt.lng], 10, {
        duration: 1.2,
      });
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-dark-900">
      {/* ─── Landing Page Overlay ─── */}
      {showLanding && (
        <div className="fixed inset-0 z-[99999] flex flex-col overflow-y-auto bg-dark-900 safe-top safe-bottom">
          <div className="flex min-h-dvh flex-col">
            {/* Hero */}
            <section className="hero-glow relative flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center noise-overlay">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,0,0,0.15),transparent_70%)]" />
              <ParticleOverlay count={20} />
              <span className="relative text-accent-gold/80 animate-float select-none">{React.createElement(IconTombstone, { size: 72, className: "sm:w-20 sm:h-20" })}</span>
              <h1 className="relative mt-6 font-serif text-5xl font-bold tracking-tight text-accent-gold text-glow sm:text-7xl">
                Unearth the Dark History<br className="sm:hidden" /> Beneath Your Feet
              </h1>
              <p className="relative mt-4 max-w-lg text-base leading-relaxed text-ghost-dim sm:text-lg">
                Stand anywhere. Discover the crimes, mysteries, and macabre events hiding beneath your location. Real history from public records.
              </p>
              <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => {
                    handleDismissLanding();
                    // Immediate exploration: ask for location when starting
                    if (!location) handleRefreshLocation();
                  }}
                  className="btn-glow flex min-h-[52px] items-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 px-8 text-base font-bold text-accent-gold transition-all duration-200 hover:bg-accent-gold/25 hover:shadow-glow-red active:scale-95"
                >
                  {React.createElement(IconMapPin, { size: 20 })}
                  <span>Start Exploring</span>
                </button>
                <button
                  onClick={handleDismissLanding}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-dark-500 bg-dark-800/60 px-5 text-sm font-medium text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-95"
                >
                  Browse the map
                </button>
              </div>
              <p className="relative mt-3 text-xs text-ghost-dim/50 sm:text-sm">
                {personalizedCountLabel ? (
                  <span className="text-accent-gold/80">{personalizedCountLabel} — tap to explore</span>
                ) : (
                  "No sign-up required · Free stories near you"
                )}
              </p>
              {/* Story preview: compact curated cards under the CTA */}
              <div className="relative mt-8 w-full max-w-3xl">
                <div className="flex gap-3 overflow-x-auto pb-2 px-1 -mx-1 scrollbar-thin">
                  {landingPreviewEvents.map((evt) => {
                    return (
                      <button
                        key={evt.id}
                        onClick={() => {
                          const full = curatedEvents.find((e) => e.id === evt.id) || evt;
                          handleDismissLanding();
                          if (full) {
                            setSelectedEvent(full);
                            flyToEvent(full);
                          }
                        }}
                        className="group relative w-44 shrink-0 overflow-hidden rounded-xl border border-dark-600 bg-dark-800/70 text-left transition-all duration-200 hover:border-accent-gold/50 hover:shadow-glow-red"
                      >
                        {evt.imageUrl ? (
                          <img src={evt.imageUrl} alt={evt.title} loading="lazy" className="h-24 w-full object-cover" />
                        ) : (
                          <div className="flex h-24 w-full items-center justify-center bg-dark-800/90">
                            {(() => {
                              const I = CATEGORY_ICONS[evt.category];
                              return I ? React.createElement(I, { size: 28, className: "text-accent-gold/60" }) : null;
                            })()}
                          </div>
                        )}
                        <div className="p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-gold/70">
                            {String(evt.category).replace("_", " ")}
                          </span>
                          <h3 className="mt-0.5 line-clamp-2 font-serif text-sm font-bold leading-snug text-ghost group-hover:text-accent-gold">
                            {evt.title}
                          </h3>
                          <p className="mt-1 text-[11px] text-ghost-dim/60">{evt.date}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Email Waitlist */}
            <section className="mx-auto w-full max-w-md px-6 pb-8">
              <div className="rounded-xl border border-dark-600 bg-dark-800/60 p-6 text-center">
                <span className="text-2xl text-accent-gold/60">{React.createElement(IconClose, { size: 20, className: "mx-auto" })}</span>
                <h3 className="mt-2 font-serif text-base font-bold text-ghost">Get Early Access</h3>
                <p className="mt-1 text-xs text-ghost-dim/70">Be the first to know about new dark history locations, features, and curated tours.</p>
                {emailSubmitted ? (
                  <div className="mt-4 rounded-lg border border-accent-gold/20 bg-accent-gold/10 px-4 py-3">
                    <p className="text-sm font-medium text-accent-gold flex items-center justify-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-accent-gold/40 bg-accent-gold/10">✓</span> You're on the list!</p>
                    <p className="mt-1 text-xs text-ghost-dim/60">{waitlistCount} other{waitlistCount !== 1 ? 's' : ''} exploring hidden history</p>
                  </div>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={landingEmail}
                      onChange={(e) => setLandingEmail(e.target.value)}
                      className="min-h-[44px] flex-1 rounded-xl border border-dark-600 bg-dark-800/80 px-4 text-sm text-ghost placeholder-ghost-dim/50 transition-colors focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                      required
                    />
                    <button
                      type="submit"
                      className="btn-glow min-h-[44px] rounded-xl border border-accent-gold/40 bg-accent-gold/15 px-5 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25 active:scale-95"
                    >
                      Join Waitlist
                    </button>
                  </form>
                )}
                <p className="mt-3 text-xs text-ghost-dim/40">
                  <span className="mr-1">•</span> Join {waitlistCount > 0 ? waitlistCount : "0"} other{waitlistCount !== 1 ? 's' : ''} exploring hidden history
                </p>
              </div>
            </section>

            {/* Content preference (onboarding) */}
            <section className="mx-auto w-full max-w-md px-6 pb-8">
              <div className="rounded-xl border border-dark-600 bg-dark-800/60 p-6">
                <h3 className="text-center font-serif text-base font-bold text-accent-gold">How much detail do you want?</h3>
                <p className="mt-1 text-center text-xs text-ghost-dim/70">You can change this anytime from Filters.</p>
                <div className="mt-4">
                  <ContentPreferencePicker value={contentPref as any} onChange={handleSetContentPref} compact />
                </div>
              </div>
            </section>
            {/* Features Grid */}
            <section className="mx-auto w-full max-w-4xl px-6 pb-10">
              <h2 className="mb-6 text-center font-serif text-lg font-bold text-accent-gold">Everything You Need to Explore the Dark Past</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card-enhanced rounded-xl border border-dark-600 bg-dark-800/40 p-5 transition-all duration-200 hover:border-dark-500">
                  {React.createElement(IconMapPin, { size: 24, className: "text-accent-gold/70" })}
                  <h3 className="mt-2 font-serif text-sm font-bold text-ghost">Live API Discovery</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ghost-dim/70">Queries Wikipedia, Wikidata, and OpenStreetMap to surface dark history at any location worldwide.</p>
                </div>
                <div className="card-enhanced rounded-xl border border-dark-600 bg-dark-800/40 p-5 transition-all duration-200 hover:border-dark-500">
                  {React.createElement(IconPlay, { size: 24, className: "text-accent-gold/70" })}
                  <h3 className="mt-2 font-serif text-sm font-bold text-ghost">History Reel</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ghost-dim/70">An immersive full-screen story experience that narrates the darkest chapters of your location.</p>
                </div>
                <div className="card-enhanced rounded-xl border border-dark-600 bg-dark-800/40 p-5 transition-all duration-200 hover:border-dark-500">
                  {React.createElement(IconMapPin, { size: 24, className: "text-accent-red-light/70" })}
                  <h3 className="mt-2 font-serif text-sm font-bold text-ghost">GPS Navigation</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ghost-dim/70">Navigate to haunted sites, crime scenes, and historical landmarks with Apple Maps or Google Maps.</p>
                </div>
                <div className="card-enhanced rounded-xl border border-dark-600 bg-dark-800/40 p-5 transition-all duration-200 hover:border-dark-500">
                  {React.createElement(IconScroll, { size: 24, className: "text-accent-gold/70" })}
                  <h3 className="mt-2 font-serif text-sm font-bold text-ghost">Breaking News</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ghost-dim/70">Stay informed with recent crime, disaster, and dark history news articles near your location.</p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-dark-600 bg-dark-900 py-6 text-center">
              <div className="mx-auto max-w-md px-6">
                <p className="text-xs text-ghost-dim">Past Shadows — Unearthing the hidden history beneath your feet.</p>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-ghost-dim/50">
                  <a href="/blog" className="inline-flex min-h-[44px] items-center px-1 transition-colors hover:text-ghost-dim">Blog</a>
                  <span className="text-ghost-dim/20">|</span>
                  <a href="/terms" className="inline-flex min-h-[44px] items-center px-1 transition-colors hover:text-ghost-dim" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                  <span className="text-ghost-dim/20">|</span>
                  <a href="/privacy" className="inline-flex min-h-[44px] items-center px-1 transition-colors hover:text-ghost-dim" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                </div>
                <p className="mt-2 text-[10px] text-ghost-dim/30">
                  Data sourced from public records, historical archives, and live APIs.
                </p>
              </div>
            </footer>
          </div>
        </div>
      )}

{!showLanding && <div className="relative h-dvh w-full overflow-hidden sm:h-auto sm:min-h-dvh sm:overflow-visible">
      {/* ─── Header ─── */}
      <header className="absolute inset-x-0 top-0 z-[1100] border-b border-dark-600 bg-dark-900/95 backdrop-blur-sm safe-top sm:sticky sm:z-50">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-2.5">
          <span className="text-accent-gold/80 select-none">{React.createElement(IconTombstone, { size: 22, className: "sm:w-6 sm:h-6" })}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-wide text-accent-gold text-glow leading-tight sm:text-xl">
              Past Shadows
            </h1>
            <p className="hidden text-[11px] text-ghost-dim truncate sm:block sm:text-xs">
              {todayStr} · Unearth the history beneath your feet
            </p>
          </div>

          {/* Free tier usage counter */}
          {userTier === "free" && eventsUsed > 0 && (
            <span className="hidden min-h-[28px] items-center gap-1 rounded-full border border-dark-600 bg-dark-800/80 px-3 py-1 text-[11px] text-ghost-dim select-none sm:flex">
              <span>{eventsUsed}/{eventsLimit}</span>
            </span>
          )}
          {/* Pro badge */}
          {userTier !== "free" && (
            <span className="hidden min-h-[28px] items-center gap-1 rounded-full border border-accent-gold/40 bg-accent-gold/15 px-3 py-1 text-xs font-bold text-accent-gold select-none sm:flex">
              <span>⚡</span>
              <span>Pro</span>
            </span>
          )}

          {/* Search (location) */}
          <button
            onClick={() => { setShowLocationSearch(!showLocationSearch); setShowOverflow(false); }}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full border px-2 text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-95 sm:px-3 ${
              showLocationSearch ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold" : "border-dark-600 bg-dark-800/80"
            }`}
            aria-label="Search a city or address"
            title="Search a city or address"
          >
            {React.createElement(IconSearch, { size: 18 })}
            <span className="hidden sm:inline text-xs">Search</span>
          </button>

          {/* GPS Refine */}
          <button
            onClick={handleRefreshLocation}
            disabled={refineLoading}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full border border-dark-600 bg-dark-800/80 px-2 text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-95 disabled:opacity-50 sm:px-3"
            title="Refine your GPS location"
            aria-label="Refine GPS location"
          >
            {refineLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ghost-dim border-t-transparent" />
            ) : (
              React.createElement(IconMapPin, { size: 18 })
            )}
            <span className="hidden sm:inline text-xs">Refine</span>
          </button>

          {/* Reel — standout action */}
          <button
            onClick={() => {
              if (allEvents.length > 0 && (!isBlocked || userTier !== "free")) setShowCategoryPicker("reel");
              else if (isBlocked) setShowUpgradePrompt(true);
            }}
            disabled={allEvents.length === 0 || isBlocked}
            className={`flex min-h-[44px] items-center justify-center gap-1 rounded-lg border px-2.5 text-sm font-bold transition-colors active:scale-95 sm:px-3 ${
              allEvents.length === 0 || isBlocked
                ? "border-dark-600 bg-dark-700/30 text-ghost-dim/30 cursor-not-allowed"
                : "border-accent-gold/50 bg-accent-gold/20 text-accent-gold shadow-glow-red hover:bg-accent-gold/30"
            }`}
            aria-label="Open History Reel"
            title="History Reel"
          >
            {React.createElement(IconPlay, { size: 18 })}
            <span className="text-sm sm:text-base">Reel</span>
          </button>

          {/* Overflow menu (⋯) */}
          <div className="relative">
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-dark-600 bg-dark-700/50 text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-95"
              aria-label="More options"
              title="More options"
            >
              {React.createElement(IconMenu, { size: 20 })}
            </button>
            {showOverflow && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOverflow(false)} />
                <div className="absolute right-0 top-12 z-50 min-w-[210px] rounded-xl border border-dark-500 bg-dark-800 p-1.5 shadow-2xl animate-fade-in-up">
                  {location && (
                    <p className="px-3 py-1.5 text-[10px] font-mono text-ghost-dim/50 truncate">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </p>
                  )}
                  <button
                    onClick={() => { setShowLocationSearch(true); setShowOverflow(false); }}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-ghost-dim transition-colors hover:bg-dark-700 hover:text-ghost"
                  >
                    {React.createElement(IconSearch, { size: 16 })}
                    <span>Search a city</span>
                  </button>
                  <button
                    onClick={() => { if (location) { if (!isBlocked || userTier !== "free") setShowCategoryPicker("timeline"); else setShowUpgradePrompt(true); } setShowOverflow(false); }}
                    disabled={!location}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-ghost-dim transition-colors hover:bg-dark-700 hover:text-ghost disabled:opacity-40"
                  >
                    {React.createElement(IconScroll, { size: 16 })}
                    <span>Timeline</span>
                  </button>
                  <button
                    onClick={() => { if (location) { if (!isBlocked || userTier !== "free") setShowScanArea(true); else setShowUpgradePrompt(true); } setShowOverflow(false); }}
                    disabled={!location}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-ghost-dim transition-colors hover:bg-dark-700 hover:text-ghost disabled:opacity-40"
                  >
                    {React.createElement(IconPlus, { size: 16 })}
                    <span>Scan My Area</span>
                  </button>
                  <button
                    onClick={() => { setShowTrail(true); setShowOverflow(false); }}
                    disabled={!location}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-ghost-dim transition-colors hover:bg-dark-700 hover:text-ghost disabled:opacity-40"
                  >
                    {React.createElement(IconPlay, { size: 16 })}
                    <span>Tonight's Trail</span>
                    {trailEvents.length > 0 && (
                      <span className="ml-auto rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-bold text-accent-gold">
                        {trailEvents.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowSaved(true); setShowOverflow(false); }}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-ghost-dim transition-colors hover:bg-dark-700 hover:text-ghost"
                  >
                    <svg className="h-4 w-4 shrink-0" fill={savedIds.length > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.99 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span>Saved stories</span>
                    {savedIds.length > 0 && (
                      <span className="ml-auto rounded-full border border-dark-500 bg-dark-700 px-2 py-0.5 text-[10px] font-bold text-ghost-dim">
                        {savedIds.length}
                      </span>
                    )}
                  </button>
                  <div className="my-1 border-t border-dark-600/60" />
                  <button
                    onClick={() => navigate({ to: userToken ? "/auth" : "/auth" })}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-ghost-dim transition-colors hover:bg-dark-700 hover:text-ghost"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{userToken ? "Account" : "Sign In"}</span>
                  </button>
                  <button
                    onClick={() => { setShowHideSettings(true); setShowOverflow(false); }}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-ghost-dim transition-colors hover:bg-dark-700 hover:text-ghost"
                  >
                    <span className="text-sm">🙈</span>
                    <span>Hidden items</span>
                  </button>
                  <button
                    onClick={() => { setShowLanding(true); setShowOverflow(false); }}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-ghost-dim transition-colors hover:bg-dark-700 hover:text-ghost"
                  >
                    {React.createElement(IconTombstone, { size: 16 })}
                    <span>About &amp; Waitlist</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Manual Location Search Panel ─── */}
        {showLocationSearch && (
          <div className="border-t border-dark-600/50 bg-dark-800/80 px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleManualLocationSearch(manualAddress);
                }}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <div className="relative flex-1">
                  {React.createElement(IconSearch, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-ghost-dim" })}
                  <input
                    type="text"
                    placeholder="Search an address, city, or landmark..."
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-dark-600 bg-dark-900/80 pl-9 pr-4 text-base text-ghost placeholder-ghost-dim/50 transition-colors focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={locationSearchLoading || !manualAddress.trim()}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 px-5 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {locationSearchLoading ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border border-accent-gold border-t-transparent" />
                  ) : (
                    React.createElement(IconSearch, { size: 16 })
                  )}
                  <span>Locate</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLocationSearch(false); setLocationSearchError(""); }}
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-dark-500 bg-dark-700 px-4 text-sm text-ghost-dim transition-colors hover:bg-dark-600 active:scale-95"
                >
                  Cancel
                </button>
              </form>
              {locationSearchError && (
                <p className="mt-2 text-xs text-accent-red-light">{locationSearchError}</p>
              )}
              <p className="mt-1 text-[10px] text-ghost-dim/30">Powered by OpenStreetMap Nominatim</p>
            </div>
          </div>
        )}

        {/* ─── Desktop: Search Bar ─── */}
        <div className="hidden border-t border-dark-600/50 px-4 py-2 sm:block sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="relative">
              {React.createElement(IconSearch, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-ghost-dim" })}
              <input
                type="text"
                placeholder="Search events, places, years..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-dark-600 bg-dark-800/80 pl-9 pr-4 text-sm text-ghost placeholder-ghost-dim/50 transition-colors focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full text-ghost-dim hover:text-ghost active:scale-90"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Desktop: Category Filter rail + Filters button ─── */}
        <div className="hidden border-t border-dark-600/50 bg-dark-800/60 sm:block">
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-3 py-2 sm:px-6 scrollbar-none">
            <div className="flex flex-1 gap-1.5 sm:gap-2">
              {CATEGORIES.map((cat) => {
                const active = cat.id === "all" ? activeCats.length === 0 : activeCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleToggleCat(cat.id)}
                    className={`flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
                      active
                        ? "border-accent-gold bg-accent-gold/15 text-accent-gold shadow-glow-red"
                        : "border-dark-600 bg-dark-700/50 text-ghost-dim hover:border-ghost-dim/30 hover:text-ghost"
                    }`}
                  >
                    {cat.icon && cat.id !== "all" ? React.createElement(cat.icon, { size: 14 }) : null}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors active:scale-95 ${
                filterCount > 0
                  ? "border-accent-gold/60 bg-accent-gold/15 text-accent-gold"
                  : "border-dark-500 bg-dark-700/50 text-ghost-dim hover:border-accent-gold/40 hover:text-accent-gold"
              }`}
              aria-label="Open filters"
            >
              {React.createElement(IconFilter, { size: 16 })}
              <span>Filters{filterCount > 0 ? ` (${filterCount})` : ""}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative h-full w-full sm:h-auto sm:flex-1">
        {/* ─── Map Section (full-viewport on mobile, 45-50vh on desktop) ─── */}
        <section className="relative h-full w-full sm:h-[45vh] lg:h-[50vh]">
          {loading && (
            <div className="absolute inset-0 z-[5] flex items-center justify-center bg-dark-800">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-pulse rounded-full bg-accent-gold/50" />
                <p className="text-ghost-dim animate-pulse">
                  Locating your position...
                </p>
              </div>
            </div>
          )}

          <div
            ref={mapRef}
            className={`absolute inset-0 z-0 w-full transition-opacity duration-700 ${
              loading ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Map overlay: event count */}
          {mapReady && !loading && (
            <div className="pointer-events-none absolute left-2 top-16 z-[1000] rounded-lg border border-dark-500/60 bg-dark-900/90 px-3 py-2 text-xs text-ghost-dim backdrop-blur-sm shadow-lg sm:left-3 sm:top-3">
              {personalizedCountLabel ? (
                <span className="font-medium text-ghost">{personalizedCountLabel}</span>
              ) : (
                <><span className="font-medium text-ghost">{allEvents.length}</span> event{allEvents.length !== 1 ? "s" : ""} found</>
              )}
              {searchQuery && <span className="text-accent-gold/70"> · "{searchQuery}"</span>}
            </div>
          )}
          {/* ─── Tonight's Trail entry (guided engagement) ─── */}
          {mapReady && !loading && (
            <button
              onClick={() => setShowTrail(true)}
              disabled={!location}
              className="absolute left-2 top-[104px] z-[1000] flex min-h-[44px] items-center gap-2 rounded-full border border-accent-gold/40 bg-dark-900/90 px-4 text-sm font-bold text-accent-gold shadow-lg backdrop-blur-sm transition-all hover:border-accent-gold/70 hover:bg-accent-gold/10 active:scale-95 disabled:opacity-40 sm:left-3 sm:top-14"
              title={location ? "Tonight's Trail — 3 curated stories near you" : "Allow location to see Tonight's Trail"}
            >
              {React.createElement(IconPlay, { size: 16 })}
              <span className="hidden sm:inline">Tonight's Trail</span>
              <span className="sm:hidden">Trail</span>
            </button>
          )}

          {/* ─── Location-denied panel: 3 clear actions, stays until user picks ─── */}
          {locationError && !location && !loading && (
            <div className="absolute inset-x-3 top-16 z-[1001] sm:inset-x-auto sm:left-1/2 sm:top-3 sm:w-[420px] sm:-translate-x-1/2">
              <div className="rounded-xl border border-accent-red/40 bg-dark-900/95 px-4 py-4 shadow-2xl backdrop-blur-sm">
                <p className="text-sm font-medium text-accent-red-light">{locationError}</p>
                <p className="mt-1 text-xs text-ghost-dim">Choose how to explore nearby stories:</p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    onClick={handleRefreshLocation}
                    disabled={refineLoading}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25 active:scale-95 disabled:opacity-50"
                  >
                    {refineLoading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border border-accent-gold border-t-transparent" />
                    ) : (
                      React.createElement(IconMapPin, { size: 18 })
                    )}
                    <span>Allow location</span>
                  </button>
                  <button
                    onClick={() => setShowLocationSearch(true)}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dark-500 bg-dark-700/50 text-sm text-ghost-dim transition-colors hover:bg-dark-600 hover:text-ghost active:scale-95"
                  >
                    {React.createElement(IconSearch, { size: 16 })}
                    <span>Search a city</span>
                  </button>
                  <button
                    onClick={handleUseDemoLocation}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dark-500 bg-dark-700/50 text-sm text-ghost-dim transition-colors hover:bg-dark-600 hover:text-ghost active:scale-95"
                  >
                    {React.createElement(IconTombstone, { size: 16 })}
                    <span>Use New York demo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─── Mobile-only: nearby story bottom sheet ─── */}
        <div className="absolute inset-x-0 bottom-0 top-16 sm:hidden">
          <MobileStorySheet
            events={allEvents}
            loading={loading}
            hasLocation={!!location}
            isBlocked={isBlocked}
            formatDistance={formatDistance}
            onOpenEvent={(evt) => {
              if ((evt as any).is_source === "news" && (evt as any).url) {
                window.open((evt as any).url, "_blank");
              } else {
                setSelectedEvent(evt);
                flyToEvent(evt);
                trackExplore();
              }
            }}
            onAllowLocation={handleRefreshLocation}
            onSearchCity={() => setShowLocationSearch(true)}
            onUseDemo={handleUseDemoLocation}
            onOpenFilters={() => setShowFilters(true)}
            activeCats={activeCats}
            onToggleCat={handleToggleCat}
            filterCount={filterCount}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryDefs={CATEGORIES}
            onUpgrade={() => setShowUpgradePrompt(true)}
            onOpenTrail={() => setShowTrail(true)}
            onOpenSaved={() => setShowSaved(true)}
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
            trailCount={trailEvents.length}
            exploredNearbyCount={exploredNearbyCount}
          />
        </div>

        {/* ─── Desktop: content below map ─── */}
        <div className="hidden sm:block">
          {/* Today in History */}
          {todayInHistoryEvent && (
            <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
              <div className="animate-shimmer rounded-xl border border-accent-gold/20 bg-dark-800/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xl">📅</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-gold/15 px-2.5 py-0.5 text-xs font-medium text-accent-gold animate-badge-pulse">
                        <span>📜</span>
                        Today in History — {todayStr}
                      </span>
                    </div>
                    <p className="font-serif text-base font-bold text-ghost">
                      {todayInHistoryEvent.title}
                    </p>
                    <p className="mt-1 text-xs text-ghost-dim">
                      {todayInHistoryEvent.date} · {(todayInHistoryEvent as any).distanceKm !== undefined ? formatDistance((todayInHistoryEvent as any).distanceKm) + " away" : "Historical event"}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ghost/70 line-clamp-2">
                      {todayInHistoryEvent.description}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Engagement Stats Bar */}
          <section className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
            <div className="flex items-center justify-between rounded-lg border border-dark-600 bg-dark-800/40 px-4 py-2">
            <div className="flex items-center gap-3 text-xs text-ghost-dim">
              <span className="flex items-center gap-1">
                <span>📍</span>
                <span>{allEvents.length} event{allEvents.length !== 1 ? "s" : ""} found</span>
              </span>
              <span className="text-ghost-dim/30">|</span>
              <span className="flex items-center gap-1">
                <span>👁️</span>
                <span>{exploredCount} explored</span>
              </span>
              <span className="text-ghost-dim/30">|</span>
              <span className="flex items-center gap-1">
                <span>📊</span>
                <span>{allEvents.length > 0 ? [...new Set(allEvents.map((e: any) => e.category))].length : 0} categories</span>
              </span>
              {(hiddenCategories.length > 0 || hiddenEventIds.length > 0) && (
                <>
                  <span className="text-ghost-dim/30">|</span>
                  <button
                    onClick={() => setShowHideSettings(true)}
                    className="flex items-center gap-1 text-ghost-dim/50 hover:text-accent-gold transition-colors"
                  >
                    <span>🙈</span>
                    <span>{hiddenCategories.length + hiddenEventIds.length} hidden</span>
                  </button>
                </>
              )}
              </div>
              <button
                onClick={() => {
                  try { localStorage.removeItem("ps_explored"); setExploredCount(0); } catch {}
                }}
                className="text-xs text-ghost-dim/40 hover:text-ghost-dim/70 transition-colors min-h-[44px] flex items-center"
                title="Reset stats"
              >
                <span className="text-ghost-dim/40">↺</span>
              </button>
            </div>
          </section>

          {/* Upgrade Prompt */}
          {showUpgradePrompt && (
            <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
              <div className="animate-fade-in-up rounded-xl border border-accent-gold/30 bg-dark-800 p-6 text-center shadow-glow-red">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-accent-gold/30 bg-accent-gold/10">
                  {React.createElement(IconFlame, { size: 24, className: "text-accent-gold" })}
                </div>
                <h3 className="font-serif text-lg font-bold text-accent-gold">Free Tier Limit Reached</h3>
                <p className="mt-2 text-sm text-ghost-dim">
                  You've explored all 5 free events today. Upgrade to Pro for unlimited access to dark history events, GPS navigation, History Reel, and more.
                </p>
                <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <a
                    href="https://buy.stripe.com/bJe4gz14xaxa88d3Bs5gc02"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-glow inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 px-6 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25 active:scale-95"
                  >
                    {React.createElement(IconFlame, { size: 16 })}
                    <span>Go Pro — $6.99/mo</span>
                  </a>
                  <a
                    href="https://buy.stripe.com/eVq9AT9B320EgEJfka5gc03"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dark-500 bg-dark-700/50 px-6 text-sm font-medium text-ghost-dim transition-colors hover:border-accent-gold/30 hover:text-accent-gold active:scale-95"
                  >
                    <span>📅</span>
                    <span>$49.99/year (save 40%)</span>
                  </a>
                  <button
                    onClick={() => {
                      setShowUpgradePrompt(false);
                      if (!userToken) {
                        localStorage.removeItem(`ps_anon_events_${getToday()}`);
                      }
                    }}
                    className="min-h-[44px] rounded-xl px-5 text-xs text-ghost-dim/60 transition-colors hover:text-ghost-dim"
                  >
                    Dismiss
                  </button>
                </div>
                {!userToken && (
                  <div className="mt-4 border-t border-dark-600 pt-4">
                    <p className="mb-2 text-xs text-ghost-dim">
                      Already subscribed? Sign in to unlock your Pro access.
                    </p>
                    <button
                      onClick={() => navigate({ to: "/auth" })}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-4 text-xs font-bold text-accent-gold transition-colors hover:bg-accent-gold/20"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Event Feed */}
          <section
            ref={feedRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="mx-auto max-w-6xl px-4 pt-2 pb-4 sm:px-6 sm:pt-4"
          >
            {isBlocked && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-accent-gold/30 bg-accent-gold/10">
                  {React.createElement(IconFlame, { size: 24, className: "text-accent-gold" })}
                </div>
                <h3 className="font-serif text-lg font-bold text-accent-gold">Daily Free Limit Reached</h3>
                <p className="mt-2 mx-auto max-w-md text-sm text-ghost-dim">
                  You've used all {eventsLimit} free events today. Upgrade to Pro for unlimited access to dark history events, GPS navigation, History Reel, and more.
                </p>
                <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <a
                    href="https://buy.stripe.com/bJe4gz14xaxa88d3Bs5gc02"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-glow inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 px-6 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25 active:scale-95"
                  >
                    <span>⚡</span>
                    <span>Go Pro — $6.99/mo</span>
                  </a>
                  <a
                    href="https://buy.stripe.com/eVq9AT9B320EgEJfka5gc03"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dark-500 bg-dark-700/50 px-6 text-sm font-medium text-ghost-dim transition-colors hover:border-accent-gold/30 hover:text-accent-gold active:scale-95"
                  >
                    <span>📅</span>
                    <span>$49.99/year (save 40%)</span>
                  </a>
                </div>
                {!userToken && (
                  <div className="mt-4 border-t border-dark-600 pt-4">
                    <p className="mb-2 text-xs text-ghost-dim">Already subscribed? Sign in to unlock your Pro access.</p>
                    <button onClick={() => navigate({ to: "/auth" })} className="inline-flex min-h-[44px] items-center rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-4 text-xs font-bold text-accent-gold transition-colors hover:bg-accent-gold/20">Sign In</button>
                  </div>
                )}
              </div>
            )}
            {pulling && (
              <div className="flex items-center justify-center py-3 text-sm text-accent-gold animate-fade-in-up">
                <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Release to refresh
              </div>
            )}
            {refreshing && (
              <div className="flex items-center justify-center py-3 text-sm text-accent-gold">
                <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Refreshing...
              </div>
            )}

            {/* Skeleton loaders during loading */}
            {loading && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                {[1,2,3].map((n) => (
                  <div key={n} className="rounded-xl border border-dark-600 bg-dark-800/70 p-4 animate-shimmer">
                    <div className="skeleton h-5 w-3/4 mb-3"></div>
                    <div className="skeleton h-3 w-1/3 mb-2"></div>
                    <div className="skeleton h-4 w-full mb-1"></div>
                    <div className="skeleton h-4 w-5/6"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Sort info */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-ghost-dim">
                {allEvents.length} result
                {allEvents.length !== 1 ? "s" : ""}
                {sortMode !== "distance" &&
                  ` • sorted by ${
                    sortMode === "date-desc" ? "newest" : "oldest"
                  } first`}
              </p>
            </div>

            {/* Spotlight Strip */}
            {eventsWithImages.length > 0 && (
              <SpotlightStrip events={eventsWithImages} onSelect={(evt) => { setSelectedEvent(evt); flyToEvent(evt); trackExplore(); }} />
            )}

            {allEvents.length === 0 ? (
              <div className="py-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xl">🌍</span>
                  <h3 className="font-serif text-base font-bold text-accent-gold">Featured Dark History Events</h3>
                </div>
                <p className="mb-4 text-xs text-ghost-dim">
                  No events near your current location{searchQuery && ` matching "${searchQuery}"`}. Explore these famous historical events instead:
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FEATURED_EVENTS.map((evt, idx) => (
                    <div
                      key={evt.id}
                      className="card-enhanced card-hover-lift animate-fade-in-up rounded-xl border border-dark-600 bg-dark-800/70 p-4 transition-all duration-300 hover:border-accent-gold/40 hover:bg-dark-700/70 hover:shadow-glow-red"
                      style={{ animationDelay: `${(idx % 9) * 60}ms` }}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="font-serif text-sm font-bold leading-tight text-ghost transition-colors">{evt.title}</h3>
                        {(() => { const I = CATEGORY_ICONS[evt.category]; return I ? React.createElement(I, { size: 18 }) : null; })()}
                      </div>
                      <p className="mb-1 text-xs text-ghost-dim">{evt.date}</p>
                      <p className="line-clamp-2 text-sm leading-relaxed text-ghost/70">{evt.description}</p>
                    </div>
                  ))}
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-6 min-h-[44px] rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-6 text-sm text-accent-gold transition-colors hover:bg-accent-gold/20 active:scale-95"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allEvents.map((evt, idx) => (
                  <div key={evt.id} className="animate-fade-in-up" style={{ animationDelay: `${(idx % 9) * 60}ms` }}>
                    <EventImageCard
                      event={evt}
                      isSelected={selectedEvent?.id === evt.id}
                      isNews={(evt as any).is_source === "news"}
                      recentlyLabel={(evt as any).recentlyLabel}
                      onSelect={() => {
                        if ((evt as any).is_source === "news" && (evt as any).url) {
                          window.open((evt as any).url, "_blank");
                        } else {
                          setSelectedEvent(evt);
                          flyToEvent(evt);
                          trackExplore();
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ghost-dim">
                          {formatDistance((evt as any).distanceKm)}
                        </span>
                        {(() => {
                          if ((evt as any).is_source === "news" && (evt as any).url) {
                            return (
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open((evt as any).url, "_blank"); }}
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-accent-blue/40 bg-accent-blue/15 text-sm text-accent-blue transition-colors hover:bg-accent-blue/30 active:scale-90"
                                aria-label={`Open article: ${evt.title}`}
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            );
                          }
                          return (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleNavigate(evt); }}
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-dark-500 bg-dark-700/50 text-sm text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-90"
                              aria-label={`Navigate to ${evt.title}`}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          );
                        })()}
                        {evt.description.length > 100 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setVideoStoryEvent(evt); }}
                            className="flex min-h-[44px] items-center gap-1 rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-2.5 text-xs text-accent-gold transition-colors hover:bg-accent-gold/20 active:scale-90"
                            aria-label={`Watch story: ${evt.title}`}
                          >
                            <span className="text-sm">📺</span>
                            <span>Story</span>
                          </button>
                        )}
                        {evt.description.length > 100 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExportVideo(evt); }}
                            disabled={exportingEventId === evt.id}
                            className={`flex min-h-[44px] items-center gap-1 rounded-lg border px-2.5 text-xs transition-colors active:scale-90 ${
                              exportingEventId === evt.id
                                ? "border-ghost-dim/20 bg-ghost-dim/5 text-ghost-dim/40 cursor-wait"
                                : "border-ghost-dim/20 bg-ghost-dim/5 text-ghost-dim/60 hover:text-ghost hover:bg-ghost-dim/10"
                            }`}
                            aria-label={`Export video: ${evt.title}`}
                          >
                            {exportingEventId === evt.id ? (
                              <span className="inline-block h-3 w-3 border-2 border-ghost-dim/30 border-t-ghost-dim rounded-full animate-spin" />
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            <span>{exportingEventId === evt.id ? "Exporting" : "Export"}</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleHideEvent(evt.id, evt.category); }}
                          className="text-[11px] text-ghost-dim/30 hover:text-ghost-dim/60 transition-colors whitespace-nowrap min-h-[44px] flex items-center px-2"
                          title="See less like this"
                          aria-label={`Hide similar events: ${evt.title}`}
                        >
                          🙈 Less
                        </button>
                      </div>
                    </EventImageCard>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ─── Mobile: Upgrade Prompt overlay ─── */}
      {showUpgradePrompt && (
        <div className="fixed inset-x-0 bottom-0 z-[9998] sm:hidden">
          <div className="animate-slide-up rounded-t-2xl border-t border-accent-gold/30 bg-dark-800 p-5 shadow-2xl safe-bottom">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-dark-500" />
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-accent-gold/30 bg-accent-gold/10">
              {React.createElement(IconFlame, { size: 20, className: "text-accent-gold" })}
            </div>
            <h3 className="text-center font-serif text-lg font-bold text-accent-gold">Free Tier Limit Reached</h3>
            <p className="mt-1 text-center text-sm text-ghost-dim">
              You've explored all {eventsLimit} free events today. Upgrade to Pro for unlimited dark history.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href="https://buy.stripe.com/bJe4gz14xaxa88d3Bs5gc02"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 text-sm font-bold text-accent-gold active:scale-95"
              >
                Go Pro — $6.99/mo
              </a>
              <button
                onClick={() => {
                  setShowUpgradePrompt(false);
                  if (!userToken) localStorage.removeItem(`ps_anon_events_${getToday()}`);
                }}
                className="min-h-[44px] rounded-xl text-xs text-ghost-dim/60 hover:text-ghost-dim"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer (desktop) ─── */}
      <footer className="hidden border-t border-dark-600 bg-dark-900 py-4 text-center text-xs text-ghost-dim sm:block">
        <p>Past Shadows — Exploring the hidden history beneath your feet.</p>
        <p className="mt-1">
          Data sourced from historical records. Some locations are approximate.
        </p>
      </footer>
</div>}

      {/* ─── Filters Sheet (mobile bottom sheet / desktop modal) ─── */}
      <FiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        categoryDefs={CATEGORIES}
        activeCats={activeCats}
        onToggleCat={handleToggleCat}
        radiusKm={radiusKm}
        setRadiusKm={setRadiusKm}
        minYear={minYear}
        maxYear={maxYear}
        setMinYear={setMinYear}
        setMaxYear={setMaxYear}
        sortMode={sortMode}
        setSortMode={setSortMode}
        onReset={() => {
          setActiveCats([]);
          setRadiusKm(null);
          setMinYear(null);
          setMaxYear(null);
          setSortMode("distance");
        }}
        filterCount={filterCount}
        contentPref={contentPref}
        setContentPref={handleSetContentPref}
      />

      {/* ─── Tonight's Trail panel (guided engagement) ─── */}
      {showTrail && (
        <TrailPanel
          events={trailEvents}
          formatDistance={formatDistance}
          onOpen={(evt) => {
            const full = allEvents.find((e) => e.id === evt.id) || (evt as any);
            setSelectedEvent(full as any);
            setShowTrail(false);
            if (location) flyToEvent(full as any);
          }}
          onClose={() => setShowTrail(false)}
          exploredIds={exploredIds}
          onToggleExplored={handleToggleExplored}
          categoryDefs={CATEGORIES}
        />
      )}
      {/* ─── Saved stories list ─── */}
      {showSaved && (
        <SavedList
          events={savedEvents}
          formatDistance={formatDistance}
          onOpen={(evt) => {
            const full = allEvents.find((e) => e.id === evt.id) || (evt as any);
            setSelectedEvent(full as any);
            setShowSaved(false);
            if (location) flyToEvent(full as any);
          }}
          onClose={() => setShowSaved(false)}
          onRemove={handleToggleSave}
          categoryDefs={CATEGORIES}
        />
      )}
      {/* ─── Event Detail Bottom Sheet (mobile) / Modal (desktop) ─── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-t-2xl border border-dark-500 bg-dark-800 p-5 shadow-2xl animate-slide-up sm:rounded-2xl sm:mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "85vh" }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-dark-500 sm:hidden" />
            {selectedEvent.imageUrl && (
              <div className="detail-hero relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl" style={{ height: "220px" }}>
                <img
                  src={selectedEvent.imageUrl}
                  alt={selectedEvent.title}
                  className="h-full w-full object-cover detail-hero-img"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-dark-800/30 to-dark-900/20" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="font-serif text-lg font-bold leading-tight text-ghost drop-shadow-lg sm:text-xl">
                    {selectedEvent.title}
                  </h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-ghost-dim/80 drop-shadow-md">{selectedEvent.date}</span>
                    <span className="text-xs text-ghost-dim/50">·</span>
                    <span className="text-xs text-ghost-dim/80 drop-shadow-md">
                      {new Date().getFullYear() - selectedEvent.year} years ago
                    </span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ghost-dim transition-colors hover:bg-dark-600 hover:text-ghost active:scale-90 sm:min-h-[36px] sm:min-w-[36px]"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl select-none">
                {(() => { const I = CATEGORY_ICONS[selectedEvent.category]; return I ? React.createElement(I, { size: 18 }) : null; })()}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getCategoryColor(
                  selectedEvent.category
                )}`}
              >
                {selectedEvent.category.charAt(0).toUpperCase() +
                  selectedEvent.category.slice(1)}
              </span>
              <span className="text-xs text-ghost-dim">
                {formatDistance(
                  getNearbyEvents(
                    location?.lat || 0,
                    location?.lng || 0
                  ).find((e) => e.id === selectedEvent.id)?.distanceKm || 0
                )}{" "}
                away
              </span>
            </div>
            {!selectedEvent.imageUrl && (
              <>
                <h2 className="mb-1 font-serif text-xl font-bold text-accent-gold pr-8">
                  {selectedEvent.title}
                </h2>
                <p className="mb-1 text-sm text-ghost-dim">{selectedEvent.date}</p>
                <p className="mb-4 text-xs text-ghost-dim/70">
                  {new Date().getFullYear() - selectedEvent.year} years ago
                </p>
              </>
            )}
            <div className="overflow-y-auto smooth-scroll" style={{ maxHeight: "40vh" }}>
              {contentPref === "historical" &&
              !revealSensitive &&
              selectedEvent.description.length > 180 ? (
                <div>
                  <p className="leading-relaxed text-ghost/85">
                    {selectedEvent.description.slice(0, 180).trimEnd()}…
                  </p>
                  <button
                    onClick={() => setRevealSensitive(true)}
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dark-500 bg-dark-700/50 px-4 text-sm font-medium text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-[0.99]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Sensitive content — tap to reveal
                  </button>
                </div>
              ) : (
                <p className="leading-relaxed text-ghost/85">
                  {selectedEvent.description}
                </p>
              )}
              {(selectedEvent.description.length < 250 || !selectedEvent.description.includes(".")) && (
                <div className="mt-4 rounded-lg border border-dark-600 bg-dark-800/60 p-3">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent-gold/70">Why this matters</p>
                  <p className="text-sm leading-relaxed text-ghost-dim/80">
                    {selectedEvent.category === "memorial" && "This memorial marks a location where something significant happened — a tragedy, a loss, or an important historical moment. Tap the source link below to learn the full story behind this marker."}
                    {selectedEvent.category === "cemetery" && "Cemeteries hold centuries of stories — from notable figures buried here to the history of the grounds themselves. Many have dark histories of their own."}
                    {selectedEvent.category === "crime" && "Crime scenes and locations tied to criminal acts offer a glimpse into the darker side of human nature — from infamous gangs to unsolved cases that still haunt these streets."}
                    {selectedEvent.category === "death" && "Locations associated with notable deaths often carry a lingering weight. Whether tragic, mysterious, or historically significant, these places mark where someone's story ended."}
                    {selectedEvent.category === "disaster" && "Disaster sites remind us of nature's power and human vulnerability — from fires and floods to explosions and collapses that reshaped communities."}
                    {selectedEvent.category === "mystery" && "Unsolved mysteries and strange occurrences leave more questions than answers. These locations continue to intrigue and baffle researchers to this day."}
                    {selectedEvent.category === "war_conflict" && "Battlefields and conflict zones are where history turned. These grounds witnessed courage, tragedy, and events that shaped the world we live in today."}
                    {selectedEvent.category === "execution" && "Execution sites are among the darkest historical locations — places where justice (or injustice) was carried out, often drawing crowds and controversy."}
                    {selectedEvent.category === "prison" && "Prisons and jails hold stories of confinement, punishment, and occasionally redemption. Many have housed infamous criminals or witnessed riots and escapes."}
                    {selectedEvent.category === "riot" && "Riot locations mark civil unrest and social upheaval — moments when tensions boiled over and communities were forever changed."}
                    {selectedEvent.category === "historical" && "Historical locations have witnessed events that shaped our world. Even quiet streets and ordinary buildings can have extraordinary pasts."}
                    {selectedEvent.category === "local_legends" && "Local legends and folklore reveal the stories that communities have passed down through generations — from cryptids and hauntings to unexplained phenomena that still captivate the imagination today."}
                    {!selectedEvent.category && "This location has a story to tell. Tap the source link to uncover the full history behind it."}
                  </p>
                </div>
              )}
              {selectedEvent.source_url && (
                <a
                  href={selectedEvent.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-accent-blue/80 transition-colors hover:text-accent-blue"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Learn more about this event
                </a>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => handleToggleSave(selectedEvent.id)}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-5 text-sm font-medium transition-colors active:scale-95 ${
                  savedIds.includes(selectedEvent.id)
                    ? "border-accent-gold/60 bg-accent-gold/15 text-accent-gold"
                    : "border-dark-500 bg-dark-700/60 text-ghost-dim hover:border-accent-gold/40 hover:text-accent-gold"
                }`}
                aria-pressed={savedIds.includes(selectedEvent.id)}
              >
                <svg className="h-4 w-4" fill={savedIds.includes(selectedEvent.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.99 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                {savedIds.includes(selectedEvent.id) ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => handleToggleExplored(selectedEvent.id)}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-5 text-sm font-medium transition-colors active:scale-95 ${
                  exploredIds.includes(selectedEvent.id)
                    ? "border-accent-gold/60 bg-accent-gold/15 text-accent-gold"
                    : "border-dark-500 bg-dark-700/60 text-ghost-dim hover:border-accent-gold/40 hover:text-accent-gold"
                }`}
                aria-pressed={exploredIds.includes(selectedEvent.id)}
              >
                <svg className="h-4 w-4" fill={exploredIds.includes(selectedEvent.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {exploredIds.includes(selectedEvent.id) ? "Explored" : "Mark explored"}
              </button>
              <button
                onClick={() => {
                  flyToEvent(selectedEvent);
                  setSelectedEvent(null);
                }}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-5 text-sm font-medium text-accent-gold transition-colors hover:bg-accent-gold/20 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Show on Map
              </button>
              <button
                onClick={() => handleNavigate(selectedEvent)}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-5 text-sm font-medium text-accent-gold transition-colors hover:bg-accent-gold/20 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {isIOS() ? "Open in Apple Maps" : "Open in Google Maps"}
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex min-h-[44px] items-center rounded-xl border border-dark-500 bg-dark-700 px-5 text-sm text-ghost-dim transition-colors hover:bg-dark-600 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hide Settings Panel ─── */}
      {showHideSettings && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" onClick={() => setShowHideSettings(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-2xl border border-dark-500 bg-dark-800 p-6 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowHideSettings(false)} className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ghost-dim transition-colors hover:bg-dark-600 hover:text-ghost" aria-label="Close">✕</button>
            <h3 className="font-serif text-lg font-bold text-accent-gold mb-4">🙈 Hidden Items</h3>
            {hiddenCategories.length === 0 && hiddenEventIds.length === 0 && (
              <p className="text-sm text-ghost-dim">No hidden categories or events. When you hide items, they'll appear here.</p>
            )}
            {hiddenCategories.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ghost-dim/60 mb-2">Hidden Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {hiddenCategories.map(cat => {
                    const catDef = CATEGORIES.find(c => c.id === cat);
                    return (
                      <div key={cat} className="flex items-center gap-1.5 rounded-full border border-dark-500 bg-dark-700 px-3 py-1.5 text-xs">
                        <span>{catDef?.icon ? React.createElement(catDef.icon, { size: 14 }) : "📁"}</span>
                        <span className="text-ghost-dim">{catDef?.label || cat}</span>
                        <button onClick={() => handleShowCategory(cat)} className="ml-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full text-ghost-dim/50 hover:text-accent-gold transition-colors" title="Show this category again">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {hiddenEventIds.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ghost-dim/60 mb-2">Hidden Events</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {hiddenEventIds.map(id => {
                    const evtTitle = (() => {
                      try {
                        const nearby = getNearbyEvents(location?.lat || 40.7128, location?.lng || -74.006, 50000, "all", "distance", "");
                        const found = nearby.find(e => e.id === id);
                        return found?.title || id.slice(0, 20);
                      } catch { return id.slice(0, 20); }
                    })();
                    return (
                      <div key={id} className="flex items-center justify-between rounded-lg border border-dark-600 bg-dark-700/40 px-3 py-2">
                        <span className="text-xs text-ghost-dim truncate max-w-[280px]">{evtTitle}</span>
                        <button onClick={() => handleUnhideEvent(id)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ghost-dim/50 hover:text-accent-gold transition-colors" title="Undo hide">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(hiddenCategories.length > 0 || hiddenEventIds.length > 0) && (
              <button
                onClick={handleResetHidden}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 text-sm font-medium text-accent-red-light transition-colors hover:bg-accent-red/20 active:scale-95"
              >
                <span>🗑️</span>
                <span>Reset All Hidden Items</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Category Preference Picker ─── */}
      {showCategoryPicker && (
        <CategoryPreferencePicker
          onConfirm={(selectedIds) => {
            setPreferredCategories(selectedIds);
            const action = showCategoryPicker;
            setShowCategoryPicker(null);
            if (action === "reel") setShowReel(true);
            else if (action === "timeline") setShowWhatWasHere(true);
          }}
          onClose={() => setShowCategoryPicker(null)}
        />
      )}

      {/* ─── History Reel Overlay ─── */}
      {showReel && location && (
        <HistoryReel
          events={allEvents.map((e) => ({
            id: e.id,
            title: e.title,
            date: e.date,
            year: e.year,
            description: e.description,
            category: e.category,
            lat: e.lat,
            lng: e.lng,
            distanceKm: (e as any).distanceKm,
            source_url: (e as any).source_url,
          }))}
          userLat={location.lat}
          userLng={location.lng}
          onClose={() => setShowReel(false)}
        />
      )}

      {/* ─── What Was Here Overlay ─── */}
      {showWhatWasHere && location && (
        <WhatWasHere
          currentLat={location.lat}
          currentLng={location.lng}
          onClose={() => setShowWhatWasHere(false)}
        />
      )}

      {/* ─── Scan My Area Overlay ─── */}
      {showScanArea && location && (
        <ScanMyArea
          lat={location.lat}
          lng={location.lng}
          userTier={userTier}
          userToken={userToken}
          onClose={() => setShowScanArea(false)}
          onEventGenerated={handleScanEventGenerated}
        />
      )}

      {/* ─── Video Story Overlay ─── */}
      {videoStoryEvent && location && (
        <VideoStory
          event={videoStoryEvent}
          userLat={location.lat}
          userLng={location.lng}
          onClose={() => setVideoStoryEvent(null)}
          userToken={userToken}
        />
      )}

      {/* ─── Export Toast ─── */}
      {exportToast && (
        <div className="fixed bottom-20 left-1/2 z-[99999] -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg backdrop-blur-sm"
          style={{
            background: exportToast.type === "success" ? "rgba(6, 78, 59, 0.9)" : "rgba(127, 29, 29, 0.9)",
            borderColor: exportToast.type === "success" ? "rgba(52, 211, 153, 0.4)" : "rgba(248, 113, 113, 0.4)",
            color: exportToast.type === "success" ? "#bbf7d0" : "#fecaca",
          }}
        >
          {exportToast.msg}
        </div>
      )}

    </div>
  );
}
