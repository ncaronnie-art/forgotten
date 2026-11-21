// Server-side API handlers for Past Shadows
// Queries Wikipedia Geosearch, OSM Overpass, and Wikidata SPARQL
// + User auth, Stripe webhook, subscription management

const USER_AGENT = "PastShadows/1.0 (contact@pastshadows.app)";

// ─── Persistent JSON storage helpers ───
import { randomUUID, createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = "/home/team/shared/data";

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const path = join(DATA_DIR, filename);
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
  }
  return fallback;
}

function writeJSON<T>(filename: string, data: T) {
  ensureDataDir();
  const path = join(DATA_DIR, filename);
  try {
    writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
}

// ─── User types ───
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  role?: string; // "admin" grants access to the admin API; otherwise ADMIN_EMAILS allowlist
}

interface Subscription {
  userId: string;
  email: string;
  tier: "free" | "pro_monthly" | "pro_annual" | "lifetime";
  expiresAt: string | null; // ISO date string or null for lifetime
  stripeSessionId?: string;
  updatedAt: string;
}

interface EventUsage {
  userId: string;
  date: string; // YYYY-MM-DD
  count: number;
}

// ─── Auth helpers ───
function hashPassword(password: string): string {
  return createHash("sha256").update(password + "past-shadows-salt-v1").digest("hex");
}

function generateToken(): string {
  return randomUUID() + "-" + randomUUID();
}

// Session tokens: token -> userId mapping (in-memory, persisted frequently)
let sessions: Record<string, string> = readJSON("sessions.json", {});

function persistSessions() {
  writeJSON("sessions.json", sessions);
}
// ─── Auth resolution helpers (server-side enforcement — pre-launch audit) ───
// Admin emails come from the ADMIN_EMAILS env var (comma-separated). A user whose
// JSON record has role === "admin" also counts. Empty allowlist = admin API locked.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
function getUserIdByToken(token: string): string | null {
  if (!token) return null;
  return sessions[token] || null;
}
/** Resolve a token to { userId, tier, isPro }, treating expired subscriptions as free. */
export function resolveAuth(token: string): { userId: string | null; tier: string; isPro: boolean } {
  const userId = getUserIdByToken(token);
  if (!userId) return { userId: null, tier: "free", isPro: false };
  const sub = getSubscriptionByUserId(userId);
  let tier = sub?.tier || "free";
  if (tier !== "free" && sub?.expiresAt) {
    if (new Date(sub.expiresAt) <= new Date()) tier = "free";
  }
  return { userId, tier, isPro: tier !== "free" };
}
function getAuthTokenFromRequest(req: Request): string {
  const url = new URL(req.url);
  return url.searchParams.get("token") || req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
}
/** Gate used by Pro-only endpoints: 401 = no/invalid token, 403 = free tier. */
export function requireProRequest(req: Request): { ok: true; userId: string } | { ok: false; status: number; error: string } {
  const token = getAuthTokenFromRequest(req);
  if (!token) return { ok: false, status: 401, error: "Authentication required — sign in to use this feature" };
  const auth = resolveAuth(token);
  if (!auth.userId) return { ok: false, status: 401, error: "Invalid or expired session — sign in again" };
  if (!auth.isPro) return { ok: false, status: 403, error: "Pro subscription required — upgrade to use this feature" };
  return { ok: true, userId: auth.userId };
}
function isAdminUser(userId: string): boolean {
  const user = findUserById(userId);
  if (!user) return false;
  if (user.role === "admin") return true;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// ─── User CRUD ───
function getUsers(): User[] {
  return readJSON<User[]>("users.json", []);
}

function saveUsers(users: User[]) {
  writeJSON("users.json", users);
}

function findUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

// ─── Subscription CRUD ───
function getSubscriptions(): Subscription[] {
  return readJSON<Subscription[]>("subscriptions.json", []);
}

function saveSubscriptions(subs: Subscription[]) {
  writeJSON("subscriptions.json", subs);
}

function getSubscriptionByUserId(userId: string): Subscription | undefined {
  return getSubscriptions().find(s => s.userId === userId);
}

function getSubscriptionByEmail(email: string): Subscription | undefined {
  return getSubscriptions().find(s => s.email.toLowerCase() === email.toLowerCase());
}

function setSubscription(userId: string, email: string, tier: string, expiresAt: string | null, stripeSessionId?: string) {
  const subs = getSubscriptions();
  const existing = subs.findIndex(s => s.userId === userId);
  const entry: Subscription = {
    userId,
    email,
    tier: tier as Subscription["tier"],
    expiresAt,
    stripeSessionId,
    updatedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    subs[existing] = { ...subs[existing], ...entry };
  } else {
    subs.push(entry);
  }
  saveSubscriptions(subs);
}

// ─── Event usage tracking ───
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getEventUsage(userId: string): number {
  const today = getToday();
  const allUsage = readJSON<EventUsage[]>("event-usage.json", []);
  const record = allUsage.find(u => u.userId === userId && u.date === today);
  return record?.count || 0;
}

function incrementEventUsage(userId: string) {
  const today = getToday();
  const allUsage = readJSON<EventUsage[]>("event-usage.json", []);
  const existing = allUsage.findIndex(u => u.userId === userId && u.date === today);
  if (existing >= 0) {
    allUsage[existing].count++;
  } else {
    allUsage.push({ userId, date: today, count: 1 });
  }
  writeJSON("event-usage.json", allUsage);
}

function getEventsLimit(userId: string): number {
  const sub = getSubscriptionByUserId(userId);
  if (sub && sub.tier !== "free") {
    // Check if pro subscription is still valid
    if (sub.expiresAt === null) return Infinity; // lifetime
    const expires = new Date(sub.expiresAt);
    if (expires > new Date()) return Infinity; // still active
  }
  return 5; // free tier
}

// ─── Promo codes ───
interface PromoCode {
  code: string;          // uppercase code
  tier: string;          // "pro_monthly" | "pro_annual" | "lifetime"
  durationDays: number;  // 30 for monthly, 365 for annual, -1 for lifetime
  maxRedemptions: number; // total allowed uses (-1 = unlimited)
  usedCount: number;
  createdBy: string;     // admin user ID or "system"
  createdAt: string;
  expiresAt: string | null; // when the promo code itself expires (null = never)
}

interface PromoRedemption {
  code: string;
  userId: string;
  email: string;
  redeemedAt: string;
}

function getPromoCodes(): PromoCode[] {
  return readJSON<PromoCode[]>("promo-codes.json", []);
}

function savePromoCodes(codes: PromoCode[]) {
  writeJSON("promo-codes.json", codes);
}

function getPromoRedemptions(): PromoRedemption[] {
  return readJSON<PromoRedemption[]>("promo-redemptions.json", []);
}

function savePromoRedemptions(redemptions: PromoRedemption[]) {
  writeJSON("promo-redemptions.json", redemptions);
}

// Public system codes that shipped pre-launch (BETA2026, FOCUSGROUP2024) are retired
// (BUG-4 audit fix). No codes are seeded anymore; promo codes are issued admin-only by
// adding entries to promo-codes.json. Redemptions of retired codes now fail validation.
const RETIRED_PROMO_CODES = ["BETA2026", "FOCUSGROUP2024"];
function seedPromoCodes() {
  const codes = getPromoCodes();
  const retained = codes.filter((c) => !RETIRED_PROMO_CODES.includes(c.code));
  if (retained.length !== codes.length) {
    console.warn(`Retired public promo codes removed: ${RETIRED_PROMO_CODES.join(", ")}`);
    savePromoCodes(retained);
  }
}

// Validate and redeem a promo code. Returns { valid, tier, durationDays, error? }
function validatePromoCode(code: string): { valid: boolean; tier?: string; durationDays?: number; error?: string } {
  seedPromoCodes();
  const codes = getPromoCodes();
  const normalized = code.toUpperCase().trim();
  const promo = codes.find(c => c.code === normalized);
  
  if (!promo) {
    return { valid: false, error: "Invalid promo code" };
  }
  
  // Check if promo code itself is expired
  if (promo.expiresAt && new Date(promo.expiresAt) <= new Date()) {
    return { valid: false, error: "This promo code has expired" };
  }
  
  // Check max redemptions
  if (promo.maxRedemptions >= 0 && promo.usedCount >= promo.maxRedemptions) {
    return { valid: false, error: "This promo code has reached its usage limit" };
  }
  
  return { valid: true, tier: promo.tier, durationDays: promo.durationDays };
}

function recordPromoRedemption(code: string, userId: string, email: string) {
  // Increment usage count
  const codes = getPromoCodes();
  const idx = codes.findIndex(c => c.code === code.toUpperCase().trim());
  if (idx >= 0) {
    codes[idx].usedCount++;
    savePromoCodes(codes);
  }
  
  // Record redemption
  const redemptions = getPromoRedemptions();
  redemptions.push({ code: code.toUpperCase().trim(), userId, email, redeemedAt: new Date().toISOString() });
  savePromoRedemptions(redemptions);
}

function applyPromoSubscription(userId: string, email: string, tier: string, durationDays: number) {
  let expiresAt: string | null;
  if (durationDays < 0) {
    expiresAt = null; // lifetime
  } else {
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    expiresAt = d.toISOString();
  }
  setSubscription(userId, email, tier, expiresAt, `promo_${Date.now()}`);
}

// ─── In-memory cache (for existing API queries) ───
const cache = new Map<string, { data: any; expires: number }>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any, ttlMs: number = 3600000) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// Dark-history relevance keywords
const DARK_KEYWORDS = [
  "murder", "death", "kill", "disaster", "fire", "war", "massacre",
  "assassination", "explosion", "crash", "plague", "execution", "riot",
  "prison", "cemetery", "grave", "haunted", "mystery", "unsolved",
  "bombing", "torture", "suicide", "killed", "died", "deadly",
  "homicide", "poison", "burial", "tomb", "catastrophe", "fatal",
];

function isDarkHistory(text: string): boolean {
  const lower = text.toLowerCase();
  return DARK_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── False-positive patterns: things that match keywords but aren't dark history ───
const FALSE_POSITIVE_PATTERNS = [
  /\bpolice department\b/i,
  /\bfire department\b/i,
  /\bcrime lab\b/i,
  /\bcriminal justice\b/i,
  /\bdeath valley\b/i,
  /\bdead sea\b/i,
  /\bkiller whale\b/i,
  /\bmurder hornet\b/i,
  /\bghost pepper\b/i,
  /\bbattle of the bands\b/i,
  /\bdeath by chocolate\b/i,
  /\bserial number\b/i,
  /\bfire station\b/i,
  /\bems\b/i,
  /\bdisaster preparedness\b/i,
  /\bemergency response\b/i,
  /\bfire safety\b/i,
  /\bearthquake preparedness\b/i,
  /\bcrime prevention\b/i,
  /\bcrime statistics\b/i,
  /\bdisaster relief\b/i,
  /\bflood control\b/i,
  /\bearthquake engineering\b/i,
  /ghost town/i,  // Keep — ghost town is actually dark history
];

function isFalsePositive(title: string, description: string): boolean {
  const text = title + " " + description;
  return FALSE_POSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

// ─── Pure memorial/monument filter ───
// If a result is categorized as memorial/monument/statue but has NO dark-history
// keywords in its title or description, exclude it entirely.
const MEMORIAL_KEYWORDS = ["memorial", "monument", "statue", "plaque"];
function isPureMemorial(title: string, description: string, category: string): boolean {
  if (category !== "memorial") return false;
  const text = (title + " " + description).toLowerCase();
  const hasMemorialWord = MEMORIAL_KEYWORDS.some(kw => text.includes(kw));
  if (!hasMemorialWord) return false;
  if (DARK_KEYWORDS.some(kw => title.toLowerCase().includes(kw))) return false;
  let darkScore = 0;
  for (const kw of DARK_KEYWORDS) {
    const count = text.split(kw).length - 1;
    darkScore += count;
  }
  return darkScore < 3;
}

function categorizeByKeywords(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("murder") || lower.includes("homicide") || lower.includes("kill")) return "crime";
  if (lower.includes("war") || lower.includes("battle") || lower.includes("massacre")) return "war_conflict";
  if (lower.includes("prison") || lower.includes("jail") || lower.includes("captivity")) return "prison";
  if (lower.includes("execution") || lower.includes("behead") || lower.includes("guillotine")) return "execution";
  if (lower.includes("riot") || lower.includes("protest") || lower.includes("uprising")) return "riot";
  if (lower.includes("fire") || lower.includes("explosion") || lower.includes("disaster")) return "disaster";
  if (lower.includes("cemetery") || lower.includes("grave") || lower.includes("burial") || lower.includes("tomb")) return "cemetery";
  if (lower.includes("haunted") || lower.includes("mystery") || lower.includes("unsolved")) return "mystery";
  if (lower.includes("memorial") || lower.includes("monument")) return "memorial";
  if (lower.includes("plague") || lower.includes("fatal") || lower.includes("death") || lower.includes("dead")) return "death";
  return "historical";
}

function extractYear(text: string): number {
  const match = text.match(/\b(1[0-9]{3}|2[0-9]{3})\b/);
  return match ? parseInt(match[1]) : 0;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Auth API handlers ───

// POST /api/auth/signup
export async function handleSignup(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { email, password, promo_code } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Check if user already exists
    if (findUserByEmail(email)) {
      return new Response(JSON.stringify({ error: "An account with this email already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Create user
    const users = getUsers();
    const newUser: User = {
      id: randomUUID(),
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);

    // Generate session token
    const token = generateToken();
    sessions[token] = newUser.id;
    persistSessions();

    // Check for promo code
    let tier = "free";
    if (promo_code) {
      const validation = validatePromoCode(promo_code);
      if (validation.valid) {
        applyPromoSubscription(newUser.id, newUser.email, validation.tier!, validation.durationDays!);
        recordPromoRedemption(promo_code, newUser.id, newUser.email);
        tier = validation.tier!;
      } else {
        // Invalid promo code — still create the account, just free tier
        console.warn(`Signup with invalid promo code "${promo_code}": ${validation.error}`);
        setSubscription(newUser.id, newUser.email, "free", null);
      }
    } else {
      // Auto-create free subscription
      setSubscription(newUser.id, newUser.email, "free", null);
    }

    return new Response(JSON.stringify({
      token,
      user: { id: newUser.id, email: newUser.email },
      tier,
      promo_applied: !!promo_code,
    }), {
      status: 201,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// POST /api/auth/signin
export async function handleSignin(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { email, password, promo_code } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const user = findUserByEmail(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Generate session token
    const token = generateToken();
    sessions[token] = user.id;
    persistSessions();

    // Check for promo code (can be applied on signin too)
    let promoApplied = false;
    if (promo_code) {
      const validation = validatePromoCode(promo_code);
      if (validation.valid) {
        applyPromoSubscription(user.id, user.email, validation.tier!, validation.durationDays!);
        recordPromoRedemption(promo_code, user.id, user.email);
        promoApplied = true;
        console.log(`Promo code "${promo_code}" applied to ${user.email}`);
      } else {
        console.warn(`Signin with invalid promo code "${promo_code}": ${validation.error}`);
      }
    }

    // Get subscription info
    const sub = getSubscriptionByUserId(user.id);
    const tier = sub?.tier || "free";

    return new Response(JSON.stringify({
      token,
      user: { id: user.id, email: user.email },
      tier,
      promo_applied: promoApplied,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Signin error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// POST /api/auth/signout
export async function handleSignout(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || req.headers.get("Authorization")?.replace("Bearer ", "") || "";

    if (token && sessions[token]) {
      delete sessions[token];
      persistSessions();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Signout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── Stripe Webhook ───

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Stripe price IDs (from payment links)
const PRICE_MONTHLY = "price_monthly"; // placeholder - actual price from Stripe
const PRICE_ANNUAL = "price_annual";   // placeholder

function getTierFromPriceId(priceId: string): string {
  // Map Stripe price IDs to tiers
  // These would be your actual Stripe price IDs
  if (priceId.includes("monthly") || priceId.includes("1x")) return "pro_monthly";
  if (priceId.includes("annual") || priceId.includes("yearly")) return "pro_annual";
  return "pro_monthly"; // fallback
}

function getExpiryFromTier(tier: string): string | null {
  if (tier === "lifetime") return null;
  if (tier === "pro_annual") {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString();
  }
  // pro_monthly
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// POST /api/stripe/webhook
// Stripe webhook signature verification (BUG-6 audit fix). The webhook previously
// trusted ANY POST — anyone could forge a checkout.session.completed event and grant
// themselves Pro (live-verified). We now verify the `t=<ts>,v1=<hmac>` signature with
// the webhook secret, reject unsigned/stale/mismatched requests, and fail CLOSED if
// the secret is not configured (no known-empty downgrade path).
function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string): boolean {
  if (!secret || !sigHeader) return false;
  const parts = new Map<string, string>();
  for (const pair of sigHeader.split(",")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    parts.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return false;
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  // Replay protection: reject signatures older than 5 minutes.
  const ageMs = Date.now() - ts * 1000;
  if (ageMs < -300000 || ageMs > 300000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
export async function handleStripeWebhook(req: Request): Promise<Response> {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature") || "";
    const deny = (status: number, message: string) =>
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    // Fail closed: without the secret we cannot authenticate Stripe, so we never grant
    // entitlements. Set STRIPE_WEBHOOK_SECRET (Stripe dashboard → webhooks → endpoint).
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error("Stripe webhook rejected: STRIPE_WEBHOOK_SECRET not configured");
      return deny(403, "Webhook not configured");
    }
    if (!verifyStripeSignature(body, sig, STRIPE_WEBHOOK_SECRET)) {
      return deny(401, "Invalid webhook signature");
    }
    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return deny(400, "Invalid JSON");
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_email || session.customer_details?.email || "";
      const sessionId = session.id;
      const paymentStatus = session.payment_status;

      if (!customerEmail) {
        console.error("No customer email in Stripe session:", sessionId);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Find the paying user by email. No stub accounts are created from webhooks
      // (audit fix, per lead): if the email isn't a registered user we cannot safely
      // attach an entitlement (and never auto-create accounts). Log and acknowledge,
      // granting nothing — entitlement design to be decided by the lead/owner.
      const user = findUserByEmail(customerEmail);
      if (!user) {
        console.warn(`Stripe webhook for unknown email ${customerEmail} — no entitlement granted (no stub account created)`);
        return new Response(JSON.stringify({ received: true, action: "ignored_unknown_user" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Determine tier from the session
      // From Stripe payment links, we can check the line items or metadata
      let tier = "pro_monthly";
      if (session.mode === "subscription") {
        // Check if there's subscription data
        if (session.subscription) {
          // This would need a Stripe SDK call to get plan details
          // For MVP, we check the payment link URL or metadata
          const metadata = session.metadata || {};
          tier = metadata.tier || "pro_monthly";
        }
      } else if (session.mode === "payment") {
        // One-time payment - could be annual or lifetime
        const metadata = session.metadata || {};
        tier = metadata.tier || "pro_annual";
      }

      // Override from metadata if present
      if (session.metadata?.tier) {
        tier = session.metadata.tier;
      }

      // If the payment is successful, set the subscription
      if (paymentStatus === "paid" || paymentStatus === "complete") {
        const expiresAt = getExpiryFromTier(tier);
        setSubscription(user.id, user.email, tier, expiresAt, sessionId);
        console.log(`Subscription set for ${customerEmail}: ${tier} expires ${expiresAt || "never"}`);
      }
    }

    // Acknowledge receipt
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── Manage Stripe checkout success redirect ───
// GET /api/stripe/success?session_id=xxx&token=yyy
export async function handleStripeSuccess(url: URL): Promise<Response> {
  const sessionId = url.searchParams.get("session_id") || "";
  const token = url.searchParams.get("token") || "";

  // For now, redirect to home - the frontend will check status
  return new Response(null, {
    status: 302,
    headers: { Location: "/?payment=success" },
  });
}

// ─── User Status API ───
// GET /api/user/status?token=xxx
export async function handleUserStatus(url: URL): Promise<Response> {
  const token = url.searchParams.get("token") || "";

  if (!token) {
    // Return anonymous free tier status - no tracking
    return new Response(JSON.stringify({
      authenticated: false,
      tier: "free",
      expires_at: null,
      events_used_today: 0,
      events_limit: 5,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const userId = sessions[token];
  if (!userId) {
    return new Response(JSON.stringify({
      authenticated: false,
      tier: "free",
      expires_at: null,
      events_used_today: 0,
      events_limit: 5,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const sub = getSubscriptionByUserId(userId);
  const eventsUsed = getEventUsage(userId);
  const eventsLimit = getEventsLimit(userId);
  const expiresAt = sub?.expiresAt || null;

  // Check if subscription is expired
  let tier = sub?.tier || "free";
  if (tier !== "free" && expiresAt !== null) {
    const expires = new Date(expiresAt);
    if (expires <= new Date()) {
      tier = "free";
    }
  }

  return new Response(JSON.stringify({
    authenticated: true,
    user_id: userId,
    tier,
    expires_at: expiresAt,
    events_used_today: eventsUsed,
    events_limit: eventsLimit,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

// POST /api/user/track-event?token=xxx
export async function handleTrackEvent(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  if (!token) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const userId = sessions[token];
  if (!userId) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  incrementEventUsage(userId);

  const eventsUsed = getEventUsage(userId);
  const eventsLimit = getEventsLimit(userId);

  return new Response(JSON.stringify({
    events_used_today: eventsUsed,
    events_limit: eventsLimit,
    remaining: Math.max(0, eventsLimit - eventsUsed),
    blocked: eventsUsed >= eventsLimit,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

// ─── Admin API ───
// GET /api/admin/users?token=xxx
export async function handleAdminUsers(url: URL): Promise<Response> {
  const token = url.searchParams.get("token") || "";

  const userId = getUserIdByToken(token);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  // BUG-1 audit fix: the full user database + revenue stats are admin-only. Free and
  // regular users must never be able to enumerate the DB. Admin = user.role ===
  // "admin" OR email on the ADMIN_EMAILS allowlist.
  if (!isAdminUser(userId)) {
    return new Response(JSON.stringify({ error: "Forbidden — admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const users = getUsers();
  const subs = getSubscriptions();

  const userList = users.map(u => {
    const sub = subs.find(s => s.userId === u.id);
    return {
      id: u.id,
      email: u.email,
      tier: sub?.tier || "free",
      expires_at: sub?.expiresAt || null,
      created_at: u.createdAt,
    };
  });

  // Calculate revenue stats
  const proUsers = subs.filter(s => s.tier !== "free" && (s.expiresAt === null || new Date(s.expiresAt) > new Date()));
  const monthlySubs = proUsers.filter(s => s.tier === "pro_monthly");
  const annualSubs = proUsers.filter(s => s.tier === "pro_annual");

  return new Response(JSON.stringify({
    users: userList,
    stats: {
      total_users: users.length,
      pro_users: proUsers.length,
      monthly_subscribers: monthlySubs.length,
      annual_subscribers: annualSubs.length,
      estimated_mrr: (monthlySubs.length * 6.99) + (annualSubs.length * 49.99 / 12),
    },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Wikipedia Geosearch ───
export async function queryWikipedia(lat: number, lng: number, radius: number): Promise<any[]> {
  const cacheKey = `wiki:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=${Math.min(radius, 10000)}&gslimit=50&format=json`;

  try {
    const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10000) });
    const data: any = await resp.json();

    const pages = data?.query?.geosearch || [];
    const results: any[] = [];

    for (const page of pages.slice(0, 5)) {
      const title = page.title;
      const pageLat = page.lat;
      const pageLng = page.lon;

      let extract = "";
      try {
        const extUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(title)}&format=json`;
        const extResp = await fetch(extUrl, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
        const extData: any = await extResp.json();
        const pages = extData?.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          extract = pages[pageId]?.extract || "";
        }
      } catch {}

      if (!isDarkHistory(title + " " + extract)) continue;

      results.push({
        title,
        description: extract.substring(0, 500),
        lat: pageLat,
        lng: pageLng,
        category: categorizeByKeywords(title + " " + extract),
        year: extractYear(extract),
        source: "Wikipedia",
        source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
        confidence: "api",
      });
    }

    // Apply false-positive and pure memorial filters
    const wikiFiltered = results.filter((item: any) => {
      if (isFalsePositive(item.title, item.description)) return false;
      return true;
    });

    setCache(cacheKey, wikiFiltered);
    return wikiFiltered;
  } catch (err) {
    console.error("Wikipedia API error:", err);
    return [];
  }
}

// ─── OSM Overpass ───
export async function queryOSM(lat: number, lng: number, radius: number): Promise<any[]> {
  const cacheKey = `osm:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const radiusDeg = radius / 111320;
  const bbox = `${lat - radiusDeg},${lng - radiusDeg},${lat + radiusDeg},${lng + radiusDeg}`;

  const overpassQuery = `[out:json][timeout:15];
(
  node["amenity"="grave_yard"](${bbox});
  node["landuse"="cemetery"](${bbox});
  node["historic"="memorial"](${bbox});
  node["historic"="monument"](${bbox});
  node["historic"="battlefield"](${bbox});
  node["historic"="massacre"](${bbox});
  node["memorial"="war_memorial"](${bbox});
  node["historic"="prison"](${bbox});
  node["historic"="tomb"](${bbox});
  node["historic"="gallows"](${bbox});
  node["historic"="execution_site"](${bbox});
  node["historic"="disaster"](${bbox});
  node["memorial:type"="plaque"](${bbox});
  way["amenity"="grave_yard"](${bbox});
  way["landuse"="cemetery"](${bbox});
  way["historic"="memorial"](${bbox});
  way["historic"="monument"](${bbox});
  way["historic"="battlefield"](${bbox});
  way["historic"="massacre"](${bbox});
  way["memorial"="war_memorial"](${bbox});
  way["historic"="prison"](${bbox});
  way["historic"="tomb"](${bbox});
  way["historic"="gallows"](${bbox});
  way["historic"="execution_site"](${bbox});
  way["historic"="disaster"](${bbox});
  way["memorial:type"="plaque"](${bbox});
);
out center 10;`;

  try {
    const resp = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(15000),
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });
    const data: any = await resp.json();
    const elements = data?.elements || [];

    const results = elements.map((el: any) => {
      const elLat = el.lat || el.center?.lat || lat;
      const elLng = el.lon || el.center?.lon || lng;
      const tags = el.tags || {};
      const title = tags.name || `Unnamed ${tags.historic || tags.amenity || tags.landuse || "location"}`;
      const description = tags.description || tags.historic || tags.amenity || `${title} (${tags.landuse || tags.memorial || ""})`;

      let category = "historical";
      if (tags.amenity === "grave_yard" || tags.landuse === "cemetery") category = "cemetery";
      else if (tags.historic === "battlefield" || tags.historic === "massacre") category = "war_conflict";
      else if (tags.historic === "prison") category = "prison";
      else if (tags.historic === "memorial" || tags.memorial === "war_memorial") category = "memorial";

      return {
                  title,
                  description: description.substring(0, 500),
                  lat: elLat,
                  lng: elLng,
                  category,
                  year: 0,
                  source: "OpenStreetMap",
                  source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
                  confidence: "api",
                };
              });

              // Apply false-positive and pure memorial filters
              const filtered = results.filter((item: any) => {
                if (isFalsePositive(item.title, item.description)) return false;
                if (isPureMemorial(item.title, item.description, item.category)) return false;
                return true;
              });

              setCache(cacheKey, filtered);
              return filtered;
  } catch (err) {
    console.error("OSM Overpass API error:", err);
    return [];
  }
}

// ─── Wikidata SPARQL ───
export async function queryWikidata(lat: number, lng: number, radius: number): Promise<any[]> {
  const cacheKey = `wikidata:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const radiusKm = (radius / 1000).toFixed(1);

  const sparql = `
SELECT ?item ?itemLabel ?coord ?desc ?sitelink WHERE {
  {
    # Notable person deaths (original query)
    ?item wdt:P31 wd:Q5.
    ?item wdt:P625 ?coord.
    ?sitelink schema:about ?item;
               schema:isPartOf <https://en.wikipedia.org/>.
  } UNION {
    # Crimes, disasters, wars, executions, riots
    ?item wdt:P31 ?type.
    VALUES ?type { wd:Q132821 wd:Q8065 wd:Q178561 wd:Q188613 wd:Q350604 wd:Q5138447 wd:Q1332224 }
    ?item wdt:P625 ?coord.
    OPTIONAL { ?sitelink schema:about ?item;
               schema:isPartOf <https://en.wikipedia.org/>. }
  }
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:radius "${radiusKm}".
  }
  OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc)="en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 30
  `;

  try {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" }, signal: AbortSignal.timeout(10000) });
    const data: any = await resp.json();
    const bindings = data?.results?.bindings || [];

    const results: any[] = [];
    for (const b of bindings) {
      const title = b.itemLabel?.value || "Unknown";
      const description = b.desc?.value || "Notable person death location";
      const coordStr = b.coord?.value || "";
      const match = coordStr.match(/Point\(([\d.-]+)\s+([\d.-]+)\)/);
      const itemLat = match ? parseFloat(match[2]) : lat;
      const itemLng = match ? parseFloat(match[1]) : lng;
      const sitelink = b.sitelink?.value || "";

      if (!isDarkHistory(description)) continue;

      results.push({
        title,
        description: description.substring(0, 500),
        lat: itemLat,
        lng: itemLng,
        category: categorizeByKeywords(description),
        year: 0,
        source: "Wikidata",
        source_url: sitelink,
        confidence: "api",
      });
    }

    // Apply false-positive and pure memorial filters
    const wdFiltered = results.filter((item: any) => {
      if (isFalsePositive(item.title, item.description)) return false;
      return true;
    });

    setCache(cacheKey, wdFiltered);
    return wdFiltered;
  } catch (err) {
    console.error("Wikidata SPARQL error:", err);
    return [];
  }
}

// ─── News article category keywords ───
const NEWS_CATEGORY_KEYWORDS: Record<string, string[]> = {
  crime: ["murder", "homicide", "shooting", "stabbing", "killing", "assassination", "massacre", "serial killer", "arrest", "suspect", "convicted", "sentenced", "prison", "jail", "gang", "robbery", "manslaughter"],
  disaster: ["earthquake", "hurricane", "tornado", "tsunami", "flood", "wildfire", "explosion", "plane crash", "train derailment", "shipwreck", "collapse", "avalanche", "landslide", "volcanic", "severe weather", "emergency", "evacuation", "catastrophe"],
  death: ["fatal", "fatality", "deadly", "casualty", "victim", "tragedy", "death", "died"],
  war_conflict: ["war", "conflict", "airstrike", "military", "invasion", "ceasefire", "genocide", "atrocity", "terrorist", "terrorism", "hostage", "insurgency", "rebel", "bombing"],
  accident: ["accident", "crash", "collision", "derailment", "mishap", "chemical spill", "nuclear incident", "industrial accident"],
};

function classifyNewsArticle(title: string, snippet: string): string {
  const text = (title + " " + snippet).toLowerCase();
  let topCat = "general";
  let topScore = 0;
  for (const [cat, keywords] of Object.entries(NEWS_CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((sum, kw) => {
      const count = text.split(kw.toLowerCase()).length - 1;
      return sum + count;
    }, 0);
    if (score > topScore) { topScore = score; topCat = cat; }
  }
  return topScore > 0 ? topCat : "general";
}

// ─── GDELT News API fetch ───
async function fetchGDELTNews(lat: number, lng: number, radiusKm: number): Promise<any[]> {
  const cacheKey = `news:gdelt:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const allKeywords = Object.values(NEWS_CATEGORY_KEYWORDS).flat().slice(0, 15).join(" ");
  const query = encodeURIComponent(allKeywords);
  const timespan = "7d";
  const maxRecords = radiusKm > 100 ? 25 : 15;

  try {
    const resp = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&format=json&maxrecords=${maxRecords}&timespan=${timespan}&sort=datedesc`,
      { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) }
    );
    if (!resp.ok) return [];
    const data: any = await resp.json();
    const articles = data?.articles || data?.results || [];
    setCache(cacheKey, articles, 1800000); // 30 min cache
    return articles;
  } catch {
    return [];
  }
}

// ─── Mock news (fallback when GDELT unavailable) ───
function getMockNews(): any[] {
  return [
    { title: "Police Investigate Fatal Shooting in Downtown Area", source: "Local News", url: "#", snippet: "Authorities are investigating a fatal shooting that occurred late Tuesday night. One person was found deceased at the scene.", seendate: new Date(Date.now() - 86400000).toISOString().replace(/[-T:]/g, "").slice(0, 14) },
    { title: "3.2 Magnitude Earthquake Rattles Region", source: "National Geographic", url: "#", snippet: "A minor earthquake measuring 3.2 was recorded 15 miles northwest of the city center. No injuries reported.", seendate: new Date(Date.now() - 172800000).toISOString().replace(/[-T:]/g, "").slice(0, 14) },
    { title: "Wildfire Contained After Burning 500 Acres", source: "State Fire Authority", url: "#", snippet: "Fire crews fully contained a wildfire that burned approximately 500 acres over the weekend. Evacuation orders lifted.", seendate: new Date(Date.now() - 259200000).toISOString().replace(/[-T:]/g, "").slice(0, 14) },
    { title: "City Reports Spike in Property Crimes This Quarter", source: "City Police", url: "#", snippet: "Property crimes in the metropolitan area have increased 12% compared to the same quarter last year.", seendate: new Date(Date.now() - 345600000).toISOString().replace(/[-T:]/g, "").slice(0, 14) },
    { title: "Multi-Vehicle Collision on Interstate Causes Delays", source: "Traffic Authority", url: "#", snippet: "A multi-vehicle collision resulted in major traffic delays. Three reported injuries.", seendate: new Date(Date.now() - 432000000).toISOString().replace(/[-T:]/g, "").slice(0, 14) },
    { title: "Peace Talks Resume Between Warring Factions", source: "Intl News Wire", url: "#", snippet: "Diplomatic negotiations have resumed to end months of armed conflict that has displaced thousands.", seendate: new Date(Date.now() - 518400000).toISOString().replace(/[-T:]/g, "").slice(0, 14) },
    { title: "Building Collapse Investigation After Worker Injuries", source: "Construction Safety", url: "#", snippet: "Officials are investigating a partial building collapse at a construction site that left three workers injured.", seendate: new Date(Date.now() - 604800000).toISOString().replace(/[-T:]/g, "").slice(0, 14) },
  ];
}

function formatGDELTDate(seendate: string): string {
  if (!seendate || seendate.length < 8) return new Date().toISOString().split("T")[0];
  return `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`;
}

// ─── News endpoint handler ───
export async function handleNewsRequest(url: URL): Promise<Response> {
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const radius = parseInt(url.searchParams.get("radius") || "100", 10);

  if (isNaN(lat) || isNaN(lng)) {
    return new Response(JSON.stringify({ error: "Missing or invalid lat/lng parameters" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const gdeltArticles = await fetchGDELTNews(lat, lng, radius);
    const articles: any[] = [];

    for (const a of gdeltArticles) {
      const title = a.title || a.name || "";
      const snippet = a.snippet || a.description || a.seeding || "";
      const articleUrl = a.url || a.link || "";
      if (!title || !articleUrl) continue;
      const category = classifyNewsArticle(title, snippet);
      if (category === "general") continue;
      articles.push({
        title: title.slice(0, 200),
        source: a.sourcecountry || a.domain || "News",
        url: articleUrl,
        description: snippet.slice(0, 400),
        published_at: formatGDELTDate(a.seendate),
        category,
        relevance_score: 1,
      });
    }

    // Supplement with mock data if too few results
    if (articles.length < 3) {
      const usedCats = new Set(articles.map((a) => a.category));
      for (const m of getMockNews()) {
        const cat = classifyNewsArticle(m.title, m.snippet);
        if (cat !== "general" && !usedCats.has(cat)) {
          usedCats.add(cat);
          articles.push({
            title: m.title,
            source: m.source,
            url: "#",
            description: m.snippet.slice(0, 400),
            published_at: formatGDELTDate(m.seendate),
            category: cat,
            relevance_score: 0.8,
          });
        }
      }
    }

    const catOrder = ["crime", "disaster", "war_conflict", "accident", "death"];
    articles.sort((a, b) => {
      const aIdx = catOrder.indexOf(a.category);
      const bIdx = catOrder.indexOf(b.category);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return b.published_at.localeCompare(a.published_at);
    });

    return new Response(JSON.stringify({
      location: { lat, lng, radius_km: radius },
      total: articles.length,
      source: gdeltArticles.length > 0 ? "gdelt" : "supplemented",
      articles: articles.slice(0, 10),
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("News API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── Combined endpoint handler ───
export async function handleNearbyRequest(url: URL): Promise<Response> {
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const radius = parseInt(url.searchParams.get("radius") || "5000");
  const source = url.searchParams.get("source") || "all";

  if (isNaN(lat) || isNaN(lng)) {
    return new Response(JSON.stringify({ error: "Missing or invalid lat/lng parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // BUG-2 audit fix: server-side tier enforcement on the live-API feed. Pro (valid
  // token + non-free tier) gets unlimited results; anonymous/free callers get at most
  // 5 (the free-tier daily limit). An explicitly-present but invalid token is a 401.
  const token = url.searchParams.get("token") || "";
  const auth = resolveAuth(token);
  if (token && !auth.userId) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const isPro = auth.isPro;
  try {
    let results: any[] = [];

    if (source === "wikipedia" || source === "all") {
      const wiki = await queryWikipedia(lat, lng, radius);
      results = results.concat(wiki);
    }
    if (source === "osm" || source === "all") {
      const osm = await queryOSM(lat, lng, radius);
      results = results.concat(osm);
    }
    if (source === "wikidata" || source === "all") {
      const wd = await queryWikidata(lat, lng, radius);
      results = results.concat(wd);
    }

    const seen = new Set<string>();
    const deduped = results.filter((item) => {
      const key = `${item.title.substring(0, 30)}|${item.lat.toFixed(2)}|${item.lng.toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const sorted = deduped.sort((a, b) => {
      const distA = haversineKm(lat, lng, a.lat, a.lng);
      const distB = haversineKm(lat, lng, b.lat, b.lng);
      return distA - distB;
    });

    // Free/anonymous: only the nearest 5. Pro: unlimited.
    const finalResults = isPro ? sorted : sorted.slice(0, 5);
    return new Response(JSON.stringify({
      total: finalResults.length,
      limit_applied: isPro ? null : 5,
      results: finalResults.map((r) => ({ ...r, lat: Number(r.lat.toFixed(6)), lng: Number(r.lng.toFixed(6)) })),
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Nearby API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}