import useMapping from "./useMapping";
import { getUserRoles } from "./useRoleBuilder";

export default function useKeysLabels() {
  const {
    userTypes,
    sex,
    statuses,
    roles,
    vat,
    ewt,
    loading,
    clientstatus,
    transacstatus,
    statusTransaction,
    proc_status,
    procMode,
    procSource,
    itemType,
    ao_status,
    aotl_status,
    vaGoSeValue,
    defaultUserType,
    forPurchaseStatus,
    cartStatus,
    paymentTerms,
    shippingMethod,
    voucherStatus,
    voucherType,
    inventoryStatus,
    inventoryStatusAoProc,
    financestatus,
    jev_types,
    jev_status,
    archiveStatus, // ✅ ADD THIS LINE — MISSING!
    itemPurchasingStatus, // ✅ ADD THIS LINE — MISSING!
    itemPurchasingStatusFinance,
    removedFromCartStatus, // ✅ ADD THIS LINE — MISSING!
  } = useMapping();
  // ──────────────────────────────────────────────────────────────
  // ✅ DERIVE KEY LISTS
  // ──────────────────────────────────────────────────────────────
  const voucherStatusKeys = Object.keys(voucherStatus || {});
  const paymentTermsKeys = Object.keys(paymentTerms || {});
  const voucherTypeKeys = Object.keys(voucherType || {});
  const cartStatusKeys = Object.keys(cartStatus || {});
  const forPurchaseStatusKeys = Object.keys(forPurchaseStatus || {});
  const jevTypeKeys = Object.keys(jev_types || {});
  const jevStatusKeys = Object.keys(jev_status || {});
  const itemTypeKeys = Object.keys(itemType || {});
  const vatKeys = Object.keys(vat || {});
  const ewtKeys = Object.keys(ewt || {});
  const sexKeys = Object.keys(sex || {});
  const inventoryStatusKeys = Object.keys(inventoryStatus || {});
  const transacstatusKeys = Object.keys(transacstatus || {});
  const statusTransactionKeys = Object.keys(statusTransaction || {});
  const procStatusKeys = Object.keys(proc_status || {});
  const aoStatusKeys = Object.keys(ao_status || {});
  const aotlStatusKeys = Object.keys(aotl_status || {});
  const financestatusKeys = Object.keys(financestatus || {});
  const userTypesKeys = Object.keys(userTypes || {});
  const statusesKeys = Object.keys(statuses || {});
  const itemPurchasingStatusKeys = Object.keys(itemPurchasingStatus || {});
  const removedFromCartStatusKeys = Object.keys(removedFromCartStatus || {});

  // ──────────────────────────────────────────────────────────────
  // ✅ ROLES
  // ──────────────────────────────────────────────────────────────
  const {
    isGeneralManager,
    isAccountOfficer,
    isManagement,
    isProcurement,
    isFinanceOfficer,
    isAOTL,
    isAO, // ✅ Already destructured
    isProcurementTL,
    isManagementOnly,
  } = getUserRoles(userTypes);

  // ══════════════════════════════════════════════════════════════
  // ✅ ALL KEYS SECTION
  // ══════════════════════════════════════════════════════════════

  // --- Status Transaction (raw workflow codes) ---
  const createTransactionKey = statusTransactionKeys[0] ?? "";
  const transactionVerificationStatusKey = statusTransactionKeys[1] ?? "";
  const assignTransactionKey = statusTransactionKeys[2] ?? "";
  const transactionItemsManagementKey = statusTransactionKeys[3] ?? "";
  const transactionItemsVerificationKey = statusTransactionKeys[4] ?? "";
  const canvasingKey = statusTransactionKeys[5] ?? "";
  const canvasVerificationStatusKey = statusTransactionKeys[6] ?? "";
  const priceManagementKey = statusTransactionKeys[7] ?? "";
  const priceVerificationStatusKey = statusTransactionKeys[8] ?? "";
  const priceApprovalStatusKey = statusTransactionKeys[9] ?? "";
  const priceApprovedStatusKey = statusTransactionKeys[10] ?? "";
  const forPurchaseStatusTransactionKey = statusTransactionKeys[11] ?? "";
  const forCollectionStatusKey = statusTransactionKeys[12] ?? "";

  // --- JEV ---
  // Index order mirrors `jev_types` in apiHirams/config/mappings.php:
  // V Disbursement Voucher, R Received Purchases, D Delivered Items,
  // C Collection (Sales Invoice / Balance / Remittance were removed).
  const jevDisbursementVoucherKey = jevTypeKeys[0] ?? "";
  const jevReceivedPurchasesKey = jevTypeKeys[1] ?? "";
  const jevDeliveredItemsKey = jevTypeKeys[2] ?? "";
  const jevCollectionKey = jevTypeKeys[3] ?? "";

  const jevActiveKey = jevStatusKeys[0] ?? "";
  const jevCancelledKey = jevStatusKeys[1] ?? "";
  const jevPendingKey = jevStatusKeys[2] ?? "";

  // --- Voucher ---
  const voucherActiveKey = voucherStatusKeys[0] ?? "";
  const voucherClosedKey = voucherStatusKeys[1] ?? "";
  const voucherPaidKey = voucherStatusKeys[2] ?? "";
  const voucherCancelledKey = voucherStatusKeys[3] ?? "";
  const voucherSupplierTypeKey = voucherTypeKeys[0] ?? "";
  const voucherAssigneeTypeKey = voucherTypeKeys[1] ?? "";

  // --- User Status ---
  const activeStatusKey = statusesKeys[0] ?? "";
  const inactiveStatusKey = statusesKeys[1] ?? "";
  const forApprovalStatusKey = statusesKeys[2] ?? "";

  // --- Cart ---
  const openCartKey = cartStatusKeys[0] ?? "";
  const closeCartKey = cartStatusKeys[1] ?? "";
  const cancelCartKey = cartStatusKeys[2] ?? "";

  // --- For Purchase ---

  const cartKey = itemPurchasingStatusKeys[0] ?? "";
  // const purchaseOrderKey = forPurchaseStatusKeys[2] ?? "";
  const forApprovalKey = itemPurchasingStatusKeys[1] ?? "";
  // const paidKey = forPurchaseStatusKeys[3] ?? "";
  const forPaymentKey = itemPurchasingStatusKeys[2] ?? "";
  // const receivedKey = forPurchaseStatusKeys[4] ?? "";
  const pendingReceiptKey = itemPurchasingStatusKeys[3] ?? "";
  // const deliveredKey = forPurchaseStatusKeys[5] ?? "";
  const forDeliveryKey = itemPurchasingStatusKeys[4] ?? "";
  const deliveredKey = itemPurchasingStatusKeys[5] ?? "";
  // const cancelPoKey = forPurchaseStatusKeys[6] ?? "";
  const cancelledPOKey = itemPurchasingStatusKeys[6] ?? "";

  const addToCartLabel = itemPurchasingStatus?.[cartKey] ?? "";
  const forApprovalLabel = itemPurchasingStatus?.[forApprovalKey] ?? "";
  const forPaymentLabel = itemPurchasingStatus?.[forPaymentKey] ?? "";
  const pendingReceiptLabel = itemPurchasingStatus?.[pendingReceiptKey] ?? "";
  const forDeliveryLabel = itemPurchasingStatus?.[forDeliveryKey] ?? "";
  const deliveredLabel = itemPurchasingStatus?.[deliveredKey] ?? "";
  const cancelledPOLabel = itemPurchasingStatus?.[cancelledPOKey] ?? "";

  const removedFromCartKey = removedFromCartStatusKeys[0] ?? "";
  const removedFromCartLabel =
    removedFromCartStatus?.[removedFromCartKey] ?? "";
  // --- Payment Terms ---
  // --- Payment Terms ---
  const onlineKey = paymentTermsKeys[0] ?? "";
  const cashKey = paymentTermsKeys[1] ?? "";
  const creditCardKey = paymentTermsKeys[2] ?? "";
  const chequeKey = paymentTermsKeys[3] ?? "";
  const otherPaymentTermKey = paymentTermsKeys[4] ?? "";
  // --- Item Type ---
  const goodsKey = itemTypeKeys[0] ?? "";
  const serviceKey = itemTypeKeys[1] ?? "";

  // --- VAT / EWT ---
  const vatKey = vatKeys[0] ?? "";
  const nonVatKey = vatKeys[1] ?? "";
  const ewtKey = ewtKeys[0] ?? "";
  const noEwtKey = ewtKeys[1] ?? "";

  // --- Sex ---
  const maleKey = sexKeys[0] ?? "";
  const femaleKey = sexKeys[1] ?? "";

  // --- Inventory ---
  const inventoryReceivedKey = inventoryStatusKeys[0] ?? "";
  const inventoryDeliveredKey = inventoryStatusKeys[1] ?? "";
  const inventoryPendingKey = inventoryStatusKeys[2] ?? "";
  const inventoryCancelledKey = inventoryStatusKeys[3] ?? "";

  // --- User Types ---
  const managementUserTypeKey = userTypesKeys[0] ?? "";
  const generalManagerUserTypeKey = userTypesKeys[1] ?? "";
  const procurementOfficerUserTypeKey = userTypesKeys[2] ?? "";
  const procurementOfficerTlUserTypeKey = userTypesKeys[3] ?? "";
  const accountOfficerUserTypeKey = userTypesKeys[4] ?? "";
  const accountOfficerTlUserTypeKey = userTypesKeys[5] ?? "";
  const financeOfficerUserTypeKey = userTypesKeys[6] ?? "";

  // ──────────────────────────────────────────────────────────────
  // ✅ MGMT KEYS (ending in 0)
  // ──────────────────────────────────────────────────────────────
  const mgmtDraftKey = transacstatusKeys[0] ?? "";
  const mgmtTransactionVerificationKey = transacstatusKeys[1] ?? "";
  const mgmtFAssignmentKey = transacstatusKeys[2] ?? "";
  const mgmtItemsManagementKey = transacstatusKeys[3] ?? "";
  const mgmtItemsVerificationKey = transacstatusKeys[4] ?? "";
  const mgmtForCanvasKey = transacstatusKeys[5] ?? "";
  const mgmtCanvasVerificationKey = transacstatusKeys[6] ?? "";
  const mgmtforPricingKey = transacstatusKeys[7] ?? "";
  const mgmtPriceVerificationKey = transacstatusKeys[8] ?? "";
  const mgmtPriceApprovalKey = transacstatusKeys[9] ?? "";
  const mgmtPriceApprovedKey = transacstatusKeys[10] ?? "";
  const mgmtForPurchaseKey = transacstatusKeys[11] ?? "";
  const mgmtForCollectionKey = transacstatusKeys[12] ?? "";

  // ──────────────────────────────────────────────────────────────
  // ✅ PROCUREMENT KEYS
  // ──────────────────────────────────────────────────────────────
  const procDraftKey = procStatusKeys[0] ?? "";
  const procTransactionFinalizedKey = procStatusKeys[1] ?? "";
  const procTransactionVerificationKey = procStatusKeys[2] ?? "";
  const procforPricingKey = procStatusKeys[3] ?? "";
  const procPriceFinalizedKey = procStatusKeys[4] ?? "";
  const procPriceVerificationKey = procStatusKeys[5] ?? "";
  const procPriceApprovalKey = procStatusKeys[6] ?? "";
  const procPriceApprovedKey = procStatusKeys[7] ?? "";
  const procForPurchaseKey = procStatusKeys[8] ?? "";

  // ──────────────────────────────────────────────────────────────
  // ✅ AO KEYS
  // ──────────────────────────────────────────────────────────────
  const aoItemsManagementKey = aoStatusKeys[0] ?? "";
  const aoItemsFinalizedKey = aoStatusKeys[1] ?? "";
  const aoItemsVerificationKey = aoStatusKeys[2] ?? "";
  const aoForCanvasKey = aoStatusKeys[3] ?? "";
  const aoCanvasFinalizedKey = aoStatusKeys[4] ?? "";
  const aoCanvasVerificationKey = aoStatusKeys[5] ?? "";
  const aoForPurchaseKey = aoStatusKeys[6] ?? "";

  // ──────────────────────────────────────────────────────────────
  // ✅ AOTL KEYS
  // ──────────────────────────────────────────────────────────────
  const aotlForAssignmentKey = aotlStatusKeys[0] ?? "";
  const aotlItemsManagementKey = aotlStatusKeys[1] ?? "";
  const aotlItemsFinalizedKey = aotlStatusKeys[2] ?? "";
  const aotlItemsVerificationKey = aotlStatusKeys[3] ?? "";
  const aotlForCanvasKey = aotlStatusKeys[4] ?? "";
  const aotlCanvasFinalizedKey = aotlStatusKeys[5] ?? "";
  const aotlCanvasVerificationKey = aotlStatusKeys[6] ?? "";
  const aotlForPurchaseKey = aotlStatusKeys[7] ?? "";

  // ──────────────────────────────────────────────────────────────
  // ✅ FINANCE KEY
  // ──────────────────────────────────────────────────────────────
  const financeForCollectionKey = financestatusKeys[0] ?? "";

  // ──────────────────────────────────────────────────────────────
  // ✅ CONDITIONAL KEYS — Fixed AO logic
  // ──────────────────────────────────────────────────────────────
  const draftKey = isManagement
    ? mgmtDraftKey
    : isProcurement
      ? procDraftKey
      : "";
  const finalizeKey = isManagement
    ? mgmtTransactionVerificationKey
    : isProcurement
      ? procTransactionFinalizedKey
      : "";
  const transactionVerificationKey = isManagement
    ? mgmtTransactionVerificationKey
    : isProcurement
      ? procTransactionVerificationKey
      : "";

  const forAssignmentKey = isManagement
    ? mgmtFAssignmentKey
    : isAOTL
      ? aotlForAssignmentKey
      : "";
  const itemsManagementKey = isManagement
    ? mgmtItemsManagementKey
    : isAOTL
      ? aotlItemsManagementKey
      : isAO
        ? aoItemsManagementKey
        : "";
  // itemsVerificationKey — NO explicit isAO guard, always falls through to AO
  const itemsVerificationKey = isManagement
    ? mgmtItemsVerificationKey
    : isAOTL
      ? aotlItemsVerificationKey
      : aoItemsVerificationKey; // ← unconditional fallback

  // itemsFinalizeKey — explicit isAO guard, defaults to "" otherwise
  // ✅ FIXED: AO gets aoItemsFinalizedKey instead of empty string
  const itemsFinalizeKey = isManagement
    ? mgmtItemsVerificationKey
    : isAOTL
      ? aotlItemsFinalizedKey
      : isAO
        ? aoItemsFinalizedKey
        : ""; // ← empty for anyone who isn't AO

  const forCanvasKey = isManagement
    ? mgmtForCanvasKey
    : isAOTL
      ? aotlForCanvasKey
      : aoForCanvasKey;

  // ✅ FIXED: AO gets aoCanvasFinalizedKey instead of empty string
  const canvasFinalizeKey = isManagement
    ? mgmtCanvasVerificationKey
    : isAOTL
      ? aotlCanvasFinalizedKey
      : isAO
        ? aoCanvasFinalizedKey
        : "";

  const canvasVerificationKey = isManagement
    ? mgmtCanvasVerificationKey
    : isAOTL
      ? aotlCanvasVerificationKey
      : aoCanvasVerificationKey;
  const forPricingKey = isManagement
    ? mgmtforPricingKey
    : isProcurement
      ? procforPricingKey
      : "";
  const priceSettingKey = isManagement
    ? mgmtforPricingKey
    : isProcurement
      ? procforPricingKey
      : "";
  const priceFinalizeVerificationKey = isManagement
    ? mgmtPriceVerificationKey
    : isProcurement
      ? procPriceVerificationKey
      : "";
  const priceVerificationKey = isManagement
    ? mgmtPriceVerificationKey
    : isProcurement
      ? procPriceVerificationKey
      : "";
  const finalizeVerificationKey = isProcurement
    ? procTransactionVerificationKey
    : "";
  const priceFinalizeKey = isManagement
    ? mgmtPriceVerificationKey
    : isProcurement
      ? procPriceFinalizedKey
      : "";
  const priceApprovalKey = isManagement ? mgmtPriceApprovalKey : "";
  const priceApprovedKey = isManagement
    ? mgmtPriceApprovedKey
    : isProcurement
      ? procPriceApprovedKey
      : "";
  const forPurchaseKey = isManagement
    ? mgmtForPurchaseKey
    : isAOTL
      ? aotlForPurchaseKey
      : aoForPurchaseKey;
  const forCollectionKey = isManagement
    ? mgmtForCollectionKey
    : financeForCollectionKey;

  // ══════════════════════════════════════════════════════════════
  // ✅ ALL LABELS SECTION
  // ══════════════════════════════════════════════════════════════

  // --- Voucher Labels ---
  const voucherActiveLabel = voucherStatus?.[voucherActiveKey] ?? "";
  const voucherClosedLabel = voucherStatus?.[voucherClosedKey] ?? "";
  const voucherPaidLabel = voucherStatus?.[voucherPaidKey] ?? "";
  const voucherCancelledLabel = voucherStatus?.[voucherCancelledKey] ?? "";
  const voucherSupplierTypeLabel = voucherType?.[voucherSupplierTypeKey] ?? "";
  const voucherAssigneeTypeLabel = voucherType?.[voucherAssigneeTypeKey] ?? "";

  // --- User Status Labels ---
  const activeStatusLabel = statuses?.[activeStatusKey] ?? "";
  const inactiveStatusLabel = statuses?.[inactiveStatusKey] ?? "";
  const forApprovalStatusLabel = statuses?.[forApprovalStatusKey] ?? "";

  // --- Cart Labels ---
  const openCartLabel = cartStatus?.[openCartKey] ?? "";
  const closeCartLabel = cartStatus?.[closeCartKey] ?? "";
  const cancelCartLabel = cartStatus?.[cancelCartKey] ?? "";

  // --- Payment Terms Labels ---
  const onlineLabel = paymentTerms?.[onlineKey] ?? "";
  const cashLabel = paymentTerms?.[cashKey] ?? "";
  // ...rest unchanged
  const creditCardLabel = paymentTerms?.[creditCardKey] ?? "";
  const chequeLabel = paymentTerms?.[chequeKey] ?? "";
  const otherPaymentTermLabel = paymentTerms?.[otherPaymentTermKey] ?? "";

  // --- Item Type Labels ---
  const goodsLabel = itemType?.[goodsKey] ?? "";
  const serviceLabel = itemType?.[serviceKey] ?? "";

  // --- VAT / EWT Labels ---
  const vatLabel = vat?.[vatKey] ?? "";
  const nonVatLabel = vat?.[nonVatKey] ?? "";
  const ewtLabel = ewt?.[ewtKey] ?? "";
  const noEwtLabel = ewt?.[noEwtKey] ?? "";

  // --- Sex Labels ---
  const maleLabel = sex?.[maleKey] ?? "";
  const femaleLabel = sex?.[femaleKey] ?? "";

  // --- Inventory Labels ---
  const inventoryReceivedLabel = inventoryStatus?.[inventoryReceivedKey] ?? "";
  const inventoryDeliveredLabel =
    inventoryStatus?.[inventoryDeliveredKey] ?? "";
  const inventoryPendingLabel = inventoryStatus?.[inventoryPendingKey] ?? "";
  const inventoryCancelledLabel =
    inventoryStatus?.[inventoryCancelledKey] ?? "";

  // --- JEV Labels ---
  const jevDisbursementVoucherLabel =
    jev_types?.[jevDisbursementVoucherKey] ?? "";
  const jevReceivedPurchasesLabel = jev_types?.[jevReceivedPurchasesKey] ?? "";
  const jevDeliveredItemsLabel = jev_types?.[jevDeliveredItemsKey] ?? "";
  const jevCollectionLabel = jev_types?.[jevCollectionKey] ?? "";
  const jevActiveLabel = jev_status?.[jevActiveKey] ?? "";
  const jevCancelledLabel = jev_status?.[jevCancelledKey] ?? "";
  const jevPendingLabel = jev_status?.[jevPendingKey] ?? "";

  // --- Status Transaction Labels ---
  const createTransactionLabel =
    statusTransaction?.[createTransactionKey] ?? "";
  const transactionVerificationStatusLabel =
    statusTransaction?.[transactionVerificationStatusKey] ?? "";
  const assignTransactionLabel =
    statusTransaction?.[assignTransactionKey] ?? "";
  const transactionItemsManagementLabel =
    statusTransaction?.[transactionItemsManagementKey] ?? "";
  const transactionItemsVerificationLabel =
    statusTransaction?.[transactionItemsVerificationKey] ?? "";
  const canvasingLabel = statusTransaction?.[canvasingKey] ?? "";
  const canvasVerificationStatusLabel =
    statusTransaction?.[canvasVerificationStatusKey] ?? "";
  const priceManagementLabel = statusTransaction?.[priceManagementKey] ?? "";
  const priceVerificationStatusLabel =
    statusTransaction?.[priceVerificationStatusKey] ?? "";
  const priceApprovalStatusLabel =
    statusTransaction?.[priceApprovalStatusKey] ?? "";
  const priceApprovedStatusLabel =
    statusTransaction?.[priceApprovedStatusKey] ?? "";
  const forPurchaseStatusTransactionLabel =
    statusTransaction?.[forPurchaseStatusTransactionKey] ?? "";
  const forCollectionStatusLabel =
    statusTransaction?.[forCollectionStatusKey] ?? "";

  // --- Procurement Labels ---
  const procDraftLabel = proc_status?.[procDraftKey] ?? "";
  const procTransactionFinalizedLabel =
    proc_status?.[procTransactionFinalizedKey] ?? "";
  const procTransactionVerificationLabel =
    proc_status?.[procTransactionVerificationKey] ?? "";
  const procPriceSettingLabel = proc_status?.[procforPricingKey] ?? "";
  const procPriceFinalizedLabel = proc_status?.[procPriceFinalizedKey] ?? "";
  const procPriceVerificationLabel =
    proc_status?.[procPriceVerificationKey] ?? "";
  const procPriceApprovalLabel = proc_status?.[procPriceApprovalKey] ?? "";
  const procPriceApprovedLabel = proc_status?.[procPriceApprovedKey] ?? "";
  const procForPurchaseLabel = proc_status?.[procForPurchaseKey] ?? "";

  // --- AO Labels ---
  const aoItemsManagementLabel = ao_status?.[aoItemsManagementKey] ?? "";
  const aoItemsFinalizedLabel = ao_status?.[aoItemsFinalizedKey] ?? "";
  const aoItemsVerificationLabel = ao_status?.[aoItemsVerificationKey] ?? "";
  const aoForCanvasLabel = ao_status?.[aoForCanvasKey] ?? "";
  const aoCanvasFinalizedLabel = ao_status?.[aoCanvasFinalizedKey] ?? "";
  const aoCanvasVerificationLabel = ao_status?.[aoCanvasVerificationKey] ?? "";
  const aoForPurchaseLabel = ao_status?.[aoForPurchaseKey] ?? "";

  // --- AOTL Labels ---
  const aotlForAssignmentLabel = aotl_status?.[aotlForAssignmentKey] ?? "";
  const aotlItemsManagementLabel = aotl_status?.[aotlItemsManagementKey] ?? "";
  const aotlItemsFinalizedLabel = aotl_status?.[aotlItemsFinalizedKey] ?? "";
  const aotlItemsVerificationLabel =
    aotl_status?.[aotlItemsVerificationKey] ?? "";
  const aotlForCanvasLabel = aotl_status?.[aotlForCanvasKey] ?? "";
  const aotlCanvasFinalizedLabel = aotl_status?.[aotlCanvasFinalizedKey] ?? "";
  const aotlCanvasVerificationLabel =
    aotl_status?.[aotlCanvasVerificationKey] ?? "";
  const aotlForPurchaseLabel = aotl_status?.[aotlForPurchaseKey] ?? "";

  // --- Finance Label ---
  const financeForCollectionLabel =
    financestatus?.[financeForCollectionKey] ?? "";

  // --- User Type Labels ---
  const managementUserTypeLabel = userTypes?.[managementUserTypeKey] ?? "";
  const generalManagerUserTypeLabel =
    userTypes?.[generalManagerUserTypeKey] ?? "";
  const procurementOfficerUserTypeLabel =
    userTypes?.[procurementOfficerUserTypeKey] ?? "";
  const procurementOfficerTlUserTypeLabel =
    userTypes?.[procurementOfficerTlUserTypeKey] ?? "";
  const accountOfficerUserTypeLabel =
    userTypes?.[accountOfficerUserTypeKey] ?? "";
  const accountOfficerTlUserTypeLabel =
    userTypes?.[accountOfficerTlUserTypeKey] ?? "";
  const financeOfficerUserTypeLabel =
    userTypes?.[financeOfficerUserTypeKey] ?? "";

  // ──────────────────────────────────────────────────────────────
  // ✅ CONDITIONAL LABELS — Matching key logic above
  // ──────────────────────────────────────────────────────────────
  const draftLabel = isManagement ? (transacstatus?.[mgmtDraftKey] ?? "") : "";
  const finalizeLabel = isManagement
    ? (transacstatus?.[mgmtTransactionVerificationKey] ?? "")
    : isProcurement
      ? (proc_status?.[procTransactionFinalizedKey] ?? "")
      : "";
  const transactionVerificationLabel = isManagement
    ? (transacstatus?.[mgmtTransactionVerificationKey] ?? "")
    : "";
  const forAssignmentLabel = isManagement
    ? (transacstatus?.[mgmtFAssignmentKey] ?? "")
    : isAOTL
      ? (aotl_status?.[aotlForAssignmentKey] ?? "")
      : "";
  const itemsManagementLabel = isManagement
    ? (transacstatus?.[mgmtItemsManagementKey] ?? "")
    : isAOTL
      ? (aotl_status?.[aotlItemsManagementKey] ?? "")
      : (ao_status?.[aoItemsManagementKey] ?? "");
  const itemsVerificationLabel = isManagement
    ? (transacstatus?.[mgmtItemsVerificationKey] ?? "")
    : isAOTL
      ? (aotl_status?.[aotlItemsVerificationKey] ?? "")
      : (ao_status?.[aoItemsVerificationKey] ?? "");

  // ✅ FIXED: AO gets proper label instead of empty string
  const itemsFinalizeLabel = isManagement
    ? (transacstatus?.[mgmtItemsVerificationKey] ?? "")
    : isAOTL
      ? (aotl_status?.[aotlItemsFinalizedKey] ?? "")
      : isAO
        ? (ao_status?.[aoItemsFinalizedKey] ?? "")
        : "";

  const forCanvasLabel = isManagement
    ? (transacstatus?.[mgmtForCanvasKey] ?? "")
    : isAOTL
      ? (aotl_status?.[aotlForCanvasKey] ?? "")
      : (ao_status?.[aoForCanvasKey] ?? "");
  const canvasVerificationLabel = isManagement
    ? (transacstatus?.[mgmtCanvasVerificationKey] ?? "")
    : isAOTL
      ? (aotl_status?.[aotlCanvasVerificationKey] ?? "")
      : (ao_status?.[aoCanvasVerificationKey] ?? "");

  // ✅ FIXED: AO gets proper label instead of empty string
  const canvasFinalizeLabel = isManagement
    ? (transacstatus?.[mgmtCanvasVerificationKey] ?? "")
    : isAOTL
      ? (aotl_status?.[aotlCanvasFinalizedKey] ?? "")
      : isAO
        ? (ao_status?.[aoCanvasFinalizedKey] ?? "")
        : "";

  const priceSettingLabel = isManagement
    ? (transacstatus?.[mgmtforPricingKey] ?? "")
    : isProcurement
      ? (proc_status?.[procforPricingKey] ?? "")
      : "";
  const priceVerificationLabel = isManagement
    ? (transacstatus?.[mgmtPriceVerificationKey] ?? "")
    : isProcurement
      ? (proc_status?.[procPriceVerificationKey] ?? "")
      : "";
  const priceFinalizeVerificationLabel = isProcurement
    ? (proc_status?.[procPriceVerificationKey] ?? "")
    : "";
  const priceApprovalLabel = isManagement
    ? (transacstatus?.[mgmtPriceApprovalKey] ?? "")
    : "";
  const priceApprovedLabel = isManagement
    ? (transacstatus?.[mgmtPriceApprovedKey] ?? "")
    : isProcurement
      ? (proc_status?.[procPriceApprovedKey] ?? "")
      : "";
  const forPurchaseLabel = isManagement
    ? (transacstatus?.[mgmtForPurchaseKey] ?? "")
    : isAOTL
      ? (aotl_status?.[aotlForPurchaseKey] ?? "")
      : (ao_status?.[aoForPurchaseKey] ?? "");
  const forCollectionLabel = isManagement
    ? (transacstatus?.[mgmtForCollectionKey] ?? "")
    : (financestatus?.[financeForCollectionKey] ?? "");

  // ══════════════════════════════════════════════════════════════
  // ✅ RETURN EVERYTHING
  // ══════════════════════════════════════════════════════════════
  return {
    // ─── Raw Mappings ───
    userTypes,
    sex,
    statuses,
    roles,
    vat,
    ewt,
    loading,
    clientstatus,
    transacstatus,
    proc_status,
    procMode,
    procSource,
    itemType,
    ao_status,
    aotl_status,
    statusTransaction,
    vaGoSeValue,
    defaultUserType,
    forPurchaseStatus,
    cartStatus,
    paymentTerms,
    shippingMethod,
    voucherStatus,
    voucherType,
    inventoryStatus,
    inventoryStatusAoProc,
    financestatus,
    jev_types,
    jev_status,
    archiveStatus,
    itemPurchasingStatus,
    itemPurchasingStatusFinance,

    // ─── mgmt* Keys ───
    mgmtDraftKey,
    mgmtTransactionVerificationKey,
    mgmtFAssignmentKey,
    mgmtItemsManagementKey,
    mgmtItemsVerificationKey,
    mgmtForCanvasKey,
    mgmtCanvasVerificationKey,
    mgmtforPricingKey,
    mgmtPriceVerificationKey,
    mgmtPriceApprovalKey,
    mgmtPriceApprovedKey,
    mgmtForPurchaseKey,
    mgmtForCollectionKey,

    // ─── Procurement Raw Keys ───
    procDraftKey,
    procTransactionFinalizedKey,
    procTransactionVerificationKey,
    procforPricingKey,
    procPriceFinalizedKey,
    procPriceVerificationKey,
    procPriceApprovalKey,
    procPriceApprovedKey,
    procForPurchaseKey,

    // ─── AO Raw Keys ───
    aoItemsManagementKey,
    aoItemsFinalizedKey,
    aoItemsVerificationKey,
    aoForCanvasKey,
    aoCanvasFinalizedKey,
    aoCanvasVerificationKey,
    aoForPurchaseKey,

    // ─── AOTL Raw Keys ───
    aotlForAssignmentKey,
    aotlItemsManagementKey,
    aotlItemsFinalizedKey,
    aotlItemsVerificationKey,
    aotlForCanvasKey,
    aotlCanvasFinalizedKey,
    aotlCanvasVerificationKey,
    aotlForPurchaseKey,

    // ─── Finance ───
    financeForCollectionKey,

    // ─── Status Transaction Raw ───
    createTransactionKey,
    transactionVerificationStatusKey,
    assignTransactionKey,
    transactionItemsManagementKey,
    transactionItemsVerificationKey,
    canvasingKey,
    canvasVerificationStatusKey,
    priceManagementKey,
    priceVerificationStatusKey,
    priceApprovalStatusKey,
    priceApprovedStatusKey,
    forPurchaseStatusTransactionKey,
    forCollectionStatusKey,

    // ─── JEV Raw ───
    jevDisbursementVoucherKey,
    jevReceivedPurchasesKey,
    jevDeliveredItemsKey,
    jevCollectionKey,
    jevActiveKey,
    jevCancelledKey,
    jevPendingKey,
    // ─── JEV Labels ───
    jevDisbursementVoucherLabel,
    jevReceivedPurchasesLabel,
    jevDeliveredItemsLabel,
    jevCollectionLabel,
    jevActiveLabel,
    jevCancelledLabel,
    jevPendingLabel,
    // ─── Voucher Raw ───
    voucherActiveKey,
    voucherClosedKey,
    voucherPaidKey,
    voucherCancelledKey,
    voucherSupplierTypeKey,
    voucherAssigneeTypeKey,

    // ─── Cart Raw ───
    openCartKey,
    closeCartKey,
    cancelCartKey,

    // ─── For Purchase Raw ───
    cartKey,
    forApprovalKey,
    forPaymentKey,
    pendingReceiptKey,
    forDeliveryKey,
    deliveredKey,
    cancelledPOKey,

    addToCartLabel,
    forApprovalLabel,
    forPaymentLabel,
    pendingReceiptLabel,
    forDeliveryLabel,
    deliveredLabel,
    cancelledPOLabel,

    removedFromCartKey,

    // ─── Payment Terms Raw ───
    // ─── Payment Terms Raw ───
    onlineKey,
    cashKey,
    creditCardKey,
    chequeKey,
    otherPaymentTermKey,
    onlineLabel,
    cashLabel,
    creditCardLabel,
    chequeLabel,
    otherPaymentTermLabel,

    // ─── Item Type Raw ───
    goodsKey,
    serviceKey,

    // ─── VAT / EWT Raw ───
    vatKey,
    nonVatKey,
    ewtKey,
    noEwtKey,

    // ─── Sex Raw ───
    maleKey,
    femaleKey,

    // ─── Inventory Raw ───
    inventoryReceivedKey,
    inventoryDeliveredKey,
    inventoryPendingKey,
    inventoryCancelledKey,

    // ─── User Types Raw ───
    managementUserTypeKey,
    generalManagerUserTypeKey,
    procurementOfficerUserTypeKey,
    procurementOfficerTlUserTypeKey,
    accountOfficerUserTypeKey,
    accountOfficerTlUserTypeKey,
    financeOfficerUserTypeKey,

    // ─── User Status Raw ───
    activeStatusKey,
    inactiveStatusKey,
    forApprovalStatusKey,

    // ─── ✅ CONDITIONAL KEYS ───
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

    // ─── Voucher Labels ───
    voucherActiveLabel,
    voucherClosedLabel,
    voucherPaidLabel,
    voucherCancelledLabel,
    voucherSupplierTypeLabel,
    voucherAssigneeTypeLabel,

    // ─── Cart Labels ───
    openCartLabel,
    closeCartLabel,
    cancelCartLabel,

    // ─── For Purchase Labels ───
    // cancelPoLabel,
    // addToCartLabel,
    // purchaseOrderLabel,
    // paidLabel,
    // receivedLabel,
    // deliveredLabel,
    removedFromCartLabel,

    // ─── Payment Terms Labels ───

    // ─── Item Type Labels ───
    goodsLabel,
    serviceLabel,

    // ─── VAT / EWT Labels ───
    vatLabel,
    nonVatLabel,
    ewtLabel,
    noEwtLabel,

    // ─── Sex Labels ───
    maleLabel,
    femaleLabel,

    // ─── Inventory Labels ───
    inventoryReceivedLabel,
    inventoryDeliveredLabel,
    inventoryPendingLabel,
    inventoryCancelledLabel,

    // ─── Status Transaction Labels ───
    createTransactionLabel,
    transactionVerificationStatusLabel,
    assignTransactionLabel,
    transactionItemsManagementLabel,
    transactionItemsVerificationLabel,
    canvasingLabel,
    canvasVerificationStatusLabel,
    priceManagementLabel,
    priceVerificationStatusLabel,
    priceApprovalStatusLabel,
    priceApprovedStatusLabel,
    forPurchaseStatusTransactionLabel,
    forCollectionStatusLabel,

    // ─── Procurement Labels ───
    procDraftLabel,
    procTransactionFinalizedLabel,
    procTransactionVerificationLabel,
    procPriceSettingLabel,
    procPriceFinalizedLabel,
    procPriceVerificationLabel,
    procPriceApprovalLabel,
    procPriceApprovedLabel,
    procForPurchaseLabel,

    // ─── AO Labels ───
    aoItemsManagementLabel,
    aoItemsFinalizedLabel,
    aoItemsVerificationLabel,
    aoForCanvasLabel,
    aoCanvasFinalizedLabel,
    aoCanvasVerificationLabel,
    aoForPurchaseLabel,

    // ─── AOTL Labels ───
    aotlForAssignmentLabel,
    aotlItemsManagementLabel,
    aotlItemsFinalizedLabel,
    aotlItemsVerificationLabel,
    aotlForCanvasLabel,
    aotlCanvasFinalizedLabel,
    aotlCanvasVerificationLabel,
    aotlForPurchaseLabel,

    // ─── Finance Label ───
    financeForCollectionLabel,

    // ─── User Type Labels ───
    managementUserTypeLabel,
    generalManagerUserTypeLabel,
    procurementOfficerUserTypeLabel,
    procurementOfficerTlUserTypeLabel,
    accountOfficerUserTypeLabel,
    accountOfficerTlUserTypeLabel,
    financeOfficerUserTypeLabel,

    // ─── ✅ CONDITIONAL LABELS ───
    draftLabel,
    finalizeLabel,
    transactionVerificationLabel,
    forAssignmentLabel,
    itemsManagementLabel,
    itemsVerificationLabel,
    itemsFinalizeLabel,
    forCanvasLabel,
    canvasVerificationLabel,
    canvasFinalizeLabel,
    priceSettingLabel,
    priceVerificationLabel,
    priceFinalizeVerificationLabel,
    priceApprovalLabel,
    priceApprovedLabel,
    forPurchaseLabel,
    forCollectionLabel,

    activeStatusLabel,
    inactiveStatusLabel,
    forApprovalStatusLabel,
    // ─── Role Flags ───
    isGeneralManager,
    isManagement,
    isProcurement,
    isFinanceOfficer,
    isAOTL,
    isAccountOfficer,
    isAO,
    isProcurementTL,
    isManagementOnly,
  };
}
