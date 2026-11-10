import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SidebarItem from "../../sidebar/SidebarItem";
import SidebarSubmenu from "../../sidebar/SidebarSubmenu";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels.js";
import VoucherAPI from "../../../../../../../api/endpoints/voucher.api.js";
import { getItem, setItem } from "../../../../../../../utils/storage/localStorage";

const SESSION_KEY = "selectedVoucherStatusCode";

const VoucherNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Single source — everything from one hook
  const {
    voucherStatus,
    voucherType,
    loading: mappingLoading,
    isManagement,
    isFinanceOfficer,
    isAOTL,
  } = useKeysLabels();

  const safeVoucherStatus = voucherStatus || {};
  const safeVoucherType = voucherType || {};
  const entries = Object.entries(safeVoucherStatus);
  const voucherAssigneeTypeKey = Object.keys(safeVoucherType)[1] ?? "";
  const currentUserId = useMemo(() => getItem("user", {})?.nUserId ?? null, []);
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() => {
    return getItem(SESSION_KEY) || firstCode;
  });
  const [vouchers, setVouchers] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  const isOnPage =
    location.pathname === "/voucher" || location.pathname === "/voucher-update";

  // ── Sync status from localStorage ──
  useEffect(() => {
    const saved = getItem(SESSION_KEY);
    if (saved && saved !== selectedCode) setSelectedCode(saved);
    if (!saved && firstCode) {
      setItem(SESSION_KEY, firstCode);
      setSelectedCode(firstCode);
    }
  }, [location.key, firstCode, selectedCode]);

  // ── Deep-link sync — the ACTIVE status is the VOUCHER's status ──
  // /voucher-update is opened from many places (Item Purchasing's View
  // Voucher, the voucher list's View, JEV's DV code, the manage modal's
  // jump) and each hands the voucher's own status in route state. Without
  // this the highlight would stay on the user's LAST-CLICKED filter — a
  // completely different stage from the voucher on screen.
  useEffect(() => {
    if (mappingLoading) return;
    const stateCode = location.state?.voucherStatusCode;
    if (
      stateCode !== undefined &&
      stateCode !== null &&
      String(stateCode) !== "" &&
      safeVoucherStatus[stateCode]
    ) {
      setSelectedCode(String(stateCode));
      setItem(SESSION_KEY, String(stateCode));
    }
  }, [location.key, location.state, mappingLoading, safeVoucherStatus]);

  // ── Sync status changes ──
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code || code === selectedCode) return;
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
    };
    window.addEventListener("voucher_status_changed", handler);
    return () => window.removeEventListener("voucher_status_changed", handler);
  }, [selectedCode]);

  // ── Fetch vouchers ──
  const fetchVouchers = useCallback(
    async (silent = false) => {
      if (mappingLoading) return;
      if (!silent) setCountLoading(true);
      try {
        const res = await VoucherAPI.getVouchers();
        const list = Array.isArray(res)
          ? res
          : (res?.vouchers ?? res?.data ?? []);

        setVouchers(list);
      } catch (err) {
        console.error("Sidebar voucher fetch error:", err);
      } finally {
        if (!silent) setCountLoading(false);
      }
    },
    [mappingLoading],
  );

  const fetchRef = useRef(fetchVouchers);
  useEffect(() => {
    fetchRef.current = fetchVouchers;
  }, [fetchVouchers]);

  useEffect(() => {
    if (!mappingLoading) fetchVouchers(false);
  }, [mappingLoading, fetchVouchers]);

  // ── Realtime updates ──
  useEffect(() => {
    const onUpdated = () => fetchRef.current(true);
    const onDeleted = (e) => {
      const id = e.detail?.voucherId;
      if (id) setVouchers((prev) => prev.filter((v) => v.nVoucherId !== id));
      else fetchRef.current(true);
    };
    window.addEventListener("voucher_data_updated", onUpdated);
    window.addEventListener("voucher_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("voucher_data_updated", onUpdated);
      window.removeEventListener("voucher_data_deleted", onDeleted);
    };
  }, []);

  // ── Handle status click ──
  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/voucher");
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("voucher_status_changed", { detail: { code } }),
      );
    },
    [navigate, onItemClick],
  );

  const handleParentClick = useCallback(() => {
    if (firstCode) handleSelect(firstCode);
  }, [firstCode, handleSelect]);

  if (mappingLoading) return null;

  return (
    <div className="flex flex-col w-full ">
      <SidebarItem
        icon={<ReceiptLongIcon fontSize="small" />}
        label="Vouchers"
        autoOpen={isOnPage}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? (
          entries.map(([code, label]) => {
            const count = vouchers.filter((v) => {
              if (String(v.cStatus) !== String(code)) return false;
              if (isManagement || isFinanceOfficer) return true;
              if (String(v.nAssignedUserId) !== String(currentUserId))
                return false;
              if (isAOTL)
                return String(v.cType) !== String(voucherAssigneeTypeKey);
              return true;
            }).length;

            return (
              <SidebarSubmenu
                key={code}
                label={label}
                active={isOnPage && selectedCode === String(code)}
                count={count}
                countLoading={countLoading}
                onClick={() => handleSelect(String(code))}
              />
            );
          })
        ) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No voucher statuses found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default VoucherNavSection;
