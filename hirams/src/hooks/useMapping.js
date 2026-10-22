import { useState, useEffect } from "react";
import MappingAPI from "../api/endpoints/mapping.api";
import { loadMappings, saveMappings } from "../utils/storage/mappingCache";

const parseData = (data, setters) => {
  const {
    setUserTypes,
    setDefaultUserType,
    setSex,
    setStatuses,
    setRoles,
    setVAT,
    setEWT,
    setClientStatus,
    setTransactionStatus,
    setProcStatus,
    setProSource,
    seProcMode,
    setItemType,
    setStatusTransaction,
    setAoStatus,
    setAotlStatus,
    setVaGoSeValue,
    setArchiveStatus,
    setForPurchaseStatus,
    setCartStatus,
    setShippingMethod,
    setPaymentTerms,
    setVoucherStatus,
    setVoucherType,
    setInventoryStatus,
    setFinanceStatus,
    setJevTypes,
    setJevStatus,
    setItemPurchasingStatus,
    setItemPurchasingStatusFinance,
    setEwtBypassType,
    setUnitPriceStatus,

    setRemovedFromCartStatus,
  } = setters;

  setUserTypes(data.user_types || {});
  setDefaultUserType(data.default_user_type || {});
  setSex(data.sex || {});
  setStatuses(data.status_user || {});
  setRoles(data.role || {});
  setVAT(data.vat || {});
  setEWT(data.ewt || {});
  setClientStatus(data.status_client || {});
  setTransactionStatus(data.transaction_filter_content || {});
  setProcStatus(data.proc_status || {});
  setProSource(data.proc_source || {});
  seProcMode(data.proc_mode || {});
  setItemType(data.item_type || {});
  setStatusTransaction(data.status_transaction || {});
  setAoStatus(data.ao_status || {});
  setAotlStatus(data.aotl_status || {});
  setVaGoSeValue(data.vaGoSeValue || {});
  setArchiveStatus(data.archive_status || {});
  setForPurchaseStatus(data.for_purchase_status || {});
  setCartStatus(data.cart_status || {});
  setShippingMethod(data.shipping_method || {});
  setPaymentTerms(data.payment_terms || {});
  setVoucherStatus(data.voucher_status || {});
  setVoucherType(data.voucher_type || {});
  setInventoryStatus(data.inventory_status || {});
  setFinanceStatus(data.finance_status || {});
  setJevTypes(data.jev_types || {});
  setJevStatus(data.jev_status || {});
  setItemPurchasingStatus(data.item_purchasing_status || {});
  setItemPurchasingStatusFinance(data.item_purchasing_status_finance);
  // The EWT types (the per-line bypass of the default EWT formula).
  setEwtBypassType(data.ewt_bypass_type || {});
  // The purchase price status: A = Active (it counts), P = Pending,
  // C = Cancelled (it does not count).
  setUnitPriceStatus(data.unit_price_status || {});
  setRemovedFromCartStatus(data.removed_from_cart_status || {});
};

export default function useMapping() {
  const [userTypes, setUserTypes] = useState({});
  const [defaultUserType, setDefaultUserType] = useState({});
  const [sex, setSex] = useState({});
  const [statuses, setStatuses] = useState({});
  const [roles, setRoles] = useState({});
  const [vat, setVAT] = useState({});
  const [ewt, setEWT] = useState({});
  const [clientstatus, setClientStatus] = useState({});
  const [transacstatus, setTransactionStatus] = useState({});
  const [proc_status, setProcStatus] = useState({});
  const [procSource, setProSource] = useState({});
  const [procMode, seProcMode] = useState({});
  const [itemType, setItemType] = useState({});
  const [loading, setLoading] = useState(true);
  const [ao_status, setAoStatus] = useState({});
  const [aotl_status, setAotlStatus] = useState({});
  const [statusTransaction, setStatusTransaction] = useState({});
  const [vaGoSeValue, setVaGoSeValue] = useState({});
  const [archiveStatus, setArchiveStatus] = useState({});
  const [forPurchaseStatus, setForPurchaseStatus] = useState({});
  const [cartStatus, setCartStatus] = useState({});
  const [shippingMethod, setShippingMethod] = useState({});
  const [paymentTerms, setPaymentTerms] = useState({});
  const [voucherStatus, setVoucherStatus] = useState({});
  const [voucherType, setVoucherType] = useState({});
  const [inventoryStatus, setInventoryStatus] = useState({});
  const [financestatus, setFinanceStatus] = useState({});
  const [jev_types, setJevTypes] = useState({});
  const [jev_status, setJevStatus] = useState({});
  const [itemPurchasingStatus, setItemPurchasingStatus] = useState({});
  const [itemPurchasingStatusFinance, setItemPurchasingStatusFinance] = useState({});
  // The EWT types: A = 0% of Q, B = 1% of Q, C = 1% of Q / 1.12 (VAT net)
  const [ewtBypassType, setEwtBypassType] = useState({});

  // The purchase price status — A = Active (the price counts),
  // P = Pending (proposed, does not count yet), C = Cancelled.
  const [unitPriceStatus, setUnitPriceStatus] = useState({});

  const [removedFromCartStatus, setRemovedFromCartStatus] = useState({});

  const setters = {
    setUserTypes,
    setDefaultUserType,
    setSex,
    setStatuses,
    setRoles,
    setVAT,
    setEWT,
    setClientStatus,
    setTransactionStatus,
    setProcStatus,
    setProSource,
    seProcMode,
    setItemType,
    setStatusTransaction,
    setAoStatus,
    setAotlStatus,
    setVaGoSeValue,
    setArchiveStatus,
    setForPurchaseStatus,
    setCartStatus,
    setShippingMethod,
    setPaymentTerms,
    setVoucherStatus,
    setVoucherType,
    setInventoryStatus,
    setFinanceStatus,
    setJevTypes,
    setJevStatus,
    setItemPurchasingStatus,
    setItemPurchasingStatusFinance,
    setEwtBypassType,
    setUnitPriceStatus,

    setRemovedFromCartStatus,
  };

  const fetchMappings = async () => {
    // ── 1. Try cache first ─────────────────────────────
    const cached = loadMappings();
    if (cached) {
      parseData(cached, setters);
      setLoading(false);
      return; // ← skip API call entirely
    }

    // ── 2. Cache miss — fetch from API ─────────────────
    try {
      const data = await MappingAPI.getMappings();
      parseData(data, setters);
      saveMappings(data); // ← save for next time
    } catch (error) {
      console.error("Error fetching mappings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
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
    archiveStatus,
    forPurchaseStatus,
    cartStatus,
    paymentTerms,
    shippingMethod,
    voucherStatus,
    voucherType,
    inventoryStatus,
    financestatus,
    jev_types,
    jev_status,
    itemPurchasingStatus,
    itemPurchasingStatusFinance,
    ewtBypassType,
    unitPriceStatus,
    removedFromCartStatus,
  };
}