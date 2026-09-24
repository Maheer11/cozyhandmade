import { test as base, expect } from "@playwright/test";
import { isAllowedHost, resolveDevServerEnv } from "./safety";

// Import `test` from here, not "@playwright/test", in every e2e spec. It
// wraps the browser context so any request to a host outside the allowlist
// is aborted, and the test fails listing what was blocked — surfacing
// calls to live services nobody knew the app was making.
export const test = base.extend<{ networkAllowlist: void }>({
  networkAllowlist: [
    async ({ context, baseURL }, use) => {
      const supabaseUrl = resolveDevServerEnv("NEXT_PUBLIC_SUPABASE_URL", process.cwd());
      const opts = {
        baseHost: new URL(baseURL!).hostname,
        supabaseHost: supabaseUrl ? new URL(supabaseUrl).hostname : undefined,
        extraHosts: process.env.E2E_EXTRA_ALLOWED_HOSTS?.split(",").map((h) => h.trim()).filter(Boolean),
      };
      const blocked: string[] = [];

      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        // data:/blob: URLs never leave the machine.
        if (url.protocol === "data:" || url.protocol === "blob:" || isAllowedHost(url.hostname, opts)) {
          return route.continue();
        }
        blocked.push(url.origin);
        return route.abort("blockedbyclient");
      });

      await use();

      expect(
        [...new Set(blocked)],
        "Browser tried to reach hosts outside the e2e allowlist (add to E2E_EXTRA_ALLOWED_HOSTS only if they are safe test services)"
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
