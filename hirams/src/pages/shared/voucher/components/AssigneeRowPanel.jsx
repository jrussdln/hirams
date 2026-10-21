import { useMemo } from "react";
import { Box, Typography, IconButton, useTheme } from "@mui/material";
import {
  EditOutlined,
  DeleteOutlineOutlined,
} from "@mui/icons-material";
import { fmtPHP, fmtQty } from "../../../../utils/formatters/formatter";
import getThemeColors from "../../../../utils/style/getThemeColors";
import PickableValue from "../../jev/components/AmountPick.jsx";

const useColors = (c) => ({
  itemHeaderBg: c.slate.itemHeaderBg,
  divider: c.slate.divider,
  hover: c.slate.hover,
  outerBg: c.slate.outerBg,
  purple: { bg: c.purple.bg, border: c.purple.border, text: c.purple.text },
  textOnFill: c.gray.textOnFill,
  gray: {
    textPrimary: c.gray.textPrimary,
    textSecondary: c.gray.textSecondary,
    textMuted: c.gray.textMuted,
  },
  blue: { text: c.blue.text, bg: c.blue.bg, border: c.blue.border, hover: c.blue.hover },
  red: { text: c.red.text, bg: c.red.bg, border: c.red.border },
});

export default function AssigneeRowPanel({
  assignee,
  idx,
  totalCount,
  isRemoving,
  onEdit,
  onDelete,
  voucher,
  voucherActiveKey,
  hasAnyEWT = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const qty = Number(assignee.nQuantity || 1);
  const unitAmount = Number(assignee.dAmount || 0);
  const lineTotal = qty * unitAmount;
  const ewt = Number(assignee.dEWT || 0);

  // Fixed: `!String(x) === String(y)` always evaluates to false (negating a
  // string then comparing the boolean to a string), so this never matched.
  const isVoucherOpen = String(voucher?.cStatus) === String(voucherActiveKey);

  // The parent decides which actions a row gets: `onEdit` is also passed for
  // a CLOSED voucher (so the particulars can still be squared against the
  // not-yet-finalized JEV), while Delete stays active-only via isVoucherOpen.
  const showEdit = Boolean(onEdit);
  const showDelete = Boolean(isVoucherOpen && onDelete);

  return (
    <>
      {/* COLUMN HEADER */}
      {idx === 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            gap: 1,
            background: colors.itemHeaderBg,
            borderBottom: `0.5px solid ${colors.divider}`,
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <Box sx={{ width: 20, flexShrink: 0, textAlign: "center" }}>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
                letterSpacing: "0.03em",
              }}
            >
              #
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
                letterSpacing: "0.03em",
              }}
            >
              ITEMS
            </Typography>
          </Box>
          {/* EWT column only appears once a line actually carries EWT, so the
              table keeps its width for the common no-EWT case. Placed ahead of
              QTY to match PORowPanel's EWT → QTY → Unit Price → Total order. */}
          {hasAnyEWT && (
            <Box sx={{ width: 70, textAlign: "center", flexShrink: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  color: colors.gray.textSecondary,
                  letterSpacing: "0.03em",
                }}
              >
                EWT
              </Typography>
            </Box>
          )}
          <Box sx={{ width: 60, textAlign: "center", flexShrink: 0 }}>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
                letterSpacing: "0.03em",
              }}
            >
              QTY
            </Typography>
          </Box>
          <Box sx={{ width: 80, textAlign: "center", flexShrink: 0 }}>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
                letterSpacing: "0.03em",
              }}
            >
              UNIT PRICE
            </Typography>
          </Box>
          <Box sx={{ width: 80, textAlign: "center", flexShrink: 0 }}>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
                letterSpacing: "0.03em",
              }}
            >
              TOTAL
            </Typography>
          </Box>
          {(showEdit || showDelete) && (
            <Box sx={{ width: 48, flexShrink: 0, textAlign: "center" }}>
              <Typography
                sx={{
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  color: colors.gray.textSecondary,
                  letterSpacing: "0.03em",
                }}
              >
                ACTION
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* DATA ROW */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: 0.75, sm: 1 },
          justifyContent: { sm: "space-between" },
          borderBottom:
            idx < totalCount - 1 ? `0.5px solid ${colors.divider}` : "none",
          "&:hover": { background: colors.hover },
        }}
      >
        {/* LEFT: the numbering + the assignee block */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            flex: { sm: 1 },
            minWidth: 0,
          }}
        >
          {/* The numbering — its own narrow column, centred on the row
              (same as the Purchase Items table). */}
          <Box
            sx={{
              width: 20,
              flexShrink: 0,
              textAlign: "center",
              alignSelf: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
                lineHeight: 1,
              }}
            >
              {idx + 1}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* The particular — the line's own name. */}
            <Typography
              sx={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: colors.gray.textPrimary,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {assignee.strParticular ?? "—"}
            </Typography>
          </Box>

          {/* MOBILE: Action buttons inline */}
          {(showEdit || showDelete) && (
            <Box
              sx={{
                display: { xs: "flex", sm: "none" },
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 0.25,
                flexShrink: 0,
                ml: "auto",
              }}
            >
              {showEdit && (
                <IconButton
                  size="small"
                  onClick={() => onEdit(assignee)}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50px",
                    border: `0.5px solid ${colors.blue.border}`,
                    background: colors.blue.bg,
                    color: colors.blue.text,
                    opacity: 0.85,
                    p: 0,
                    "&:hover": { background: colors.blue.hover, opacity: 1 },
                  }}
                >
                  <EditOutlined sx={{ fontSize: "0.75rem" }} />
                </IconButton>
              )}
              {showDelete && (
                <IconButton
                  size="small"
                  disabled={isRemoving}
                  onClick={onDelete}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50px",
                    border: `0.5px solid ${colors.red.border}`,
                    background: colors.red.bg,
                    color: colors.red.text,
                    opacity: isRemoving ? 0.4 : 0.85,
                    p: 0,
                    "&:hover": { background: colors.red.bg, opacity: 1 },
                  }}
                >
                  {isRemoving ? (
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        border: `1.5px solid ${colors.red.text}`,
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                  ) : (
                    <DeleteOutlineOutlined sx={{ fontSize: "0.75rem" }} />
                  )}
                </IconButton>
              )}
            </Box>
          )}
        </Box>

        {/* EWT | QTY | UNIT PRICE | TOTAL */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "grid", sm: "row" },
            gridTemplateColumns: {
              xs: hasAnyEWT ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
            },
            gap: { xs: 0.5, sm: 0 },
            alignItems: { xs: "start", sm: "center" },
            justifyContent: { xs: "space-between", sm: "flex-end" },
            flexShrink: 0,
          }}
        >
          {hasAnyEWT && (
            <Box
              sx={{
                width: { sm: 70 },
                textAlign: { xs: "right", sm: "center" },
                flexShrink: 0,
              }}
            >
              <Typography
                sx={{
                  display: { xs: "block", sm: "none" },
                  fontSize: "0.45rem",
                  color: colors.gray.textSecondary,
                  mb: 0.1,
                }}
              >
                EWT
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  // Same neutral color as QTY / Unit Price / Total — the
                  // value is already flagged by the EWT column itself.
                  color: colors.gray.textSecondary,
                }}
              >
                <PickableValue variant="inherit" value={ewt}>
                  {fmtPHP(ewt)}
                </PickableValue>
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              width: { sm: 60 },
              textAlign: { xs: "right", sm: "center" },
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                display: { xs: "block", sm: "none" },
                fontSize: "0.45rem",
                color: colors.gray.textSecondary,
                mb: 0.1,
              }}
            >
              QTY
            </Typography>
            <Typography
              sx={{
                fontSize: "0.66rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
              }}
            >
              {fmtQty(qty)}{" "}
              <Typography
                component="span"
                sx={{ fontSize: "0.5rem", color: colors.gray.textSecondary }}
              >
                {assignee.strUOM}
              </Typography>
            </Typography>
          </Box>
          <Box sx={{ width: { sm: 80 }, textAlign: "right", flexShrink: 0 }}>
            <Typography
              sx={{
                display: { xs: "block", sm: "none" },
                fontSize: "0.45rem",
                color: colors.gray.textSecondary,
                mb: 0.1,
              }}
            >
              Unit Price
            </Typography>
            <Typography
              sx={{
                fontSize: "0.66rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
              }}
            >
              <PickableValue variant="inherit" value={unitAmount}>
                {fmtPHP(unitAmount)}
              </PickableValue>
            </Typography>
          </Box>
          <Box sx={{ width: { sm: 80 }, textAlign: "right", flexShrink: 0 }}>
            <Typography
              sx={{
                display: { xs: "block", sm: "none" },
                fontSize: "0.45rem",
                color: colors.gray.textSecondary,
                mb: 0.1,
              }}
            >
              Total
            </Typography>
            <Typography
              sx={{
                fontSize: "0.66rem",
                fontWeight: 700,
                color: colors.gray.textSecondary,
              }}
            >
              <PickableValue variant="inherit" value={lineTotal}>
                {fmtPHP(lineTotal)}
              </PickableValue>
            </Typography>
          </Box>
        </Box>

        {/* DESKTOP: Action buttons after Total */}
        {(showEdit || showDelete) && (
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              justifyContent: "center",
              alignItems: "center",
              gap: 0.25,
              width: 48,
              flexShrink: 0,
            }}
          >
            {showEdit && (
              <IconButton
                size="small"
                onClick={() => onEdit(assignee)}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: "50px",
                  border: `0.5px solid ${colors.blue.border}`,
                  background: colors.blue.bg,
                  color: colors.blue.text,
                  opacity: 0.85,
                  p: 0,
                  "&:hover": { background: colors.blue.hover, opacity: 1 },
                }}
              >
                <EditOutlined sx={{ fontSize: "0.75rem" }} />
              </IconButton>
            )}
            {showDelete && (
              <IconButton
                size="small"
                disabled={isRemoving}
                onClick={onDelete}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: "50px",
                  border: `0.5px solid ${colors.red.border}`,
                  background: colors.red.bg,
                  color: colors.red.text,
                  opacity: isRemoving ? 0.4 : 0.85,
                  p: 0,
                  "&:hover": { background: colors.red.bg, opacity: 1 },
                }}
              >
                {isRemoving ? (
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      border: `1.5px solid ${colors.red.text}`,
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                ) : (
                  <DeleteOutlineOutlined sx={{ fontSize: "0.75rem" }} />
                )}
              </IconButton>
            )}
          </Box>
        )}
      </Box>
    </>
  );
}
