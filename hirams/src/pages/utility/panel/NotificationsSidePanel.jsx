import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import NotificationsBody from "../../../components/ui/menu/shared/NotificationsBody";
import PageRightPanel from "../../../components/ui/panel/PageRightPanel";

const PANEL_WIDTH = 360;

/**
 * NotificationsSidePanel
 *
 * The notifications VIEW-ALL surface â€” a right-side sliding column that
 * squeezes the page content the same way the AI chatbot does: an inline
 * flex sibling inside the content row (not an overlay). Opening is
 * driven by the `open_notifications_panel` window event, which the bell
 * dropdown's â€œView all notificationsâ€ footer dispatches.
 *
 * Mount once inside the content row (Layout2), right where the
 * AIChatbotWidget sits so both panels share the row. The sliding chrome
 * (width transition, border, surface) lives in PageRightPanel; this
 * file only owns the open/close event wiring.
 */
export default function NotificationsSidePanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      window.dispatchEvent(new CustomEvent("close_print_preview_panel"));
    };
    const onClosePrint = () => setOpen(false);
    window.addEventListener("open_notifications_panel", onOpen);
    window.addEventListener("open_print_preview_panel", onClosePrint);
    return () => {
      window.removeEventListener("open_notifications_panel", onOpen);
      window.removeEventListener("open_print_preview_panel", onClosePrint);
    };
  }, []);

  // The AI chatbot shares this row of the content area â€” tell it when the
  // notifications panel goes away so its floating button comes back.
  const closePanel = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("close_notifications_panel"));
  };

  return (
    <PageRightPanel open={open} width={PANEL_WIDTH}>
      <Box
        sx={{
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <NotificationsBody variant="panel" onClose={closePanel} />
      </Box>
    </PageRightPanel>
  );
}
