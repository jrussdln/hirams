import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SupplierAPI from "../../../api/endpoints/supplier.api.js";
import TransactionAPI from "../../../api/endpoints/transaction.api.js";
import PurchaseOptionAPI from "../../../api/endpoints/purchase-option.api.js";
import TransactionItemAPI from "../../../api/endpoints/transaction-item.api.js";
import UserAPI from "../../../api/endpoints/user.api.js";
import PricingAPI from "../../../api/endpoints/pricing.api.js";
import DirectCostAPI from "../../../api/endpoints/direct-cost.api.js";
import DirectCostOptionAPI from "../../../api/endpoints/direct-cost-option.api.js";
import { arrayMove } from "@dnd-kit/sortable";
import { fmtDate, fmtPHP } from "../../../utils/formatters/formatter.js";
import { getDueDateColor } from "../../../utils/helpers/dueDateColor";
import { ewtOfOption } from "../../../utils/helpers/calculateEWT.js";
import { NO_TRANSACTION_ABC } from "../../../constants/tableDataFallbacks";

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

export default function useCanvas() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const errorTimeoutsRef = useRef({});
  const scrollRef = useRef(null);

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
    procSource,
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
    proc_status,
    priceSettingKey = "",
    finalizeVerificationKey = "",
    priceFinalizeVerificationKey = "",
    currentUserId,
    priceApprovedKey = "",
    procPriceApprovedKey = "",
    archiveStatus = {},
    forPricingKey = "",
    priceVerificationKey = "",
    priceApprovalKey = "",
  } = state || {};

  /* ── State ── */
  const [actionModal, setActionModal] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedOptions, setExpandedOptions] = useState({});
  const [isCompareActive, setIsCompareActive] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [cItemType, setCItemType] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [optionModalItemId, setOptionModalItemId] = useState(null);
  const [optionModalItem, setOptionModalItem] = useState(null);
  const [addingNewItem, setAddingNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [assignMode, setAssignMode] = useState(null);
  const [accountOfficers, setAccountOfficers] = useState([]);
  const [optionErrors, setOptionErrors] = useState({});
  const [suggestionsItem, setSuggestionsItem] = useState(null);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [isExportCanvasOpen, setIsExportCanvasOpen] = useState(false);
  const [isCostBreakdownOpen, setIsCostBreakdownOpen] = useState(false);
  const [pricingSet, setPricingSet] = useState(null);
  const [pricingItems, setPricingItems] = useState([]);
  const [unitSellingPrices, setUnitSellingPrices] = useState({});
  const [pricingTaxes, setPricingTaxes] = useState({});
  const [statusChangedAlert, setStatusChangedAlert] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const localUpdateRef = useRef(false);
  const localActionRef = useRef(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [directCostModalOpen, setDirectCostModalOpen] = useState(false);
  const [pendingFinalizeAction, setPendingFinalizeAction] = useState(null);
  const [directCostCheckOpen, setDirectCostCheckOpen] = useState(false);
  const [existingDirectCosts, setExistingDirectCosts] = useState([]);
  const [directCostOptions, setDirectCostOptions] = useState([]);
  const [activeTab, setActiveTab] = useState("canvas");

  /* ── Flags & Computed ── */
  const isPriceApprovedStatus =
    priceApprovedKey?.includes(selectedStatusCode) ||
    procPriceApprovedKey?.includes(selectedStatusCode);

  const isArchiveView = state?.isArchiveView ?? false;

  const procNonCanvasStatus =
    isArchiveView ||
    ((isProcurement || isManagement) &&
      (draftKey.includes(selectedStatusCode) ||
        finalizeKey?.includes(selectedStatusCode) ||
        finalizeVerificationKey?.includes(selectedStatusCode) ||
        priceApprovedKey?.includes(selectedStatusCode) ||
        procPriceApprovedKey?.includes(selectedStatusCode)));

  const showCostBreakdown =
    priceApprovedKey?.includes(selectedStatusCode) ||
    procPriceApprovedKey?.includes(selectedStatusCode);

  const hasAssignedAO = Number(transaction?.nAssignedAO) > 0;

  // "For Assignment" status needs special handling: it should never
  // trigger the "limited content" (headerRight-hiding) treatment,
  // and its default tab depends on whether an AO has been assigned yet.
  const isForAssignmentStatus = forAssignmentKey.includes(selectedStatusCode);

  const limitedContent =
    !isForAssignmentStatus &&
    ((!isProcurement && !hasAssignedAO) || procNonCanvasStatus);

  const isDraftOrFinalizeStatus =
    draftKey.includes(selectedStatusCode) ||
    finalizeKey?.includes(selectedStatusCode) ||
    finalizeVerificationKey?.includes(selectedStatusCode) ||
    (isForAssignmentStatus && !hasAssignedAO);

  useEffect(() => {
    if (isArchiveView) {
      setActiveTab("info"); // or "canvas" — your call
      return;
    }
    if (isForAssignmentStatus) {
      // No AO yet → show transaction info. AO assigned → show canvas.
      setActiveTab(hasAssignedAO ? "canvas" : "info");
      return;
    }
    // ✅ Price Approved → default to Awarding tab (rightmost header button)
    if (isPriceApprovedStatus) {
      setActiveTab("info");
      return;
    }
    setActiveTab(isDraftOrFinalizeStatus ? "info" : "canvas");
  }, [
    transaction?.nTransactionId,
    isDraftOrFinalizeStatus,
    isForAssignmentStatus,
    hasAssignedAO,
    isPriceApprovedStatus, // ← add this to dependency array
  ]);
  const showForAssignment =
    forAssignmentKey.includes(selectedStatusCode) && (isAOTL || isManagement);
  const showPurchaseOptions =
    forCanvasKey.includes(selectedStatusCode) ||
    canvasFinalizeKey.includes(selectedStatusCode) ||
    canvasVerificationKey.includes(selectedStatusCode) ||
    priceApprovedKey?.includes(selectedStatusCode) ||
    procPriceApprovedKey?.includes(selectedStatusCode);

  const crudItemsEnabled = itemsManagementKey.includes(selectedStatusCode);
  const showAddButton = crudItemsEnabled;
  const checkboxOptionsEnabled =
    !statusChangedAlert && forCanvasKey.includes(selectedStatusCode);
  const isCanvasStatus =
    forCanvasKey.includes(selectedStatusCode) ||
    canvasVerificationKey.includes(selectedStatusCode);
  const isItemsManagementStatus =
    itemsManagementKey.includes(selectedStatusCode);

  const showVerify =
    !isCompareActive &&
    (itemsVerificationKey?.includes(selectedStatusCode) ||
      canvasVerificationKey?.includes(selectedStatusCode) ||
      (finalizeKey?.includes(selectedStatusCode) && isManagement) ||
      (isProcurement &&
        (finalizeVerificationKey?.includes(selectedStatusCode) ||
          priceFinalizeVerificationKey?.includes(selectedStatusCode))));

  const showFinalize =
    (isProcurement &&
      (itemsManagementKey.includes(selectedStatusCode) ||
        draftKey.includes(selectedStatusCode))) ||
    (isManagement &&
      (draftKey.includes(selectedStatusCode) ||
        priceSettingKey.includes(selectedStatusCode)) &&
      (currentUserId && transaction?.created_by_id
        ? String(currentUserId) === String(transaction.created_by_id)
        : false)) ||
    (isAccountOfficer &&
      (forCanvasKey.includes(selectedStatusCode) ||
        itemsManagementKey.includes(selectedStatusCode)) &&
      !isCompareActive);

  const showForceFinalize =
    isManagement &&
    (itemsManagementKey.includes(selectedStatusCode) ||
      ((draftKey.includes(selectedStatusCode) ||
        priceSettingKey.includes(selectedStatusCode)) &&
        !(currentUserId && transaction?.created_by_id
          ? String(currentUserId) === String(transaction.created_by_id)
          : false)) ||
      (forCanvasKey.includes(selectedStatusCode) && !isCompareActive));

  const showRevert =
    !isCompareActive &&
    ((isProcurement &&
      !draftKey.includes(selectedStatusCode) &&
      !priceSettingKey.includes(selectedStatusCode)) ||
      (isManagement &&
        !forAssignmentKey.includes(selectedStatusCode) &&
        !draftKey.includes(selectedStatusCode)) ||
      (isAccountOfficer &&
        !forAssignmentKey.includes(selectedStatusCode) &&
        !itemsManagementKey.includes(selectedStatusCode)) ||
      (forAssignmentKey.includes(selectedStatusCode) &&
        !hasAssignedAO &&
        isManagement));

  const transactionHasABC =
    transaction?.dTotalABC && Number(transaction.dTotalABC) > 0;
  const totalItemsABC = items.reduce((sum, i) => sum + Number(i.abc || 0), 0);
  const anyItemHasABC =
    items.some((i) => Number(i.abc || 0) > 0) || items.length === 0;
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

  const totalIncludedQty = items.reduce(
    (sum, item) =>
      sum +
      item.purchaseOptions
        .filter((o) => o.bIncluded && Number(o.bAddOn) !== 1)
        .reduce((s, o) => s + Number(o.nQuantity || 0), 0),
    0,
  );

  const totalItemQty = items.reduce((sum, i) => sum + Number(i.qty || 0), 0);

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

  const abcValidation = useMemo(() => {
    if (itemsManagementKey.includes(selectedStatusCode)) {
      if (transactionHasABC && totalItemsABC > 0) {
        if (totalItemsABC > Number(transaction.dTotalABC))
          return `Items ABC total (₱${fmtPHP(totalItemsABC)}) exceeds Transaction ABC (₱${fmtPHP(transaction.dTotalABC)})`;
        if (totalItemsABC < Number(transaction.dTotalABC))
          return `Items ABC total (₱${fmtPHP(totalItemsABC)}) must equal Transaction ABC (₱${fmtPHP(transaction.dTotalABC)})`;
      }
      if (!transactionHasABC) {
        const missingABC = items.filter((i) => !i.abc || Number(i.abc) === 0);
        if (missingABC.length > 0)
          return `All items must have an ABC value. Missing: ${missingABC.map((i) => `"${i.name}"`).join(", ")}`;
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
      if (anyItemHasABC && overItems.length > 0)
        return `The following item(s) have canvas totals exceeding their ABC: ${overItems.map((i) => `"${i.name}"`).join(", ")}. Please adjust the included purchase options.`;
      if (totalItemsABC > Number(transaction.dTotalABC))
        return `Items ABC total (₱${fmtPHP(totalItemsABC)}) must not exceed Transaction ABC (₱${fmtPHP(transaction.dTotalABC)})`;
      return null;
    }
    return null;
  }, [
    items,
    selectedStatusCode,
    transactionHasABC,
    totalItemsABC,
    isCanvasStatus,
    totalCanvas,
    anyItemHasABC,
    transaction,
  ]);

  const shouldDisableFinalize = useMemo(() => {
    if (!isItemsManagementStatus)
      return (
        itemsLoading ||
        (totalIncludedQty !== totalItemQty && !showAddButton) ||
        Boolean(abcValidation)
      );
    if (isProcurement && draftKey.includes(selectedStatusCode))
      return itemsLoading;
    if (items.length === 0 || itemsLoading) return true;
    if (Boolean(abcValidation)) return true;
    if (transactionHasABC && totalItemsABC > 0)
      return totalItemsABC !== Number(transaction.dTotalABC);
    if (!transactionHasABC)
      return items.some((i) => !i.abc || Number(i.abc) === 0);
    return false;
  }, [
    itemsLoading,
    totalIncludedQty,
    totalItemQty,
    showAddButton,
    abcValidation,
    isItemsManagementStatus,
    isProcurement,
    draftKey,
    selectedStatusCode,
    items,
    transactionHasABC,
    totalItemsABC,
    transaction,
  ]);

  const finalizeBlockReason = useMemo(() => {
    if (items.length === 0)
      return "At least one item is required before finalizing";
    if (
      transactionHasABC &&
      totalItemsABC > 0 &&
      totalItemsABC !== Number(transaction.dTotalABC)
    )
      return `Items ABC total (₱${fmtPHP(totalItemsABC)}) must equal Transaction ABC (₱${fmtPHP(transaction.dTotalABC)})`;
    if (!transactionHasABC && items.some((i) => !i.abc || Number(i.abc) === 0))
      return "All items must have an ABC value before finalizing";
    if (abcValidation) return abcValidation;
    if (totalIncludedQty !== totalItemQty && !showAddButton)
      return "All item quantities must be fulfilled before finalizing";
    return "";
  }, [
    items,
    transactionHasABC,
    totalItemsABC,
    transaction,
    abcValidation,
    totalIncludedQty,
    totalItemQty,
    showAddButton,
  ]);

  const totalABC = transactionHasABC
    ? Number(transaction.dTotalABC)
    : items.reduce((s, i) => s + Number(i.abc || 0), 0);
  const abcValue = transactionHasABC
    ? Number(transaction.dTotalABC || 0) > 0
      ? `₱ ${fmtPHP(transaction.dTotalABC)}`
      : NO_TRANSACTION_ABC
    : Number(totalItemsABC || 0) > 0
      ? `₱ ${fmtPHP(totalItemsABC)}`
      : NO_TRANSACTION_ABC;
  const abcSub =
    (itemsManagementKey.includes(selectedStatusCode) ||
      itemsVerificationKey.includes(selectedStatusCode) ||
      forCanvasKey.includes(selectedStatusCode) ||
      canvasVerificationKey.includes(selectedStatusCode)) &&
    transactionHasABC &&
    totalItemsABC > 0
      ? `Items ₱${fmtPHP(totalItemsABC)}`
      : null;

  /* ── Data Fetchers ── */
  const fetchSuppliers = useCallback(async (force = false) => {
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
  }, []);

  const fetchItems = useCallback(
    async ({ restoreScroll = false } = {}) => {
      if (!transaction?.nTransactionId) return;
      const savedScroll =
        restoreScroll && scrollRef.current ? scrollRef.current.scrollTop : 0;
      try {
        const res = await TransactionAPI.getItems(transaction.nTransactionId);
        const itemTypeKey =
          res.cItemType && typeof res.cItemType === "object"
            ? Object.keys(res.cItemType)[0]
            : res.cItemType;
        setCItemType(itemTypeKey);
        setItems(
          (res.items || []).map((item) => ({
            ...item,
            purchaseOptions: item.purchaseOptions || [],
            optionsLoaded: true,
            optionsLoading: false,
          })),
        );
      } catch (err) {
        console.error("Error fetching items:", err);
      } finally {
        setItemsLoading(false);
        if (restoreScroll && savedScroll > 0) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (scrollRef.current) scrollRef.current.scrollTop = savedScroll;
            });
          });
        }
      }
    },
    [transaction],
  );

  const fetchAOs = useCallback(async () => {
    try {
      const res = await UserAPI.getActiveAccountOfficers();
      const list = res.accountOfficers || [];
      sessionStorage.setItem("ao_cache", JSON.stringify(list));
      setAccountOfficers(list);
    } catch (err) {
      console.error("Error fetching AOs:", err);
    }
  }, []);

  const fetchPricingData = useCallback(async () => {
    if (!transaction?.nTransactionId) return;
    try {
      const setRes = await PricingAPI.getPricingSets(
        transaction.nTransactionId,
      );
      const sets = setRes.data ?? [];
      const chosenSet = sets.find((s) => s.bChosen === 1 || s.bChosen === true);
      if (!chosenSet) return;
      const activeSet = {
        id: chosenSet.nPricingSetId,
        name: chosenSet.strName,
      };
      setPricingSet(activeSet);
      const itemsRes = await TransactionAPI.getItems(
        transaction.nTransactionId,
      );
      const shapedItems = (itemsRes.items || []).map((item) => ({
        ...item,
        purchaseOptions: (item.purchaseOptions || [])
          .filter((o) => o.bIncluded === 1 || o.bIncluded === true)
          .map((o) => ({
            id: o.id,
            nPurchaseItemId: o.nPurchaseItemId,
            nSupplierId: o.nSupplierId,
            supplierName: o.supplierName || o.strSupplierName,
            supplierNickName: o.supplierNickName || o.strSupplierNickName,
            nQuantity: o.nQuantity,
            strUOM: o.strUOM,
            strBrand: o.strBrand,
            strModel: o.strModel,
            dUnitPrice: o.dUnitPrice,
            strSpecs: o.strSpecs,
            // The EWT is DERIVED — see utils/helpers/calculateEWT.js
            dEWT: ewtOfOption(o),
            // The EWT TYPE - the formula the line's EWT is built from.
            cEWTType: o.cEWTType || "",
            bEWT: o.bEWT,
            bVAT: o.bVAT,
            cItemType: o.cItemType,
            bIncluded: o.bIncluded,
            bAddOn: o.bAddOn,
            dSuggestivePrice: o.dSuggestivePrice,
          })),
        optionsLoaded: true,
        optionsLoading: false,
      }));
      const priceRes = await PricingAPI.getItemPricings(activeSet.id);
      const pricesMap = {},
        taxMap = {};
      (priceRes.itemPricings || []).forEach((p) => {
        if (p.dUnitSellingPrice !== null && p.dUnitSellingPrice !== 0)
          pricesMap[p.nTransactionItemId] = p.dUnitSellingPrice;
        taxMap[p.nTransactionItemId] = p.tax ?? 0;
      });
      setPricingItems(shapedItems);
      setUnitSellingPrices(pricesMap);
      setPricingTaxes(taxMap);
    } catch (err) {
      console.error("fetchPricingData error:", err);
    }
  }, [transaction]);

  useEffect(() => {
    if (!transaction?.nTransactionId) return;
    // Archived view still needs items loaded for display — don't skip
    Promise.all([fetchSuppliers(), fetchItems()]);
  }, [transaction, fetchSuppliers, fetchItems]);

  useEffect(() => {
    if (!userTypes) return;
    const cached = sessionStorage.getItem("ao_cache");
    cached ? setAccountOfficers(JSON.parse(cached)) : fetchAOs();
  }, [userTypes, fetchAOs]);

  useEffect(() => {
    if (showCostBreakdown) fetchPricingData();
  }, [showCostBreakdown, fetchPricingData]);

  /* ✅ GLOBAL CUSTOM EVENT LISTENERS — NO ECHO HERE ✅ */
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
  }, [transaction, fetchItems]);
  /* ✅ PURCHASE OPTIONS REALTIME UPDATES — from global RealtimeProvider */
  useEffect(() => {
    if (!transaction?.nTransactionId) return;

    const handleOptionChange = (e) => {
      const eventTxId = String(e.detail?.transactionId);
      const currentTxId = String(transaction.nTransactionId);

      // ✅ Only refresh if event belongs to THIS transaction
      if (eventTxId !== currentTxId) return;

      console.log("[useCanvas] Purchase option changed → refreshing items ✅");
      fetchItems({ restoreScroll: true });
    };

    window.addEventListener("purchase_option_data_updated", handleOptionChange);
    return () =>
      window.removeEventListener(
        "purchase_option_data_updated",
        handleOptionChange,
      );
  }, [transaction?.nTransactionId, fetchItems]);
  /* ✅ SUPPLIER UPDATES — from global RealtimeProvider (force bypasses suppliers_cache) */
  useEffect(() => {
    const handleSupplierChange = () => fetchSuppliers(true);
    window.addEventListener("supplier_data_updated", handleSupplierChange);
    window.addEventListener("supplier_data_deleted", handleSupplierChange);
    return () => {
      window.removeEventListener(
        "supplier_data_updated",
        handleSupplierChange,
      );
      window.removeEventListener(
        "supplier_data_deleted",
        handleSupplierChange,
      );
    };
  }, [fetchSuppliers]);
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

      setStatusChangedAlert(true);
    };

    window.addEventListener("txn_data_updated", handleTxnUpdated);
    return () =>
      window.removeEventListener("txn_data_updated", handleTxnUpdated);
  }, [transaction?.nTransactionId]);
  useEffect(() => {
    if (!statusChangedAlert) return;
    setCountdown(5);
    let current = 5;
    countdownRef.current = setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        clearInterval(countdownRef.current);
        navigate(-1);
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [statusChangedAlert, navigate]);

  /* ── Handlers ── */
  const setOptionErrorWithAutoHide = useCallback(
    (optionId, message, duration = 3000) => {
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
    },
    [],
  );

  const toggleSpecsRow = useCallback(
    (id) =>
      setExpandedRows((prev) => ({
        ...prev,
        [id]: { specs: !prev[id]?.specs, options: prev[id]?.options || false },
      })),
    [],
  );

  const toggleOptionsRow = useCallback(
    (id) =>
      setExpandedRows((prev) => ({
        ...prev,
        [id]: { specs: prev[id]?.specs || false, options: !prev[id]?.options },
      })),
    [],
  );

  const toggleOptionSpecs = useCallback(
    (optionId) =>
      setExpandedOptions((prev) => ({ ...prev, [optionId]: !prev[optionId] })),
    [],
  );

  const handleCollapseAllToggle = useCallback(() => {
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
  }, [expandedRows, items, showPurchaseOptions]);

  const handleToggleInclude = useCallback(
    async (itemId, optionId, value) => {
      const item = items.find((i) => i.id === itemId);
      const option = item?.purchaseOptions.find((o) => o.id === optionId);
      if (!item || !option) return;
      if (value && Number(option.bAddOn) !== 1) {
        const currentIncludedQty = item.purchaseOptions
          .filter(
            (o) => o.id !== optionId && o.bIncluded && Number(o.bAddOn) !== 1,
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
      const flag = (val) =>
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  purchaseOptions: i.purchaseOptions.map((o) =>
                    o.id === optionId
                      ? { ...o, bIncluded: val, bPurchaseIncluded: val ? 1 : 0 }
                      : o,
                  ),
                }
              : i,
          ),
        );
      flag(value);
      try {
        await PurchaseOptionAPI.updateOption(optionId, {
          bIncluded: value ? 1 : 0,
          bPurchaseIncluded: value ? 1 : 0,
        });
      } catch {
        setOptionErrorWithAutoHide(optionId, "Failed to update.");
        flag(!value);
      } finally {
        setTimeout(() => {
          localUpdateRef.current = false;
        }, 500);
      }
      try {
        await PurchaseOptionAPI.updateOption(optionId, {
          bIncluded: value ? 1 : 0,
          bPurchaseIncluded: value ? 1 : 0,
        });
      } catch {
        setOptionErrorWithAutoHide(optionId, "Failed to update.");
      } finally {
        setTimeout(() => {
          localUpdateRef.current = false;
        }, 500);
      }
    },
    [items, setOptionErrorWithAutoHide],
  );

  const handleDragEnd = useCallback(
    async ({ active, over }) => {
      if (!over || active.id === over.id) return;
      const reordered = arrayMove(
        items,
        items.findIndex((i) => i.id === active.id),
        items.findIndex((i) => i.id === over.id),
      ).map((item, index) => ({ ...item, nItemNumber: index + 1 }));
      setItems(reordered);
      try {
        await TransactionItemAPI.updateOrder({
          items: reordered.map((i) => ({
            id: i.id,
            nItemNumber: i.nItemNumber,
          })),
        });
      } catch (err) {
        console.error("Failed to update order:", err);
      }
    },
    [items],
  );

  const handleFinalizeWithDirectCostCheck = useCallback(
    async (actionType) => {
      if (!forCanvasKey.includes(selectedStatusCode)) {
        setActionModal(actionType);
        return;
      }
      try {
        const [costsRes, optionsRes] = await Promise.all([
          DirectCostAPI.getByTransaction(
            transaction?.nTransactionId,
            "&withEWT=1",
          ),
          (async () => {
            const cached = sessionStorage.getItem("direct_cost_options_cache");
            if (cached) return JSON.parse(cached);
            const res = await DirectCostOptionAPI.getDirectCostOptions();
            const opts = res.data || res || [];
            sessionStorage.setItem(
              "direct_cost_options_cache",
              JSON.stringify(opts),
            );
            return opts;
          })(),
        ]);
        setExistingDirectCosts(
          costsRes.directCosts || costsRes.data || costsRes || [],
        );
        setDirectCostOptions(optionsRes);
        setPendingFinalizeAction(actionType);
        setDirectCostCheckOpen(true);
      } catch (err) {
        console.error("Failed to check direct costs:", err);
        setActionModal(actionType);
      }
    },
    [selectedStatusCode, forCanvasKey, transaction],
  );

  const handleCompareClick = useCallback((item, selectedOption) => {
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
          ewt: ewtOfOption(selectedOption),
          included: !!selectedOption.bIncluded,
        },
      ],
    });
    setIsCompareActive(true);
  }, []);

  const handleBackFromCompare = useCallback(async () => {
    const itemId = compareData?.itemId;
    setIsCompareActive(false);
    setCompareData(null);
    setActiveTab("canvas");
    setExpandedRows((prev) => ({
      ...prev,
      [itemId]: { specs: prev[itemId]?.specs || false, options: true },
    }));
  }, [compareData]);

  const updateSpecs = useCallback(async (id, specs, type = "option") => {
    try {
      const payload = { specs: specs ?? "" };
      if (type === "item") {
        await TransactionItemAPI.updateSpecs(id, payload);
      } else {
        await PurchaseOptionAPI.updateSpecs(id, payload);
      }
    } catch {}
  }, []);

  const handleAfterAction = useCallback(
    (newStatusCode) => {
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
      navigate(-1);
    },
    [isManagement, isProcurement, navigate],
  );

  const getDirectCostLabel = useCallback(
    (optionId) => {
      const found = directCostOptions.find(
        (o) => (o.nDirectCostOptionID || o.id) === optionId,
      );
      return found?.strName || found?.name || `Cost #${optionId ?? "?"}`;
    },
    [directCostOptions],
  );

  return {
    navigate,
    scrollRef,
    transaction,
    transactionCode,
    selectedStatusCode,
    statusTransaction,
    itemType,
    procMode,
    procSource,
    userTypes,
    isAOTL,
    isManagement,
    isAccountOfficer,
    isProcurement,
    currentUserId,
    archiveStatus,
    canvasVerificationLabel,
    forCanvasLabel,
    finalizeKeyLabel,
    ao_status,
    proc_status,
    transacstatus,
    itemsManagementKey,
    itemsVerificationKey,
    forCanvasKey,
    canvasFinalizeKey,
    canvasVerificationKey,
    forAssignmentKey,
    draftKey,
    finalizeKey,
    itemsFinalizeKey,
    priceSettingKey,
    finalizeVerificationKey,
    priceFinalizeVerificationKey,
    priceApprovedKey,
    procPriceApprovedKey,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    currentStatusLabel,
    activeTab,
    setActiveTab,
    isArchiveView,
    statusChangedAlert,
    countdown,
    actionModal,
    setActionModal,
    isCompareActive,
    setIsCompareActive,
    expandedRows,
    setExpandedRows,
    expandedOptions,
    setExpandedOptions,
    isCompareActive,
    itemsLoading,
    items,
    suppliers,
    compareData,
    setCompareData,
    cItemType,
    editingOption,
    optionModalItemId,
    optionModalItem,
    addingNewItem,
    editingItem,
    entityToDelete,
    assignMode,
    accountOfficers,
    optionErrors,
    suggestionsItem,
    isSuggestionsModalOpen,
    isExportCanvasOpen,
    isCostBreakdownOpen,
    pricingSet,
    pricingItems,
    unitSellingPrices,
    pricingTaxes,
    isStatusModalOpen,
    isArchiveModalOpen,
    directCostModalOpen,
    pendingFinalizeAction,
    directCostCheckOpen,
    existingDirectCosts,
    directCostOptions,
    showCostBreakdown,
    hasAssignedAO,
    limitedContent,
    isDraftOrFinalizeStatus,
    showForAssignment,
    showPurchaseOptions,
    crudItemsEnabled,
    showAddButton,
    checkboxOptionsEnabled,
    isCanvasStatus,
    isItemsManagementStatus,
    showVerify,
    showFinalize,
    showForceFinalize,
    showRevert,
    transactionHasABC,
    anyItemHasABC,
    procSourceLabel,
    totalCanvas,
    totalIncludedQty,
    totalItemQty,
    abcValidation,
    shouldDisableFinalize,
    finalizeBlockReason,
    totalABC,
    abcValue,
    abcSub,
    fmtPHP,
    fmtDate,
    getDueDateVariant,
    getEffectiveABC,
    fetchItems,
    setIsSuggestionsModalOpen,
    setSuggestionsItem,
    setAddingNewItem,
    setEditingItem,
    setEntityToDelete,
    setEditingOption,
    setOptionModalItemId,
    setOptionModalItem,
    setAssignMode,
    setIsExportCanvasOpen,
    setIsCostBreakdownOpen,
    setIsStatusModalOpen,
    setIsArchiveModalOpen,
    setDirectCostModalOpen,
    setDirectCostCheckOpen,
    handleCollapseAllToggle,
    toggleSpecsRow,
    toggleOptionsRow,
    toggleOptionSpecs,
    handleToggleInclude,
    handleDragEnd,
    handleCompareClick,
    handleBackFromCompare,
    updateSpecs,
    handleFinalizeWithDirectCostCheck,
    handleAfterAction,
    getDirectCostLabel,
  };
}
