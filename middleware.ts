import { NextRequest, NextResponse } from 'next/server';

/**
 * Security middleware for /api/* routes.
 *
 * Rationale (CWE-1188 / denial-of-wallet):
 *   The /api routes drive third-party services (Vercel/E2B sandboxes, AI
 *   providers, Firecrawl) using the operator's API credentials. Without any
 *   gating, an unauthenticated attacker can freely create sandboxes, install
 *   npm packages, run commands, scrape URLs, and stream LLM tokens, all
 *   billed to the operator. This middleware adds three lightweight layers:
 *
 *     1. Same-origin / allow-list check on cross-site requests
 *     2. In-memory per-IP rate limiting
 *     3. Optional API key (header `x-api-key` or `Authorization: Bearer ...`)
 *
 * All limits are configurable via env vars and the middleware is intentionally
 * permissive in local-dev defaults so it does not break `pnpm dev`.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 30);

// Comma-separated list of additional allowed origins (e.g. for staging URLs).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// If set, requests must present this key via `x-api-key` or
// `Authorization: Bearer <key>`. If unset, no API key is required (preserves
// current local-dev UX) but rate limiting and origin checks still apply.
const APP_API_KEY = process.env.APP_API_KEY;

// Routes that should be reachable without auth (none today, but hook for future).
const PUBLIC_API_PATHS = new Set<string>([]);

// ---------------------------------------------------------------------------
// Rate limiter (in-memory, per-instance)
// ---------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

// Best-effort cleanup so the map does not grow unbounded.
function maybeSweep() {
  if (buckets.size < 1024) return;
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '127.0.0.1';
}

// ---------------------------------------------------------------------------
// Origin check
// ---------------------------------------------------------------------------

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  // Non-browser callers (curl, server-to-server) typically omit Origin/Referer.
  // Allow them through – they will still need the API key when APP_API_KEY is
  // configured. The Origin check exists primarily to defeat CSRF from
  // arbitrary websites in a logged-in user's browser.
  if (!origin && !referer) return true;

  const host = req.headers.get('host');
  const candidates = [
    host ? `http://${host}` : null,
    host ? `https://${host}` : null,
    ...ALLOWED_ORIGINS,
  ].filter(Boolean) as string[];

  const matches = (value: string | null) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return candidates.some((c) => {
        try {
          const cu = new URL(c);
          return cu.origin === u.origin;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  };

  return matches(origin) && matches(referer);
}

// ---------------------------------------------------------------------------
// API key check
// ---------------------------------------------------------------------------

function hasValidApiKey(req: NextRequest): boolean {
  if (!APP_API_KEY) return true; // not configured → not required
  const headerKey = req.headers.get('x-api-key');
  if (headerKey && timingSafeEqual(headerKey, APP_API_KEY)) return true;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return timingSafeEqual(auth.slice(7), APP_API_KEY);
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Middleware entrypoint
// ---------------------------------------------------------------------------

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API_PATHS.has(pathname)) return NextResponse.next();

  if (!isSameOrigin(req)) {
    return NextResponse.json(
      { error: 'Forbidden: cross-origin request blocked' },
      { status: 403 }
    );
  }

  const ip = clientIp(req);
  const { ok, retryAfter } = rateLimit(`${ip}:${pathname}`);
  maybeSweep();
  if (!ok) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Window': String(RATE_LIMIT_WINDOW_MS),
        },
      }
    );
  }

  if (!hasValidApiKey(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  // Apply only to API routes. Static assets and pages are unaffected.
  matcher: ['/api/:path*'],
};
