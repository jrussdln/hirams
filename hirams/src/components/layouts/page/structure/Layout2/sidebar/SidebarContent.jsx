import React, { useMemo, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import useKeysLabels from "../../../../../../hooks/useKeysLabels";

import SidebarHeader from "./SidebarHeader";
import SidebarFooter from "./SidebarFooter";
import SidebarItem from "./SidebarItem";
import SidebarSectionSkeleton from "../sidebar-content/skeleton/SidebarSectionSkeleton";
import SectionHeader from "../sidebar-content/SectionHeader";
import useSectionToggle from "../sidebar-content/useSectionToggle";
import { Box } from "@mui/material";

import { SECTION_LABELS } from "../../../../../../constants/navigations";
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
const SectionGroup = ({ label, collapsed, forceExpanded, children }) => {
  const [open, toggle] = useSectionToggle(label);
  // The title is dropped in icon-rail mode — the items must stay visible.
  const titleVisible = !(collapsed && !forceExpanded);

  return (
    <div className="flex flex-col w-full mb-1">
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
                    {...{ collapsed, forceExpanded }}
                  >
                    {navConfig.management.common.map(renderNavItem)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.cart)}
                    {renderNavItem(navConfig.management.itemPurchasing)}
                    {renderNavItem(navConfig.management.archive)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.inventory)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.accounting}
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
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[1])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.archive)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
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
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[2])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.itemPurchasing)}
                    {renderNavItem(navConfig.management.archive)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
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
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.common[2])}
                    {renderNavItem(navConfig.management.common[3])}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.transaction}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.transaction)}
                    {renderNavItem(navConfig.management.itemPurchasing)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.records}
                    {...{ collapsed, forceExpanded }}
                  >
                    {renderNavItem(navConfig.management.inventory)}
                  </SectionGroup>

                  <SectionGroup
                    label={SECTION_LABELS.accounting}
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

      {/* FOOTER — fixed at bottom */}
      <div
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
