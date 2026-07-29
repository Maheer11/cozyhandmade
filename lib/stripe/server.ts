import Stripe from "stripe";
import { getStripeSecretKey } from "./env";

// Module-level singleton — safe to share across requests, unlike the
// per-request cookie-bound Supabase server client (see lib/supabase/server.ts).
// Constructed lazily: `next build` imports route modules to collect page data,
// so a top-level `new Stripe(...)` made the build require a runtime secret.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeSecretKey());
  }
  return _stripe;
}
