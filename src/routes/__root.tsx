import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "~/styles/app.css?url";
import AmbientAudio from "~/components/AmbientAudio";
import { track } from "~/lib/analytics";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Past Shadows — Dark History Map: True Crime, Haunted Places & Unsolved Mysteries Near You" },
      {
        name: "description",
        content:
          "Explore the dark history map of any location. True crime map with murders, haunted places, disasters, cemeteries, and unsolved mysteries plotted on an interactive map. Discover the hidden past beneath your feet.",
      },
      // PWA / iOS Add to Home Screen
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Past Shadows" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "Past Shadows" },
      { name: "theme-color", content: "#0a0a0f" },
      // Open Graph tags for sharing (Facebook, LinkedIn, WhatsApp, etc.)
      { property: "og:title", content: "Past Shadows — Dark History Map: True Crime, Haunted Places & Mysteries" },
      {
        property: "og:description",
        content:
          "Stand anywhere and instantly discover the hidden history beneath your feet — crimes, murders, disasters, haunted places, and unsolved mysteries plotted on an interactive map.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pastshadows.ctonew.app" },
      { property: "og:image", content: "https://pastshadows.ctonew.app/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: "Past Shadows" },
      // Twitter Card tags
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Past Shadows — Dark History Map: True Crime, Haunted Places & Mysteries" },
      {
        name: "twitter:description",
        content:
          "Stand anywhere and instantly discover the hidden history beneath your feet — crimes, murders, disasters, haunted places, and unsolved mysteries plotted on an interactive map.",
      },
      { name: "twitter:image", content: "https://pastshadows.ctonew.app/og-image.png" },
      { name: "twitter:site", content: "@PastShadowsApp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/icons/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/icons/icon-512.png", sizes: "512x512" },
      // iOS splash screen placeholder
      {
        rel: "apple-touch-startup-image",
        href: "/icons/icon-512.png",
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  // Lightweight pageview beacon on every route change (client-side only).
  useEffect(() => {
    track("pageview");
  }, [location.pathname]);
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />

        {/* JSON-LD WebSite Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Past Shadows",
              url: "https://pastshadows.ctonew.app",
              description:
                "Stand anywhere and instantly discover the hidden history beneath your feet — crimes, murders, disasters, haunted places, and unsolved mysteries plotted on an interactive map.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://pastshadows.ctonew.app/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-dvh bg-dark-900">
        {children}
        <AmbientAudio />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("/sw.js").then(function(reg) {
      console.log("SW registered:", reg.scope);
    }).catch(function(err) {
      console.log("SW registration failed:", err);
    });
  });
}
`,
          }}
        />

        <Scripts />
      </body>
    </html>
  );
}
