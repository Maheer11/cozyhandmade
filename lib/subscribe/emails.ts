// Signup emails (docs/DESIGN.md §8.1): one shell — orange header with the logo,
// a white card on cream, a footer — reused by the confirmation email, the
// "You're in" welcome and, later, restock emails.
//
// Built for email clients: table layout, 600px max, every style inline (most
// clients strip <style> and ignore flex/grid/transform), Arial/Helvetica
// fallback because web fonts rarely load, a "bulletproof" button (a coloured
// table cell, not an image), the logo as a hosted PNG with alt text, and a
// plain-text version of every email.

import { BUSINESS } from "@/lib/email";
import { socialLinks } from "@/lib/social-links";

const C = {
  cream: "#FBF0E4",
  brown: "#4D1808",
  burgundy: "#8B2035",
  orange: "#A74508",
  milk: "#F5F4F0",
  stone: "#7A6A62",
  line: "#E2DCD3",
  white: "#FFFFFF",
};
const SANS = "'DM Sans', Arial, Helvetica, sans-serif";
const HEAD = "'Fredoka', 'Arial Rounded MT Bold', Arial, Helvetica, sans-serif";

export interface EmailParts {
  subject: string;
  html: string;
  text: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface ShellParams {
  siteUrl: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  /** Paragraphs of plain text (escaped here). */
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Small grey line under the button, e.g. "This link expires in 48 hours." */
  note?: string;
  /** Plain-link fallback for the button, shown under a divider. */
  fallbackLink?: boolean;
  /** Last line of the card, e.g. "Didn't sign up? …" */
  closing?: string;
  /** Footer unsubscribe link (welcome/marketing emails only). */
  unsubscribeUrl?: string;
}

const P = `margin:0 0 16px 0;font-family:${SANS};font-size:16px;line-height:24px;color:${C.brown};`;

export function renderShell(p: ShellParams): { html: string; text: string } {
  const logo = `${p.siteUrl}/brand/email-logo.png`;
  const host = new URL(p.siteUrl).host.replace(/^www\./, "");

  const button = p.button
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 0 0;">
        <tr><td align="center" bgcolor="${C.burgundy}" style="border-radius:999px;background:${C.burgundy};">
          <a href="${esc(p.button.url)}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:${SANS};font-size:16px;line-height:20px;font-weight:bold;color:${C.milk};text-decoration:none;border-radius:999px;">${esc(p.button.label)}</a>
        </td></tr>
      </table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(p.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.cream};opacity:0;">${esc(p.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${C.cream}" style="background:${C.cream};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" bgcolor="${C.orange}" style="background:${C.orange};border-radius:24px 24px 0 0;padding:28px 24px;">
      <img src="${logo}" width="120" height="146" alt="Cozi Handmade" style="display:block;width:120px;height:auto;border:0;outline:none;text-decoration:none;color:${C.milk};font-family:${HEAD};font-size:24px;font-weight:bold;">
    </td></tr>
    <tr><td bgcolor="${C.white}" style="background:${C.white};border-radius:0 0 24px 24px;padding:36px 32px 32px 32px;">
      <p style="margin:0 0 10px 0;font-family:${SANS};font-size:12px;line-height:16px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${C.orange};">${esc(p.eyebrow)}</p>
      <h1 style="margin:0 0 18px 0;font-family:${HEAD};font-size:28px;line-height:34px;font-weight:bold;color:${C.brown};">${esc(p.heading)}</h1>
      ${p.paragraphs.map((t) => `<p style="${P}">${esc(t)}</p>`).join("\n      ")}
      ${button}
      ${p.note ? `<p style="margin:14px 0 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.stone};">${esc(p.note)}</p>` : ""}
      ${
        p.fallbackLink && p.button
          ? `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:28px 0 20px 0;"><tr><td style="border-top:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <p style="margin:0 0 6px 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.stone};">Button not working? Paste this link into your browser:</p>
      <p style="margin:0 0 20px 0;font-family:${SANS};font-size:13px;line-height:20px;word-break:break-all;"><a href="${esc(p.button.url)}" style="color:${C.burgundy};text-decoration:underline;">${esc(p.button.url)}</a></p>`
          : ""
      }
      ${p.closing ? `<p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.stone};">${esc(p.closing)}</p>` : ""}
    </td></tr>
    <tr><td align="center" style="padding:24px 16px 8px 16px;font-family:${SANS};font-size:12px;line-height:18px;color:${C.stone};">
      Handmade in Ireland &middot; <a href="${esc(p.siteUrl)}" style="color:${C.stone};text-decoration:underline;">${esc(host)}</a> &middot; <a href="${esc(socialLinks.instagram)}" style="color:${C.stone};text-decoration:underline;">Instagram</a><br>
      ${BUSINESS.addressLines.map(esc).join(", ")}<br>
      You&rsquo;re getting this because this email was entered at ${esc(host)}.${
        p.unsubscribeUrl
          ? `<br><a href="${esc(p.unsubscribeUrl)}" style="color:${C.stone};text-decoration:underline;">Unsubscribe</a>`
          : ""
      }
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    p.eyebrow.toUpperCase(),
    "",
    p.heading,
    "",
    ...p.paragraphs.flatMap((t) => [t, ""]),
    ...(p.button ? [`${p.button.label}: ${p.button.url}`, ""] : []),
    ...(p.note ? [p.note, ""] : []),
    ...(p.closing ? [p.closing, ""] : []),
    "—",
    `Handmade in Ireland · ${host} · Instagram: ${socialLinks.instagram}`,
    BUSINESS.addressLines.join(", "),
    `You're getting this because this email was entered at ${host}.`,
    ...(p.unsubscribeUrl ? [`Unsubscribe: ${p.unsubscribeUrl}`] : []),
  ].join("\n");

  return { html, text };
}

/** §8.1 — the double opt-in email. */
export function confirmationEmail(siteUrl: string, confirmUrl: string): EmailParts {
  const { html, text } = renderShell({
    siteUrl,
    preheader: "One tap and you'll hear about new pieces and restocks first.",
    eyebrow: "Private access",
    heading: "One tap and you're in.",
    paragraphs: [
      "Thanks for joining the Cozi circle. Confirm your email and you'll hear about new collections and restocks before anyone else.",
    ],
    button: { label: "Confirm my place", url: confirmUrl },
    note: "This link expires in 48 hours.",
    fallbackLink: true,
    closing: "Didn't sign up? Ignore this email. You won't be added to anything.",
  });
  return { subject: "Confirm your place in the Cozi circle", html, text };
}

/** Sent once the address is confirmed. */
export function welcomeEmail(siteUrl: string, unsubscribeUrl: string): EmailParts {
  const { html, text } = renderShell({
    siteUrl,
    preheader: "New pieces and restocks will reach you before anyone else.",
    eyebrow: "You're in",
    heading: "Welcome to the Cozi circle.",
    paragraphs: [
      "Your place is confirmed. When a new collection lands or a favourite comes back in stock, you'll hear first.",
    ],
    button: { label: "Enter the shop", url: siteUrl },
    unsubscribeUrl,
  });
  return { subject: "You're in: welcome to the Cozi circle", html, text };
}
