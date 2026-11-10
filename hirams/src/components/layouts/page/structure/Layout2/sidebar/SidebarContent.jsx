import React, { useEffect, useMemo, useRef } from "react";
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
const SectionGroup = ({ label, collapsed, forceExpanded, activeSection, children }) => {
  const [open, toggle] = useSectionToggle(label, label === activeSection);
  // The title is dropped in icon-rail mode — the items must stay visible.
  const titleVisible = !(collapsed && !forceExpanded);

  return (
    <div className="flex flex-col w-full">
      <SectionHeader
        label={label}
        open={open}
        onToggle={toggle}
        collapsed={collapsed}
        forceExpanded={forceExpanded}
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
    loading: isLoading,
  } = useKeysLabels();

  const navConfig = buildNavItems();

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
                    {...{ collapsed, forceExpanded }}
                  >
                    {navConfig.management.common.map(renderNavItem)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    activeSection={activeSection}
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
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[1])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    activeSection={activeSection}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.archive)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    activeSection={activeSection}
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
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[2])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    activeSection={activeSection}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.itemPurchasing)}
                    {renderNavItem(navConfig.management.archive)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    activeSection={activeSection}
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
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[2])}
                    {renderNavItem(navConfig.management.common[3])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    activeSection={activeSection}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.itemPurchasing)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    activeSection={activeSection}
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
