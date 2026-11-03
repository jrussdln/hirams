import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ErrorOutlineOutlined,
  KeyboardArrowUpOutlined,
  TrendingDown,
  TrendingUp,
} from "@mui/icons-material";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer";
import PurchaseOptionAPI from "../../../../api/endpoints/purchase-option.api.js";
import { fmtPHP } from "../../../../utils/formatters/formatter";
import getThemeColors from "../../../../utils/style/getThemeColors";

// ── Theme map — only tokens this component actually uses ───────────────
const useColors = (c) => ({
  border: c.slate.border,
  outerBg: c.slate.outerBg,
  itemHeaderBg: c.slate.itemHeaderBg,
  hover: c.slate.hover,
  textHeading: c.gray.textHeading,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  blue: { text: c.blue.text },
  green: { text: c.green.text },
  amber: { text: c.amber.text },
  red: { text: c.red.text },
  falseBg: c.red.bg,
});

/**
 * The pending purchase-price changes — a modal listing every option whose
 * renegotiated price is still 'P' (pending), grouped by the transaction the
 * items belong to. Each row shows the canvassed price (old) next to the
 * proposed one (new) and an Approve button per item; an approved price
 * becomes the one that counts straight away.
 */
export default function PriceChangeRequestModal({ open, onClose }) {
  const theme = useTheme();
  const base = useMemo(() => getThemeColors(theme.palette.mode === "dark"), [theme]);
  const colors = useMemo(() => useColors(base), [base]);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Only PENDING opens by default — APPROVED/REJECTED are archives the
  // reader expands on demand.
  const [sectionOpen, setSectionOpen] = useState({
    pending: true,
    approved: false,
    rejected: false,
  });
  const toggleSection = (key) =>
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // Track expanded/collapsed state for individual transaction groups within sections
  const [groupOpen, setGroupOpen] = useState({});
  const toggleGroup = (groupKey) =>
    setGroupOpen((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));

  // The row whose approve call is in flight — the button shows a muted
  // style and clicking it again does nothing.
  const [approvingId, setApprovingId] = useState(null);

  // Everything loads when the modal opens — a closed modal never fetches,
  // and reopening refetches so freshly saved requests show up.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    PurchaseOptionAPI.getPriceChangeRequests()
      .then((res) => {
        if (cancelled) return;
        setRequests(
          res?.priceChangeRequests ?? res?.items ?? res?.purchaseOptions ?? [],
        );
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch price change requests:", err);
        setError("Failed to load price change requests.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ── The three sections, each grouped by transaction ──
  // Rows are bucketed by the price-status letter (P/A/C): the decision still
  // waiting, the approved proposal, and the refused one.
  const groupByTransaction = (rows) => {
    const map = new Map();
    rows.forEach((r) => {
      const key =
        r.nTransactionId != null
          ? String(r.nTransactionId)
          : r.transactionCode || "—";
      if (!map.has(key)) {
        map.set(key, {
          transactionCode: r.transactionCode,
          clientName: r.clientName || r.client?.strClientNickName || "",
          companyName: r.companyName || r.company?.strCompanyName || "",
          rows: [],
        });
      }
      map.get(key).rows.push(r);
    });
    return [...map.values()];
  };

  const sections = useMemo(() => {
    const pending = [];
    const approved = [];
    const rejected = [];
    requests.forEach((r) => {
      const letter = String(r.cPurchaseUnitPriceStatus ?? "").toUpperCase();
      if (letter === "A") approved.push(r);
      else if (letter === "C") rejected.push(r);
      else pending.push(r);
    });
    return [
      { key: "pending", label: "PENDING REQUESTS", accent: "amber", groups: groupByTransaction(pending) },
      { key: "approved", label: "APPROVED REQUESTS", accent: "green", groups: groupByTransaction(approved) },
      { key: "rejected", label: "REJECTED REQUESTS", accent: "red", groups: groupByTransaction(rejected) },
    ];
  }, [requests]);

  const handleApprove = async (row) => {
    const id = row.id ?? row.nPurchaseItemId;
    if (approvingId) return;
    setApprovingId(id);
    setError(null);
    try {
      await PurchaseOptionAPI.approvePriceChange(id);
      // The row MOVES to the approved section — nothing is lost.
      setRequests((prev) =>
        prev.map((r) =>
          (r.id ?? r.nPurchaseItemId) === id
            ? { ...r, cPurchaseUnitPriceStatus: "A" }
            : r,
        ),
      );
    } catch (err) {
      console.error("Failed to approve price change:", err);
      setError(
        err?.response?.data?.message || "Failed to approve the price change.",
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (row) => {
    const id = row.id ?? row.nPurchaseItemId;
    if (approvingId) return;
    setApprovingId(id);
    setError(null);
    try {
      await PurchaseOptionAPI.rejectPriceChange(id);
      // The row MOVES to the rejected section — nothing is lost.
      setRequests((prev) =>
        prev.map((r) =>
          (r.id ?? r.nPurchaseItemId) === id
            ? { ...r, cPurchaseUnitPriceStatus: "C" }
            : r,
        ),
      );
    } catch (err) {
      console.error("Failed to reject price change:", err);
      setError(
        err?.response?.data?.message || "Failed to reject the price change.",
      );
    } finally {
      setApprovingId(null);
    }
  };

  const fallbackTexts = {
    pending: "No Pending Price change requests yet.",
    approved: "No Approved Price change requests yet.",
    rejected: "No Rejected Price change requests yet.",
  };

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Price Change Requests"
      showFooter
      showSave={false}
      cancelLabel="Close"
      width={750}
    >
      {/* Error banner — fetch or approve failures share it. */}
      {error && (
        <Box
          sx={{
            mb: 1.5,
            px: 1.5,
            py: 1,
            borderRadius: "8px",
            border: `1px solid ${colors.red.text}`,
            backgroundColor: colors.falseBg,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <ErrorOutlineOutlined
            sx={{ fontSize: "1rem", color: colors.red.text }}
          />
          <Typography sx={{ fontSize: "0.62rem", color: colors.red.text, flex: 1 }}>
            {error}
          </Typography>
        </Box>
      )}

      {/* ── Rows — the three sections, each grouped by transaction ── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {loading &&
          [0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                height: 110,
                borderRadius: "10px",
                border: `1px solid ${colors.border}`,
                bgcolor: colors.hover,
                opacity: 0.5,
              }}
            />
          ))}

        {!loading && !error && (
          <Box
            sx={{
              border: `1px solid ${colors.border}`,
              borderRadius: "12px",
              bgcolor: colors.outerBg,
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {sections.map((section, idx) => {
              const totalItemsCount = section.groups.reduce((n, g) => n + g.rows.length, 0);
              return (
                <Box
                  key={section.key}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    ...(idx > 0 && {
                      pt: 2,
                      borderTop: `1px solid ${colors.border}`,
                    }),
                  }}
                >
                  {/* Section header — collapsible: a click folds the rows
                      away. The right side carries the COUNT ONLY. */}
                  <Box
                    onClick={() => toggleSection(section.key)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 0.25,
                      cursor: "pointer",
                      userSelect: "none",
                      "&:hover .section-collapse": { opacity: 0.8 },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: colors[section.accent].text,
                      }}
                    >
                      {section.label}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          color: colors.textMuted,
                        }}
                      >
                        {totalItemsCount}
                      </Typography>
                      <KeyboardArrowUpOutlined
                        className="section-collapse"
                        fontSize="small"
                        sx={{
                          fontSize: "1rem",
                          color: colors.textMuted,
                          transform: sectionOpen[section.key]
                            ? "none"
                            : "rotate(180deg)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </Box>
                  </Box>

                  <Collapse in={sectionOpen[section.key]} timeout={180} unmountOnExit>
                    {totalItemsCount > 0 ? (
                      <Box
                        sx={{
                          borderRadius: "10px",
                          border: `1px solid ${colors.border}`,
                          bgcolor: colors.outerBg,
                          overflow: "hidden",
                          mt: 1,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {section.groups.map((group, groupIdx) => {
                          const groupKey = `${section.key}-${group.transactionCode || groupIdx}`;
                          // Default open if not explicitly toggled
                          const isOpen = groupOpen[groupKey] ?? true;
                          const clientNick = group.clientName || "";
                          const companyNick = group.companyName || "";
                          const badgeText = [clientNick, companyNick].filter(Boolean).join(" ➟ ") || "BFAR - MiMaRoPa ➟ HiRAMS";

                          return (
                            <Box
                              key={groupKey}
                              sx={{
                                borderBottom: `1px solid ${colors.border}`,
                                "&:last-of-type": { borderBottom: "none" },
                              }}
                            >
                              {/* Transaction subheader (clickable to collapse/expand) */}
                              <Box
                                onClick={() => toggleGroup(groupKey)}
                                sx={{
                                  px: 1.5,
                                  py: 1,
                                  bgcolor: colors.itemHeaderBg,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  userSelect: "none",
                                  ...(groupIdx > 0 && {
                                    borderTop: `1px solid ${colors.border}`,
                                  }),
                                  "&:hover .group-collapse": { opacity: 0.8 },
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
                                  <Typography
                                    sx={{
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      color: colors.textPrimary,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {group.transactionCode || "—"}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: "0.62rem",
                                      fontWeight: 600,
                                      color: colors.textSecondary,
                                      px: 1,
                                      py: 0.15,
                                      borderRadius: "6px",
                                      backgroundColor: colors.outerBg,
                                      border: `1px solid ${colors.border}`,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {badgeText}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    ml: 1,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "0.6rem",
                                      fontWeight: 600,
                                      color: colors.textMuted,
                                    }}
                                  >
                                    {group.rows.length}
                                  </Typography>
                                  <KeyboardArrowUpOutlined
                                    className="group-collapse"
                                    fontSize="small"
                                    sx={{
                                      fontSize: "1rem",
                                      color: colors.textMuted,
                                      transform: isOpen ? "none" : "rotate(180deg)",
                                      transition: "transform 0.2s ease",
                                    }}
                                  />
                                </Box>
                              </Box>

                              {/* Transaction item rows collapse */}
                              <Collapse in={isOpen} timeout={150} unmountOnExit>
                                <Box>
                                  {group.rows.map((row) => {
                                    const id = row.id ?? row.nPurchaseItemId;
                                    const brandModel =
                                      [row.strBrand, row.strModel].filter(Boolean).join(" · ") ||
                                      "";
                                    const supplierText = row.supplierNickName || row.supplierName || "";
                                    const oldPrice = Number(row.oldUnitPrice) || 0;
                                    const newPrice = Number(row.newUnitPrice) || 0;
                                    const diff = newPrice - oldPrice;
                                    return (
                                      <Box
                                        key={id}
                                        sx={{
                                          px: 1.5,
                                          py: 1.25,
                                          borderTop: `1px solid ${colors.border}`,
                                          bgcolor: colors.outerBg,
                                        }}
                                      >
                                        {/* Item name */}
                                        <Typography
                                          sx={{
                                            fontSize: "0.7rem",
                                            fontWeight: 700,
                                            color: colors.textPrimary,
                                            lineHeight: 1.3,
                                          }}
                                        >
                                          {row.itemName || "—"}
                                        </Typography>

                                        {/* Brand & Model */}
                                        {brandModel && (
                                          <Typography
                                            sx={{
                                              fontSize: "0.65rem",
                                              fontWeight: 600,
                                              color: colors.textSecondary,
                                              mt: 0.25,
                                            }}
                                          >
                                            {brandModel}
                                          </Typography>
                                        )}

                                        {/* Supplier nickname & UOM */}
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 1,
                                            mt: 0.25,
                                          }}
                                        >
                                          <Typography
                                            sx={{
                                              fontSize: "0.62rem",
                                              fontWeight: 500,
                                              color: colors.textMuted,
                                              textTransform: "uppercase",
                                              whiteSpace: "nowrap",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                            }}
                                          >
                                            {supplierText}
                                          </Typography>
                                          {row.strUOM && (
                                            <Typography
                                              sx={{
                                                fontSize: "0.55rem",
                                                fontWeight: 600,
                                                color: colors.blue.text,
                                              }}
                                            >
                                              {(row.nQuantity ?? 0) > 0
                                                ? `${row.nQuantity} ${row.strUOM}`
                                                : row.strUOM}
                                            </Typography>
                                          )}
                                        </Box>

                                        {/* Old price → new price + indicator + action */}
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 1,
                                            mt: 1,
                                          }}
                                        >
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Box>
                                              <Typography
                                                sx={{
                                                  fontSize: "0.52rem",
                                                  fontWeight: 700,
                                                  letterSpacing: "0.06em",
                                                  color: colors.textMuted,
                                                }}
                                              >
                                                OLD
                                              </Typography>
                                              <Typography
                                                sx={{
                                                  fontSize: "0.65rem",
                                                  fontWeight: 600,
                                                  color: colors.textSecondary,
                                                  textDecoration:
                                                    section.key === "approved" ? "line-through" : "none",
                                                }}
                                              >
                                                {fmtPHP(oldPrice)}
                                              </Typography>
                                            </Box>
                                            <Typography
                                              sx={{
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                color: colors.textMuted,
                                              }}
                                            >
                                              →
                                            </Typography>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                              <Box>
                                                <Typography
                                                  sx={{
                                                    fontSize: "0.52rem",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.06em",
                                                    color:
                                                      section.key === "rejected"
                                                        ? colors.red.text
                                                        : colors.green.text,
                                                  }}
                                                >
                                                  NEW
                                                </Typography>
                                                <Typography
                                                  sx={{
                                                    fontSize: "0.72rem",
                                                    fontWeight: 700,
                                                    color:
                                                      section.key === "rejected"
                                                        ? colors.textSecondary
                                                        : colors.textPrimary,
                                                  }}
                                                >
                                                  {row.newUnitPrice == null
                                                    ? "—"
                                                    : fmtPHP(newPrice)}
                                                </Typography>
                                              </Box>
                                              {row.newUnitPrice != null && diff < 0 && (
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                                                  <TrendingDown
                                                    sx={{ fontSize: "1.15rem", color: colors.green.text }}
                                                    titleAccess={`Decreased by ${fmtPHP(Math.abs(diff))}`}
                                                  />
                                                  <Typography
                                                    sx={{
                                                      fontSize: "0.62rem",
                                                      fontWeight: 700,
                                                      color: colors.green.text,
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    {fmtPHP(diff)}
                                                  </Typography>
                                                </Box>
                                              )}
                                              {row.newUnitPrice != null && diff > 0 && (
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                                                  <TrendingUp
                                                    sx={{ fontSize: "1.15rem", color: colors.red.text }}
                                                    titleAccess={`Increased by ${fmtPHP(diff)}`}
                                                  />
                                                  <Typography
                                                    sx={{
                                                      fontSize: "0.62rem",
                                                      fontWeight: 700,
                                                      color: colors.red.text,
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    +{fmtPHP(diff)}
                                                  </Typography>
                                                </Box>
                                              )}
                                            </Box>
                                          </Box>

                                          {section.key === "pending" ? (
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                              {/* Hand-rolled pill buttons — labels first,
                                                  Reject ahead of Approve, verdict colors. */}
                                              <Button
                                                size="small"
                                                disableElevation
                                                disabled={Boolean(approvingId)}
                                                onClick={() => handleReject(row)}
                                                title="Reject this price — back to the canvassed price"
                                                sx={{
                                                  fontSize: "0.55rem",
                                                  fontWeight: 700,
                                                  letterSpacing: "0.08em",
                                                  textTransform: "uppercase",
                                                  minWidth: 0,
                                                  px: 1.5,
                                                  py: 0.25,
                                                  borderRadius: "999px",
                                                  border: `1px solid ${colors.red.text}`,
                                                  color: colors.red.text,
                                                  "&:hover": {
                                                    backgroundColor: colors.hover,
                                                    borderColor: colors.red.text,
                                                  },
                                                  "&.Mui-disabled": { opacity: 0.45 },
                                                }}
                                              >
                                                Reject
                                              </Button>
                                              <Button
                                                size="small"
                                                disableElevation
                                                disabled={Boolean(approvingId)}
                                                onClick={() => handleApprove(row)}
                                                title="Approve this price"
                                                sx={{
                                                  fontSize: "0.55rem",
                                                  fontWeight: 700,
                                                  letterSpacing: "0.08em",
                                                  textTransform: "uppercase",
                                                  minWidth: 0,
                                                  px: 1.5,
                                                  py: 0.25,
                                                  borderRadius: "999px",
                                                  border: `1px solid ${colors.green.text}`,
                                                  color: colors.green.text,
                                                  "&:hover": {
                                                    backgroundColor: colors.hover,
                                                    borderColor: colors.green.text,
                                                  },
                                                  "&.Mui-disabled": { opacity: 0.45 },
                                                }}
                                              >
                                                Approve
                                              </Button>
                                            </Box>
                                          ) : (
                                            /* Settled rows carry the verdict, not buttons */
                                            <Typography
                                              sx={{
                                                fontSize: "0.55rem",
                                                fontWeight: 700,
                                                letterSpacing: "0.08em",
                                                color:
                                                  colors[section.key === "approved" ? "green" : "red"].text,
                                              }}
                                            >
                                              {section.key === "approved" ? "APPROVED" : "REJECTED"}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Collapse>
                            </Box>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          mt: 1,
                          py: 2,
                          px: 1.5,
                          borderRadius: "10px",
                          border: `1px dashed ${colors.border}`,
                          bgcolor: colors.outerBg,
                          textAlign: "center",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            color: colors.textMuted,
                            fontStyle: "italic",
                          }}
                        >
                          {fallbackTexts[section.key]}
                        </Typography>
                      </Box>
                    )}
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </ModalContainer>
  );
}
