import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import SubscribePanel, { MILK_BUTTON } from "@/components/subscribe/SubscribePanel";
import NewLinkForm from "@/components/subscribe/NewLinkForm";
import { confirmSignup, realDeps, SubscribeUnavailable, type ConfirmResult } from "@/lib/subscribe/service";

// The link in the confirmation email lands here (docs/DESIGN.md §8, step 5).
export const metadata: Metadata = {
  title: "Confirm your place | Cozi Handmade",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  let result: ConfirmResult;
  try {
    result = await confirmSignup(typeof token === "string" ? token : undefined, realDeps(await siteUrl()));
  } catch (err) {
    if (!(err instanceof SubscribeUnavailable)) console.error("Subscribe: confirm threw:", err);
    result = { kind: "error" };
  }

  switch (result.kind) {
    case "confirmed":
      return (
        <SubscribePanel eyebrow="You're in" title="Welcome to the Cozi circle." icon="check">
          <p className="type-body text-milk">
            Your place is confirmed. New collections and restocks will reach you before anyone else.
          </p>
          <Link href="/" className={`${MILK_BUTTON} mt-7`}>
            Enter the shop
          </Link>
        </SubscribePanel>
      );
    case "expired":
      return (
        <SubscribePanel eyebrow="Link expired" title="This link has expired." icon="info">
          <p className="type-body text-milk">
            Confirmation links last 48 hours. Send yourself a fresh one and you&apos;ll be in with one tap.
          </p>
          <NewLinkForm defaultEmail={result.email} />
        </SubscribePanel>
      );
    case "blocked":
      return (
        <SubscribePanel eyebrow="Your choice stands" title="You unsubscribed earlier." icon="info">
          <p className="type-body text-milk">
            To respect that, we don&apos;t add you back automatically. If you&apos;d like our emails again, message us
            and we&apos;ll set it up.
          </p>
          <Link href="/" className={`${MILK_BUTTON} mt-7`}>
            Enter the shop
          </Link>
        </SubscribePanel>
      );
    case "error":
      return (
        <SubscribePanel eyebrow="Almost there" title="We couldn't confirm that just now." icon="info">
          <p className="type-body text-milk">
            Something went wrong on our side. Your link still works: please try it again in a few minutes.
          </p>
          <Link href="/" className={`${MILK_BUTTON} mt-7`}>
            Enter the shop
          </Link>
        </SubscribePanel>
      );
    default:
      return (
        <SubscribePanel eyebrow="Link used" title="This link has already been used." icon="info">
          <p className="type-body text-milk">
            If you&apos;ve already confirmed, you&apos;re in and there&apos;s nothing more to do. Otherwise, send
            yourself a new link.
          </p>
          <NewLinkForm />
        </SubscribePanel>
      );
  }
}
