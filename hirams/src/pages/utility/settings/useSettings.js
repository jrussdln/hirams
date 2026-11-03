import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const VALID_TABS = ["general", "account", "users", "audit", "preferences"];

export default function useSettings() {
  const [searchParams] = useSearchParams();
  // Deep links (e.g. the profile popper header) can open a specific tab
  // via /settings?tab=account — anything unknown falls back to "account".
  const requestedTab = searchParams.get("tab");

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(
    VALID_TABS.includes(requestedTab) ? requestedTab : "account",
  );

  const handleTabChange = useCallback((_, newTab) => {
    setTab(newTab);
  }, []);

  return {
    search,
    setSearch,
    tab,
    handleTabChange,
  };
}
