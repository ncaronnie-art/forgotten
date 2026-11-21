/**
 * Shared blog post layout — used by /blog/<slug> post pages.
 *
 * Renders the dark-theme header, article body (standfirst, intro, sections,
 * why-this-exists, CTA) and footer. Also exports renderInline(), a tiny
 * inline-markdown renderer supporting **bold**, *italic*, and [link](url).
 */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { BlogPost } from "~/data/blog-posts";

/* ---------- tiny inline-markdown renderer (bold / italic / links) ---------- */

const INLINE_TOKEN =
  /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)]+\))/g;

export function renderInline(text: string): ReactNode[] {
  const parts = text.split(INLINE_TOKEN);
  return parts.map((part, i) => {
    if (!part) return null;
    // **bold**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-ghost">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // *italic*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    // [text](url)
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-gold underline decoration-accent-gold/40 underline-offset-2 transition-colors hover:text-ghost"
        >
          {link[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/* ------------------------------ shared chrome ------------------------------ */

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-dark-600 bg-dark-900/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
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

export function BlogFooter() {
  return (
    <footer className="border-t border-dark-600 bg-dark-900 py-6 text-center">
      <p className="text-xs text-ghost-dim">Past Shadows — Unearthing the hidden history beneath your feet.</p>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-ghost-dim/50">
        <Link to="/" className="inline-flex min-h-[44px] items-center px-1 transition-colors hover:text-ghost-dim">
          The Map
        </Link>
        <span className="text-ghost-dim/20">|</span>
        <Link to="/blog" className="inline-flex min-h-[44px] items-center px-1 transition-colors hover:text-ghost-dim">
          Blog
        </Link>
        <span className="text-ghost-dim/20">|</span>
        <Link to="/terms" className="inline-flex min-h-[44px] items-center px-1 transition-colors hover:text-ghost-dim">
          Terms of Service
        </Link>
        <span className="text-ghost-dim/20">|</span>
        <Link to="/privacy" className="inline-flex min-h-[44px] items-center px-1 transition-colors hover:text-ghost-dim">
          Privacy Policy
        </Link>
      </div>
      <p className="mt-2 text-[10px] text-ghost-dim/30">Data sourced from public records, historical archives, and live APIs.</p>
    </footer>
  );
}

/* ------------------------------- article body ------------------------------ */

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl font-bold text-ghost sm:text-2xl">{title}</h2>
      {kicker && (
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-accent-gold/80">{kicker}</p>
      )}
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ghost-dim">{children}</div>
    </section>
  );
}

function Paragraphs({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <p key={i}>{renderInline(line)}</p>
      ))}
    </>
  );
}

export function BlogArticle({ post }: { post: BlogPost }) {
  return (
    <div className="min-h-dvh bg-dark-900 text-ghost">
      <BlogHeader />

      <article className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <Link
          to="/blog"
          className="inline-block text-xs font-medium text-ghost-dim/70 transition-colors hover:text-accent-gold"
        >
          ← All posts
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-accent-red-light">{post.postLabel}</p>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-ghost sm:text-4xl">{post.title}</h1>
        <p className="mt-4 text-base italic text-ghost-dim">{post.standfirst}</p>

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ghost-dim">
          <Paragraphs lines={post.intro} />
        </div>

        <hr className="mt-10 border-dark-600" />

        {post.sections.map((s) => (
          <Section key={s.heading} title={s.heading} kicker={s.kicker}>
            <Paragraphs lines={s.paragraphs} />
            {s.bullets && (
              <ul className="ml-4 space-y-2">
                {s.bullets.map((b, i) => (
                  <li key={i} className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-accent-gold/60">
                    {renderInline(b)}
                  </li>
                ))}
              </ul>
            )}
            {s.paragraphsAfterBullets && <Paragraphs lines={s.paragraphsAfterBullets} />}
          </Section>
        ))}

        <hr className="mt-10 border-dark-600" />

        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold text-ghost">{post.whyTitle}</h2>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ghost-dim">
            <Paragraphs lines={post.whyParagraphs} />
          </div>
        </section>

        <div className="mt-10 rounded-xl border border-dark-600 bg-dark-800/50 p-6 text-center">
          <p className="font-serif text-lg font-bold text-ghost">{post.ctaTitle}</p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-full border border-accent-red/60 bg-accent-red/20 px-6 py-2.5 text-sm font-semibold text-ghost transition-colors hover:bg-accent-red/40"
          >
            Open Past Shadows
          </Link>
          <p className="mt-3 text-xs text-ghost-dim/60">{post.ctaBody}</p>
        </div>

        <p className="mt-8 text-xs italic text-ghost-dim/50">{post.footnote}</p>
      </article>

      <BlogFooter />
    </div>
  );
}
