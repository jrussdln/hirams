// hooks/useAttentionItems.js
// The Needs Attention pill list, shared by every dashboard that shows the
// banner. One entry per entity kind still sitting at "For Approval" —
// clients, suppliers, and purchase-order carts — each jumping straight
// to the page (pre-filtered) that resolves it. Counts come from the
// shared usePendingApprovals hook, so the banner, the sidebar's blinking
// rows, and the bell all agree.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useKeysLabels from "./useKeysLabels.js";
import usePendingApprovals from "./usePendingApprovals.js";
import { setItem } from "../utils/storage/localStorage.js";

export default function useAttentionItems(kinds) {
  // Which pills this dashboard cares about — defaults to all five.
  // Finance passes ["suppliers", "carts", "jev"]: it approves purchase
  // orders, shares supplier approvals with management, and acts on
  // Pending JEV inventory — but clients are purely management's call.
  const show = useMemo(
    () => new Set(kinds ?? ["clients", "suppliers", "carts", "jev", "transactions"]),
    [kinds],
  );
  const navigate = useNavigate();
  const {
    forApprovalStatusKey,
    forApprovalStatusLabel,
    forApprovalKey,
    forApprovalLabel,
    inventoryPendingKey,
    inventoryPendingLabel,
    transactionVerificationKey,
    transactionVerificationLabel,
    forAssignmentKey,
    forAssignmentLabel,
    itemsVerificationKey,
    itemsVerificationLabel,
    canvasVerificationKey,
    canvasVerificationLabel,
    priceVerificationKey,
    priceVerificationLabel,
    priceApprovalKey,
    priceApprovalLabel,
    transacstatus,
  } = useKeysLabels();
  const {
    clients: pendingClients,
    suppliers: pendingSuppliers,
    carts: pendingCarts,
    pendingJev,
    transactionVerification,
    forAssignment,
    itemsVerification,
    canvasVerification,
    priceVerification,
    priceApproval,
  } = usePendingApprovals();

  return useMemo(() => {
    const items = [];
    if (pendingClients > 0 && show.has("clients")) {
      items.push({
        key: "clients-for-approval",
        count: pendingClients,
        label: `${pendingClients === 1 ? "Client" : "Clients"} ${
          forApprovalStatusLabel || "For Approval"
        }`,
        // Same handoff the sidebar's status sub-items use: persist the
        // filter, land on the page, then announce the code so the view
        // (whichever mounts first) picks it up.
        onClick: () => {
          setItem("selectedClientStatusCode", forApprovalStatusKey);
          navigate("/client");
          window.dispatchEvent(
            new CustomEvent("client_status_changed", {
              detail: { code: forApprovalStatusKey },
            }),
          );
        },
      });
    }
    if (pendingSuppliers > 0 && show.has("suppliers")) {
      items.push({
        key: "suppliers-for-approval",
        count: pendingSuppliers,
        label: `${pendingSuppliers === 1 ? "Supplier" : "Suppliers"} ${
          forApprovalStatusLabel || "For Approval"
        }`,
        // Two keys to satisfy both readers: the supplier page inits
        // from selectedSupplierStatusCode, the sidebar nav from its own
        // (historically lower-cased) key.
        onClick: () => {
          setItem("selectedSupplierStatusCode", forApprovalStatusKey);
          setItem("selectedclientstatusCode", forApprovalStatusKey);
          navigate("/supplier");
          window.dispatchEvent(
            new CustomEvent("supplier_status_changed", {
              detail: { code: forApprovalStatusKey },
            }),
          );
        },
      });
    }
    if (pendingCarts > 0 && show.has("carts")) {
      items.push({
        key: "carts-for-approval",
        count: pendingCarts,
        label: `${pendingCarts === 1 ? "Cart" : "Carts"} ${
          forApprovalLabel || "For Approval"
        }`,
        // Same handoff the sidebar's Item Purchasing sub-items use.
        onClick: () => {
          setItem("selectedItemPurchasingStatusCode", forApprovalKey);
          navigate("/item-purchasing");
          window.dispatchEvent(
            new CustomEvent("cart_status_changed", {
              detail: { code: forApprovalKey },
            }),
          );
        },
      });
    }
    if (pendingJev > 0 && show.has("jev")) {
      items.push({
        key: "pending-jev",
        count: pendingJev,
        label: inventoryPendingLabel || "Pending JEV",
        // Same handoff the Inventory sidebar sub-items use.
        onClick: () => {
          setItem("selectedInventoryStatusCode", inventoryPendingKey);
          navigate("/inventory");
          window.dispatchEvent(
            new CustomEvent("inventory_status_changed", {
              detail: { code: inventoryPendingKey },
            }),
          );
        },
      });
    }

    const txnStages = [
      {
        key: "txn-verif",
        count: transactionVerification,
        code: transactionVerificationKey,
        label: transactionVerificationLabel || transacstatus?.[transactionVerificationKey] || "Transaction Stage",
      },
      {
        key: "for-assign",
        count: forAssignment,
        code: forAssignmentKey,
        label: forAssignmentLabel || transacstatus?.[forAssignmentKey] || "Transaction Stage",
      },
      {
        key: "items-verif",
        count: itemsVerification,
        code: itemsVerificationKey,
        label: itemsVerificationLabel || transacstatus?.[itemsVerificationKey] || "Transaction Stage",
      },
      {
        key: "canvas-verif",
        count: canvasVerification,
        code: canvasVerificationKey,
        label: canvasVerificationLabel || transacstatus?.[canvasVerificationKey] || "Transaction Stage",
      },
      {
        key: "price-verif",
        count: priceVerification,
        code: priceVerificationKey,
        label: priceVerificationLabel || transacstatus?.[priceVerificationKey] || "Transaction Stage",
      },
      {
        key: "price-approval",
        count: priceApproval,
        code: priceApprovalKey,
        label: priceApprovalLabel || transacstatus?.[priceApprovalKey] || "Transaction Stage",
      },
    ];

    txnStages.forEach((s) => {
      if (s.count > 0 && (show.has("transactions") || show.has(s.key))) {
        items.push({
          key: s.key,
          count: s.count,
          label: s.label,
          onClick: () => {
            setItem("selectedStatusCode", s.code);
            navigate("/transaction", { state: { selectedStatusCode: s.code } });
            window.dispatchEvent(
              new CustomEvent("txn_status_changed", {
                detail: { code: s.code },
              }),
            );
          },
        });
      }
    });

    return items;
  }, [
    show,
    pendingClients,
    pendingSuppliers,
    pendingCarts,
    pendingJev,
    transactionVerification,
    forAssignment,
    itemsVerification,
    canvasVerification,
    priceVerification,
    priceApproval,
    forApprovalStatusKey,
    forApprovalStatusLabel,
    forApprovalKey,
    forApprovalLabel,
    inventoryPendingKey,
    inventoryPendingLabel,
    transactionVerificationKey,
    transactionVerificationLabel,
    forAssignmentKey,
    forAssignmentLabel,
    itemsVerificationKey,
    itemsVerificationLabel,
    canvasVerificationKey,
    canvasVerificationLabel,
    priceVerificationKey,
    priceVerificationLabel,
    priceApprovalKey,
    priceApprovalLabel,
    transacstatus,
    navigate,
  ]);
}
