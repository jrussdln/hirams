import React, { useMemo, useEffect } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { buildRoleGroups } from "../hooks/useRoleBuilder.js";
import useKeysLabels from "../hooks/useKeysLabels.js";
import Layout from "../components/layouts/page";
import ProtectedRoute from "./ProtectedRoute";
import DotSpinner from "../components/ui/loader/DotSpinner";
import PageChunkErrorBoundary from "../components/ui/error-boundary/PageChunkErrorBoundary";
import pageLoaders, { preloadRoute } from "./pageLoaders";

// ── Eager (needed for first paint / error handling) ─────────────────────────
import Login from "../pages/auth/login";
import PageNotFound from "../pages/utility-pages/PageNotFound.jsx";

const BASE_PATH = import.meta.env.MODE === "production" ? "/hirams" : "/";
// import { UAParser } from "ua-parser-js";

// ── Pages — CODE-SPLIT ───────────────────────────────────────────────────────
// React.lazy() over the shared loader map (routes/pageLoaders.js): each route
// downloads its own chunk the first time it is opened, so the initial page
// load no longer waits for all 31 pages. The sidebar prefetches the same map
// on hover, so by the time you click, the chunk is already in memory.
const lazyPage = (path) =>
  React.lazy(() => {
    const load = pageLoaders[path];
    return load
      ? load()
      : Promise.reject(new Error(`[routes] no page loader for "${path}"`));
  });

const IndexPage = lazyPage("/index");
const ForgotPassword = lazyPage("/forgotPassword");
const Register = lazyPage("/register");
const ResetPassword = lazyPage("/reset-password");
const Settings = lazyPage("/settings");
const Dashboard = lazyPage("/dashboard");
const Documentation = lazyPage("/documentation");
const TransactionCanvas = lazyPage("/transaction-canvas"); //DONE - NV
const TransactionPricing = lazyPage("/transaction-pricing"); //DONE - NV
const TransactionPricingSet = lazyPage("/transaction-pricing-set"); //DONE - NV
const AddBulkItem = lazyPage("/add-bulk-item"); //DONE - NV
const Transaction = lazyPage("/transaction"); //DONE - NV
const Client = lazyPage("/client");
const Supplier = lazyPage("/supplier"); //DONE - NV
const User = lazyPage("/user"); // DONE - NV -> LOCSTR
const Company = lazyPage("/company"); // DONE - NV -> LOCSTR
const DirectCost = lazyPage("/direct-cost"); //DONE - NV -> LOCSTR
const Inventory = lazyPage("/inventory"); // DONE - NV
const Assignee = lazyPage("/assignee"); // DONE - NV
const TransactionArchive = lazyPage("/transaction-archive"); //DONE - NV
const TransactionForPurchase = lazyPage("/transaction-for-purchase"); //DONE - NV
const TransactionForCollection = lazyPage("/transaction-for-collection"); //DONE - NV
const TransactionVoucher = lazyPage("/voucher"); //DONE - NV
const VoucherUpdateView = lazyPage("/voucher-update");
const JournalAccount = lazyPage("/journal-account"); //DONE - NV
const JournalEntryVoucher = lazyPage("/journal-entry-voucher");
const JEVUpdate = lazyPage("/jev-update");
const ItemPurchasingView = lazyPage("/item-purchasing"); //DONE - NV
const ItemPurchasingUpdateView = lazyPage("/item-purchasing-update"); //DONE - NV
const PreviewPO = lazyPage("/preview-po");
const PreviewVoucher = lazyPage("/preview-voucher");
const PreviewCheque = lazyPage("/preview-cheque");
const PreviewDR = lazyPage("/preview-dr");
const PreviewSI = lazyPage("/preview-si");
const Help = lazyPage("/help");
// Public privacy/terms document — the login banner opens it in a new tab.
const DataPrivacy = lazyPage("/data-privacy");
export default function AppRoute() {
  const { userTypes, loading: mappingLoading } = useKeysLabels();

  // ── Log logged-in user's coordinates ────────────────────────────────────────
  // ── Log logged-in user's exact location (barangay / city / province / country) ──
  // useEffect(() => {
  //   let user = null;
  //   try {
  //     user = JSON.parse(localStorage.getItem("user") || "null");
  //   } catch (e) {
  //     console.error("Failed to parse user:", e);
  //   }

  //   if (!user?.nUserId) return;

  //   if (!navigator.geolocation) {
  //     console.warn("Geolocation is not supported by this browser.");
  //     return;
  //   }

  //   const reverseGeocode = async (latitude, longitude) => {
  //     try {
  //       const res = await fetch(
  //         `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
  //         {
  //           headers: {
  //             // Nominatim's usage policy requires an identifying header
  //             "Accept-Language": "en",
  //           },
  //         },
  //       );
  //       if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
  //       const data = await res.json();
  //       const addr = data.address || {};

  //       return {
  //         barangay:
  //           addr.village ||
  //           addr.suburb ||
  //           addr.neighbourhood ||
  //           addr.quarter ||
  //           null,
  //         city: addr.city || addr.town || addr.municipality || null,
  //         province: addr.state || addr.province || null,
  //         country: addr.country || null,
  //         displayName: data.display_name || null,
  //       };
  //     } catch (err) {
  //       console.error("Reverse geocoding error:", err);
  //       return null;
  //     }
  //   };

  //   navigator.geolocation.getCurrentPosition(
  //     async (position) => {
  //       const { latitude, longitude, accuracy } = position.coords;
  //       const location = await reverseGeocode(latitude, longitude);

  //       console.log("Logged-in user location:", {
  //         userId: user.nUserId,
  //         latitude,
  //         longitude,
  //         accuracy,
  //         ...location,
  //       });
  //     },
  //     (error) => {
  //       console.error("Geolocation error:", error.message);
  //     },
  //     { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  //   );
  // }, []);
  // useEffect(() => {
  //   let user = null;
  //   try {
  //     user = JSON.parse(localStorage.getItem("user") || "null");
  //   } catch (e) {
  //     console.error("Failed to parse user:", e);
  //   }

  //   if (!user?.nUserId) return;

  //   const parser = new UAParser();
  //   const result = parser.getResult();

  //   console.log("Logged-in user device info:", {
  //     userId: user.nUserId,
  //     deviceType: result.device.type || "desktop", // "mobile" | "tablet" | undefined→desktop
  //     deviceVendor: result.device.vendor,
  //     deviceModel: result.device.model,
  //     os: result.os.name,
  //     osVersion: result.os.version,
  //     browser: result.browser.name,
  //     browserVersion: result.browser.version,
  //     engine: result.engine.name,
  //   });
  // }, []);

  // ── Role resolution via roleHelper ──────────────────────────────────────────
  const roleKeyString = Object.keys(userTypes || {}).join(",");
  const {
    managementKey,
    procurementKey,
    accountOfficerKey,
    financeOfficerKey,
  } = useMemo(
    () => buildRoleGroups(userTypes || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleKeyString],
  );

  const toStringRoles = (...roles) => roles.filter(Boolean).map(String);

  const allRoles = toStringRoles(
    ...managementKey,
    ...procurementKey,
    ...accountOfficerKey,
    ...financeOfficerKey,
  );
  const managementRoles = toStringRoles(...managementKey);
  const procurementRoles = toStringRoles(...procurementKey);
  const accountOfficerRoles = toStringRoles(...accountOfficerKey);
  const financeOfficerRoles = toStringRoles(...financeOfficerKey);

  const router = useMemo(
    () =>
      createBrowserRouter(
        [
          {
            errorElement: <PageNotFound />,
            children: [
              // ── Public ────────────────────────────────────────────────────────
              { path: "/", element: <Login /> },
              { path: "/forgotPassword", element: <ForgotPassword /> },
              { path: "/register", element: <Register /> },
              { path: "/index", element: <IndexPage /> },
              { path: "/reset-password", element: <ResetPassword /> },
              { path: "/data-privacy", element: <DataPrivacy /> },

              // ── All roles ────────────────────────────────────────────────────
              {
                element: <ProtectedRoute allowedRoles={allRoles} />,
                children: [
                  {
                    element: <Layout />,
                    children: [
                      { path: "/dashboard", element: <Dashboard /> },
                      { path: "/documentation", element: <Documentation /> },
                      { path: "/help", element: <Help /> },
                      // Settings — open to every role (was Management-only
                      // /system-config).
                      { path: "/settings", element: <Settings /> },
                      {
                        path: "/system-config",
                        element: <Navigate to="/settings" replace />,
                      },
                      { path: "/supplier", element: <Supplier /> },
                      { path: "/transaction", element: <Transaction /> },
                      {
                        path: "/transaction-canvas",
                        element: <TransactionCanvas />,
                      },
                      {
                        path: "/transaction-pricing-set",
                        element: <TransactionPricingSet />,
                      },
                      {
                        path: "/transaction-pricing",
                        element: <TransactionPricing />,
                      },
                      { path: "/client", element: <Client /> },
                      { path: "/add-bulk-item", element: <AddBulkItem /> },
                      {
                        path: "/transaction-archive",
                        element: <TransactionArchive />,
                      },
                      {
                        path: "/transaction-for-purchase",
                        element: <TransactionForPurchase />,
                      },
                      {
                        path: "/transaction-for-collection",
                        element: <TransactionForCollection />,
                      },
                      { path: "/voucher", element: <TransactionVoucher /> },
                      { path: "/assignee", element: <Assignee /> },
                      { path: "/inventory", element: <Inventory /> },
                      { path: "/journal-account", element: <JournalAccount /> },
                      { path: "/journal-entry-voucher", element: <JournalEntryVoucher /> },
                      { path: "/jev-update", element: <JEVUpdate /> },
                      {
                        path: "/voucher-update",
                        element: <VoucherUpdateView />,
                      },
                      {
                        path: "/item-purchasing",
                        element: <ItemPurchasingView />,
                      },
                      {
                        path: "/item-purchasing-update",
                        element: <ItemPurchasingUpdateView />,
                      },

                      { path: "/preview-po", element: <PreviewPO /> },
                      { path: "/preview-voucher", element: <PreviewVoucher /> },
                      { path: "/preview-cheque", element: <PreviewCheque /> },
                      { path: "/preview-dr", element: <PreviewDR /> },
                      { path: "/preview-si", element: <PreviewSI /> },
                    ],
                  },
                ],
              },

              // ── Management ───────────────────────────────────────────────────
              {
                element: <ProtectedRoute allowedRoles={managementRoles} />,
                children: [
                  {
                    element: <Layout />,
                    children: [
                      { path: "/user", element: <User /> },
                      { path: "/company", element: <Company /> },
                      { path: "/direct-cost", element: <DirectCost /> },
                    ],
                  },
                ],
              },

              // ── Procurement ──────────────────────────────────────────────────
              {
                element: <ProtectedRoute allowedRoles={procurementRoles} />,
                children: [{ element: <Layout />, children: [{}] }],
              },

              // ── Account Officer (AO + AOTL) ──────────────────────────────────
              {
                element: <ProtectedRoute allowedRoles={accountOfficerRoles} />,
                children: [{ element: <Layout />, children: [{}] }],
              },

              // ── Finance Officer ──────────────────────────────────────────────
              {
                element: <ProtectedRoute allowedRoles={financeOfficerRoles} />,
                children: [{ element: <Layout />, children: [{}] }],
              },

              // ── Catch-all (must be last) ──────────────────────────────────────
              { path: "*", element: <PageNotFound /> },
            ],
          },
        ],
        { basename: BASE_PATH },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleKeyString],
  );
  // Warm the landing page while the browser is idle, so the first click
  // after login doesn't have to wait for its chunk to download.
  useEffect(() => {
    const warm = () => preloadRoute("/dashboard");
    const hasIdle = typeof window.requestIdleCallback === "function";
    const id = hasIdle
      ? window.requestIdleCallback(warm, { timeout: 2500 })
      : setTimeout(warm, 1500);
    return () => {
      if (hasIdle) window.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  if (mappingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DotSpinner size={15} gap={2} message={true} />
      </div>
    );
  }

  return (
    // Safety net for the routes rendered OUTSIDE <Layout> (login, forgot
    // password, register, reset, /index) — those have no Suspense boundary of
    // their own, so their lazy chunk needs one here or React throws.
    <PageChunkErrorBoundary>
      <React.Suspense fallback={null}>
        <RouterProvider router={router} />
      </React.Suspense>
    </PageChunkErrorBoundary>
  );
}
