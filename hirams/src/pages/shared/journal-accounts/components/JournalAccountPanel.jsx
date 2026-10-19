import React, { createContext, useContext, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Edit,
  Delete,
  Add,
  AccountBalanceOutlined,
  FlashOnOutlined,
  KeyboardArrowDown,
  KeyboardArrowUp,
  LinkOutlined,
  UnfoldMore,
  UnfoldLess,
  SearchOffOutlined,
  FolderOffOutlined,
  DragIndicator,
  AssessmentOutlined,
} from "@mui/icons-material";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import CustomSearchField from "../../../../components/ui/form/SearchField";
import BaseButton from "../../../../components/ui/form/BaseButton";
import SyncMenu from "../../../../components/ui/form/SyncMenu";
import JournalAccountAEModal from "../modal/JournalAccountAEModal";
import DeleteVerificationModal from "../../../shared/transactions/modal/DeleteVerificationModal";

import AlertStructure from "../../../../components/ui/structure/AlertStructure";
import getThemeColors from "../../../../utils/style/getThemeColors";

/* ─── Theme tokens (only what this file uses) ───────────────────────── */
const useColors = (c) => ({
  slate: {
    divider: c.slate.divider,
    mutedBg: c.slate.mutedBg,
    itemHover: c.slate.itemHover,
    hover: c.slate.hover,
    outerBg: c.slate.outerBg,
    border: c.slate.border,
  },
  violet: { bg: c.violet.bg, border: c.violet.border, text: c.violet.text },
  blue: { bg: c.blue.bg, border: c.blue.border, text: c.blue.text },
  gray: {
    pri: c.gray.textPrimary,
    sec: c.gray.textSecondary,
    muted: c.gray.textMuted,
  },
  amber: { text: c.amber.text, bg: c.amber.bg, border: c.amber.border },
  teal: { text: c.teal.text, bg: c.teal.bg, border: c.teal.border },
  green: { text: c.green.text, bg: c.green.bg },
  red: { text: c.red.text, bg: c.red.bg },
});

/* ─── Helpers ───────────────────────────────────────────────────────── */
const countNodes = (nodes = []) =>
  nodes.reduce((n, x) => n + 1 + countNodes(x.children), 0);

// id -> { node, parentId } for the whole tree
const indexTree = (nodes, parentId = null, map = {}) => {
  nodes.forEach((n) => {
    map[n.id] = { node: n, parentId };
    indexTree(n.children, n.id, map);
  });
  return map;
};

const collectDescendantIds = (node, out = new Set()) => {
  node.children.forEach((child) => {
    out.add(child.id);
    collectDescendantIds(child, out);
  });
  return out;
};

// Shared drag state so rows don't need extra props threaded through the tree
const DragCtx = createContext({
  activeId: null,
  invalidIds: new Set(),
  locked: false,
});

const Highlight = ({ text, query, colors }) => {
  const value = String(text ?? "");
  const q = query?.trim();
  if (!q) return value;
  const i = value.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return value;
  return (
    <>
      {value.slice(0, i)}
      <Box
        component="mark"
        sx={{
          bgcolor: colors.amber.bg,
          color: colors.amber.text,
          borderRadius: "2px",
          px: "1px",
        }}
      >
        {value.slice(i, i + q.length)}
      </Box>
      {value.slice(i + q.length)}
    </>
  );
};

const ActionButton = ({ label, color, hoverBg, onClick, children }) => (
  <Tooltip title={label} arrow placement="top">
    <IconButton
      size="small"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{
        width: 26,
        height: 26,
        color,
        "&:hover": { bgcolor: hoverBg },
      }}
    >
      {children}
    </IconButton>
  </Tooltip>
);

const Chip = ({ tone, colors, icon, children }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.3,
      px: 0.6,
      py: 0.1,
      borderRadius: "50px",
      fontSize: "0.55rem",
      fontWeight: 600,
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      color: colors[tone].text,
      background: colors[tone].bg,
      border: `0.5px solid ${colors[tone].border ?? colors[tone].text}`,
    }}
  >
    {icon}
    {children}
  </Box>
);

// "1,234.00" / "-1,234.00" — negatives keep the sign; colour comes from isNeg.
// Same formatting AccountReportPanel uses, so both views agree on the number.
const formatBalance = (net) => {
  const isNeg = net < 0;
  const value = Math.abs(net).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  });
  return { text: `${isNeg ? "-" : ""}${value}`, isNeg };
};

/* ─── Tree node ─────────────────────────────────────────────────────── */
const AccountTreeNode = ({
  node,
  depth,
  expandedIds,
  forceOpen,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  isLast,
  onViewReport,
  search,
  colors,
  entryAccountIds,
  // Remaining balance of a fund account (own entries + all its links')
  fundIds,
  balanceById,
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = hasChildren && (forceOpen || expandedIds.has(node.id));
  const canToggle = hasChildren && !forceOpen;
  const isSynced = !!node.nRecordId; // was nClientId || nSupplierId
  const hasEntries = entryAccountIds?.has(node.id) ?? false;
  // Delete only fits an account nobody depends on — anything with linked
  // accounts or JEV lines keeps it withheld (mirrors the backend guard).
  // Such a leaf is also the only row whose end slot has no chevron.
  const showDelete = !hasChildren && !hasEntries;
  const isRoot = depth === 0;
  // ── Drag & drop ──
  const { activeId, invalidIds, locked } = useContext(DragCtx);
  const canDrag = !locked; // any account type can be dragged (only blocked while searching)
  const dragHint = locked
    ? "Clear the search to move accounts"
    : "Drag onto another account to link it";
  const isDragActive = activeId != null;
  const isInvalidTarget = isDragActive && invalidIds.has(node.id);

  const {
    setNodeRef: setDragRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({ id: node.id, disabled: !canDrag });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: node.id,
    disabled: !isDragActive || isInvalidTarget,
  });
  const setRowRef = (el) => {
    setDragRef(el);
    setDropRef(el);
  };
  const isDropTarget = isOver && isDragActive && !isInvalidTarget;

  const toggle = () => canToggle && onToggle(node.id);

  return (
    <Box
      sx={{
        borderBottom:
          isRoot && !isLast ? `1px solid ${colors.slate.divider}` : "none",
      }}
    >
      <Box
        ref={setRowRef}
        role={canToggle ? "button" : undefined}
        tabIndex={canToggle ? 0 : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        sx={{
          px: 1.5,
          py: isRoot ? 1 : 0.75,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: canToggle ? "pointer" : "default",
          background: isDropTarget
            ? colors.blue.bg
            : isRoot
              ? "transparent"
              : colors.slate.mutedBg,
          opacity: isDragging
            ? 0.4
            : isDragActive && isInvalidTarget
              ? 0.55
              : 1,
          outline: isDropTarget ? `2px dashed ${colors.blue.text}` : "none",
          outlineOffset: -2,
          borderBottom: !isRoot ? `1px solid ${colors.slate.divider}` : "none",
          transition: "background .15s",
          // Same highlight for every row: nested rows rest on mutedBg, so a
          // lighter hover (slate.hover) barely showed — itemHover reads on
          // both the white root rows and the muted child rows.
          "&:hover": {
            background: colors.slate.itemHover,
          },
          "&:focus-visible": {
            outline: `2px solid ${colors.blue.text}`,
            outlineOffset: -2,
          },
        }}
      >
        <Tooltip
          title={dragHint}
          arrow
          placement="top-start"
          disableInteractive
        >
          <span style={{ display: "flex", flexShrink: 0 }}>
            <Box
              ref={canDrag ? setActivatorNodeRef : undefined}
              {...(canDrag ? attributes : {})}
              {...(canDrag ? listeners : {})}
              tabIndex={-1}
              aria-label={dragHint}
              aria-disabled={!canDrag}
              onClick={(e) => e.stopPropagation()}
              sx={{
                width: 18,
                height: 26,
                ml: -0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                color: colors.gray.muted,
                opacity: canDrag ? 1 : 0.3,
                cursor: canDrag
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : "not-allowed",
                touchAction: "none",
                "&:hover": canDrag
                  ? { background: colors.slate.hover, color: colors.gray.pri }
                  : undefined,
              }}
            >
              <DragIndicator sx={{ fontSize: "1rem" }} />
            </Box>
          </span>
        </Tooltip>

        <Box
          sx={{
            width: isRoot ? 30 : 26,
            height: isRoot ? 30 : 26,
            borderRadius: isRoot ? "7px" : "6px",
            background: isRoot ? colors.violet.bg : colors.blue.bg,
            border: `1px solid ${isRoot ? colors.violet.border : colors.blue.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AccountBalanceOutlined
            sx={{
              fontSize: isRoot ? "0.85rem" : "0.75rem",
              color: isRoot ? colors.violet.text : colors.blue.text,
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              minWidth: 0,
            }}
          >
            <Typography
              title={node.accountName}
              sx={{
                fontSize: isRoot ? "0.75rem" : "0.7rem",
                fontWeight: isRoot ? 700 : 600,
                color: colors.gray.pri,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              <Highlight
                text={node.accountName}
                query={search}
                colors={colors}
              />
            </Typography>
            {isDropTarget && (
              <Chip tone="blue" colors={colors}>
                Link here
              </Chip>
            )}
            {isSynced && (
              <Tooltip
                arrow
                placement="top"
                title="Linked to a client or supplier record."
              >
                <span>
                  <Chip
                    tone="blue"
                    colors={colors}
                    icon={<LinkOutlined sx={{ fontSize: "0.65rem" }} />}
                  >
                    Linked
                  </Chip>
                </span>
              </Tooltip>
            )}
          </Box>
          {hasChildren && (
            <Typography
              sx={{ fontSize: "0.58rem", color: colors.gray.sec, mt: 0.2 }}
            >
              {node.children.length} linked account
              {node.children.length === 1 ? "" : "s"}
            </Typography>
          )}
        </Box>
        <Box
          className="row-actions"
          sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}
        >
          <ActionButton
            label="Add sub-account"
            color={colors.green.text}
            hoverBg={colors.green.bg}
            onClick={() => onAdd(node)}
          >
            <Add sx={{ fontSize: "0.8rem" }} />
          </ActionButton>

          <ActionButton
            label="Edit"
            color={colors.blue.text}
            hoverBg={colors.blue.bg}
            onClick={() => onEdit(node)}
          >
            <Edit sx={{ fontSize: "0.8rem" }} />
          </ActionButton>

          <ActionButton
            label="Journal Entries"
            color={colors.violet.text}
            hoverBg={colors.violet.bg}
            onClick={() => onViewReport(node)}
          >
            <AssessmentOutlined sx={{ fontSize: "0.8rem" }} />
          </ActionButton>
          {/* Delete does NOT sit in this cluster — it takes the row's final
              slot (below), so these three keep one x on every row. */}
        </Box>

        {/* The row's final 26px slot: 22px circle + 4px margin. It holds the
            chevron when the node has children, and DELETE when it is a leaf
            nobody depends on — a 26px button taking the SAME total width.
            That is what keeps Add / Edit / Journal Entries on one x,
            aligned vertically down the whole tree. */}
        <Box
          aria-hidden={showDelete ? undefined : true}
          sx={{
            width: showDelete ? 26 : 22,
            height: 22,
            flexShrink: 0,
            ml: showDelete ? 0 : 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.gray.muted,
            border: showDelete ? "none" : `1px solid ${colors.slate.border}`,
            borderRadius: "50%",
            // A leaf withholds the chevron but still reserves its slot; a
            // Delete takes that same slot visibly instead.
            visibility: hasChildren || showDelete ? "visible" : "hidden",
            // forceOpen only ever dims the chevron — never a live action.
            opacity: forceOpen && !showDelete ? 0.5 : 1,
          }}
        >
          {showDelete ? (
            <ActionButton
              label="Delete"
              color={colors.red.text}
              hoverBg={colors.red.bg}
              onClick={() => onDelete(node.id, node.accountName)}
            >
              <Delete sx={{ fontSize: "0.8rem" }} />
            </ActionButton>
          ) : isExpanded ? (
            <KeyboardArrowUp sx={{ fontSize: "0.85rem" }} />
          ) : (
            <KeyboardArrowDown sx={{ fontSize: "0.85rem" }} />
          )}
        </Box>
      </Box>

      <Collapse in={isExpanded} unmountOnExit>
        {/* Guide line runs under the parent icon so hierarchy reads at a glance */}
        <Box
          sx={{
            ml: isRoot ? "27px" : "23px",
            borderLeft: `1px solid ${colors.slate.divider}`,
            background: colors.slate.mutedBg,
            // Only cap height for very large imports (e.g. flash-imported clients)
            maxHeight: node.children.length > 10 ? 360 : "none",
            overflowY: node.children.length > 10 ? "auto" : "visible",
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": {
              background: colors.slate.border,
              borderRadius: 3,
            },
          }}
        >
          {node.children.map((child, idx) => (
            <AccountTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              forceOpen={forceOpen}
              onToggle={onToggle}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewReport={onViewReport}
              isLast={idx === node.children.length - 1}
              search={search}
              colors={colors}
              entryAccountIds={entryAccountIds}
              fundIds={fundIds}
              balanceById={balanceById}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

/* ─── States ────────────────────────────────────────────────────────── */
const TreeSkeleton = ({ colors }) => (
  <Box aria-busy="true" aria-label="Loading journal accounts">
    {[0, 1, 2, 3, 4].map((i) => (
      <Box
        key={i}
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: i < 4 ? `1px solid ${colors.slate.divider}` : "none",
        }}
      >
        <Skeleton variant="rounded" width={30} height={30} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width={`${40 + ((i * 13) % 30)}%`} />
          <Skeleton variant="text" width="18%" sx={{ fontSize: "0.6rem" }} />
        </Box>
      </Box>
    ))}
  </Box>
);

const EmptyState = ({ icon, title, hint, action, colors }) => (
  <Box
    sx={{
      py: 6,
      px: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      textAlign: "center",
    }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: "12px",
        background: colors.slate.mutedBg,
        border: `1px solid ${colors.slate.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.gray.muted,
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{ fontSize: "0.8rem", fontWeight: 700, color: colors.gray.pri }}
    >
      {title}
    </Typography>
    <Typography
      sx={{ fontSize: "0.7rem", color: colors.gray.sec, maxWidth: 320 }}
    >
      {hint}
    </Typography>
    {action}
  </Box>
);

/* ─── Panel ─────────────────────────────────────────────────────────── */
// The Journal Accounts content itself — toolbar, tree, drag & drop and its
// own modals. JournalAccountsView renders this unless an account report is
// open, in which case it swaps in AccountReportPanel.
export default function JournalAccountPanel({
  search,
  setSearch,
  loading,
  accountTree,
  expandedAccountIds,
  toggleExpanded,
  // Optional — pass from the hook to enable the "Expand all / Collapse all" control
  expandAll,
  collapseAll,
  handleAdd,
  handleAddChild,
  handleEdit,
  handleDelete,
  // (node) => void — shows the account report panel for that row
  handleViewReport,
  // (draggedAccountId, targetAccountId) => Promise — links dragged under target
  handleMoveAccount,
  // JEV entry lines — an account with entries can't be deleted
  jevEntries = [],
  // JEV status key treated as "active" (cStatus) when totalling balances —
  // kept in sync with the value AccountReportPanel receives
  jevActiveKey = "A",
  // JEV status key meaning "Cancelled" — those lines never block Delete
  // (the API deletes them with the account)
  jevCancelledKey = "C",
  fetchJournalAccounts,
  isModalOpen,
  selectedAccount,
  handleModalClose,
  handleSaveSuccess,
  openDeleteModal,
  entityToDelete,
  setOpenDeleteModal,
  setEntityToDelete,
  handleDeleteSuccess,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);

  const isSearching = !!search?.trim();
  const totalAccounts = useMemo(() => countNodes(accountTree), [accountTree]);
  const hasNested = useMemo(
    () => accountTree.some((n) => n.children.length > 0),
    [accountTree],
  );
  const anyExpanded = expandedAccountIds.size > 0;
  // Accounts that carry LIVE JEV lines — they're part of the books, so the
  // Delete action is withheld from them (mirrors the backend guard). Lines
  // of a CANCELLED JEV don't block: the API deletes those WITH the account.
  const entryAccountIds = useMemo(
    () =>
      new Set(
        (jevEntries || [])
          .filter(
            (e) => String(e?.jev?.cStatus ?? "").trim() !== jevCancelledKey,
          )
          .map((e) => e?.nJournalAccountId)
          .filter((id) => id != null),
      ),
    [jevEntries, jevCancelledKey],
  );

  // ── Remaining balance per account (mirrors AccountReportPanel) ──────
  // Only entries whose JEV is still ACTIVE (jevActiveKey, i.e. cStatus
  // "A") count; each account's figure rolls up its own lines plus every
  // linked account beneath it.
  const balanceById = useMemo(() => {
    const activeStatus = String(jevActiveKey ?? "").trim() || "A";
    const sumByAccount = {};
    (jevEntries || []).forEach((e) => {
      if (String(e?.jev?.cStatus ?? "").trim() !== activeStatus) return;
      if (e?.nJournalAccountId == null) return;
      sumByAccount[e.nJournalAccountId] =
        (sumByAccount[e.nJournalAccountId] || 0) + (Number(e.dAmount) || 0);
    });

    const cache = {};
    const compute = (node) => {
      if (cache[node.id] !== undefined) return cache[node.id];
      let net = sumByAccount[node.id] || 0;
      (node.children || []).forEach((c) => {
        net += compute(c);
      });
      cache[node.id] = net;
      return net;
    };
    accountTree.forEach(compute);
    return cache;
  }, [accountTree, jevEntries, jevActiveKey]);

  // A node counts as "fund" if it or any ancestor has bIsFund true — the
  // same rule the report uses to decide which rows carry a balance.
  const fundIds = useMemo(() => {
    const ids = new Set();
    const walk = (node, inherited) => {
      const isFund = inherited || node.cAccountType === "F";
      if (isFund) ids.add(node.id);

      (node.children || []).forEach((c) => walk(c, isFund));
    };
    accountTree.forEach((n) => walk(n, false));
    return ids;
  }, [accountTree]);
  const showExpandControl =
    !loading && !isSearching && hasNested && expandAll && collapseAll;

  // ── Drag & drop state ──
  const [activeId, setActiveId] = useState(null);
  const [pendingMove, setPendingMove] = useState(null); // { dragged, target }
  const treeIndex = useMemo(() => indexTree(accountTree), [accountTree]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Can't drop on itself, on its own descendants (would create a loop),
  // or on its current parent (nothing would change).
  const invalidIds = useMemo(() => {
    if (activeId == null) return new Set();
    const entry = treeIndex[activeId];
    if (!entry) return new Set([activeId]);
    const ids = collectDescendantIds(entry.node);
    ids.add(activeId);
    if (entry.parentId != null) ids.add(entry.parentId);
    return ids;
  }, [activeId, treeIndex]);

  const dragCtx = useMemo(
    () => ({ activeId, invalidIds, locked: isSearching }),
    [activeId, invalidIds, isSearching],
  );

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || over.id === active.id) return;
    const dragged = treeIndex[active.id]?.node;
    const target = treeIndex[over.id]?.node;
    if (!dragged || !target || invalidIds.has(target.id)) return;
    setPendingMove({ dragged, target });
  };

  const confirmMove = async () => {
    const move = pendingMove;
    setPendingMove(null);
    if (!move) return;
    try {
      await handleMoveAccount?.(move.dragged.id, move.target.id);
    } catch (err) {
      // The API refuses loops / unknown parents — the drag dialog has no
      // message of its own, so it just reports what came back.
      console.error(
        err?.response?.data?.message ?? "Failed to link account.",
        err,
      );
    }
  };

  const addButton = (
    <BaseButton
      label="Journal Account"
      tooltip="Add Journal Account"
      icon={<Add />}
      onClick={handleAdd}
      actionColor="approve"
      variant="contained"
    />
  );

  return (
    <>
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Journal Account"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={fetchJournalAccounts} />
        {addButton}
      </section>

      <section>
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <DragCtx.Provider value={dragCtx}>
            <Box
              sx={{
                background: colors.slate.outerBg,
                boxShadow: isDark ? "none" : theme.shadows[1],
                border: `1px solid ${colors.slate.border}`,
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {/* Summary + tree controls */}
              {!loading && totalAccounts > 0 && (
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    background: colors.slate.mutedBg,
                    borderBottom: `1px solid ${colors.slate.divider}`,
                  }}
                >
                  <Typography
                    role="status"
                    sx={{ fontSize: "0.65rem", color: colors.gray.sec }}
                  >
                    {isSearching
                      ? `${totalAccounts} match${totalAccounts === 1 ? "" : "es"} for “${search.trim()}”`
                      : `${accountTree.length} group${accountTree.length === 1 ? "" : "s"}, ${totalAccounts} account${totalAccounts === 1 ? "" : "s"} total`}
                  </Typography>

                  {showExpandControl && (
                    <Box
                      component="button"
                      type="button"
                      onClick={anyExpanded ? collapseAll : expandAll}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.4,
                        px: 1,
                        py: 0.3,
                        borderRadius: "6px",
                        border: `1px solid ${colors.slate.border}`,
                        background: "transparent",
                        color: colors.gray.sec,
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        "&:hover": { background: colors.slate.hover },
                      }}
                    >
                      {anyExpanded ? (
                        <UnfoldLess sx={{ fontSize: "0.85rem" }} />
                      ) : (
                        <UnfoldMore sx={{ fontSize: "0.85rem" }} />
                      )}
                      {anyExpanded ? "Collapse all" : "Expand all"}
                    </Box>
                  )}
                </Box>
              )}
              {/* ✅ Scrollable tree area */}
              <Box
                sx={{
                  maxHeight: "75vh",
                  overflowY: "auto",
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-thumb": {
                    background: colors.slate.border,
                    borderRadius: 3,
                  },
                }}
              >
                {loading ? (
                  <TreeSkeleton colors={colors} />
                ) : accountTree.length === 0 ? (
                  isSearching ? (
                    <EmptyState
                      colors={colors}
                      icon={<SearchOffOutlined />}
                      title="No matching accounts"
                      hint={`Nothing matches “${search.trim()}”. Check the spelling or try a shorter name.`}
                      action={
                        <Box
                          component="button"
                          type="button"
                          onClick={() => setSearch("")}
                          sx={{
                            mt: 0.5,
                            px: 1.25,
                            py: 0.4,
                            borderRadius: "6px",
                            border: `1px solid ${colors.slate.border}`,
                            background: "transparent",
                            color: colors.blue.text,
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            "&:hover": { background: colors.blue.bg },
                          }}
                        >
                          Clear search
                        </Box>
                      }
                    />
                  ) : (
                    <EmptyState
                      colors={colors}
                      icon={<FolderOffOutlined />}
                      title="No journal accounts yet"
                      hint="Add your first account to start building the chart of accounts."
                      action={<Box sx={{ mt: 0.5 }}>{addButton}</Box>}
                    />
                  )
                ) : (
                  accountTree.map((node, idx) => (
                    <AccountTreeNode
                      key={node.id}
                      node={node}
                      depth={0}
                      expandedIds={expandedAccountIds}
                      forceOpen={isSearching}
                      onToggle={toggleExpanded}
                      onAdd={handleAddChild}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onViewReport={handleViewReport}
                      isLast={idx === accountTree.length - 1}
                      search={search}
                      colors={colors}
                      entryAccountIds={entryAccountIds}
                      fundIds={fundIds}
                      balanceById={balanceById}
                    />
                  ))
                )}
              </Box>
            </Box>
          </DragCtx.Provider>

          <DragOverlay dropAnimation={null}>
            {activeId != null && treeIndex[activeId] ? (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: "8px",
                  background: colors.slate.outerBg,
                  border: `1px solid ${colors.blue.text}`,
                  boxShadow: theme.shadows[6],
                  color: colors.gray.pri,
                  cursor: "grabbing",
                }}
              >
                <DragIndicator
                  sx={{ fontSize: "1rem", color: colors.gray.muted }}
                />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600 }}>
                  {treeIndex[activeId].node.accountName}
                </Typography>
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>

      <AlertStructure
        open={!!pendingMove}
        title="Link account"
        type="warning"
        headerTitle="Confirm link"
        confirmText="Yes, link account"
        cancelLabel="Cancel"
        message={
          <Typography sx={{ fontSize: "0.78rem", color: colors.gray.sec }}>
            Link <strong>{pendingMove?.dragged.accountName}</strong> under{" "}
            <strong>{pendingMove?.target.accountName}</strong>? Its own linked
            accounts will move with it.
          </Typography>
        }
        onConfirm={confirmMove}
        onCancel={() => setPendingMove(null)}
        onClose={() => setPendingMove(null)}
      />

      <JournalAccountAEModal
        open={isModalOpen}
        onClose={handleModalClose}
        initialData={selectedAccount}
        onSaved={handleSaveSuccess}
      />
      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={() => {
          setOpenDeleteModal(false);
          setEntityToDelete(null);
        }}
        entityToDelete={entityToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
