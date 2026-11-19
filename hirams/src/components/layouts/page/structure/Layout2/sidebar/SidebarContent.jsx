import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import useKeysLabels from "../../../../../../hooks/useKeysLabels";

import SidebarHeader from "./SidebarHeader";
import SidebarFooter from "./SidebarFooter";
import SidebarItem from "./SidebarItem";
import SidebarSectionSkeleton from "../sidebar-content/skeleton/SidebarSectionSkeleton";
import SectionHeader from "../sidebar-content/SectionHeader";
import useSectionToggle from "../sidebar-content/useSectionToggle";
import { SECTION_LABELS, SECTION_ROUTES } from "../../../../../../constants/navigations";
import { Box } from "@mui/material";

import { buildNavItems } from "../sidebar-content/BuildNavItems";
import getThemeColors from "../../../../../../utils/style/getThemeColors";
import UpDownIndicatorWidget from "../../../../../../components/ui/widget/UpDownIndicatorWidget";
import usePendingApprovals from "../../../../../../hooks/usePendingApprovals";
// import { notifyWarningCounts } from "../../../../../../utils/helpers/attentionChime";
// ─────────────────────────────────────────────────────────────────
// PROMPT 1 — Inline color map: receives c = getThemeColors(isDark)
// ─────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  surfaceBg: c.slate.outerBg,
  borderColor: c.slate.border,
});

// ─────────────────────────────────────────────────────────────────
// A section title plus everything under it. Clicking the title hides /
// shows the items; the choice is remembered (useSectionToggle).
// ─────────────────────────────────────────────────────────────────
const SectionGroup = ({ label, collapsed, forceExpanded, activeSection, attentionWhenCollapsed = false, children }) => {
  const [open, toggle] = useSectionToggle(label, label === activeSection);
  // The title is dropped in icon-rail mode — the items must stay visible.
  const titleVisible = !(collapsed && !forceExpanded);
  // The section hides something that needs a human — the header itself
  // pulses amber until the section is opened again.
  const attention = attentionWhenCollapsed && !open;

  return (
    <div className="flex flex-col w-full">
      <SectionHeader
        label={label}
        open={open}
        onToggle={toggle}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
        attention={attention}
      />
      {(!titleVisible || open) && children}
    </div>
  );
};

const SidebarContent = ({
  collapsed,
  forceExpanded = false,
  onItemClick,
  toggleCollapse,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // ✅ Wired EXACTLY as PROMPT 1 specifies:
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const bodyScrollRef = useRef(null);

  // The section group the current route belongs to — drives the group-level
  // auto-open (a collapsed MANAGEMENT / TRANSACTION / … uncollapses when the
  // app lands on one of its pages). Exact pathname match, same lists as the
  // per-nav highlight memberships (SECTION_ROUTES in constants/navigations).
  const { pathname } = useLocation();
  const activeSection =
    Object.entries(SECTION_ROUTES).find(
      ([, routes]) => routes.includes(pathname),
    )?.[0] ?? null;

  // SCROLL-REVEAL — auto-opening a section is useless if the active row is
  // still below the fold (Vouchers sits at the bottom): after every route
  // change, scroll the container until the active sidebar row is in view.
  // NOT plain "nearest" — the footer OVERLAYS the container's bottom edge,
  // so a nearest-scrolled row ends up half-hidden under it. The row's full
  // height is pushed ABOVE the footer line with a margin. Two passes — one
  // right away for the plain leaf case, one after the Collapse animations
  // settle for the rows that appeared through an auto-open.
  const footerShellRef = useRef(null);
  useEffect(() => {
    const reveal = () => {
      const ctx = bodyScrollRef.current;
      const row = ctx?.querySelector('[data-sidebar-active="true"]');
      if (!ctx || !row) return;
      const ctxRect = ctx.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const footerH =
        footerShellRef.current?.getBoundingClientRect().height ?? 0;
      const margin = 10;
      let delta = 0;
      // Row lands under the footer / the fold → push its BOTTOM above the
      // footer line.
      if (rowRect.bottom > ctxRect.bottom - footerH - margin) {
        delta = rowRect.bottom - (ctxRect.bottom - footerH - margin);
      }
      // Row scrolled past the top edge → pull it back into view.
      if (rowRect.top < ctxRect.top - margin) {
        delta = rowRect.top - (ctxRect.top - margin);
      }
      if (delta !== 0) ctx.scrollTop += delta;
    };
    reveal();
    const timer = setTimeout(reveal, 380);
    return () => clearTimeout(timer);
  }, [pathname, collapsed, forceExpanded]);

  // ✅ SINGLE SOURCE OF TRUTH — mappings + roles from one hook
  const {
    userTypes,
    isManagement,
    isProcurement,
    isAccountOfficer,
    isFinanceOfficer,
    isAO,
    isAOTL,
    loading: isLoading,
  } = useKeysLabels();

  const navConfig = buildNavItems();

  // Needs Attention (management/procurement/AO) — the transaction decision stages
  // holding work, rolled up by TransactionSubItems so the TRANSACTION header
  // can blink while the section is collapsed.
  const [txnStagesPending, setTxnStagesPending] = useState(false);
  useEffect(() => {
    const handler = (e) => setTxnStagesPending(Boolean(e.detail?.pending));
    window.addEventListener("txn_verification_pending", handler);
    return () =>
      window.removeEventListener("txn_verification_pending", handler);
  }, []);

  // Needs Attention — MANAGEMENT, FINANCE, ACCOUNT OFFICERS, and PROCUREMENT.
  // Other roles never fetch the counts (the hook stays 0), and the
  // bell only rings for these roles.
  const attentionEnabled =
    isManagement || isFinanceOfficer || isAO || isAOTL || isProcurement;
  const {
    clients: pendingClients,
    suppliers: pendingSuppliers,
    carts: pendingCarts,
    pendingJev,
    transactionVerification,
    forAssignment,
    itemsVerification,
    canvasVerification,
    priceVerification,
    priceApproval,
  } = usePendingApprovals(attentionEnabled);

  // Every warning sub-row the sidebar can blink for in THIS role, along
  // with its current count. The chime tracks each row separately: the
  // total staying flat no longer hides a new item (one row can gain work
  // while another row clears). Same rules as the blinking rows below.
  const warningCounts = useMemo(() => {
    if (!attentionEnabled) return {};
    const counts = {};

    if (isManagement) {
      counts.clients = pendingClients;
      counts.suppliers = pendingSuppliers;
      counts.carts = pendingCarts;
    } else if (isFinanceOfficer) {
      counts.suppliers = pendingSuppliers;
      counts.carts = pendingCarts;
    }

    // Pending JEV blinks for management, finance, AO and AOTL only.
    if (isManagement || isFinanceOfficer || isAO || isAOTL) {
      counts.pendingJev = pendingJev;
    }

    if (isManagement) {
      counts.txnVerification = transactionVerification;
      counts.forAssignment = forAssignment;
      counts.itemsVerification = itemsVerification;
      counts.canvasVerification = canvasVerification;
      counts.priceVerification = priceVerification;
      counts.priceApproval = priceApproval;
    } else if (isAOTL) {
      counts.forAssignment = forAssignment;
      counts.itemsVerification = itemsVerification;
      counts.canvasVerification = canvasVerification;
    } else if (isAO) {
      counts.itemsVerification = itemsVerification;
      counts.canvasVerification = canvasVerification;
    } else if (isProcurement) {
      counts.txnVerification = transactionVerification;
      counts.priceVerification = priceVerification;
    }

    return counts;
  }, [
    attentionEnabled,
    isManagement,
    isFinanceOfficer,
    isAO,
    isAOTL,
    isProcurement,
    pendingClients,
    pendingSuppliers,
    pendingCarts,
    pendingJev,
    transactionVerification,
    forAssignment,
    itemsVerification,
    canvasVerification,
    priceVerification,
    priceApproval,
  ]);

  // The bell lives HERE, in the sidebar shell, not on the dashboard —
  // the sidebar is mounted on every page, so the reminder follows the
  // user wherever they are. First load rings if any warning row already
  // has work; afterwards it rings only when a row's count increments.
  // (Browsers mute it until the tab has had one interaction — the
  // helper replays the pending ring on that first interaction.)
  useEffect(() => {
    // notifyWarningCounts(warningCounts);
  }, [warningCounts]);

  const renderNavItem = (entry) => {
    if (entry?.type === "nav") {
      const { key, component: Comp, ...rest } = entry;
      return (
        <Comp
          key={key}
          {...rest}
          collapsed={collapsed}
          forceExpanded={forceExpanded}
          onItemClick={onItemClick}
        />
      );
    }
    if (entry?.type === "item") {
      const { key, ...rest } = entry;
      return (
        <SidebarItem
          key={key}
          {...rest}
          collapsed={collapsed}
          forceExpanded={forceExpanded}
          onClick={onItemClick}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* HEADER — fixed at top */}
      <div
        className="flex-shrink-0 w-full px-2 pt-2 pb-2 border-b"
        style={{
          backgroundColor: colors.surfaceBg,
          borderColor: colors.borderColor,
        }}
      >
        <SidebarHeader collapsed={collapsed} forceExpanded={forceExpanded} />
      </div>

      {/* BODY — ONLY THIS SCROLLS */}
      <div
        ref={bodyScrollRef}
        className="flex-grow flex-shrink overflow-y-auto w-full flex flex-col"
        style={{ minHeight: 0 }}
      >
        <UpDownIndicatorWidget
          scrollRef={bodyScrollRef}
          direction="up"
          arrowSize={14}
          watch={[isLoading, collapsed, forceExpanded]}
        />

        <div className="px-2 py-2">
          {isLoading ? (
            <Box sx={{ pt: 1 }}>
              <SidebarSectionSkeleton
                {...{ collapsed, forceExpanded, itemCount: 2 }}
              />
              <SidebarSectionSkeleton
                {...{ collapsed, forceExpanded, itemCount: 4 }}
              />
              <SidebarSectionSkeleton
                {...{ collapsed, forceExpanded, itemCount: 2 }}
              />
            </Box>
          ) : (
            <>
              <SectionGroup
                label={SECTION_LABELS.overview}
                activeSection={activeSection}
                {...{ collapsed, forceExpanded }}
              >
                {navConfig.overview[0].items.map((item) => (
                  <SidebarItem
                    key={item.to}
                    icon={item.icon}
                    label={item.label}
                    to={item.to}
                    collapsed={collapsed}
                    forceExpanded={forceExpanded}
                    onClick={onItemClick}
                  />
                ))}
              </SectionGroup>

              {isManagement && (
                <>
                  <SectionGroup
                    label={SECTION_LABELS.management}
                    activeSection={activeSection}
                    attentionWhenCollapsed={pendingClients + pendingSuppliers > 0}
                    {...{ collapsed, forceExpanded }}
                  >
                    {navConfig.management.common.map(renderNavItem)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    activeSection={activeSection}
                    attentionWhenCollapsed={
                      pendingCarts + (txnStagesPending ? 1 : 0) > 0
                    }
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.cart)}
                    {renderNavItem(navConfig.management.itemPurchasing)}
                    {renderNavItem(navConfig.management.archive)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    activeSection={activeSection}
                    // The RECORDS section hides Inventory — its Pending
                    // JEV alarm blinks on the header while collapsed.
                    attentionWhenCollapsed={pendingJev > 0}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.inventory)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.accounting}
                    activeSection={activeSection}
                    {...{ collapsed, forceExpanded }}
                  >
                    {navConfig.management.accounting.map(renderNavItem)}
                  </SectionGroup>
                </>
              )}

              {isProcurement && (
                <>
                  <SectionGroup
                    label={SECTION_LABELS.management}
                    activeSection={activeSection}
                    attentionWhenCollapsed={false}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[1])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    activeSection={activeSection}
                    attentionWhenCollapsed={txnStagesPending}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.archive)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    activeSection={activeSection}
                    attentionWhenCollapsed={false}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.inventory)}
                  </SectionGroup>
                </>
              )}

              {isAccountOfficer && (
                <>
                  <SectionGroup
                    label={SECTION_LABELS.management}
                    activeSection={activeSection}
                    attentionWhenCollapsed={false}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[2])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    activeSection={activeSection}
                    attentionWhenCollapsed={txnStagesPending}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.itemPurchasing)}
                    {renderNavItem(navConfig.management.archive)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    activeSection={activeSection}
                    // The RECORDS section hides Inventory — its Pending
                    // JEV alarm blinks on the header while collapsed.
                    attentionWhenCollapsed={pendingJev > 0}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.inventory)}
                  </SectionGroup>

                  {/* NO Accounting — vouchers and journals are finance's
                      realm; the Account Officer and AO Team Leader get no
                      accounting section at all. */}
                </>
              )}

              {isFinanceOfficer && (
                <>
                  <SectionGroup
                    label={SECTION_LABELS.management}
                    activeSection={activeSection}
                    attentionWhenCollapsed={pendingSuppliers > 0}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[2])}
                    {renderNavItem(navConfig.management.common[3])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    activeSection={activeSection}
                    attentionWhenCollapsed={pendingCarts > 0}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.itemPurchasing)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    activeSection={activeSection}
                    // The RECORDS section hides Inventory — its Pending
                    // JEV alarm blinks on the header while collapsed.
                    attentionWhenCollapsed={pendingJev > 0}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.inventory)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.accounting}
                    activeSection={activeSection}
                    {...{ collapsed, forceExpanded }}
                  >
                    {navConfig.management.accounting.map(renderNavItem)}
                  </SectionGroup>
                </>
              )}
            </>
          )}
        </div>

        <UpDownIndicatorWidget
          scrollRef={bodyScrollRef}
          direction="down"
          arrowSize={14}
          watch={[isLoading, collapsed, forceExpanded]}
        />
      </div>

      {/* FOOTER — fixed at bottom (its height is measured by the
          scroll-reveal, which keeps the active row clear of it) */}
      <div
        ref={footerShellRef}
        className="flex-shrink-0 w-full border-t"
        style={{
          backgroundColor: colors.surfaceBg,
          borderColor: colors.borderColor,
        }}
      >
        <SidebarFooter
          collapsed={collapsed}
          forceExpanded={forceExpanded}
          toggleCollapse={toggleCollapse}
        />
      </div>
    </div>
  );
};

export default SidebarContent;
