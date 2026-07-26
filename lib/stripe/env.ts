// Hard guard so live Stripe keys can never be exercised outside production —
// by an automated test run, a local `npm run dev`, or a misconfigured
// preview deploy. Import this (not process.env directly) anywhere a Stripe
// key is read.

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (process.env.NODE_ENV !== "production" && !key.startsWith("sk_test_")) {
    throw new Error(
      "Refusing to use a non-test-mode Stripe secret key outside production. " +
      "Set STRIPE_SECRET_KEY to a sk_test_... key for local dev and tests."
    );
  }
  return key;
}

export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
  }
  if (process.env.NODE_ENV !== "production" && !key.startsWith("pk_test_")) {
    throw new Error(
      "Refusing to use a non-test-mode Stripe publishable key outside production. " +
      "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to a pk_test_... key for local dev and tests."
    );
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return secret;
}
