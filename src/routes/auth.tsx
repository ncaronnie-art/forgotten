import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type AuthMode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("ps_token");
    if (token) {
      fetch(`/api/user/status?token=${token}`)
        .then(r => r.json())
        .then(data => {
          if (data.authenticated) {
            // Already logged in, redirect to home
            navigate({ to: "/" });
          }
        })
        .catch(() => {});
    }
  }, [navigate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (!email.trim() || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
    }

    try {
      const endpoint = mode === "signin" ? "/api/auth/signin" : "/api/auth/signup";
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Store token
      localStorage.setItem("ps_token", data.token);
      localStorage.setItem("ps_email", data.user.email);
      localStorage.setItem("ps_tier", data.tier || "free");

      if (mode === "signup") {
        setSuccess("Account created! Redirecting...");
      } else {
        setSuccess("Signed in! Redirecting...");
      }

      // Redirect to home after short delay
      setTimeout(() => {
        navigate({ to: "/" });
      }, 800);
    } catch (err) {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }, [email, password, confirmPassword, mode, navigate]);

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
    setSuccess("");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-dark-900">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b border-dark-600 bg-dark-900/95 backdrop-blur-sm safe-top">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-dark-600 bg-dark-700/50 text-ghost-dim transition-colors hover:border-accent-gold/40 hover:text-accent-gold active:scale-95"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-2xl animate-float select-none">🕯️</span>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-accent-gold text-glow">
              Past Shadows
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-12">
        <div className="w-full">
          {/* ─── Auth Card ─── */}
          <div className="rounded-2xl border border-dark-600 bg-dark-800/80 p-6 sm:p-8 shadow-2xl">
            {/* Icon */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-accent-gold/30 bg-accent-gold/10">
                <span className="text-3xl select-none">
                  {mode === "signin" ? "🔑" : "👤"}
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-ghost">
                {mode === "signin" ? "Welcome Back" : "Join Past Shadows"}
              </h2>
              <p className="mt-1 text-sm text-ghost-dim">
                {mode === "signin"
                  ? "Sign in to unlock your Pro features"
                  : "Create an account to track your dark history explorations"}
              </p>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="mb-4 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red-light">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                <span className="mr-2">✅</span>
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ghost-dim">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  className="min-h-[48px] w-full rounded-xl border border-dark-600 bg-dark-900/80 px-4 text-sm text-ghost placeholder-ghost-dim/40 transition-colors focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ghost-dim">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="min-h-[48px] w-full rounded-xl border border-dark-600 bg-dark-900/80 px-4 text-sm text-ghost placeholder-ghost-dim/40 transition-colors focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ghost-dim">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="min-h-[48px] w-full rounded-xl border border-dark-600 bg-dark-900/80 px-4 text-sm text-ghost placeholder-ghost-dim/40 transition-colors focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] w-full rounded-xl border border-accent-gold/40 bg-accent-gold/10 text-sm font-bold text-accent-gold transition-all hover:bg-accent-gold/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === "signin" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  mode === "signin" ? "Sign In" : "Create Account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-dark-600" />
              <span className="text-xs text-ghost-dim/50">or</span>
              <div className="h-px flex-1 bg-dark-600" />
            </div>

            {/* Switch mode */}
            <div className="text-center">
              <p className="text-sm text-ghost-dim">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={switchMode}
                  className="font-medium text-accent-gold transition-colors hover:text-accent-gold/80"
                >
                  {mode === "signin" ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>

            {/* Pro upsell */}
            <div className="mt-6 rounded-xl border border-accent-gold/20 bg-accent-gold/5 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl select-none">⚡</span>
                <div>
                  <p className="text-sm font-bold text-ghost">Go Pro for Unlimited Access</p>
                  <p className="mt-1 text-xs text-ghost-dim">
                    Free tier: 5 events/day. Pro: unlimited events, GPS navigation, History Reel, news articles, and no ads.
                  </p>
                  <a
                    href="https://buy.stripe.com/bJe4gz14xaxa88d3Bs5gc02"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-[36px] items-center rounded-lg border border-accent-gold/30 bg-accent-gold/15 px-4 text-xs font-bold text-accent-gold transition-colors hover:bg-accent-gold/25"
                  >
                    Upgrade to Pro — $6.99/mo
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-dark-600 bg-dark-900 py-4 text-center text-xs text-ghost-dim">
        <p>Past Shadows — Exploring the hidden history beneath your feet.</p>
      </footer>
    </div>
  );
}