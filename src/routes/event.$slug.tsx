/**
 * /event/<slug> — per-event landing page (SEO).
 *
 * Resolves a deterministic slug (same slugify() the city/category pages have
 * been linking to) to a curated event, renders the full story, and adds
 * Event/Place JSON-LD structured data + og tags so individual events are
 * indexable and shareable. Related events interlink the catalog.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  getEventBySlug,
  getEventSlug,
  getNearestCity,
  getRelatedEvents,
  slugify,
  eventDateLabel,
  CATEGORIES,
  CITIES,
} from "~/data/seo-pages";
import { BlogHeader, BlogFooter } from "~/components/BlogPostLayout";
import type { HistoricalEvent } from "~/data/events";

const SITE = "https://pastshadows.ctonew.app";

function eventMetaDescription(e: HistoricalEvent): string {
  const base = e.description.replace(/\s+/g, " ").trim();
  return base.length > 152 ? base.slice(0, 149).trimEnd() + "…" : base;
}

export const Route = createFileRoute("/event/$slug")({
  loader: ({ params }) => {
    const event = getEventBySlug(params.slug);
    if (!event) throw notFound();
    return event;
  },
  notFoundComponent: EventNotFound,
  head: ({ match }) => {
    const event = getEventBySlug(match.params.slug);
    if (!event) {
      return {
        meta: [
          { title: "Event not found — Past Shadows" },
          { name: "description", content: "This dark history event could not be found on Past Shadows." },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const city = getNearestCity(event);
    const cat = CATEGORIES.find((c) => c.slug === event.category);
    const place = city ? ` — ${city.name} Dark History` : " — Dark History";
    const title = `${event.title}${place} | Past Shadows`;
    const url = `${SITE}/event/${match.params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: eventMetaDescription(event) },
        // Open Graph
        { property: "og:title", content: `${event.title} (${eventDateLabel(event)}) | Past Shadows` },
        { property: "og:description", content: eventMetaDescription(event) },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "Past Shadows" },
        ...(event.imageUrl
          ? [{ property: "og:image", content: SITE + event.imageUrl }]
          : [{ property: "og:image", content: `${SITE}/og-image.png` }]),
        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${event.title} | Past Shadows` },
        { name: "twitter:description", content: eventMetaDescription(event) },
        { name: "twitter:image", content: event.imageUrl ? SITE + event.imageUrl : `${SITE}/og-image.png` },
        { name: "twitter:site", content: "@pastshadows" },
        ...(cat
          ? [{ property: "article:section", content: cat.label }]
          : []),
      ],
    };
  },
  component: EventPage,
});

function EventNotFound() {
  const { slug } = Route.useParams();
  return (
    <div className="min-h-dvh bg-dark-900 text-ghost">
      <BlogHeader />
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-ghost">Event not found</h1>
        <p className="mt-3 text-sm text-ghost-dim">
          We couldn't find a dark history event at "{slug}". It may have been renamed or removed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            className="rounded-full border border-dark-600 bg-dark-800 px-4 py-1.5 text-xs text-ghost-dim transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
          >
            Open the Map
          </Link>
          <Link
            to="/blog"
            className="rounded-full border border-dark-600 bg-dark-800 px-4 py-1.5 text-xs text-ghost-dim transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
          >
            Read the Blog
          </Link>
        </div>
      </main>
      <BlogFooter />
    </div>
  );
}
function EventPage() {
  const event = Route.useLoaderData();
  const { slug } = Route.useParams();
  const cat = CATEGORIES.find((c) => c.slug === event.category);
  const city = getNearestCity(event);
  const related = getRelatedEvents(event, 3);
  const url = `${SITE}/event/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: eventDateLabel(event),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url,
    ...(event.imageUrl ? { image: [SITE + event.imageUrl] } : {}),
    location: {
      "@type": "Place",
      name: city ? city.name : "Unknown location",
      ...(city
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: city.name,
              addressCountry: "US",
            },
          }
        : {}),
      geo: {
        "@type": "GeoCoordinates",
        latitude: event.lat,
        longitude: event.lng,
      },
    },
  };

  return (
    <div className="min-h-dvh bg-dark-900 text-ghost">
      <BlogHeader />
      <main className="mx-auto max-w-2xl px-5 py-8">
        {/* Breadcrumb-ish back links */}
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ghost-dim/60">
          <Link to="/" className="transition-colors hover:text-accent-gold">
            Map
          </Link>
          <span>/</span>
          {city ? (
            <>
              <Link to="/city/$city" params={{ city: city.slug }} className="transition-colors hover:text-accent-gold">
                {city.name}
              </Link>
              <span>/</span>
            </>
          ) : null}
          {cat ? (
            <>
              <Link
                to="/category/$category"
                params={{ category: cat.slug }}
                className="transition-colors hover:text-accent-gold"
              >
                {cat.label}
              </Link>
              <span>/</span>
            </>
          ) : null}
          <span className="truncate text-ghost-dim">{event.title}</span>
        </nav>

        <article className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {cat && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cat.color}`}
              >
                {cat.label}
              </span>
            )}
            <span className="text-xs text-ghost-dim/70">{eventDateLabel(event)}</span>
            {event.source && (
              <span className="text-[11px] text-ghost-dim/40">· sourced from {event.source}</span>
            )}
          </div>

          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight text-ghost sm:text-4xl">
            {event.title}
          </h1>

          {event.imageUrl ? (
            <figure className="mt-6 overflow-hidden rounded-2xl border border-dark-600 bg-dark-800/40">
              <img
                src={event.imageUrl}
                alt={event.title}
                loading="lazy"
                className="max-h-[420px] w-full object-cover"
              />
            </figure>
          ) : null}

          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ghost-dim">
            <p className="text-base leading-relaxed text-ghost/90">{event.description}</p>
          </div>

          {/* Location details */}
          <div className="mt-8 rounded-xl border border-dark-600 bg-dark-800/40 p-5">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-accent-gold/80">
              Location
            </h2>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {city && (
                <div className="flex items-center gap-2">
                  <dt className="text-ghost-dim/50">Nearest city</dt>
                  <dd>
                    <Link
                      to="/city/$city"
                      params={{ city: city.slug }}
                      className="text-accent-gold underline decoration-accent-gold/40 underline-offset-2 transition-colors hover:text-ghost"
                    >
                      {city.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex items-center gap-2">
                <dt className="text-ghost-dim/50">Coordinates</dt>
                <dd className="font-mono text-xs text-ghost-dim">
                  {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                </dd>
              </div>
              {cat && (
                <div className="flex items-center gap-2">
                  <dt className="text-ghost-dim/50">Category</dt>
                  <dd>
                    <Link
                      to="/category/$category"
                      params={{ category: cat.slug }}
                      className="text-accent-gold underline decoration-accent-gold/40 underline-offset-2 transition-colors hover:text-ghost"
                    >
                      {cat.label}
                    </Link>
                  </dd>
                </div>
              )}
              {event.source_url && (
                <div className="flex items-center gap-2">
                  <dt className="text-ghost-dim/50">Source</dt>
                  <dd>
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-gold underline decoration-accent-gold/40 underline-offset-2 transition-colors hover:text-ghost"
                    >
                      {event.source || "Wikipedia"}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <a
              href={`https://www.google.com/maps?q=${event.lat},${event.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-900/60 px-4 py-2 text-xs font-medium text-ghost-dim transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
            >
              View on Google Maps →
            </a>
          </div>

          {/* Related events — internal linking */}
          <section className="mt-10">
            <h2 className="font-serif text-xl font-bold text-ghost">More dark history nearby</h2>
            <div className="mt-4 space-y-3">
              {related.map((r) => {
                const rCat = CATEGORIES.find((c) => c.slug === r.category);
                const dist =
                  r.distanceKm < 1
                    ? `${Math.round(r.distanceKm * 1000)} m`
                    : `${Math.round(r.distanceKm * 10) / 10} km`;
                return (
                  <Link
                    key={r.id}
                    to="/event/$slug"
                    params={{ slug: getEventSlug(r) }}
                    className="card-enhanced group flex items-center gap-4 rounded-xl border border-dark-600 bg-dark-800/50 p-4 transition-all duration-200 hover:border-accent-gold/40"
                  >
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        alt={r.title}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-lg border border-dark-600 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dark-600 bg-dark-900/80 text-xl text-ghost-dim/40">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M8 2h8v2l4 2v4H4V6l4-2V2zm-2 10h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8zm4 2v4h4v-4h-4z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {rCat && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rCat.color}`}
                          >
                            {rCat.label}
                          </span>
                        )}
                        <span className="text-[11px] text-ghost-dim/60">
                          {eventDateLabel(r)} · {dist}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate font-serif text-sm font-bold text-ghost transition-colors group-hover:text-accent-gold">
                        {r.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* CTA */}
          <div className="mt-10 rounded-xl border border-accent-gold/20 bg-accent-gold/5 p-6 text-center">
            <p className="font-serif text-lg font-bold text-ghost">Found something unsettling?</p>
            <p className="mt-1 text-sm text-ghost-dim/70">
              Stand at any location and uncover what happened beneath your feet.
            </p>
            <Link
              to="/"
              className="btn-glow mt-4 inline-block rounded-xl border border-accent-gold/40 bg-accent-gold/15 px-6 py-2.5 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/25"
            >
              Open the Dark History Map
            </Link>
          </div>
        </article>
      </main>
      <BlogFooter />

      {/* JSON-LD structured data — read by search engines wherever it sits in the HTML */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
