// Pure guard logic shared by playwright.config.ts, the e2e global setup and
// the network-allowlist fixture. Kept free of Playwright imports so the
// rules themselves are unit-tested in tests/unit/e2e-safety.test.ts.

import fs from "fs";
import path from "path";
import { parse } from "dotenv";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Guard 1: the browser may only be pointed at a local dev server unless the
// caller explicitly opts in (e.g. a known staging preview).
export function assertSafeBaseURL(baseURL: string, allowRemote: boolean): void {
  const { hostname } = new URL(baseURL);
  if (LOCAL_HOSTNAMES.has(hostname) || allowRemote) return;
  throw new Error(
    `Refusing to run e2e tests against ${baseURL}. Only localhost is allowed by default. ` +
    `If this is a non-production preview, set E2E_ALLOW_REMOTE_BASE_URL=1 to opt in.`
  );
}

// Guard 2: work out which Supabase URL the dev server will actually use,
// following Next's documented load order for NODE_ENV=development
// (.env.development.local > .env.local > .env.development > .env).
const DEV_SERVER_ENV_FILES = [".env.development.local", ".env.local", ".env.development", ".env"];

export function resolveDevServerEnv(key: string, cwd: string): string | undefined {
  for (const file of DEV_SERVER_ENV_FILES) {
    const fullPath = path.join(cwd, file);
    if (!fs.existsSync(fullPath)) continue;
    const value = parse(fs.readFileSync(fullPath))[key];
    if (value) return value;
  }
  return undefined;
}

// Allowlist, not blocklist: the URL must be the named test project (or a
// local Supabase stack), so an unknown project can never slip through.
export function assertTestSupabaseUrl(url: string | undefined, testRef: string | undefined): void {
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set for the dev server — e2e needs a test Supabase project.");
  }
  const { hostname } = new URL(url);
  if (LOCAL_HOSTNAMES.has(hostname)) return;
  if (!testRef) {
    throw new Error(
      "E2E_SUPABASE_TEST_REF is not set. Add your TEST project's ref to .env.test " +
      "so e2e can confirm the dev server is not pointed at production."
    );
  }
  if (hostname !== `${testRef}.supabase.co`) {
    throw new Error(
      `Dev server's NEXT_PUBLIC_SUPABASE_URL (${hostname}) is not the test project ` +
      `(${testRef}.supabase.co). Refusing to run e2e — this may be production.`
    );
  }
}

export function assertStripeTestKey(name: string, value: string | undefined): void {
  if (value && !value.includes("_test_")) {
    throw new Error(`${name} does not look like a Stripe TEST-mode key — refusing to run e2e with it.`);
  }
}

// Guard 3: which hosts the browser may talk to during a test.
const STRIPE_HOST_SUFFIXES = ["stripe.com", "stripe.network", "hcaptcha.com"];

export function isAllowedHost(
  hostname: string,
  opts: { baseHost: string; supabaseHost?: string; extraHosts?: string[] }
): boolean {
  if (hostname === opts.baseHost || LOCAL_HOSTNAMES.has(hostname)) return true;
  if (opts.supabaseHost && hostname === opts.supabaseHost) return true;
  if (opts.extraHosts?.includes(hostname)) return true;
  return STRIPE_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
}
