/**
 * pageLoaders.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Route path → dynamic-import factory for every code-split page.
 *
 * Both consumers share this one map so they hit the SAME cached module:
 *   • AppRoute.jsx       → React.lazy(pageLoaders[path])
 *   • SidebarItem.jsx    → preloadRoute(path) on hover/touch (prefetch)
 *
 * A path that isn't listed (removed route, typo in a sidebar `to`) is a
 * silent no-op — prefetching simply never happens for it.
 */

const pageLoaders = {
  // ── Auth / utility ────────────────────────────────────────────────────
  "/index": () => import("../pages/index"),
  "/forgotPassword": () => import("../pages/auth/forgot-password"),
  "/register": () => import("../pages/auth/register"),
  "/reset-password": () => import("../pages/auth/reset-password"),
  "/help": () => import("../pages/utility-pages/Help.jsx"),
  // Opened from the login consent banner in its own tab — public, no login.
  "/data-privacy": () => import("../pages/utility-pages/DataPrivacy.jsx"),

  // ── All roles ─────────────────────────────────────────────────────────
  "/dashboard": () => import("../pages/shared/overview/Dashboard.jsx"),
  "/documentation": () => import("../pages/shared/documentation"),
  "/supplier": () => import("../pages/shared/supplier"),
  "/transaction": () => import("../pages/shared/transactions"),
  "/transaction-canvas": () => import("../pages/shared/canvas"),
  "/transaction-pricing-set": () => import("../pages/shared/pricing-set"),
  "/transaction-pricing": () => import("../pages/shared/pricing"),
  "/client": () => import("../pages/shared/client"),
  "/add-bulk-item": () => import("../pages/shared/canvas/components/AddBulkItem"),
  "/transaction-archive": () => import("../pages/shared/archive"),
  "/transaction-for-purchase": () => import("../pages/shared/purchase"),
  "/transaction-for-collection": () => import("../pages/shared/collection"),
  "/voucher": () => import("../pages/shared/voucher"),
  "/assignee": () => import("../pages/shared/assignee"),
  "/inventory": () => import("../pages/shared/inventory"),
  "/journal-account": () => import("../pages/shared/journal-accounts"),
  "/jev": () => import("../pages/shared/jev"),
  "/voucher-update": () =>
    import("../pages/shared/voucher/sub-pages/voucher-update"),
  "/item-purchasing": () => import("../pages/shared/item-purchasing"),
  "/item-purchasing-update": () =>
    import(
      "../pages/shared/item-purchasing/sub-pages/item-purchasing-update"
    ),

  // ── Preview / print ───────────────────────────────────────────────────
  "/preview-po": () =>
    import("../pages/shared/item-purchasing/sub-pages/preview-po"),
  "/preview-voucher": () =>
    import("../pages/shared/voucher/sub-pages/preview-voucher"),
  "/preview-cheque": () =>
    import("../pages/shared/voucher/sub-pages/preview-cheque"),
  "/preview-dr": () => import("../pages/shared/purchase/sub-pages/preview-dr"),
  "/preview-si": () => import("../pages/shared/purchase/sub-pages/preview-si"),

  // ── Management ────────────────────────────────────────────────────────
  "/user": () => import("../pages/management/user"),
  "/company": () => import("../pages/management/company"),
  "/direct-cost": () => import("../pages/management/direct-cost"),
  "/settings": () => import("../pages/shared/settings/index.jsx"),
};

/**
 * Start downloading a page's chunk right now (hover, touch, idle).
 * The dynamic import is cached by the module system, so React.lazy later
 * resolves from memory instead of the network.
 */
export function preloadRoute(path) {
  const load = pageLoaders[path];
  if (!load) return;
  try {
    const p = load();
    // Swallow — a failed prefetch must never surface as an error.
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    /* ignore */
  }
}

export default pageLoaders;
