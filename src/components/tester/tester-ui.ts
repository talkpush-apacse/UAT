/**
 * Shared class strings for tester-facing screens. Kept here (not in the shared
 * ui/ primitives) so the heavier 2px-ink look never leaks into admin pages.
 */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export const TESTER_BTN_PRIMARY = `${BUTTON_BASE} border-primary bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80`

export const TESTER_BTN_OUTLINE = `${BUTTON_BASE} border-primary bg-white text-primary hover:bg-secondary active:bg-muted`

export const TESTER_BTN_DISABLED = `${BUTTON_BASE} cursor-not-allowed border-gray-400 bg-gray-100 text-gray-600`

/** Small text link: bold, underlined, ink-coloured. */
export const TESTER_LINK =
  "font-bold text-primary underline underline-offset-4 hover:text-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
