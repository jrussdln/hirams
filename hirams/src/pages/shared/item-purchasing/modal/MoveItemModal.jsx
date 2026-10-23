import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  DriveFileMoveOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import PurchaseOrderAPI from "../../../../api/endpoints/purchase-order.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { fmtPHP } from "../../../../utils/formatters/formatter.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

/**
 * MoveItemModal — the transfer instead of remove on the item-purchasing
 * cards. Next to the ✕ that pulls a line out of its purchase order, the
 * move icon opens this list: the OTHER cart-stage orders — Cart, For
 * Approval or For Payment — that share the SAME transaction · company ·
 * supplier · Account Officer, i.e. the only orders an item may move into.
 *
 * The server keeps the candidate list (a purchase order carries no
 * supplier/transaction of its own — the filters run across its lines), so
 * the modal only fetches it, picks a destination and hands the pair over
 * to `onMove`:
 *
 *   <MoveItemModal
 *     open={moveOpen}
 *     handleClose={handleCloseMoveModal}
 *     sourcePoNumber={po.strPurchaseOrderNo}
 *     itemId={movingItemId}
 *     onMove={handleMoveItem}   // from the parent — sends the request
 *   />
 *
 * `onMove` receives (itemId, targetId) and runs behind the spinner + the
 * success swal; a refusal from the API is shown with its own message.
 */
const listColors = (c) => ({
  border: c.slate.border,
  headerBg: c.slate.itemHeaderBg ?? c.slate.mutedBg,
  hoverBg: c.slate.hover,
  mutedBg: c.slate.mutedBg,
  blueText: c.blue.text,
  blueBg: c.blue.bg,
  violetText: c.violet.text,
  indigoText: c.indigo.text,
  amberText: c.amber.text,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  inputBg: c.gray.inputBg,
});

// Status stamps — the same shorthand the cards use (CART_STATUS_STYLES),
// kept to their tinted text colours so the rows stay one background.
const STATUS_STAMP = {
  "110": { stamp: "CART", key: "blueText" },
  "120": { stamp: "P.O.", key: "indigoText" },
  "130": { stamp: "PEND", key: "amberText" },
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function MoveItemModal({
  open,
  handleClose,
  sourcePoNumber = "",
  itemId = null,
  currentUserId = null,
  // Management pages pass true; AO / AOTL surfaces pass their real flag —
  // the backend accepts management, the transaction's AO and the AOTL.
  isManagement = true,
  onMove,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => listColors(base), [base]);

  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // A fresh candidate list and a clean pick every time the modal opens —
  // the orders may have changed since the last visit.
  useEffect(() => {
    setTargetId(null);
    setSearch("");
    if (!open || itemId == null) {
      setTargets([]);
      return;
    }

    let cancelled = false;

    setLoadingTargets(true);
    PurchaseOrderAPI.getMoveTargets(itemId, {
      nUserId: currentUserId,
      isManagement,
    })
      .then((res) => {
        if (cancelled) return;
        setTargets(Array.isArray(res) ? res : (res?.targets ?? []));
      })
      .catch((err) => {
        console.error("Failed to load move targets:", err);
        if (!cancelled) setTargets([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTargets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, itemId, currentUserId, isManagement]);

  const filteredTargets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) =>
      String(t.strPurchaseOrderNo ?? "").toLowerCase().includes(q),
    );
  }, [targets, search]);

  const selected = useMemo(
    () =>
      targets.find((t) => String(t.nPurchaseOrderId) === String(targetId)) ??
      null,
    [targets, targetId],
  );

  const closeModal = () => {
    if (saving) return;
    handleClose?.();
  };

  const handleMove = async () => {
    if (!selected || saving) return;
    if (typeof onMove !== "function") {
      console.error("MoveItemModal: an `onMove` handler is required.");
      return;
    }

    setSaving(true);
    // Close the modal FIRST — the spinner and the swal play over the page,
    // not over a modal that is about to disappear.
    handleClose?.();

    try {
      await withSpinner(sourcePoNumber || "Purchase order", async () => {
        // The item id travels WITH the call, so closing the modal (and
        // dropping the pick) does not lose it.
        await onMove(itemId, selected.nPurchaseOrderId);
      });

      await showSwal("SUCCESS", {}, { entity: sourcePoNumber || "Purchase item", action: "moved" });
    } catch (err) {
      const serverMessage = err?.response?.data?.message ?? err?.message;
      if (
        serverMessage &&
        !serverMessage.toLowerCase().includes("something went wrong")
      ) {
        await showSwal("ERROR", { text: serverMessage }, { entity: sourcePoNumber || "Purchase item", action: "move" });
      } else {
        await showSwal("ERROR", {}, { entity: sourcePoNumber || "Purchase item", action: "move" });
      }
    } finally {
      setSaving(false);
    }
  };

  // NOTE: all hooks above this line — the early return must come after them.
  if (!open || itemId == null) return null;

  return (
    <ModalContainer
      open={open}
      handleClose={closeModal}
      title="Move Purchase Item"
      subTitle={sourcePoNumber || undefined}
      onSave={handleMove}
      saveLabel="Move Item"
      cancelLabel="Cancel"
      onCancel={closeModal}
      loading={saving}
      disabled={!selected}
      width={{ xs: "95%", sm: 560, md: 720 }}
      contentPadding={{ xs: 1.5, sm: 2 }}
    >
      <Box sx={{ mt: 0.5 }}>
        {/* ── The item being moved ───────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 1.25,
            py: 1,
            borderRadius: "10px",
            background: colors.blueBg,
            border: `1px solid ${colors.border}`,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "7px",
              background: colors.mutedBg,
              border: `1px solid ${colors.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: colors.blueText,
            }}
          >
            <DriveFileMoveOutlined sx={{ fontSize: "1rem" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: colors.textMuted,
              }}
            >
              Moving from
            </Typography>
            <Typography
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {sourcePoNumber || "—"}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.64rem",
                color: colors.textSecondary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Same transaction · company · supplier · Account Officer
            </Typography>
          </Box>
        </Box>

        {/* ── Search — only payroll-sized lists get it ─────────────── */}
        {targets.length > 8 && (
          <TextField
            fullWidth
            size="small"
            placeholder="Search purchase order…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* ── The receiving orders ────────────────────────────────── */}
        <Box
          sx={{
            border: `1px solid ${colors.border}`,
            borderRadius: "10px",
            overflow: "hidden",
            mt: 2,
          }}
        >
          {loadingTargets ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={22} />
            </Box>
          ) : targets.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                No other cart-stage order carries this transaction and
                supplier — there is nowhere to move it.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                maxHeight: 300,
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <List dense disablePadding>
                {filteredTargets.map((t, idx) => {
                  const id = t.nPurchaseOrderId;
                  const checked = String(id) === String(targetId);
                  const stamp = STATUS_STAMP[String(t.nStatus)];

                  return (
                    <React.Fragment key={id}>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => setTargetId(id)}
                          selected={checked}
                          sx={{
                            pl: 2.25,
                            pr: 1.25,
                            py: 0.75,
                            "&.Mui-selected": { bgcolor: colors.blueBg },
                            "&:hover": { bgcolor: colors.hoverBg },
                          }}
                        >
                          <ListItemText
                            primary={t.strPurchaseOrderNo || "Purchase order"}
                            secondary={
                              <>
                                {plural(t.lineCount ?? 0, "line")} ·{" "}
                                {fmtPHP(Number(t.totalAmount ?? 0))}
                              </>
                            }
                            primaryTypographyProps={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: colors.textPrimary,
                            }}
                            secondaryTypographyProps={{
                              fontSize: "0.66rem",
                              color: colors.textMuted,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: "0.6rem",
                              fontWeight: 800,
                              letterSpacing: "0.05em",
                              color: stamp ? colors[stamp.key] : colors.textSecondary,
                              border: `0.5px solid ${colors.border}`,
                              borderRadius: "50px",
                              px: 0.9,
                              py: 0.3,
                              background: colors.mutedBg,
                              flexShrink: 0,
                              ml: 1,
                            }}
                          >
                            {stamp?.stamp ?? t.statusLabel ?? "—"}
                          </Typography>
                        </ListItemButton>
                      </ListItem>
                      {idx < filteredTargets.length - 1 && (
                        <Divider sx={{ borderColor: colors.border }} />
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredTargets.length === 0 && (
                  <ListItem disablePadding>
                    <ListItemButton disabled>
                      <ListItemText
                        primary={`No purchase order matches “${search.trim()}”`}
                        primaryTypographyProps={{
                          fontSize: "0.78rem",
                          color: colors.textMuted,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </Box>

        {targets.length > 0 && (
          <Typography
            sx={{
              fontSize: "0.64rem",
              color: colors.textMuted,
              mt: 0.75,
              lineHeight: 1.5,
            }}
          >
            Cart · For Approval · For Payment orders only. The line keeps its
            quantities and prices, and the order it leaves empties and
            disappears if this was its last line.
          </Typography>
        )}
      </Box>
    </ModalContainer>
  );
}

export default MoveItemModal;
