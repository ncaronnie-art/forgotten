# Past Shadows — Forgotten

Stand anywhere and discover the hidden history beneath your feet — with a focus on the macabre. Past Shadows surfaces nearby crimes, murders, deaths, cemeteries, disasters and unsolved mysteries from public records and live API queries (Wikipedia, OpenStreetMap, Wikidata), plotted on a map and presented as a haunting location history.

## Stack

- **TanStack Start + React 19** (file-based routes, SSR) with **Vite 7** and **Tailwind CSS 4**
- **Leaflet** map with browser geolocation
- **Bun** as runtime and package manager
- Server functions and API routes served from the same process (port 3000)

## Local development

```bash
bun install
bun run dev      # vite dev
bun run publish  # build + restart the server on port 3000
```

`bun run publish` rebuilds and restarts the server; editing files alone does not update a running instance. Server logs land in `.run/server.log`.

## Configuration

Environment variables are read at runtime and are never committed. Set them in the deployment environment or in Secrets:

| Variable | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | Natural narration voice for Video Stories (falls back to Google/edge TTS, then espeak) |
| `STRIPE_SECRET_KEY` | Pro subscriptions, one-time reports, API tier |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhooks; the webhook fails closed when unset |
| `ADMIN_EMAILS` | Comma-separated allowlist for the `/admin` dashboard and admin API |

## Layout

```
src/routes/      file-based routes (index, event, city, category, blog, admin, api/*)
src/components/  map, spotlight strip, history reel, video export, content prefs
src/data/        curated event dataset
src/lib/         shared helpers (auth, tiering, formatting)
server/          API handlers (analytics, nearby/scan-area/news proxies)
scripts/         image generation, sitemap and icon tooling
public/          static assets: event images, videos, icons, sitemap.xml, robots.txt
```

## Product tiers

Free gives the 5 nearest curated events and a single category filter. Pro unlocks live API access, all categories, History Reel, Video Stories, MP4 export, news, GPS navigation, bookmarks and Scan My Area. Location History Reports and a commercial API tier are sold alongside the subscription.

## Notes

- `public/images/events` holds the curated event imagery (currently BMP); converting it to WebP is tracked as a performance task.
- `src/routeTree.gen.ts` and `dist/` are generated and not tracked.
