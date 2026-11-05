import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import TransactionAPI from "../../../api/endpoints/transaction.api.js";
import PricingAPI from "../../../api/endpoints/pricing.api.js";
import { subscribeDynamicChannel } from "../../../realtime/dynamicChannel.js";
import { showSwal, withSpinner } from "../../../utils/helpers/swal";
import uiMessages from "../../../utils/helpers/uiMessages";
import { fmtPHP } from "../../../utils/formatters/formatter.js";
import * as localStorage from "../../../utils/storage/localStorage.js";

const isItemDirty = (id, unitSellingPrices, savedPrices) => {
  const toNum = (map) =>
    map[id] !== undefined && map[id] !== "" && map[id] !== null
      ? Number(map[id])
      : 0;
  return toNum(unitSellingPrices) !== toNum(savedPrices);
};

export default function usePricing() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const transaction = state?.transaction || null;
  const selectedSet = state?.selectedSet || null;
  const {
    isPricingSetting,
    currentStatusLabel,
    isManagement,
    itemType,
    procMode,
    procSource,
    statusTransaction,
  } = state || {};

  const [itemsLoading, setItemsLoading] = useState(() => {
    const txnId = state?.transaction?.nTransactionId;
    const setId = state?.selectedSet?.id;
    if (!txnId || !setId) return true;
    const itemsCacheKey = `pricing_items_${txnId}`;
    const pricingCacheKey = `pricing_pricings_${setId}`;
    return !localStorage.hasItem(itemsCacheKey) || !localStorage.hasItem(pricingCacheKey);
  });
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState(() => {
    const txnId = state?.transaction?.nTransactionId;
    if (!txnId) return [];
    const cacheKey = `pricing_items_${txnId}`;
    return localStorage.getItem(cacheKey, []);
  });
  const [unitSellingPrices, setUnitSellingPrices] = useState(() => {
    const setId = state?.selectedSet?.id;
    if (!setId) return {};
    const cacheKey = `pricing_pricings_${setId}`;
    const cached = localStorage.getItem(cacheKey, {});
    return cached?.unitSellingPrices || {};
  });
  const [savedPrices, setSavedPrices] = useState(() => {
    const setId = state?.selectedSet?.id;
    if (!setId) return {};
    const cacheKey = `pricing_pricings_${setId}`;
    const cached = localStorage.getItem(cacheKey, {});
    return cached?.savedPrices || {};
  });
  const [existingPricings, setExistingPricings] = useState(() => {
    const setId = state?.selectedSet?.id;
    if (!setId) return {};
    const cacheKey = `pricing_pricings_${setId}`;
    const cached = localStorage.getItem(cacheKey, {});
    return cached?.existingPricings || {};
  });
  const [lockedPricings, setLockedPricings] = useState(() => {
    const setId = state?.selectedSet?.id;
    if (!setId) return {};
    const cacheKey = `pricing_pricings_${setId}`;
    const cached = localStorage.getItem(cacheKey, {});
    return cached?.lockedPricings || {};
  });
  const [serverTax, setServerTax] = useState(() => {
    const setId = state?.selectedSet?.id;
    if (!setId) return {};
    const cacheKey = `pricing_pricings_${setId}`;
    const cached = localStorage.getItem(cacheKey, {});
    return cached?.serverTax || {};
  });
  const [serverSuggestive, setServerSuggestive] = useState(() => {
    const setId = state?.selectedSet?.id;
    if (!setId) return {};
    const cacheKey = `pricing_pricings_${setId}`;
    const cached = localStorage.getItem(cacheKey, {});
    return cached?.serverSuggestive || {};
  });
  const [statusChangedAlert, setStatusChangedAlert] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [activeTab, setActiveTab] = useState("pricing");
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedOptions, setExpandedOptions] = useState({});
  const [optionErrors, setOptionErrors] = useState({});

  const countdownRef = useRef(null);
  const localActionRef = useRef(false);
  const taxDebounceRef = useRef(null);

  const transactionHasABC =
    !!transaction?.dTotalABC && Number(transaction.dTotalABC) > 0;
  const clientNickName = state?.clientNickName || transaction?.clientName;
  const procSourceLabel = procSource?.[transaction?.cProcSource] || null;

  const hasUnsavedChanges = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(unitSellingPrices),
      ...Object.keys(savedPrices),
    ]);
    return [...allKeys].some((key) =>
      isItemDirty(key, unitSellingPrices, savedPrices),
    );
  }, [unitSellingPrices, savedPrices]);

  const getEffectiveABC = useCallback(
    (item) => {
      const itemABC = Number(item.abc || 0);
      if (itemABC > 0) return itemABC;
      if (!transactionHasABC) return 0;
      const totalQty = items.reduce((s, i) => s + Number(i.qty || 0), 0);
      return totalQty > 0
        ? (Number(item.qty || 0) / totalQty) *
            Number(transaction.dTotalABC || 0)
        : 0;
    },
    [items, transactionHasABC, transaction?.dTotalABC],
  );

  const getIncludedTotal = useCallback(
    (item) =>
      item.purchaseOptions
        .filter((o) => o.bIncluded)
        .reduce(
          (s, o) => s + Number(o.nQuantity || 0) * Number(o.dUnitPrice || 0),
          0,
        ),
    [],
  );

  const getUSP = useCallback(
    (item) => {
      const raw = unitSellingPrices[item.id];
      const effABC = getEffectiveABC(item);
      const maxUP =
        effABC > 0 && Number(item.qty || 0) > 0 ? effABC / Number(item.qty) : 0;
      return raw !== undefined && raw !== "" ? Number(raw) : maxUP;
    },
    [unitSellingPrices, getEffectiveABC],
  );

  const getTxABCBalance = useCallback(
    (targetItem) => {
      if (!transactionHasABC) return null;
      if (Number(targetItem.abc || 0) > 0) return null;
      const committed = items.reduce((s, item) => {
        if (item.id === targetItem.id || Number(item.abc || 0) > 0) return s;
        const raw = unitSellingPrices[item.id];
        return raw && !isNaN(Number(raw))
          ? s + Number(raw) * Number(item.qty || 0)
          : s;
      }, 0);
      return Math.max(0, Number(transaction.dTotalABC || 0) - committed);
    },
    [items, transactionHasABC, unitSellingPrices, transaction?.dTotalABC],
  );

  const getProfitForItem = useCallback(
    (item) => {
      const qty = Number(item.qty || 0);
      const capital = qty ? getIncludedTotal(item) / qty : 0;
      return (getUSP(item) - capital) * qty - (serverTax[item.id] ?? 0);
    },
    [getUSP, getIncludedTotal, serverTax],
  );
  const totals = useMemo(
    () => ({
      totalSellingAll: items.reduce(
        (s, i) => s + getUSP(i) * Number(i.qty || 0),
        0,
      ),
      totalPurchaseAll: items.reduce((s, i) => s + getIncludedTotal(i), 0),
      totalDiffAll: items.reduce(
        (s, i) => s + (getEffectiveABC(i) - getUSP(i) * Number(i.qty || 0)),
        0,
      ),
      totalABCAll: items.reduce((s, i) => s + getEffectiveABC(i), 0),
      totalProfitAll: items.reduce((s, i) => s + getProfitForItem(i), 0),
      totalTaxAll: items.reduce((s, i) => s + (serverTax[i.id] ?? 0), 0),
    }),
    [
      items,
      getUSP,
      getEffectiveABC,
      getIncludedTotal,
      getProfitForItem,
      serverTax,
    ],
  );

  const allItemsHavePrices = useMemo(
    () =>
      items.length > 0 &&
      items.every((item) => {
        const p = unitSellingPrices[item.id];
        return p && Number(p) > 0;
      }),
    [items, unitSellingPrices],
  );

  const fetchTransactionItems = useCallback(async () => {
    if (!transaction?.nTransactionId) return;
    try {
      const res = await TransactionAPI.getItems(transaction.nTransactionId);
      const formattedItems = (res.items || []).map((item) => ({
        ...item,
        purchaseOptions: (item.purchaseOptions || []).map((o) => ({
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
          dEWT: o.dEWT,
          bIncluded: o.bIncluded,
          bAddOn: o.bAddOn,
          dSuggestivePrice: o.dSuggestivePrice,
        })),
        optionsLoaded: true,
        optionsLoading: false,
      }));
      setItems(formattedItems);
      const cacheKey = `pricing_items_${transaction.nTransactionId}`;
      localStorage.setItem(cacheKey, formattedItems);
    } catch (err) {
      console.error("fetchTransactionItems error:", err);
    }
  }, [transaction?.nTransactionId]);

  const fetchItemPricings = useCallback(
    async (pricingSetId, { showLoading = false } = {}) => {
      if (showLoading) setItemsLoading(true);
      try {
        const res = await PricingAPI.getItemPricings(pricingSetId);
        const pricesMap = {},
          existingMap = {},
          taxMap = {},
          suggestiveMap = {},
          lockedMap = {};
        (res.itemPricings || []).forEach((p) => {
          if (p.dUnitSellingPrice !== null && p.dUnitSellingPrice !== 0)
            pricesMap[p.nTransactionItemId] = p.dUnitSellingPrice;
          if (p.nItemPriceId !== null)
            existingMap[p.nTransactionItemId] = p.nItemPriceId;
          taxMap[p.nTransactionItemId] = p.tax ?? 0;
          if (p.suggestivePrice !== null && p.suggestivePrice !== 0)
            suggestiveMap[p.nTransactionItemId] = p.suggestivePrice;
          lockedMap[p.nTransactionItemId] =
            p.bPricingLocked === 1 || p.bPricingLocked === true;
        });
        setUnitSellingPrices(pricesMap);
        setSavedPrices(pricesMap);
        setExistingPricings(existingMap);
        setServerTax(taxMap);
        setServerSuggestive(suggestiveMap);
        setLockedPricings(lockedMap);
        localStorage.setItem(`pricing_pricings_${pricingSetId}`, {
          unitSellingPrices: pricesMap,
          savedPrices: pricesMap,
          existingPricings: existingMap,
          lockedPricings: lockedMap,
          serverTax: taxMap,
          serverSuggestive: suggestiveMap,
        });
      } catch (err) {
        console.error("fetchItemPricings error:", err);
      } finally {
        if (showLoading) setItemsLoading(false);
      }
    },
    [],
  );

  const handleUnitSellingPriceChange = useCallback(
    (itemId, value) =>
      setUnitSellingPrices((prev) => ({
        ...prev,
        [itemId]: value.replace(/[^0-9.]/g, ""),
      })),
    [],
  );

  const handleToggleLock = useCallback(
    async (item) => {
      const existingId = existingPricings[item.id];
      if (!existingId) return;
      const newLocked = !lockedPricings[item.id];
      setLockedPricings((prev) => ({ ...prev, [item.id]: newLocked }));
      try {
        await PricingAPI.updateItemPricing(existingId, {
          bPricingLocked: newLocked ? 1 : 0,
        });
      } catch (err) {
        setLockedPricings((prev) => ({ ...prev, [item.id]: !newLocked }));
        console.error("handleToggleLock error:", err);
      }
    },
    [existingPricings, lockedPricings],
  );

  const handleApplyPercentage = useCallback(
    (newPrices) =>
      setUnitSellingPrices((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(newPrices).filter(([id]) => !lockedPricings[id]),
        ),
      })),
    [lockedPricings],
  );

  const handleSaveChanges = useCallback(async () => {
    if (!selectedSet || !hasUnsavedChanges) return;
    const entity = selectedSet.name || "Pricings";
    try {
      await withSpinner(entity, async () => {
        const allKeys = new Set([
          ...Object.keys(unitSellingPrices),
          ...Object.keys(savedPrices),
        ]);
        const updates = [...allKeys]
          .filter((id) => isItemDirty(id, unitSellingPrices, savedPrices))
          .map((itemIdStr) => {
            const raw = unitSellingPrices[itemIdStr];
            return {
              nTransactionItemId: Number(itemIdStr),
              nItemPriceId: existingPricings[itemIdStr] ?? null,
              dUnitSellingPrice:
                raw !== undefined && raw !== "" && raw !== null
                  ? Number(raw)
                  : 0,
            };
          });
        const res = await PricingAPI.bulkStoreItemPricings({
          nPricingSetId: selectedSet.id,
          items: updates,
        });
        if (res.itemPricings)
          setExistingPricings((prev) => {
            const updated = { ...prev };
            res.itemPricings.forEach(
              (p) =>
                p.nItemPriceId &&
                (updated[p.nTransactionItemId] = p.nItemPriceId),
            );
            return updated;
          });
        setSavedPrices({ ...unitSellingPrices });
      });
      showSwal(
        "SUCCESS",
        {},
        { entity: `Changes on ${entity}`, action: "save" },
      );
    } catch (err) {
      console.error("handleSaveChanges error:", err);
      showSwal("ERROR", {}, { entity, action: "save" });
    }
  }, [
    selectedSet,
    hasUnsavedChanges,
    unitSellingPrices,
    savedPrices,
    existingPricings,
  ]);

  // Live tax refresh
  useEffect(() => {
    if (!selectedSet?.id || Object.keys(unitSellingPrices).length === 0) return;
    const changedItems = Object.entries(unitSellingPrices).filter(
      ([id, val]) =>
        val &&
        Number(val) > 0 &&
        isItemDirty(id, unitSellingPrices, savedPrices),
    );
    if (changedItems.length === 0) return;
    clearTimeout(taxDebounceRef.current);
    taxDebounceRef.current = setTimeout(async () => {
      const results = await Promise.all(
        changedItems.map(([id, val]) =>
          PricingAPI.getItemPricingTax(
            `transaction_item_id=${id}&pricing_set_id=${selectedSet.id}&unit_selling_price=${Number(val)}`,
          )
            .then((res) => ({ id, tax: res.tax ?? 0 }))
            .catch(() => ({ id, tax: serverTax[id] ?? 0 })),
        ),
      );
      setServerTax((prev) =>
        Object.fromEntries(results.map(({ id, tax }) => [id, tax])),
      );
    }, 600);
    return () => clearTimeout(taxDebounceRef.current);
  }, [unitSellingPrices, savedPrices, selectedSet?.id, serverTax]);

  // Initial load
  useEffect(() => {
    if (!selectedSet?.id || !transaction?.nTransactionId) return;
    const itemsCacheKey = `pricing_items_${transaction.nTransactionId}`;
    const pricingCacheKey = `pricing_pricings_${selectedSet.id}`;
    const hasCache =
      localStorage.hasItem(itemsCacheKey) &&
      localStorage.hasItem(pricingCacheKey);

    if (!hasCache) {
      setItemsLoading(true);
      Promise.all([
        fetchTransactionItems(),
        fetchItemPricings(selectedSet.id, { showLoading: false }),
      ]).finally(() => setItemsLoading(false));
    } else {
      // Silent background fetch if cache exists
      Promise.all([
        fetchTransactionItems(),
        fetchItemPricings(selectedSet.id, { showLoading: false }),
      ]);
    }
  }, [selectedSet?.id, transaction?.nTransactionId, fetchTransactionItems, fetchItemPricings]);

  // ── Real-time: item-pricing / pricing-set updates for this pricing set ──
  useEffect(() => {
    if (!selectedSet?.id) return;

    const unsubscribe = subscribeDynamicChannel(
      `pricing-set.${selectedSet.id}.item-pricings`,
      [
        { event: ".item-pricing.updated", dispatch: "item_pricing_updated" },
        { event: ".pricing-set.updated", dispatch: "pricing_set_updated" },
      ],
    );

    const handleUpdate = () => fetchItemPricings(selectedSet.id);
    window.addEventListener("item_pricing_updated", handleUpdate);
    window.addEventListener("pricing_set_updated", handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("item_pricing_updated", handleUpdate);
      window.removeEventListener("pricing_set_updated", handleUpdate);
    };
  }, [selectedSet?.id, fetchItemPricings]);
  // ── Real-time: transaction status changes (via centralized transactionsChannel) ──
  useEffect(() => {
    if (!transaction?.nTransactionId) return;
    const handleTxnUpdated = (e) => {
      if (localActionRef.current) return;
      const eventTransactionId = e.detail?.transactionId;
      if (String(eventTransactionId) !== String(transaction.nTransactionId))
        return;

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

  // Redirect countdown
  useEffect(() => {
    if (!statusChangedAlert) return;
    setCountdown(5);
    let current = 5;
    countdownRef.current = setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        clearInterval(countdownRef.current);
        navigate(-2);
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [statusChangedAlert, navigate]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  return {
    transaction,
    selectedSet,
    isPricingSetting,
    currentStatusLabel,
    isManagement,
    itemType,
    procMode,
    statusTransaction,
    items,
    itemsLoading,
    saving,
    unitSellingPrices,
    savedPrices,
    existingPricings,
    lockedPricings,
    serverTax,
    serverSuggestive,
    statusChangedAlert,
    countdown,
    activeTab,
    expandedRows,
    expandedOptions,
    optionErrors,
    clientNickName,
    procSourceLabel,
    transactionHasABC,
    hasUnsavedChanges,
    allItemsHavePrices,
    fmtPHP,
    isItemDirty,
    getUSP,
    getEffectiveABC,
    getIncludedTotal,
    getTxABCBalance,
    getProfitForItem,
    totals,
    setActiveTab,
    setExpandedRows,
    setExpandedOptions,
    setOptionErrors,
    handleUnitSellingPriceChange,
    handleToggleLock,
    handleApplyPercentage,
    handleSaveChanges,
    blocker,
    uiMessages,
  };
}
