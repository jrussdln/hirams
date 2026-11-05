import React, { useState, useEffect } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import TransacVerificationModalContent from "../../../../components/ui/content/TransacVerificationModalContent.jsx";
import TransactionItemAPI from "../../../../api/endpoints/transaction-item.api.js";
import PricingSetAPI from "../../../../api/endpoints/pricing-set.api.js";
import PurchaseOptionAPI from "../../../../api/endpoints/purchase-option.api.js";
import UserAPI from "../../../../api/endpoints/user.api.js";
import CompanyAPI from "../../../../api/endpoints/company.api.js";
import SupplierAPI from "../../../../api/endpoints/supplier.api.js";
import SupplierContactAPI from "../../../../api/endpoints/supplier-contact.api.js";
import SupplierBankAPI from "../../../../api/endpoints/supplier-bank.api.js";
import ClientAPI from "../../../../api/endpoints/client.api.js";
import TransactionAPI from "../../../../api/endpoints/transaction.api.js";
import DirectCostOptionAPI from "../../../../api/endpoints/direct-cost-option.api.js";
import JournalAccountAPI from "../../../../api/endpoints/journal-account.api.js";
import JevAPI from "../../../../api/endpoints/jev.api.js";
import { withSpinner, showSwal } from "../../../../utils/helpers/swal.jsx";
import uiMessages from "../../../../utils/helpers/uiMessages.js";

function DeleteVerificationModal({ open, onClose, entityToDelete, onSuccess }) {
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    if (open) {
      setVerificationInput("");
      setVerificationError("");
    }
  }, [open]);

  if (!open || !entityToDelete) return null;

  const { type, data } = entityToDelete;

  const entityName = String(
    (type === "item"
      ? data?.name
      : type === "pricing-set"
        ? data?.name
        : type === "user"
          ? data?.name
          : type === "company"
            ? data?.nickname
            : type === "client"
              ? data?.nickname || data?.name
              : type === "transaction"
                ? data?.code
                : type === "option"
                  ? data?.supplierNickName || data?.supplierName
                  : type === "direct-cost"
                    ? data?.name
                    : type === "journal-account"
                      ? data?.name
                      : type === "jev"
                        ? data?.name
                        : type === "supplier-contact"
                          ? data?.strName || data?.name
                          : type === "supplier-bank"
                            ? data?.strBankName || data?.name
                            : data?.supplierName || data?.strSupplierName) ?? "",
  ).trim();
  const handleConfirm = async () => {
    if (!entityName) return;

    // Validate user input: first character must match entity name
    if (
      verificationInput.trim().toLowerCase() !== entityName[0].toLowerCase()
    ) {
      setVerificationError(uiMessages.common.errorReqChar);
      return;
    }

    try {
      setVerificationInput("");
      setVerificationError("");
      onClose();

      await withSpinner(entityName, async () => {
        if (type === "item") {
          await TransactionItemAPI.delete(data.id);
        } else if (type === "pricing-set") {
          await PricingSetAPI.delete(data.id);
        } else if (type === "option") {
          await PurchaseOptionAPI.delete(data.id);
        } else if (type === "user") {
          await UserAPI.deleteUser(data.id);
        } else if (type === "company") {
          await CompanyAPI.deleteCompany(data.id);
        } else if (type === "supplier") {
          await SupplierAPI.delete(data.id);
        } else if (type === "supplier-contact") {
          await SupplierContactAPI.deleteContact(data.id);
        } else if (type === "supplier-bank") {
          await SupplierBankAPI.deleteBank(data.id);
        } else if (type === "client") {
          await ClientAPI.deleteClient(data.id);
        } else if (type === "transaction") {
          await TransactionAPI.deleteTransaction(data.id);
        } else if (type === "direct-cost") {
          await DirectCostOptionAPI.deleteDirectCostOption(data.id);
        } else if (type === "journal-account") {
          await JournalAccountAPI.delete(data.id);
        } else if (type === "jev") {
          // Drops the JEV and its entries server-side (JevController@destroy)
          await JevAPI.delete(data.id);
        }

        await onSuccess();
      });

      await showSwal("SUCCESS", {}, { entity: entityName, action: "deleted" });
    } catch (err) {
      const serverMessage = err?.message;
      const isConflict =
        serverMessage &&
        !serverMessage.toLowerCase().includes("something went wrong");

      if (isConflict) {
        await showSwal("ERROR", { text: serverMessage });
      } else {
        await showSwal("ERROR", {}, { entity: entityName });
      }
    }
  };

  const handleClose = () => {
    setVerificationInput("");
    setVerificationError("");
    onClose();
  };

  return (
    <ModalContainer
      open={open}
      handleClose={handleClose}
      title="Delete Confirmation"
      subTitle={entityName ? `${entityName}` : ""}
      onSave={handleConfirm}
      saveLabel="Confirm"
    >
      <TransacVerificationModalContent
        entityName={entityName}
        verificationInput={verificationInput}
        setVerificationInput={setVerificationInput}
        verificationError={verificationError}
        onBack={handleClose}
        onConfirm={handleConfirm}
        actionWord="Delete"
        confirmButtonColor="error"
      />
    </ModalContainer>
  );
}

export default DeleteVerificationModal;
