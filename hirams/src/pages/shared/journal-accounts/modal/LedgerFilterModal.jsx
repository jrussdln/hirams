import React, { useEffect, useState, useMemo } from "react";

import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import {
  FilterDateFields,
  quickRange,
} from "../../../../components/ui/form/FilterDate.jsx";
import CompanyAPI from "../../../../api/endpoints/company.api.js";
import { Box, Typography, MenuItem, Select, FormControl } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

/**
 * Date filter shown BEFORE the account report opens.
 *
 * Clicking "Ledger" on a row in JournalAccountPanel opens this modal
 * first; its body is the very same content <FilterDate> uses — the
 * Today / Yesterday / This ▾ quick picks over an always-visible From / To
 * row. "Today" is pre-selected when nothing has been applied yet (or after
 * Back reset the window); the previously applied range wins when there is
 * one. Nothing is committed until "Apply", which hands the chosen range
 * back through onApply({ from, to, quick }) — the caller then opens
 * LedgerPanel with it. "Cancel" leaves the report closed.
 *
 *   <LedgerFilterModal
 *     open={filterOpen}
 *     value={dateRange}
 *     onClose={closeFilter}
 *     onApply={openReport}
 *   />
 */
function LedgerFilterModal({ open, onClose, value = null, onApply }) {
  const [draft, setDraft] = useState(() => {
    const [from, to] = quickRange("month");
    return { from, to, quick: "month", companyIds: ["all"] };
  });
  const [companies, setCompanies] = useState([]);
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsCompanyExpanded(false);
    CompanyAPI.getAll()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res.companies || res.data || []);
        setCompanies(list);
      })
      .catch((err) => {
        console.error("Failed to load companies in filter modal:", err);
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (value?.from || value?.to || value?.quick) {
      setDraft({
        from: value.from || "",
        to: value.to || "",
        quick: value.quick ?? null,
        companyIds: value.companyIds ?? ["all"],
      });
    } else {
      const [from, to] = quickRange("month");
      setDraft({
        from,
        to,
        quick: "month",
        companyIds: value?.companyIds ?? ["all"],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const patchDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const handleApply = () => {
    onApply?.({
      from: draft.from || null,
      to: draft.to || null,
      quick: draft.quick,
      companyIds: draft.companyIds,
    });
  };

  const handleToggleCompany = (id) => {
    setDraft((prev) => {
      let nextIds = [...(prev.companyIds || [])];
      if (id === "all") {
        return { ...prev, companyIds: ["all"] };
      }
      
      // Remove "all" if selecting a specific company
      nextIds = nextIds.filter((x) => x !== "all");

      if (nextIds.includes(id)) {
        nextIds = nextIds.filter((x) => x !== id);
      } else {
        nextIds.push(id);
      }

      if (nextIds.length === 0) {
        nextIds = ["all"];
      }

      return { ...prev, companyIds: nextIds };
    });
  };

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title="Ledger Filter"
      subTitle="Choose the date range and companies"
      onSave={handleApply}
      saveLabel="Apply"
      cancelLabel="Cancel"
      width={540}
    >
      <FilterDateFields
        from={draft.from}
        to={draft.to}
        quick={draft.quick}
        onPatch={patchDraft}
      />

      {/* Filter by Company */}
      <Box sx={{ mt: 2.5 }}>
        <Box
          onClick={() => setIsCompanyExpanded((prev) => !prev)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            mb: 0.8,
            userSelect: "none",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "text.secondary",
              letterSpacing: "0.5px",
            }}
          >
            Filter by Company
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              color: "text.secondary",
            }}
          >
            {isCompanyExpanded ? (
              <ExpandLess sx={{ fontSize: "1rem" }} />
            ) : (
              <ExpandMore sx={{ fontSize: "1rem" }} />
            )}
          </Box>
        </Box>
        {isCompanyExpanded && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.75,
              maxHeight: 120,
              overflowY: "auto",
              p: 0.5,
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => handleToggleCompany("all")}
              sx={(theme) => ({
                px: 1.25,
                py: 0.5,
                borderRadius: "6px",
                border: `1px dashed ${
                  draft.companyIds?.includes("all")
                    ? theme.palette.primary.main
                    : theme.palette.divider
                }`,
                background: draft.companyIds?.includes("all")
                  ? theme.palette.action.selected
                  : "transparent",
                color: draft.companyIds?.includes("all")
                  ? theme.palette.primary.main
                  : theme.palette.text.primary,
                fontSize: "0.7rem",
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": { background: theme.palette.action.hover },
              })}
            >
              All
            </Box>
            {/* No Company — journals whose JEV can't be tied to any company
                (no resolvable nCompanyId anywhere in its payload). Same
                pseudo-option mechanics as "all": toggled by its "none"
                sentinel id, and it may be combined with real companies. */}
            <Box
              component="button"
              type="button"
              onClick={() => handleToggleCompany("none")}
              sx={(theme) => ({
                px: 1.25,
                py: 0.5,
                borderRadius: "6px",
                border: `1px dashed ${
                  draft.companyIds?.includes("none")
                    ? theme.palette.primary.main
                    : theme.palette.divider
                }`,
                background: draft.companyIds?.includes("none")
                  ? theme.palette.action.selected
                  : "transparent",
                color: draft.companyIds?.includes("none")
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
                fontSize: "0.7rem",
                fontWeight: 600,
                fontStyle: "italic",
                cursor: "pointer",
                "&:hover": { background: theme.palette.action.hover },
              })}
            >
              No Company
            </Box>
            {companies.map((c) => {
              const id = c.nCompanyId ?? c.id;
              const active = draft.companyIds?.includes(id);
              const name = c.strCompanyNickName || c.strCompanyName || `Company #${id}`;
              return (
                <Box
                  key={id}
                  component="button"
                  type="button"
                  onClick={() => handleToggleCompany(id)}
                  sx={(theme) => ({
                    px: 1.25,
                    py: 0.5,
                    borderRadius: "6px",
                    border: `1px dashed ${
                      active ? theme.palette.primary.main : theme.palette.divider
                    }`,
                    background: active
                      ? theme.palette.action.selected
                      : "transparent",
                    color: active
                      ? theme.palette.primary.main
                      : theme.palette.text.primary,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    "&:hover": { background: theme.palette.action.hover },
                  })}
                >
                  {name}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </ModalContainer>
  );
}

export default LedgerFilterModal;