"use client";

import { useEffect } from "react";

// Inputs that open the on-screen keyboard (not checkboxes, buttons, etc.).
const TEXT_FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])' +
  ':not([type="reset"]):not([type="file"]):not([type="range"]):not([type="color"]):not([type="hidden"]),' +
  "textarea, select, [contenteditable='true']";
// Space kept clear above the keyboard and below the top of the screen.
const EDGE_GAP_PX = 16;
// Bring the whole form into view (e.g. the newsletter's Subscribe button,
// which sits under the email box on phones) when it's no taller than this
// share of the space the keyboard leaves.
const MAX_FORM_SHARE = 0.85;

/**
 * Keeps the field being typed in visible above a phone's on-screen keyboard,
 * site-wide.
 *
 * - While a text field has focus, <html> carries data-keyboard-open, which
 *   hides the bottom tab bar (globals.css) so it doesn't ride up on the
 *   keyboard and sit over the field.
 * - The page is padded at the bottom by the keyboard's height, so even a
 *   field near the end of the page has room to scroll above it.
 * - Once the keyboard has opened, the field's form (or just the field, if
 *   the form is too tall) is scrolled into the part of the screen the
 *   keyboard leaves visible (visualViewport), and again if that space
 *   changes while typing.
 *
 * A field inside [data-keyboard-scroll="self"] still hides the tab bar but
 * does its own scrolling (the homepage search moves itself to the top).
 * Only runs on touch screens; a desktop has no on-screen keyboard.
 */
export default function KeyboardAware() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const root = document.documentElement;
    let field: HTMLElement | null = null;
    let timer: number | undefined;

    function reveal() {
      const viewport = window.visualViewport;
      if (!field || !viewport || field.closest('[data-keyboard-scroll="self"]')) return;
      // A field near the end of the page (the newsletter) can't scroll above
      // the keyboard without room below it, so pad the page by the
      // keyboard's height while it's open (globals.css).
      const keyboardPx = Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height);
      root.style.setProperty("--keyboard-inset", `${Math.round(keyboardPx)}px`);

      const visibleTop = viewport.offsetTop + EDGE_GAP_PX;
      const visibleBottom = viewport.offsetTop + viewport.height - EDGE_GAP_PX;
      const space = visibleBottom - visibleTop;

      const form = field.closest("form");
      const formRect = form?.getBoundingClientRect();
      const target = formRect && formRect.height <= space * MAX_FORM_SHARE ? formRect : field.getBoundingClientRect();

      let delta = 0;
      if (target.bottom > visibleBottom) delta = target.bottom - visibleBottom;
      if (target.top - delta < visibleTop) delta = target.top - visibleTop;
      // The field itself must stay on screen even when the form doesn't fit.
      const fieldRect = field.getBoundingClientRect();
      if (fieldRect.top - delta < visibleTop) delta = fieldRect.top - visibleTop;
      if (Math.abs(delta) < 2) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollBy({ top: delta, behavior: reduceMotion ? "auto" : "smooth" });
    }

    function revealSoon(delay: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(reveal, delay);
    }

    function onFocusIn(e: FocusEvent) {
      const el = e.target as HTMLElement | null;
      if (!el?.matches?.(TEXT_FIELD) || (el as HTMLInputElement).readOnly) return;
      field = el;
      root.dataset.keyboardOpen = "";
      // The keyboard slides up over ~300ms and the browser does its own
      // scroll-into-view first; correct the position after both.
      revealSoon(350);
    }

    function onFocusOut() {
      // Focus moving straight to the next field fires focusin right after,
      // so wait a tick before deciding the keyboard is closing.
      window.setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (active?.matches?.(TEXT_FIELD)) return;
        field = null;
        delete root.dataset.keyboardOpen;
        root.style.removeProperty("--keyboard-inset");
      }, 0);
    }

    // The keyboard opening, closing or changing height resizes the visible area.
    function onViewportResize() {
      if (field) revealSoon(120);
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      delete root.dataset.keyboardOpen;
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);

  return null;
}
