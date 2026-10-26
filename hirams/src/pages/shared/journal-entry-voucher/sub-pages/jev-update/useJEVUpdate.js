import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import VoucherAPI from "../../../../../api/endpoints/voucher.api.js";
import JevAPI from "../../../../../api/endpoints/jev.api.js";
import JevEntriesAPI from "../../../../../api/endpoints/jev-entries.api.js";
import InventoryAPI from "../../../../../api/endpoints/inventory.api.js";
import { withSpinner, showSwal } from "../../../../../utils/helpers/swal.jsx";
import {
  mapInventoryItems,
  itemTotal,
  isDeliveredRow,
  rowTransactionId,
} from "../../../inventory/itemRows.js";
import useJEVBalance, {
  computeJevBalance,
} from "../../../../../hooks/useJEVBalance.js";
import useSellingPrices from "../../../inventory/useSellingPrices.js";
import useKeysLabels from "../../../../../hooks/useKeysLabels.js";
import { openForPurchase } from "../../../../../utils/helpers/openForPurchase.js";
import { getItem } from "../../../../../utils/storage/localStorage.js";

// jev_status codes straight from config/mappings.php. Only these two
// matter here: an ACTIVE JEV left unbalanced by its own entries is put
// back to PENDING when the page is left through its Back button.
const STATUS_ACTIVE = "A";
const STATUS_PENDING = "P";

// Full-page viewer for ONE JEV — the list page's View opens it as
// /jev-update?id=… instead of a modal (the viewer body is the very one
// JevEntriesViewModal shows: particulars on top, the inventory Items
// table for R / D types, then JevViewPanel with its entries).
//
// What the top block holds depends on what the JEV was made from:
//
//   • V / C types → the voucher's Particulars, loaded on open and cached
//     per JEV id. Only printed when it has rows.
//   • R / D types (Received Purchases / Delivered Items) → NO voucher
//     exists behind them, so the block is the inventory Items table.
//     R lists the batches this JEV actually covers; D lists the WHOLE
//     delivered group (same client + company), as JEVEntryAEModal does.
//   • N (No Type / Other JEV) → neither a voucher nor inventory stands
//     behind it, so the JEV names ITSELF: `strTitle` is edited right in
//     the JEV Info row, alongside the date, and is required there.
//
// Entries are managed only for Management / Finance Officer — same gate
// the list page passed the modal ({ isManagement, isFinanceOfficer }),
// which unlocks the Add / Edit / Delete Entry controls and lifts the
// panel's pending-only status gate.
//
// Adding or editing an entry opens JEVEntryAEModal — the standalone entry
// form modal, owned entirely by JevViewPanel's built-in form path.
export default function useJEVUpdate({ jevId: jevIdOverride } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // /jev-update?id=… — the very deep link list page's View writes. A call
  // that hands its own jevId (embedded uses outside this route) wins over
  // the URL, so the same content powers both the full page and any host.
  const jevIdParam = searchParams.get("id");
  const jevId =
    jevIdOverride != null
      ? String(jevIdOverride)
      : jevIdParam
        ? String(jevIdParam)
        : "";

  const {
    jev_types,
    jev_status,
    jevPendingKey,
    // The transaction status keys — the brand · model opens the transaction
    // in the For Purchase workspace, and that workspace is driven by them.
    isManagement,
    // The clickable navigations (DV code → voucher, brand · model →
    // transaction) are finance / management only.
    isFinanceOfficer,
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
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,
    removedFromCartKey,
  } = useKeysLabels();

  // ── The JEV itself ───────────────────────────────────────────────────
  // Rebuilt WITHOUT `entries` → JevViewPanel fetches them fresh with
  // their journal_account data (same trick the viewer modal and
  // LedgerPanel use).
  const [jev, setJev] = useState(null);
  const [loadingJev, setLoadingJev] = useState(true);

  const fetchJev = useCallback(async () => {
    if (!jevId) {
      setLoadingJev(false);
      return;
    }
    setLoadingJev(true);
    try {
      // 25s — a page must never hang on one endpoint for the axios-wide
      // 120s; past it this reads as a failed load, not an eternal spin.
      const res = await JevAPI.getById(jevId, { timeout: 25000 });
      const data = Array.isArray(res) ? res[0] : (res?.data ?? res);
      // Rebuilt WITHOUT `entries` — the panel fetches those itself.
      if (data?.nJEVId) {
        setJev({
          nJEVId: data.nJEVId,
          strJEVNumber: data.strJEVNumber ?? "",
          // Only a No Type JEV carries one; the panel's header edits it
          // in place — dropping this and its title never renders.
          strTitle: data.strTitle ?? "",
          dtOccur: data.dtOccur ?? "",
          cStatus: data.cStatus ?? "",
          cJEVLinkType: data.cJEVLinkType ?? "",
        });
      } else {
        setJev(null);
      }
    } catch (err) {
      console.error("Failed to fetch the JEV:", err);
      setJev(null);
    } finally {
      setLoadingJev(false);
    }
  }, [jevId]);

  useEffect(() => {
    fetchJev();
  }, [fetchJev]);

  // ── Roles ────────────────────────────────────────────────────────────
  // The viewer's entry CRUD gate — Management / Finance Officer only,
  // exactly what the list page handed the modal as entryCrud.
  const canManage = Boolean(isManagement || isFinanceOfficer);

  // Who gets the blue navigation links — every "open this voucher / this
  // transaction / this PO" is a jump only finance and management make; the
  // other roles read the particulars as plain text.
  const canNavigate = isFinanceOfficer || isManagement;

  // The signed-in user — the workspace needs it to load the transaction the
  // way this role sees it.
  const currentUserId = useMemo(() => getItem("user", {})?.nUserId, []);

  // ── The voucher behind the JEV (V / C types) ─────────────────────────
  const [voucher, setVoucher] = useState(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);

  useEffect(() => {
    if (!jevId) return;
    let active = true;
    (async () => {
      setLoadingVoucher(true);
      try {
        const res = await VoucherAPI.getVouchers({ timeout: 25000 });
        const list = Array.isArray(res) ? res : res?.data || [];
        if (active) {
          setVoucher(list.find((v) => String(v.nJEVId) === jevId) || null);
        }
      } catch (err) {
        console.error("Failed to load the voucher behind this JEV:", err);
        if (active) setVoucher(null);
      } finally {
        if (active) setLoadingVoucher(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [jevId]);

  // ── Inventory-backed JEVs ──────────────────────────────────────────
  // R (Received Purchases) and D (Delivered Items) are stamped onto
  // inventory rows by InventoryController::bulkCreateJev — there is no
  // voucher for them, so their top block is that Items table instead.
  //
  // The fetch waits until the JEV ITSELF has loaded (loadingJev guard):
  // with `jev` still null the type reads unknown, and fetching on that
  // guess would start a request that the arriving type then cancels —
  // whose skipped `finally` (the cancelled guard) leaves loadingInventory
  // latched true forever. For the same reason only a REAL R / D type
  // starts the fetch; an unknown type after the load is simply not
  // inventory-backed and shows nothing here.
  const linkType = String(jev?.cJEVLinkType ?? "").toUpperCase();
  const isInventoryBacked = linkType === "R" || linkType === "D";

  const [inventory, setInventory] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    if (loadingJev) return;
    if (!jevId || !isInventoryBacked) return;
    if (inventory !== null) return;
    let cancelled = false;
    (async () => {
      setLoadingInventory(true);
      try {
        const res = await InventoryAPI.getInventory({ timeout: 25000 });
        if (!cancelled) setInventory(res?.inventories ?? []);
      } catch (err) {
        console.error("Failed to load the inventory behind this JEV:", err);
        if (!cancelled) setInventory([]);
      } finally {
        if (!cancelled) setLoadingInventory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jevId, isInventoryBacked, inventory, loadingJev]);

  // Every inventory row this JEV actually covers: the pending batches
  // before it is finalized, the API's already-aggregated 'A' entry after.
  // (A D JEV is the exception — it widens to its whole delivered group,
  // see the branch below.)
  // Rows cancelled later keep their nJEVId and stay listed — dropping them
  // would silently shrink the total this JEV was built on.
  //
  // An aggregated entry (Stock / Delivered) sums several rows that can
  // carry DIFFERENT JEVs — a received batch paid by voucher gets the V
  // JEV, a later one its own R JEV — and only the FIRST row's id sits on
  // nJEVId, so nJEVIds (every JEV of the rows behind the entry) has to be
  // consulted too or that JEV's Items block comes up empty.
  const itemRows = useMemo(() => {
    if (!jevId || !isInventoryBacked || !inventory) return [];

    const idsOf = (i) =>
      Array.isArray(i.nJEVIds) && i.nJEVIds.length
        ? i.nJEVIds.map(String)
        : [String(i.nJEVId ?? "")];

    const matched = inventory.filter((i) => idsOf(i).includes(jevId));

    // ── D (Delivered Items) ─────────────────────────────────────────
    // The WHOLE delivered group, never just this JEV's own rows — the
    // very table JEVEntryAEModal shows for the same JEV (PendingInventory
    // builds that one from the open group: every delivered batch of the
    // same client + company). bulkCreateJev books a whole group on ONE
    // JEV per direction, but a group can still hold more than one JEV
    // (both directions, or legacy per-item ones), so scoping to `matched`
    // alone could list only part of what the entry modal beside it lists.
    //
    // The group is keyed off the rows this JEV covers (same client, same
    // company); the rows this JEV itself carries are always kept, so a
    // batch booked under another JEV of the group can never drop out.
    // Direction guard, delivered side: a Delivered entry also lists the
    // purchase's R JEV (so the item details can show it) — those rows are
    // not part of a D JEV's own table. isDeliveredRow knows both shapes:
    // raw rows by their negative qty, the aggregated one by its 'D'
    // status (its qty is already abs).
    if (linkType === "D") {
      const seed = matched.find((i) => isDeliveredRow({ _raw: i }));
      if (!seed) return []; // nothing delivered carries this JEV
      const client = String(seed.strClientNickName ?? "—");
      const company = String(seed.strCompanyNickName ?? "—");
      const ownIds = new Set(matched.map((i) => i.nInventoryId));

      return mapInventoryItems(
        inventory.filter(
          (i) =>
            isDeliveredRow({ _raw: i }) &&
            (ownIds.has(i.nInventoryId) ||
              (String(i.strClientNickName ?? "—") === client &&
                String(i.strCompanyNickName ?? "—") === company)),
        ),
      );
    }

    // ── R (Received Purchases), and an absent/unknown type ──────────
    // Everything still carrying this JEV is the RECEIVED side: pending
    // and cancelled batches as they are, plus — once the purchase item is
    // approved — the aggregates getInventory folds it into:
    //
    //   Stock     = what is still on hand   (positive rows, net of…)
    //   Delivered = what has since gone out (the negative rows)
    //
    // The Delivered aggregate MUST stay in: it lists this R JEV because
    // its goods were received under it, and dropping it emptied this
    // block twice over —
    //   • fully delivered: getInventory emits NO Stock entry at all
    //     (stockQty is 0), so the Delivered one was the only row left
    //     and an R JEV showed no Items table while the D JEV beside it
    //     did;
    //   • partially delivered: the block was short everything that had
    //     gone out, so its total no longer matched the amount the JEV
    //     was booked for.
    //
    // Stock + Delivered of ONE purchase item IS the quantity received,
    // so the two aggregates are merged back into a single row — one
    // batch, received quantity, listed once instead of split in two.
    const rows = [];
    const aggregateAt = new Map(); // nPurchaseItemId → slot in `rows`
    matched.forEach((i) => {
      const isAggregate = i.cStatus === "S" || i.cStatus === "D";
      if (!isAggregate) {
        rows.push(i);
        return;
      }

      const key = String(i.nPurchaseItemId ?? i.nInventoryId);
      const at = aggregateAt.get(key);
      if (at === undefined) {
        aggregateAt.set(key, rows.length);
        rows.push(i);
        return;
      }

      const prev = rows[at];
      // Prefer the Stock entry as the base: it carries the received rows.
      const base = prev.cStatus === "S" ? prev : i;
      rows[at] = {
        ...base,
        nQuantity: Number(prev.nQuantity ?? 0) + Number(i.nQuantity ?? 0),
        nInventoryIds: [
          ...(prev.nInventoryIds ?? []),
          ...(i.nInventoryIds ?? []),
        ],
        nJEVIds: [...new Set([...(prev.nJEVIds ?? []), ...(i.nJEVIds ?? [])])],
      };
    });

    return mapInventoryItems(rows);
  }, [inventory, jevId, isInventoryBacked, linkType]);

  // An R JEV's table is the RECEIVED side: its rows are valued at cost,
  // so the selling columns — which only mean something once a batch has
  // gone OUT — stay hidden even when the batch shown is one that has
  // since been delivered. No prices are fetched for it either.
  const isReceivedSide = linkType === "R";

  const itemsTotal = useMemo(
    () => itemRows.reduce((sum, r) => sum + itemTotal(r), 0),
    [itemRows],
  );

  // Unit selling price for a DELIVERED JEV's table — resolves through the
  // chosen pricing set of each row's transaction (see useSellingPrices).
  // A received JEV fetches nothing here: the table hides those columns
  // (isReceivedSide), so handing it an empty list keeps the lookup off.
  const sellingPrices = useSellingPrices(isReceivedSide ? [] : itemRows);

  // Same rule VoucherUpdateView uses to pick its particulars panel.
  const isAssigneeType =
    (voucher?.voucher_assignees?.length ?? 0) > 0 &&
    !(voucher?.voucher_suppliers?.length > 0);
  const assigneeLinks = voucher?.voucher_assignees ?? [];
  const supplierLinks = voucher?.voucher_suppliers ?? [];

  // ── The voucher's identity ──────────────────────────────────────────
  // The particulars card prints the voucher's number, the supplier's name,
  // its address and its TIN — the same header the voucher page shows. The
  // supplier's details ride on the voucher's own relation (the list
  // endpoint loads it); without them the card fell back to "No Address &
  // TIN attached.".
  const voucherNumber = voucher?.strNumber ?? "";
  const supplierNickName = voucher?.supplier?.strSupplierNickName ?? "";
  const supplierAddress = voucher?.supplier?.strAddress ?? "";
  const supplierTIN = voucher?.supplier?.strTIN ?? "";

  // Only print a Particulars block that has rows in it — an empty panel
  // tells the reader nothing about what this JEV covers.
  const particularsCount = isAssigneeType
    ? assigneeLinks.length
    : supplierLinks.length;
  const showParticulars = Boolean(voucher) && particularsCount > 0;

  // ── Balance banner ──────────────────────────────────────────────────
  // From and To must square for this JEV to be balanced; the banner says
  // so while they don't. The hook re-checks on every entry added, edited
  // or deleted (JevViewPanel publishes those events), so the warning
  // clears itself the moment the JEV balances.
  //
  // Strictness is OFF on purpose: the figure this page holds (itemsTotal)
  // is the batches' PURCHASE value, while a delivered JEV is booked at the
  // SELLING price and a voucher / No Type JEV has no Items total at all —
  // insisting on a match would flag perfectly balanced JEVs as wrong.
  const balance = useJEVBalance(jevId, itemsTotal, false);

  // Dismissed text of the unbalanced-JEV banner — cleared whenever the
  // page opens or switches JEV, and per-message so a NEW problem (e.g.
  // "Entries not yet added" → "not balanced yet") resurfaces even if the
  // earlier one was dismissed.
  const [dismissedBalanceMsg, setDismissedBalanceMsg] = useState(null);
  useEffect(() => {
    setDismissedBalanceMsg(null);
  }, [jevId]);

  const dismissBalanceMsg = useCallback(
    () => setDismissedBalanceMsg(balance.message),
    [balance.message],
  );

  const showBalanceBanner =
    !balance.loading && !!balance.message && dismissedBalanceMsg !== balance.message;

  // ── Active → Pending on leaving an unbalanced JEV ────────────────────
  // The one automatic status move this page makes — the same rule the
  // viewer modal ran on close (demoteIfUnbalanced): a JEV that was ACTIVE
  // when it was opened and whose From / To sides no longer square is put
  // back to PENDING when it is left through this page's Back button, so a
  // half-edited JEV can never sit in the list wearing an Active badge.
  // Any other status the JEV was opened with is left exactly as it is.
  //
  // Other JEV (N) is EXEMPT: it finalizes from this very page now, and
  // the user asked for the automatic demote gone for it — whatever status
  // it walks in with, it walks out with.
  //
  // The verdict is fetched FRESH rather than read off `balance`: that
  // state can still be mid-flight from the last entry save when Back is
  // clicked, and "no verdict yet" must never pass for "balanced".
  // Strictness stays OFF for the same reason it is off on the banner.
  //
  // Silent by contract: no toast, no dialog. The list refetches off the
  // dispatched jev_data_updated (and JevNav recounts its badge from it).
  const demotedRef = useRef(false);
  useEffect(() => {
    // A fresh opening must be able to demote again — the ref only guards
    // ONE leaving of ONE JEV.
    demotedRef.current = false;
  }, [jevId]);

  const demoteIfUnbalanced = useCallback(async () => {
    if (demotedRef.current) return; // one leaving, one check
    if (!jevId || String(jev?.cStatus ?? "") !== STATUS_ACTIVE) return;
    if (linkType === "N") return; // Other JEV: no automatic demote on leave
    demotedRef.current = true;
    try {
      const res = await JevEntriesAPI.getByJevId(jevId);
      const list = Array.isArray(res) ? res : res?.data ?? [];
      const verdict = computeJevBalance(list, itemsTotal, {
        requireTotalMatch: false,
      });
      if (verdict.balanced) return;
      await JevAPI.update(jevId, { cStatus: STATUS_PENDING });
      window.dispatchEvent(new CustomEvent("jev_data_updated"));
    } catch (err) {
      console.error("Failed to set the unbalanced JEV back to Pending:", err);
    }
  }, [jevId, jev?.cStatus, itemsTotal, linkType]);

  // Whether leaving now would demote the JEV — the banner prints its
  // Pending note from the very same condition, so the promise shown to
  // the reader can never drift from what goBack actually does. Other JEV
  // (N) never demotes, so it never shows the note either.
  const willDemoteOnLeave =
    !!jevId &&
    linkType !== "N" &&
    String(jev?.cStatus ?? "") === STATUS_ACTIVE;

  // The Back button: the unbalanced Active → Pending check runs first,
  // then the page returns to the list (the same funnel every close path
  // of the old modal used — Cancel / X / backdrop / Escape).
  const goBack = useCallback(async () => {
    await demoteIfUnbalanced();
    navigate("/journal-entry-voucher");
  }, [demoteIfUnbalanced, navigate]);

  // ── Finalize / Undo Finalize — every JEV type ───────────────────────
  // This page carries the finalize / unfinalize pair itself — the same
  // "toggle" write the voucher's page uses for the journals IT created
  // (the backend flips P ↔ A). A Cancelled journal is excluded from the
  // buttons: toggling it would resurrect it back to Pending.
  const [finalizingJev, setFinalizingJev] = useState(false);
  // Same title rule every finalize path follows (voucher, Inventory):
  // an unnamed journal cannot leave Pending.
  const jevHasTitle = Boolean(String(jev?.strTitle ?? "").trim());
  const isNoTypeJev = linkType === "N";
  const isPendingJev = String(jev?.cStatus ?? "") === STATUS_PENDING;
  const isFinalizableStatus = isPendingJev || String(jev?.cStatus ?? "") === STATUS_ACTIVE;

  const toggleJevFinalize = useCallback(async () => {
    if (!jevId || finalizingJev) return;
    setFinalizingJev(true);
    try {
      await withSpinner("JEV", async () => {
        await JevAPI.update(jevId, { cStatus: "toggle" });
        await fetchJev();
        window.dispatchEvent(new CustomEvent("jev_data_updated"));
      });
      await showSwal(
        "SUCCESS",
        {},
        {
          entity: "JEV",
          action: isPendingJev ? "finalized" : "status updated",
        },
      );
    } catch (err) {
      console.error("JEV finalize toggle failed:", err);
      await showSwal("ERROR", {}, { entity: "JEV" });
    } finally {
      setFinalizingJev(false);
    }
  }, [jevId, finalizingJev, fetchJev, isPendingJev]);

  // ── The clickable navigations ───────────────────────────────────────
  // The DV code opens the voucher itself — the same /voucher-update?id=
  // route the voucher list's View uses.
  const openVoucher = useCallback(() => {
    if (!voucher?.nVoucherId) return;
    navigate(`/voucher-update?id=${voucher.nVoucherId}`);
  }, [voucher, navigate]);

  // ── The brand · model opens its transaction ─────────────────────────
  // The item's brand · model is a link: it opens the transaction the item
  // belongs to, in the same For Purchase workspace the item-purchasing and
  // voucher pages open.
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

  // An inventory row carries only the transaction's ID — the workspace
  // fetches the rest itself.
  const openInventoryRowTransaction = useCallback(
    (row) => openTransactionForPurchase({ nTransactionId: rowTransactionId(row) }),
    [openTransactionForPurchase],
  );

  return {
    // Page
    loading: loadingJev || loadingVoucher || loadingInventory,
    jev,
    jevId,
    linkType,
    // The journal's type, in words ("Disbursement Voucher") — the header
    // must never print the raw "V" code.
    jevTypeLabel: jev_types?.[jev?.cJEVLinkType] ?? linkType,
    // Roles
    isManagement,
    isFinanceOfficer,
    canManage,
    canNavigate,
    // Mappings for the panel header
    jev_types,
    jev_status,
    jevPendingKey,
    // Particulars / items blocks
    voucher,
    showParticulars,
    isAssigneeType,
    assigneeLinks,
    supplierLinks,
    voucherNumber,
    supplierNickName,
    supplierAddress,
    supplierTIN,
    itemRows,
    itemsTotal,
    sellingPrices,
    isReceivedSide,
    // Balance banner
    balance,
    showBalanceBanner,
    dismissBalanceMsg,
    willDemoteOnLeave,
    // Leaving an unbalanced Active JEV puts it back to Pending — exported
    // for embedded hosts: their Back button runs it BEFORE dropping this
    // panel, exactly what goBack does before its own navigate.
    demoteIfUnbalanced,
    // Finalize / Undo Finalize (Other JEV only)
    isNoTypeJev,
    isPendingJev,
    isFinalizableStatus,
    jevHasTitle,
    finalizingJev,
    toggleJevFinalize,
    // Actions
    goBack,
    openVoucher,
    openTransactionForPurchase,
    openInventoryRowTransaction,
  };
}
