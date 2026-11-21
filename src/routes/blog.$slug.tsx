/**
 * /blog/<slug> — individual blog post pages.
 *
 * Per-post <head> meta (title, description, og:title/description/url, og:type=article)
 * is the SEO payoff of this route.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPost, SITE_URL } from "~/data/blog-posts";
import { BlogArticle, BlogHeader, BlogFooter } from "~/components/BlogPostLayout";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  notFoundComponent: PostNotFound,
  head: ({ match }) => {
    const post = getPost(match.params.slug);
    const url = post ? `${SITE_URL}/blog/${post.slug}` : `${SITE_URL}/blog`;
    return {
      meta: [
        {
          title: post ? `${post.title} — Past Shadows Blog` : "Post not found — Past Shadows Blog",
        },
        {
          name: "description",
          content: post ? post.metaDescription : "The Past Shadows Journal — essays on mapped dark history.",
        },
        { property: "og:title", content: post ? post.title : "Past Shadows Blog" },
        {
          property: "og:description",
          content: post ? post.metaDescription : "Essays on mapped dark history beneath everyday streets.",
        },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: `${SITE_URL}/og-image.png` },
      ],
    };
  },
  component: BlogPostPage,
});

function PostNotFound() {
  return (
    <div className="min-h-dvh bg-dark-900 text-ghost">
      <BlogHeader />
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-ghost">Post not found</h1>
        <p className="mt-3 text-sm text-ghost-dim">We couldn't find that journal entry.</p>
        <Link
          to="/blog"
          className="mt-6 inline-block rounded-full border border-dark-600 bg-dark-800 px-5 py-2 text-xs text-ghost-dim transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
        >
          ← All posts
        </Link>
      </main>
      <BlogFooter />
    </div>
  );
}
function BlogPostPage() {
  const post = Route.useLoaderData();
  return <BlogArticle post={post} />;
}
