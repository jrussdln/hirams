import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SidebarItem from "../../sidebar/SidebarItem";
import TransactionSubItems from "../TransactionSubItems";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels";
import {
  getItem,
  setItem,
} from "../../../../../../../utils/storage/localStorage";

const TransactionNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Single source — everything from one hook
  const {
    transacstatus,
    proc_status,
    ao_status,
    aotl_status,
    financestatus,
    loading: mappingLoading,
    isManagement,
    isProcurement,
    isAOTL,
    isProcurementTL,
    isFinanceOfficer,
  } = useKeysLabels();

  const sessionKey = isManagement
    ? "selectedStatusCode"
    : isProcurement
      ? "selectedProcStatusCode"
      : isFinanceOfficer
        ? "selectedStatusCode"
        : "selectedAOStatusCode";

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

  const [selectedCode, setSelectedCode] = useState(
    () => getItem(sessionKey, null) || Object.keys(statusMap)[0] || "",
  );

  useEffect(() => {
    if (!mappingLoading && Object.keys(statusMap).length > 0 && !selectedCode)
      setSelectedCode(Object.keys(statusMap)[0]);
  }, [mappingLoading, statusMap, selectedCode]);

  useEffect(() => {
    const saved = getItem(sessionKey, null);
    if (saved) setSelectedCode(saved);
  }, [location.key, sessionKey]);

  // ✅ Deep-link / refresh sync — uses the ACTUAL status the transaction
  // page was opened with (passed via route `state`), not a static
  // path→code guess. Routes like /transaction-canvas and
  // /transaction-pricing-set are shared by many different statuses
  // (Items Management, Items Verification, For Canvas, Canvas
  // Verification, Draft, Finalize, etc.), so forcing a single fixed
  // code for a given pathname was overwriting the correct highlight
  // with the wrong one every time. `useTransaction.js`'s
  // `handleRowClick` already puts the true `selectedStatusCode` in
  // `location.state`, so read it from there instead.
  // Archived rows (opened from Look Up or the Archive page) belong to the
  // Archive sidebar — Transactions must not highlight anything for them.
  const isArchiveView = location.state?.isArchiveView === true;

  // Refresh / direct-URL open on the pricing preview — route state is wiped,
  // so the stage code is restored from the payload the preview was opened
  // with (parked in sessionStorage by ExportCanvasModal / CostBreakdownModal).
  function readPreviewPricingCode() {
    try {
      return (
        JSON.parse(
          sessionStorage.getItem("previewPricingState") || "null",
        )?.selectedStatusCode ?? null
      );
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (mappingLoading || isArchiveView) return;
    const stateCode = location.state?.selectedStatusCode;
    const restoredCode =
      !stateCode && location.pathname === "/preview-pricing"
        ? readPreviewPricingCode()
        : null;
    const code = stateCode ?? restoredCode;
    if (code && statusMap[code]) {
      setSelectedCode(code);
      setItem(sessionKey, code);
    }
  }, [
    location.pathname,
    location.state,
    mappingLoading,
    statusMap,
    sessionKey,
    isArchiveView,
  ]);

  useEffect(() => {
    const onStatusChanged = (e) => {
      const code = e.detail?.code;
      if (code) {
        setItem(sessionKey, code);
        setSelectedCode(code);
      }
    };
    window.addEventListener("txn_status_changed", onStatusChanged);
    return () =>
      window.removeEventListener("txn_status_changed", onStatusChanged);
  }, [sessionKey]);

  const handleSelect = useCallback(
    (code) => {
      setItem(sessionKey, code);
      setSelectedCode(code);
      navigate("/transaction");
      onItemClick?.();
    },
    [sessionKey, navigate, onItemClick],
  );

  const handleParentClick = useCallback(() => {
    const firstCode = Object.keys(statusMap)[0];
    if (firstCode) handleSelect(firstCode);
  }, [statusMap, handleSelect]);

  // Any of the transaction workspace pages — the SAME membership the
  // TransactionSubItems highlight uses (kept in sync by hand). Feeds the
  // section's route-driven auto-open: landing on any of these while the
  // section is collapsed pops it open.
  const autoOpen =
    !isArchiveView &&
    [
      "/transaction",
      "/transaction-canvas",
      "/transaction-pricing-set",
      "/transaction-pricing",
      "/transaction-for-purchase",
      "/transaction-for-collection",
      "/preview-pricing",
    ].includes(location.pathname);

  return (
    <div className="flex flex-col w-full ">
      <SidebarItem
        icon={<AccountBalanceIcon fontSize="small" />}
        label="Transactions"
        showSearch
        autoOpen={autoOpen}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={
          Object.keys(statusMap).length ? handleParentClick : undefined
        }
      >
        <TransactionSubItems
          onItemClick={onItemClick}
          selectedCode={isArchiveView ? "" : selectedCode}
          onSelect={handleSelect}
        />
      </SidebarItem>
    </div>
  );
};

export default TransactionNavSection;
