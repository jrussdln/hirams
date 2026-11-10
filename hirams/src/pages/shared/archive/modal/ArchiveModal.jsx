import React, { useState } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import TransacRemarksModalContent from "../../../../components/ui/content/TransacRemarksModalContent.jsx";
import TransactionAPI from "../../../../api/endpoints/transaction.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { getItem } from "../../../../utils/storage/localStorage";
function ArchiveModal({
  open,
  onClose,
  transaction,
  transactionId,
  transactionCode,
  mode = "archive", // "archive" | "unarchive" | "complete"
  onSuccess,
  archiveStatus, // { [code]: label } — e.g. '101' => 'Archived', '102' => 'Lost', '103' => 'Transaction Completed'
}) {
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open || !transaction) return null;

  const isUnarchive = mode === "unarchive";
  const isComplete = mode === "complete";
  const entity = transaction.strCode || transactionCode || "Transaction";
  const transactionName = `${transaction.clientName || "—"} : ${
    transaction.strTitle || transaction.transactionName || "—"
  }`;

  // ── Mode-driven copy ──────────────────────────────────────────────
  const modalTitle = isComplete
    ? "Transaction Completed"
    : isUnarchive
      ? "Unarchive Transaction"
      : "Archive Transaction";
  const saveLabel = isComplete
    ? "Mark Completed"
    : isUnarchive
      ? "Unarchive"
      : "Archive";
  const saveButtonColor = isComplete
    ? "success"
    : isUnarchive
      ? "primary"
      : "warning";
  const actionWord = isComplete
    ? "completing"
    : isUnarchive
      ? "unarchiving"
      : "archiving";
  const successAction = isComplete
    ? "marked as collected and completed"
    : isUnarchive
      ? "unarchived"
      : "archived";
  const archiveAction = isComplete
    ? TransactionAPI.completeTransaction
    : isUnarchive
      ? TransactionAPI.unarchiveTransaction
      : TransactionAPI.archiveTransaction;

  const handleConfirm = async () => {
    setLoading(true);
    onClose();

    try {
      const userId = getItem("userId");
      if (!userId) throw new Error("User ID missing.");

      await withSpinner(entity, () =>
        archiveAction(transactionId, {
          user_id: userId,
          remarks: remarks.trim() || null,
        }),
      );
      // notifies the sidebar to refresh counts for the acting user
      window.dispatchEvent(new CustomEvent("txn_data_updated"));

      await showSwal("SUCCESS", {}, { entity, action: successAction });

      setRemarks("");
      setRemarksError("");

      if (typeof onSuccess === "function") onSuccess();
    } catch (err) {
      console.error(err);
      await showSwal("ERROR", {}, { entity: transactionName });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRemarks("");
    setRemarksError("");
    onClose();
  };

  return (
    <ModalContainer
      open={open}
      handleClose={handleClose}
      title={modalTitle}
      subTitle={transactionCode ? `${transactionCode}` : ""}
      onSave={handleConfirm}
      saveLabel={saveLabel}
      saveButtonColor={saveButtonColor}
      customLoading={loading}
      loading={loading}
      showSave
      showCancel
      cancelLabel="Cancel"
      onCancel={handleClose}
    >
      <TransacRemarksModalContent
        remarks={remarks}
        setRemarks={setRemarks}
        remarksError={remarksError}
        onBack={handleClose}
        onSave={handleConfirm}
        actionWord={actionWord}
        entityName={transactionName}
        saveButtonColor={saveButtonColor}
        saveButtonText={
          isComplete
            ? "Confirm Completion"
            : isUnarchive
              ? "Confirm Unarchive"
              : "Confirm Archive"
        }
      />
    </ModalContainer>
  );
}

export default ArchiveModal;
