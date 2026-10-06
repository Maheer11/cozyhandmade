// Shared by the integration tests that drive app/api/checkout/intent against
// real Stripe TEST mode + the test Supabase project.
//
// These tests pay as a signed-in customer (guests can pay too), and
// orders.user_id references profiles, so they need a real account in the TEST project: put its
// auth user id in .env.test as TEST_CHECKOUT_USER_ID. Each test file mocks
// "@/lib/supabase/server" to return that user (there's no browser cookie
// here to sign in with).

import type { SupabaseClient } from "@supabase/supabase-js";
import { hasLiveTestCredentials } from "../../setup/testEnv";
import { calculateShipping } from "@/lib/checkout/shipping";

export const TEST_USER_ID = process.env.TEST_CHECKOUT_USER_ID;
export const canRunCheckoutIntegration = hasLiveTestCredentials && Boolean(TEST_USER_ID);

export const IRISH_ADDRESS = { firstName: "Test", lastName: "Buyer", email: "test@example.com", country: "IE", city: "Cork", postcode: "T12 X1Y2" };

export async function adminDb(): Promise<SupabaseClient> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient() as unknown as SupabaseClient;
}

/** Test fixtures have no shipping_weight_grams, so this is the default-weight Irish rate. */
export function irishShippingFor(quantity: number): number {
  return calculateShipping([{ quantity, shippingWeightGrams: null }], "IE").priceEUR;
}

export function intentRequest(body: {
  items: Array<{ product_id: string; product_name: string; quantity: number; unit_price?: number }>;
  expected_total_cents: number;
  attempt_id?: string;
  delivery_address?: Record<string, string>;
}): Request {
  return new Request("http://localhost/api/checkout/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attempt_id: body.attempt_id ?? crypto.randomUUID(),
      items: body.items.map((i) => ({ product_image: null, source: "product", unit_price: 0, ...i })),
      delivery_address: body.delivery_address ?? IRISH_ADDRESS,
      delivery_method: "courier",
      expected_total_cents: body.expected_total_cents,
    }),
  });
}
