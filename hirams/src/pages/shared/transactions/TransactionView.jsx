import React, { useCallback, useMemo } from "react";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import BaseButton from "../../../components/ui/form/BaseButton";
import ProgressBar from "../../../components/ui/form/ProgressBar";
import RevertModal from "./modal/RevertModal";
import TransactionHistoryModal from "./modal/TransactionHistoryModal";
import TransactionAEModal from "./modal/TransactionAEModal";
import DeleteVerificationModal from "./modal/DeleteVerificationModal";
import DirectCostModal from "./modal/DirectCostModal";
import ATransactionInfoModal from "./modal/TransactionInfoModal";
import ArchiveModal from "../archive/modal/ArchiveModal";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import { getDueDateColor } from "../../../utils/helpers/dueDateColor";
import {
  NO_TRANSACTION_ABC,
  NOT_YET_ASSIGNED,
  OPEN_DATE,
} from "../../../constants/tableDataFallbacks";
import { Box, Typography, useTheme } from "@mui/material";
import getThemeColors from "../../../utils/style/getThemeColors";
import {
  Add,
  Edit,
  Delete,
  Undo,
  RequestQuote,
  Replay,
  History,
  Visibility,
  GppGood,
  Description,
  ListAlt,
  CheckCircleOutline,
  AssignmentInd,
  ContactPage,
  PriceCheck,
  Sell,
  Archive,
  ShoppingCart,
  Security,
  EmojiEvents,
} from "@mui/icons-material";

// ── Theme map — only tokens this component actually uses ───────────────
const useColors = (c) => ({
  cardBg: c.slate.outerBg,
  shadowLow: c.shadow.low,
  textMuted: c.gray.textMuted,
  textPrimary: c.gray.textPrimary,
  border: c.slate.border,
  // inline client → company badge on the Draft Transaction column
  blue: { bg: c.blue.bg, text: c.blue.text },
  green: {
    paid: c.green.paid,
    paidBorder: c.green.paidBorder,
  },
  amber: {
    warnText: c.amber.warnText,
  },
});
// Fixed label/value columns: every row's group is the same width, so labels
// line up down the column and the whole group is centered in the cell.
const OFFICER_GRID_CLASS =
  "grid w-fit max-w-full min-w-0 grid-cols-[5rem_9.5rem] items-baseline gap-x-1";
// ── Pure action renderer ───────────────────────────────────────────────────
function buildActions(row, opts) {
  const {
    userId,
    isManagement,
    isFinanceOfficer,
    isProcurement,
    isProcurementTL,
    isAccountOfficer,
    selectedStatusCode: statusCode,
    draftKey = "",
    finalizeKey = "",
    forAssignmentKey = "",
    itemsManagementKey = "",
    itemsFinalizeKey = "",
    itemsVerificationKey = "",
    forCanvasKey = "",
    canvasFinalizeKey = "",
    canvasVerificationKey = "",
    forPricingKey = "",
    priceVerificationKey = "",
    priceApprovalKey = "",
    priceApprovedKey = "",
    finalizeVerificationKey = "",
    priceSettingKey = "",
    priceFinalizeKey = "",
    priceFinalizeVerificationKey = "",
    procPriceApprovalKey = "",
    procPriceApprovedKey = "",
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
    forCollectionKey,

    crTypeKey,
  } = opts;

  // ── Management ──────────────────────────────────────────────────────────
  if (isManagement || isFinanceOfficer) {
    const isDraft = draftKey.includes(statusCode);
    const isFinalize = finalizeKey.includes(statusCode);
    const isForAssignment = forAssignmentKey.includes(statusCode);
    const isItemsManagement = itemsManagementKey.includes(statusCode);
    const isItemsVerification = itemsVerificationKey.includes(statusCode);
    const isForCanvas = forCanvasKey.includes(statusCode);
    const isCanvasVerification = canvasVerificationKey.includes(statusCode);
    const isPriceVerification = priceVerificationKey.includes(statusCode);
    const isPricing =
      forPricingKey.includes(statusCode) ||
      priceVerificationKey.includes(statusCode) ||
      priceApprovalKey.includes(statusCode);
    const isForCollection = forCollectionKey?.includes(statusCode);
    const isForPurchase = forPurchaseKey?.includes(statusCode);

    const isRevertHidden =
      isDraft ||
      forAssignmentKey.includes(statusCode) ||
      forPurchaseKey?.includes(statusCode) ||
      // For Collection revert is management-only (hidden for finance officer)
      (forCollectionKey?.includes(statusCode) && !isManagement);

    const viewIcon = isDraft ? (
      <Description />
    ) : isFinalize ||
      isItemsVerification ||
      isCanvasVerification ||
      isPriceVerification ? (
      <GppGood />
    ) : isForAssignment ? (
      <AssignmentInd />
    ) : isItemsManagement ? (
      <ListAlt />
    ) : isForCanvas ? (
      <ContactPage />
    ) : forPricingKey.includes(statusCode) ? (
      <PriceCheck />
    ) : priceApprovalKey.includes(statusCode) ? (
      <Security />
    ) : priceApprovedKey.includes(statusCode) ? (
      <EmojiEvents />
    ) : forPurchaseKey?.includes(statusCode) ? (
      <ShoppingCart />
    ) : forCollectionKey?.includes(statusCode) ? (
      <PriceCheck />
    ) : (
      <Visibility />
    );

    const viewTooltip = isDraft
      ? "Draft"
      : isFinalize
        ? "Transaction"
        : isForAssignment
          ? "Assign/Reassign"
          : isItemsManagement
            ? "Item Management"
            : isItemsVerification
              ? "Verify Transaction Item"
              : isForCanvas
                ? "For Canvas"
                : isCanvasVerification
                  ? "Verify Canvas"
                  : forPricingKey.includes(statusCode)
                    ? "Pricing"
                    : isPriceVerification
                      ? "Verify Pricing"
                      : priceApprovalKey.includes(statusCode)
                        ? "Approve Pricing"
                        : priceApprovedKey.includes(statusCode)
                          ? "View Approved Pricing"
                          : forPurchaseKey?.includes(statusCode)
                            ? "For Purchase"
                            : forCollectionKey?.includes(statusCode)
                              ? "For Collection"
                              : "View Transaction";

    const handleView = (e) => {
      e.stopPropagation();
      const isPurchaseStatus =
        forPurchaseKey && forPurchaseKey.includes(statusCode);
      const isCollectionStatus =
        forCollectionKey && forCollectionKey.includes(statusCode);
      if (isPurchaseStatus || isCollectionStatus) {
        return navigate(
          isCollectionStatus
            ? "/transaction-for-collection"
            : "/transaction-for-purchase",
          {
            state: {
              transaction: row,
              selectedStatusCode: statusCode,
              currentStatusLabel: filterStatus,
              transactionCode: row.transactionId,
              forPurchaseKey,
              currentUserId: userId,

              forCollectionKey,

              crTypeKey,
            },
          },
        );
      }
      navigate(isPricing ? "/transaction-pricing-set" : "/transaction-canvas", {
        state: isPricing
          ? {
              transaction: row,
              selectedStatusCode: statusCode,
              isManagement,
              isProcurementTL,
              transacstatus,
              forPricingKey,
              priceSettingKey: forPricingKey,
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
              selectedStatusCode: statusCode,
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
      });
    };

    return (
      <div className="flex justify-center gap-0">
        {(isDraft || isManagement) && (
          <BaseButton
            icon={<Edit />}
            tooltip="Edit Transaction"
            size="small"
            actionColor="edit"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row);
              setIsAEModalOpen(true);
            }}
          />
        )}
        <BaseButton
          icon={viewIcon}
          tooltip={viewTooltip}
          size="small"
          actionColor="view"
          onClick={handleView}
        />
        {(isPricing ||
          isForCanvas ||
          isCanvasVerification ||
          isForCollection ||
          isForPurchase) && (
          <BaseButton
            icon={<RequestQuote />}
            tooltip="Direct Cost"
            size="small"
            actionColor="breakdown"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row);
              setIsDirectCostModalOpen(true);
            }}
          />
        )}
        <BaseButton
          icon={<History />}
          tooltip="View Transaction History"
          size="small"
          actionColor="deactivate"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTransaction(row);
            setIsHistoryModalOpen(true);
          }}
        />
        {!isRevertHidden && (
          <BaseButton
            icon={<Replay />}
            tooltip="Revert Transaction"
            size="small"
            actionColor="revert"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row);
              setIsRevertModalOpen(true);
            }}
          />
        )}
        {!isDraft && !forAssignmentKey.includes(statusCode) && (
          <BaseButton
            icon={<Archive />}
            tooltip="Archive Transaction"
            size="small"
            actionColor="deactivate"
            onClick={(e) => {
              e.stopPropagation();
              setArchiveModalTransaction(row);
              setIsArchiveModalOpen(true);
            }}
          />
        )}
        {isDraft && (
          <BaseButton
            icon={<Delete />}
            tooltip="Delete Transaction"
            size="small"
            actionColor="delete"
            onClick={(e) => {
              e.stopPropagation();
              setEntityToDelete({
                type: "transaction",
                data: { id: row.id, code: row.transactionName },
              });
              setIsDeleteModalOpen(true);
            }}
          />
        )}
      </div>
    );
  }

  // ── Procurement ──────────────────────────────────────────────────────────
  if (isProcurement) {
    const isDraft = draftKey.includes(statusCode);
    const isFinalize = finalizeKey.includes(statusCode);
    const isFinalizeVerification = finalizeVerificationKey.includes(statusCode);
    const isPriceSet = priceSettingKey.includes(statusCode);
    const isPriceFinalize = priceFinalizeKey.includes(statusCode);
    const isPriceFinalizeVerification =
      priceFinalizeVerificationKey.includes(statusCode);
    const isPriceApproval = procPriceApprovalKey.includes(statusCode);
    const isForCollection = forCollectionKey?.includes(statusCode);
    const isPricing =
      isPriceSet ||
      isPriceFinalize ||
      isPriceFinalizeVerification ||
      isPriceApproval;
    const isRevertVisible =
      !draftKey.includes(statusCode) &&
      !priceSettingKey.includes(statusCode) &&
      !forPurchaseKey?.includes(statusCode) &&
      !forCollectionKey?.includes(statusCode);

    const viewIcon = isDraft ? (
      <Description />
    ) : isFinalize ? (
      <CheckCircleOutline />
    ) : isFinalizeVerification ? (
      <GppGood />
    ) : isPriceSet ? (
      <Sell />
    ) : isPriceFinalize ? (
      <PriceCheck />
    ) : isPriceFinalizeVerification ? (
      <GppGood />
    ) : isPriceApproval ? (
      <Security />
    ) : procPriceApprovedKey?.includes(statusCode) ? (
      <EmojiEvents />
    ) : forPurchaseKey?.includes(statusCode) ? (
      <ShoppingCart />
    ) : (
      <Visibility />
    );

    const viewTooltip = isDraft
      ? "View Draft"
      : isFinalize
        ? "View Transaction"
        : isFinalizeVerification
          ? "Verify Transaction"
          : isPriceSet
            ? "Set Pricing"
            : isPriceFinalize
              ? "Finalize Pricing"
              : isPriceFinalizeVerification
                ? "Verify Pricing"
                : isPriceApproval
                  ? "Approve Pricing"
                  : procPriceApprovedKey?.includes(statusCode)
                    ? "View Approved Pricing"
                    : forPurchaseKey?.includes(statusCode)
                      ? "For Purchase"
                      : "View Transaction";

    const handleView = (e) => {
      e.stopPropagation();
      if (forPurchaseKey && forPurchaseKey.includes(statusCode)) {
        return navigate("/transaction-for-purchase", {
          state: {
            transaction: row,
            selectedStatusCode: statusCode,
            currentStatusLabel: filterStatus,
            transactionCode: row.transactionId,
            forPurchaseKey,
            currentUserId: userId,

            isManagement,
            isProcurement,

            crTypeKey,
          },
        });
      }
      if (forCollectionKey && forCollectionKey.includes(statusCode)) {
        return navigate("/transaction-for-collection", {
          state: {
            transaction: row,
            selectedStatusCode: statusCode,
            currentStatusLabel: filterStatus,
            transactionCode: row.transactionId,
            forCollectionKey,
            currentUserId: userId,

            isManagement,
            isProcurement,

            crTypeKey,
          },
        });
      }
      navigate(isPricing ? "/transaction-pricing-set" : "/transaction-canvas", {
        state: isPricing
          ? {
              transaction: row,
              selectedStatusCode: statusCode,
              clientNickName: row.clientName,
              currentUserId: userId,
              proc_status,
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
              selectedStatusCode: statusCode,
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
      });
    };

    return (
      <div className="flex justify-center gap-0">
        {isDraft && (
          <BaseButton
            icon={<Edit />}
            tooltip="Edit Transaction"
            size="small"
            actionColor="edit"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row);
              setIsAEModalOpen(true);
            }}
          />
        )}
        <BaseButton
          icon={viewIcon}
          tooltip={viewTooltip}
          size="small"
          actionColor="view"
          onClick={handleView}
        />
        {isDraft && (
          <BaseButton
            icon={<Delete />}
            tooltip="Delete Transaction"
            size="small"
            actionColor="delete"
            onClick={(e) => {
              e.stopPropagation();
              setEntityToDelete({
                type: "transaction",
                data: { id: row.id, code: row.transactionName },
              });
              setIsDeleteModalOpen(true);
            }}
          />
        )}
        {(isPricing || isForCollection) && (
          <BaseButton
            icon={<RequestQuote />}
            tooltip="Direct Cost"
            size="small"
            actionColor="breakdown"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row);
              setIsDirectCostModalOpen(true);
            }}
          />
        )}
        <BaseButton
          icon={<History />}
          tooltip="View Transaction History"
          size="small"
          actionColor="deactivate"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTransaction(row);
            setIsHistoryModalOpen(true);
          }}
        />
        {isRevertVisible && (
          <BaseButton
            icon={<Undo />}
            tooltip="Revert Transaction"
            size="small"
            actionColor="revert"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row);
              setIsRevertModalOpen(true);
            }}
          />
        )}
        {!isDraft && (
          <BaseButton
            icon={<Archive />}
            tooltip="Archive Transaction"
            size="small"
            actionColor="deactivate"
            onClick={(e) => {
              e.stopPropagation();
              setArchiveModalTransaction(row);
              setIsArchiveModalOpen(true);
            }}
          />
        )}
      </div>
    );
  }

  // ── Account Officer ──────────────────────────────────────────────────────
  if (isAccountOfficer) {
    const isItemsManagement = itemsManagementKey.includes(statusCode);
    const isItemsFinalize = itemsFinalizeKey.includes(statusCode);
    const isItemsVerification = itemsVerificationKey.includes(statusCode);
    const isForCanvas = forCanvasKey.includes(statusCode);
    const isCanvasFinalize = canvasFinalizeKey.includes(statusCode);
    const isCanvasVerification = canvasVerificationKey.includes(statusCode);
    const isForAssignment = forAssignmentKey.includes(statusCode);
    const hideRevert =
      isItemsManagement ||
      isForAssignment ||
      forPurchaseKey?.includes(statusCode) ||
      forCollectionKey?.includes(statusCode);

    const viewIcon = isItemsManagement ? (
      <ListAlt />
    ) : isItemsFinalize || isCanvasFinalize ? (
      <CheckCircleOutline />
    ) : isItemsVerification || isCanvasVerification ? (
      <GppGood />
    ) : isForCanvas ? (
      <ContactPage />
    ) : isForAssignment ? (
      <AssignmentInd />
    ) : forPurchaseKey?.includes(statusCode) ? (
      <ShoppingCart />
    ) : (
      <Visibility />
    );

    const viewTooltip = isForAssignment
      ? "For Assignment"
      : isItemsManagement
        ? "Manage Items"
        : isItemsFinalize
          ? "Finalize Items"
          : isItemsVerification
            ? "Verify Items"
            : isForCanvas
              ? "Canvas"
              : isCanvasFinalize
                ? "Finalize Canvas"
                : isCanvasVerification
                  ? "Verify Canvas"
                  : forPurchaseKey?.includes(statusCode)
                    ? "For Purchase"
                    : "View Transaction";

    return (
      <div className="flex justify-center gap-0">
        <BaseButton
          icon={viewIcon}
          tooltip={viewTooltip}
          size="small"
          actionColor="view"
          onClick={(e) => {
            e.stopPropagation();
            if (forPurchaseKey && forPurchaseKey.includes(statusCode)) {
              return navigate("/transaction-for-purchase", {
                state: {
                  transaction: row,
                  selectedStatusCode: statusCode,
                  currentStatusLabel: filterStatus,
                  transactionCode: row.transactionId,
                  forPurchaseKey,
                  currentUserId: userId,

                  isManagement,
                  itemType,
                  procMode,
                  procSource,
                  statusTransaction,

                  crTypeKey,
                },
              });
            }
            if (forCollectionKey && forCollectionKey.includes(statusCode)) {
              return navigate("/transaction-for-collection", {
                state: {
                  transaction: row,
                  selectedStatusCode: statusCode,
                  currentStatusLabel: filterStatus,
                  transactionCode: row.transactionId,
                  forCollectionKey,
                  currentUserId: userId,

                  isManagement,
                  itemType,
                  procMode,
                  procSource,
                  statusTransaction,

                  crTypeKey,
                },
              });
            }
            if (forCollectionKey && forCollectionKey.includes(statusCode)) {
              return navigate("/transaction-for-collection", {
                state: {
                  transaction: row,
                  selectedStatusCode: statusCode,
                  currentStatusLabel: filterStatus,
                  transactionCode: row.transactionId,
                  forCollectionKey,
                  currentUserId: userId,

                  isManagement,
                  itemType,
                  procMode,
                  procSource,
                  statusTransaction,

                  crTypeKey,
                },
              });
            }
            navigate("/transaction-canvas", { state: buildCanvasState(row) });
          }}
        />
        {(isCanvasFinalize || isForCanvas || isCanvasVerification) && (
          <BaseButton
            icon={<RequestQuote />}
            tooltip="Direct Cost"
            size="small"
            actionColor="breakdown"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row);
              setIsDirectCostModalOpen(true);
            }}
          />
        )}
        <BaseButton
          icon={<History />}
          tooltip="View Transaction History"
          size="small"
          actionColor="deactivate"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTransaction(row);
            setIsHistoryModalOpen(true);
          }}
        />
        {!hideRevert && (
          <BaseButton
            icon={<Replay />}
            tooltip="Revert Transaction"
            size="small"
            actionColor="revert"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row);
              setIsRevertModalOpen(true);
            }}
          />
        )}
        {!forAssignmentKey.includes(statusCode) && (
          <BaseButton
            icon={<Archive />}
            tooltip="Archive Transaction"
            size="small"
            actionColor="deactivate"
            onClick={(e) => {
              e.stopPropagation();
              setArchiveModalTransaction(row);
              setIsArchiveModalOpen(true);
            }}
          />
        )}
      </div>
    );
  }

  return null;
}

// ===========================================================================
function TransactionView(props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const {
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredTransactions,
    loading,
    initialLoading,
    filterLoading,
    filterStatus,
    selectedStatusCode,
    draftKey = "",
    finalizeKey = "",
    transactionVerificationKey = "",
    itemsManagementKey = "",
    itemsFinalizeKey = "",
    itemsVerificationKey = "",
    forCanvasKey = "",
    canvasFinalizeKey = "",
    canvasVerificationKey = "",
    priceSettingKey = "",
    priceFinalizeKey = "",
    priceVerificationKey = "",
    priceApprovalKey = "",
    priceApprovedKey = "",
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
    archiveStatus,
    itemType,
    procMode,
    procSource,
    isManagement,
    isProcurement,
    isAccountOfficer,
    userId,
    forCollectionKey,
    forPurchaseKey = "",
    isPricingSetting,
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
    actionOpts,
  } = props;

  const renderActions = useCallback(
    (_, row) => buildActions(row, actionOpts),
    [actionOpts],
  );
  // For Assignment → Canvass Verification: Company, Submission and Created
  // carry nothing useful at these stages, so they're dropped.
  const hideEarlyStageCols = useMemo(() => {
    if (!selectedStatusCode) return false;
    const {
      forAssignmentKey,
      itemsManagementKey,
      itemsFinalizeKey,
      itemsVerificationKey,
      forCanvasKey: canvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
    } = actionOpts;

    return [
      forAssignmentKey,
      itemsManagementKey,
      itemsFinalizeKey,
      itemsVerificationKey,
      canvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
    ].some((k) => k?.includes(selectedStatusCode));
  }, [actionOpts, selectedStatusCode]);
  // Price Setting → Awaiting Award: same treatment, but only Company goes.
  const hidePricingStageCols = useMemo(() => {
    if (!selectedStatusCode) return false;
    const {
      forPricingKey,
      priceSettingKey,
      priceFinalizeKey,
      priceFinalizeVerificationKey,
      priceVerificationKey,
      priceApprovalKey,
      procPriceApprovalKey,
      priceApprovedKey,
      procPriceApprovedKey,
    } = actionOpts;

    return [
      forPricingKey,
      priceSettingKey,
      priceFinalizeKey,
      priceFinalizeVerificationKey,
      priceVerificationKey,
      priceApprovalKey,
      procPriceApprovalKey,
      priceApprovedKey,
      procPriceApprovedKey,
    ].some((k) => k?.includes(selectedStatusCode));
  }, [actionOpts, selectedStatusCode]);

  // For Purchase: Company and Created are hidden.
  const hideForPurchaseCols = useMemo(() => {
    if (!selectedStatusCode) return false;
    return Boolean(actionOpts.forPurchaseKey?.includes(selectedStatusCode));
  }, [actionOpts, selectedStatusCode]);

  // Company is hidden in all three ranges; the wider Transaction goes with it.
  const hideCompanyCol =
    hideEarlyStageCols || hidePricingStageCols || hideForPurchaseCols;

  // Created is hidden in the early stages and in For Purchase.
  const hideCreatedCol = hideEarlyStageCols || hideForPurchaseCols;
  // For Collection: only Code, Transaction, Client, Company, Submission,
  // Created and Actions are shown.
  const isForCollectionView = Boolean(
    selectedStatusCode && forCollectionKey?.includes(selectedStatusCode),
  );
  // The early stages — Draft, Transaction Finalized and Transaction
  // Verification — are where a transaction is still being named, so the code
  // and the client ➟ company pair ride with the title instead of taking
  // columns of their own.
  const isEarlyNamingView = [draftKey, finalizeKey, transactionVerificationKey]
    .filter(Boolean)
    .includes(selectedStatusCode);
  // Every stage folds the same way: the code is still only an identifier
  // beside the title rather than a reference of its own, so it moves into the
  // column, taking the client ➟ company pair with it. That runs from For
  // Assignment through the item, canvas and pricing stages.
  const isCodeInsideView =
    isEarlyNamingView ||
    [
      actionOpts?.forAssignmentKey,
      itemsManagementKey,
      itemsFinalizeKey,
      itemsVerificationKey,
      forCanvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
      priceSettingKey,
      priceFinalizeKey,
      priceVerificationKey,
      priceApprovalKey,
      priceApprovedKey,
      forPurchaseKey,
      forCollectionKey,
    ]
      .filter(Boolean)
      .includes(selectedStatusCode);
  // The whole pricing run — Price Setting through Awaiting Award — shares one
  // column layout, so they are matched as a group rather than one by one.
  const isPricingStageView = [
    priceSettingKey,
    priceFinalizeKey,
    priceVerificationKey,
    priceApprovalKey,
    priceApprovedKey,
  ]
    .filter(Boolean)
    .includes(selectedStatusCode);
  const columns = useMemo(
    () => [
      // Here the code has no meaning of its own — it only identifies the row
      // the title belongs to — so it rides above the title instead of
      // taking a column that would sit half empty beside it.
      ...(isCodeInsideView
        ? [
            {
              key: "transactionName",
              label: "Transaction",
              xs: 6,
              // Only the name can ellipsize — the code and the badge are
              // short by design — so the tooltip carries just the name.
              title: true,
              render: (val, row) => {
                const hasClient = Boolean(row.clientName?.trim());
                const hasCompany = Boolean(row.companyName?.trim());
                // These stages fold the counterparty in here; past them it
                // keeps its own column.
                const showBadge =
                  isCodeInsideView && (hasClient || hasCompany);

                return (
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[0.625rem] font-medium leading-tight text-gray-500 dark:text-gray-400">
                        {row.transactionId}
                      </span>
                      {showBadge && (
                        <span
                          className="shrink-0 px-1 py-px text-[0.5rem] font-medium uppercase leading-none rounded-full"
                          style={{
                            backgroundColor: colors.blue.bg,
                            color: colors.blue.text,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {hasClient ? row.clientName : ""}
                          {hasClient && hasCompany ? " ➟ " : ""}
                          {hasCompany ? row.companyName : ""}
                        </span>
                      )}
                    </div>
                    <span className="block truncate text-[0.8125rem] font-medium leading-tight -mt-0.5">
                      {val}
                    </span>
                  </div>
                );
              },
            },
            // Transaction-level ABC (dTotalABC) — optional, so most drafts
            // leave it unset and fall back to the shared placeholder.
            ...(isEarlyNamingView
              ? [
                  {
                    key: "dTotalABC",
                    label: "ABC",
                    align: "right",
                    xs: 1.5,
                    render: (val) =>
                      val == null || val === "" ? (
                        <span
                          className="text-xs font-light italic"
                          style={{ color: colors.textMuted }}
                        >
                          {NO_TRANSACTION_ABC}
                        </span>
                      ) : (
                        `₱ ${Number(val).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      ),
                  },
                ]
              : []),
          ]
        : [
            { key: "transactionId", label: "Code", xs: 1 },
            {
              key: "transactionName",
              label: "Transaction",
              xs: hideCompanyCol && !isForCollectionView ? 6 : 3,
              maxChars: 75,
            },
          ]),
      // On these stages the client and company already ride the badge inside
      // the Transaction column, so their own columns would just repeat it.
      ...(!isCodeInsideView && (showSubmissionDate || isForCollectionView)
        ? [{ key: "clientName", label: "Client" }]
        : []),
      ...(!isCodeInsideView && (isForCollectionView || !hideCompanyCol)
        ? [{ key: "companyName", label: "Company" }]
        : []),
      // The submission date now rides inside the Procurement Officer column.
      ...(!showSubmissionDate && !isForCollectionView
        ? [
            {
              key: "progress",
              label: "Progress",
              align: "center",
              xs: 2,
              render: (_, row) => (
                <ProgressBar value={txnProgressMap[row.id] ?? 0} />
              ),
            },
            {
              key: "balance",
              label: "Balance",
              align: "right",
              xs: 1.5,
              render: (_, row) => {
                const unpaid = txnBalanceMap[row.id];
                if (unpaid == null)
                  return (
                    <span
                      style={{ color: colors.textMuted, fontSize: "0.7rem" }}
                    >
                      —
                    </span>
                  );
                return (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color:
                        unpaid === 0
                          ? colors.green.paid
                          : colors.amber.warnText,
                    }}
                  >
                    {unpaid === 0
                      ? "₱ 00.00"
                      : `₱ ${Number(unpaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                );
              },
            },
          ]
        : []),
      // Assigned and AO Due Date are two halves of one fact — who owns the
      // transaction and when they owe it — so they read as a single column.
      // Shown wherever either was visible; the due date only applies up to
      // Canvas Verification, hence the two separate conditions.
      ...(!isForCollectionView && (isAssignedToColumnVisible || aoDueDateVisible)
        ? [
            {
              key: "aoName",
              label: "Account Officer",
              align: "center",
              xs: 2,
              render: (_, row) => {
                // For Purchase/Delivery the AO is waiting on the goods to
                // ship, not on a due date — so the second line reads the
                // delivery date and the standalone Delivery column is gone.
                const isForPurchaseStage = Boolean(
                  forPurchaseKey && selectedStatusCode === forPurchaseKey,
                );
                const hasAo = Boolean(row.aoName?.trim());
                const hasSecond = isForPurchaseStage
                  ? Boolean(row.dtDelivery)
                  : Boolean(row.dtAODueDate);
                const lineClass =
                  "truncate uppercase tracking-wide text-[0.625rem] font-medium leading-tight";

                // Nothing to say — one placeholder beats two stacked dashes.
                if (!hasAo && !hasSecond) {
                  return (
                    <span
                      className="text-xs font-light italic"
                      style={{ color: colors.textMuted }}
                    >
                      {NOT_YET_ASSIGNED}
                    </span>
                  );
                }

                const secondDate = isForPurchaseStage
                  ? row.dtDelivery
                  : row.dtAODueDate;
                const secondColor = isForPurchaseStage
                  ? getDueDateColor(secondDate)
                  : getDueDateColor(secondDate);
                // ONE grid holding both rows, not a grid per row: a shared
                // grid resolves the label column to the width of the widest
                // label, so text-right has something to align against and
                // both labels end on the same edge.
                const labelClass =
                  "text-right text-gray-500 dark:text-gray-400 whitespace-nowrap";
                const valueClass = "text-left truncate";

                return (
                  <div className="flex min-w-0 justify-center">
                  <div className={`${OFFICER_GRID_CLASS} ${lineClass}`}>
                      <span className={labelClass}>AO:</span>
                      <span className={valueClass}>
                        {hasAo ? row.aoName : "—"}
                      </span>
                      <span className={`${labelClass} -mt-0.5`}>
                        {isForPurchaseStage ? "DELIVERY:" : "DUE:"}
                      </span>
                      <span
                        className={`${valueClass} -mt-0.5`}
                        style={{
                          color: secondColor ?? "inherit",
                          fontWeight: secondColor ? 600 : 500,
                        }}
                      >
                        {hasSecond
                          ? isForPurchaseStage
                            ? row.deliveryDate
                            : row.aoDueDate
                          : OPEN_DATE}
                      </span>
                    </div>
                  </div>
                );
              },
            },
          ]
        : []),
      // The delivery date now rides inside the Account Officer column.
      // Procurement Officer + Submission read as one column, the way Account
      // Officer + AO Due Date does — on the three early stages plus the whole
      // pricing run. Everywhere else the plain Created column stands alone.
      ...(isEarlyNamingView || isPricingStageView
        ? [
            {
              key: "createdBy",
              label: "Procurement Officer",
              align: "center",
              xs: 2,
              render: (_, row) => {
                const hasPo = Boolean(row.createdBy?.trim());
                const hasDate = Boolean(row.dtDocSubmission);
                const lineClass =
                  "truncate uppercase tracking-wide text-[0.625rem] font-medium leading-tight";

                if (!hasPo && !hasDate) {
                  return (
                    <span
                      className="text-xs font-light italic"
                      style={{ color: colors.textMuted }}
                    >
                      {NOT_YET_ASSIGNED}
                    </span>
                  );
                }

                // ONE grid for both rows, so the labels share a right edge.
                const labelClass =
                  "text-right text-gray-500 dark:text-gray-400 whitespace-nowrap";
                const valueClass = "text-left truncate";

                return (
                  <div className="flex min-w-0 justify-center">
            <div className={`${OFFICER_GRID_CLASS} ${lineClass}`}>
                      <span className={labelClass}>PO:</span>
                      <span className={valueClass}>
                        {hasPo ? row.createdBy : "—"}
                      </span>
                      <span className={`${labelClass} -mt-0.5`}>
                        SUB. DATE:
                      </span>
                      <span
                        className={`${valueClass} -mt-0.5`}
                        style={{
                          color: hasDate
                            ? (getDueDateColor(row.dtDocSubmission) ?? "inherit")
                            : colors.textMuted,
                          fontWeight:
                            hasDate && getDueDateColor(row.dtDocSubmission)
                              ? 600
                              : 500,
                        }}
                      >
                        {hasDate ? row.date : OPEN_DATE}
                      </span>
                    </div>
                  </div>
                );
              },
            },
          ]
        : isForCollectionView
          ? [
              {
                key: "collectionAmount",
                label: "Collection Amount",
                align: "right",
                xs: 2.5,
                render: (_, row) => {
                  const data = txnCollectibleMap[row.id];
                  if (!data)
                    return (
                      <span
                        style={{ color: colors.textMuted, fontSize: "0.7rem" }}
                      >
                        —
                      </span>
                    );

                  const peso = (v) =>
                    Number(v ?? 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                  // A zero deduction is noise — dropping the line keeps the
                  // rows even instead of staggering on every transaction.
                  const deductions = [
                    ["Less EWT:", data.ewt],
                    ["Less TAX:", data.tax],
                    ["Less Retention:", data.retention],
                  ].filter(([, v]) => Number(v ?? 0) !== 0);

                  // Money lines read best with the figures on a common
                  // right edge; the label sits left of each one.
                  const labelClass =
                    "text-left text-gray-500 dark:text-gray-400 whitespace-nowrap";
                  const valueClass = "text-right whitespace-nowrap";
                  const lineClass =
                    "grid grid-cols-[auto_1fr] items-baseline gap-x-3 text-[0.5625rem] font-light italic leading-tight";
                  const netLineClass =
                    "grid grid-cols-[auto_1fr] items-baseline gap-x-3 text-[0.625rem] font-semibold leading-tight";

                  // Same derivation as CollectionPaymentDetails.jsx's
                  // netAmount: collectible less the three deductions.
                  const net =
                    Number(data.collectible ?? 0) -
                    Number(data.ewt ?? 0) -
                    Number(data.tax ?? 0) -
                    Number(data.retention ?? 0);

                  return (
                    <div className="flex min-w-0 justify-center">
                      <div className="min-w-0">
                        <div className={netLineClass}>
                          <span className={labelClass}>Amount:</span>
                          <span className={valueClass}>
                            ₱ {peso(data.collectible)}
                          </span>
                        </div>
                        {deductions.map(([label, v]) => (
                          <div key={label} className={lineClass}>
                            <span className={labelClass}>{label}</span>
                            <span className={valueClass}>₱ {peso(v)}</span>
                          </div>
                        ))}
                        <div className={netLineClass}>
                          <span className="whitespace-nowrap">NET:</span>
                          <span className={valueClass}>₱ {peso(net)}</span>
                        </div>
                      </div>
                    </div>
                  );
                },
              },
            ]
          : isCreatedByColumnVisible && !hideCreatedCol
            ? [{ key: "createdBy", label: "Created", xs: 1 }]
            : []),
      ...(!isAccountOfficer || showAOActionColumn
        ? [
            {
              key: "actions",
              // Icon-only buttons — the buttons render at a fixed small size,
              // so the column only needs enough room for the widest set.
              xs: 1.5,
              label: "Actions",
              align: "center",
              render: renderActions,
            },
          ]
        : []),
    ],
    [
      isAssignedToColumnVisible,
      isCreatedByColumnVisible,
      isAccountOfficer,
      isManagement,
      showAOActionColumn,
      showSubmissionDate,
      aoDueDateVisible,
      hideEarlyStageCols,
      hideCompanyCol,
      hideCreatedCol,
      isForCollectionView,
      isEarlyNamingView,
      isCodeInsideView,
      actionOpts,
      forPurchaseKey,
      forCollectionKey,
      itemsManagementKey,
      itemsFinalizeKey,
      itemsVerificationKey,
      forCanvasKey,
      canvasFinalizeKey,
      canvasVerificationKey,
      priceSettingKey,
      priceFinalizeKey,
      priceVerificationKey,
      priceApprovalKey,
      priceApprovedKey,
      isPricingStageView,
      renderActions,
      txnProgressMap,
      txnBalanceMap,
      txnCollectibleMap,
      colors,
    ],
  );
  return (
    <PageLayout title="Transaction" subtitle={filterStatus || ""}>
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Transaction"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={() => fetchTransactions({ bustCache: true })} />
        {(isProcurement || isManagement) && (
          <BaseButton
            label="Transaction"
            tooltip="Add Transaction"
            icon={<Add />}
            actionColor="approve"
            variant="contained"
            onClick={() => {
              setSelectedTransaction(null);
              setIsAEModalOpen(true);
            }}
          />
        )}
      </section>

      <section
        style={{
          backgroundColor: colors.cardBg,
          boxShadow: `0 1px 3px ${colors.shadowLow}`,
          borderRadius: "0.5rem",
          overflow: "hidden",
        }}
      >
        <CustomTable
          columns={columns}
          rows={filteredTransactions}
          page={page}
          loading={initialLoading || filterLoading || loading}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          onRowClick={handleRowClick}
        />
      </section>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {isRevertModalOpen && selectedTransaction && (
        <RevertModal
          open={isRevertModalOpen}
          onClose={() => setIsRevertModalOpen(false)}
          transaction={selectedTransaction}
          transactionCode={selectedTransaction.transactionId}
          transactionId={selectedTransaction.id}
          statusMapping={statusMap}
          isManagement={isManagement}
          saveButtonColor={isAccountOfficer ? "error" : "success"}
          onReverted={() => {
            fetchTransactions({ bustCache: true });
          }}
        />
      )}

      {isHistoryModalOpen && selectedTransaction && (
        <TransactionHistoryModal
          open={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          transaction={selectedTransaction}
          transactionId={selectedTransaction.id}
          transactionCode={selectedTransaction.transactionId}
          isManagement={isManagement}
          currentUserId={userId}
        />
      )}

      {isDirectCostModalOpen && selectedTransaction && (
        <DirectCostModal
          open={isDirectCostModalOpen}
          onClose={() => {
            setIsDirectCostModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          isPricingSetting={
            isPricingSetting ||
            forCanvasKey.includes(selectedStatusCode) ||
            forCollectionKey.includes(selectedStatusCode)
          }
        />
      )}

      {isAEModalOpen && (
        <TransactionAEModal
          open={isAEModalOpen}
          onClose={() => {
            setIsAEModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onSaved={
            selectedTransaction ? fetchTransactions : handleAddTransactionSaved
          }
          itemType={itemType}
          procMode={procMode}
          procSource={procSource}
          currentUserId={userId}
        />
      )}

      {(isManagement || isProcurement) &&
        isDeleteModalOpen &&
        entityToDelete && (
          <DeleteVerificationModal
            open={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setEntityToDelete(null);
            }}
            entityToDelete={entityToDelete}
            onSuccess={() => fetchTransactions({ bustCache: true })}
          />
        )}

      {isAccountOfficer && isInfoModalOpen && selectedTransaction && (
        <ATransactionInfoModal
          open={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
          transactionId={selectedTransaction.id}
          transaction={selectedTransaction}
          nUserId={
            selectedTransaction?.user?.nUserId ||
            selectedTransaction?.latest_history?.nUserId
          }
        />
      )}

      {isArchiveModalOpen && archiveModalTransaction && (
        <ArchiveModal
          open={isArchiveModalOpen}
          onClose={() => {
            setIsArchiveModalOpen(false);
            setArchiveModalTransaction(null);
          }}
          transaction={archiveModalTransaction}
          transactionId={archiveModalTransaction.id}
          transactionCode={archiveModalTransaction.transactionId}
          mode="archive"
          archiveStatus={archiveStatus}
          onSuccess={() => {
            setIsArchiveModalOpen(false);
            setArchiveModalTransaction(null);
            fetchTransactions({ bustCache: true });
            window.dispatchEvent(new CustomEvent("txn_data_updated"));
          }}
        />
      )}
    </PageLayout>
  );
}

export default TransactionView;
