import { assertStripeTestKey, assertTestSupabaseUrl, resolveDevServerEnv } from "./safety";

// Runs once before any e2e test. The browser drives a separately started
// dev server, so this checks the env files *that server* reads — not just
// .env.test — and refuses to start if they point anywhere but test infra.
export default function globalSetup() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run e2e tests in a production environment.");
  }

  const cwd = process.cwd();
  const supabaseUrl = resolveDevServerEnv("NEXT_PUBLIC_SUPABASE_URL", cwd);
  assertTestSupabaseUrl(supabaseUrl, process.env.E2E_SUPABASE_TEST_REF);

  for (const key of ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"]) {
    assertStripeTestKey(key, resolveDevServerEnv(key, cwd));
  }
}
