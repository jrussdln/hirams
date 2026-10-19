import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TransactionAPI from "../../../api/endpoints/transaction.api.js";
import SupplierAPI from "../../../api/endpoints/supplier.api.js";
import PurchaseOptionAPI from "../../../api/endpoints/purchase-option.api.js";
import TransactionItemAPI from "../../../api/endpoints/transaction-item.api.js";
import JevAPI from "../../../api/endpoints/jev.api.js";
import PricingAPI from "../../../api/endpoints/pricing.api.js";
import DirectCostOptionAPI from "../../../api/endpoints/direct-cost-option.api.js";
import DirectCostAPI from "../../../api/endpoints/direct-cost.api.js";
import UserAPI from "../../../api/endpoints/user.api.js";
import useJevBalance from "../../shared/jev/hooks/useJevBalance.js";
import {
  getOptionStep,
  toPercent,
  MAX_STEP,
} from "../../../utils/helpers/purchaseProgress";

import useKeysLabels from "../../../hooks/useKeysLabels.js";
import { getDueDateColor } from "../../../utils/helpers/dueDateColor";
import { fmtPHP, fmtDate } from "../../../utils/formatters/formatter.js";
const mapSuppliers = (suppliers) =>
  suppliers.map((s) => ({
    label: s.strSupplierNickName || s.strSupplierName,
    value: s.nSupplierId,
    bEWT: s.bEWT,
    bVAT: s.bVAT,
    nickName: s.strSupplierNickName,
  }));

const getDueDateVariant = (dateStr) => {
  const color = getDueDateColor(dateStr);
  if (color === "red") return "danger";
  if (color === "orange") return "warn";
  return "default";
};

/* ─── HOOK ────────────────────────────────────────────────────────── */
export default function usePurchase() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const {
    transactionCode,
    transaction,
    selectedStatusCode,
    itemsManagementKey = "",
    itemsVerificationKey = "",
    forCanvasKey = "",
    canvasFinalizeKey = "",
    canvasVerificationKey = "",
    forAssignmentKey = "",
    procMode,
    itemType,
    statusTransaction,
    userTypes,
    isAOTL,
    isManagement,
    isAccountOfficer,
    canvasVerificationLabel,
    forCanvasLabel,
    finalizeKeyLabel,
    ao_status,
    draftKey = "",
    finalizeKey,
    transacstatus,
    itemsFinalizeKey,
    currentStatusLabel,
    isProcurement,
    isProcurementTL,
    proc_status,
    forCollectionKey = "",
    priceSettingKey = "",
    finalizeVerificationKey = "",
    priceFinalizeVerificationKey = "",
    currentUserId,
    priceApprovedKey = "",
    procPriceApprovedKey = "",
    forPurchaseKey = "",
    archiveStatus = {},
    closePoKey,
    crTypeKey,
    forPricingKey = "",
    priceVerificationKey = "",
    priceApprovalKey = "",
    procSource,
  } = state || {};
  const {
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,
    removedFromCartKey,
    jevPendingKey,
    isFinanceOfficer,
  } = useKeysLabels();
  const [items, setItems] = useState([]);
  const optionStatuses = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      (item.purchaseOptions || []).forEach((o) => {
        map[Number(o.nPurchaseItemId)] = o.nStatus ?? null;
      });
    });
    return map;
  }, [items]);

  const latestHistories = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      (item.purchaseOptions || []).forEach((o) => {
        map[Number(o.nPurchaseItemId)] =
          o.nStatus != null ? { nStatus: o.nStatus } : null;
      });
    });
    return map;
  }, [items]);
  const errorTimeoutsRef = useRef({});
  const scrollRef = useRef(null);

  const localUpdateRef = useRef(false);
  const localActionRef = useRef(false);
  const countdownRef = useRef(null);
  const fetchItemsRef = useRef(null);

  const [actionModal, setActionModal] = useState(null);
  const [activeTab, setActiveTab] = useState("purchase"); // was "canvas"
  const [statusChangedAlert, setStatusChangedAlert] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(true);

  const [suppliers, setSuppliers] = useState([]);
  const [cItemType, setCItemType] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedOptions, setExpandedOptions] = useState({});
  const [addingNewItem, setAddingNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [suggestionsItem, setSuggestionsItem] = useState(null);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [optionModalItemId, setOptionModalItemId] = useState(null);
  const [optionModalItem, setOptionModalItem] = useState(null);
  const [optionErrors, setOptionErrors] = useState({});

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [isCompareActive, setIsCompareActive] = useState(false);
  const [confirmDrPrint, setConfirmDrPrint] = useState(false);
  const [confirmSiPrint, setConfirmSiPrint] = useState(false);
  const [totalCollectibleValue, setTotalCollectibleValue] = useState(0);
  const [sellingPrices, setSellingPrices] = useState({});
  const [collectionTax, setCollectionTax] = useState(0);
  const [collectionEwt, setCollectionEwt] = useState(0);
  const [collectionRetention, setCollectionRetention] = useState(0);
  const [jev, setJev] = useState(null);
  const [jevLoading, setJevLoading] = useState(false);
  const [creatingJev, setCreatingJev] = useState(false);
  const [showJev, setShowJev] = useState(false);
  const [jevToggling, setJevToggling] = useState(false);
  const [directCostModalOpen, setDirectCostModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [assignMode, setAssignMode] = useState(null);
  const [accountOfficers, setAccountOfficers] = useState([]);
  const [assignProcurementModalOpen, setAssignProcurementModalOpen] =
    useState(false);
  const [procurementUsers, setProcurementUsers] = useState([]);
  /* ─── Derived Values ────────────────────────────────────────────────── */
  const statusCode = selectedStatusCode;
  const forCollection = forCollectionKey.includes(statusCode);

  const assignedAOName = (() => {
    const u = transaction?.user;
    if (!u) return "—";
    return (
      [
        u.strFName ?? "",
        u.strMName ? `${u.strMName.charAt(0).toUpperCase()}.` : "",
        u.strLName ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || "—"
    );
  })();

  const assignedAONo = transaction?.user?.strPhoneNo?.trim() || "—";

  const procNonCanvasStatus =
    (isProcurement || isManagement) &&
    (draftKey.includes(statusCode) ||
      finalizeKey?.includes(statusCode) ||
      finalizeVerificationKey?.includes(statusCode) ||
      priceApprovedKey?.includes(statusCode) ||
      procPriceApprovedKey?.includes(statusCode));

  const limitedContent =
    (!isProcurement && !Number(transaction?.nAssignedAO) > 0) ||
    procNonCanvasStatus;

  const isCanvasStatus =
    forCanvasKey.includes(statusCode) ||
    canvasVerificationKey.includes(statusCode);

  const showRevert = !isProcurement && forPurchaseKey.includes(statusCode);
  const crudItemsEnabled =
    !isProcurement && itemsManagementKey.includes(statusCode);

  const showPurchaseOptions =
    forCanvasKey.includes(statusCode) ||
    canvasFinalizeKey.includes(statusCode) ||
    canvasVerificationKey.includes(statusCode) ||
    forPurchaseKey.includes(statusCode) ||
    forCollectionKey.includes(statusCode);
  // const checkboxOptionsEnabled =
  //   !statusChangedAlert &&
  //   (forCanvasKey.includes(statusCode) || forPurchaseKey.includes(statusCode));
  // Canvas checkboxes should only be enabled while status is actually
  // "For Canvas"; purchase cart/edit buttons only while it's "For Purchase".
  // Previously this was one OR'd flag, so switching to the Canvas tab while
  // the transaction was in "For Purchase" status left canvas rows/checkboxes
  // enabled even though they shouldn't be interactive there.
  const canvasCheckboxOptionsEnabled =
    !statusChangedAlert && forCanvasKey.includes(statusCode);
  const purchaseCheckboxOptionsEnabled =
    !statusChangedAlert && forPurchaseKey.includes(statusCode);
  const hasAssignedAO = Number(transaction?.nAssignedAO) > 0;
  const isAssignedToMe =
    isManagement ||
    (currentUserId && transaction?.nAssignedAO
      ? String(currentUserId) === String(transaction.nAssignedAO)
      : false);
  const showReassignAO = isAOTL;
  const showReassignProcurement =
    forPurchaseKey.includes(statusCode) && (isManagement || isProcurementTL);
  const transactionHasABC =
    transaction?.dTotalABC && Number(transaction.dTotalABC) > 0;
  const totalItemsABC = items.reduce((sum, i) => sum + Number(i.abc || 0), 0);
  const anyItemHasABC =
    items.some((i) => Number(i.abc || 0) > 0) || items.length === 0;
  const totalABC = transactionHasABC
    ? Number(transaction.dTotalABC)
    : totalItemsABC;
  const procSourceLabel = procSource?.[transaction?.cProcSource] || null;

  const totalCanvas = items.reduce(
    (sum, item) =>
      sum +
      item.purchaseOptions
        .filter((o) => o.bIncluded)
        .reduce(
          (s, o) => s + Number(o.nQuantity || 0) * Number(o.dUnitPrice || 0),
          0,
        ),
    0,
  );

  const abcValue = `₱ ${fmtPHP(transactionHasABC ? transaction.dTotalABC : totalItemsABC)}`;
  const abcSub =
    (itemsManagementKey.includes(statusCode) ||
      itemsVerificationKey.includes(statusCode) ||
      forCanvasKey.includes(statusCode) ||
      canvasVerificationKey.includes(statusCode)) &&
    transactionHasABC &&
    totalItemsABC > 0
      ? `Items ₱${fmtPHP(totalItemsABC)}`
      : null;

  const statusChangedTooltip = statusChangedAlert
    ? "This transaction has been moved to a different status by another user. All actions are disabled."
    : "";

  const isTransactionOwner =
    currentUserId && transaction?.created_by_id
      ? String(currentUserId) === String(transaction.created_by_id)
      : false;
  const { totalPurchaseProgress, totalPurchaseBalance } = useMemo(() => {
    if (!items.length || !cartKey)
      return { totalPurchaseProgress: 0, totalPurchaseBalance: 0 };
    const keys = {
      cartKey,
      forApprovalKey,
      forPaymentKey,
      pendingReceiptKey,
      forDeliveryKey,
      deliveredKey,
    };

    let numerator = 0,
      denominator = 0,
      unpaidTotal = 0;
    items.forEach((item) => {
      (item.purchaseOptions || []).forEach((o) => {
        const optStatus = optionStatuses[Number(o.nPurchaseItemId)];
        const isPurchaseIncluded = Number(o.bPurchaseIncluded) === 1;
        const isIncluded =
          isPurchaseIncluded ||
          (o.bPurchaseIncluded == null && Number(o.bIncluded) === 1);
        if (isPurchaseIncluded) {
          const qty = Number(o.nQuantity || 0);
          const step = getOptionStep(optStatus, o, keys);
          numerator += qty * step;
          denominator += qty * MAX_STEP; // was: qty * 5
        }
        if (isIncluded) {
          const ordered = Number(o.nQuantity || 0);
          const deliveredQty = Number(o.nDeliveredQty || 0);
          const isPaidOrDone =
            (optStatus != null &&
              [forPaymentKey, pendingReceiptKey, forDeliveryKey, deliveredKey]
                .map(String)
                .includes(String(optStatus))) ||
            (ordered > 0 && deliveredQty >= ordered);
          if (!isPaidOrDone) unpaidTotal += ordered * Number(o.dUnitPrice || 0);
        }
      });
    });
    return {
      totalPurchaseProgress: toPercent(numerator, denominator), // replaces the Math.round(...) ternary
      totalPurchaseBalance: unpaidTotal,
    };
  }, [
    items,
    optionStatuses,
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
  ]);

  const abcValidation = useMemo(() => {
    if (itemsManagementKey.includes(statusCode)) {
      if (transactionHasABC && totalItemsABC > 0) {
        if (totalItemsABC > Number(transaction.dTotalABC))
          return `Items ABC total (₱${fmtPHP(totalItemsABC)}) exceeds Transaction ABC (₱${fmtPHP(transaction.dTotalABC)})`;
        if (totalItemsABC < Number(transaction.dTotalABC))
          return `Items ABC total (₱${fmtPHP(totalItemsABC)}) must equal Transaction ABC (₱${fmtPHP(transaction.dTotalABC)})`;
      }
      if (!transactionHasABC) {
        const missing = items.filter((i) => !i.abc || Number(i.abc) === 0);
        if (missing.length)
          return `All items must have an ABC value. Missing: ${missing.map((i) => `"${i.name}"`).join(", ")}`;
      }
    }
    if (isCanvasStatus && transactionHasABC) {
      if (totalCanvas > Number(transaction.dTotalABC || 0))
        return `Total Canvas (₱${fmtPHP(totalCanvas)}) exceeds Transaction ABC (₱${fmtPHP(transaction.dTotalABC)}). Please adjust the included purchase options.`;
      const overItems = items.filter((item) => {
        const tot = item.purchaseOptions
          .filter((o) => o.bIncluded)
          .reduce(
            (s, o) => s + Number(o.nQuantity || 0) * Number(o.dUnitPrice || 0),
            0,
          );
        return tot > Number(item.abc || 0);
      });
      if (anyItemHasABC && overItems.length)
        return `The following item(s) have canvas totals exceeding their ABC: ${overItems.map((i) => `"${i.name}"`).join(", ")}. Please adjust the included purchase options.`;
      if (totalItemsABC > Number(transaction.dTotalABC))
        return `Items ABC total (₱${fmtPHP(totalItemsABC)}) must not exceed Transaction ABC (₱${fmtPHP(transaction.dTotalABC)})`;
    }
    return null;
  }, [
    items,
    statusCode,
    transactionHasABC,
    totalItemsABC,
    totalCanvas,
    anyItemHasABC,
    isCanvasStatus,
  ]);

  const getEffectiveABC = useCallback(
    (item) => {
      const itemABC = Number(item.abc || 0);
      if (transactionHasABC && itemABC === 0) {
        const tQty = items.reduce((s, i) => s + Number(i.qty || 0), 0);
        return tQty > 0
          ? (Number(item.qty || 0) / tQty) * Number(transaction.dTotalABC || 0)
          : 0;
      }
      return itemABC;
    },
    [items, transactionHasABC, transaction],
  );

  const fetchSuppliers = async (force = false) => {
    const cached = sessionStorage.getItem("suppliers_cache");
    if (cached && !force) return setSuppliers(JSON.parse(cached));
    try {
      const res = await SupplierAPI.getAll();
      const opts = mapSuppliers(res.suppliers);
      sessionStorage.setItem("suppliers_cache", JSON.stringify(opts));
      setSuppliers(opts);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  const fetchItems = async ({ restoreScroll = false } = {}) => {
    if (!transaction?.nTransactionId) return;
    const savedScroll =
      restoreScroll && scrollRef.current ? scrollRef.current.scrollTop : 0;
    try {
      const res = await TransactionAPI.getItems(transaction.nTransactionId);
      setCItemType(
        res.cItemType && typeof res.cItemType === "object"
          ? Object.keys(res.cItemType)[0]
          : res.cItemType,
      );
      const loadedItems = (res.items || []).map((item) => ({
        ...item,
        purchaseOptions: item.purchaseOptions || [],
        optionsLoaded: true,
        optionsLoading: false,
      }));
      setItems(loadedItems);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setItemsLoading(false);
      if (restoreScroll && savedScroll > 0)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = savedScroll;
          }),
        );
    }
  };
  const setOptionErrorWithAutoHide = (optionId, message, duration = 3000) => {
    if (errorTimeoutsRef.current[optionId])
      clearTimeout(errorTimeoutsRef.current[optionId]);
    setOptionErrors((prev) => ({ ...prev, [optionId]: message }));
    errorTimeoutsRef.current[optionId] = setTimeout(() => {
      setOptionErrors((prev) => {
        const c = { ...prev };
        delete c[optionId];
        return c;
      });
      delete errorTimeoutsRef.current[optionId];
    }, duration);
  };

  const toggleSpecsRow = (id) =>
    setExpandedRows((p) => ({
      ...p,
      [id]: { specs: !p[id]?.specs, options: p[id]?.options || false },
    }));
  const toggleOptionsRow = (id) =>
    setExpandedRows((p) => ({
      ...p,
      [id]: { specs: p[id]?.specs || false, options: !p[id]?.options },
    }));
  const toggleOptionSpecs = (optionId) =>
    setExpandedOptions((p) => ({ ...p, [optionId]: !p[optionId] }));

  const handleCollapseAllToggle = () => {
    const anyOpen = Object.values(expandedRows).some(
      (r) => r?.specs || r?.options,
    );
    setExpandedRows(
      anyOpen
        ? {}
        : items.reduce((acc, item) => {
            acc[item.id] = { specs: true, options: showPurchaseOptions };
            return acc;
          }, {}),
    );
  };

  const handleToggleInclude = async (itemId, optionId, value) => {
    const item = items.find((i) => i.id === itemId);
    const option = item?.purchaseOptions.find((o) => o.id === optionId);
    if (!item || !option) return;

    if (value && Number(option.bAddOn) !== 1) {
      const currentIncludedQty = item.purchaseOptions
        .filter(
          (o) =>
            o.id !== optionId && o.bPurchaseIncluded && Number(o.bAddOn) !== 1,
        )
        .reduce((s, o) => s + Number(o.nQuantity || 0), 0);
      const newTotal = currentIncludedQty + Number(option.nQuantity || 0);
      if (newTotal > Number(item.qty || 0)) {
        setOptionErrorWithAutoHide(
          optionId,
          `${newTotal} / ${item.qty} ${item.uom} — exceeds item qty`,
        );
        return;
      }
    }

    localUpdateRef.current = true;
    const patch = (val) =>
      setItems((p) =>
        p.map((i) =>
          i.id === itemId
            ? {
                ...i,
                purchaseOptions: i.purchaseOptions.map((o) =>
                  o.id === optionId ? { ...o, bPurchaseIncluded: val } : o,
                ),
              }
            : i,
        ),
      );
    patch(value);
    try {
      await PurchaseOptionAPI.updateOption(optionId, {
        bPurchaseIncluded: value ? 1 : 0,
      });
    } catch {
      setOptionErrorWithAutoHide(optionId, "Failed to update.");
      patch(!value);
    } finally {
      setTimeout(() => {
        localUpdateRef.current = false;
      }, 500);
    }
  };

  const handleAfterAction = (newStatusCode) => {
    localActionRef.current = true;
    setActionModal(null);
    if (newStatusCode) {
      sessionStorage.setItem(
        isManagement
          ? "selectedStatusCode"
          : isProcurement
            ? "selectedProcStatusCode"
            : "selectedAOStatusCode",
        newStatusCode,
      );
    }
    navigate("/transaction");
  };

  const handleCompareClick = (item, selectedOption) => {
    setCompareData({
      itemId: item.id,
      itemName: item.name,
      quantity: item.qty,
      specs: item.specs,
      uom: item.uom,
      abc: item.abc,
      purchaseOptions: [
        {
          nPurchaseItemId: selectedOption.id,
          supplierId: selectedOption.nSupplierId,
          supplierName:
            selectedOption.supplierName || selectedOption.strSupplierName,
          supplierNickName:
            selectedOption.supplierNickName ||
            selectedOption.strSupplierNickName,
          quantity: selectedOption.nQuantity,
          uom: selectedOption.strUOM,
          brand: selectedOption.strBrand,
          model: selectedOption.strModel,
          unitPrice: selectedOption.dUnitPrice,
          specs: selectedOption.strSpecs,
          ewt: selectedOption.dEWT,
          included: !!selectedOption.bPurchaseIncluded,
        },
      ],
    });
    setIsCompareActive(true);
  };

  const handleBackFromCompare = () => {
    const itemId = compareData?.itemId;
    setIsCompareActive(false);
    setCompareData(null);
    setExpandedRows((prev) => ({
      ...prev,
      [itemId]: { specs: prev[itemId]?.specs || false, options: true },
    }));
  };

  const updateSpecs = async (id, specs, type = "option") => {
    if (type === "item") {
      await TransactionItemAPI.updateSpecs(id, { specs: specs ?? "" });
    } else {
      await PurchaseOptionAPI.updateSpecs(id, { specs: specs ?? "" });
    }
  };

  const deliveredOptions = useMemo(() => {
    const seenItemIds = new Set();
    const result = [];
    items.forEach((item) => {
      const deliveredOpts = (item.purchaseOptions || []).filter((o) => {
        const isFullyDelivered =
          String(optionStatuses[Number(o.nPurchaseItemId)]) ===
          String(deliveredKey);
        const hasPartialDelivery =
          Number(o.nDeliveredQty || 0) > 0 && o.deliveredRows?.length > 0;
        return isFullyDelivered || hasPartialDelivery;
      });
      if (deliveredOpts.length > 0 && !seenItemIds.has(item.id)) {
        seenItemIds.add(item.id);
        result.push({
          itemName: item.name,
          itemQty: deliveredOpts.reduce(
            (sum, o) =>
              sum +
              (o.deliveredRows || []).reduce(
                (s, r) => s + Number(r.nQuantity || 0),
                0,
              ),
            0,
          ),
          itemUOM: item.uom,
          itemSpecs: item.specs ?? "",
          options: deliveredOpts.map((o) => ({
            nPurchaseItemId: o.nPurchaseItemId,
            nPurchaseOrderId: o.nPurchaseOrderId ?? null,
            supplierName: o.supplierNickName || o.supplierName || "—",
            orderedQty: Number(o.nQuantity || 0),
            uom: o.strUOM || item.uom || "",
            receivedQty: Number(o.nInventoryQty || 0),
            deliveredQty: Number(o.nDeliveredQty || 0),
            deliveredRows: o.deliveredRows || [],
          })),
        });
      }
    });
    return result;
  }, [items, optionStatuses, deliveredKey]);

  const salesInvoiceItems = useMemo(() => {
    return items
      .map((item) => {
        const includedOpts = (item.purchaseOptions || []).filter(
          (o) =>
            Number(o.bPurchaseIncluded) === 1 ||
            (o.bPurchaseIncluded == null && Number(o.bIncluded) === 1),
        );
        if (!includedOpts.length) return null;

        const optsQty = includedOpts.reduce(
          (s, o) => s + Number(o.nQuantity || 0),
          0,
        );
        const itemQty = Number(item.qty || 0) || optsQty;

        // Unit SELLING price from the chosen pricing set (not purchase cost)
        const unitPrice = Number(sellingPrices[item.id] || 0);
        const totalPrice = unitPrice * itemQty;

        return {
          itemName: item.name,
          itemQty,
          itemUOM: item.uom,
          itemSpecs: item.specs ?? "",
          unitPrice,
          totalPrice,
        };
      })
      .filter(Boolean);
  }, [items, sellingPrices]);
  const collectionAmount =
    Math.round((Number(totalCollectibleValue || 0) + Number.EPSILON) * 100) /
    100;
  const jevBalance = useJevBalance(jev?.nJEVId, collectionAmount);
  const fetchJev = useCallback(async () => {
    if (!transaction?.nTransactionId) return;
    setJevLoading(true);
    try {
      const res = await TransactionAPI.getJev(transaction.nTransactionId);
      setJev(res?.jev ?? null);
    } catch (err) {
      console.error("Failed to fetch JEV:", err);
      setJev(null);
    } finally {
      setJevLoading(false);
    }
  }, [transaction?.nTransactionId]);

  const handleCreateJev = async () => {
    if (!transaction?.nTransactionId || creatingJev) return;
    setCreatingJev(true);
    try {
      const res = await TransactionAPI.createJev(transaction.nTransactionId);
      setJev(res?.jev ?? null);
      setShowJev(true);
    } catch (err) {
      console.error("Failed to create JEV:", err);
    } finally {
      setCreatingJev(false);
    }
  };
  const handleToggleJevFinalize = async () => {
    if (!jev?.nJEVId || jevToggling) return;
    setJevToggling(true);
    try {
      await JevAPI.update(jev.nJEVId, { cStatus: "toggle" });
      await fetchJev();
    } catch (err) {
      console.error("Failed to toggle JEV status:", err);
    } finally {
      setJevToggling(false);
    }
  };
  useEffect(() => {
    fetchJev();
  }, [fetchJev]);

  useEffect(() => {
    if (!jev?.nJEVId) return;
    const handler = (e) => {
      if (String(e.detail?.jevId) === String(jev.nJEVId)) fetchJev();
    };
    window.addEventListener("jev_entry_data_updated", handler);
    window.addEventListener("jev_entry_data_deleted", handler);
    return () => {
      window.removeEventListener("jev_entry_data_updated", handler);
      window.removeEventListener("jev_entry_data_deleted", handler);
    };
  }, [jev?.nJEVId, fetchJev]);
  /* ─── Effects ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!transaction?.nTransactionId) return;
    if (procNonCanvasStatus) {
      setItemsLoading(false);
      return;
    }
    Promise.all([fetchSuppliers(), fetchItems()]);
  }, [transaction, procNonCanvasStatus]);

  useEffect(() => {
    if (!transaction?.nTransactionId) return;

    const handlePurchaseOrderChange = (e) => {
      if (
        e.detail?.transactionId &&
        String(e.detail.transactionId) !== String(transaction.nTransactionId)
      ) {
        return;
      }
      fetchItemsRef.current?.();
    };

    window.addEventListener(
      "purchase_order_data_updated",
      handlePurchaseOrderChange,
    );
    window.addEventListener(
      "purchase_order_option_data_updated",
      handlePurchaseOrderChange,
    );

    return () => {
      window.removeEventListener(
        "purchase_order_data_updated",
        handlePurchaseOrderChange,
      );
      window.removeEventListener(
        "purchase_order_option_data_updated",
        handlePurchaseOrderChange,
      );
    };
  }, [transaction?.nTransactionId]);
  useEffect(() => {
    const cached = sessionStorage.getItem("ao_cache");
    if (cached) {
      setAccountOfficers(JSON.parse(cached));
      return;
    }
    UserAPI.getActiveAccountOfficers()
      .then((res) => {
        const list = res.accountOfficers || [];
        sessionStorage.setItem("ao_cache", JSON.stringify(list));
        setAccountOfficers(list);
      })
      .catch((err) => console.error("Error fetching AOs:", err));
  }, []);
  useEffect(() => {
    if (!transaction?.nTransactionId || !forCollection || directCostModalOpen)
      return;
    let active = true;

    (async () => {
      try {
        let options;
        const cached = sessionStorage.getItem("direct_cost_options_cache");
        if (cached) {
          options = JSON.parse(cached);
        } else {
          const r = await DirectCostOptionAPI.getDirectCostOptions();
          options = r.data || r || [];
          sessionStorage.setItem(
            "direct_cost_options_cache",
            JSON.stringify(options),
          );
        }

        const costsRes = await DirectCostAPI.getDirectCosts({
          nTransactionID: transaction.nTransactionId,
          withEWT: 1,
        });
        if (!active) return;

        const nameOf = (id) => {
          const f = options.find((o) => (o.nDirectCostOptionID || o.id) === id);
          return (f?.strName || f?.name || "").toLowerCase();
        };

        const costs = costsRes.directCosts || costsRes.data || costsRes || [];
        const totalEWT = Number(costsRes.totalEWT) || 0;

        let ewt = 0,
          ewtFound = false,
          retention = 0;
        costs.forEach((c) => {
          const name = nameOf(c.nDirectCostOptionID);
          const amt = Number(c.dAmount || 0);
          if (name === "ewt") {
            ewt += amt;
            ewtFound = true;
          } else if (name.startsWith("ret")) retention += amt;
        });

        setCollectionEwt(ewtFound && ewt > 0 ? ewt : totalEWT);
        setCollectionRetention(retention);
      } catch (err) {
        console.error("Failed to fetch EWT/Retention:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [transaction?.nTransactionId, forCollection, directCostModalOpen]);
  const fetchProcurementUsers = useCallback(async () => {
    try {
      const res = await UserAPI.getActiveProcurement();
      setProcurementUsers(res.procurement ?? res.data?.procurement ?? []);
    } catch (err) {
      console.error("Failed to fetch procurement users", err);
    }
  }, []);

  useEffect(() => {
    if (showReassignProcurement) fetchProcurementUsers();
  }, [showReassignProcurement, fetchProcurementUsers]);
  /* ✅ GLOBAL ITEM / OPTION EVENT LISTENERS — same pattern as useCanvas ✅ */
  useEffect(() => {
    if (!transaction?.nTransactionId) return;

    const handleItemUpdated = (e) => {
      if (
        e.detail?.transactionId &&
        String(e.detail.transactionId) !== String(transaction.nTransactionId)
      ) {
        return;
      }
      fetchItems({ restoreScroll: true });
    };

    const handleItemDeleted = (e) => {
      if (
        e.detail?.transactionId &&
        String(e.detail.transactionId) !== String(transaction.nTransactionId)
      ) {
        return;
      }
      if (e.detail?.transactionItemId) {
        setItems((prev) =>
          prev.filter(
            (i) => String(i.id) !== String(e.detail.transactionItemId),
          ),
        );
      }
    };

    window.addEventListener("transaction_item_data_updated", handleItemUpdated);
    window.addEventListener("transaction_item_data_deleted", handleItemDeleted);

    return () => {
      window.removeEventListener(
        "transaction_item_data_updated",
        handleItemUpdated,
      );
      window.removeEventListener(
        "transaction_item_data_deleted",
        handleItemDeleted,
      );
    };
  }, [transaction?.nTransactionId]);

  /* ✅ PURCHASE OPTION INCLUDE/EXCLUDE UPDATES — from global RealtimeProvider */
  useEffect(() => {
    if (!transaction?.nTransactionId) return;

    const handleOptionChange = (e) => {
      if (localUpdateRef.current) return;
      const eventTxId = String(e.detail?.transactionId);
      const currentTxId = String(transaction.nTransactionId);
      if (eventTxId !== currentTxId) return;
      fetchItems({ restoreScroll: true });
    };

    window.addEventListener("purchase_option_data_updated", handleOptionChange);
    return () =>
      window.removeEventListener(
        "purchase_option_data_updated",
        handleOptionChange,
      );
  }, [transaction?.nTransactionId]);

  /* ✅ SUPPLIER UPDATES — from global RealtimeProvider */
  useEffect(() => {
    const handleSupplierUpdate = () => fetchSuppliers(true);
    window.addEventListener("supplier_data_updated", handleSupplierUpdate);
    return () =>
      window.removeEventListener("supplier_data_updated", handleSupplierUpdate);
  }, []);

  /* ✅ TRANSACTION STATUS CHANGES — from global RealtimeProvider */
  useEffect(() => {
    if (!transaction?.nTransactionId) return;

    const handleTxnUpdated = (e) => {
      if (localActionRef.current) return;
      if (
        String(e.detail?.transactionId) !== String(transaction.nTransactionId)
      ) {
        return;
      }

      const action = e.detail?.action;
      const statusChangingActions = [
        "status_changed",
        "assigned",
        "reverted",
        "verified",
        "finalized",
      ];
      if (!statusChangingActions.includes(action)) return;

      const newStatus = e.detail?.transaction?.latest_history?.nStatus;
      if (newStatus && String(newStatus) === String(statusCode)) return;

      setStatusChangedAlert(true);
    };

    window.addEventListener("txn_data_updated", handleTxnUpdated);
    return () =>
      window.removeEventListener("txn_data_updated", handleTxnUpdated);
  }, [transaction?.nTransactionId, statusCode]);

  useEffect(() => {
    if (!statusChangedAlert) return;
    setCountdown(5);
    let current = 5;
    countdownRef.current = setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        clearInterval(countdownRef.current);
        navigate("/transaction");
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [statusChangedAlert, navigate]);

  useEffect(() => {
    fetchItemsRef.current = () => fetchItems({ restoreScroll: true });
  }, []);

  useEffect(() => {
    if (!transaction?.nTransactionId || !forCollection) return;
    let active = true;
    PricingAPI.getPricingSets(transaction.nTransactionId)
      .then((res) => {
        if (!active) return;
        const chosen = (res.data ?? []).find((s) => s.bChosen === 1);
        setTotalCollectibleValue(chosen?.totalSellingPrice ?? 0);
      })
      .catch((err) => {
        console.error("Failed to fetch chosen pricing set total:", err);
        if (active) setTotalCollectibleValue(0);
      });
    return () => {
      active = false;
    };
  }, [transaction?.nTransactionId, forCollection]);
  useEffect(() => {
    if (!transaction?.nTransactionId) return;
    let active = true;
    (async () => {
      try {
        const setsRes = await PricingAPI.getPricingSets(
          transaction.nTransactionId,
        );
        const chosen = (setsRes.data ?? []).find(
          (s) => s.bChosen === 1 || s.bChosen === true,
        );
        if (!chosen) {
          if (active) {
            setSellingPrices({});
            setCollectionTax(0);
          }
          return;
        }
        const res = await PricingAPI.getItemPricings(chosen.nPricingSetId);
        const map = {};
        let taxTotal = 0;
        (res.itemPricings || []).forEach((p) => {
          map[p.nTransactionItemId] = Number(p.dUnitSellingPrice || 0);
          taxTotal += Number(p.tax || 0);
        });
        if (active) {
          setSellingPrices(map);
          setCollectionTax(taxTotal);
        }
      } catch (err) {
        console.error("Failed to fetch unit selling prices:", err);
        if (active) {
          setSellingPrices({});
          setCollectionTax(0);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [transaction?.nTransactionId]);
  useEffect(() => {
    if (!transaction?.nTransactionId) return;
    const handler = () => fetchItemsRef.current?.();
    window.addEventListener("cart_data_updated", handler);
    window.addEventListener("inventory_data_updated", handler);
    return () => {
      window.removeEventListener("cart_data_updated", handler);
      window.removeEventListener("inventory_data_updated", handler);
    };
  }, [transaction?.nTransactionId]);
  return {
    transaction,
    transactionCode,
    statusCode,
    currentStatusLabel,
    isManagement,
    isProcurement,
    isProcurementTL,
    isAccountOfficer,
    isAOTL,
    limitedContent,
    isCanvasStatus,
    showRevert,
    crudItemsEnabled,
    showPurchaseOptions,
    canvasCheckboxOptionsEnabled,
    purchaseCheckboxOptionsEnabled,
    forCollection,
    transactionHasABC,
    totalItemsABC,
    totalABC,
    totalCanvas,
    abcValue,
    abcSub,
    abcValidation,
    procSourceLabel,
    statusChangedAlert,
    statusChangedTooltip,
    isTransactionOwner,
    totalPurchaseProgress,
    totalPurchaseBalance,
    totalCollectibleValue,
    assignedAOName,
    assignedAONo,
    items,
    itemsLoading,
    suppliers,
    cItemType,
    expandedRows,
    expandedOptions,
    addingNewItem,
    editingItem,
    entityToDelete,
    suggestionsItem,
    isSuggestionsModalOpen,
    editingOption,
    optionModalItemId,
    optionModalItem,
    optionErrors,
    optionStatuses,
    latestHistories,

    deliveryModalOpen,
    compareData,
    isCompareActive,
    confirmDrPrint,
    confirmSiPrint,
    directCostModalOpen,
    completeModalOpen,
    completeConfirmOpen,
    actionModal,
    activeTab,
    countdown,
    scrollRef,
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,
    removedFromCartKey,
    closePoKey,
    forPurchaseKey,
    forCanvasKey,
    canvasVerificationKey,
    forCollectionKey,
    archiveStatus,
    currentUserId,
    statusTransaction,
    itemType,
    procMode,
    canvasVerificationLabel,
    forCanvasLabel,
    finalizeKeyLabel,
    fmtPHP,
    fmtDate,
    getDueDateVariant,
    getEffectiveABC,
    fetchItems,
    toggleSpecsRow,
    toggleOptionsRow,
    toggleOptionSpecs,
    handleCollapseAllToggle,
    handleToggleInclude,
    handleAfterAction,
    handleCompareClick,
    handleBackFromCompare,
    updateSpecs,
    setActionModal,
    setActiveTab,
    setEntityToDelete,
    setSuggestionsItem,
    setIsSuggestionsModalOpen,
    setEditingItem,
    setAddingNewItem,
    setEditingOption,
    setOptionModalItemId,
    setOptionModalItem,
    setDeliveryModalOpen,
    setConfirmDrPrint,
    setConfirmSiPrint,
    setDirectCostModalOpen,
    setCompleteConfirmOpen,
    setCompleteModalOpen,
    setExpandedRows,
    deliveredOptions,
    salesInvoiceItems,
    assignedAOName,
    assignedAONo,
    ao_status,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    priceSettingKey,
    priceFinalizeVerificationKey,
    procSource,
    assignMode,
    setAssignMode,
    accountOfficers,
    hasAssignedAO,
    isAssignedToMe,
    showReassignAO,
    proc_status,
    showReassignProcurement,
    assignProcurementModalOpen,
    setAssignProcurementModalOpen,
    procurementUsers,
    jev,
    jevLoading,
    creatingJev,
    showJev,
    setShowJev,
    handleCreateJev,
    jevPendingKey,
    isFinanceOfficer,
    handleToggleJevFinalize,
    jevToggling,
    collectionTax,
    jevBalance,
    collectionEwt,
    collectionRetention,
  };
}
