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

const SESSION_KEY = "selectedCartStatusCode";

// Returns true if this purchase-order option is assigned to the given AO.
function isAssignedToAO(option, aoUserId) {
  if (aoUserId === undefined || aoUserId === null || aoUserId === "")
    return false;
  const target = String(aoUserId);

  const txItem = option?.purchase_option?.transaction_item;
  const directAO = txItem?.nAssignedAO ?? txItem?.aoUserId ?? txItem?.nUserId;
  if (
    directAO !== undefined &&
    directAO !== null &&
    String(directAO) === target
  )
    return true;

  const tx = txItem?.transaction;
  const txAO = tx?.nAssignedAO ?? tx?.aoUserId ?? tx?.nAssignedAOId;
  if (txAO !== undefined && txAO !== null && String(txAO) === target)
    return true;

  return false;
}

const CartNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    cartStatus,
    loading: mappingLoading,
    isManagement,
  } = useKeysLabels();

  const safeCartStatus = cartStatus || {};
  const entries = Object.entries(safeCartStatus);
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() => {
    const saved = getItem(SESSION_KEY);
    return saved || firstCode;
  });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  const isOnPage =
    location.pathname === "/cart" ||
    location.pathname === "/purchase-cart-update";

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

  // ── Sync status changes ──
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code || code === selectedCode) return;
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
    };
    window.addEventListener("cart_status_changed", handler);
    return () => window.removeEventListener("cart_status_changed", handler);
  }, [selectedCode]);

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
    window.addEventListener("purchase_order_option_data_updated", handleOptionUpdated);
    window.addEventListener("purchase_order_option_data_deleted", handleOptionUpdated);
    window.addEventListener("cart_data_updated", handlePOUpdated);

    return () => {
      window.removeEventListener("purchase_order_data_updated", handlePOUpdated);
      window.removeEventListener("purchase_order_data_deleted", handlePODeleted);
      window.removeEventListener("purchase_order_option_data_updated", handleOptionUpdated);
      window.removeEventListener("purchase_order_option_data_deleted", handleOptionUpdated);
      window.removeEventListener("cart_data_updated", handlePOUpdated);
    };
  }, []);

  // ── Handle status click ──
  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/cart");
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
        label="Purchase Cart"
        autoOpen={isOnPage}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? entries.map(([code, label]) => {
          const count = purchaseOrders.filter((po) => {
            if (String(po.cStatus) !== String(code)) return false;
            if ((po.purchase_order_options?.length ?? 0) === 0) return false;
            if (!isManagement) {
              return po.purchase_order_options.some((o) =>
                isAssignedToAO(o, currentUserId),
              );
            }
            return true;
          }).length;

          return (
            <SidebarSubmenu
              key={code}
              label={label}
              active={isOnPage && selectedCode === String(code)}
              count={count}
              countLoading={countLoading}
              onClick={() => handleSelect(String(code))}
            />
          );
        }) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No cart statuses found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default CartNavSection;