import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SidebarItem from "../../sidebar/SidebarItem";
import SidebarSubmenu from "../../sidebar/SidebarSubmenu";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels.js";
import PurchaseCartAPI from "../../../../../../../api/endpoints/purchase-cart.api.js";
import { getItem, setItem } from "../../../../../../../utils/storage/localStorage";
import { getToDeliver, getDelivered } from "../../../../../../../utils/helpers/purchaseProgress.js";
import {
  getTimePeriod,
  isFullyReceived,
  TIME_PERIOD_ORDER,
} from "../../../../../../../pages/shared/item-purchasing/useItemPurchasing.js";

const SESSION_KEY = "selectedItemPurchasingStatusCode";
// '110' => 'Cart', //Open Cart
//     '120' => 'For Approval', //Closed on Cart
//     '130' => 'For Payment', //Closed on PO
//     '140' => 'Pending Receipt', //Closed on Paid
//     '150' => 'For Delivery', //Closed on Received
//     '160' => 'Delivered', //Closed on Delivered
//     '170' => 'Cancelled' //Cancelled
// Returns true if this purchase-order option is assigned to the given AO.
// Same expression the list view's AO filter uses — any drift here makes the
// badge disagree with the cards on screen.
function isAssignedToAO(option, aoUserId) {
  if (aoUserId === undefined || aoUserId === null || aoUserId === "")
    return false;
  const target = String(aoUserId);

  const txItem = option?.purchase_option?.transaction_item;
  const directAO = String(
    txItem?.nAssignedAO || txItem?.aoUserId || txItem?.nUserId,
  );
  const tx = txItem?.transaction;
  const txAO = String(tx?.nAssignedAO || tx?.aoUserId || tx?.nAssignedAOId);

  return directAO === target || txAO === target;
}

// For Delivery / Delivered render ONE card per transaction — every PO whose
// options share a transaction code is merged into a single CartCardForDelivery
// (still bucketed by time period, so a transaction spanning periods gets a card
// in each). The badge has to count those cards, not the POs behind them.
const countCards = (matchingPOs, code, forDeliveryKey, deliveredKey) => {
  const isDeliveryTab =
    String(code) === String(forDeliveryKey) ||
    String(code) === String(deliveredKey);

  if (!isDeliveryTab) return matchingPOs.length;

  const isForDeliveryTab = String(code) === String(forDeliveryKey);
  const isDeliveredTab = String(code) === String(deliveredKey);
  const groupQualifies = (entries) =>
    isForDeliveryTab
      ? entries.some(({ opt }) => getToDeliver(opt?.purchase_option) > 0)
      : isDeliveredTab
        ? entries.some(({ opt }) => getDelivered(opt?.purchase_option) > 0)
        : true;

  const out = {};
  for (const period of TIME_PERIOD_ORDER) {
    const pos = matchingPOs.filter(
      (po) => getTimePeriod(po.dtPurchaseOrderCreated || null) === period
    );
    if (!pos.length) continue;
    const byKey = new Map();
    for (const po of pos) {
      for (const opt of po.purchase_order_options || []) {
        const tx = opt?.purchase_option?.transaction_item?.transaction;
        const key = String(
          tx?.strCode || tx?.nTransactionId || `po-${po.nPurchaseOrderId}`,
        );
        let group = byKey.get(key);
        if (!group) {
          group = { key, entries: [] };
          byKey.set(key, group);
        }
        group.entries.push({ po, opt });
      }
    }
    out[period] = [...byKey.values()].filter((g) =>
      groupQualifies(g.entries),
    );
  }

  let totalCards = 0;
  for (const period of TIME_PERIOD_ORDER) {
    totalCards += (out[period] || []).length;
  }
  return totalCards;
};

const ItemPurchasingNavSection = ({
  collapsed,
  forceExpanded,
  onItemClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    itemPurchasingStatus,
    itemPurchasingStatusFinance,
    loading: mappingLoading,
    isManagement,
    isFinanceOfficer,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,
  } = useKeysLabels();

  const safeItemPurchasingStatus =
    (isManagement
      ? itemPurchasingStatus
      : isFinanceOfficer
        ? itemPurchasingStatusFinance
        : itemPurchasingStatus) || {};

  const entries = Object.entries(safeItemPurchasingStatus);
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() => {
    const saved = getItem(SESSION_KEY);
    return saved || firstCode;
  });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  const isOnPage =
    location.pathname === "/item-purchasing" ||
    location.pathname === "/item-purchasing-update" ||
    location.pathname === "/preview-po" ||
    location.pathname === "/quantity-history";

  const [viewingCode, setViewingCode] = useState(null);
  const activeCode =
    location.pathname === "/item-purchasing-update" && viewingCode
      ? viewingCode
      : selectedCode;
  const currentUserId = useMemo(() => getItem("user")?.nUserId, []);
  // ── Sync status from localStorage ──
  useEffect(() => {
    const saved = getItem(SESSION_KEY);
    if (saved && saved !== selectedCode) setSelectedCode(saved);
    if (!saved && firstCode) {
      setItem(SESSION_KEY, firstCode);
      setSelectedCode(firstCode);
    }
  }, [location.key, firstCode, selectedCode]);

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (code) setViewingCode(String(code));
    };
    window.addEventListener("viewing_po_status", handler);
    return () => window.removeEventListener("viewing_po_status", handler);
  }, []);

  // clear it once we leave the update page, so it doesn't leak into the list view
  useEffect(() => {
    if (location.pathname !== "/item-purchasing-update") setViewingCode(null);
  }, [location.pathname]);
  // ── Fetch purchase orders ──
  const fetchPurchaseOrders = useCallback(
    async (silent = false) => {
      if (mappingLoading) return;
      if (!silent) setCountLoading(true);
      try {
        const res = await PurchaseCartAPI.getAllPurchaseOrders();
        setPurchaseOrders(res.purchaseOrders || []);
      } catch (err) {
        console.error("Sidebar cart (PO) fetch error:", err);
      } finally {
        if (!silent) setCountLoading(false);
      }
    },
    [mappingLoading],
  );

  const fetchRef = useRef(fetchPurchaseOrders);
  useEffect(() => {
    fetchRef.current = fetchPurchaseOrders;
  }, [fetchPurchaseOrders]);

  useEffect(() => {
    if (!mappingLoading) fetchPurchaseOrders(false);
  }, [mappingLoading, fetchPurchaseOrders]);

  // ── Realtime updates ──
  useEffect(() => {
    const handlePOUpdated = () => fetchRef.current(true);
    const handlePODeleted = (e) => {
      const id = e.detail?.purchaseOrderId;
      if (id) {
        setPurchaseOrders((prev) =>
          prev.filter((po) => po.nPurchaseOrderId !== id),
        );
      } else {
        fetchRef.current(true);
      }
    };
    const handleOptionUpdated = () => fetchRef.current(true);

    window.addEventListener("purchase_order_data_updated", handlePOUpdated);
    window.addEventListener("purchase_order_data_deleted", handlePODeleted);
    window.addEventListener(
      "purchase_order_option_data_updated",
      handleOptionUpdated,
    );
    window.addEventListener(
      "purchase_order_option_data_deleted",
      handleOptionUpdated,
    );
    window.addEventListener("cart_data_updated", handlePOUpdated);

    return () => {
      window.removeEventListener(
        "purchase_order_data_updated",
        handlePOUpdated,
      );
      window.removeEventListener(
        "purchase_order_data_deleted",
        handlePODeleted,
      );
      window.removeEventListener(
        "purchase_order_option_data_updated",
        handleOptionUpdated,
      );
      window.removeEventListener(
        "purchase_order_option_data_deleted",
        handleOptionUpdated,
      );
      window.removeEventListener("cart_data_updated", handlePOUpdated);
    };
  }, []);

  // ── Handle status click ──
  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/item-purchasing");
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("cart_status_changed", { detail: { code } }),
      );
    },
    [navigate, onItemClick],
  );

  const handleParentClick = useCallback(() => {
    if (firstCode) handleSelect(firstCode);
  }, [firstCode, handleSelect]);

  if (mappingLoading) return null;

  return (
    <div className="flex flex-col w-full ">
      <SidebarItem
        icon={<ShoppingCartIcon fontSize="small" />}
        label="Item Purchasing"
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? (
          entries.map(([code, label]) => {
            // Same membership rules as filteredPurchaseOrders in the list
            // view, minus the search box — the badge is not affected by it.
            const matching = purchaseOrders.filter((po) => {
              const opts = po.purchase_order_options;
              if (!opts?.length) return false;

              const sameStatus = String(po.nStatus) === String(code);
              // Mirrors the list view: a partially received PO (still Pending
              // Receipt) is also listed — and counted — under For Delivery.
              const receivedWaitingDelivery =
                String(code) === String(forDeliveryKey) &&
                String(po.nStatus) === String(pendingReceiptKey) &&
                opts.some((o) => getToDeliver(o.purchase_option) > 0);
              // Mirrors the list view: a PO with part of it already delivered
              // is also listed — and counted — under Delivered.
              const alreadyDelivered =
                String(code) === String(deliveredKey) &&
                String(po.nStatus) !== String(cancelledPOKey) &&
                opts.some((o) => getDelivered(o.purchase_option) > 0);
              if (!sameStatus && !receivedWaitingDelivery && !alreadyDelivered)
                return false;

              // A PO can still read For Delivery (150) after everything went
              // out — the delivered rows are pending approval so the status
              // hasn't flipped to Delivered yet. Nothing left to deliver →
              // it belongs to the Delivered tab only.
              if (
                String(code) === String(forDeliveryKey) &&
                opts.some((o) => getDelivered(o.purchase_option) > 0) &&
                !opts.some((o) => getToDeliver(o.purchase_option) > 0)
              )
                return false;

              // Fully received → nothing left to receive, so the Pending
              // Receipt card would show every row hidden. It already sits
              // under For Delivery / Delivered, so drop it from this badge.
              if (
                String(code) === String(pendingReceiptKey) &&
                isFullyReceived(opts)
              )
                return false;

              return isManagement || isFinanceOfficer
                ? true
                : opts.some((o) => isAssignedToAO(o, currentUserId));
            });

            const count = countCards(
              matching,
              code,
              forDeliveryKey,
              deliveredKey,
            );
            return (
              <SidebarSubmenu
                key={code}
                label={label}
                active={isOnPage && activeCode === String(code)}
                count={count}
                countLoading={countLoading}
                onClick={() => handleSelect(String(code))}
              />
            );
          })
        ) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No cart statuses found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default ItemPurchasingNavSection;
