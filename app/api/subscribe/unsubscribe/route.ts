import { NextResponse } from "next/server";
import { realDeps, siteUrlFrom, unsubscribe, SubscribeUnavailable } from "@/lib/subscribe/service";

// Unsubscribe by token. Used by:
//  - the button on /subscribe/unsubscribe (a form POST, then a redirect back),
//  - RFC 8058 one-click "Unsubscribe" in Gmail/Apple Mail (POST with
//    body List-Unsubscribe=One-Click and the token in the URL).
// A POST, never a GET, so link scanners that open URLs in emails can't
// unsubscribe anyone by accident.

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token: unknown = url.searchParams.get("token");
  let fromForm = false;

  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const formToken = form?.get("token");
    if (typeof formToken === "string") {
      token = formToken;
      fromForm = form?.get("List-Unsubscribe") !== "One-Click";
    }
  }

  let kind: "unsubscribed" | "invalid" | "error";
  try {
    kind = (await unsubscribe(token, realDeps(siteUrlFrom(request)))).kind;
  } catch (err) {
    if (!(err instanceof SubscribeUnavailable)) console.error("Subscribe: unsubscribe threw:", err);
    kind = "error";
  }

  if (fromForm) {
    // Back to the page, which shows the outcome.
    const back = new URL("/subscribe/unsubscribe", url.origin);
    back.searchParams.set("done", kind);
    return NextResponse.redirect(back, 303);
  }
  return NextResponse.json({ ok: kind === "unsubscribed" }, { status: kind === "error" ? 503 : kind === "invalid" ? 404 : 200 });
}
