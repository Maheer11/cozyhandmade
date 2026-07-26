import Stripe from "stripe";
import { getStripeSecretKey } from "./env";

// Module-level singleton — safe to share across requests, unlike the
// per-request cookie-bound Supabase server client (see lib/supabase/server.ts).
export const stripe = new Stripe(getStripeSecretKey());
