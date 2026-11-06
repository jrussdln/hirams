import React from "react";
import { Box } from "@mui/material";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import BaseButton from "../form/BaseButton.jsx";

export default function PrintPreviewPageFooter({
  printControls,
  side = "right",
}) {
  if (!printControls) {
    return null;
  }

  const { viewMode, setViewMode, panelOpen, setPanelOpen } = printControls;

  // PrintPreview already opens/closes the panel when viewMode changes,
  // so we only need to switch the view here.
  const handleToggleView = () => {
    setViewMode(viewMode === "print" ? "normal" : "print");
  };

  const handleTogglePanel = () => {
    setPanelOpen((v) => !v);
  };

  // LEFT slot — only the view-mode toggle. In print view this shows
  // "Back Normal View" in the footer, replacing the page's Back button.
  if (side === "left") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <BaseButton
          icon={<ArrowBackOutlined />}
          label="Back"
          onClick={handleToggleView}
          actionColor="default"
        />
      </Box>
    );
  }

  // RIGHT slot — Menu button, plus the "Go Print View" toggle but only in
  // normal view (in print view the toggle lives on the left side instead).
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      {viewMode === "normal" && (
        <BaseButton
          icon={<PrintOutlined />}
          label="Go Print View"
          onClick={handleToggleView}
          actionColor="default"
        />
      )}

      <BaseButton
        icon={panelOpen ? <CloseOutlined /> : <MenuOutlined />}
        label={panelOpen ? "Close Menu" : "Menu"}
        onClick={handleTogglePanel}
        actionColor="default"
      />
    </Box>
  );
}
