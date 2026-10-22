import React, { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Typography, Collapse } from "@mui/material";
import {
  ShoppingCartOutlined,
  UnfoldLess,
  UnfoldMore,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import CustomSearchField from "../../../components/ui/form/SearchField.jsx";
import PageLayout from "../../../components/layouts/page/content-page";
import BaseButton from "../../../components/ui/form/BaseButton.jsx";
import SyncMenu from "../../../components/ui/form/SyncMenu.jsx";
import { CartSkeleton } from "./components/shared/Skeleton.jsx";
import CartCardPanel from "./components/CartCardPanel.jsx";
import CartCardForDelivery from "./components/CartCardForDelivery.jsx";
import { TIME_PERIOD_ORDER, TIME_PERIOD_LABELS } from "./useItemPurchasing.js";
import getThemeColors from "../../../utils/style/getThemeColors.js";

const useColors = (c) => ({
  border: c.slate.border,
  borderFaint: c.slate.divider,
  bgCard: c.slate.outerBg,
  bgHeader: c.slate.itemHeaderBg,
  bgHover: c.slate.itemHover,
  bgBadge: c.slate.mutedBg,
  bgBadgeLight: c.slate.summaryBg,
  textMuted: c.gray.textSecondary,
  textMutedAlt: c.gray.textDisabled,
  textBody: c.gray.textHeading,
  iconMuted: c.slate.mutedColor,
  emptyStateBg: c.slate.expandedBg,
  emptyStateIcon: c.skeleton.soft,
});

// One section of the single container: a header you click to fold its cards
// away, and the cards themselves below it. The sections sit inside ONE
// bordered box (see TimePeriodSections) — a divider separates them, not a
// gap.
function TimePeriodSection({
  period,
  count,
  children,
  defaultOpen = true,
  forceOpen,
  sectionsExpanded,
  isFirst,
  c,
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Three things can open or close a section:
  //   • a search — every section is forced open so the matches are visible
  //   • Expand / Collapse All — opens or closes all of them at once
  //   • the default: the first group open, the rest closed
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (sectionsExpanded === true) {
      setOpen(true);
      return;
    }
    if (sectionsExpanded === false) {
      setOpen(false);
      return;
    }
    setOpen(defaultOpen);
  }, [forceOpen, sectionsExpanded, defaultOpen]);

  return (
    <Box
      sx={{
        // The divider BETWEEN sections — the container draws the outer edge.
        borderTop: isFirst ? "none" : `0.5px solid ${c.borderFaint}`,
      }}
    >
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.75,
          py: 1.25,
          background: c.bgHeader,
          cursor: "pointer",
          userSelect: "none",
          "&:hover": { background: c.bgHover },
        }}
      >
        <Typography
          sx={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: c.textMuted,
            flex: 1,
            lineHeight: 1,
          }}
        >
          {TIME_PERIOD_LABELS[period]}
        </Typography>
        <Box
          sx={{ px: 0.6, py: 0.15, borderRadius: "4px", background: c.bgBadge }}
        >
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 700,
              color: c.textMuted,
              lineHeight: 1,
            }}
          >
            {count}
          </Typography>
        </Box>
        {open ? (
          <ExpandLess sx={{ fontSize: "0.75rem", color: c.iconMuted }} />
        ) : (
          <ExpandMore sx={{ fontSize: "0.75rem", color: c.iconMuted }} />
        )}
      </Box>
      <Collapse in={open}>
        <Box sx={{ p: 0.75 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

// The ONE container every time-period section lives in. No gaps between the
// sections — a divider line separates them, so the whole list reads as a
// single accordion.
function TimePeriodSections({ sections, sectionsExpanded, search, c }) {
  if (!sections.length) return null;

  return (
    <Box
      sx={{
        borderRadius: "7px",
        border: `0.5px solid ${c.border}`,
        bgcolor: c.bgCard,
        overflow: "hidden",
      }}
    >
      {sections.map((s, i) => (
        <TimePeriodSection
          key={s.period}
          period={s.period}
          count={s.count}
          defaultOpen={i === 0}
          forceOpen={search.trim() ? true : undefined}
          sectionsExpanded={sectionsExpanded}
          isFirst={i === 0}
          c={c}
        >
          {s.content}
        </TimePeriodSection>
      ))}
    </Box>
  );
}

function renderTimePeriodCards(pos, sharedCardProps) {
  return (
    <>
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        {pos.map((po) => (
          <CartCardPanel key={po.nPurchaseOrderId} {...sharedCardProps(po)} />
        ))}
      </Box>
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "row",
          gap: 0.5,
          alignItems: "flex-start",
        }}
      >
        {[0, 1].map((col) => (
          <Box
            key={col}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              flex: 1,
              minWidth: 0,
            }}
          >
            {pos
              .filter((_, i) => i % 2 === col)
              .map((po) => (
                <CartCardPanel
                  key={po.nPurchaseOrderId}
                  {...sharedCardProps(po)}
                />
              ))}
          </Box>
        ))}
      </Box>
    </>
  );
}

export default function ItemPurchasingView({
  itemsLoading,
  purchaseOrders,
  filteredPurchaseOrders,
  handleUpdateClick,
  search,
  setSearch,
  allCollapsed,
  toggleAllCollapsed,
  sectionsExpanded,
  vouchersByPO,
  currentUserId,
  itemPurchasingStatus,
  selectedStatusCode,
  cartKey,
  forApprovalKey,
  forPaymentKey,
  pendingReceiptKey,
  forDeliveryKey,
  deliveredKey,
  cancelledPOKey,
  removedFromCartKey,
  voucherActiveKey,
  voucherClosedKey,
  fetchAllPurchaseOrders,
  groupedByPeriod,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const c = React.useMemo(() => useColors(base), [base]);

  const sharedCardProps = (po) => ({
    po,
    // The tab being viewed — the card can be listed under For Delivery while
    // its own status is still Pending Receipt.
    viewStatus: selectedStatusCode,
    cartStatus: itemPurchasingStatus,
    cartKey: cartKey ?? "",
    forApprovalKey: forApprovalKey ?? "",
    forPaymentKey: forPaymentKey ?? "",
    pendingReceiptKey: pendingReceiptKey ?? "",
    forDeliveryKey: forDeliveryKey ?? "",
    deliveredKey: deliveredKey ?? "",
    cancelledPOKey: cancelledPOKey ?? "",
    removedFromCartKey,
    currentUserId,
    onUpdateClick: handleUpdateClick,
    collapsed: allCollapsed,
    onRemoved: () => fetchAllPurchaseOrders({ bustCache: true }),
    voucherStatus: vouchersByPO[po.nPurchaseOrderId] ?? null,
    voucherActiveKey: voucherActiveKey ?? "",
    voucherClosedKey: voucherClosedKey ?? "",
  });

  // Simple: filteredPurchaseOrders is already filtered by the selected
  // itemPurchasingStatus code — just render it, grouped by time period.
  // For Delivery / Delivered are grouped by TRANSACTION instead: every item
  // of every PO sharing the same transaction code goes into one card.
  const isDeliveryTab =
    String(selectedStatusCode) === String(forDeliveryKey) ||
    String(selectedStatusCode) === String(deliveredKey);

  // One card per transaction, but still wrapped in the usual time-period
  // groups (This Week / This Month / This Year) — a transaction that spans
  // periods therefore gets one card per period.
  const groupsByPeriod = React.useMemo(() => {
    if (!isDeliveryTab) return {};
    const out = {};
    for (const period of TIME_PERIOD_ORDER) {
      const pos = groupedByPeriod[period] || [];
      if (!pos.length) continue;
      const byKey = new Map();
      for (const po of pos) {
        for (const opt of po.purchase_order_options || []) {
          const tx = opt?.purchase_option?.transaction_item?.transaction;
          const key = String(
            tx?.strCode || tx?.nTransactionId || `po-${po.nPurchaseOrderId}`,
          );
          let group = byKey.get(key);
          if (!group) {
            group = { key, entries: [] };
            byKey.set(key, group);
          }
          group.entries.push({ po, opt });
        }
      }
      out[period] = [...byKey.values()];
    }
    return out;
  }, [groupedByPeriod, isDeliveryTab]);

  const renderTransactionGroupedList = () => {
    const card = (group) => (
      <CartCardForDelivery
        key={group.key}
        {...sharedCardProps(group.entries[0].po)}
        entries={group.entries}
      />
    );
    const cards = (groups) => (
      <>
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {groups.map(card)}
        </Box>
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "row",
            gap: 0.5,
            alignItems: "flex-start",
          }}
        >
          {[0, 1].map((col) => (
            <Box
              key={col}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                flex: 1,
                minWidth: 0,
              }}
            >
              {groups.filter((_, i) => i % 2 === col).map(card)}
            </Box>
          ))}
        </Box>
      </>
    );

    const renderedPeriods = TIME_PERIOD_ORDER.filter(
      (p) => (groupsByPeriod[p] || []).length > 0,
    );
    const sections = renderedPeriods.map((period) => {
      const groups = groupsByPeriod[period] || [];
      return {
        period,
        count: groups.length,
        content: cards(groups),
      };
    });

    return (
      <TimePeriodSections
        sections={sections}
        sectionsExpanded={sectionsExpanded}
        search={search}
        c={c}
      />
    );
  };

  const renderTimeGroupedList = () => {
    const renderedPeriods = TIME_PERIOD_ORDER.filter(
      (p) => (groupedByPeriod[p] || []).length > 0,
    );
    const sections = renderedPeriods.map((period) => {
      const pos = groupedByPeriod[period] || [];
      return {
        period,
        count: pos.length,
        content: renderTimePeriodCards(pos, sharedCardProps),
      };
    });

    return (
      <TimePeriodSections
        sections={sections}
        sectionsExpanded={sectionsExpanded}
        search={search}
        c={c}
      />
    );
  };

  return (
    <PageLayout
      title="Item Purchasing"
      subtitle={
        selectedStatusCode && itemPurchasingStatus?.[selectedStatusCode]
          ? `${itemPurchasingStatus[selectedStatusCode]}`
          : ""
      }
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <CustomSearchField
            label="Search PO / Supplier / Item"
            value={search}
            onChange={setSearch}
          />
        </Box>
        <SyncMenu onSync={() => fetchAllPurchaseOrders({ bustCache: true })} />
        <BaseButton
          label={allCollapsed ? "Expand All" : "Collapse All"}
          icon={allCollapsed ? <UnfoldMore /> : <UnfoldLess />}
          actionColor="default"
          onClick={toggleAllCollapsed}
        />
      </Box>
      {itemsLoading ? (
        <CartSkeleton />
      ) : filteredPurchaseOrders.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: "60vh",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: c.emptyStateBg,
              border: `0.5px solid ${c.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingCartOutlined
              sx={{ fontSize: "1.5rem", color: c.emptyStateIcon }}
            />
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: c.textBody,
                lineHeight: 1.4,
              }}
            >
              No purchase orders found
            </Typography>
            <Typography
              sx={{
                fontSize: "0.75rem",
                color: c.textMutedAlt,
                mt: 0.4,
                lineHeight: 1.4,
              }}
            >
              {selectedStatusCode
                ? "No orders match the selected status filter."
                : "Items added to cart will appear here."}
            </Typography>
          </Box>
        </Box>
      ) : isDeliveryTab ? (
        renderTransactionGroupedList()
      ) : (
        renderTimeGroupedList()
      )}
    </PageLayout>
  );
}
