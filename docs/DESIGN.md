# Cozi Handmade — Design System

Source of truth for the redesign. Where the old Figma reference screenshots
(burnt-orange buttons/header, #F5F4F0 background) disagree with this file,
**this file wins**.

## Hard rules

- VISUAL CHANGES ONLY. Never change checkout, cart, stock, pricing, auth, Stripe,
  Supabase queries, server actions, API routes or database migrations.
  The local env points at the PRODUCTION Supabase project.
- If a visual change seems to need a logic change, stop and ask.
- Keep existing page content, product data and copy unless approved.
- Work in phases; stop and summarise after each one. Run lint, typecheck, tests
  and a production build after every phase and report failures.

## 1. Colour tokens

Define once as CSS variables + Tailwind theme.

| Token | Hex | Role |
|---|---|---|
| cream | #FBF0E4 | Page background, header, drawer (~60% of the page) |
| brown | #4D1808 | Primary text, logo on cream, footer, selected chips, dark blocks (~30%) |
| burgundy | #8B2035 | PRIMARY BUTTONS, active nav tab, text links |
| burgundy-dark | #6E1829 | Button hover/pressed |
| orange | #A74508 | Hero block, "Only X left" badge, brand moments. NEVER a button colour |
| rust | #88290B | Logo colourway only |
| milk | #F5F4F0 | Logo off-white; text/buttons sitting on orange blocks |
| peach | #F7D9C0 | Soft cards: custom order, story section, gift wrap, trust tiles |
| stone | #7A6A62 | Secondary text |
| line | #E2DCD3 | Borders, dividers |
| white | #FFFFFF | Cards, inputs |
| success | #2F6B3A | Success text |
| error | #B3261E | Error text and borders |

Rules:
- Never place a burgundy button on an orange block. On orange, buttons are milk
  with brown/burgundy text.
- All text must pass WCAG AA (4.5:1 body, 3:1 large). Known failures to fix: the
  faint pink "Currency" and "MORE" labels in the mobile drawer.
- No gradients or shimmer on buttons (remove the shimmer on "Shop the Collection").

## 2. Typography, spacing, shape

- Headings: Fredoka (SemiBold/Medium). Body, prices, UI: DM Sans. Load with
  `next/font` with fallbacks.
- Type scale (mobile → desktop): Display 40/44 → 64/68; H1 32/38 → 44/50;
  H2 24/30 → 32/38; H3 18/24; Body 16/24; Small 14/20; Caption 12/16;
  Eyebrow 12/16 uppercase, letter-spacing 0.3em, DM Sans SemiBold.
- Spacing: 4px base, steps 4 8 12 16 20 24 32 48 64 96.
- Radius: 8 (small), 16 (inputs, tiles), 24 (cards, images), 32 (feature blocks),
  pill (buttons, chips, badges).
- Shadows: soft and warm only (`rgba(77,24,8,0.08) 0 4px 16px`). No hard or grey shadows.
- Touch targets ≥ 44px. Buttons min-height 48px.

## 3. Components (build once, reuse everywhere)

Button (primary burgundy / secondary outline brown / on-orange milk / disabled),
Badge (Handmade peach, Low stock orange, Sold out brown), ProductCard (4:5 image,
radius 24, name wraps to 2 lines then truncates, price; the WHOLE CARD is the
link — remove per-card "Choose options" / "+ Add to bag" buttons), Chip (category
filter, selected = brown), SectionHeader (eyebrow + H2 + "See all →"), Input
(label always above field; default / focus (brown 2px) / error (red 2px + fix-it
message)), CartLineItem, Accordion, SizeSelector, QuantityStepper, Header,
BottomNav, Footer, Drawer menu.

## 4. Layout per page

Mobile = 390px design width, 16px side padding. Desktop = 1440px, max content
width 1200px, 32px gutters. Breakpoints: sm 640, md 768, lg 1024, xl 1280.

**Header**
- Mobile: cream background, menu icon left, logo centre, search + bag (with
  count) right, 1px bottom line. Sticky.
- Desktop: logo left, inline nav (Shop, Collections, Featured, Custom order),
  search field, account, bag. No bottom nav on desktop.

**Home** (order): dark trust strip → header → hero → shop by category → in stock
now → featured pieces → story → custom order → newsletter → footer.
- Hero: orange block, rounded bottom corners (32), eyebrow, Display heading,
  intro copy, product image with price pill, milk primary button + milk outline
  button. Desktop: two columns (text left, image right).
- Hero on mobile (owner's decision, overrides the line above below lg): NO
  written copy — no eyebrow, heading or intro paragraph. The product search bar
  sits at the top of the hero, then the image, then the buttons. The H1 stays in
  the markup as sr-only for screen readers and SEO. Desktop keeps the full hero
  copy.
- Product grids: 2 columns mobile, 3 at md, 4 at lg.
- Story section: peach card. Custom order: brown card.

**Product page**: breadcrumb, swipeable gallery + thumbnails (desktop: gallery
left 60%, details right 40% and sticky), eyebrow category, H1 name, price + stock
badge, description, size selector, trust tiles (peach), accordion, "You might
also love". Mobile: sticky bottom buy bar (quantity stepper + "Add to bag · €price").

**Cart**: line items, gift-wrap option, summary card, burgundy "Checkout
securely", "Continue shopping" link, designed empty state. Desktop: items left,
summary right and sticky.

**Checkout**: slim header (back, logo, "Secure"), collapsible order summary,
numbered steps (Contact → Delivery → Address → Payment), guest checkout first,
sign-in optional. Style the Stripe Payment Element ONLY through Stripe's
Appearance API (colorPrimary #8B2035, colorText #4D1808, colorBackground
#FFFFFF, borderRadius 16px, DM Sans). Do not touch payment logic. Desktop: form
left, summary right.

**Bottom nav** (mobile only): Home, Shop, Bag, Chat. Active = burgundy.

**Drawer menu**: apply the new tokens. Fix the bug where the nav list is clipped
behind the "Join the Cozi family" card ("Featured Pieces" half hidden).

Apply the same system to every other existing page (shop/collection, FAQs,
account, auth, order confirmation).

## 5. Logo system

Colourways: (a) brown #4D1808 on cream, (b) rust #88290B on cream,
(c) milk #F5F4F0 on orange #A74508 — (c) is the primary brand version.

- Source files in `public/brand/` are JPEGs with a baked-in blur shadow. Produce
  a clean SVG of the "cozi." mark and "HANDMADE" wordmark, each letter its own
  path, colours via CSS variables / currentColor. Show it beside the original
  before using it anywhere.
- Lockups: stacked (hero / about), horizontal one-line "cozi." (header — the
  stacked mark is unreadable at header height), and a "c." monogram (favicon,
  app icon, social avatar). Generate favicon + apple-touch-icon sizes.
- Header uses the brown-on-cream horizontal lockup, static (no animation).

### 5b. Animated hero logo (propose first, build only after approval)

Approved and built (2026-11-13): `components/brand/AnimatedCoziLogo.tsx`. The
stacked "co / zi." + HANDMADE artwork, with a letter-by-letter colour wave
through four site colourways per surface (cream: brown → orange → milk with
rust outline → rust; orange: milk → peach → orange with milk outline → cream).
HANDMADE stays solid.

Placement (owner's decision, overrides "no animation in the header" below):
the colour wave runs on the site header logo, which is the stacked "co / zi."
mark (letters only, no HANDMADE) on every screen size — 48px tall on phones,
64px from lg. This overrides the "horizontal lockup in the header" line above. It is NOT placed in the homepage hero. Checkout keeps the
static logo (the site header is not rendered there); reduced motion shows the
static brown logo.

Non-negotiable for whichever concept is chosen:
- Respect `prefers-reduced-motion` (show the static primary logo instead).
- Must not delay first render or shift layout; logo visible immediately,
  animation starts after load.
- Pause when off-screen (IntersectionObserver). No animation in the header,
  checkout or cart.
- Accessible name "Cozi Handmade" on the logo; animation layers are aria-hidden.

## 6. Phases

1. Repo inspection report + this file + `CLAUDE.md` reference.
2. Tokens, fonts, global styles; temporary `/styleguide` page.
3. Logo SVG + lockups + favicon (show first) → static header/footer logo.
4. Shared components (section 3).
5. Mobile pages: Home → Product → Cart → Checkout → Drawer → remaining pages.
6. Desktop layouts for the same pages.
7. Logo animation concepts → build the one chosen.
8. Final pass at 390 / 768 / 1440, contrast audit (axe or Lighthouse), build
   passes, list leftovers; remove `/styleguide` only on approval.
