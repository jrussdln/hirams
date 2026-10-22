import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import VoucherAPI from "../../../api/endpoints/voucher.api.js";
import PurchaseCartAPI from "../../../api/endpoints/purchase-cart.api.js";
import UserAPI from "../../../api/endpoints/user.api.js";
import { buildRoleGroups } from "../../../hooks/useRoleBuilder.js";
import { setItem, getItem } from "../../../utils/storage/localStorage.js";
import useKeysLabels from "../../../hooks/useKeysLabels.js";
import {
  getToReceive,
  getToDeliver,
  getDelivered,
} from "../../../utils/helpers/purchaseProgress.js";

// Every option fully received (and every option has a real ordered qty) →
// the Pending Receipt card would render with ALL of its rows hidden.
export const isFullyReceived = (opts = []) =>
  opts.length > 0 &&
  opts.every((o) => {
    const p = o.purchase_option;
    return (Number(p?.nQuantity) || 0) > 0 && getToReceive(p) === 0;
  });

// ── LOCAL STORAGE CACHE ──────────────────────────────────────────────
// Persists across component mount/unmount AND page reloads (localStorage)
// No TTL — cache is used until explicitly busted (bustCache: true)
const CACHE_KEYS = {
  purchaseOrders: "cart_cache_purchaseOrders",
  vouchersByPO: "cart_cache_vouchersByPO",
  aoGmDirectory: "cart_cache_aoGmDirectory",
};

// Must match SESSION_KEY in ItemPurchasingNavSection so the sidebar and this
// view read/write the same selected-status value.
const SESSION_KEY = "selectedItemPurchasingStatusCode";

const cacheGet = (key, fallback = null) => getItem(CACHE_KEYS[key], fallback);
const cacheSet = (key, value) => setItem(CACHE_KEYS[key], value);
// ───────────────────────────────────────────────────────────────────

export function getTimePeriod(dateStr) {
  if (!dateStr) return "older";
  const date = new Date(dateStr);
  if (isNaN(date)) return "older";
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  if (date >= startOfDay) return "today";
  if (date >= startOfWeek) return "this_week";
  if (date >= startOfMonth) return "this_month";
  if (date >= startOfYear) return "this_year";
  return "older";
}

export const TIME_PERIOD_ORDER = [
  "today",
  "this_week",
  "this_month",
  "this_year",
  "older",
];

export const TIME_PERIOD_LABELS = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  this_year: "This Year",
  older: "Older",
};

export default function useItemPurchasing() {
  const navigate = useNavigate();
  const [itemsLoading, setItemsLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [allCollapsed, setAllCollapsed] = useState(true);
  // The time-period sections (Today / This Week / …):
  //   null → the default: the first group is open, the rest are closed
  //   true → every group is open
  //   false → every group is closed
  // The Expand / Collapse All button drives this together with the cards.
  const [sectionsExpanded, setSectionsExpanded] = useState(null);
  const [vouchersByPO, setVouchersByPO] = useState({});
  const [aoGmDirectory, setAoGmDirectory] = useState({
    checkByOtherAOName: "—",
    generalManagerName: "—",
  });
  const aoGmFetchedRef = useRef(false);
  const user = useMemo(() => getItem("user", {}), []);
  const currentUserId = user?.nUserId;

  const {
    //Mappings
    forPurchaseStatus,
    itemPurchasingStatus,
    shippingMethod,
    paymentTerms,
    voucherStatus,
    voucherType,
    userTypes,
    loading: mappingLoading,
    //Keys
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,

    removedFromCartKey,
    voucherActiveKey,
    voucherClosedKey,
    voucherPaidKey,
    voucherSupplierTypeKey,
    voucherAssigneeTypeKey,
    //Labels
    isGeneralManager,
    isAccountOfficer,
    isAOTL,
    isManagement,
    isFinanceOfficer,
  } = useKeysLabels();

  const [selectedStatusCode, setSelectedStatusCode] = useState(() =>
    getItem(SESSION_KEY, ""),
  );

  const fetchAllPurchaseOrders = useCallback(
    async ({ silent = false, bustCache = false } = {}) => {
      // ✅ If cache exists and not busting — restore instantly (no TTL check)
      const cachedOrders = !bustCache ? cacheGet("purchaseOrders") : null;
      if (cachedOrders) {
        setPurchaseOrders(cachedOrders);

        const cachedVouchers = cacheGet("vouchersByPO");
        if (cachedVouchers) setVouchersByPO(cachedVouchers);
        const cachedAoGm = cacheGet("aoGmDirectory");
        if (cachedAoGm) setAoGmDirectory(cachedAoGm);
        // Still refresh in background, but silently
        silent = true;
      }

      if (!silent) setItemsLoading(true);
      try {
        const [poResult, voucherResult] = await Promise.allSettled([
          PurchaseCartAPI.getAllPurchaseOrders(),
          VoucherAPI.getVouchers(),
        ]);
        if (poResult.status === "fulfilled") {
          const orders = poResult.value.purchaseOrders || [];
          setPurchaseOrders(orders);
          cacheSet("purchaseOrders", orders); // ✅ cache
        }
        if (voucherResult.status === "fulfilled") {
          const vouchers = Array.isArray(voucherResult.value)
            ? voucherResult.value
            : (voucherResult.value.data ?? []);
          const map = {};
          vouchers.forEach((v) => {
            (v.voucher_suppliers ?? []).forEach((vs) => {
              if (!map[vs.nPurchaseOrderId])
                map[vs.nPurchaseOrderId] = v.cStatus;
            });
          });
          setVouchersByPO(map);
          cacheSet("vouchersByPO", map); // ✅ cache
        }
      } finally {
        if (!silent) setItemsLoading(false);
      }
    },
    [],
  );

  const fetchRef = useRef(fetchAllPurchaseOrders);
  useEffect(() => {
    fetchRef.current = fetchAllPurchaseOrders;
  }, [fetchAllPurchaseOrders]);

  // ── ✅ On mount: try cache FIRST, then fetch silently ──
  useEffect(() => {
    if (mappingLoading) return;

    const cachedOrders = cacheGet("purchaseOrders");

    if (cachedOrders) {
      // Restore from cache instantly — NO loading skeleton
      setPurchaseOrders(cachedOrders);

      const cachedVouchers = cacheGet("vouchersByPO");
      if (cachedVouchers) setVouchersByPO(cachedVouchers);
      const cachedAoGm = cacheGet("aoGmDirectory");
      if (cachedAoGm) setAoGmDirectory(cachedAoGm);
      // Silent background refresh
      fetchAllPurchaseOrders({ silent: true });
    } else {
      // No cache — full load with skeleton
      fetchAllPurchaseOrders();
    }
  }, [mappingLoading, fetchAllPurchaseOrders]);

  useEffect(() => {
    if (
      mappingLoading ||
      !userTypes ||
      Object.keys(userTypes).length === 0 ||
      aoGmFetchedRef.current
    )
      return;
    aoGmFetchedRef.current = true;
    UserAPI.getAllUsers()
      .then((res) => {
        const users = res.users ?? [];
        const { accountOfficerKey, generalManagerKey } =
          buildRoleGroups(userTypes);
        const buildName = (u) =>
          [
            u?.strFName,
            u?.strMName ? u.strMName[0].toUpperCase() + "." : "",
            u?.strLName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
        const ao = users.find((u) =>
          accountOfficerKey.includes(String(u.cUserType)),
        );
        const gm = users.find((u) =>
          generalManagerKey.includes(String(u.cUserType)),
        );
        const directory = {
          checkByOtherAOName: ao ? buildName(ao) || "—" : "—",
          generalManagerName: gm ? buildName(gm) || "—" : "—",
        };
        setAoGmDirectory(directory);
        cacheSet("aoGmDirectory", directory); // ✅ cache
      })
      .catch((err) =>
        console.error("Failed to fetch users for PO names:", err),
      );
  }, [mappingLoading, userTypes]);

  // ── Sync selected status from storage / nav dispatch ──
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code) return;
      setSelectedStatusCode(code);
      setItem(SESSION_KEY, code);
    };
    window.addEventListener("cart_status_changed", handler);
    return () => window.removeEventListener("cart_status_changed", handler);
  }, []);

  useEffect(() => {
    if (mappingLoading) return;
    const handlePOUpdate = (e) => {
      const { purchaseOrderId, newStatus, action } = e.detail || {};
      if (action === "status_updated" && newStatus) {
        setPurchaseOrders((prev) => {
          const next = prev.map((po) =>
            po.nPurchaseOrderId === purchaseOrderId
              ? { ...po, cStatus: newStatus }
              : po,
          );
          cacheSet("purchaseOrders", next); // ✅ update cache too
          return next;
        });
        fetchRef.current({ silent: true });
        return;
      }
      if (action === "deleted") {
        setPurchaseOrders((prev) => {
          const next = prev.filter(
            (po) => po.nPurchaseOrderId !== purchaseOrderId,
          );
          cacheSet("purchaseOrders", next); // ✅ update cache too
          return next;
        });
        return;
      }
      fetchRef.current({ silent: true });
    };
    const handleOptionUpdate = () => {
      fetchRef.current({ silent: true });
    };
    const handleVoucherUpdated = () => {
      fetchRef.current({ silent: true });
    };
    const handleVoucherDeleted = (e) => {
      const { voucherId } = e.detail || {};
      setVouchersByPO((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((poId) => {
          if (next[poId] === voucherId || next[poId]?.voucherId === voucherId)
            delete next[poId];
        });
        cacheSet("vouchersByPO", next);
        return next;
      });
      fetchRef.current({ silent: true });
    };
    window.addEventListener("purchase_order_data_updated", handlePOUpdate);
    window.addEventListener("purchase_order_data_deleted", handlePOUpdate);

    window.addEventListener(
      "purchase_order_option_data_updated",
      handleOptionUpdate,
    );
    window.addEventListener(
      "purchase_order_option_data_deleted",
      handleOptionUpdate,
    );
    window.addEventListener("voucher_data_updated", handleVoucherUpdated);
    window.addEventListener("voucher_data_deleted", handleVoucherDeleted);
    return () => {
      window.removeEventListener("purchase_order_data_updated", handlePOUpdate);
      window.removeEventListener("purchase_order_data_deleted", handlePOUpdate);
      window.removeEventListener(
        "purchase_order_option_data_updated",
        handleOptionUpdate,
      );
      window.removeEventListener(
        "purchase_order_option_data_deleted",
        handleOptionUpdate,
      );
      window.removeEventListener("voucher_data_updated", handleVoucherUpdated);
      window.removeEventListener("voucher_data_deleted", handleVoucherDeleted);
    };
  }, [mappingLoading]);

  const getPoDate = useCallback((po) => {
    return po.dtPurchaseOrderCreated || null;
  }, []);

  // ── Filter purely by itemPurchasingStatus (po.cStatus === selectedStatusCode) ──
  // No more open/closed/cancelled cart-status grouping — the status codes
  // ARE the item-purchasing statuses now (Cart, For Approval, For Payment, etc.)
  const filteredPurchaseOrders = useMemo(() => {
    // A PO "matches" a status if ANY of its options' latest history
    // has that nStatus — mirrors the sidebar count logic exactly.
    const poMatchesStatus = (po) => {
      if (String(po.nStatus) === String(selectedStatusCode)) {
        // A PO can still read For Delivery (150) after everything went out —
        // the delivered rows are pending approval so the status hasn't flipped
        // to Delivered yet. Once there is nothing left to deliver it belongs
        // to the Delivered tab only.
        if (String(selectedStatusCode) === String(forDeliveryKey)) {
          const opts = po.purchase_order_options || [];
          const anythingDelivered = opts.some((o) =>
            getDelivered(o.purchase_option) > 0,
          );
          const anythingLeft = opts.some((o) =>
            getToDeliver(o.purchase_option) > 0,
          );
          if (anythingDelivered && !anythingLeft) return false;
        }

        // Fully received → nothing left to receive, so the Pending Receipt
        // card would render with every row hidden (an empty card). The goods
        // are already on their way out, so it belongs to For Delivery /
        // Delivered instead.
        if (
          String(selectedStatusCode) === String(pendingReceiptKey) &&
          isFullyReceived(po.purchase_order_options)
        )
          return false;
        return true;
      }

      // A partially received PO stays "Pending Receipt" (140) until EVERY item
      // is received AND approved, but the part already received is waiting to
      // be delivered — so also list it under For Delivery.
      if (
        String(selectedStatusCode) === String(forDeliveryKey) &&
        String(po.nStatus) === String(pendingReceiptKey)
      ) {
        return (po.purchase_order_options || []).some((o) =>
          getToDeliver(o.purchase_option) > 0,
        );
      }

      // Same idea for Delivered: anything already delivered out is listed here
      // even though the PO itself is still Pending Receipt / For Delivery —
      // the delivered rows show inside the card, the rest stays in its own tab.
      if (
        String(selectedStatusCode) === String(deliveredKey) &&
        String(po.nStatus) !== String(cancelledPOKey)
      ) {
        return (po.purchase_order_options || []).some((o) =>
          getDelivered(o.purchase_option) > 0,
        );
      }
      return false;
    };

    let result = selectedStatusCode
      ? purchaseOrders.filter(poMatchesStatus)
      : purchaseOrders;

    // hide POs with no options at all — matches the sidebar count logic
    result = result.filter(
      (po) => (po.purchase_order_options?.length ?? 0) > 0,
    );

    if (!isManagement && !isFinanceOfficer) {
      result = result.filter((po) => {
        const opts = po.purchase_order_options || [];
        return opts.some((o) => {
          const txItem = o?.purchase_option?.transaction_item;
          const directAO = String(
            txItem?.nAssignedAO || txItem?.aoUserId || txItem?.nUserId,
          );
          const tx = txItem?.transaction;
          const txAO = String(
            tx?.nAssignedAO || tx?.aoUserId || tx?.nAssignedAOId,
          );
          return (
            directAO === String(currentUserId) || txAO === String(currentUserId)
          );
        });
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((po) => {
        if (String(po.nPurchaseOrderId).includes(q)) return true;
        if ((po.strPurchaseOrderNo ?? "").toLowerCase().includes(q))
          return true;
        return (po.purchase_order_options || []).some((o) => {
          const opt = o.purchase_option ?? {};
          const sup = opt.supplier ?? {};
          const txItem = opt.transaction_item ?? {};
          return [
            sup.strSupplierName,
            sup.strSupplierNickName,
            txItem.strName,
            opt.strBrand,
            opt.strModel,
            opt.strProductCode,
            opt.strSpecs,
          ].some((f) => f && String(f).toLowerCase().includes(q));
        });
      });
    }

    return result
      .slice()
      .sort((a, b) => new Date(getPoDate(b)) - new Date(getPoDate(a)));
  }, [
    purchaseOrders,
    selectedStatusCode,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,
    search,
    isManagement,
    isFinanceOfficer,
    currentUserId,
    getPoDate,
  ]);

  // ── Group the (already status-filtered) list purely by time period ──
  const groupedByPeriod = useMemo(() => {
    const result = {};
    TIME_PERIOD_ORDER.forEach((p) => {
      result[p] = [];
    });
    filteredPurchaseOrders.forEach((po) => {
      const period = getTimePeriod(getPoDate(po));
      if (!result[period]) result[period] = [];
      result[period].push(po);
    });
    return result;
  }, [filteredPurchaseOrders, getPoDate]);

  // viewStatus = the tab the card was clicked from, so VIEW opens the PO in
  // that same view (a partially received PO sits under For Delivery while its
  // own status is still Pending Receipt).
  const handleUpdateClick = ({ po, viewStatus }) => {
    const status = viewStatus
      ? `&status=${encodeURIComponent(String(viewStatus))}`
      : "";
    navigate(`/item-purchasing-update?id=${po.nPurchaseOrderId}${status}`);
  };

  // Expand All / Collapse All — the CARDS and the time-period SECTIONS move
  // together, so one press folds the whole list away (or opens it up).
  const toggleAllCollapsed = useCallback(() => {
    // allCollapsed === true means "collapsed" right now, so this press
    // EXPANDS.
    const expanding = allCollapsed;
    setAllCollapsed(!expanding);
    setSectionsExpanded(expanding);
  }, [allCollapsed]);

  return {
    itemsLoading,
    purchaseOrders,
    filteredPurchaseOrders,
    handleUpdateClick,
    search,
    setSearch,
    allCollapsed,
    setAllCollapsed,
    toggleAllCollapsed,
    sectionsExpanded,
    vouchersByPO,
    aoGmDirectory,
    currentUserId,
    forPurchaseStatus,
    itemPurchasingStatus,
    shippingMethod,
    paymentTerms,
    voucherStatus,
    voucherType,
    mappingLoading,
    isGeneralManager,
    isAccountOfficer,
    isAOTL,
    isManagement,
    isFinanceOfficer,
    selectedStatusCode,
    setSelectedStatusCode,
    cancelledPOKey,
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    removedFromCartKey,
    voucherActiveKey,
    voucherClosedKey,
    voucherSupplierTypeKey,
    fetchAllPurchaseOrders,
    getPoDate,

    groupedByPeriod,
  };
}
