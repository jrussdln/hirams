import TransactionAPI from "../../api/endpoints/transaction.api.js";

/**
 * Open a transaction in the For Purchase workspace.
 *
 * The workspace (/transaction-for-purchase, or /transaction-for-collection
 * when the transaction already sits at that status) is driven entirely by
 * `location.state` — the transaction itself plus every status key and
 * mapping it needs. This helper builds that state and does the navigation,
 * so every screen that links a transaction there behaves the same.
 */

/**
 * The full transaction, straight from the transactions list.
 *
 * The PO graphs only carry a partial transaction (no current_status), so the
 * complete one is fetched before the workspace opens.
 */
export const fetchTransactionForPurchase = async (
  nTransactionId,
  { isManagement, isProcurement, currentUserId, isAOTL } = {},
) => {
  try {
    let list = [];
    if (isManagement) list = (await TransactionAPI.getAll()).transactions || [];
    else if (isProcurement)
      list =
        (await TransactionAPI.getProcurement(`nUserId=${currentUserId}`))
          .transactions || [];
    else
      list =
        (
          await TransactionAPI.getAccountOfficer(
            `nUserId=${currentUserId}&isAOTL=${isAOTL ? 1 : 0}&fetchAll=${
              isAOTL ? 1 : 0
            }`,
          )
        ).transactions || [];
    return (
      list.find(
        (t) => String(t.nTransactionId) === String(nTransactionId),
      ) || null
    );
  } catch (err) {
    console.error("Failed to load the transaction for purchase:", err);
    return null;
  }
};

/**
 * Navigate to the For Purchase workspace.
 *
 * @param navigate   react-router's navigate
 * @param ctx.transaction       the transaction to open (may be partial)
 * @param ctx.keys              every status key / mapping the state carries
 */
export const openForPurchase = async (navigate, ctx) => {
  const { transaction, keys = {}, currentUserId } = ctx;
  const id = transaction?.nTransactionId;
  if (!id) {
    console.warn("No transaction found to view for purchase");
    return;
  }

  const full = await fetchTransactionForPurchase(id, {
    isManagement: keys.isManagement,
    isProcurement: keys.isProcurement,
    currentUserId,
    isAOTL: keys.isAOTL,
  });

  // The workspace reads the client's and the company's NAME off the
  // transaction (the canvas header prints "CLIENT: TITLE") and its code off
  // `transactionId` — but the API only sends the RELATIONS and `strCode`.
  // The transaction list shapes those flat fields itself (see
  // useTransaction's fetchTransactions); the same shaping is done here, for
  // the fetched transaction AND for the partial one the caller handed in —
  // so the workspace reads the same either way.
  const source = full || transaction || {};
  const finalTransaction = {
    ...source,
    transactionId: source.transactionId || source.strCode || "",
    transactionName: source.transactionName || source.strTitle || "",
    clientName:
      source.clientName ||
      source.client?.strClientNickName ||
      source.client?.strClientName ||
      "",
    companyName:
      source.companyName ||
      source.company?.strCompanyNickName ||
      source.company?.strCompanyName ||
      "",
  };

  const statusCode = String(
    finalTransaction.current_status ??
      finalTransaction.latest_history?.nStatus ??
      keys.forPurchaseKey ??
      "",
  );
  const statusLabelMap = keys.isManagement
    ? keys.transacstatus
    : keys.ao_status;
  const currentStatusLabel = statusLabelMap?.[statusCode] ?? "";

  navigate(
    String(statusCode) === String(keys.forCollectionKey)
      ? "/transaction-for-collection"
      : "/transaction-for-purchase",
    {
      state: {
        transaction: finalTransaction,
        transactionCode: finalTransaction.transactionId,
        selectedStatusCode: statusCode,
        currentStatusLabel,
        forPurchaseKey: keys.forPurchaseKey,
        currentUserId,
        cancelledPOKey: keys.cancelledPOKey,
        cartKey: keys.cartKey,
        forApprovalKey: keys.forApprovalKey,
        forPaymentKey: keys.forPaymentKey,
        pendingReceiptKey: keys.pendingReceiptKey,
        forDeliveryKey: keys.forDeliveryKey,
        deliveredKey: keys.deliveredKey,
        removedFromCartKey: keys.removedFromCartKey,
        isManagement: keys.isManagement,
        isAccountOfficer: keys.isAccountOfficer,
        isAOTL: keys.isAOTL,
        isProcurement: keys.isProcurement,
        itemType: keys.itemType,
        procMode: keys.procMode,
        procSource: keys.procSource,
        statusTransaction: keys.statusTransaction,
        archiveStatus: keys.archiveStatus,
        forCanvasKey: keys.forCanvasKey,
        canvasFinalizeKey: keys.canvasFinalizeKey,
        canvasVerificationKey: keys.canvasVerificationKey,
        itemsManagementKey: keys.itemsManagementKey,
        forCollectionKey: keys.forCollectionKey,
        ao_status: keys.ao_status,
        forPricingKey: keys.forPricingKey,
        priceVerificationKey: keys.priceVerificationKey,
        priceApprovalKey: keys.priceApprovalKey,
        priceSettingKey: keys.priceSettingKey,
        priceFinalizeVerificationKey: keys.priceFinalizeVerificationKey,
      },
    },
  );
};
