import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Typography, IconButton, Divider, Skeleton } from "@mui/material";
import {
  Add,
  Link,
  LinkOff,
  ReceiptLong,
  LocalShipping,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer";
import VoucherAPI from "../../../../api/endpoints/voucher.api.js";
import VoucherSupplierAPI from "../../../../api/endpoints/voucher-supplier.api.js";
import { VOUCHER_CONFIRM_STYLES } from "../../../../utils/style/sharedConfirmStyles.jsx";
import ConfirmationStructure from "../../../../components/ui/structure/ConfirmationStructure.jsx";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

const VIEW = {
  MAIN: "MAIN",
  LINK_LIST: "LINK_LIST",
  LINKED: "LINKED",
  CONFIRM: "CONFIRM",
};
const CONFIRM_TYPE = {
  CREATE: "create_voucher",
  LINK: "link_voucher",
  UNLINK: "unlink_voucher",
};

const useColors = (c) => ({
  border: c.slate.border,
  cardBg: c.slate.outerBg,
  cardHoverBg: c.slate.hover,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  primaryBg: c.blue.bg,
  primaryHover: c.blue.hover,
  primaryText: c.blue.textStrong,
  secondaryBg: c.slate.btnBg,
  secondaryBorder: c.slate.btnBorder,
  secondaryText: c.slate.btnText,
  secondaryHover: c.slate.btnHoverBg,
  linkButtonColor: c.blue.text,
  linkButtonHoverBg: c.blue.bgSoft,
  dangerButtonBorder: c.red.border,
  dangerButtonBg: c.red.bg,
  dangerButtonColor: c.red.text,
  dangerButtonHoverBg: c.red.bg,
  dangerDisabledBorder: c.slate.mutedBorder,
  dangerDisabledColor: c.slate.mutedColor,
});

export default function ManagePOVoucherModal({
  open,
  onClose,
  po,
  supplierId,
  voucherActiveKey,
  isEditable,
  voucherSupplierTypeKey,
  onSuccess,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);
  const navigate = useNavigate();
  const [view, setView] = useState(VIEW.MAIN);
  const [vouchers, setVouchers] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [linkedVoucher, setLinkedVoucher] = useState(null);
  const [checking, setChecking] = useState(true);
  const [previousView, setPreviousView] = useState(null);
  const [confirmType, setConfirmType] = useState(null);
  const [pendingVoucher, setPendingVoucher] = useState(null);

  useEffect(() => {
    if (!open || !po) return;
    setChecking(true);
    setActionLoading(false);
    setListLoading(false);
    setVouchers([]);
    setConfirmType(null);
    setPendingVoucher(null);
    (async () => {
      try {
        const res = await VoucherAPI.getVouchers();
        const all = Array.isArray(res) ? res : res?.data || [];
        const found = all.find((v) =>
          (v.voucher_suppliers || []).some(
            (vs) =>
              vs.nPurchaseOrderId &&
              Number(vs.nPurchaseOrderId) === Number(po.nPurchaseOrderId),
          ),
        );
        if (found) {
          setLinkedVoucher(found);
          setView(VIEW.LINKED);
        } else {
          setLinkedVoucher(null);
          setView(VIEW.MAIN);
        }
      } catch {
        setLinkedVoucher(null);
        setView(VIEW.MAIN);
      } finally {
        setChecking(false);
      }
    })();
  }, [open, po]);

  const fetchOpenVouchers = useCallback(async () => {
    if (!supplierId) return;
    setListLoading(true);
    try {
      const res = await VoucherAPI.getVouchers();
      const all = Array.isArray(res) ? res : res?.data || [];
      setVouchers(
        all.filter(
          (v) =>
            String(v.cType) === String(voucherSupplierTypeKey) &&
            String(v.cStatus) === String(voucherActiveKey) &&
            v.supplier &&
            Number(v.supplier.nSupplierId) === Number(supplierId),
        ),
      );
    } catch {
      setVouchers([]);
    } finally {
      setListLoading(false);
    }
  }, [supplierId, voucherSupplierTypeKey, voucherActiveKey]);

  const refreshLinked = useCallback(async () => {
    if (!po) return null;
    try {
      const res = await VoucherAPI.getVouchers();
      const all = Array.isArray(res) ? res : res?.data || [];
      return (
        all.find((v) =>
          (v.voucher_suppliers || []).some(
            (vs) => Number(vs.nPurchaseOrderId) === Number(po.nPurchaseOrderId),
          ),
        ) || null
      );
    } catch {
      return null;
    }
  }, [po]);

  const openConfirm = (type, voucher = null) => {
    setPreviousView(view);
    setConfirmType(type);
    setPendingVoucher(voucher);
    setView(VIEW.CONFIRM);
  };
  const closeConfirm = () => {
    setConfirmType(null);
    setPendingVoucher(null);
    if (previousView) setView(previousView);
    setPreviousView(null);
  };
  const handleCreateVoucher = () => {
    if (!isEditable) return;
    openConfirm(CONFIRM_TYPE.CREATE);
  };
  const handleLinkVoucher = (voucher) => {
    if (!isEditable) return;
    if (String(voucher.cStatus) !== "C")
      openConfirm(CONFIRM_TYPE.LINK, voucher);
  };
  const handleUnlinkVoucher = () => {
    if (!isEditable) return;
    if (linkedVoucher && String(linkedVoucher.cStatus) !== "C")
      openConfirm(CONFIRM_TYPE.UNLINK);
  };
  const handleConfirmBack = () => closeConfirm();
  const handleNavigateToVoucher = () => {
    if (linkedVoucher) {
      navigate(`/voucher-update?id=${linkedVoucher.nVoucherId}`);
      onClose();
    }
  };
  const handleGoLinkList = () => {
    if (!isEditable) return;
    fetchOpenVouchers();
    setView(VIEW.LINK_LIST);
  };

  const titleMap = {
    [VIEW.MAIN]: "Manage Voucher",
    [VIEW.LINK_LIST]: "Link to Voucher",
    [VIEW.LINKED]: "Linked Voucher",
    [VIEW.CONFIRM]: "Confirm Action",
  };
  const subTitleMap = {
    [VIEW.MAIN]: po?.strPurchaseOrderNo || "",
    [VIEW.LINK_LIST]: po?.strPurchaseOrderNo
      ? `${po.strPurchaseOrderNo} · Select voucher`
      : "",
    [VIEW.LINKED]: po?.strPurchaseOrderNo || "",
    [VIEW.CONFIRM]: po?.strPurchaseOrderNo || "",
  };
  const handleCancel = () => {
    if (confirmType) closeConfirm();
    else if (view === VIEW.LINK_LIST) setView(VIEW.MAIN);
    else onClose();
  };
  const cancelLabel = confirmType
    ? "Close"
    : view === VIEW.LINK_LIST
      ? "Back"
      : "Close";
  const showSave = false;

  const handleConfirmProceed = async () => {
    setActionLoading(true);
    try {
      if (confirmType === CONFIRM_TYPE.CREATE) {
        await VoucherAPI.createVoucher({
          cType: voucherSupplierTypeKey,
          nTypeId: supplierId,
          cStatus: voucherActiveKey,
          nPurchaseOrderIds: [po.nPurchaseOrderId],
        });
        const fresh = await refreshLinked();
        if (fresh) {
          setLinkedVoucher(fresh);
          setView(VIEW.LINKED);
        }
        if (onSuccess) await onSuccess();
        window.dispatchEvent(new CustomEvent("voucher_data_updated"));
      } else if (confirmType === CONFIRM_TYPE.LINK && pendingVoucher) {
        await VoucherSupplierAPI.create({
          nVoucherId: pendingVoucher.nVoucherId,
          nPurchaseOrderId: po.nPurchaseOrderId,
        });
        const fresh = await refreshLinked();
        if (fresh) {
          setLinkedVoucher(fresh);
          setView(VIEW.LINKED);
        }
        if (onSuccess) await onSuccess();
        window.dispatchEvent(new CustomEvent("voucher_data_updated"));
      } else if (confirmType === CONFIRM_TYPE.UNLINK && linkedVoucher) {
        const linkedPOs = linkedVoucher.voucher_suppliers || [];
        const isLastPO = linkedPOs.length <= 1;
        const vs = linkedPOs.find(
          (x) => Number(x.nPurchaseOrderId) === Number(po.nPurchaseOrderId),
        );
        if (!vs?.nVoucherSupplierId) throw new Error("Link not found");
        await VoucherSupplierAPI.delete(vs.nVoucherSupplierId);
        setLinkedVoucher(null);
        setView(VIEW.MAIN);
        if (onSuccess) await onSuccess();
        if (isLastPO)
          window.dispatchEvent(
            new CustomEvent("voucher_data_deleted", {
              detail: { voucherId: linkedVoucher.nVoucherId },
            }),
          );
        window.dispatchEvent(new CustomEvent("voucher_data_updated"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
      setConfirmType(null);
      setPendingVoucher(null);
      setPreviousView(null);
    }
  };

  if (!open) return null;
  const confirmStyle = confirmType ? VOUCHER_CONFIRM_STYLES[confirmType] : null;
  const ConfirmIcon = confirmStyle?.Icon;

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title={titleMap[view]}
      subTitle={subTitleMap[view]}
      showSave={showSave}
      cancelLabel={cancelLabel}
      onCancel={handleCancel}
      width={{ xs: "92%", sm: 520, md: 600 }}
      contentPadding={{ xs: 1.5, sm: 2 }}
    >
      {confirmType ? (
        <ConfirmationStructure
          style={VOUCHER_CONFIRM_STYLES[confirmType]}
          voucherNumber={
            confirmType === CONFIRM_TYPE.LINK
              ? pendingVoucher?.strNumber
              : confirmType === CONFIRM_TYPE.UNLINK
                ? linkedVoucher?.strNumber
                : null
          }
          loading={actionLoading}
          onConfirm={handleConfirmProceed}
          onBack={handleConfirmBack}
        />
      ) : (
        <>
          {checking && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
                py: 1,
              }}
            >
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.25,
                    py: 1,
                    borderRadius: "8px",
                    border: `0.5px solid ${c.border}`,
                  }}
                >
                  <Skeleton variant="circular" width={24} height={24} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="35%" height={14} />
                    <Skeleton variant="text" width="55%" height={12} />
                  </Box>
                  <Skeleton variant="circular" width={28} height={28} />
                </Box>
              ))}
            </Box>
          )}
          {!checking && view === VIEW.MAIN && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                py: 2,
              }}
            >
              <Typography
                sx={{ fontSize: "0.75rem", color: c.textSecondary, mb: 1 }}
              >
                {isEditable
                  ? "No voucher linked yet. Choose an action below."
                  : "No voucher linked to this purchase order."}
              </Typography>
              {isEditable && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    component="button"
                    onClick={handleCreateVoucher}
                    disabled={actionLoading}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.6,
                      px: 1.75,
                      py: 0.75,
                      borderRadius: "8px",
                      border: `1px solid ${c.primaryBg}`,
                      background: c.primaryBg,
                      color: c.primaryText,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      minWidth: 150,
                      "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
                      "&:hover:not(:disabled)": { background: c.primaryHover },
                    }}
                  >
                    <Add sx={{ fontSize: "0.95rem" }} /> Create Voucher
                  </Box>
                  <Box
                    component="button"
                    onClick={handleGoLinkList}
                    disabled={actionLoading}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.6,
                      px: 1.75,
                      py: 0.75,
                      borderRadius: "8px",
                      border: `1px solid ${c.secondaryBorder}`,
                      background: c.secondaryBg,
                      color: c.secondaryText,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      minWidth: 150,
                      "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
                      "&:hover:not(:disabled)": {
                        background: c.secondaryHover,
                      },
                    }}
                  >
                    <Link sx={{ fontSize: "0.95rem" }} /> Link to Voucher
                  </Box>
                </Box>
              )}
            </Box>
          )}
          {!checking && isEditable && view === VIEW.LINK_LIST && (
            <Box>
              {listLoading ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    py: 1,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1.25,
                        py: 1,
                        borderRadius: "8px",
                        border: `0.5px solid ${c.border}`,
                      }}
                    >
                      <Skeleton variant="circular" width={24} height={24} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="35%" height={14} />
                        <Skeleton variant="text" width="55%" height={12} />
                      </Box>
                      <Skeleton variant="circular" width={28} height={28} />
                    </Box>
                  ))}
                </Box>
              ) : vouchers.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    py: 4,
                    gap: 0.5,
                  }}
                >
                  <Typography
                    sx={{ fontSize: "0.8rem", color: c.textSecondary }}
                  >
                    No open vouchers found for this supplier.
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: c.textMuted }}>
                    Create a new voucher instead.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                    maxHeight: 360,
                    overflowY: "auto",
                  }}
                >
                  {vouchers.map((v) => (
                    <Box
                      key={v.nVoucherId}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 1.25,
                        py: 0.85,
                        border: `0.5px solid ${c.border}`,
                        borderRadius: "8px",
                        background: c.cardBg,
                        "&:hover": {
                          background: c.cardHoverBg,
                          borderColor: c.secondaryBorder,
                        },
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <ReceiptLong
                          sx={{
                            fontSize: "1rem",
                            color: c.linkButtonColor,
                            flexShrink: 0,
                          }}
                        />
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              color: c.textPrimary,
                              lineHeight: 1.2,
                            }}
                          >
                            {v.strNumber ?? "—"}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.4,
                              mt: 0.15,
                            }}
                          >
                            <LocalShipping
                              sx={{
                                fontSize: "0.6rem",
                                color: c.textSecondary,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: "0.65rem",
                                color: c.textSecondary,
                              }}
                            >
                              {v.supplier?.strSupplierNickName ??
                                v.supplier?.strSupplierName ??
                                "—"}
                            </Typography>
                            <Divider
                              orientation="vertical"
                              flexItem
                              sx={{ mx: 0.3, borderColor: c.border }}
                            />
                            <Typography
                              sx={{ fontSize: "0.65rem", color: c.textMuted }}
                            >
                              {(v.voucher_suppliers || []).length} PO
                              {(v.voucher_suppliers || []).length === 1
                                ? ""
                                : "s"}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleLinkVoucher(v)}
                        disabled={actionLoading || String(v.cStatus) === "C"}
                        sx={{
                          color: c.linkButtonColor,
                          "&:hover": { background: c.linkButtonHoverBg },
                          "&.Mui-disabled": { opacity: 0.4 },
                        }}
                        title={
                          String(v.cStatus) === "C"
                            ? "Voucher is closed"
                            : "Link this voucher"
                        }
                      >
                        <Link sx={{ fontSize: "1rem" }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
          {!checking && view === VIEW.LINKED && linkedVoucher && (
            <Box>
              <Box
                sx={{
                  borderRadius: "8px",
                  border: `0.5px solid ${c.border}`,
                  // A neutral card — the Voucher number is the only blue
                  // thing in it, and it is the link.
                  background: c.cardBg,
                  px: 1.5,
                  py: 1.25,
                  display: "flex",
                  alignItems: "stretch",
                  gap: 1.5,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* VOUCHER — the label, with the number under it */}
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: c.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    Voucher
                  </Typography>

                  {/* THE DV NUMBER — the one blue line here, and the way
                      into the voucher itself. */}
                  <Typography
                    component="button"
                    onClick={handleNavigateToVoucher}
                    title="Go to Voucher"
                    sx={{
                      display: "block",
                      mt: 0.3,
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: c.linkButtonColor,
                      lineHeight: 1.2,
                      textAlign: "left",
                      p: 0,
                      border: "none",
                      background: "transparent",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {linkedVoucher.strNumber ?? "—"}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.4,
                    }}
                  >
                    <LocalShipping
                      sx={{ fontSize: "0.7rem", color: c.textMuted }}
                    />
                    <Typography
                      sx={{ fontSize: "0.72rem", color: c.textSecondary }}
                    >
                      {linkedVoucher.supplier?.strSupplierNickName ??
                        linkedVoucher.supplier?.strSupplierName ??
                        "—"}
                    </Typography>
                  </Box>
                  {(linkedVoucher.voucher_suppliers || []).length > 0 && (
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        color: c.textMuted,
                        mt: 0.5,
                      }}
                    >
                      {(linkedVoucher.voucher_suppliers || []).length} linked PO
                      {(linkedVoucher.voucher_suppliers || []).length === 1
                        ? ""
                        : "s"}
                    </Typography>
                  )}
                </Box>

                {/* The unlink button — the only action left on the card */}
                {isEditable && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.75,
                      flexShrink: 0,
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={handleUnlinkVoucher}
                      disabled={
                        actionLoading || String(linkedVoucher.cStatus) === "C"
                      }
                      sx={{
                        width: 34,
                        height: 34,
                        border: `1px solid ${c.dangerButtonBorder}`,
                        background: c.dangerButtonBg,
                        color: c.dangerButtonColor,
                        "&:hover:not(:disabled)": {
                          background: c.dangerButtonHoverBg,
                        },
                        "&.Mui-disabled": {
                          opacity: 0.5,
                          borderColor: c.dangerDisabledBorder,
                          color: c.dangerDisabledColor,
                        },
                      }}
                      title={
                        String(linkedVoucher.cStatus) === "C"
                          ? "Voucher is closed"
                          : "Unlink Voucher"
                      }
                    >
                      <LinkOff sx={{ fontSize: "0.9rem" }} />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </>
      )}
    </ModalContainer>
  );
}
