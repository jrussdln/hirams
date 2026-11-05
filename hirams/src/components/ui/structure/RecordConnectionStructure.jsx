import React from "react";
import {
  Box,
  Checkbox,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { SearchOutlined } from "@mui/icons-material";

/**
 * RecordConnectionStructure — shared UI pattern for record selection modals.
 *
 * Renders:
 * 1. Loading state
 * 2. Empty state (no records)
 * 3. Search header with select-all checkbox
 * 4. Filtered records list with checkbox + number + details
 * 5. Empty search results state
 * 6. Destination picker footer
 *
 * Props:
 *   loading: boolean — shows loading spinner
 *   records: array — list of records to display
 *   filteredRecords: array — filtered records after search
 *   searchValue: string — current search value
 *   onSearchChange: (value: string) => void
 *   allSelected: boolean — select-all checkbox state
 *   onToggleAll: () => void — select-all handler
 *   selectedIds: array — selected record IDs
 *   onToggleRow: (id: any) => void — toggle row selection
 *   colors: object — theme colors
 *   emptyMessage: string — message when no records
 *   emptySearchMessage: (query: string) => string — message when no search results
 *   searchPlaceholder: string — search field placeholder
 *   rowRender: (record, idx, checked, statusLabel, archived) => React.Node — custom row render
 *   rowId: (record) => any — function to extract record ID
 *   rowStatus: (record) => string — function to extract status label
 *   rowIsArchived: (record) => boolean — function to check if record is archived
 *   rowTitle: (record) => string — function to extract row title/tooltip
 *   destinationPicker: React.Node — destination picker component (footer)
 */
function RecordConnectionStructure({
  loading,
  records,
  filteredRecords,
  searchValue,
  onSearchChange,
  allSelected,
  onToggleAll,
  selectedIds,
  onToggleRow,
  colors,
  emptyMessage = "No records",
  emptySearchMessage = (q) => `No record matches "${q}"`,
  searchPlaceholder = "Search record…",
  rowRender,
  rowId,
  rowStatus,
  rowIsArchived,
  rowTitle,
  destinationPicker,
}) {
  if (loading) {
    return (
      <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (records.length === 0) {
    return (
      <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
        <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Search Header with Select-All Checkbox */}
      <Box
        sx={{
          bgcolor: colors.headerBg,
          pl: 0.5,
          pr: "19px",
          py: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Checkbox
          checked={allSelected}
          indeterminate={selectedIds.length > 0 && !allSelected}
          onChange={onToggleAll}
          tabIndex={-1}
          disableRipple
          size="small"
          sx={{
            flexShrink: 0,
            p: "9px 9px 9px 15px",
          }}
        />
        <TextField
          size="small"
          fullWidth
          hiddenLabel
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{
            flex: 1,
            minWidth: 0,
            "& .MuiOutlinedInput-root": {
              backgroundColor: colors.inputBg,
              fontSize: "0.72rem",
              "& fieldset": { borderColor: colors.border },
            },
            "& .MuiOutlinedInput-input": {
              py: 0.5,
            },
            "& .MuiInputAdornment-root svg": {
              fontSize: "0.9rem",
              color: colors.textMuted,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Empty Search Results */}
      {filteredRecords.length === 0 && (
        <Box sx={{ py: 3, px: 2, textAlign: "center" }}>
          <Typography sx={{ fontSize: "0.72rem", color: colors.textMuted }}>
            {emptySearchMessage(searchValue.trim())}
          </Typography>
        </Box>
      )}

      {/* Records List */}
      <Box
        sx={{
          maxHeight: { xs: 200, sm: 260 },
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <List dense disablePadding>
          {filteredRecords.map((record, idx) => {
            const id = rowId(record);
            const checked = selectedIds.includes(id);
            const statusLabel = rowStatus(record);
            const archived = rowIsArchived(record);

            return (
              <React.Fragment key={id}>
                <ListItem disablePadding>
                  <ListItemButton
                    disableRipple={false}
                    title={rowTitle ? rowTitle(record) : undefined}
                    sx={{
                      pl: 1.25,
                      pr: 1.25,
                      py: 0.4,
                      "&.Mui-selected": { bgcolor: colors.blueBg },
                      "&:hover": { bgcolor: colors.hoverBg },
                    }}
                    onClick={() => onToggleRow(id)}
                    selected={checked}
                  >
                    {/* Checkbox */}
                    <ListItemIcon
                      sx={{
                        minWidth: 34,
                        mr: 0,
                        ml: 0,
                      }}
                    >
                      <Checkbox
                        checked={checked}
                        disableRipple
                        size="small"
                        sx={{ p: "9px" }}
                      />
                    </ListItemIcon>

                    {/* Numbering */}
                    <Typography
                      component="span"
                      sx={{
                        width: 22,
                        flexShrink: 0,
                        textAlign: "right",
                        mr: 1,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: colors.textMuted,
                        lineHeight: 1,
                      }}
                    >
                      {idx + 1}.
                    </Typography>

                    {/* Custom Row Content */}
                    {rowRender(record, idx, checked, statusLabel, archived)}
                  </ListItemButton>
                </ListItem>
                {idx < filteredRecords.length - 1 && (
                  <Divider sx={{ borderColor: colors.border }} />
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* Destination Picker Footer */}
      {destinationPicker}
    </>
  );
}

export default RecordConnectionStructure;
