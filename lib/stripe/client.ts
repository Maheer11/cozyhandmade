import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { getStripePublishableKey } from "./env";

let stripePromise: Promise<Stripe | null> | null = null;

// Lazily loaded (not at module scope) so the key guard only throws when a
// checkout flow actually needs Stripe, not on every page load.
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(getStripePublishableKey());
  }
  return stripePromise;
}
