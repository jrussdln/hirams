/* ── Feature flags ─────────────────────────────────────────────────────
   Compile-time switches for features that are NOT checked / NOT final
   yet. Flip a flag here to turn the whole feature on or off in ONE
   place — every screen reads from these exports.
   ──────────────────────────────────────────────────────────────────── */

/**
 * PRE-CANVASS — under development, not final.
 *
 * When off:
 *   • "Add Transaction" skips the Pre-Canvass confirm dialog and opens
 *     the AEModal straight as a Normal Transaction
 *   • the indigo "Pre-Canvass" tag never shows in the transactions table
 *   • the "Export Pre-Canvass" button never shows in CanvasView
 *
 * Existing rows that already carry bIsPreCanvas = 1 keep their data in
 * the DB — only the user-facing entry points are hidden.
 */
export const isPreCanvassEnabled = false;

/**
 * AI Chatbot widget — NOT final. When off, no floating chatbot FAB is
 * rendered in the app shell (Layout2).
 */
export const aiChatBotEnabled = false;

/**
 * Dark-mode toggle in the header — NOT final. When off, the header's
 * theme-switch button is never rendered.
 */
export const darkModeEnabled = false;
