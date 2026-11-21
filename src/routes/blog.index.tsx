/**
 * /blog — index page listing all Past Shadows Journal posts.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { blogPosts } from "~/data/blog-posts";
import { BlogHeader, BlogFooter } from "~/components/BlogPostLayout";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Past Shadows Blog — Dark History Journal" },
      {
        name: "description",
        content:
          "The Past Shadows Journal — essays on mapped dark history: Chicago, Dallas, New Orleans, and the hidden past beneath everyday streets.",
      },
      { property: "og:title", content: "Past Shadows Blog — Dark History Journal" },
      {
        property: "og:description",
        content:
          "Essays on mapped dark history: crimes, disasters, and unsolved mysteries plotted beneath everyday streets.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pastshadows.ctonew.app/blog" },
      { property: "og:image", content: "https://pastshadows.ctonew.app/og-image.png" },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="min-h-dvh bg-dark-900 text-ghost">
      <BlogHeader />

      <main className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-red-light">Past Shadows Journal</p>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-ghost sm:text-4xl">
          Notes from the dark map
        </h1>
        <p className="mt-4 text-base italic text-ghost-dim">
          Essays on the documented dark history beneath everyday streets — written by hand, mapped by the database.
        </p>

        <div className="mt-10 space-y-4">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="card-enhanced group block rounded-xl border border-dark-600 bg-dark-800/50 p-5 transition-all duration-200 hover:border-accent-gold/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-accent-gold/70">
                  {post.postLabel}
                </span>
                <span className="text-[11px] text-ghost-dim/60">{post.date}</span>
              </div>
              <h2 className="mt-2 font-serif text-lg font-bold leading-snug text-ghost transition-colors group-hover:text-accent-gold">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ghost-dim/80">{post.excerpt}</p>
              <p className="mt-3 text-xs font-medium text-accent-gold/70 transition-colors group-hover:text-accent-gold">
                Read the post →
              </p>
            </Link>
          ))}
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
