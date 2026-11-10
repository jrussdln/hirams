import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SidebarItem from "../../sidebar/SidebarItem";
import StatusSubItems from "../StatusSubItems";
import useKeysLabels from "../../../../../../../hooks/useKeysLabels.js";
import SupplierAPI from "../../../../../../../api/endpoints/supplier.api.js";
import { getItem, setItem } from "../../../../../../../utils/storage/localStorage";

const SESSION_KEY = "selectedclientstatusCode";

const SupplierNavSection = ({ collapsed, forceExpanded, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Fixed: use clientstatus, NOT clientstatus
  const { clientstatus, loading: mappingLoading } = useKeysLabels();

  const safeclientstatus = clientstatus || {};
  const entries = Object.entries(safeclientstatus);
  const firstCode = entries[0]?.[0] ?? "";

  const [selectedCode, setSelectedCode] = useState(() => {
    const saved = getItem(SESSION_KEY, null);
    return saved || firstCode;
  });
  const [suppliers, setSuppliers] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  const isOnPage = location.pathname === "/supplier" || location.pathname === "/supplier-contact" || location.pathname === "/supplier-bank";

  // ── Sync status from localStorage ──
  useEffect(() => {
    const saved = getItem(SESSION_KEY, null);
    if (saved) setSelectedCode(saved);
  }, [location.key]);

  // ── Sync status changes ──
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      if (!code) return;
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
    };
    window.addEventListener("supplier_status_changed", handler);
    return () => window.removeEventListener("supplier_status_changed", handler);
  }, []);

  // ── Fetch suppliers ──
  const fetchSuppliers = useCallback(async (silent = false) => {
    if (mappingLoading) return;
    if (!silent) setCountLoading(true);
    try {
      const res = await SupplierAPI.getSuppliers();
      setSuppliers(res.suppliers || []);
    } catch (err) {
      console.error("Sidebar supplier fetch error:", err);
    } finally {
      if (!silent) setCountLoading(false);
    }
  }, [mappingLoading]);

  const fetchRef = useRef(fetchSuppliers);
  useEffect(() => {
    fetchRef.current = fetchSuppliers;
  }, [fetchSuppliers]);

  useEffect(() => {
    if (!mappingLoading) fetchSuppliers(false);
  }, [mappingLoading, fetchSuppliers]);

  // ── Realtime updates ──
  useEffect(() => {
    const handler = (e) => {
      if (e.type === "supplier_data_deleted") {
        setSuppliers((prev) =>
          prev.filter((s) => s.nSupplierId !== e.detail?.supplierId),
        );
      } else {
        fetchRef.current(true);
      }
    };
    window.addEventListener("supplier_data_updated", handler);
    window.addEventListener("supplier_data_deleted", handler);
    return () => {
      window.removeEventListener("supplier_data_updated", handler);
      window.removeEventListener("supplier_data_deleted", handler);
    };
  }, []);

  // ── Handle status click ──
  const handleSelect = useCallback(
    (code) => {
      setItem(SESSION_KEY, code);
      setSelectedCode(code);
      navigate("/supplier");
      onItemClick?.();
      window.dispatchEvent(
        new CustomEvent("supplier_status_changed", { detail: { code } }),
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
        icon={<LocalShippingIcon fontSize="small" />}
        label="Suppliers"
        autoOpen={isOnPage}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        onParentClick={entries.length ? handleParentClick : undefined}
      >
        {entries.length > 0 ? (
          <StatusSubItems
            statusMap={safeclientstatus}
            items={suppliers.map((s) => ({ statusCode: s.cStatus }))}
            selectedCode={selectedCode}
            onSelect={handleSelect}
            isOnPage={isOnPage}
            countLoading={countLoading}
          />
        ) : (
          <div className="px-3 py-1 text-xs text-gray-500 italic">
            No supplier statuses found
          </div>
        )}
      </SidebarItem>
    </div>
  );
};

export default SupplierNavSection;