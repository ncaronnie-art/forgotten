import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      {
        title: "Traffic Analytics — Past Shadows",
      },
      {
        name: "description",
        content: "Internal self-hosted traffic and conversion analytics for Past Shadows.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

type Row = { path?: string; source?: string; date?: string; views: number; uniques?: number; signups: number };
type Summary = {
  generatedAt: string;
  totals: {
    hits: number;
    pageviews: number;
    uniqueVisitors: number;
    uniquePaths: number;
    waitlistSignups: number;
  };
  byPath: Row[];
  byReferrer: Row[];
  byDay: Row[];
  recent: { when: string; event: string; path: string; refDomain: string }[];
};

const fmt = (n: number) => n.toLocaleString("en-US");

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-dark-600 bg-dark-800/60 p-4">
      <p className="text-[11px] font-medium uppercase tracking-widest text-ghost-dim/60">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold text-ghost">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ghost-dim/50">{sub}</p> : null}
    </div>
  );
}

function Table({ title, rows, columns }: { title: string; rows: Row[]; columns: { key: string; label: string }[] }) {
  return (
    <div className="rounded-xl border border-dark-600 bg-dark-800/40 p-4">
      <h3 className="font-serif text-sm font-bold text-ghost">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-dark-600 text-[10px] uppercase tracking-wider text-ghost-dim/50">
              {columns.map((c) => (
                <th key={c.key} className="pb-2 pr-4 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-4 text-ghost-dim/50">
                  No data yet — waiting for the first pageview beacon.
                </td>
              </tr>
            ) : (
              rows.slice(0, 25).map((r, i) => (
                <tr key={i} className="border-b border-dark-700/60">
                  <td className="py-2 pr-4 font-mono text-ghost-dim">{r.path ?? r.source ?? r.date}</td>
                  <td className="py-2 pr-4 text-ghost">{fmt(r.views)}</td>
                  {columns.some((c) => c.key === "uniques") ? (
                    <td className="py-2 pr-4 text-ghost-dim">{fmt(r.uniques ?? 0)}</td>
                  ) : null}
                  <td className="py-2 text-accent-gold">{fmt(r.signups)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/analytics/summary")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((d: Summary) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(String(e?.message || e));
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-dark-900 text-ghost">
      <header className="sticky top-0 z-50 border-b border-dark-600 bg-dark-900/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <a href="/" className="font-serif text-sm font-bold tracking-wide text-ghost hover:text-accent-gold">
            Past Shadows
          </a>
          <span className="text-xs text-ghost-dim/60">Internal Analytics</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-red-light">Self-hosted beacon</p>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-ghost">Traffic & Conversions</h1>
        {error ? (
          <p className="mt-4 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red-light">
            Failed to load summary: {error}
          </p>
        ) : !data ? (
          <p className="mt-8 text-sm text-ghost-dim/60">Loading…</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Page Views" value={fmt(data.totals.pageviews)} sub="total hits" />
              <StatCard label="Unique Visitors" value={fmt(data.totals.uniqueVisitors)} sub="per session" />
              <StatCard label="Waitlist Signups" value={fmt(data.totals.waitlistSignups)} sub="new emails" />
              <StatCard label="Pages Tracked" value={fmt(data.totals.uniquePaths)} sub="distinct paths" />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Table
                title="Views by Page"
                rows={data.byPath}
                columns={[
                  { key: "path", label: "Path" },
                  { key: "views", label: "Views" },
                  { key: "uniques", label: "Uniques" },
                  { key: "signups", label: "Signups" },
                ]}
              />
              <Table
                title="Views by Referrer"
                rows={data.byReferrer}
                columns={[
                  { key: "source", label: "Source" },
                  { key: "views", label: "Views" },
                  { key: "signups", label: "Signups" },
                ]}
              />
            </div>

            <div className="mt-4">
              <Table
                title="By Day"
                rows={data.byDay}
                columns={[
                  { key: "date", label: "Day" },
                  { key: "views", label: "Views" },
                  { key: "signups", label: "Signups" },
                ]}
              />
            </div>

            <div className="mt-4 rounded-xl border border-dark-600 bg-dark-800/40 p-4">
              <h3 className="font-serif text-sm font-bold text-ghost">Recent hits</h3>
              <ul className="mt-3 space-y-1.5 text-xs text-ghost-dim/70">
                {data.recent.length === 0 ? (
                  <li>No hits yet.</li>
                ) : (
                  data.recent.map((h, i) => (
                    <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="font-mono text-ghost-dim/50">{h.when.slice(11, 19)}</span>
                      <span className="text-accent-gold/80">{h.event}</span>
                      <span className="font-mono">{h.path}</span>
                      <span className="text-ghost-dim/50">via {h.refDomain}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
