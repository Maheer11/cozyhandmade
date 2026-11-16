# Cozi Handmade — Design System

Source of truth for the redesign, the private access intro and the email
signup flow (sections 2–8 of the owner's brief, 2026-11-15). This replaces the
earlier version of this file.

- The Figma screens in `design/reference/` use an OLD palette (burnt-orange
  buttons and header, off-white #F5F4F0 page). Where any screenshot and this
  file disagree, THIS FILE WINS. The intro and email screenshots are current
  and correct.
- `design/reference/` is reference only: never import it into the app.
- Redesign work is VISUAL ONLY: do not change checkout, cart, stock, pricing,
  auth, Stripe, Supabase queries, server actions, API routes or migrations,
  except the new signup backend in section 8. The local env points at the
  PRODUCTION Supabase project: write migration files only, never apply them.

## 2. Colour tokens (exact values; CSS variables + Tailwind theme)

| Token | Hex | Role |
|---|---|---|
| cream | #FBF0E4 | Page background, header, drawer (~60%) |
| brown | #4D1808 | Text, logo on cream, footer, selected chips, dark blocks (~30%) |
| burgundy | #8B2035 | PRIMARY BUTTONS on cream/white, active nav tab, text links |
| burgundy-dark | #6E1829 | Button hover/pressed |
| orange | #A74508 | Hero block, intro panel, "Only X left" badge, brand moments; never a button colour |
| rust | #88290B | Logo colourway only |
| milk | #F5F4F0 | Logo off-white; text and buttons on orange or brown blocks |
| peach | #F7D9C0 | Soft cards, eyebrow text on brown (NOT on orange: see rules) |
| stone | #7A6A62 | Secondary text |
| line | #E2DCD3 | Borders, dividers |
| white | #FFFFFF | Cards, inputs |
| success | #2F6B3A | Success text |
| error | #B3261E | Error text and borders |

Rules:
- Never put a burgundy button on an orange or brown block. There, buttons are
  milk with brown text.
- All text passes WCAG AA (4.5:1 body, 3:1 large). No reduced-opacity small text
  on orange.
- Peach on orange is 4.47:1, just under AA, so small text on orange
  (eyebrows included) is MILK (5.46:1), never peach. Peach stays fine on brown
  (10.79:1) and as a non-text shape (e.g. the intro's mail-icon circle).
  Owner's decision, 2026-11-15; overrides the intro screenshots. Fix existing failures: the faint pink "Currency" and "MORE" labels
  in the mobile drawer.
- No gradients or shimmer on buttons (remove the shimmer on "Shop the Collection").

## 3. Typography, spacing, shape

- Headings: Fredoka (Medium/SemiBold). Body, prices, UI: DM Sans. Load with the
  framework's font optimisation (next/font) with fallbacks.
- Scale (mobile → desktop): Display 40/44 → 64/68; H1 32/38 → 44/50;
  H2 24/30 → 32/38; H3 18/24; Body 16/24; Small 14/20; Caption 12/16;
  Eyebrow 12/16 uppercase, letter-spacing 0.3em, DM Sans SemiBold.
- Spacing: 4px base; steps 4 8 12 16 20 24 32 48 64 96.
- Radius: 8 small, 16 inputs/tiles, 24 cards/images, 32 feature blocks,
  pill for buttons/chips/badges. Exception: the intro's JOIN button uses radius 8.
- Shadows: soft and warm only (rgba(77,24,8,0.08) 0 4px 16px).
- Touch targets ≥ 44px; buttons min-height 48px.

## 4. Components (build once, reuse everywhere)

Button (primary burgundy / secondary brown outline / on-dark milk / disabled),
Badge (Handmade peach, Low stock orange, Sold out brown), ProductCard (4:5
image, radius 24, name wraps to 2 lines then truncates, price; the WHOLE CARD
is the link; remove per-card "Choose options" / "+ Add to bag" buttons),
Chip (selected = brown), SectionHeader (eyebrow + H2 + "See all →"),
Input (label above; default / focus brown 2px / error red 2px + fix-it text),
CartLineItem, Accordion, SizeSelector, QuantityStepper, Header, BottomNav,
Footer, Drawer menu.

## 5. Page layouts

Mobile design width 390, 16px side padding. Desktop 1440, max content width
1200, 32px gutters. Breakpoints: sm 640, md 768, lg 1024, xl 1280.

- Header. Mobile: cream, menu left, logo centre, search + bag (count) right,
  1px bottom line, sticky. Desktop: logo left, inline nav (Shop, Collections,
  Featured, Custom order), search, account, bag; no bottom nav.
- Home (reference order): dark trust strip → header → hero → shop by category
  → in stock now → featured pieces → story (peach card) → custom order (brown
  card) → newsletter → footer. Hero: orange block, rounded bottom (32), eyebrow,
  Display heading, intro copy, product image + price pill, milk primary + milk
  outline buttons. Desktop hero: two columns. Product grids: 2 cols mobile,
  3 at md, 4 at lg.
- **Mobile hero (owner's decision, 2026-11-15, overrides the hero line above
  below lg):** NO written copy (no eyebrow, heading or intro; the H1 stays
  sr-only for screen readers and SEO). Order: product search bar
  (components/home/MobileProductSearch) → components/home/HeroMobileCarousel,
  modelled on the owner's second reference (2026-11-15): a one-line 24px
  Fredoka title "**Cozi Handmade** in Ireland" (SemiBold milk + Light peach;
  peach is only allowed on orange because 24px is large text, 4.47:1 ≥ 3:1)
  → sideways-scrolling category tabs
  ("All" + categories with in-stock pieces; selected = milk) → centre-focus
  carousel (one large 3:4 card centred, neighbours peeking in smaller; white
  price pill top-left; heart + like count top-right; name in Fredoka + the
  category on a dark fade at the bottom) → dots → milk buttons. The carousel
  NEVER moves on its own (swipe, tap a side card, or the dots). Price IS shown
  (owner reversed the earlier name-only rule). Desktop keeps the full copy
  and the single-photo carousel.
- **Likes:** one per device (random device id in the browser, no personal
  data), stored in `public.product_likes` (migration 017, service-role only)
  via POST /api/likes; counts are shown on the card. Mobile hero only.
- Product: breadcrumb, swipeable gallery + thumbnails (desktop: gallery 60%
  left, sticky details 40% right), eyebrow category, H1, price + stock badge,
  description, size selector, peach trust tiles, accordion, "You might also
  love". Mobile: sticky buy bar (stepper + "Add to bag · €price").
- Cart: line items, gift-wrap option, summary card, burgundy "Checkout
  securely", "Continue shopping", designed empty state. Desktop: items left,
  sticky summary right.
- Checkout: slim header (back, logo, "Secure"), collapsible summary, steps
  Contact → Delivery → Address → Payment, guest first, sign-in optional.
  Style the Stripe Payment Element only via Stripe's Appearance API
  (colorPrimary #8B2035, colorText #4D1808, colorBackground #FFFFFF,
  borderRadius 16px, DM Sans). Do not touch payment logic.
- Bottom nav (mobile only): Home, Shop, Bag, Chat; active = burgundy.
- Drawer: new tokens; fix the bug where "Featured Pieces" is clipped behind
  the "Join the Cozi family" card.
- Apply the system to every other page (shop, FAQs, account, auth, order
  confirmation) even without a reference screenshot.

## 6. Logo system

- The supplied logos (`public/brand/`) are JPEGs with a baked-in blur shadow.
  Produce a clean SVG of the "cozi." mark and "HANDMADE" wordmark: each letter
  its own path, colours via CSS variables/currentColor. Show it beside the
  original before using it anywhere.
- Lockups: stacked (hero/about), horizontal one-line "cozi.", "c."
  monogram (favicon, apple-touch-icon, social).
- **Site logo (owner's decision, 2026-11-15, overrides the brief):** the
  header, mobile drawer, footer and checkout header keep the stacked
  "co / zi." mark with the colour wave (`components/brand/AnimatedCoziLogo`),
  exactly as it was before this brief: header 48px tall on phones, 64px from
  lg; footer uses the brown colour set; reduced motion shows the static logo.
  Do NOT swap it for the horizontal lockup. The horizontal SVG stays available
  but unused.

**6b as built (owner's pick, 2026-11-15): concept 1 "Pebble morph" + a static
scattered pattern of faint logos.** `components/brand/PebbleLogo.tsx`: the
"co / zi." mark on a pebble that morphs between three blob outlines while the
colours step milk-on-orange → rust-on-milk → brown-on-milk; 3 × 12s, then rests
on the primary colourway. Behind it, a static pattern of faint "co / zi." and
"c." marks (milk ~10% on brown/orange, brown ~7% on cream). SVG SMIL, no
library; starts after load; pauses off-screen / hidden tab; pause button while
running (WCAG 2.2.2); reduced motion = static. Placed in: the "Private access"
intro media block (colour mode only; a photo replaces it) and above "Join the
Circle" in the newsletter section.

### 6b. Animated hero logo: PROPOSE FIRST, DO NOT BUILD

Give at least 5 advanced concepts in which all three colourways and the logo's
soft blob shapes live together (e.g. morphing pebble outline with colourway
cycle; three overlapping stones that orbit and resolve into the mark; a yarn
stroke that "knits" into the letters; hero logo that shrinks into the header
on scroll; letters dropping in with spring physics and a colour wave). For
each: description, technique/library (prefer CSS + SVG; justify any
dependency), effect on LCP and mobile performance, accessibility plan, effort
in hours, risks. Recommend one, then WAIT.

Whatever is picked: respects prefers-reduced-motion (static logo), never
delays first render or shifts layout, pauses off-screen, never in
header/cart/checkout, accessible name "Cozi Handmade", animation layers
aria-hidden. (This is about a NEW hero logo animation; it does not replace
the existing colour-wave logo in the header/drawer/footer/checkout, see
section 6.)

## 7. Private access intro

A skippable full-screen intro shown on the FIRST visit to the homepage only.
It is an overlay, never a gate: the store renders underneath and in the HTML.
Match `design/reference/intro-*.png` exactly.

### 7.1 Content (exact copy)

- Logo top-left ("cozi." + HANDMADE, milk).
- Eyebrow: PRIVATE ACCESS (milk #F5F4F0; the screenshots show peach, which
  fails AA on orange, see section 2).
- Heading: "Made by hand." / "Seen first by you." (Fredoka, milk).
- Body: "New pieces and restocks reach our circle before anyone else."
- Email field: underline style, milk 1.5px bottom border, placeholder
  "Your email", visually hidden label "Email address".
- Button: JOIN PRIVATE ACCESS (milk bg, brown text, radius 8, full width).
- Consent (full-strength milk): "Get new collections and restock news from
  Cozi. Unsubscribe anytime." + privacy policy link (no privacy page exists
  yet; ask the owner where it should point).
- "Enter the shop →" always visible (mobile also shows "Skip →" top-right).
- Success state: mail icon in peach circle, eyebrow ALMOST THERE, heading
  "Check your inbox to confirm your place.", "We sent a link to {email}…",
  "Nothing arrived? Check spam, or send it again.", milk ENTER THE SHOP button.
- Error state: inline message under the field, field keeps its value.
- Already-subscribed email: show the same success state (never reveal whether
  an email is on the list).

### 7.2 Layout: every device and orientation

- ≥ 1024px: orange (#A74508) content panel left, ~43% wide (max 620px),
  48–72px padding, logo top, form centred vertically, "Enter the shop" bottom;
  media block fills the right side.
- 768–1023px: media block top (~50% height), orange panel below with 32px
  rounded top corners overlapping the media by 32px, centred column max 480px.
- ≤ 767px: media block top (~40% height, min 220, max 360px), orange panel
  below with 28px rounded top corners overlapping by 28px.
- ≤ 374px: heading drops to H1 size, max 3 lines.
- ≥ 1920px: text column capped; media fills its side without stretching.
- Use 100dvh with a 100vh fallback; respect env(safe-area-inset-*).
- Short screens (landscape phones, < 500px tall): hide the media block; the
  panel scrolls inside the dialog; button and "Enter the shop" always reachable.
- On-screen keyboard must not hide the field or button.
- Readable at 200% zoom and with large system text. Hover styles only under
  @media (hover: hover). Works in Safari iOS, Chrome Android, Samsung Internet,
  desktop Chrome/Safari/Firefox/Edge.

### 7.3 Media block: colour now, image later

`config/intro.ts`, typed and commented:

```ts
export const introMedia = {
  mode: "colour",            // "colour" | "image"
  colour: "#4D1808",         // used in colour mode and as the fallback
  image: {
    desktop: "",             // landscape crop URL (Cloudinary)
    mobile: "",              // portrait crop URL (Cloudinary)
    alt: "",                 // required in image mode
    focalPoint: "center",
  },
  version: 1,                // bump to show the intro again to everyone
};
```

- Launch in colour mode. Image mode swaps ONLY the media block.
- Mobile URL below 768px, desktop above (art direction, correct sizes; phones
  never download the desktop image). Cloudinary f_auto, q_auto.
- Image fails or URL empty → colour fallback, no broken icon, no layout shift.
- Image mode with empty alt fails typecheck/build.
- Media block size reserved before load (CLS 0 in both modes).

**Switching to a photo** (full steps are at the top of `config/intro.ts`):
1. Upload a landscape crop (tablet/desktop) and a portrait crop (phones) to
   Cloudinary and paste both URLs into `introMedia.image`. `f_auto,q_auto` is
   added automatically.
2. Write `image.alt` (what the photo shows). The build fails in image mode
   while it is empty.
3. Set `mode: "image"`. Optional: `focalPoint` (CSS object-position).
4. To show the intro again to everyone, bump `version`.
Phones only download the portrait crop (`<picture>` art direction). A missing
or broken URL falls back to `colour` with no broken icon and no layout shift.

### 7.4 Behaviour

- Only on "/". Never on product, collection, cart, checkout, account,
  /subscribe/* or any deep link.
- Once per visitor: localStorage key `cozi_intro_v{version}`, set on close or
  successful signup; all storage access in try/catch.
- Decide before first paint (no flash of store then overlay); no layout shift.
- role="dialog", aria-modal, labelled by the heading; focus moves in and is
  trapped; Esc and "Enter the shop" close it; focus returns; body scroll locked.
- Entrance: fade/rise ≤ 400ms; none under prefers-reduced-motion.

## 8. Signup backend and email flow

Resend account facts (as given by the owner on 2026-11-15; confirm against the
API, do not change any of them without asking):
- Verified sending domain: `orders.cozihandmade.com` (eu-west-1). The root
  domain cozihandmade.com is NOT verified. All emails must send from an
  address on orders.cozihandmade.com. Proposed sender:
  "Cozi Handmade <hello@orders.cozihandmade.com>"; confirm with the owner first.
- Resend calls contact lists "Segments". Existing segments: "cozi newsletter"
  (id 0acd06c3-1784-4caf-8cdf-929152878438) and "General" (default).
  Use "cozi newsletter" as the ONE subscriber list. Do not create another.
- No Topics exist yet. Propose whether Topics are needed (e.g. "New
  collections", "Restock alerts") for unsubscribe preferences; do not create
  them.
- One API key exists ("cozihandmade-prod"). It must be able to create and
  update contacts and add them to a segment (full access), not only send. If it
  cannot, stop and tell the owner. Never create, rotate or delete API keys.
- Segment ID and sender address live in env vars (e.g. RESEND_SEGMENT_ID,
  EMAIL_FROM), not hard-coded. Reuse the existing Resend client and env vars;
  never print secret values; no other email library without asking.

**As built (2026-11-15).** Sender: "Cozi Handmade <studio@orders.cozihandmade.com>"
(owner's choice). No Topics. Code: `lib/subscribe/*`, `app/api/subscribe`,
`app/api/subscribe/unsubscribe` (also RFC 8058 one-click), `app/api/webhooks/resend`,
`app/subscribe/confirm`, `app/subscribe/unsubscribe`. Old `/api/newsletter`
(direct-to-Resend, no confirmation) removed.

Server env vars (`.env.local` and Vercel; never commit values):
- `EMAIL_FROM` — `Cozi Handmade <studio@orders.cozihandmade.com>`
- `RESEND_SEGMENT_ID` — `0acd06c3-1784-4caf-8cdf-929152878438` ("cozi newsletter")
- `RESEND_CONTACTS_API_KEY` — full-access key (falls back to `RESEND_API_KEY`)
- `RESEND_WEBHOOK_SECRET` — signing secret of the Resend webhook
  (endpoint `/api/webhooks/resend`, events `contact.updated`, `contact.deleted`)
- `NEXT_PUBLIC_SITE_URL` — e.g. `https://cozihandmade.com` (links in emails)
Database: migration `018_subscribers.sql` (and `017_product_likes.sql` for likes).

Existing subscribers (owner's decision, 2026-11-15): the 3 contacts already in
"cozi newsletter" from the old single opt-in form are left as they are: no
confirmation email, no rows in `subscribers`. If one of them signs up again,
the normal flow runs and simply re-adds them to the same segment.

Agreed flow:
1. Visitor submits email → server action/route (never the browser anon key).
2. Validate email, honeypot field, rate limit by IP + email (5/hour).
3. Upsert a `pending` row in Supabase with a one-time token (store only its
   hash, expires 48h), source `intro` or `newsletter`, consent_text, consent_at.
4. Send the confirmation email (8.1) through Resend. Re-signup of a pending
   address resends at most once per 10 minutes.
5. /subscribe/confirm?token=… → status `confirmed`, then create/update the
   Resend contact and add it to the "cozi newsletter" segment. Show a branded
   "You're in" page with ENTER THE SHOP. Expired or used token → friendly page
   with a "send a new link" form.
6. Collection announcements are sent by the owner as Resend Broadcasts to the
   "cozi newsletter" segment. No admin UI in the app.
7. Resend is the source of truth for marketing unsubscribes. Never re-add or
   re-subscribe a contact Resend marks unsubscribed. Provide
   /subscribe/unsubscribe?token=… that updates both Supabase and Resend.

Data (migration file ONLY, for owner review): `subscribers` with id, email
(lowercased, unique), status (pending|confirmed|unsubscribed), source,
consent_text, consent_at, confirm_token_hash, confirm_expires_at, confirmed_at,
unsubscribe_token_hash, unsubscribed_at, created_at. RLS enabled; no public
access; server uses the service role. (No newsletter table exists today: the
current form writes straight to Resend Contacts via lib/newsletter.ts.)

### 8.1 Confirmation email (match `design/reference/email-confirm.png`)

- Sender name "Cozi Handmade" (address per section 8). Subject: "Confirm your
  place in the Cozi circle". Preheader: "One tap and you'll hear about new
  pieces and restocks first."
- Structure: orange (#A74508) header with milk "cozi." + HANDMADE; white card
  on cream (#FBF0E4) with eyebrow PRIVATE ACCESS (orange), heading "One tap
  and you're in.", body "Thanks for joining the Cozi circle. Confirm your email
  and you'll hear about new collections and restocks before anyone else.",
  burgundy (#8B2035) pill button "Confirm my place" with milk text, "This link
  expires in 48 hours.", divider, plain-link fallback ("Button not working?
  Paste this link into your browser:" + full URL), "Didn't sign up? Ignore this
  email. You won't be added to anything."; footer: "Handmade in Ireland ·
  cozihandmade.com · Instagram", business address, "You're getting this
  because this email was entered at cozihandmade.com."
- Business address: use `BUSINESS.addressLines` from `lib/email.ts` (owner
  approved 2026-11-15); import it, don't copy it.
- Build rules for email clients:
  - Table-based layout, 600px max width, all styles inline (clients strip
    <style> and ignore flex/grid/transform).
  - Fredoka/DM Sans will not load in most inboxes: fall back to
    Arial/Helvetica and make sure it still looks right in the fallback.
  - Logo as a hosted PNG (2x, ~240px wide) with alt="Cozi Handmade", so the
    header reads when images are blocked.
  - "Bulletproof" button: a table cell with background colour, not an image.
  - Plain-text version included.
  - Use React Email if already installed (it is not, as of 2026-11-15), or
    Resend's recommended templating; ask before adding a dependency.
- Reuse the same email shell (header, card, footer) for the "You're in"
  welcome and, later, restock emails.
