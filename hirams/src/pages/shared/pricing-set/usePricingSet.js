import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TransactionAPI from "../../../api/endpoints/transaction.api.js";
import { subscribeDynamicChannel } from "../../../realtime/dynamicChannel.js";

export default function usePricingSet() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const {
    selectedStatusCode,
    isManagement,
    isProcurementTL,
    transacstatus,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    isPricingSetting,
    currentStatusLabel,
    currentUserId,
    itemType,
    procMode,
    procSource,
    proc_status,
    statusTransaction,
    transactionId,
  } = state || {};

  const transactionFromState = state?.transaction;
  const clientNickName =
    state?.clientNickName || transactionFromState?.clientName;
  const priceSettingKey =
    state?.priceSettingKey || (isManagement ? forPricingKey : "");
  const priceFinalizeVerificationKey =
    state?.priceFinalizeVerificationKey ?? "";

  const [transaction, setTransaction] = useState(transactionFromState ?? null);
  const [loading, setLoading] = useState(false);
  const [statusChangedAlert, setStatusChangedAlert] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [footerActions, setFooterActions] = useState(null);
  const countdownRef = useRef(null);
  const localActionRef = useRef(false);

  const statusCode = String(
    selectedStatusCode ??
      transaction?.status_code ??
      transaction?.latest_history?.nStatus ??
      "",
  );

  const refetchTransaction = useCallback(async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      const res = await TransactionAPI.getProcurementById(transactionId);
      setTransaction(res.transaction ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  // Fetch transaction if missing
  useEffect(() => {
    const fetchTransaction = async () => {
      if (!transactionFromState && transactionId) {
        setLoading(true);
        try {
          const res = await TransactionAPI.getProcurementById(transactionId);
          setTransaction(res.transaction ?? null);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchTransaction();
  }, [transactionFromState, transactionId]);

  // ── Real-time: transaction status changes ──
  // Uses the centralized static "transactions" channel (subscribed globally
  // in RealtimeProvider via transactionsChannel.js), which dispatches
  // "txn_data_updated" on window. We just filter for this transaction here.
  useEffect(() => {
    if (!transaction?.nTransactionId) return;

    const handleTxnUpdated = (e) => {
      if (localActionRef.current) return;
      if (
        String(e.detail?.transactionId) !== String(transaction.nTransactionId)
      )
        return;

      const action = e.detail?.action;
      const statusChangingActions = [
        "status_changed",
        "assigned",
        "reverted",
        "verified",
        "finalized",
      ];
      if (!statusChangingActions.includes(action)) return;

      setStatusChangedAlert(true);
    };

    window.addEventListener("txn_data_updated", handleTxnUpdated);
    return () =>
      window.removeEventListener("txn_data_updated", handleTxnUpdated);
  }, [transaction?.nTransactionId, statusCode]);

  // ── Real-time: pricing set updates for this transaction (dynamic channel) ──
  useEffect(() => {
    const txnId = transaction?.nTransactionId;
    if (!txnId) return;

    const unsubscribe = subscribeDynamicChannel(
      `transaction.${txnId}.pricing-sets`,
      [
        { event: ".pricing-set.updated", dispatch: "pricing_set_updated" },
        { event: ".item-pricing.updated", dispatch: "item_pricing_updated" },
      ],
    );

    const handlePricingUpdate = () => refetchTransaction();
    window.addEventListener("pricing_set_updated", handlePricingUpdate);
    window.addEventListener("item_pricing_updated", handlePricingUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("pricing_set_updated", handlePricingUpdate);
      window.removeEventListener("item_pricing_updated", handlePricingUpdate);
    };
  }, [transaction?.nTransactionId, refetchTransaction]);

  // Countdown redirect - triggers 5-second auto-exit when status changes via realtime
  // (e.g., another user changes the transaction status). Does NOT fire when user
  // performs local actions - those are handled by the immediate redirect below.
  useEffect(() => {
    if (!statusChangedAlert) return;
    setCountdown(5);
    let current = 5;
    countdownRef.current = setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        clearInterval(countdownRef.current);
        navigate(-1);
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [statusChangedAlert, navigate]);

  // Call BEFORE the API request so an early realtime echo is ignored
  const beginLocalAction = useCallback(() => {
    localActionRef.current = true;
  }, []);

  // Call if the API request fails so realtime alerts work again
  const cancelLocalAction = useCallback(() => {
    localActionRef.current = false;
  }, []);

  // Call AFTER the action succeeds, leaves the page immediately
  const handleStatusChanged = useCallback(
    (newStatusCode) => {
      localActionRef.current = true;

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setStatusChangedAlert(false);
      setCountdown(null);

      navigate(-1);
    },
    [navigate, isManagement],
  );
  return {
    navigate,
    transaction,
    loading,
    statusChangedAlert,
    countdown,
    footerActions,
    setFooterActions,
    selectedStatusCode: statusCode,
    isManagement,
    isProcurementTL,
    transacstatus,
    forPricingKey,
    priceVerificationKey,
    priceApprovalKey,
    isPricingSetting,
    currentStatusLabel,
    currentUserId,
    itemType,
    procMode,
    procSource,
    proc_status,
    statusTransaction,
    clientNickName,
    priceSettingKey,
    priceFinalizeVerificationKey,
    handleStatusChanged,
    beginLocalAction,
    cancelLocalAction,
    refetchTransaction,
  };
}
