import { useEffect } from "react";
import { Box, TextField } from "@mui/material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";

// ── Add JEV — the No Type journal's creation dialog ─────────────────────
// Opened AFTER the "Create JEV?" confirmation dialog is answered: this modal
// is where the journal gets NAMED before the record exists — the Title field
// is focused on open, and Save creates the JEV with that title and hands it
// to /jev-update?id=….
//
// Standard ModalContainer chrome: an "Add JEV" header, the Title / Date
// fields in the content, and the default footer — Cancel and Save live on
// the modal's footer buttons, like every other modal in the app. Enter
// saves, Escape / backdrop / Cancel all close it. There is no loading state
// in here: the modal closes before the request and the global withSpinner
// overlay covers the create (see useJournalEntryVoucher.handleCreateJev).
export default function JEVAEModal({
  open,
  // Controlled field values.
  titleValue,
  dateValue,
  // Field changes handed up.
  onTitleChange,
  onDateChange,
  // Field errors, straight from the caller's validation.
  titleError = "",
  dateError = "",
  // Focuses the Title field when the modal opens.
  titleInputRef = null,
  onSave,
  onClose,
}) {
  // Focus the Title field as soon as the modal opens (the 50ms tick lets
  // it win over the dialog's own mount).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => titleInputRef?.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, titleInputRef]);

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Add JEV"
      subTitle="No Type"
      onSave={onSave}
      showSave={true}
      onCancel={onClose}
      showCancel={true}
      width={{ xs: "90%", sm: 440 }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 1,
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose?.();
        }}
      >
        <TextField
          label="Title"
          size="small"
          required
          value={titleValue}
          onChange={onTitleChange}
          error={!!titleError}
          helperText={titleError}
          inputProps={{ maxLength: 100 }}
          inputRef={titleInputRef}
          autoFocus
          sx={{ flex: "1 1 180px", minWidth: 140 }}
        />
        <TextField
          label="Date"
          type="date"
          size="small"
          required
          value={dateValue}
          onChange={onDateChange}
          error={!!dateError}
          helperText={dateError}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: "0 1 200px", minWidth: 180 }}
        />
      </Box>
    </ModalContainer>
  );
}
