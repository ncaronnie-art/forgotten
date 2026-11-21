/**
 * Sitemap generator — writes public/sitemap.xml from the live data sources.
 *
 * Run:  bun run scripts/gen-sitemap.ts   (also invoked by publish.sh before build)
 *
 * Includes: home, /blog + every blog post, every /city/<slug>, every
 * /category/<slug>, and every /event/<slug> (all curated events). Uses the
 * exact same slugify() as the routes so URLs always resolve.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import events from "../src/data/events";
import { CITIES, CATEGORIES, slugify } from "../src/data/seo-pages";
import { blogPosts } from "../src/data/blog-posts";

const SITE = "https://pastshadows.ctonew.app";
const OUT = join(import.meta.dir, "..", "public", "sitemap.xml");

interface UrlEntry {
  loc: string;
  changefreq: string;
  priority: string;
}

const entries: UrlEntry[] = [
  { loc: `${SITE}/`, changefreq: "weekly", priority: "1.0" },
  { loc: `${SITE}/blog`, changefreq: "weekly", priority: "0.8" },
  ...blogPosts.map((p) => ({
    loc: `${SITE}/blog/${p.slug}`,
    changefreq: "monthly",
    priority: "0.6",
  })),
  ...CITIES.map((c) => ({
    loc: `${SITE}/city/${c.slug}`,
    changefreq: "weekly",
    priority: "0.7",
  })),
  ...CATEGORIES.map((c) => ({
    loc: `${SITE}/category/${c.slug}`,
    changefreq: "weekly",
    priority: "0.7",
  })),
  ...events.map((e) => ({
    loc: `${SITE}/event/${slugify(e.title)}`,
    changefreq: "monthly",
    priority: "0.5",
  })),
];

// Sanity: slugs must be unique (route lookup is slug → single event).
const slugs = events.map((e) => slugify(e.title));
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length > 0) {
  console.error(`ERROR: ${dupes.length} duplicate event slugs in sitemap (${dupes[0]}…)`);
  process.exit(1);
}

const xml =
  `<?xml version='1.0' encoding='UTF-8'?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries
    .map(
      (e) =>
        `  <url>\n    <loc>${e.loc}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

writeFileSync(OUT, xml, "utf-8");
console.log(`sitemap.xml written: ${entries.length} URLs → ${OUT}`);
