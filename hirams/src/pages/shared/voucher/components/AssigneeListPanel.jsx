import { useState, useMemo } from "react";
import { Box, Typography, IconButton, useTheme } from "@mui/material";
import {
  ReceiptLongOutlined,
  KeyboardArrowUp,
  KeyboardArrowDown,
  EditOutlined,
} from "@mui/icons-material";
import { fmtPHP } from "../../../../utils/formatters/formatter";
import getThemeColors from "../../../../utils/style/getThemeColors";
import AssigneeRowPanel from "./AssigneeRowPanel";
import PickableValue from "../../../../components/ui/form/AmountPick.jsx";
import AddItemButton from "./AddItemButton.jsx";
import { contactFallbacks } from "./contactFallbacks.js";

const useColors = (c) => ({
  border: c.slate.border,
  totalBg: c.slate.totalBg,
  totalBorder: c.slate.totalBorder,
  itemHeaderBg: c.slate.itemHeaderBg,
  divider: c.slate.divider,
  green: {
    bg: c.green.bg,
    text: c.green.text,
    border: c.green.border,
    hover: c.green.hover,
    active: c.green.active,
  },
  purple: { bg: c.purple.bg, border: c.purple.border, text: c.purple.text },
  blue: {
    bg: c.blue.bg,
    border: c.blue.border,
    text: c.blue.text,
    hover: c.blue.hover,
  },
  gray: {
    textPrimary: c.gray.textPrimary,
    textMuted: c.gray.textMuted,
    textSecondary: c.gray.textSecondary,
    label: c.gray.label,
  },
  orange: { text: c.orange.text },
});

export default function AssigneeListPanel({
  assigneeLinks = [],
  onEdit,
  onDelete,
  voucherActiveKey,
  voucher,
  onAddItem,
  // EDIT VOUCHER INFO — opens the create modal in edit mode over the
  // voucher's company / assignee / payment terms. Assignee-type vouchers
  // only: the caller gates it (undefined hides the button).
  onEditInfo,
  // The DV code becomes a LINK when this is set — it opens the voucher
  // itself (the JEV viewer hands it over, the same way the supplier's PO
  // card does).
  onVoucherClick,
  // The company behind the voucher — the caller may know it even when the
  // voucher's own company relation is not loaded.
  companyName: companyNameProp = "",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const [removingId, setRemovingId] = useState(null);
  // The triangle folds the particulars away, like the PO cards do.
  const [rowsOpen, setRowsOpen] = useState(true);

  const handleDelete = async (id) => {
    setRemovingId(id);
    try {
      await onDelete?.(id);
    } finally {
      setRemovingId(null);
    }
  };

  const grandTotal = assigneeLinks.reduce(
    (sum, a) => sum + Number(a.dAmount || 0) * Number(a.nQuantity || 1),
    0,
  );

  // Same gating pattern as CartCardPanel: the EWT column only shows when at
  // least one line carries it, so ordinary vouchers keep the plain table.
  const hasAnyEWT = assigneeLinks.some((a) => Number(a.dEWT) > 0);
  const ewtTotal = assigneeLinks.reduce(
    (sum, a) => sum + (Number(a.dEWT) || 0),
    0,
  );

  // The assignee behind the particulars — the same block the supplier's PO
  // card shows, only the assignee instead of the supplier.
  const firstLink = assigneeLinks[0];
  const assigneeName =
    firstLink?.assignee?.strAssigneeNickName ||
    firstLink?.assignee?.strAssigneeName ||
    "—";
  const assigneeAddress = firstLink?.assignee?.strAddress || "";
  const assigneeTIN = firstLink?.assignee?.strTIN || "";
  // The company behind the voucher — it rides on the same row as the
  // assignee's name.
  const companyName =
    companyNameProp ||
    voucher?.company?.strCompanyNickName ||
    voucher?.company?.strCompanyName ||
    firstLink?.company?.strCompanyNickName ||
    "";
  // The shared fallbacks fill in an address / TIN that is not on file.
  const contact = contactFallbacks(assigneeAddress, assigneeTIN);

  if (assigneeLinks.length === 0) {
    return (
      <Box
        sx={{
          mx: 1.5,
          mb: 1.5,
          borderRadius: "10px",
          border: `0.5px solid ${colors.border}`,
          px: 2,
          py: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: "0.65rem", color: colors.gray.textMuted }}>
          No assignee entries linked.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: "10px",
        border: `0.5px solid ${colors.border}`,
        overflow: "hidden",
      }}
    >
      {/* SECTION HEADER — the voucher's number and the assignee it pays,
          the same header the supplier's PO card carries. The triangle folds
          the particulars away. */}
      <Box
        onClick={() => setRowsOpen((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2,
          py: 1,
          background: colors.itemHeaderBg,
          borderBottom: `0.5px solid ${colors.divider}`,
          cursor: "pointer",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {voucher?.strNumber && (
            <Typography
              component={onVoucherClick ? "button" : "span"}
              onClick={
                onVoucherClick
                  ? (e) => {
                      // The header folds the rows — the link must not.
                      e.stopPropagation();
                      onVoucherClick();
                    }
                  : undefined
              }
              title={onVoucherClick ? "Open this voucher" : undefined}
              sx={{
                fontSize: { xs: "0.5rem", sm: "0.55rem", md: "0.58rem" },
                fontWeight: 700,
                // Blue when it opens the voucher — it is a link then.
                color: onVoucherClick
                  ? colors.blue.text
                  : colors.gray.textMuted,
                textTransform: "uppercase",
                lineHeight: 1,
                whiteSpace: "nowrap",
                // Block, exactly like the supplier card's DV code: an
                // inline-block button would sit in a line box and open a
                // gap under it, so the assignee would sit lower than the
                // supplier's name does there.
                display: "block",
                width: onVoucherClick ? "fit-content" : "auto",
                p: 0,
                border: "none",
                background: "transparent",
                fontFamily: "inherit",
                cursor: onVoucherClick ? "pointer" : "inherit",
                "&:hover": onVoucherClick
                  ? { textDecoration: "underline" }
                  : undefined,
              }}
            >
              {voucher.strNumber}
            </Typography>
          )}

          {/* The assignee with the company on the same row. */}
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: 0.6,
              minWidth: 0,
              mt: 0.15,
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                fontWeight: 700,
                color: colors.gray.textPrimary,
                textTransform: "uppercase",
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {assigneeName}
            </Typography>
            {companyName && (
              <Typography
                sx={{
                  fontSize: "0.48rem",
                  fontWeight: 500,
                  color: colors.gray.textMuted,
                  textTransform: "uppercase",
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {companyName}
              </Typography>
            )}
          </Box>

          {contact.combined ? (
            <Typography
              sx={{
                fontSize: "0.48rem",
                fontWeight: 500,
                textTransform: "uppercase",
                color: colors.gray.textMuted,
                lineHeight: 1.15,
                mt: 0.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {contact.combined}
            </Typography>
          ) : (
            <>
              <Typography
                sx={{
                  fontSize: "0.48rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  color: colors.gray.textMuted,
                  lineHeight: 1.15,
                  mt: 0.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {contact.address}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.48rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  color: colors.gray.textMuted,
                  lineHeight: 1.15,
                  mt: 0.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {contact.tin}
              </Typography>
            </>
          )}
        </Box>

        <AddItemButton onClick={onAddItem} c={colors} />

        {/* EDIT VOUCHER INFO — sits right beside Add, same round shape.
            Blue to read as "record settings" next to the green add. */}
        {onEditInfo && (
          <Box
            component="button"
            onClick={(e) => {
              // The header toggles on its own — the button must not double up.
              e.stopPropagation();
              onEditInfo();
            }}
            title="Edit Voucher Info"
            aria-label="Edit Voucher Info"
            sx={{
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              borderRadius: "50px",
              border: `0.5px solid ${colors.blue.border}`,
              background: colors.blue.bg,
              color: colors.blue.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0,
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
              "&:hover": {
                background: colors.blue.hover,
                borderColor: colors.blue.text,
              },
              "&:active": { background: colors.blue.hover },
            }}
          >
            <EditOutlined sx={{ fontSize: "0.7rem" }} />
          </Box>
        )}

        <IconButton
          size="small"
          onClick={(e) => {
            // The header toggles on its own — the button must not double up.
            e.stopPropagation();
            setRowsOpen((v) => !v);
          }}
          title={rowsOpen ? "Hide the particulars" : "Show the particulars"}
          sx={{
            width: { xs: 18, sm: 20 },
            height: { xs: 18, sm: 20 },
            color: colors.gray.textMuted,
            border: `0.5px solid ${colors.border}`,
            borderRadius: "50px",
            p: 0,
            flexShrink: 0,
          }}
        >
          {rowsOpen ? (
            <KeyboardArrowUp sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }} />
          ) : (
            <KeyboardArrowDown sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }} />
          )}
        </IconButton>
      </Box>

      {rowsOpen && (
        <Box sx={{ maxHeight: "25vh", overflowY: "auto", overflowX: "hidden" }}>
          {assigneeLinks.map((assignee, idx) => (
            <AssigneeRowPanel
              key={assignee.nVoucherAssigneeId ?? idx}
              assignee={assignee}
              idx={idx}
              totalCount={assigneeLinks.length}
              isRemoving={removingId === assignee.nVoucherAssigneeId}
              onEdit={onEdit}
              onDelete={
                onDelete
                  ? () => handleDelete(assignee.nVoucherAssigneeId)
                  : undefined
              }
              voucherActiveKey={voucherActiveKey}
              voucher={voucher}
              hasAnyEWT={hasAnyEWT}
            />
          ))}
        </Box>
      )}

      {/* Grand Total Footer — Sticky */}
      <Box
        sx={{
          px: 1.5,
          py: 0.875,
          display: "flex",
          alignItems: "center",
          background: colors.totalBg,
          borderTop: `1px solid ${colors.totalBorder}`,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "7px",
            background: colors.purple.bg,
            border: `0.5px solid ${colors.purple.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1,
            flexShrink: 0,
          }}
        >
          <ReceiptLongOutlined
            sx={{ fontSize: "0.85rem", color: colors.purple.text }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: "0.67rem",
              fontWeight: 700,
              color: colors.gray.label,
            }}
          >
            Grand Total
          </Typography>
          <Typography
            sx={{ fontSize: "0.54rem", color: colors.gray.textSecondary }}
          >
            {assigneeLinks.length}{" "}
            {assigneeLinks.length !== 1 ? "entries" : "entry"}
          </Typography>
        </Box>
        {/* Right-hand stack: gross, withheld EWT, then what is actually paid */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
          }}
        >
          <PickableValue
            value={grandTotal}
            sx={{
              fontSize: "0.78rem",
              fontWeight: 800,
              color: colors.orange.text,
              textAlign: "right",
            }}
          >
            {fmtPHP(grandTotal)}
          </PickableValue>
          <Typography
            sx={{
              fontSize: "0.57rem",
              fontWeight: 500,
              fontStyle: "italic",
              color: colors.gray.textSecondary,
              textAlign: "right",
              lineHeight: 1.1,
            }}
          >
            {hasAnyEWT ? (
              <>
                EWT:{" "}
                <PickableValue variant="inherit" value={ewtTotal}>
                  {fmtPHP(ewtTotal)}
                </PickableValue>
              </>
            ) : (
              "No EWT"
            )}
          </Typography>
          {/* NET mirrors the EWT line exactly so the two read as a pair */}
          <Typography
            sx={{
              fontSize: "0.57rem",
              fontWeight: 500,
              fontStyle: "italic",
              color: colors.gray.textSecondary,
              textAlign: "right",
              lineHeight: 1.1,
            }}
          >
            NET:{" "}
            <PickableValue variant="inherit" value={grandTotal - ewtTotal}>
              {fmtPHP(grandTotal - ewtTotal)}
            </PickableValue>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
