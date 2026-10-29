import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PurchaseOrderAPI from "../../../../../api/endpoints/purchase-order.api.js";
import VoucherAPI from "../../../../../api/endpoints/voucher.api.js";
import InventoryAPI from "../../../../../api/endpoints/inventory.api.js";

import JevAPI from "../../../../../api/endpoints/jev.api.js";
import JevEntriesAPI from "../../../../../api/endpoints/jev-entries.api.js";
import VoucherSupplierAPI from "../../../../../api/endpoints/voucher-supplier.api.js";
import VoucherAssigneeAPI from "../../../../../api/endpoints/voucher-assignee.api.js";
import { getItem } from "../../../../../utils/storage/localStorage.js";
import { withSpinner, showSwal } from "../../../../../utils/helpers/swal.jsx";
import { printRoute } from "../../../../../utils/helpers/printRoute.js";
import useKeysLabels from "../../../../../hooks/useKeysLabels.js";
import { toCents, centsLabel } from "../../../../../utils/helpers/money.js";
import { openForPurchase } from "../../../../../utils/helpers/openForPurchase.js";
import { totalEWT } from "../../../../../utils/helpers/calculateEWT.js";

export default function useVoucherUpdate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const voucherId = searchParams.get("id");

  // ── User / mapping ───────────────────────────────────────────────────
  const user = useMemo(() => getItem("user", {}), []);
  const currentUserId = user?.nUserId;
  const {
    // Mappings
    voucherStatus,
    userTypes,
    jev_types,
    jev_status,
    paymentTerms,
    loading: mappingLoading,
    // Payment-mode keys (values stored in cPaymentTerms) + display labels
    cashKey,
    onlineKey,
    onlineLabel,
    creditCardKey,
    chequeKey,
    otherPaymentTermKey,
    cashLabel,
    creditCardLabel,
    chequeLabel,
    otherPaymentTermLabel,
    // Keys
    jevDisbursementVoucherKey,
    jevActiveKey,
    jevCancelledKey,
    jevPendingKey,
    voucherActiveKey,
    voucherClosedKey,
    voucherPaidKey,
    voucherCancelledKey,
    voucherSupplierTypeKey,
    voucherAssigneeTypeKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    isFinanceOfficer,
    isManagement,
    // Everything the For Purchase workspace reads out of its state.
    isAccountOfficer,
    isAOTL,
    isProcurement,
    forPurchaseKey,
    forCollectionKey,
    forApprovalKey,
    forCanvasKey,
    canvasFinalizeKey,
    canvasVerificationKey,
    itemsManagementKey,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    priceSettingKey,
    priceFinalizeVerificationKey,
    cartKey,
    deliveredKey,
    cancelledPOKey,
    removedFromCartKey,
    itemType,
    procMode,
    procSource,
    statusTransaction,
    archiveStatus,
    ao_status,
    transacstatus,
  } = useKeysLabels();

  // ── Voucher data ─────────────────────────────────────────────────────
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchVoucher = useCallback(async () => {
    if (!voucherId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setVoucher(null); // reset immediately
    try {
      let data = null;
      if (typeof VoucherAPI.getVoucher === "function") {
        const res = await VoucherAPI.getVoucher(voucherId);
        data = res?.data || res;
      } else {
        const res = await VoucherAPI.getVouchers();
        const list = Array.isArray(res) ? res : res.data || [];
        data = list.find((v) => String(v.nVoucherId) === String(voucherId));
      }
      setVoucher(data || null);
    } catch (err) {
      console.error("Failed to fetch voucher:", err);
      setVoucher(null);
    } finally {
      setLoading(false);
    }
  }, [voucherId]);

  useEffect(() => {
    fetchVoucher();
  }, [fetchVoucher]);

  // An APPROVED purchase-price change (Transactions' price-change modal)
  // re-prices the PO lines this voucher totals — refetch silently or the
  // amounts stay at the old price until a reload.
  useEffect(() => {
    const refetchOnOptionChange = () => fetchVoucher();
    window.addEventListener("purchase_option_data_updated", refetchOnOptionChange);
    return () =>
      window.removeEventListener("purchase_option_data_updated", refetchOnOptionChange);
  }, [fetchVoucher]);

  const notifyUpdated = useCallback(() => {
    window.dispatchEvent(new CustomEvent("voucher_data_updated"));
  }, []);

  const handleBack = useCallback(() => navigate("/voucher"), [navigate]);

  // ── Local UI state ───────────────────────────────────────────────────
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingAssignee, setEditingAssignee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    particular: "",
    amount: "",
    quantity: 1,
    strUOM: "",
    companyId: "",
    ewt: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [optionHistories, setOptionHistories] = useState({});
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [showJevConfirm, setShowJevConfirm] = useState(false);
  const [creatingJev, setCreatingJev] = useState(false);
  const [showJevPanel, setShowJevPanel] = useState(false);
  const [isJevBalanced, setIsJevBalanced] = useState(false);
  const [jevBalanceLoading, setJevBalanceLoading] = useState(false);
  const [jevBalanceStatus, setJevBalanceStatus] = useState("no_entries"); // "no_entries" | "unbalanced" | "balanced_mismatch" | "balanced"
  // { fromCents, toCents, grandCents } — whole-cent snapshots used only to
  // explain *why* the Finalize button is disabled.
  const [jevBalanceAmounts, setJevBalanceAmounts] = useState(null);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  useEffect(() => {
    setShowAddItem(false);
    setEditingAssignee(null);
    setSaving(false);
    setFormData({
      particular: "",
      amount: "",
      quantity: 1,
      strUOM: "",
      companyId: "",
      ewt: "",
    });
    setFormErrors({});
    setConfirmAction(null);
    setConfirmLoading(false);
    setShowJevConfirm(false);
    setShowJevPanel(false);
    setOptionHistories({});
    setHistoriesLoading(false);
  }, [voucherId]);

  // ── Derived values ───────────────────────────────────────────────────
  const isAssigneeType =
    voucher?.voucher_assignees?.length > 0 &&
    !voucher?.voucher_suppliers?.length;

  const assigneeLinks = voucher?.voucher_assignees || [];
  const supplierLinks = voucher?.voucher_suppliers || [];
  const hasJev = !!voucher?.nJEVId;
  const hasActiveJev =
    !!voucher?.nJEVId && String(voucher?.jev?.cStatus) === "A";

  // ── EWT (derived) ────────────────────────────────────────────────────
  // Mirrors POListPanel/PORowPanel exactly: the EWT of each purchase
  // option, worked out by utils/helpers/calculateEWT.js. Previously this
  // was recomputed via a separate DirectCost API call, which could
  // disagree with what's shown in the PO list/rows. Deriving it the same
  // way keeps every view consistent.
  // Assignee-type vouchers carry no POs — their EWT lives on each
  // particular's own dEWT line instead, summed the same way.
  const ewtAmount = useMemo(() => {
    if (!voucher) return 0;
    if (isAssigneeType)
      return (voucher.voucher_assignees ?? []).reduce(
        (sum, a) => sum + (Number(a.dEWT) || 0),
        0,
      );
    return supplierLinks.reduce((sum, link) => {
      const opts = link.purchase_order?.purchase_order_options ?? [];
      return sum + totalEWT(opts);
    }, 0);
  }, [voucher, isAssigneeType, supplierLinks]);

  const ewtLoading = false; // kept for API compatibility with the view/props

  const particularsGrandTotal = isAssigneeType
    ? assigneeLinks.reduce(
        (sum, a) => sum + Number(a.dAmount || 0) * Number(a.nQuantity || 1),
        0,
      )
    : supplierLinks.reduce((sum, link) => {
        const opts = link.purchase_order?.purchase_order_options ?? [];
        return opts.reduce((s, opt) => {
          const p = opt.purchase_option;
          return s + (p?.nQuantity || 0) * (p?.dUnitPrice || 0);
        }, sum);
      }, 0);

  // ── JEV entries (single source of truth — also reused for the preview nav) ──
  const [jevEntries, setJevEntries] = useState([]);
  useEffect(() => {
    const jevId = voucher?.nJEVId;
    if (!jevId) {
      setJevEntries([]);
      return;
    }

    let active = true;

    JevEntriesAPI.getByJevId(jevId)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setJevEntries(list);
      })
      .catch((err) => {
        if (!active) return;
        console.error("useVoucherUpdate — jevEntries fetch failed:", err);
        setJevEntries([]);
      });

    return () => {
      active = false;
    };
  }, [voucher?.nJEVId, balanceRefreshKey]);

  // ── JEV balance check ───────────────────────────────────────────────
  useEffect(() => {
    const jevId = voucher?.nJEVId;
    if (!jevId) {
      setIsJevBalanced(false);
      setJevBalanceStatus("no_entries");
      setJevBalanceAmounts(null);
      return;
    }

    let active = true;
    setJevBalanceLoading(true);

    JevEntriesAPI.getByJevId(jevId)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        const fromCents = list
          .filter((e) => Number(e.dAmount) < 0)
          .reduce((sum, e) => sum + toCents(e.dAmount), 0);
        const toCentsTotal = list
          .filter((e) => Number(e.dAmount) >= 0)
          .reduce((sum, e) => sum + toCents(e.dAmount), 0);
        const grandCents = toCents(particularsGrandTotal);

        const balanced =
          fromCents > 0 && toCentsTotal > 0 && fromCents === toCentsTotal;
        const matchesGrandTotal = fromCents === grandCents;
        setIsJevBalanced(balanced && matchesGrandTotal);
        setJevBalanceAmounts({
          fromCents,
          toCents: toCentsTotal,
          grandCents,
        });

        if (fromCents === 0 && toCentsTotal === 0) {
          setJevBalanceStatus("no_entries");
        } else if (!balanced) {
          setJevBalanceStatus("unbalanced");
        } else if (!matchesGrandTotal) {
          setJevBalanceStatus("balanced_mismatch");
        } else {
          setJevBalanceStatus("balanced");
        }
      })
      .catch((err) => {
        console.error("JEV balance check failed:", err);
        if (active) {
          setIsJevBalanced(false);
          setJevBalanceStatus("unbalanced");
          setJevBalanceAmounts(null);
        }
      })
      .finally(() => {
        if (active) setJevBalanceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [voucher?.nJEVId, particularsGrandTotal, balanceRefreshKey]);

  // ── Real-time: JEV entries changed (from JevViewPanel or another tab) ──
  useEffect(() => {
    const jevId = voucher?.nJEVId;

    const handleEntryChange = (e) => {
      const eventJevId = e.detail?.jevId;
      if (!jevId || String(eventJevId) !== String(jevId)) return;
      setBalanceRefreshKey((k) => k + 1);
    };

    window.addEventListener("jev_entry_data_updated", handleEntryChange);
    window.addEventListener("jev_entry_data_deleted", handleEntryChange);
    return () => {
      window.removeEventListener("jev_entry_data_updated", handleEntryChange);
      window.removeEventListener("jev_entry_data_deleted", handleEntryChange);
    };
  }, [voucher?.nJEVId]);

  const jevBalanceMessage = useMemo(() => {
    const a = jevBalanceAmounts;
    switch (jevBalanceStatus) {
      case "no_entries":
        return "JEV Entries not yet added";
      case "unbalanced":
        return a
          ? `JEV entries not balanced yet — From ₱${centsLabel(a.fromCents)} / To ₱${centsLabel(a.toCents)}`
          : "JEV entries not balanced yet";
      case "balanced_mismatch":
        return a
          ? `JEV entries balance at ₱${centsLabel(a.fromCents)} but the grand total is ₱${centsLabel(a.grandCents)}`
          : "JEV entries balanced but do not match the grand total";
      default:
        return "";
    }
  }, [jevBalanceStatus, jevBalanceAmounts]);
  const accountPath = (account) => {
    const names = [];
    let cur = account;
    let guard = 0;
    while (cur && guard < 10) {
      names.unshift(cur.display_name || cur.strAccountName || "");
      cur = cur.parent ?? null;
      guard++;
    }
    return names.join(" / ");
  };

  // True when any "To" entry (dAmount >= 0) is an Inventories account
  const jevToIsInventory = () =>
    jevEntries
      .filter((e) => Number(e.dAmount) >= 0)
      .some((e) =>
        accountPath(e.journal_account)
          .trim()
          .toLowerCase()
          .startsWith("inventories"),
      );
  // ── Purchase option histories ────────────────────────────────────────
  useEffect(() => {
    if (!voucher || isAssigneeType || !pendingReceiptKey) return;

    const ids = (voucher.voucher_suppliers ?? [])
      .flatMap((vs) => vs.purchase_order?.purchase_order_options ?? [])
      .map((o) => o.purchase_option?.nPurchaseItemId)
      .filter(Boolean);

    if (!ids.length) return;

    setHistoriesLoading(true);
    PurchaseOrderAPI.getLatestHistory({ nPurchaseItemId: ids })
      .then((res) => {
        const map = {};
        (res?.histories || []).forEach(
          (h) => (map[Number(h.nPurchaseItemId)] = h),
        );
        setOptionHistories(map);
      })
      .catch((err) => console.error("History fetch error:", err))
      .finally(() => setHistoriesLoading(false));
  }, [voucher, pendingReceiptKey, isAssigneeType]);

  // ── Helper display flags ─────────────────────────────────────────────
  const firstAssignee = voucher?.voucher_assignees?.[0];
  const payeeName = isAssigneeType
    ? (firstAssignee?.assignee?.strAssigneeName ??
      voucher?.assignee?.strAssigneeName ??
      "—")
    : (voucher?.supplier?.strSupplierName ?? "—");
  const payeeNickName = isAssigneeType
    ? (firstAssignee?.assignee?.strAssigneeNickName ??
      voucher?.assignee?.strAssigneeNickName ??
      "—")
    : (voucher?.supplier?.strSupplierNickName ?? "—");
  const supplierTIN = isAssigneeType
    ? firstAssignee?.assignee?.strTIN
    : voucher?.supplier?.strTIN;
  const supplierAddress = isAssigneeType
    ? firstAssignee?.assignee?.strAddress
    : voucher?.supplier?.strAddress;
  const particularsCount = isAssigneeType
    ? assigneeLinks.length
    : supplierLinks.length;

  // ── Company (for logo on preview) ───────────────────────────────────
  // Supplier-type: same lookup chain as the PO preview.
  // Assignee-type: no PO chain exists, so fall back to the voucher's own company.
  const firstPOOption =
    supplierLinks?.[0]?.purchase_order?.purchase_order_options?.[0];
  const company = isAssigneeType
    ? (voucher?.company ?? null)
    : (firstPOOption?.purchase_option?.transaction_item?.transaction?.company ??
      null);

  const isClosed = String(voucher?.cStatus) === String(voucherClosedKey);
  const isMarkedPaid = String(voucher?.cStatus) === String(voucherPaidKey);
  const isEligibleForPaid = isClosed; // Mark as Paid → ONLY when Closed
  const isEligibleForUnpaid = isMarkedPaid; // Mark as Unpaid → ONLY when Paid
  const canShowPrintButtons = isClosed || isMarkedPaid;

  // ── Items that already arrived ────────────────────────────────────────
  // The voucher's own POs come WITHOUT the inventory stats (those are
  // attached by the PO list query), so the received quantities are asked
  // for directly: a received row (positive qty) on any of the linked items
  // means the goods are already in hand and the voucher cannot be unpaid or
  // cancelled. A delivered row (negative qty) counts too — the goods are
  // already gone out. This mirrors the API's own guard exactly.
  const linkedItemIds = useMemo(() => {
    const ids = (voucher?.voucher_suppliers ?? []).flatMap((link) =>
      (link.purchase_order?.purchase_order_options ?? [])
        .map((opt) => opt.purchase_option?.nPurchaseItemId)
        .filter(Boolean)
        .map(String),
    );
    return [...new Set(ids)];
  }, [voucher]);

  const [arrivedItemIds, setArrivedItemIds] = useState(() => new Set());

  useEffect(() => {
    if (isAssigneeType || !linkedItemIds.length) {
      setArrivedItemIds(new Set());
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await InventoryAPI.getHistoryBulk(linkedItemIds);
        const rows = res?.rows ?? res?.data?.rows ?? {};
        const arrived = new Set();
        for (const id of linkedItemIds) {
          const list = rows?.[id] ?? [];
          const received = (Array.isArray(list) ? list : []).some(
            (r) =>
              Number(r?.nQuantity) !== 0 &&
              ["A", "P"].includes(String(r?.cStatus || "").trim()),
          );
          if (received) arrived.add(id);
        }
        if (active) setArrivedItemIds(arrived);
      } catch (err) {
        console.error("Failed to load the received items:", err);
        if (active) setArrivedItemIds(new Set());
      }
    })();
    return () => {
      active = false;
    };
  }, [linkedItemIds, isAssigneeType]);

  const hasArrivedItems = arrivedItemIds.size > 0;

  // ── Open a transaction in the For Purchase workspace ──────────────────
  // The brand · model of a particular is a link — it opens the transaction
  // the item belongs to, the same workspace the PO detail page opens.
  const openTransactionForPurchase = useCallback(
    async (transaction) => {
      if (!transaction?.nTransactionId) return;
      await openForPurchase(navigate, {
        transaction,
        currentUserId,
        keys: {
          isManagement,
          isAccountOfficer,
          isAOTL,
          isProcurement,
          transacstatus,
          ao_status,
          itemType,
          procMode,
          procSource,
          statusTransaction,
          archiveStatus,
          forPurchaseKey,
          forCollectionKey,
          forCanvasKey,
          canvasFinalizeKey,
          canvasVerificationKey,
          itemsManagementKey,
          forPricingKey,
          priceVerificationKey,
          priceApprovalKey,
          priceSettingKey,
          priceFinalizeVerificationKey,
          cancelledPOKey,
          cartKey,
          forApprovalKey,
          forPaymentKey,
          pendingReceiptKey,
          forDeliveryKey,
          deliveredKey,
          removedFromCartKey,
        },
      });
    },
    [
      navigate,
      currentUserId,
      isManagement,
      isAccountOfficer,
      isAOTL,
      isProcurement,
      transacstatus,
      ao_status,
      itemType,
      procMode,
      procSource,
      statusTransaction,
      archiveStatus,
      forPurchaseKey,
      forCollectionKey,
      forCanvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
      itemsManagementKey,
      forPricingKey,
      priceVerificationKey,
      priceApprovalKey,
      priceSettingKey,
      priceFinalizeVerificationKey,
      cancelledPOKey,
      cartKey,
      forApprovalKey,
      forPaymentKey,
      pendingReceiptKey,
      forDeliveryKey,
      deliveredKey,
      removedFromCartKey,
    ],
  );

  // Supplier-type: payment terms live on the linked Purchase Order.
  // Assignee-type: no PO chain exists, so fall back to the voucher's own column.
  const cPaymentTerms = isAssigneeType
    ? (voucher?.cPaymentTerms ?? null)
    : (voucher?.voucher_suppliers?.[0]?.purchase_order?.cPaymentTerms ?? null);

  // ── JEV handlers ─────────────────────────────────────────────────────
  const handleAddJev = () => setShowJevConfirm(true);
  const handleViewJev = () => setShowJevPanel(true);
  const confirmCreateJev = async () => {
    const entity = "JEV";
    setShowJevConfirm(false);
    try {
      await withSpinner(entity, async () => {
        await VoucherAPI.createJev(voucher.nVoucherId, {
          cJEVLinkType: jevDisbursementVoucherKey,
        });
        await fetchVoucher();
        notifyUpdated();
      });
      await showSwal("SUCCESS", {}, { entity, action: "created" });
      setShowJevPanel(true);
    } catch (err) {
      console.error("Create JEV failed:", err);
      await showSwal("ERROR", {}, { entity });
    }
  };

  // ── Item handlers ────────────────────────────────────────────────────
  const handleRemovePO = async (id) => {
    await VoucherSupplierAPI.delete(id);
    await fetchVoucher();
    notifyUpdated();
  };

  const handleEditAssignee = (assignee) => {
    setEditingAssignee(assignee);
    setFormData({
      particular: assignee.strParticular || "",
      amount: assignee.dAmount || "",
      quantity: assignee.nQuantity || 1,
      strUOM: assignee.strUOM || "",
      companyId: assignee.nCompanyId || "",
      ewt: assignee.dEWT || "",
    });
    setShowAddItem(true);
  };

  const handleDeleteAssignee = async (id) => {
    const res = await VoucherAssigneeAPI.delete(id);
    notifyUpdated();
    if (res.voucher_deleted) {
      navigate("/voucher");
    } else {
      await fetchVoucher();
    }
  };

  const handleSaveAssignee = async () => {
    const errs = {};
    if (!formData.particular?.trim())
      errs.particular = "Particular is required";
    if (!formData.amount || Number(formData.amount) <= 0)
      errs.amount = "Amount must be > 0";
    if (!formData.quantity || Number(formData.quantity) <= 0)
      errs.quantity = "Quantity must be > 0";
    // EWT is optional, but it can never be negative or exceed the line total.
    const ewt = Number(formData.ewt || 0);
    if (!Number.isFinite(ewt) || ewt < 0)
      errs.ewt = "EWT must be 0 or more";
    else if (ewt > Number(formData.amount || 0) * Number(formData.quantity || 1))
      errs.ewt = "EWT cannot exceed the line total";
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        strParticular: formData.particular,
        dAmount: Number(formData.amount),
        nQuantity: Number(formData.quantity),
        strUOM: formData.strUOM || "",
        nCompanyId: formData.companyId || null,
        dEWT: ewt,
      };

      editingAssignee
        ? await VoucherAssigneeAPI.update(
            editingAssignee.nVoucherAssigneeId,
            payload,
          )
        : await VoucherAssigneeAPI.create({
            nVoucherId: voucher.nVoucherId,
            nAssigneeId: firstAssignee.nAssigneeId,
            ...payload,
          });

      await fetchVoucher();
      notifyUpdated();
      setShowAddItem(false);
      setEditingAssignee(null);
      setFormData({
        particular: "",
        amount: "",
        quantity: 1,
        strUOM: "",
        companyId: "",
        ewt: "",
      });
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const buildParticulars = () =>
    isAssigneeType
      ? assigneeLinks.map((a) => ({
          particular: a.strParticular,
          quantity: Number(a.nQuantity || 1),
          unitAmount: Number(a.dAmount || 0),
          amount: Number(a.dAmount || 0) * Number(a.nQuantity || 1),
          strUOM: a.strUOM || "",
          ewt: Number(a.dEWT || 0),
        }))
      : supplierLinks.map((vs) => {
          const po = vs.purchase_order;
          const opts = po?.purchase_order_options ?? [];
          // The transaction(s) this PO charges — through each option's
          // purchase_option · transaction_item · transaction chain. A PO
          // is a single deal, but options can come from more than one
          // transaction's item, so distinct codes joined with " / ".
          const txCodes = [
            ...new Set(
              opts
                .map(
                  (o) =>
                    o.purchase_option?.transaction_item?.transaction
                      ?.strCode || "",
                )
                .filter(Boolean),
            ),
          ];
          const poCode =
            po?.strPurchaseOrderNo ?? `PO #${vs.nPurchaseOrderId}`;

          return {
            particular: txCodes.length
              ? `${poCode} / ${txCodes.join(" / ")}`
              : poCode,
            amount: opts.reduce(
              (sum, o) =>
                sum +
                (o.purchase_option?.nQuantity || 0) *
                  (o.purchase_option?.dUnitPrice || 0),
              0,
            ),
            strUOM: "txn", // hardcoded, always "txn" for supplier-type
          };
        });

  const handlePreviewVoucher = async () => {
    try {
      const particulars = buildParticulars();

      if (String(voucher.cStatus) === String(voucherActiveKey)) {
        await withSpinner("Voucher", async () => {
          await VoucherAPI.updateVoucherStatus(
            voucher.nVoucherId,
            voucherClosedKey,
          );
          await fetchVoucher();
          notifyUpdated();
        });
      }

      // Uses the jevEntries already held in state (kept fresh via the fetch
      // effect + real-time listeners above) — no extra network round trip
      // right before navigating, which was causing a delay on click.
      navigate("/preview-voucher", {
        state: {
          voucher,
          isAssigneeType,
          payeeName,
          payeeNickName,
          supplierTIN,
          supplierAddress,
          particulars,
          cPaymentTerms,
          paymentTerms,
          // Same value for both voucher types now: supplier vouchers sum the
          // linked POs' dEWT, assignee vouchers sum each particular's dEWT.
          ewtAmount,
          company,
          jevEntries,
          onlineKey,
          onlineLabel,
          cashKey,
          creditCardKey,
          chequeKey,
          otherPaymentTermKey,
          cashLabel,
          creditCardLabel,
          chequeLabel,
          otherPaymentTermLabel,
        },
      });
    } catch (err) {
      console.error("Preview voucher error:", err);
      await showSwal("ERROR", {}, { entity: "Voucher" });
    }
  };
  const handlePreviewCheque = async () => {
    try {
      // Withheld tax never reaches the payee, so both voucher types are
      // net of EWT on the cheque.
      const chequeAmount = particularsGrandTotal - ewtAmount;

      if (String(voucher.cStatus) === String(voucherActiveKey)) {
        await withSpinner("Voucher", async () => {
          await VoucherAPI.updateVoucherStatus(
            voucher.nVoucherId,
            voucherClosedKey,
          );
          await fetchVoucher();
          notifyUpdated();
        });
      }

      navigate("/preview-cheque", {
        state: {
          cheque: voucher?.cheque ?? null,
          payeeName,
          amount: chequeAmount,
        },
      });
    } catch (err) {
      console.error("Preview cheque error:", err);
      await showSwal("ERROR", {}, { entity: "Voucher" });
    }
  };
  const ACTION_LABELS = {
    cancel: "cancelled",
    reopen: "reopened",
    paid: "marked as paid",
    unpaid: "marked as unpaid",
    close: "closed",
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    const entity = "Voucher";

    setConfirmAction(null);

    if (action === "print_only") {
      try {
        await withSpinner(entity, handlePreviewVoucher);
        await fetchVoucher();
      } catch (err) {
        console.error("Preview voucher error:", err);
        await showSwal("ERROR", {}, { entity });
      }
      return;
    }

    if (action === "finalize_jev" || action === "undo_finalize_jev") {
      const jevId = voucher?.jev?.nJEVId;
      if (!jevId) {
        await showSwal(
          "ERROR",
          {},
          { entity: "JEV", message: "JEV not found" },
        );
        return;
      }
      try {
        await withSpinner("JEV", async () => {
          await JevAPI.update(jevId, { cStatus: "toggle" });
          await fetchVoucher();
          notifyUpdated();
        });
        const actionLabel =
          action === "finalize_jev" ? "finalized" : "status updated";
        await showSwal("SUCCESS", {}, { entity: "JEV", action: actionLabel });
      } catch (err) {
        console.error("Toggle JEV status failed:", err);
        await showSwal("ERROR", {}, { entity: "JEV" });
      }
      return;
    }

    if (action === "print_cheque") {
      try {
        await withSpinner(entity, async () => {
          sessionStorage.setItem(
            "printCheque_data",
            JSON.stringify({
              voucher,
              payeeName,
              particulars: buildParticulars(),
              isAssigneeType,
              ewtAmount,
            }),
          );
          printRoute("/print-cheque");
        });
      } catch (err) {
        console.error("Print cheque error:", err);
        await showSwal("ERROR", {}, { entity });
      }
      return;
    }

    try {
      await withSpinner(entity, async () => {
        switch (action) {
          case "close":
            await VoucherAPI.updateVoucherStatus(
              voucher.nVoucherId,
              voucherClosedKey,
            );
            break;
          case "cancel":
            await VoucherAPI.updateVoucherStatus(
              voucher.nVoucherId,
              voucherCancelledKey,
            );
            break;
          case "reopen":
            await VoucherAPI.updateVoucherStatus(
              voucher.nVoucherId,
              voucherActiveKey,
            );
            break;
          case "paid": {
            const insertInventory = !isAssigneeType && jevToIsInventory();
            isAssigneeType
              ? await VoucherAPI.updateVoucherStatus(
                  voucher.nVoucherId,
                  voucherPaidKey,
                )
              : await Promise.all([
                  PurchaseOrderAPI.updateCartStatusBulk({
                    nPurchaseOrderIds: supplierLinks.map(
                      (vs) => vs.nPurchaseOrderId,
                    ),
                    nStatus: insertInventory
                      ? forDeliveryKey
                      : pendingReceiptKey,
                    nUserId: currentUserId,
                  }),
                  VoucherAPI.updateVoucherStatus(
                    voucher.nVoucherId,
                    voucherPaidKey,
                    { insertInventory },
                  ),
                ]);
            break;
          }
          case "unpaid":
            if (isAssigneeType) {
              await VoucherAPI.updateVoucherStatus(
                voucher.nVoucherId,
                voucherClosedKey,
              );
            } else {
              // Voucher first: if the backend rejects it, the PO is not moved
              await VoucherAPI.updateVoucherStatus(
                voucher.nVoucherId,
                voucherClosedKey,
                { removeInventory: true },
              );
              await PurchaseOrderAPI.updateCartStatusBulk({
                nPurchaseOrderIds: supplierLinks.map(
                  (vs) => vs.nPurchaseOrderId,
                ),
                nStatus: forPaymentKey,
                nUserId: currentUserId,
              });
            }
            break;
        }
      });

      await showSwal("SUCCESS", {}, { entity, action: ACTION_LABELS[action] });
      notifyUpdated();

      if (["cancel", "reopen", "close", "paid", "unpaid"].includes(action)) {
        navigate("/voucher");
      } else {
        await fetchVoucher();
      }
    } catch (err) {
      console.error(`Failed to ${action} voucher:`, err);
      // The API explains WHY it refused (items already arrived, …) — show
      // that instead of a bare "something went wrong".
      await showSwal(
        "ERROR",
        err?.message ? { text: err.message } : {},
        { entity },
      );
    }
  };

  return {
    voucher,
    company, // ← add this
    loading: loading || mappingLoading,
    voucherId,
    voucherAssigneeTypeKey,
    voucherActiveKey,
    voucherClosedKey,
    voucherPaidKey,
    voucherCancelledKey,
    voucherStatus,
    currentUserId,
    isManagement,
    isFinanceOfficer,
    chequeKey,
    jevDisbursementVoucherKey,
    isAssigneeType,
    assigneeLinks,
    supplierLinks,
    hasJev,
    hasActiveJev,
    particularsGrandTotal,
    particularsCount,
    payeeName,
    payeeNickName,
    supplierTIN,
    supplierAddress,
    cPaymentTerms,
    paymentTerms,
    isEligibleForPaid,
    isEligibleForUnpaid,
    hasArrivedItems,
    openTransactionForPurchase,
    isMarkedPaid,
    // The PO status a voucher may pay — only a PO waiting for payment can
    // be linked to a voucher.
    forPaymentKey,
    historiesLoading,
    ewtAmount,
    ewtLoading,
    firstAssignee,
    showAddItem,
    setShowAddItem,
    editingAssignee,
    setEditingAssignee,
    saving,
    formData,
    setFormData,
    formErrors,
    confirmAction,
    setConfirmAction,
    confirmLoading,
    showJevConfirm,
    setShowJevConfirm,
    creatingJev,
    showJevPanel,
    setShowJevPanel,
    isJevBalanced,
    jevBalanceLoading,
    jevBalanceStatus,
    jevBalanceMessage,
    handleBack,
    handleAddJev,
    handleViewJev,
    confirmCreateJev,
    handleRemovePO,
    handleEditAssignee,
    handleDeleteAssignee,
    handleSaveAssignee,
    handleConfirmAction,
    handlePreviewVoucher,
    handlePreviewCheque,
    fetchVoucher,
    jev_types,
    jev_status,
    jevPendingKey,
    jevCancelledKey,
    canShowPrintButtons,
  };
}
