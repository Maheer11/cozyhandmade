// "Private access" intro (docs/DESIGN.md §7) — the media block beside/above
// the orange panel. Edit this file to switch from a flat colour to a photo.
//
// HOW TO SWITCH TO A PHOTO
//   1. Upload two crops to Cloudinary: a landscape one for tablets/desktop and
//      a portrait one for phones. Paste their URLs below (plain
//      .../image/upload/... URLs; f_auto,q_auto is added for you).
//   2. Write `alt`: what the photo shows, for screen readers. Required — the
//      build fails in image mode while `alt` is empty.
//   3. Set `mode: "image"`.
//   4. Optional: `focalPoint` keeps the important part in frame when the
//      photo is cropped ("center", "top", "bottom", "left", "right", or any
//      CSS object-position such as "30% 60%").
// If a URL is empty or the photo fails to load, the block falls back to
// `colour` with no broken-image icon and no layout shift.
//
// SHOWING THE INTRO AGAIN TO EVERYONE
//   Bump `version`. Each visitor's "seen it" flag is stored per version
//   (localStorage `cozi_intro_v{version}`), so a new number shows it again.

export type IntroMediaMode = "colour" | "image";

export interface IntroMediaConfig {
  mode: IntroMediaMode;
  /** Used in colour mode and as the fallback in image mode. */
  colour: string;
  image: {
    /** Landscape crop URL (Cloudinary), shown from 768px. */
    desktop: string;
    /** Portrait crop URL (Cloudinary), shown below 768px. */
    mobile: string;
    /** What the photo shows. Required in image mode. */
    alt: string;
    /** CSS object-position, e.g. "center" or "30% 60%". */
    focalPoint: string;
  };
  /** Bump to show the intro again to everyone. */
  version: number;
}

export const introMedia = {
  mode: "colour",
  colour: "#4D1808",
  image: {
    desktop: "",
    mobile: "",
    alt: "",
    focalPoint: "center",
  },
  version: 1,
} as const satisfies IntroMediaConfig;

// ── Build-time guard: image mode needs alt text ───────────────────────────
// If `mode` is "image" while `alt` is "", the type below becomes a string and
// the assignment fails typecheck (and therefore `next build`) with this
// message. Nothing to do here while `mode` is "colour".
type AltRequired<C> = C extends { mode: "image"; image: { alt: "" } }
  ? "introMedia: image mode needs image.alt (describe the photo for screen readers)"
  : true;
const altGuard: AltRequired<typeof introMedia> = true;
void altGuard;

/** localStorage key that records this visitor has seen this version. */
export const INTRO_STORAGE_KEY = `cozi_intro_v${introMedia.version}`;
