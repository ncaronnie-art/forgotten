import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

interface UserData {
  id: string;
  email: string;
  tier: string;
  expires_at: string | null;
  created_at: string;
}

interface Stats {
  total_users: number;
  pro_users: number;
  monthly_subscribers: number;
  annual_subscribers: number;
  estimated_mrr: number;
}

function AdminPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("ps_token") || "";
    setToken(t);

    if (!t) {
      setLoading(false);
      setError("Not signed in");
      return;
    }

    fetch(`/api/admin/users?token=${t}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setUsers(data.users || []);
          setStats(data.stats || null);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load admin data");
        setLoading(false);
      });
  }, []);

  const generatePromo = () => {
    const code = "PROMO-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setPromoCode(code);
    setPromoResult(`Promo code: ${code} (30% off - share with users)`);
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-pulse rounded-full bg-accent-gold/50" />
          <p className="text-ghost-dim">Loading admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-dark-900">
      <header className="sticky top-0 z-50 border-b border-dark-600 bg-dark-900/95 backdrop-blur-sm safe-top">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-dark-600 bg-dark-700/50 text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-2xl select-none">⚙️</span>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-accent-gold">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-6 rounded-xl border border-accent-red/30 bg-accent-red/10 px-6 py-4 text-sm text-accent-red-light">
            {error}
            {!token && (
              <div className="mt-2">
                <button
                  onClick={() => navigate({ to: "/auth" })}
                  className="inline-flex min-h-[36px] items-center rounded-lg border border-accent-gold/30 bg-accent-gold/15 px-4 text-xs font-bold text-accent-gold"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {/* Revenue Stats */}
        {stats && (
          <section className="mb-8">
            <h2 className="mb-4 font-serif text-lg font-bold text-ghost">Revenue Overview</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-dark-600 bg-dark-800/70 p-4">
                <p className="text-xs text-ghost-dim uppercase tracking-wider">Total Users</p>
                <p className="mt-1 text-2xl font-bold text-ghost">{stats.total_users}</p>
              </div>
              <div className="rounded-xl border border-dark-600 bg-dark-800/70 p-4">
                <p className="text-xs text-ghost-dim uppercase tracking-wider">Pro Users</p>
                <p className="mt-1 text-2xl font-bold text-accent-gold">{stats.pro_users}</p>
              </div>
              <div className="rounded-xl border border-dark-600 bg-dark-800/70 p-4">
                <p className="text-xs text-ghost-dim uppercase tracking-wider">Monthly Subs</p>
                <p className="mt-1 text-2xl font-bold text-ghost">
                  {stats.monthly_subscribers} <span className="text-sm text-ghost-dim">/ {stats.annual_subscribers} annual</span>
                </p>
              </div>
              <div className="rounded-xl border border-dark-600 bg-dark-800/70 p-4">
                <p className="text-xs text-ghost-dim uppercase tracking-wider">Est. MRR</p>
                <p className="mt-1 text-2xl font-bold text-green-400">${stats.estimated_mrr.toFixed(2)}</p>
              </div>
            </div>
          </section>
        )}

        {/* Promo Code Generator */}
        <section className="mb-8">
          <h2 className="mb-4 font-serif text-lg font-bold text-ghost">Promo Codes</h2>
          <div className="rounded-xl border border-dark-600 bg-dark-800/70 p-4">
            <button
              onClick={generatePromo}
              className="min-h-[44px] rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-6 text-sm font-bold text-accent-gold transition-colors hover:bg-accent-gold/20 active:scale-95"
            >
              🎟️ Generate Promo Code
            </button>
            {promoResult && (
              <div className="mt-3 rounded-lg border border-accent-gold/20 bg-accent-gold/10 px-4 py-3 text-sm text-accent-gold">
                {promoResult}
              </div>
            )}
          </div>
        </section>

        {/* Users Table */}
        {users.length > 0 && (
          <section>
            <h2 className="mb-4 font-serif text-lg font-bold text-ghost">Users ({users.length})</h2>
            <div className="overflow-x-auto rounded-xl border border-dark-600 bg-dark-800/70">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-dark-600 bg-dark-700/50">
                    <th className="px-4 py-3 font-medium text-ghost-dim">Email</th>
                    <th className="px-4 py-3 font-medium text-ghost-dim">Tier</th>
                    <th className="px-4 py-3 font-medium text-ghost-dim">Expires</th>
                    <th className="px-4 py-3 font-medium text-ghost-dim">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-dark-600/50 transition-colors hover:bg-dark-700/30">
                      <td className="px-4 py-3 text-ghost">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          user.tier === "free"
                            ? "border-gray-600 bg-gray-800/50 text-gray-400"
                            : "border-accent-gold/40 bg-accent-gold/15 text-accent-gold"
                        }`}>
                          {user.tier === "free" ? "🆓 Free" : user.tier === "pro_monthly" ? "⚡ Monthly" : user.tier === "pro_annual" ? "⚡ Annual" : "♾️ Lifetime"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ghost-dim">{user.expires_at ? new Date(user.expires_at).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-xs text-ghost-dim">{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}