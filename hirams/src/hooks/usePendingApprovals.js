// hooks/usePendingApprovals.js
// Three numbers — how many CLIENTS, SUPPLIERS, and PURCHASE-ORDER CARTS
// are still sitting at "For Approval". Feeds the dashboard's Needs
// Attention banners (one pill each), the 10-second bell, the sidebar's
// blinking rows and the section headers, so every surface counts from
// the same source. A fresh fetch on mount, kept current by the same
// realtime client/supplier/cart events the rest of the app listens to.
import { useEffect, useState } from "react";
import ClientAPI from "../api/endpoints/client.api.js";
import SupplierAPI from "../api/endpoints/supplier.api.js";
import PurchaseCartAPI from "../api/endpoints/purchase-cart.api.js";
import InventoryAPI from "../api/endpoints/inventory.api.js";
import TransactionAPI from "../api/endpoints/transaction.api.js";
import useKeysLabels from "./useKeysLabels.js";
import { countPendingJevGroups } from "../utils/helpers/pendingJevGroups.js";
import { getItem, setItem } from "../utils/storage/localStorage.js";

export default function usePendingApprovals(enabled = true) {
  const {
    forApprovalStatusKey,
    forApprovalKey,
    inventoryPendingKey,
    isManagement,
    isFinanceOfficer,
    isAO,
    isAOTL,
    isProcurement,
    isProcurementTL,
    transactionVerificationKey,
    forAssignmentKey,
    itemsVerificationKey,
    canvasVerificationKey,
    priceVerificationKey,
    priceApprovalKey,
  } = useKeysLabels();

  // Try to load cached initial values so the Needs Attention banner appears instantly
  const [pending, setPending] = useState(() => {
    return getItem("cached_pending_approvals", {
      clients: 0,
      suppliers: 0,
      carts: 0,
      pendingJev: 0,
      transactionVerification: 0,
      forAssignment: 0,
      itemsVerification: 0,
      canvasVerification: 0,
      priceVerification: 0,
      priceApproval: 0,
    });
  });

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    const fetchPending = async () => {
      const currentUser = getItem("user", {});
      const currentUserId = currentUser?.nUserId;

      let txnPromise = TransactionAPI.getAll();
      if (isAO || isAOTL) {
        txnPromise = TransactionAPI.getAccountOfficer(
          `nUserId=${currentUserId ?? 0}&isAOTL=${isAOTL ? 1 : 0}&fetchAll=${isAOTL ? 1 : 0}`,
        );
      } else if (isFinanceOfficer) {
        txnPromise = TransactionAPI.getFinance(`nUserId=${currentUserId ?? 0}`);
      } else if (isProcurement) {
        txnPromise = TransactionAPI.getProcurement(
          `nUserId=${currentUserId ?? 0}&isProcTL=${isProcurementTL ? 1 : 0}`,
        );
      }

      const [clientRes, supplierRes, cartRes, inventoryRes, txnRes] =
        await Promise.allSettled([
          ClientAPI.getClients(),
          SupplierAPI.getSuppliers(),
          PurchaseCartAPI.getAllPurchaseOrders(),
          InventoryAPI.getInventory(),
          txnPromise,
        ]);
      if (!mounted) return;
      const countPending = (list, key) =>
        key ? list.filter((r) => String(r.cStatus ?? r.nStatus) === String(key)).length : 0;

      const inventories =
        inventoryRes.status === "fulfilled"
          ? inventoryRes.value?.inventories ?? []
          : [];
      const transactions =
        txnRes.status === "fulfilled"
          ? (txnRes.value?.transactions ?? txnRes.value?.data ?? [])
          : [];

      // AO scoping logic for JEV
      const aoScope =
        isAO && !isAOTL && currentUserId != null
          ? { aoUserId: currentUserId }
          : {};

      // Helper for transaction stage counts
      const countTxn = (list, stageKey) => {
        if (!stageKey) return 0;
        const txnCode = (t) =>
          t ? String(t.current_status ?? t.latest_history?.nStatus ?? "") : "";

        if (isAOTL) {
          if (stageKey === forAssignmentKey) {
            return list.filter((t) =>
              ["200", "210", "220", "225", "230", "240", "245"].includes(txnCode(t)) &&
              (!t.nAssignedAO || String(t.nAssignedAO) === "0"),
            ).length;
          }
          if ([itemsVerificationKey, canvasVerificationKey].includes(stageKey)) {
            return list.filter((t) => txnCode(t) === String(stageKey)).length;
          }
          return 0;
        }
        if (isAO) {
          if ([itemsVerificationKey, canvasVerificationKey].includes(stageKey)) {
            return list.filter((t) => txnCode(t) === String(stageKey)).length;
          }
          return 0;
        }
        if (isProcurement) {
          if ([transactionVerificationKey, priceVerificationKey].includes(stageKey)) {
            return list.filter((t) => txnCode(t) === String(stageKey)).length;
          }
          return 0;
        }
        if (!isManagement) return 0;

        if (stageKey === forAssignmentKey) {
          return list.filter((t) =>
            ["200", "210", "220", "230", "240"].includes(txnCode(t)) &&
            (!t.nAssignedAO || String(t.nAssignedAO) === "0"),
          ).length;
        }
        return list.filter((t) => txnCode(t) === String(stageKey)).length;
      };

      const newPending = {
        clients:
          clientRes.status === "fulfilled"
            ? countPending(clientRes.value?.clients ?? [], forApprovalStatusKey)
            : 0,
        suppliers:
          supplierRes.status === "fulfilled"
            ? countPending(supplierRes.value?.suppliers ?? [], forApprovalStatusKey)
            : 0,
        carts:
          cartRes.status === "fulfilled"
            ? countPending(cartRes.value?.purchaseOrders ?? [], forApprovalKey)
            : 0,
        pendingJev: inventoryPendingKey
          ? countPendingJevGroups(
              inventories.filter(
                (i) => String(i.cStatus) === String(inventoryPendingKey),
              ),
              aoScope,
            )
          : 0,
        transactionVerification: countTxn(transactions, transactionVerificationKey),
        forAssignment: countTxn(transactions, forAssignmentKey),
        itemsVerification: countTxn(transactions, itemsVerificationKey),
        canvasVerification: countTxn(transactions, canvasVerificationKey),
        priceVerification: countTxn(transactions, priceVerificationKey),
        priceApproval: countTxn(transactions, priceApprovalKey),
      };

      setPending(newPending);
      setItem("cached_pending_approvals", newPending);
    };

    fetchPending();
    const events = [
      "client_data_updated",
      "client_data_deleted",
      "supplier_data_updated",
      "supplier_data_deleted",
      "purchase_order_data_updated",
      "purchase_order_data_deleted",
      "purchase_order_option_data_updated",
      "purchase_order_option_data_deleted",
      "cart_data_updated",
      "inventory_data_updated",
      "inventory_data_deleted",
      "txn_data_updated",
      "txn_data_deleted",
    ];
    events.forEach((e) => window.addEventListener(e, fetchPending));
    return () => {
      mounted = false;
      events.forEach((e) => window.removeEventListener(e, fetchPending));
    };
  }, [
    enabled,
    forApprovalStatusKey,
    forApprovalKey,
    inventoryPendingKey,
    isAO,
    isAOTL,
    isProcurement,
    isProcurementTL,
    transactionVerificationKey,
    forAssignmentKey,
    itemsVerificationKey,
    canvasVerificationKey,
    priceVerificationKey,
    priceApprovalKey,
  ]);

  return pending;
}
