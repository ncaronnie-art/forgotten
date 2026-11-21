/**
 * /city/<city> — SEO city index pages
 *
 * Renders a dark-themed list of curated events within 30 km of a city center.
 * Each event links to a future /event/<slug> landing page (404 for now, by design).
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getCity, getEventsByCity, slugify, eventDateLabel, CATEGORIES, CITIES } from "~/data/seo-pages";

export const Route = createFileRoute("/city/$city")({
  loader: ({ params }) => {
    const city = getCity(params.city);
    if (!city) throw notFound();
    return city;
  },
  notFoundComponent: CityNotFound,
  head: ({ match }) => {
    const city = getCity(match.params.city);
    const count = city ? getEventsByCity(city.slug).length : 0;
    return {
      meta: [
        {
          title: city
            ? `Dark History of ${city.name} — True Crime & Haunted Places Map | Past Shadows`
            : "City — Past Shadows",
        },
        {
          name: "description",
          content: city
            ? `${city.tagline}. ${count} curated events — murders, disasters, unsolved mysteries, and haunted places plotted on an interactive map.`
            : "Explore the dark history of a city on the Past Shadows map.",
        },
      ],
    };
  },
  component: CityPage,
});

function CityNotFound() {
  const { city: slug } = Route.useParams();
  return (
    <div className="min-h-dvh bg-dark-900 text-ghost">
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-ghost">City not found</h1>
        <p className="mt-3 text-sm text-ghost-dim">
          We don't have curated events for "{slug}" yet. Try another city below.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CITIES.map((c) => (
            <Link
              key={c.slug}
              to="/city/$city"
              params={{ city: c.slug }}
              className="rounded-full border border-dark-600 bg-dark-800 px-3 py-1 text-xs text-ghost-dim transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
function CityPage() {
  const city = Route.useLoaderData();

  return (
    <div className="min-h-dvh bg-dark-900 text-ghost">
      <Header />

      {/* Hero */}
      <section className="hero-glow relative overflow-hidden border-b border-dark-600 px-5 pb-10 pt-14 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,0,0,0.18),transparent_70%)]" />
        <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-accent-gold/70">
          Dark History Map · {cityEvents.length} curated events
        </p>
        <h1 className="relative mt-3 font-serif text-3xl font-bold text-ghost text-glow sm:text-4xl">
          The Dark History of {city.name}
        </h1>
        <p className="relative mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ghost-dim">{city.blurb}</p>
        <div className="relative mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="btn-glow flex min-h-[44px] items-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/15 px-6 text-sm font-bold text-accent-gold transition-all hover:bg-accent-gold/25 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 10a3 3 0 110-6 3 3 0 010 6z" />
            </svg>
            Explore {city.name} on the Map
          </Link>
          <Link
            to="/"
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-dark-600 bg-dark-800 px-6 text-sm text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-ghost"
          >
            Open Interactive Map
          </Link>
        </div>
      </section>

      {/* Event list */}
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h2 className="font-serif text-lg font-bold text-accent-gold">
          {cityEvents.length} {cityEvents.length === 1 ? "Event" : "Events"} Near {city.name}
        </h2>

        {cityEvents.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dark-600 bg-dark-800/60 p-6 text-center text-sm text-ghost-dim">
            No curated events found within {30} km of {city.name} yet. Check back soon.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {cityEvents.map((e) => (
              <li key={e.id}>
                <EventCard
                  id={e.id}
                  title={e.title}
                  date={eventDateLabel(e)}
                  category={e.category}
                  description={e.description}
                  imageUrl={e.imageUrl}
                  distanceKm={e.distanceKm}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Browse categories */}
        <section className="mt-14 border-t border-dark-600 pt-8">
          <h2 className="font-serif text-lg font-bold text-accent-gold">Browse by Category</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to="/category/$category"
                params={{ category: c.slug }}
                className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all hover:brightness-125 ${c.color}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function EventCard({
  id,
  title,
  date,
  category,
  description,
  imageUrl,
  distanceKm,
}: {
  id: string;
  title: string;
  date: string;
  category: string;
  description: string;
  imageUrl: string | null;
  distanceKm: number;
}) {
  // Future /event/<slug> landing page (404s for now by design)
  const href = `/event/${slugify(title)}`;
  const cat = CATEGORIES.find((c) => c.slug === category);
  const distLabel = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`;

  return (
    <article className="card-enhanced group flex gap-4 rounded-xl border border-dark-600 bg-dark-800/50 p-4 transition-all duration-200 hover:border-accent-gold/40">
      {imageUrl ? (
        <a href={href} className="block h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-dark-600">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </a>
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dark-600 bg-dark-900/80 text-2xl text-ghost-dim/40">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 2h8v2l4 2v4H4V6l4-2V2zm-2 10h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8zm4 2v4h4v-4h-4z" />
          </svg>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {cat && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cat.color}`}>{cat.label}</span>}
          <span className="text-[11px] text-ghost-dim/60">{date}</span>
          <span className="text-[11px] text-ghost-dim/60">· {distLabel}</span>
        </div>
        <a href={href} className="mt-1 block">
          <h3 className="font-serif text-sm font-bold leading-snug text-ghost transition-colors group-hover:text-accent-gold">
            {title}
          </h3>
        </a>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ghost-dim/80">{description}</p>
      </div>
    </article>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-dark-600 bg-dark-900/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
        <Link to="/" className="font-serif text-sm font-bold tracking-wide text-ghost hover:text-accent-gold">
          Past Shadows
        </Link>
        <Link
          to="/"
          className="rounded-full border border-dark-600 bg-dark-800 px-4 py-1.5 text-xs text-ghost-dim transition-colors hover:border-accent-red/60 hover:text-ghost"
        >
          Open the Map
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-dark-600 bg-dark-900 py-6 text-center">
      <div className="mx-auto max-w-md px-6">
        <p className="text-xs text-ghost-dim">Past Shadows — Unearthing the hidden history beneath your feet.</p>
        <p className="mt-2 text-[10px] text-ghost-dim/30">Data sourced from public records, historical archives, and live APIs.</p>
      </div>
    </footer>
  );
}
