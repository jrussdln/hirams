import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import {
  PersonOutlined,
  PersonAddOutlined,
  SearchOutlined,
  CloseOutlined,
} from "@mui/icons-material";
import SupplierContactAPI from "../../../../api/endpoints/supplier-contact.api.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ── Theme Color Map — ONLY uses tokens from getThemeColors ──
// (same tokens the option modals use, so the picker blends into either one)
const useColors = (c) => ({
  border: c.slate.border,
  borderFocus: c.blue.borderStrong,
  borderError: c.red.borderStrong,
  bgPaper: c.slate.outerBg,
  // mutedBg always resolves, so the old isDark fallback branch was dead code
  bgSoft: c.slate.mutedBg,
  bgInput: c.gray.inputBg,
  // colour only — geometry stays at the usage site
  shadowColor: c.shadow.popover,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
  textMuted: c.gray.textMuted,
  primary: c.blue.textStrong,
  primaryBg: c.blue.bg,
  hoverBg: c.slate.hover,
  success: c.green.text,
  successDark: c.green.textDark,
  successBg: c.green.bg,
  successBgSoft: c.green.bgSoft,
  error: c.red.text,
  // foreground on the SOLID green "Save Contact" gradient (dark mode's green
  // fill is the lighter seed, so the ink flips to near-black there)
  successOnFill: c.green.textOnFill,
  // loading bar sweep — plain neutrals
  shimmerBar: c.skeleton.shimmerBar,
});

/**
 * Supplier-contact picker (search + pick, or add a new contact inline).
 *
 * Controlled: the selected contact id lives in the parent form as
 * `nSupplierContactId` — this component only renders it and calls onChange.
 * Shared by NewOptionModal and GetSuggestionsModal so both stay in sync.
 *
 * @param supplierId  the supplier whose contacts are listed
 * @param value       current nSupplierContactId ("" / null = none)
 * @param onChange    (nSupplierContactId) => void
 * @param error       validation message, if any
 */
export default function SupplierContactField({
  supplierId,
  value,
  onChange,
  error,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const baseColors = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useColors(baseColors);

  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [newContact, setNewContact] = useState({
    strName: "",
    strNumber: "",
    strPosition: "",
    strDepartment: "",
  });
  const [contactSaving, setContactSaving] = useState(false);
  const contactRef = useRef(null);

  // ── Load this supplier's contacts; restore the previously picked one ──
  useEffect(() => {
    if (!supplierId) {
      setContacts([]);
      setSelectedContact(null);
      setContactSearch("");
      setShowContactDropdown(false);
      return;
    }

    let active = true;
    setContactsLoading(true);
    setSelectedContact(null);
    setContactSearch("");

    SupplierContactAPI.getBySupplier(supplierId)
      .then((res) => {
        if (!active) return;
        const list = res.contacts || [];
        setContacts(list);

        if (value) {
          const match = list.find(
            (c) => c.nSupplierContactId === Number(value),
          );
          if (match) {
            setSelectedContact(match);
            setContactSearch(`${match.strName} — ${match.strNumber}`);
          }
        }
      })
      .catch(() => active && setContacts([]))
      .finally(() => active && setContactsLoading(false));

    return () => {
      active = false;
    };
    // Intentionally keyed on the supplier only — `value` is restored above on
    // load, and re-running on every selection would wipe the search text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  // ── Close the dropdown when clicking outside ──
  useEffect(() => {
    const handler = (e) => {
      if (contactRef.current && !contactRef.current.contains(e.target))
        setShowContactDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSaveNewContact = async () => {
    if (!newContact.strName.trim() || !newContact.strNumber.trim()) return;
    setContactSaving(true);
    try {
      const res = await SupplierContactAPI.createContact({
        nSupplierId: supplierId,
        strName: newContact.strName.trim(),
        strNumber: newContact.strNumber.trim(),
        strPosition: newContact.strPosition.trim() || null,
        strDepartment: newContact.strDepartment.trim() || null,
      });
      const created = res.supplier_contact;
      setContacts((prev) => [...prev, created]);
      setSelectedContact(created);
      setContactSearch(`${created.strName} — ${created.strNumber}`);
      onChange?.(created.nSupplierContactId);
      setShowAddContact(false);
      setNewContact({
        strName: "",
        strNumber: "",
        strPosition: "",
        strDepartment: "",
      });
    } catch {
      // keep the form open so the user can retry
    } finally {
      setContactSaving(false);
    }
  };

  const noSupplier = !supplierId;

  if (showAddContact) {
    return (
      <Box
        sx={{
          border: `0.5px solid ${colors.border}`,
          borderRadius: "10px",
          overflow: "hidden",
          bgcolor: colors.bgPaper,
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            background: `linear-gradient(135deg, ${colors.successBg} 0%, ${colors.successBgSoft} 100%)`,
            borderBottom: `0.5px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <PersonAddOutlined
            sx={{ fontSize: "0.8rem", color: colors.successDark }}
          />
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: colors.successDark,
            }}
          >
            Add New Contact
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Box
            onClick={() => {
              setShowAddContact(false);
              setNewContact({
                strName: "",
                strNumber: "",
                strPosition: "",
                strDepartment: "",
              });
            }}
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              p: 0.25,
              borderRadius: "4px",
              "&:hover": { bgcolor: colors.hoverBg },
            }}
          >
            <CloseOutlined
              sx={{ fontSize: "0.75rem", color: colors.textMuted }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {[
            {
              key: "strName",
              label: "Contact Name",
              placeholder: "e.g. Juan Dela Cruz",
            },
            {
              key: "strNumber",
              label: "Contact Number",
              placeholder: "e.g. 09171234567",
            },
            {
              key: "strPosition",
              label: "Position",
              placeholder: "e.g. Purchasing Officer",
            },
            {
              key: "strDepartment",
              label: "Department",
              placeholder: "e.g. Procurement",
            },
          ].map(({ key, label, placeholder }) => (
            <Box key={key}>
              <Typography
                sx={{
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  mb: 0.4,
                }}
              >
                {label}
              </Typography>
              <input
                value={newContact[key]}
                onChange={(e) =>
                  setNewContact((p) => ({ ...p, [key]: e.target.value }))
                }
                placeholder={placeholder}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: "7px",
                  padding: "6px 10px",
                  fontSize: "0.72rem",
                  color: colors.textPrimary,
                  background: colors.bgInput,
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = colors.success)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = colors.border)
                }
              />
            </Box>
          ))}

          <Box
            onClick={contactSaving ? undefined : handleSaveNewContact}
            sx={{
              mt: 0.5,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "7px",
              background:
                !newContact.strName.trim() || !newContact.strNumber.trim()
                  ? colors.bgSoft
                  : `linear-gradient(135deg, ${colors.success} 0%, ${colors.successDark} 100%)`,
              cursor:
                !newContact.strName.trim() || !newContact.strNumber.trim()
                  ? "not-allowed"
                  : contactSaving
                    ? "wait"
                    : "pointer",
              transition: "all 0.15s",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color:
                  !newContact.strName.trim() || !newContact.strNumber.trim()
                    ? colors.textMuted
                    : colors.successOnFill,
              }}
            >
              {contactSaving ? "Saving..." : "Save Contact"}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  const filtered = contactSearch.trim()
    ? contacts.filter(
        (c) =>
          c.strName.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.strNumber.toLowerCase().includes(contactSearch.toLowerCase()),
      )
    : contacts;
  const hasMatch = filtered.length > 0;

  return (
    <Box ref={contactRef} sx={{ position: "relative" }}>
      <Typography
        sx={{
          fontSize: "0.58rem",
          fontWeight: 700,
          color: error ? colors.error : colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          mb: 0.4,
        }}
      >
        Supplier Contact
      </Typography>

      {contactsLoading ? (
        <Box
          sx={{
            height: 34,
            borderRadius: "7px",
            background: colors.shimmerBar,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.2s infinite",
            "@keyframes shimmer": {
              "0%": { backgroundPosition: "200% 0" },
              "100%": { backgroundPosition: "-200% 0" },
            },
          }}
        />
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              border: `0.5px solid ${
                error
                  ? colors.borderError
                  : noSupplier
                    ? colors.border
                    : showContactDropdown
                      ? colors.borderFocus
                      : colors.border
              }`,
              borderRadius: "7px",
              background: noSupplier ? colors.bgSoft : colors.bgInput,
              px: 1,
              height: 34,
              gap: 0.5,
              transition: "border-color 0.15s",
            }}
          >
            {selectedContact ? (
              <PersonOutlined
                sx={{
                  fontSize: "0.8rem",
                  color: colors.primary,
                  flexShrink: 0,
                }}
              />
            ) : (
              <SearchOutlined
                sx={{
                  fontSize: "0.8rem",
                  color: error ? colors.error : colors.textMuted,
                  flexShrink: 0,
                }}
              />
            )}
            <input
              disabled={noSupplier}
              value={contactSearch}
              placeholder={
                noSupplier
                  ? "Select a supplier first"
                  : "Search contact..."
              }
              onChange={(e) => {
                setContactSearch(e.target.value);
                setShowContactDropdown(true);
                if (!e.target.value) {
                  setSelectedContact(null);
                  onChange?.("");
                }
              }}
              onFocus={() => setShowContactDropdown(true)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.72rem",
                color: colors.textPrimary,
                cursor: noSupplier ? "not-allowed" : "text",
              }}
            />
            {selectedContact && (
              <Box
                onClick={() => {
                  setSelectedContact(null);
                  setContactSearch("");
                  onChange?.("");
                }}
                sx={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  "&:hover": { opacity: 0.7 },
                }}
              >
                <CloseOutlined
                  sx={{ fontSize: "0.7rem", color: colors.textMuted }}
                />
              </Box>
            )}
          </Box>

          {showContactDropdown && !noSupplier && (
            <Box
              sx={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 1400,
                background: colors.bgPaper,
                border: `0.5px solid ${colors.border}`,
                borderRadius: "8px",
                boxShadow: `0 4px 16px ${colors.shadowColor}`,
                overflow: "hidden",
                maxHeight: 180,
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 3 },
                "&::-webkit-scrollbar-thumb": {
                  background: colors.border,
                  borderRadius: 3,
                },
              }}
            >
              {hasMatch ? (
                filtered.map((c) => (
                  <Box
                    key={c.nSupplierContactId}
                    onMouseDown={() => {
                      setSelectedContact(c);
                      setContactSearch(`${c.strName} — ${c.strNumber}`);
                      onChange?.(c.nSupplierContactId);
                      setShowContactDropdown(false);
                    }}
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      cursor: "pointer",
                      "&:hover": { bgcolor: colors.primaryBg },
                      borderBottom: `0.5px solid ${colors.border}`,
                    }}
                  >
                    <PersonOutlined
                      sx={{
                        fontSize: "0.75rem",
                        color: colors.primary,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          color: colors.textPrimary,
                          lineHeight: 1.2,
                        }}
                      >
                        {c.strName}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.58rem",
                          color: colors.textSecondary,
                          lineHeight: 1.2,
                        }}
                      >
                        {c.strNumber}
                        {(c.strPosition || c.strDepartment) && (
                          <Box
                            component="span"
                            sx={{ color: colors.textMuted, ml: 0.5 }}
                          >
                            ·{" "}
                            {[c.strPosition, c.strDepartment]
                              .filter(Boolean)
                              .join(", ")}
                          </Box>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Box
                  sx={{
                    px: 1.25,
                    py: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.75,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      color: colors.textMuted,
                      textAlign: "center",
                    }}
                  >
                    No contact found
                    {contactSearch ? ` for "${contactSearch}"` : ""}
                  </Typography>
                  <Box
                    onMouseDown={() => {
                      setShowContactDropdown(false);
                      setShowAddContact(true);
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.4,
                      px: 1,
                      py: 0.4,
                      borderRadius: "6px",
                      background: `linear-gradient(135deg, ${colors.successBg} 0%, ${colors.successBgSoft} 100%)`,
                      border: `0.5px solid ${colors.success}`,
                      cursor: "pointer",
                      "&:hover": { bgcolor: colors.successBgSoft },
                    }}
                  >
                    <PersonAddOutlined
                      sx={{
                        fontSize: "0.7rem",
                        color: colors.successDark,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: colors.successDark,
                      }}
                    >
                      Add Contact
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </>
      )}

      {error && (
        <Typography
          sx={{
            fontSize: "0.58rem",
            color: colors.error,
            mt: 0.4,
            ml: 0.25,
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
