import React from "react";
import ReactDOM from "react-dom/client";
import Swal from "sweetalert2";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { SwalMessages } from "./swalMessages";
import DotSpinner from "../../components/ui/loader/DotSpinner";
import getThemeColors from "../style/getThemeColors";

const replaceVariables = (str, variables) =>
  Object.keys(variables).reduce(
    (s, key) => s.replace(new RegExp(`{${key}}`, "g"), variables[key]),
    str,
  );

const actionPastMap = {
  add: "added",
  adding: "added",
  save: "saved",
  saving: "saved",
  apply: "applied",
  applying: "applied",
  update: "updated",
  updating: "updated",
  delete: "deleted",
  deleting: "deleted",
  process: "processed",
  processing: "processed",
  verify: "verified",
  verifying: "verified",
  finalize: "finalized",
  finalizing: "finalized",
  revert: "reverted",
  reverting: "reverted",
  assign: "assigned",
  assigning: "assigned",
  reassign: "reassigned",
  reassigning: "reassigned",
  register: "registered",
  registering: "registered",
  export: "exported",
  exporting: "exported",
};

// FIX: replaces the long if-else chain with a single loop
const inferActionFromKey = (key) => {
  const upper = key.toUpperCase();
  const match = Object.keys(actionPastMap).find((k) =>
    upper.includes(k.toUpperCase()),
  );
  return match ? actionPastMap[match] : "completed";
};

// ── Dark mode detection ──────────────────────────────────────────────────
// Swal.fire() renders outside React entirely, and the spinner root gets
// mounted via a fresh createRoot() with no ThemeProvider ancestor — so
// neither of them can just call useTheme() and get the app's real theme.
//
// This app's mode lives in ThemeModeProvider (src/context/ThemeModeContext),
// which persists it to localStorage under THEME_STORAGE_KEY below and
// reads/writes nowhere else — there's no DOM class/attribute mirroring it.
// That's why the old DOM-based checks always fell through to the OS-level
// prefers-color-scheme media query instead of the actual in-app toggle.
const THEME_STORAGE_KEY = "app-theme-mode"; // must match ThemeModeContext.jsx's STORAGE_KEY

const isDarkMode = () => {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark") return true;
    if (saved === "light") return false;
  }
  // Fallback only for the first render before ThemeModeProvider has ever
  // written to storage (mirrors ThemeModeContext's own initial-state logic).
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
};

// Build the spinner's theme from a plain mode-based MUI theme so
// DotSpinner picks up sensible light/dark defaults without depending on
// the app's full design-token setup.
const spinnerTheme = (dark) =>
  createTheme({ palette: { mode: dark ? "dark" : "light" } });

const mountSpinner = (message) => {
  const el = document.getElementById("swal-spinner-root");
  if (!el) return null;
  const dark = isDarkMode();
  const root = ReactDOM.createRoot(el);
  root.render(
    <ThemeProvider theme={spinnerTheme(dark)}>
      <DotSpinner message loadingMessage={message} messageCycle={false} />
    </ThemeProvider>,
  );
  return root;
};

const spinnerConfig = (onOpen, onClose) => {
  const dark = isDarkMode();
  const colors = getThemeColors(dark);
  return {
    title: "",
    html: `<div id="swal-spinner-root" style="display:flex;justify-content:center;align-items:center;padding:10px;"></div>`,
    showConfirmButton: false,
    allowOutsideClick: false,
    // Themes the popup shell itself — Swal doesn't know about MUI/dark
    // mode at all, so without this it stays white regardless of the app.
    background: colors.swal.popupBg,
    color: colors.gray.textPrimary,
    didOpen: onOpen,
    ...(onClose ? { willClose: onClose } : {}),
  };
};

export const showSwal = (messageKey, customOptions = {}, variables = {}) => {
  const config =
    typeof messageKey === "string"
      ? SwalMessages[messageKey.toUpperCase()] || {}
      : messageKey;

  let { title = "", text = "", ...rest } = config;

  const rawAction = variables.action;
  const action = rawAction
    ? actionPastMap[rawAction.toLowerCase()] || rawAction
    : inferActionFromKey(String(messageKey));

  title = replaceVariables(title, { ...variables, action });
  text = replaceVariables(text, { ...variables, action });

  const isAutoClose = rest.icon === "success" || rest.icon === "info";
  const dark = isDarkMode();
  const colors = getThemeColors(dark);

  return Swal.fire({
    title,
    text,
    // Same as spinnerConfig — sets a sensible dark/light default, but
    // `rest` (from SwalMessages) or `customOptions` can still override
    // these per-message if a specific call needs a different look.
    background: colors.swal.popupBg,
    color: colors.gray.textPrimary,
    ...(isAutoClose ? { timer: 500, timerProgressBar: true } : {}),
    ...rest,
    ...customOptions,
  });
};

export const showSpinner = async (text = "Loading...", minDelay = 500) => {
  Swal.fire(spinnerConfig(() => mountSpinner(text)));
  await new Promise((resolve) => setTimeout(resolve, minDelay));
};

export const withSpinner = async (entity = "Data", task) => {
  let root = null;
  Swal.fire(
    spinnerConfig(
      () => {
        root = mountSpinner(`Processing ${entity}...`);
      },
      () => {
        root?.unmount();
      },
    ),
  );
  try {
    const result = await task();
    Swal.close();
    return result;
  } catch (err) {
    Swal.close();
    throw err;
  }
};
