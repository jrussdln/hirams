import React from "react";
import useSettings from "./useSettings";
import SettingsView from "./SettingsView";

export default function Settings() {
  const props = useSettings();
  return <SettingsView {...props} />;
}
