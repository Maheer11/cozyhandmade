import type { Metadata } from "next";
import Link from "next/link";
import SubscribePanel, { MILK_BUTTON } from "@/components/subscribe/SubscribePanel";

// Unsubscribe link from our emails (docs/DESIGN.md §8, step 7). Opening the
// page does nothing on its own: the button POSTs to /api/subscribe/unsubscribe,
// so mail scanners that open links can't unsubscribe anyone.
export const metadata: Metadata = {
  title: "Unsubscribe | Cozi Handmade",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token, done } = await searchParams;

  if (done === "unsubscribed") {
    return (
      <SubscribePanel eyebrow="Unsubscribed" title="You won't hear from us again." icon="check">
        <p className="type-body text-milk">
          You&apos;ve been removed from Cozi&apos;s collection and restock emails. Order emails still arrive as usual.
        </p>
        <Link href="/" className={`${MILK_BUTTON} mt-7`}>
          Enter the shop
        </Link>
      </SubscribePanel>
    );
  }
  if (done === "invalid" || (done === undefined && typeof token !== "string")) {
    return (
      <SubscribePanel eyebrow="Unsubscribe" title="This link isn't valid." icon="info">
        <p className="type-body text-milk">
          It may be incomplete or from an old email. Every Cozi email has an unsubscribe link at the bottom; try the
          newest one.
        </p>
        <Link href="/" className={`${MILK_BUTTON} mt-7`}>
          Enter the shop
        </Link>
      </SubscribePanel>
    );
  }
  if (done === "error") {
    return (
      <SubscribePanel eyebrow="Unsubscribe" title="That didn't go through." icon="info">
        <p className="type-body text-milk">Something went wrong on our side. Please try the link again in a few minutes.</p>
        <Link href="/" className={`${MILK_BUTTON} mt-7`}>
          Enter the shop
        </Link>
      </SubscribePanel>
    );
  }

  return (
    <SubscribePanel eyebrow="Unsubscribe" title="Stop collection and restock emails?" icon="mail">
      <p className="type-body text-milk">You can join again any time from our homepage.</p>
      <form method="post" action="/api/subscribe/unsubscribe" className="mt-7">
        <input type="hidden" name="token" value={typeof token === "string" ? token : ""} />
        <button type="submit" className={MILK_BUTTON}>
          Unsubscribe
        </button>
      </form>
      <Link href="/" className="focus-ring mt-4 inline-flex min-h-11 items-center rounded-pill font-body text-sm font-semibold text-milk">
        Keep me subscribed <span aria-hidden="true" className="ml-1">→</span>
      </Link>
    </SubscribePanel>
  );
}
