import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TransactionAPI from "../../../api/endpoints/transaction.api.js";
import PricingAPI from "../../../api/endpoints/pricing.api.js";
import DirectCostOptionAPI from "../../../api/endpoints/direct-cost-option.api.js";
import DirectCostAPI from "../../../api/endpoints/direct-cost.api.js";
import { fmtDateTime, fmtDate } from "../../../utils/helpers/timeZone";
import { getItem, setItem } from "../../../utils/storage/localStorage";
import useKeysLabels from "../../../hooks/useKeysLabels.js";
import {
  getOptionStep,
  toPercent,
  MAX_STEP,
} from "../../../utils/helpers/purchaseProgress";
export default function useTransaction() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const prevFilterStatus = useRef("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDirectCostModalOpen, setIsDirectCostModalOpen] = useState(false);
  const [isAEModalOpen, setIsAEModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveModalTransaction, setArchiveModalTransaction] = useState(null);

  // ── Mappings ──────────────────────────────────────────────────────────────
  const {
    ao_status,
    aotl_status,
    proc_status,
    transacstatus,
    archiveStatus,
    clientstatus,
    statusTransaction,
    itemType,
    userTypes,
    procMode,
    procSource,
    vaGoSeValue,
    forPurchaseStatus,
    cartStatus,
    financestatus,
    jev_types,
    loading: mappingLoading,
    //Keys
    draftKey,
    finalizeKey,
    transactionVerificationKey,
    forAssignmentKey,
    itemsManagementKey,
    itemsVerificationKey,
    itemsFinalizeKey,
    forCanvasKey,
    canvasVerificationKey,
    canvasFinalizeKey,
    forPricingKey,
    priceSettingKey,
    priceFinalizeVerificationKey,
    priceVerificationKey,
    finalizeVerificationKey,
    priceApprovalKey,
    priceFinalizeKey,
    priceApprovedKey,
    forPurchaseKey,
    forCollectionKey,
    procPriceApprovalKey,
    procPriceApprovedKey,
    cartKey, // 110 — Cart
    forApprovalKey, // 120 — For Approval
    forPaymentKey, // 130 — For Payment
    pendingReceiptKey, // 140 — Pending Receipt
    forDeliveryKey, // 150 — For Delivery
    deliveredKey, // 160 — Delivered
    cancelledPOKey, // 170 — Cancelled
    removedFromCartKey, // 100 — Removed from Cart (history only)
    isManagement,
    isProcurement,
    isAccountOfficer,
    isAOTL,
    isProcurementTL,
    isFinanceOfficer,
  } = useKeysLabels();

  const user = useMemo(() => getItem("user", {}), []);
  const userId = user?.nUserId;
  const jevKeys = Object.keys(jev_types || {});
  // Collection Receipt JEV type — index 3 of jev_types
  // (V Disbursement / R Received / D Delivered / C Collection).
  const crTypeKey = jevKeys[3] ?? "";

  // ── Status map ────────────────────────────────────────────────────────────
  const statusMap = useMemo(
    () =>
      isManagement
        ? transacstatus
        : isProcurement
          ? proc_status
          : isAOTL
            ? aotl_status
            : isFinanceOfficer
              ? financestatus
              : ao_status,
    [
      isManagement,
      isProcurement,
      isAOTL,
      isFinanceOfficer,
      transacstatus,
      proc_status,
      aotl_status,
      financestatus,
      ao_status,
    ],
  );

  const sessionKey = useMemo(
    () =>
      isManagement
        ? "selectedStatusCode"
        : isProcurement
          ? "selectedProcStatusCode"
          : isFinanceOfficer
            ? "selectedStatusCode"
            : "selectedAOStatusCode",
    [isManagement, isProcurement, isFinanceOfficer],
  );

  // ── Selected status code ──────────────────────────────────────────────────
  const selectedStatusCode = useMemo(
    () =>
      Object.keys(statusMap).find((k) => statusMap[k] === filterStatus) ?? "",
    [statusMap, filterStatus],
  );

  // ── Persist filter selection only ─────────────────────────────────────────
  useEffect(() => {
    if (selectedStatusCode) setItem(sessionKey, selectedStatusCode);
  }, [selectedStatusCode, sessionKey]);

  useEffect(() => {
    if (mappingLoading || Object.keys(statusMap).length === 0) return;
    const savedCode = getItem(sessionKey, null);
    setFilterStatus(
      savedCode && statusMap[savedCode]
        ? statusMap[savedCode]
        : (Object.values(statusMap)[0] ?? ""),
    );
  }, [mappingLoading, statusMap, sessionKey, location.key]);

  useEffect(() => {
    if (mappingLoading || Object.keys(statusMap).length === 0) return;
    const handleFocus = () => {
      const savedCode = getItem(sessionKey, null);
      if (savedCode && statusMap[savedCode])
        setFilterStatus(statusMap[savedCode]);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [mappingLoading, statusMap, sessionKey]);

  // ── Pricing flag ──────────────────────────────────────────────────────────
  const isPricingSetting = useMemo(
    () =>
      isManagement
        ? selectedStatusCode === forPricingKey
        : isProcurement
          ? selectedStatusCode === priceSettingKey
          : false,
    [
      isManagement,
      isProcurement,
      selectedStatusCode,
      forPricingKey,
      priceSettingKey,
    ],
  );

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Filter tab animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!filterStatus || filterStatus === prevFilterStatus.current) return;
    prevFilterStatus.current = filterStatus;
    if (initialLoading) return;
    setFilterLoading(true);
    const id = setTimeout(() => setFilterLoading(false), 0);
    return () => clearTimeout(id);
  }, [filterStatus, initialLoading]);

  useEffect(() => setPage(0), [filterStatus]);

  // ── Progress helpers ──────────────────────────────────────────────────────
  const [txnProgressMap, setTxnProgressMap] = useState({});
  const [txnBalanceMap, setTxnBalanceMap] = useState({});
  // For Collection only: the chosen pricing set's total selling price — the
  // figure the collection page calls "Collectible Amount" (usePurchase reads
  // the same `bChosen === 1` set).
  const [txnCollectibleMap, setTxnCollectibleMap] = useState({});

  /**
   * For Collection rows: the chosen pricing set's total selling price — the
   * figure the collection page calls "Collectible Amount" — plus the three
   * deductions printed under it (EWT, TAX, Retention). Every figure and every
   * derivation is copied from usePurchase.js / CollectionPaymentDetails.jsx
   * so the list and the collection page can never disagree.
   *
   * Deliberately separate from fetchTxnProgress: that one returns early when
   * no For Purchase rows are on screen, and For Collection is its own status,
   * so folding this in there would never run.
   */
  const fetchTxnCollectible = useCallback(
    async (txnList) => {
      if (!txnList?.length) return;

      const collectionTxns = txnList.filter(
        (t) => String(t.status_code) === String(forCollectionKey),
      );
      if (!collectionTxns.length) return;

      try {
        // Direct-cost option names are shared by every row — fetched (and
        // cached) once rather than per transaction.
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

        const nameOf = (id) => {
          const f = options.find((o) => (o.nDirectCostOptionID || o.id) === id);
          return (f?.strName || f?.name || "").toLowerCase();
        };

        const collectibleMap = {};
        await Promise.all(
          collectionTxns.map(async (t) => {
            try {
              const setsRes = await PricingAPI.getPricingSets(t.id);
              const chosen = (setsRes.data ?? []).find(
                (s) => s.bChosen === 1 || s.bChosen === true,
              );
              const collectible = Number(chosen?.totalSellingPrice ?? 0);

              // TAX — sum of the chosen set's item pricings.
              let tax = 0;
              const pricingSetId = chosen?.nPricingSetId ?? chosen?.id;
              if (pricingSetId) {
                const pricingsRes = await PricingAPI.getItemPricings(
                  pricingSetId,
                );
                (pricingsRes.itemPricings || []).forEach((p) => {
                  tax += Number(p.tax || 0);
                });
              }

              // EWT + Retention — from the transaction's direct costs.
              let ewt = 0;
              let ewtFound = false;
              let retention = 0;
              const costsRes = await DirectCostAPI.getDirectCosts({
                nTransactionID: t.id,
                withEWT: 1,
              });
              const costs =
                costsRes.directCosts || costsRes.data || costsRes || [];
              const totalEWT = Number(costsRes.totalEWT) || 0;
              costs.forEach((c) => {
                const name = nameOf(c.nDirectCostOptionID);
                const amt = Number(c.dAmount || 0);
                if (name === "ewt") {
                  ewt += amt;
                  ewtFound = true;
                } else if (name.startsWith("ret")) retention += amt;
              });

              collectibleMap[t.id] = {
                collectible,
                ewt: ewtFound && ewt > 0 ? ewt : totalEWT,
                tax,
                retention,
              };
            } catch {
              collectibleMap[t.id] = {
                collectible: 0,
                ewt: 0,
                tax: 0,
                retention: 0,
              };
            }
          }),
        );
        setTxnCollectibleMap(collectibleMap);
      } catch (err) {
        console.error("fetchTxnCollectible error:", err);
      }
    },
    [forCollectionKey],
  );

  const fetchTxnProgress = useCallback(
    async (txnList) => {
      if (!txnList?.length) return;

      const purchaseTxns = txnList.filter(
        (t) => String(t.status_code) === String(forPurchaseKey),
      );
      if (!purchaseTxns.length) return;

      try {
        const results = await Promise.all(
          purchaseTxns.map((t) =>
            TransactionAPI.getItems(t.id)
              .then((res) => ({ txnId: t.id, items: res.items || [] }))
              .catch(() => ({ txnId: t.id, items: [] })),
          ),
        );

        const statusMapLocal = {};
        results.forEach(({ items }) => {
          items.forEach((item) => {
            (item.purchaseOptions || []).forEach((o) => {
              statusMapLocal[Number(o.nPurchaseItemId)] = o.nStatus ?? null;
            });
          });
        });

        const stepKeys = {
          cartKey,
          forApprovalKey,
          forPaymentKey,
          pendingReceiptKey,
          forDeliveryKey,
          deliveredKey,
        };

        const progressMap = {};
        const balanceMap = {};
        results.forEach(({ txnId, items }) => {
          let numerator = 0;
          let denominator = 0;
          let unpaidTotal = 0;

          items.forEach((item) => {
            (item.purchaseOptions || []).forEach((o) => {
              const isIncluded =
                Number(o.bPurchaseIncluded) === 1 ||
                (o.bPurchaseIncluded == null && Number(o.bIncluded) === 1);

              if (Number(o.bPurchaseIncluded) === 1) {
                const qty = Number(o.nQuantity || 0);
                const step = getOptionStep(
                  statusMapLocal[o.nPurchaseItemId],
                  o,
                  stepKeys, // ← was missing
                );
                numerator += qty * step;
                denominator += qty * MAX_STEP; // ← was: qty * 5
              }

              if (isIncluded) {
                const optStatus = statusMapLocal[o.nPurchaseItemId];
                const ordered = Number(o.nQuantity || 0);
                const deliveredQty = Number(o.nDeliveredQty || 0);
                const isPaidOrDone =
                  (optStatus != null &&
                    [
                      String(pendingReceiptKey),
                      String(forDeliveryKey),
                      String(deliveredKey),
                    ].includes(String(optStatus))) ||
                  (ordered > 0 && deliveredQty >= ordered);
                if (!isPaidOrDone) {
                  unpaidTotal += ordered * Number(o.dUnitPrice || 0);
                }
              }
            });
          });

          progressMap[txnId] = toPercent(numerator, denominator); // ← replaces the Math.round ternary
          balanceMap[txnId] = unpaidTotal;
        });

        setTxnProgressMap(progressMap);
        setTxnBalanceMap(balanceMap);
      } catch (err) {
        console.error("fetchTxnProgress error:", err);
      }
    },
    [
      forPurchaseKey,
      // addToCartKey,      // ❌ REMOVED
      // purchaseOrderKey,  // ❌ REMOVED
      // paidKey,           // ❌ REMOVED
      // receivedKey,       // ❌ REMOVED
      // deliveredKey,      // ❌ REMOVED
      cartKey, // ✅ NEW
      forApprovalKey, // ✅ NEW
      forPaymentKey, // ✅ NEW
      pendingReceiptKey, // ✅ NEW
      forDeliveryKey, // ✅ NEW
      deliveredKey, // ✅ NEW
    ],
  );

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        let list = [];
        if (isManagement)
          list = (await TransactionAPI.getAll()).transactions || [];
        else if (isFinanceOfficer)
          list = (await TransactionAPI.getFinance()).transactions || [];
        else if (isProcurement)
          list =
            (
              await TransactionAPI.getProcurement(
                `nUserId=${userId}&isProcTL=${isProcurementTL ? 1 : 0}`,
              )
            ).transactions || [];
        else
          list =
            (
              await TransactionAPI.getAccountOfficer(
                `nUserId=${userId}&isAOTL=${isAOTL ? 1 : 0}&fetchAll=${isAOTL ? 1 : 0}`,
              )
            ).transactions || [];

        const fallback = isProcurement ? "--" : "—";
        const formatted = list.filter(Boolean).map((txn, idx) => {
          const statusCode = txn.current_status ?? txn.latest_history?.nStatus;
          return {
            ...txn,
            id: txn.nTransactionId ?? `txn-fallback-${idx}`,
            transactionId: txn.strCode || "--",
            transactionName: txn.strTitle || "--",
            date: txn.dtDocSubmission
              ? fmtDateTime(txn.dtDocSubmission)
              : fallback,
            deliveryDate: txn.dtDelivery ? fmtDate(txn.dtDelivery) : fallback,
            aoDueDate:
              isAccountOfficer || isManagement || isFinanceOfficer
                ? txn.dtAODueDate
                  ? fmtDate(txn.dtAODueDate)
                  : fallback
                : undefined,
            status: statusMap[statusCode],
            status_code: statusCode,
            companyName:
              txn.company?.strCompanyNickName || (isProcurement ? "--" : ""),
            clientName:
              txn.client?.strClientNickName || (isProcurement ? "--" : ""),
            createdBy: txn.created_by || "--",
            creator_id: txn.creator_id ?? null,
            aoName: txn.user ? `${txn.user.strNickName}`.trim() : "",
            aoUserId: txn.nAssignedAO || txn.user?.nUserId,
          };
        });

        setTransactions(formatted);
        fetchTxnProgress(formatted);
        fetchTxnCollectible(formatted);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        if (!silent) setLoading(false);
        setInitialLoading(false);
      }
    },
    [
      isManagement,
      isFinanceOfficer,
      isProcurement,
      isAOTL,
      isAccountOfficer,
      userId,
      isProcurementTL,
      statusMap,
      fetchTxnProgress,
      fetchTxnCollectible,
    ],
  );

  const fetchRef = useRef(fetchTransactions);
  const fetchTxnProgressRef = useRef(fetchTxnProgress);
  const transactionsRef = useRef(transactions);

  useEffect(() => {
    fetchRef.current = fetchTransactions;
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTxnProgressRef.current = fetchTxnProgress;
  }, [fetchTxnProgress]);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (!mappingLoading && !hasFetched.current) {
      hasFetched.current = true;
      fetchTransactions();
    }
  }, [mappingLoading, fetchTransactions]);

  // ── Realtime Event Listeners ────────────────────────────────────────────────
  useEffect(() => {
    const onTxnUpdated = () => fetchRef.current({ silent: true });
    const onTxnDeleted = (e) => {
      const id = e.detail?.transactionId;
      if (id)
        setTransactions((prev) =>
          prev.filter((t) => String(t.id) !== String(id)),
        );
      else fetchRef.current({ silent: true });
    };
    const onProgressAffectingChange = () =>
      fetchTxnProgressRef.current(transactionsRef.current);

    window.addEventListener("txn_data_updated", onTxnUpdated);
    window.addEventListener("txn_data_deleted", onTxnDeleted);

    window.addEventListener(
      "purchase_order_data_updated",
      onProgressAffectingChange,
    );
    window.addEventListener(
      "purchase_order_data_deleted",
      onProgressAffectingChange,
    );
    window.addEventListener(
      "purchase_order_option_data_updated",
      onProgressAffectingChange,
    );
    window.addEventListener(
      "purchase_order_option_data_deleted",
      onProgressAffectingChange,
    );
    window.addEventListener("voucher_data_updated", onProgressAffectingChange);
    window.addEventListener("voucher_data_deleted", onProgressAffectingChange);

    return () => {
      window.removeEventListener("txn_data_updated", onTxnUpdated);
      window.removeEventListener("txn_data_deleted", onTxnDeleted);
      window.removeEventListener(
        "purchase_order_data_updated",
        onProgressAffectingChange,
      );
      window.removeEventListener(
        "purchase_order_data_deleted",
        onProgressAffectingChange,
      );
      window.removeEventListener(
        "purchase_order_option_data_updated",
        onProgressAffectingChange,
      );
      window.removeEventListener(
        "purchase_order_option_data_deleted",
        onProgressAffectingChange,
      );
      window.removeEventListener(
        "voucher_data_updated",
        onProgressAffectingChange,
      );
      window.removeEventListener(
        "voucher_data_deleted",
        onProgressAffectingChange,
      );
    };
  }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    const list = transactions.filter((t) => {
      const matchesSearch =
        !searchLower ||
        t.transactionId?.toLowerCase().includes(searchLower) ||
        t.transactionName?.toLowerCase().includes(searchLower) ||
        t.clientName?.toLowerCase().includes(searchLower) ||
        t.companyName?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;

      const txnCode = String(t.status_code ?? "");
      if (isManagement || isFinanceOfficer) {
        if (selectedStatusCode === forAssignmentKey)
          return ["200", "210", "220", "230", "240"].includes(txnCode);
        return txnCode === String(selectedStatusCode);
      }

      if (isProcurement) {
        const isMyCode = (code) =>
          txnCode === String(code) && String(t.creator_id) === String(userId);
        const isVirtual = (code) => txnCode === String(code);
        switch (String(selectedStatusCode)) {
          case draftKey:
            return isMyCode(draftKey);
          case finalizeKey:
            return isMyCode(finalizeKey);
          case finalizeVerificationKey:
            return isVirtual(finalizeVerificationKey);
          case priceSettingKey:
            return txnCode === String(priceSettingKey);
          case priceFinalizeKey:
            return isMyCode(priceFinalizeKey);
          case priceFinalizeVerificationKey:
            return isVirtual(priceFinalizeVerificationKey);
          case procPriceApprovalKey:
            return isMyCode(procPriceApprovalKey);
          case procPriceApprovedKey:
            return txnCode === String(procPriceApprovedKey);
          case forPurchaseKey:
            return isProcurementTL
              ? txnCode === String(forPurchaseKey)
              : txnCode === String(forPurchaseKey) &&
                  String(t.creator_id) === String(userId);
          default:
            return false;
        }
      }

      if (isAOTL) {
        if (selectedStatusCode === forAssignmentKey)
          return ["200", "210", "220", "225", "230", "240", "245"].includes(
            txnCode,
          );
        if (
          selectedStatusCode === itemsVerificationKey ||
          selectedStatusCode === canvasVerificationKey ||
          selectedStatusCode === forPurchaseKey
        )
          return txnCode === String(selectedStatusCode);
        return (
          txnCode === String(selectedStatusCode) &&
          String(t.aoUserId) === String(userId)
        );
      }

      if (
        selectedStatusCode === itemsVerificationKey ||
        selectedStatusCode === canvasVerificationKey
      )
        return txnCode === String(selectedStatusCode);
      return (
        txnCode === String(selectedStatusCode) &&
        String(t.aoUserId) === String(userId)
      );
    });

    // For Purchase/Delivery — order rows by delivery date (nearest first),
    // rows without a delivery date go last.
    if (String(selectedStatusCode) === String(forPurchaseKey)) {
      const toTime = (val) => {
        const time = val ? Date.parse(val) : NaN;
        return Number.isNaN(time) ? Infinity : time;
      };
      return list.sort((a, b) => toTime(a.dtDelivery) - toTime(b.dtDelivery));
    }

    return list;
  }, [
    transactions,
    debouncedSearch,
    selectedStatusCode,
    isManagement,
    isProcurement,
    isAOTL,
    userId,
    forAssignmentKey,
    itemsVerificationKey,
    canvasVerificationKey,
    draftKey,
    finalizeKey,
    finalizeVerificationKey,
    priceSettingKey,
    priceFinalizeKey,
    priceFinalizeVerificationKey,
    procPriceApprovalKey,
    procPriceApprovedKey,
    forPurchaseKey,
    isProcurementTL,
  ]);

  // ── Column visibility ──────────────────────────────────────────────────────
  const {
    isAssignedToColumnVisible,
    isCreatedByColumnVisible,
    showAOActionColumn,
    showSubmissionDate,
    aoDueDateVisible,
  } = useMemo(
    () => ({
      isAssignedToColumnVisible:
        !isProcurement &&
        selectedStatusCode &&
        [
          forAssignmentKey,
          itemsManagementKey,
          itemsVerificationKey,
          forCanvasKey,
          canvasVerificationKey,
          forPurchaseKey,
        ].includes(selectedStatusCode),
      aoDueDateVisible:
        !isProcurement &&
        selectedStatusCode &&
        [
          forAssignmentKey,
          itemsManagementKey,
          itemsVerificationKey,
          forCanvasKey,
          canvasVerificationKey,
        ].includes(selectedStatusCode),
      isCreatedByColumnVisible:
        !!selectedStatusCode &&
        (isManagement || isFinanceOfficer || isProcurementTL
          ? true
          : isProcurement
            ? [
                finalizeVerificationKey,
                priceFinalizeVerificationKey,
                priceSettingKey,
                priceFinalizeKey,
                procPriceApprovalKey,
                procPriceApprovedKey,
              ].includes(selectedStatusCode)
            : isAccountOfficer),
      showAOActionColumn:
        (isAccountOfficer || isFinanceOfficer) && !!selectedStatusCode,
      showSubmissionDate: selectedStatusCode !== forPurchaseKey,
    }),
    [
      isProcurement,
      isManagement,
      isAccountOfficer,
      isFinanceOfficer,
      selectedStatusCode,
      forAssignmentKey,
      itemsManagementKey,
      itemsVerificationKey,
      forCanvasKey,
      canvasVerificationKey,
      draftKey,
      finalizeKey,
      forPricingKey,
      priceVerificationKey,
      finalizeVerificationKey,
      priceFinalizeVerificationKey,
      priceApprovalKey,
      priceApprovedKey,
      procPriceApprovalKey,
      procPriceApprovedKey,
      forPurchaseKey,
    ],
  );

  // ── Status labels ───────────────────────────────────────────────────────────
  const statusLabelMap = isManagement ? transacstatus : ao_status;
  const itemsManagementLabel = statusLabelMap[itemsManagementKey] || "";
  const canvasVerificationLabel = statusLabelMap[canvasVerificationKey] || "";
  const forCanvasLabel = statusLabelMap[forCanvasKey] || "";
  const finalizeKeyLabel = isManagement
    ? transacstatus[finalizeKey] || ""
    : ao_status[itemsFinalizeKey] || "";
  const isDraft = draftKey === selectedStatusCode;
  const isFinalize = finalizeKey === selectedStatusCode;

  // ── Canvas state builder ───────────────────────────────────────────────────
  const buildCanvasState = useCallback(
    (row) => ({
      transactionId: row.id,
      transactionCode: row.transactionId,
      transaction: row,
      nUserId: row?.user?.nUserId || row?.latest_history?.nUserId,
      currentUserId: userId,
      itemsManagementKey,
      itemsFinalizeKey,
      itemsVerificationKey,
      forCanvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
      forAssignmentKey,
      procMode,
      itemType,
      procSource,
      statusTransaction,
      vaGoSeValue,
      userTypes,
      isAOTL,
      isManagement,
      isAccountOfficer,
      selectedStatusCode,
      statusLabelMap,
      itemsManagementLabel,
      canvasVerificationLabel,
      forCanvasLabel,
      finalizeKeyLabel,
      ao_status,
      transacstatus,
      currentStatusLabel: filterStatus,
      priceApprovedKey,
      procPriceApprovedKey,
      archiveStatus,
    }),
    [
      userId,
      itemsManagementKey,
      itemsFinalizeKey,
      itemsVerificationKey,
      forCanvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
      forAssignmentKey,
      procMode,
      itemType,
      procSource,
      statusTransaction,
      vaGoSeValue,
      userTypes,
      isAOTL,
      isManagement,
      isAccountOfficer,
      selectedStatusCode,
      statusLabelMap,
      itemsManagementLabel,
      canvasVerificationLabel,
      forCanvasLabel,
      finalizeKeyLabel,
      ao_status,
      transacstatus,
      filterStatus,
      priceApprovedKey,
      procPriceApprovedKey,
      archiveStatus,
    ],
  );

  // ── Action options ─────────────────────────────────────────────────────────
  const actionOpts = useMemo(
    () => ({
      userId,
      isManagement,
      isProcurement,
      isProcurementTL,
      isAccountOfficer,
      isFinanceOfficer,
      selectedStatusCode,
      draftKey,
      finalizeKey,
      forAssignmentKey,
      itemsManagementKey,
      itemsFinalizeKey,
      itemsVerificationKey,
      forCanvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
      forPricingKey,
      priceVerificationKey,
      priceApprovalKey,
      priceApprovedKey,
      priceSettingKey,
      priceFinalizeKey,
      priceFinalizeVerificationKey,
      procPriceApprovalKey,
      procPriceApprovedKey,
      finalizeVerificationKey,
      isPricingSetting,
      filterStatus,
      proc_status,
      transacstatus,
      itemType,
      procMode,
      procSource,
      statusTransaction,
      userTypes,
      vaGoSeValue,
      buildCanvasState,
      navigate,
      setSelectedTransaction,
      setIsAEModalOpen,
      setIsHistoryModalOpen,
      setIsRevertModalOpen,
      setIsDirectCostModalOpen,
      setIsDeleteModalOpen,
      setEntityToDelete,
      setIsArchiveModalOpen,
      setArchiveModalTransaction,
      forPurchaseKey,
      // cancelledPOKey,       // ❌ REMOVED → cancelledPOKey
      // addToCartKey,      // ❌ REMOVED → cartKey
      // purchaseOrderKey,  // ❌ REMOVED → forApprovalKey
      // paidKey,           // ❌ REMOVED → forPaymentKey
      // receivedKey,       // ❌ REMOVED → pendingReceiptKey
      // deliveredKey,      // ❌ REMOVED → deliveredKey
      removedFromCartKey,
      forCollectionKey,
      // openCartKey,       // ❌ REMOVED → cartKey
      // closeCartKey,      // ❌ REMOVED → forApprovalKey
      // cancelCartKey,     // ❌ REMOVED → cancelledPOKey
      cartKey, // ✅ 110
      forApprovalKey, // ✅ 120
      forPaymentKey, // ✅ 130
      pendingReceiptKey, // ✅ 140
      forDeliveryKey, // ✅ 150
      deliveredKey, // ✅ 160
      cancelledPOKey, // ✅ 170
      crTypeKey,
    }),
    [
      isManagement,
      isProcurement,
      isProcurementTL,
      isAccountOfficer,
      isFinanceOfficer,
      selectedStatusCode,
      draftKey,
      finalizeKey,
      forAssignmentKey,
      itemsManagementKey,
      itemsFinalizeKey,
      itemsVerificationKey,
      forCanvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
      forPricingKey,
      priceVerificationKey,
      priceApprovalKey,
      priceApprovedKey,
      priceSettingKey,
      priceFinalizeKey,
      priceFinalizeVerificationKey,
      procPriceApprovalKey,
      procPriceApprovedKey,
      finalizeVerificationKey,
      isPricingSetting,
      filterStatus,
      proc_status,
      transacstatus,
      itemType,
      procMode,
      procSource,
      statusTransaction,
      userTypes,
      vaGoSeValue,
      buildCanvasState,
      navigate,
      forPurchaseKey,
      // cancelledPOKey,       // ❌ REMOVED → cancelledPOKey
      // addToCartKey,      // ❌ REMOVED → cartKey
      // purchaseOrderKey,  // ❌ REMOVED → forApprovalKey
      // paidKey,           // ❌ REMOVED → forPaymentKey
      // receivedKey,       // ❌ REMOVED → pendingReceiptKey
      // deliveredKey,      // ❌ REMOVED → deliveredKey
      removedFromCartKey,
      forCollectionKey,
      // openCartKey,       // ❌ REMOVED → cartKey
      // closeCartKey,      // ❌ REMOVED → forApprovalKey
      // cancelCartKey,     // ❌ REMOVED → cancelledPOKey
      cartKey, // ✅ 110
      forApprovalKey, // ✅ 120
      forPaymentKey, // ✅ 130
      pendingReceiptKey, // ✅ 140
      forDeliveryKey, // ✅ 150
      deliveredKey, // ✅ 160
      cancelledPOKey, // ✅ 170
      crTypeKey,
    ],
  );

  // ── Row click ──────────────────────────────────────────────────────────────
  const openRow = useCallback(
    (row, selectedStatusCode, filterStatus, isPricingSetting) => {
      const statusCode = String(
        row.status_code ?? row.latest_history?.nStatus ?? "",
      );
      if (isManagement || isFinanceOfficer) {
        const isPricing = [
          forPricingKey,
          priceVerificationKey,
          priceApprovalKey,
        ].includes(statusCode);
        if (forCollectionKey.includes(statusCode)) {
          return navigate("/transaction-for-collection", {
            state: {
              transaction: row,
              transactionCode: row.transactionId,
              selectedStatusCode,
              currentStatusLabel: filterStatus,
              forCollectionKey,
              currentUserId: userId,

              isManagement,
              isProcurementTL,
              isProcurement,
              isAOTL,
              itemType,
              procMode,
              procSource,
              statusTransaction,
              crTypeKey,
              proc_status,
            },
          });
        }
        if (forPurchaseKey.includes(statusCode)) {
          return navigate("/transaction-for-purchase", {
            state: {
              transaction: row,
              transactionCode: row.transactionId,
              selectedStatusCode,
              currentStatusLabel: filterStatus,
              forPurchaseKey,
              currentUserId: userId,

              isManagement,
              isProcurementTL,
              isProcurement,
              isAOTL,
              itemType,
              procMode,
              procSource,
              statusTransaction,
              crTypeKey,
              proc_status,
            },
          });
        }
        return navigate(
          isPricing ? "/transaction-pricing-set" : "/transaction-canvas",
          {
            state: isPricing
              ? {
                  transaction: row,
                  selectedStatusCode,
                  isManagement,
                  isProcurementTL,
                  transacstatus,
                  forPricingKey,
                  priceVerificationKey,
                  priceApprovalKey,
                  priceApprovedKey,
                  isPricingSetting,
                  currentStatusLabel: filterStatus,
                  currentUserId: userId,
                  itemType,
                  procMode,
                  procSource,
                  statusTransaction,
                }
              : {
                  ...buildCanvasState(row),
                  selectedStatusCode,
                  transacstatus,
                  itemType,
                  userTypes,
                  statusTransaction,
                  procMode,
                  procSource,
                  draftKey,
                  finalizeKey,
                  forPricingKey,
                  priceVerificationKey,
                  currentStatusLabel: filterStatus,
                },
          },
        );
      }

      if (isProcurement) {
        if (statusCode === forCollectionKey) {
          return navigate("/transaction-for-collection", {
            state: {
              transaction: row,
              selectedStatusCode,
              currentStatusLabel: filterStatus,
              transactionCode: row.transactionId,
              forCollectionKey,
              currentUserId: userId,

              isManagement,
              isAOTL,
              isProcurement,
              isProcurementTL,
              crTypeKey,
              proc_status,
            },
          });
        }
        if (statusCode === forPurchaseKey) {
          return navigate("/transaction-for-purchase", {
            state: {
              transaction: row,
              selectedStatusCode,
              currentStatusLabel: filterStatus,
              transactionCode: row.transactionId,
              forPurchaseKey,
              currentUserId: userId,

              isManagement,
              isAOTL,
              isProcurement,
              isProcurementTL,
              crTypeKey,
              proc_status,
            },
          });
        }
        const isPricing = [
          priceSettingKey,
          priceFinalizeKey,
          priceFinalizeVerificationKey,
          procPriceApprovalKey,
        ].includes(statusCode);
        return navigate(
          isPricing ? "/transaction-pricing-set" : "/transaction-canvas",
          {
            state: isPricing
              ? {
                  transaction: row,
                  selectedStatusCode,
                  clientNickName: row.clientName,
                  proc_status,
                  currentUserId: userId,
                  priceSettingKey,
                  priceFinalizeKey,
                  priceFinalizeVerificationKey,
                  priceApprovalKey: procPriceApprovalKey,
                  isPricingSetting,
                  isManagement,
                  isProcurementTL,
                  currentStatusLabel: filterStatus,
                  itemType,
                  procMode,
                  procSource,
                  statusTransaction,
                }
              : {
                  ...buildCanvasState(row),
                  selectedStatusCode,
                  isProcurement,
                  proc_status,
                  draftKey,
                  finalizeKey,
                  priceSettingKey,
                  finalizeVerificationKey,
                  priceFinalizeVerificationKey,
                  currentStatusLabel: filterStatus,
                  itemType,
                  procMode,
                  procSource,
                  statusTransaction,
                },
          },
        );
      }

      if (statusCode === forCollectionKey) {
        return navigate("/transaction-for-collection", {
          state: {
            transaction: row,
            selectedStatusCode,
            currentStatusLabel: filterStatus,
            transactionCode: row.transactionId,
            forCollectionKey,
            currentUserId: userId,

            isManagement,
            isAOTL,
            isProcurementTL,
            isProcurement,
            itemType,
            procMode,
            procSource,
            statusTransaction,
            crTypeKey,
            proc_status,
          },
        });
      }
      if (statusCode === forPurchaseKey) {
        return navigate("/transaction-for-purchase", {
          state: {
            transaction: row,
            selectedStatusCode,
            currentStatusLabel: filterStatus,
            transactionCode: row.transactionId,
            forPurchaseKey,
            currentUserId: userId,

            isManagement,
            isAOTL,
            isProcurementTL,
            isProcurement,
            itemType,
            procMode,
            procSource,
            statusTransaction,
            crTypeKey,
            proc_status,
          },
        });
      }
      navigate("/transaction-canvas", {
        state: {
          ...buildCanvasState(row),
          selectedStatusCode,
          currentStatusLabel: filterStatus,
        },
      });
    },
    [
      isManagement,
      isProcurement,
      selectedStatusCode,
      isPricingSetting,
      filterStatus,
      forPricingKey,
      priceVerificationKey,
      priceApprovalKey,
      priceApprovedKey,
      priceSettingKey,
      priceFinalizeKey,
      priceFinalizeVerificationKey,
      procPriceApprovalKey,
      procPriceApprovedKey,
      draftKey,
      finalizeKey,
      finalizeVerificationKey,
      transacstatus,
      proc_status,
      itemType,
      procMode,
      procSource,
      statusTransaction,
      userTypes,
      buildCanvasState,
      navigate,
      forPurchaseKey,
      // addToCartKey,      // ❌
      // purchaseOrderKey,  // ❌
      // paidKey,           // ❌
      // receivedKey,       // ❌
      // deliveredKey,      // ❌
      cartKey, // ✅ 110
      forApprovalKey, // ✅ 120
      forPaymentKey, // ✅ 130
      pendingReceiptKey, // ✅ 140
      forDeliveryKey, // ✅ 150
      deliveredKey, // ✅ 160
      cancelledPOKey, // ✅ 170
      removedFromCartKey, // ✅ 100
      // openCartKey,
      // closeCartKey,
      // cancelCartKey,
      crTypeKey,
    ],
  );

  // Table click → current sidebar status. Look Up click → the row's own status.
  const handleRowClick = useCallback(
    (row, opts) => {
      if (opts?.fromLookup !== true) {
        return openRow(row, selectedStatusCode, filterStatus, isPricingSetting);
      }

      const statusCode = String(
        row.status_code ?? row.latest_history?.nStatus ?? "",
      );
      const forAssignmentCodes = isAOTL
        ? ["200", "210", "220", "225", "230", "240", "245"]
        : ["200", "210", "220", "230", "240"];
      // Only fold into "For Assignment" when the code has no sidebar item
      // of its own (For Canvas, Items Management, etc. keep their code).
      const code =
        !statusMap[statusCode] && forAssignmentCodes.includes(statusCode)
          ? String(forAssignmentKey)
          : statusCode;
      const label = statusMap[code] ?? filterStatus;
      const pricing = isManagement
        ? code === String(forPricingKey)
        : isProcurement
          ? code === String(priceSettingKey)
          : false;

      return openRow(row, code, label, pricing);
    },
    [
      openRow,
      selectedStatusCode,
      filterStatus,
      isPricingSetting,
      isAOTL,
      forAssignmentKey,
      statusMap,
      isManagement,
      isProcurement,
      forPricingKey,
      priceSettingKey,
    ],
  );

  const handleAddTransactionSaved = useCallback(
    async () => fetchTransactions({ silent: true }),
    [fetchTransactions],
  );

  return {
    navigate,
    location,
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    transactions,
    filteredTransactions,
    loading,
    initialLoading,
    filterLoading,
    filterStatus,
    setFilterStatus,
    selectedStatusCode,
    statusMap,
    selectedTransaction,
    setSelectedTransaction,
    isRevertModalOpen,
    setIsRevertModalOpen,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    isDirectCostModalOpen,
    setIsDirectCostModalOpen,
    isAEModalOpen,
    setIsAEModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    entityToDelete,
    setEntityToDelete,
    isInfoModalOpen,
    setIsInfoModalOpen,
    isArchiveModalOpen,
    setIsArchiveModalOpen,
    archiveModalTransaction,
    setArchiveModalTransaction,
    ao_status,
    aotl_status,
    proc_status,
    transacstatus,
    archiveStatus,
    clientstatus,
    statusTransaction,
    itemType,
    userTypes,
    procMode,
    procSource,
    vaGoSeValue,
    financestatus,
    mappingLoading,
    isManagement,
    isProcurement,
    isAccountOfficer,
    isAOTL,
    isProcurementTL,
    isFinanceOfficer,
    userId,
    draftKey,
    finalizeKey,
    transactionVerificationKey,
    forAssignmentKey,
    itemsManagementKey,
    itemsFinalizeKey,
    itemsVerificationKey,
    forCanvasKey,
    canvasFinalizeKey,
    canvasVerificationKey,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    priceApprovedKey,
    finalizeVerificationKey,
    priceSettingKey,
    priceFinalizeKey,
    priceFinalizeVerificationKey,
    procPriceApprovalKey,
    procPriceApprovedKey,
    forPurchaseKey,
    forCollectionKey,

    crTypeKey,
    isPricingSetting,
    isDraft,
    isFinalize,
    txnProgressMap,
    txnBalanceMap,
    txnCollectibleMap,
    isAssignedToColumnVisible,
    isCreatedByColumnVisible,
    showAOActionColumn,
    showSubmissionDate,
    aoDueDateVisible,
    fetchTransactions,
    handleAddTransactionSaved,
    handleRowClick,
    buildCanvasState,
    actionOpts,
  };
}
