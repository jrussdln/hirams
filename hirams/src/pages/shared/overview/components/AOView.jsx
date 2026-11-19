// ─── Account Officer dashboard ───────────────────────────────────────────────
// Body of the dashboard for the Account Officer role. Dashboard.jsx renders the
// welcome banner and mounts this component underneath it, so anything added
// here shows up between the banner and the page footer.
//
// The AO's Needs Attention — Pending JEV inventory groups and assigned
// transaction decision stages (For Assignment, Items Verification, Canvas Verification).
import { Box } from "@mui/material";
import useAttentionItems from "../../../../hooks/useAttentionItems";
import NeedsAttentionBanner from "./NeedsAttentionBanner";

export default function AOView() {
  const attentionItems = useAttentionItems([
    "jev",
    "for-assign",
    "items-verif",
    "canvas-verif",
  ]);

  return (
    <div className="space-y-6">
      <Box>
        <NeedsAttentionBanner items={attentionItems} />
      </Box>
    </div>
  );
}
