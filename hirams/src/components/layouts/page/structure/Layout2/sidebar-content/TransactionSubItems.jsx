import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@mui/material";
import getThemeColors from "../../../../../../utils/style/getThemeColors";
import useKeysLabels from "../../../../../../hooks/useKeysLabels.js";
import { getDueDateColor } from "../../../../../../utils/helpers/dueDateColor.js";
import SidebarSubmenu from "../sidebar/SidebarSubmenu";
import TransactionAPI from "../../../../../../api/endpoints/transaction.api.js";
import { getItem } from "../../../../../../utils/storage/localStorage.js";

function getRelevantDate(t) {
  const code = Number(t.current_status ?? t.latest_history?.nStatus ?? 0);
  // For Purchase/Delivery (340) the delivery date is what matters, not the
  // AO due date. The sidebar's count color uses the same rule the table
  // should follow, so keep the two in sync.
  if (code === 340) return t.dtDelivery;
  return code >= 200 && code <= 245 ? t.dtAODueDate : t.dtDocSubmission;
}

const TransactionSubItems = ({ onItemClick, selectedCode, onSelect }) => {
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  // ✅ Single source — ALL keys + roles from one hook
  const {
    transacstatus,
    proc_status,
    ao_status,
    aotl_status,
    financestatus,
    archiveStatus,
    loading: mappingLoading,
    isManagement,
    isProcurement,
    isAOTL,
    isProcurementTL,
    isFinanceOfficer,
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
    finalizeVerificationKey,
    priceSettingKey,
    priceFinalizeKey,
    priceFinalizeVerificationKey,
    procPriceApprovalKey,
    procPriceApprovedKey,
    forPurchaseKey,
  } = useKeysLabels();

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
      isFinanceOfficer,
      isProcurement,
      isAOTL,
      financestatus,
      transacstatus,
      proc_status,
      aotl_status,
      ao_status,
    ],
  );

  const isOnTransactionPage =
    location.pathname === "/transaction" ||
    location.pathname === "/transaction-canvas" ||
    location.pathname === "/transaction-pricing-set" ||
    location.pathname === "/transaction-pricing" ||
    location.pathname === "/transaction-for-purchase" ||
    location.pathname === "/transaction-for-collection";

  const archiveCodes = useMemo(
    () => Object.keys(archiveStatus || {}),
    [archiveStatus],
  );

  const userId = useMemo(() => getItem("user", {})?.nUserId, []);

  const [transactions, setTransactions] = React.useState([]);
  const [countLoading, setCountLoading] = React.useState(true);

  const fetchSilent = React.useCallback(async () => {
    if (mappingLoading) return;
    try {
      let list = [];
      if (isManagement) {
        const res = await TransactionAPI.getAll();
        list = (res.transactions || res.data || []).filter(Boolean);
      } else if (isFinanceOfficer) {
        const res = await TransactionAPI.getFinance(`nUserId=${userId}`);
        list = (res.transactions || res.data || []).filter(Boolean);
      } else if (isProcurement) {
        const res = await TransactionAPI.getProcurement(
          `nUserId=${userId}&isProcTL=${isProcurementTL ? 1 : 0}`,
        );
        list = (res.transactions || []).filter(Boolean);
      } else {
        const res = await TransactionAPI.getAccountOfficer(
          `nUserId=${userId}&isAOTL=${isAOTL ? 1 : 0}&fetchAll=${isAOTL ? 1 : 0}`,
        );
        list = (res.transactions || []).filter(Boolean);
      }
      setTransactions(list);
    } catch (err) {
      console.error("Sidebar silent fetch error:", err);
    }
  }, [
    mappingLoading,
    isManagement,
    isFinanceOfficer,
    isProcurement,
    isProcurementTL,
    isAOTL,
    userId,
  ]);

  const fetchSilentRef = React.useRef(fetchSilent);
  React.useEffect(() => {
    fetchSilentRef.current = fetchSilent;
  }, [fetchSilent]);

  React.useEffect(() => {
    if (mappingLoading) return;
    setCountLoading(true);
    fetchSilent().finally(() => setCountLoading(false));
  }, [mappingLoading, fetchSilent]);

  React.useEffect(() => {
    const handleUpdated = () => fetchSilentRef.current();
    const handleDeleted = (e) => {
      const id = e.detail?.transactionId;
      if (id) {
        setTransactions((prev) =>
          prev.filter((t) => String(t.nTransactionId ?? t.id) !== String(id)),
        );
      } else {
        fetchSilentRef.current();
      }
    };
    window.addEventListener("txn_data_updated", handleUpdated);
    window.addEventListener("txn_data_deleted", handleDeleted);
    return () => {
      window.removeEventListener("txn_data_updated", handleUpdated);
      window.removeEventListener("txn_data_deleted", handleDeleted);
    };
  }, []);

  const isMe = useMemo(
    () => (t) =>
      userId != null &&
      t?.nAssignedAO != null &&
      String(t.nAssignedAO) === String(userId),
    [userId],
  );
  const isMine = useMemo(
    () => (t) =>
      userId != null &&
      t?.creator_id != null &&
      String(t.creator_id) === String(userId),
    [userId],
  );

  const statusCounts = useMemo(() => {
    if (!Object.keys(statusMap).length) return {};
    const txnCode = (t) =>
      t ? String(t.current_status ?? t.latest_history?.nStatus ?? "") : "";
    const counts = {};

    if (isManagement || isFinanceOfficer) {
      Object.keys(statusMap).forEach((code) => {
        if (code === forAssignmentKey) {
          counts[code] = transactions.filter((t) =>
            ["200", "210", "220", "230", "240"].includes(txnCode(t)),
          ).length;
        } else {
          counts[code] = transactions.filter(
            (t) => txnCode(t) === String(code),
          ).length;
        }
      });
      return counts;
    }
    if (isProcurement) {
      Object.keys(statusMap).forEach((code) => {
        switch (code) {
          case draftKey:
          case finalizeKey:
          case priceSettingKey:
          case priceFinalizeKey:
          case procPriceApprovalKey:
          case forPurchaseKey:
            counts[code] = transactions.filter((t) => {
              if (txnCode(t) !== code) return false;
              if ([priceSettingKey, forPurchaseKey].includes(code))
                return isProcurementTL || isMine(t);
              return isMine(t);
            }).length;
            break;
          case finalizeVerificationKey:
          case priceFinalizeVerificationKey:
          case procPriceApprovedKey:
            counts[code] = transactions.filter(
              (t) => txnCode(t) === code,
            ).length;
            break;
          default:
            counts[code] = 0;
        }
      });
      return counts;
    }
    if (isAOTL) {
      Object.keys(statusMap).forEach((code) => {
        switch (code) {
          case forAssignmentKey:
            counts[code] = transactions.filter((t) =>
              ["200", "210", "220", "225", "230", "240", "245"].includes(
                txnCode(t),
              ),
            ).length;
            break;
          case itemsManagementKey:
          case itemsFinalizeKey:
          case forCanvasKey:
          case canvasFinalizeKey:
            counts[code] = transactions.filter(
              (t) => txnCode(t) === code && isMe(t),
            ).length;
            break;
          case itemsVerificationKey:
          case canvasVerificationKey:
          case forPurchaseKey:
            counts[code] = transactions.filter(
              (t) => txnCode(t) === code,
            ).length;
            break;
          default:
            counts[code] = 0;
        }
      });
      return counts;
    }
    Object.keys(statusMap).forEach((code) => {
      switch (code) {
        case itemsManagementKey:
        case itemsFinalizeKey:
        case forCanvasKey:
        case canvasFinalizeKey:
        case forPurchaseKey:
          counts[code] = transactions.filter(
            (t) => txnCode(t) === code && isMe(t),
          ).length;
          break;
        case itemsVerificationKey:
        case canvasVerificationKey:
          counts[code] = transactions.filter((t) => txnCode(t) === code).length;
          break;
        default:
          counts[code] = 0;
      }
    });
    return counts;
  }, [
    transactions,
    statusMap,
    isManagement,
    isFinanceOfficer,
    isProcurement,
    isProcurementTL,
    isAOTL,
    isMe,
    isMine,
    forAssignmentKey,
    itemsManagementKey,
    itemsFinalizeKey,
    itemsVerificationKey,
    forCanvasKey,
    canvasFinalizeKey,
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
  ]);

  const dueCounts = useMemo(() => {
    if (!Object.keys(statusMap).length) return { red: {}, orange: {} };
    const txnCode = (t) =>
      t ? String(t.current_status ?? t.latest_history?.nStatus ?? "") : "";

    const getBucket = (code) => {
      if (isManagement || isFinanceOfficer) {
        if (code === forAssignmentKey)
          return transactions.filter((t) =>
            ["200", "210", "220", "230", "240"].includes(txnCode(t)),
          );
        return transactions.filter((t) => txnCode(t) === String(code));
      }
      if (isProcurement) {
        switch (code) {
          case draftKey:
          case finalizeKey:
          case priceSettingKey:
          case priceFinalizeKey:
          case procPriceApprovalKey:
          case forPurchaseKey:
            return transactions.filter((t) => {
              if (txnCode(t) !== code) return false;
              if ([priceSettingKey, forPurchaseKey].includes(code))
                return isProcurementTL || isMine(t);
              return isMine(t);
            });
          case finalizeVerificationKey:
          case priceFinalizeVerificationKey:
          case procPriceApprovedKey:
            return transactions.filter((t) => txnCode(t) === code);
          default:
            return [];
        }
      }
      if (isAOTL) {
        switch (code) {
          case forAssignmentKey:
            return transactions.filter((t) =>
              ["200", "210", "220", "225", "230", "240", "245"].includes(
                txnCode(t),
              ),
            );
          case itemsManagementKey:
          case itemsFinalizeKey:
          case forCanvasKey:
          case canvasFinalizeKey:
            return transactions.filter((t) => txnCode(t) === code && isMe(t));
          case itemsVerificationKey:
          case canvasVerificationKey:
          case forPurchaseKey:
            return transactions.filter((t) => txnCode(t) === code);
          default:
            return [];
        }
      }
      switch (code) {
        case itemsManagementKey:
        case itemsFinalizeKey:
        case forCanvasKey:
        case canvasFinalizeKey:
        case forPurchaseKey:
          return transactions.filter((t) => txnCode(t) === code && isMe(t));
        case itemsVerificationKey:
        case canvasVerificationKey:
          return transactions.filter((t) => txnCode(t) === code);
        default:
          return [];
      }
    };

    const red = {},
      orange = {};
    Object.keys(statusMap).forEach((code) => {
      const bucket = getBucket(code);
      red[code] = bucket.filter(
        (t) => getDueDateColor(getRelevantDate(t)) === "red",
      ).length;
      orange[code] = bucket.filter(
        (t) => getDueDateColor(getRelevantDate(t)) === "orange",
      ).length;
    });
    return { red, orange };
  }, [
    transactions,
    statusMap,
    isManagement,
    isFinanceOfficer,
    isProcurement,
    isProcurementTL,
    isAOTL,
    isMe,
    isMine,
    forAssignmentKey,
    itemsManagementKey,
    itemsFinalizeKey,
    itemsVerificationKey,
    forCanvasKey,
    canvasFinalizeKey,
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
  ]);

  if (mappingLoading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              paddingLeft: "12px",
              minHeight: "32px",
            }}
          >
            <div
              style={{
                width: "60%",
                height: "13px",
                borderRadius: "4px",
                background: colors.skeleton.skelLight,
              }}
            />
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {Object.entries(statusMap).map(([code, label]) => {
        const total = statusCounts[code] || 0;
        const red = dueCounts.red[code] || 0;
        const orange = dueCounts.orange[code] || 0;
        const normal = Math.max(total - red - orange, 0);
        return (
          <SidebarSubmenu
            key={code}
            label={label}
            active={isOnTransactionPage && selectedCode === String(code)}
            count={normal}
            redCount={red}
            orangeCount={orange}
            countLoading={countLoading}
            onClick={() => onSelect(String(code))}
          />
        );
      })}
    </>
  );
};

export default TransactionSubItems;
