import React, { useEffect, useState } from "react";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import {
  FilterDateFields,
  quickRange,
} from "../../../../components/ui/form/FilterDate.jsx";

/**
 * Date filter shown BEFORE the account report opens.
 *
 * Clicking "Ledger" on a row in JournalAccountPanel opens this modal
 * first; its body is the very same content <FilterDate> uses — the
 * Today / Yesterday / This ▾ quick picks over an always-visible From / To
 * row. "Today" is pre-selected when nothing has been applied yet (or after
 * Back reset the window); the previously applied range wins when there is
 * one. Nothing is committed until "Apply", which hands the chosen range
 * back through onApply({ from, to, quick }) — the caller then opens
 * LedgerPanel with it. "Cancel" leaves the report closed.
 *
 *   <LedgerFilterModal
 *     open={filterOpen}
 *     value={dateRange}
 *     onClose={closeFilter}
 *     onApply={openReport}
 *   />
 */
function LedgerFilterModal({ open, onClose, value = null, onApply }) {
  const [draft, setDraft] = useState(() => {
    const [from, to] = quickRange("month");
    return { from, to, quick: "month" };
  });

  useEffect(() => {
    if (!open) return;
    if (value?.from || value?.to) {
      setDraft({
        from: value.from || "",
        to: value.to || "",
        quick: value.quick ?? null,
      });
    } else {
      const [from, to] = quickRange("month");
      setDraft({ from, to, quick: "month" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const patchDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const handleApply = () => {
    onApply?.({
      from: draft.from || null,
      to: draft.to || null,
      quick: draft.quick,
    });
  };

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Ledger Filter"
      subTitle="Choose the date range"
      onSave={handleApply}
      saveLabel="Apply"
      cancelLabel="Cancel"
      width={440}
    >
      <FilterDateFields
        from={draft.from}
        to={draft.to}
        quick={draft.quick}
        onPatch={patchDraft}
      />
    </ModalContainer>
  );
}

export default LedgerFilterModal;
