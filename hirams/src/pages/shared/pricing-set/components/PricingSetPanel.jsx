import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Checkbox,
  Chip,
  Tooltip,
  Box,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  TrendingDown,
  TrendingUp,
  TrendingFlat,
  Lock,
  Visibility,
} from "@mui/icons-material";
import SyncMenu from "../../../../components/ui/form/SyncMenu.jsx";
import AssignProcurementModal from "../modal/AssignProcurementModal.jsx";
import CustomTable from "../../../../components/ui/form/Table.jsx";
import BaseButton from "../../../../components/ui/form/BaseButton.jsx";
import CustomSearchField from "../../../../components/ui/form/SearchField.jsx";
import SetAEModal from "../modal/SetAEModal.jsx";
import DeleteVerificationModal from "../../transactions/modal/DeleteVerificationModal.jsx";
import TransactionActionModal from "../../transactions/modal/TransactionActionModal.jsx";
import UserAPI from "../../../../api/endpoints/user.api.js";
import PricingAPI from "../../../../api/endpoints/pricing.api.js";
import PricingSetAPI from "../../../../api/endpoints/pricing-set.api.js";
import DirectCostAPI from "../../../../api/endpoints/direct-cost.api.js";
import DirectCostOptionAPI from "../../../../api/endpoints/direct-cost-option.api.js";
import echo from "../../../../lib/echo.js";
import DirectCostModal from "../../transactions/modal/DirectCostModal.jsx";
import AlertStructure from "../../../../components/ui/structure/AlertStructure.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";
import icons from "../../../../utils/style/iconFormatStyles.jsx";
// ── PROMPT 1 — inline color map, only tokens this component uses ──
const useColors = (c) => ({
  diveNegative: c.red.danger,
  divePositive: c.green.paid,
  diveNeutral: c.slate.mutedColor,
  tspPositive: c.blue.text,
  tspNeutral: c.slate.mutedColor,
  chosenText: c.green.textStrong,
  normalText: c.gray.textPrimary,
  chosenBg: c.green.bgSoft,
  badgeNegBg: c.red.bg,
  badgeNegText: c.red.textDark,
  badgePosBg: c.green.bg,
  badgePosText: c.green.textDark,
  badgeNeuBg: c.slate.mutedBg,
  badgeNeuText: c.slate.mutedText,
  cardBg: c.slate.mutedBg,
  cardBorder: c.slate.mutedBorder,
  cardText: c.gray.textPrimary,
  paperBg: c.slate.outerBg,
  divider: c.slate.border,
  textSecondary: c.gray.textSecondary,
  textDisabled: c.gray.textDisabled,
});

function PricingSetPanel({
  transaction,
  selectedStatusCode,
  isManagement,
  isProcurementTL,
  transacstatus,
  forPricingKey = "",
  priceVerificationKey = "",
  priceApprovalKey = "",
  priceSettingKey: priceSettingKeyProp = "",
  priceFinalizeVerificationKey = "",
  isPricingSetting,
  currentStatusLabel,
  currentUserId,
  itemType,
  procMode,
  procSource,
  proc_status = {},
  statusTransaction,
  clientNickName,
  onStatusChanged,
  onActionStart,
  onActionFailed,
  statusChangedAlert,
  onActionsReady,
  onLoadingChange,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const priceSettingKey =
    priceSettingKeyProp || (isManagement ? forPricingKey : "");

  const [loading, setLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(false);
  const [pricingSets, setPricingSets] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [procurementUsers, setProcurementUsers] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [directCostModalOpen, setDirectCostModalOpen] = useState(false);
  const [directCostCheckOpen, setDirectCostCheckOpen] = useState(false);
  const [pendingFinalizeAction, setPendingFinalizeAction] = useState(null);
  const [existingDirectCosts, setExistingDirectCosts] = useState([]);
  const [directCostOptions, setDirectCostOptions] = useState([]);
  const localActionRef = React.useRef(false);

  /* ── Status derivations ── */
  const statusCode = String(
    selectedStatusCode ??
      transaction?.status_code ??
      transaction?.latest_history?.nStatus ??
      "",
  );
  const isTransactionOwner =
    currentUserId && (transaction?.created_by_id ?? transaction?.creator_id)
      ? String(currentUserId) ===
        String(transaction.created_by_id ?? transaction.creator_id)
      : false;
  const statusChangedTooltip = statusChangedAlert
    ? "This transaction has been moved to a different status by another user. All actions are disabled."
    : "";

  const canEditChoice = !isManagement
    ? priceSettingKey?.includes(statusCode)
    : true;
  const showRevert = !isManagement
    ? !priceSettingKey?.includes(statusCode)
    : true;
  const showReassign =
    (isManagement || isProcurementTL) && priceSettingKey?.includes(statusCode);
  const showVerify = !isManagement
    ? priceFinalizeVerificationKey?.includes(statusCode)
    : statusCode !== "" && statusCode === priceVerificationKey;
  const showFinalize =
    (!isManagement &&
      isTransactionOwner &&
      priceSettingKey?.includes(statusCode)) ||
    (isManagement &&
      isTransactionOwner &&
      (priceSettingKey?.includes(statusCode) ||
        forPricingKey?.includes(statusCode)));
  const showForceFinalize =
    isManagement &&
    (priceSettingKey?.includes(statusCode) ||
      forPricingKey?.includes(statusCode)) &&
    !isTransactionOwner;
  const showApprove =
    isManagement && String(statusCode) === String(priceApprovalKey);

  const priceSettingLabel = !isManagement
    ? (proc_status[priceSettingKey] ?? "")
    : (transacstatus?.[forPricingKey] ?? "");
  const priceFinalizeVerificationLabel = !isManagement
    ? (proc_status[priceFinalizeVerificationKey] ?? "")
    : (transacstatus?.[priceVerificationKey] ?? "");

  const hasChosenSet = useMemo(
    () => pricingSets.some((s) => s.chosen),
    [pricingSets],
  );
  const shouldDisableFinalize = loading || setsLoading || !hasChosenSet;

  const openActionModal = useCallback(
    (type) => {
      // Mark as a local action BEFORE the modal fires its request, so an early
      // realtime echo doesn't start the 5-second countdown.
      onActionStart?.();
      setActionType(type);
      setActionModalOpen(true);
    },
    [onActionStart],
  );

  // Closing without success (cancel / error) → re-enable realtime alerts
  const closeActionModal = useCallback(() => {
    onActionFailed?.();
    setActionModalOpen(false);
    setActionType(null);
  }, [onActionFailed]);

  // Success → leave the page immediately, whether or not a status code is passed
  const handleAfterAction = useCallback(
    (newStatusCode) => {
      localActionRef.current = true;
      setActionModalOpen(false);
      setActionType(null);
      if (newStatusCode) {
        sessionStorage.setItem("selectedStatusCode", newStatusCode);
      }
      onStatusChanged?.(newStatusCode);
    },
    [onStatusChanged],
  );

  const fetchProcurementUsers = useCallback(async () => {
    try {
      const res = await UserAPI.getActiveProcurement();
      setProcurementUsers(res.procurement ?? res.data?.procurement ?? []);
    } catch (err) {
      console.error("Failed to fetch procurement users", err);
    }
  }, []);

  const fetchPricingSets = useCallback(async () => {
    if (!transaction?.nTransactionId) return;
    setSetsLoading(true);
    try {
      const res = await PricingAPI.getPricingSets(transaction.nTransactionId);
      const formatted = (res.data ?? []).map((s) => ({
        id: s.nPricingSetId,
        name: s.strName,
        chosen: s.bChosen === 1,
        itemCount: s.item_pricings_count ?? 0,
        item: s.item ?? "0/0",
        totalSellingPrice: s.totalSellingPrice ?? 0,
        diveAmount: s.diveAmount ?? 0,
        divePercentage: s.divePercentage ?? "0.00%",
        raw: s,
      }));
      setPricingSets(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setSetsLoading(false);
    }
  }, [transaction?.nTransactionId]);

  /* ── Load on mount ── */
  useEffect(() => {
    fetchProcurementUsers();
    fetchPricingSets();
  }, [fetchProcurementUsers, fetchPricingSets]);

  /* ── Realtime ── */
  useEffect(() => {
    if (!transaction?.nTransactionId) return;

    const channel = echo.channel(
      `transaction.${transaction.nTransactionId}.pricing-sets`,
    );
    channel.listen(".pricing-set.updated", (event) => {
      if (event.action === "deleted") {
        setPricingSets((prev) =>
          prev.filter((s) => s.id !== event.pricingSetId),
        );
        return;
      }
      if (localActionRef.current) return;
      fetchPricingSets();
    });
    channel.listen(".item-pricing.updated", () => {
      fetchPricingSets();
    });

    return () => {
      echo.leaveChannel(
        `transaction.${transaction.nTransactionId}.pricing-sets`,
      );
    };
  }, [transaction?.nTransactionId, fetchPricingSets]);

  /* ── Helpers ── */
  const isFullyPriced = useCallback((itemStr) => {
    const [priced, total] = itemStr.split("/").map(Number);
    if (isNaN(priced) || isNaN(total) || total === 0) return false;
    return priced === total;
  }, []);

  const fmt = useCallback(
    (val) =>
      Number(val).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
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

  const getItemBadge = useCallback((itemStr) => {
    const [priced, total] = itemStr.split("/").map(Number);
    if (isNaN(priced) || isNaN(total) || total === 0)
      return { color: "default", label: itemStr };
    if (priced === 0) return { color: "error", label: itemStr };
    if (priced < total) return { color: "warning", label: itemStr };
    return { color: "success", label: itemStr };
  }, []);

  const getDiveProps = useCallback(
    (diveAmount) => {
      if (diveAmount < 0)
        return {
          icon: <TrendingDown sx={{ fontSize: 15 }} />,
          color: colors.diveNegative,
        };
      if (diveAmount > 0)
        return {
          icon: <TrendingUp sx={{ fontSize: 15 }} />,
          color: colors.divePositive,
        };
      return {
        icon: <TrendingFlat sx={{ fontSize: 15 }} />,
        color: colors.diveNeutral,
      };
    },
    [colors],
  );

  const getTspColor = useCallback(
    (tsp) => (tsp <= 0 ? colors.tspNeutral : colors.tspPositive),
    [colors],
  );

  const filtered = useMemo(
    () =>
      pricingSets
        .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          if (a.chosen === b.chosen) return a.name.localeCompare(b.name);
          return b.chosen - a.chosen;
        }),
    [pricingSets, search],
  );

  const handleChoose = useCallback(
    async (row, event) => {
      event.stopPropagation();
      if (!canEditChoice) return;
      if (!row.chosen && !isFullyPriced(row.item)) return;

      if (!row.chosen) {
        try {
          const res = await DirectCostAPI.getDirectCosts({
            nTransactionID: transaction?.nTransactionId,
            withEWT: 1,
          });
          const costs = res.directCosts || res.data || res || [];
          if (!costs.length) {
            setDirectCostModalOpen(true);
            return;
          }
        } catch (err) {
          console.error("Failed to check direct costs:", err);
        }
      }

      localActionRef.current = true;

      setPricingSets((prev) =>
        prev.map((s) => ({
          ...s,
          chosen: s.id === row.id ? !row.chosen : false,
        })),
      );

      try {
        await PricingSetAPI.choose(row.id);
        setTimeout(() => {
          localActionRef.current = false;
        }, 3000);
      } catch (err) {
        console.error(err);
        localActionRef.current = false;
        fetchPricingSets();
      }
    },
    [
      canEditChoice,
      isFullyPriced,
      fetchPricingSets,
      transaction?.nTransactionId,
    ],
  );

  const handleEdit = useCallback((row, event) => {
    event.stopPropagation();
    setModalData(row);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((row, event) => {
    event.stopPropagation();
    setDeleteTarget({ type: "pricing-set", data: row });
    setDeleteModalOpen(true);
  }, []);

  const handleFinalizeWithDirectCostCheck = useCallback(
    async (type) => {
      try {
        const [costsRes, optionsRes] = await Promise.all([
          DirectCostAPI.getDirectCosts({
            nTransactionID: transaction?.nTransactionId,
            withEWT: 1,
          }),
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

        const costs = costsRes.directCosts || costsRes.data || costsRes || [];
        setDirectCostOptions(optionsRes);
        setPendingFinalizeAction(type);
        setExistingDirectCosts(costs);
        setDirectCostCheckOpen(true);
      } catch (err) {
        console.error("Failed to check direct costs:", err);
        openActionModal(type);
      }
    },
    [transaction?.nTransactionId, openActionModal],
  );
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    fetchPricingSets();
    setDeleteTarget(null);
    setDeleteModalOpen(false);
  }, [deleteTarget, fetchPricingSets]);

  const handleRowClick = useCallback(
    (row) => {
      navigate("/transaction-pricing", {
        state: {
          transaction,
          clientNickName,
          selectedSet: row,
          isPricingSetting,
          currentStatusLabel,
          isManagement,
          itemType,
          procMode,
          procSource,
          statusTransaction,
        },
      });
    },
    [
      navigate,
      transaction,
      clientNickName,
      isPricingSetting,
      currentStatusLabel,
      isManagement,
      itemType,
      procMode,
      procSource,
      statusTransaction,
    ],
  );

  const handleOpenAssignModal = useCallback(() => {
    setAssignModalOpen(true);
  }, []);

  /* ── Columns ── */
  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Pricing Set",
        render: (_, row) => {
          const canChoose = canEditChoice && isFullyPriced(row.item);
          const checkboxNode = (
            <Checkbox
              checked={row.chosen}
              onChange={(e) => handleChoose(row, e)}
              onClick={(e) => e.stopPropagation()}
              disabled={
                !canEditChoice || (!row.chosen && !isFullyPriced(row.item))
              }
              sx={{
                p: 0.5,
                color:
                  !canChoose && !row.chosen
                    ? colors.textDisabled
                    : colors.textSecondary,
              }}
            />
          );

          const tooltipTitle = !canEditChoice
            ? "Selecting a pricing set is only allowed during price setting"
            : `All items must be priced before selecting (${row.item})`;

          return (
            <div className="flex items-center gap-2">
              {!canChoose && !row.chosen ? (
                <Tooltip title={tooltipTitle} arrow>
                  <span className="flex items-center">
                    {checkboxNode}
                    <Lock
                      sx={{
                        fontSize: 13,
                        color: colors.textDisabled,
                        ml: -0.5,
                      }}
                    />
                  </span>
                </Tooltip>
              ) : (
                checkboxNode
              )}
              <span
                className="font-medium truncate"
                style={{
                  color: row.chosen ? colors.chosenText : colors.normalText,
                }}
              >
                {row.name}
              </span>
            </div>
          );
        },
      },
      {
        key: "item",
        label: "Status",
        align: "center",
        render: (_, row) => {
          const { color, label } = getItemBadge(row.item);
          return (
            <Tooltip title="Priced / Total Items">
              <Chip
                label={label}
                size="small"
                color={color}
                variant="filled"
                sx={{ fontWeight: 600, fontSize: 12, minWidth: 52 }}
              />
            </Tooltip>
          );
        },
      },
      {
        key: "totalSellingPrice",
        label: "Total Selling Price",
        align: "right",
        render: (_, row) => (
          <span
            className="text-sm font-semibold"
            style={{ color: getTspColor(row.totalSellingPrice) }}
          >
            ₱ {fmt(row.totalSellingPrice)}
          </span>
        ),
      },
      {
        key: "diveAmount",
        label: "Dive Amount",
        align: "right",
        render: (_, row) => {
          const { color } = getDiveProps(row.diveAmount);
          const pct = parseFloat(row.divePercentage);
          const badge =
            pct < 0
              ? { bg: colors.badgeNegBg, text: colors.badgeNegText }
              : pct > 0
                ? { bg: colors.badgePosBg, text: colors.badgePosText }
                : { bg: colors.badgeNeuBg, text: colors.badgeNeuText };

          return (
            <div
              className="flex items-center justify-end gap-1 text-sm font-semibold"
              style={{ color }}
            >
              <span>₱ {fmt(row.diveAmount)}</span>
              <span
                className="ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {row.divePercentage}
              </span>
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => (
          <div className="flex justify-center gap-1">
            <BaseButton
              icon={<Visibility />}
              tooltip="View Pricing"
              size="small"
              actionColor="view"
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(row);
              }}
            />
            <BaseButton
              icon={<Edit />}
              tooltip="Edit Pricing Set"
              size="small"
              actionColor="edit"
              onClick={(e) => handleEdit(row, e)}
            />
            <BaseButton
              icon={<Delete />}
              tooltip="Delete Pricing Set"
              size="small"
              actionColor="delete"
              onClick={(e) => handleDelete(row, e)}
              disabled={row.chosen}
            />
          </div>
        ),
      },
    ],
    [
      canEditChoice,
      isFullyPriced,
      handleChoose,
      getItemBadge,
      getTspColor,
      fmt,
      getDiveProps,
      handleEdit,
      handleDelete,
      colors,
    ],
  );

  /* ── Footer actions ── */
  const footerActions = (
    <Box sx={{ display: "flex", gap: 1 }}>
      {showRevert && (
        <BaseButton
          label="Revert"
          icon={icons.revert}
          onClick={() => openActionModal("revert")}
          disabled={loading || setsLoading || statusChangedAlert}
          actionColor="revert"
          tooltip={
            statusChangedAlert
              ? statusChangedTooltip
              : loading || setsLoading
                ? "Loading, please wait..."
                : ""
          }
        />
      )}
      {/* Direct Cost lives here now — moved out of the transactions
          action column for the pricing statuses. */}
      <BaseButton
        label="Direct Cost"
        icon={icons.breakdown}
        onClick={() => setDirectCostModalOpen(true)}
        disabled={loading || setsLoading || statusChangedAlert}
        actionColor="breakdown"
        tooltip={
          statusChangedAlert
            ? statusChangedTooltip
            : loading || setsLoading
              ? "Loading, please wait..."
              : ""
        }
      />
      {showVerify && (
        <BaseButton
          label="Verify"
          icon={icons.verify}
          onClick={() => openActionModal("verify")}
          disabled={loading || setsLoading || statusChangedAlert}
          actionColor="verify"
          tooltip={
            statusChangedAlert
              ? statusChangedTooltip
              : loading || setsLoading
                ? "Loading, please wait..."
                : ""
          }
        />
      )}
      {showReassign && (
        <BaseButton
          label="Reassign"
          icon={icons.assign}
          onClick={handleOpenAssignModal}
          disabled={loading || setsLoading || statusChangedAlert}
          actionColor="reassign"
          tooltip={
            statusChangedAlert
              ? statusChangedTooltip
              : loading || setsLoading
                ? "Loading, please wait..."
                : ""
          }
        />
      )}
      {showFinalize && (
        <BaseButton
          label="Finalize"
          icon={icons.finalize}
          onClick={() => handleFinalizeWithDirectCostCheck("finalize")}
          disabled={shouldDisableFinalize || setsLoading || statusChangedAlert}
          actionColor="finalize"
          tooltip={
            statusChangedAlert
              ? statusChangedTooltip
              : loading || setsLoading
                ? "Loading, please wait..."
                : !hasChosenSet
                  ? "Select at least one pricing set before finalizing"
                  : ""
          }
        />
      )}
      {showForceFinalize && (
        <BaseButton
          label="Force Finalize"
          icon={icons.finalize}
          onClick={() => handleFinalizeWithDirectCostCheck("force_finalize")}
          disabled={shouldDisableFinalize || setsLoading || statusChangedAlert}
          actionColor="finalize"
          tooltip={
            statusChangedAlert
              ? statusChangedTooltip
              : loading || setsLoading
                ? "Loading, please wait..."
                : !hasChosenSet
                  ? "Select at least one pricing set before finalizing"
                  : ""
          }
        />
      )}
      {showApprove && (
        <BaseButton
          label="Approve"
          icon={icons.approve}
          onClick={() => openActionModal("approve")}
          disabled={loading || setsLoading || statusChangedAlert}
          actionColor="approve"
          tooltip={
            statusChangedAlert
              ? statusChangedTooltip
              : loading || setsLoading
                ? "Loading, please wait..."
                : ""
          }
        />
      )}
    </Box>
  );

  useEffect(() => {
    onActionsReady?.(footerActions);
    return () => onActionsReady?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showRevert,
    showVerify,
    showReassign,
    showFinalize,
    showForceFinalize,
    showApprove,
    loading,
    setsLoading,
    statusChangedAlert,
    shouldDisableFinalize,
    hasChosenSet,
  ]);
  // PricingSetPanel
  useEffect(() => {
    onLoadingChange?.(setsLoading);
  }, [setsLoading, onLoadingChange]);
  return (
    <>
      {/* Search + Add */}
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Pricing Set"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={() => fetchPricingSets()} />
        <BaseButton
          label="Pricing Set"
          tooltip="Add Pricing Set"
          icon={<Add />}
          variant="contained"
          actionColor="approve"
          onClick={() => {
            setModalData(null);
            setModalOpen(true);
          }}
        />
      </section>

      {/* Table */}
      <section
        style={{
          backgroundColor: colors.paperBg,
          borderRadius: "0.5rem",
          overflow: "hidden",
          marginBottom: "0.75rem",
          border: isDark ? `1px solid ${colors.divider}` : "none",
        }}
      >
        <CustomTable
          rowSx={(row) =>
            row.chosen ? { backgroundColor: colors.chosenBg } : {}
          }
          columns={columns}
          rows={filtered}
          page={page}
          rowsPerPage={rowsPerPage}
          loading={setsLoading}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          onRowClick={handleRowClick}
        />
      </section>

      {/* Modals */}
      <SetAEModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={modalData}
        onSaved={fetchPricingSets}
        transactionId={transaction?.nTransactionId}
      />
      <DeleteVerificationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        entityToDelete={deleteTarget}
        onSuccess={confirmDelete}
      />
      <AssignProcurementModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        transaction={transaction}
        procurementUsers={procurementUsers}
        currentUserId={currentUserId}
        onSuccess={() => {
          setAssignModalOpen(false);
        }}
      />
      <DirectCostModal
        open={directCostModalOpen}
        onClose={() => {
          setDirectCostModalOpen(false);
          if (pendingFinalizeAction) {
            openActionModal(pendingFinalizeAction);
            setPendingFinalizeAction(null);
          }
        }}
        transaction={transaction}
        isManagement={isManagement}
        isPricingSetting={isPricingSetting}
      />
      <AlertStructure
        open={directCostCheckOpen}
        title="Direct Cost"
        type={existingDirectCosts.length > 0 ? "success" : "warning"}
        headerTitle="Before Finalizing"
        confirmText={
          existingDirectCosts.length > 0
            ? "Edit Direct Costs"
            : "Yes, add Direct Cost"
        }
        cancelLabel="No, proceed to finalize"
        message={
          existingDirectCosts.length > 0 ? (
            <Box>
              <Typography
                sx={{ fontSize: "0.78rem", color: colors.textSecondary, mb: 1 }}
              >
                This transaction has the following direct costs:
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  mb: 1,
                }}
              >
                {existingDirectCosts.map((cost, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "6px",
                      backgroundColor: colors.cardBg,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: colors.cardText,
                        fontWeight: 500,
                      }}
                    >
                      {getDirectCostLabel(cost.nDirectCostOptionID)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: colors.cardText,
                        fontWeight: 700,
                      }}
                    >
                      ₱{" "}
                      {Number(cost.dAmount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                Would you like to edit them or proceed to finalize?
              </Typography>
            </Box>
          ) : (
            "Does this transaction have direct costs?"
          )
        }
        onConfirm={() => {
          setDirectCostCheckOpen(false);
          setDirectCostModalOpen(true);
        }}
        onCancel={() => {
          setDirectCostCheckOpen(false);
          openActionModal(pendingFinalizeAction);
          setPendingFinalizeAction(null);
        }}
        onClose={() => {
          setDirectCostCheckOpen(false);
          setPendingFinalizeAction(null);
        }}
      />
      {actionModalOpen && (
        <TransactionActionModal
          open={actionModalOpen}
          onClose={closeActionModal}
          {...(!isManagement && {
            actionType,
            transaction,
            aostatus: proc_status,
            onVerified: handleAfterAction,
            onFinalized: handleAfterAction,
            onReverted: handleAfterAction,
            priceFinalizeVerificationLabel,
            priceSettingLabel,
            role: "P",
          })}
          {...(isManagement && {
            actionType:
              actionType === "verify"
                ? "verified"
                : actionType === "finalize"
                  ? "finalized"
                  : actionType === "force_finalize"
                    ? "force_finalized"
                    : actionType === "approve"
                      ? "approved"
                      : "reverted",
            onApproved: handleAfterAction,
            onForceFinalized: handleAfterAction,
            transaction: {
              ...transaction,
              latest_history: {
                nStatus:
                  transaction?.status_code ??
                  transaction?.latest_history?.nStatus,
              },
            },
            transacstatus,
            onVerified: handleAfterAction,
            onReverted: handleAfterAction,
            onFinalized: handleAfterAction,
            canvasVerificationLabel: priceFinalizeVerificationLabel,
            isPricing: true,
            role: "M",
          })}
        />
      )}
    </>
  );
}

export default PricingSetPanel;
