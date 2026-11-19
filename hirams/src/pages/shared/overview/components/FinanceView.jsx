// ─── Finance dashboard ───────────────────────────────────────────────────────
// Body of the dashboard for the Finance Officer role. Dashboard.jsx renders the
// welcome banner and mounts this component underneath it, so anything added
// here shows up between the banner and the page footer.
//
// Finance's Needs Attention — the shared banner, scoped to what finance
// acts on: purchase-order carts, suppliers at "For Approval", and
// Pending JEV inventory (clients are purely management's alarm).
import { Box } from "@mui/material";
import useAttentionItems from "../../../../hooks/useAttentionItems";
import NeedsAttentionBanner from "./NeedsAttentionBanner";

export default function FinanceView() {
  // Finance's slice of the alarm: suppliers (shared approval with
  // management), purchase-order carts, and Pending JEV inventory.
  // Clients are purely management's call.
  const attentionItems = useAttentionItems(["suppliers", "carts", "jev"]);

  return (
    <div className="space-y-6">
      <Box>
        <NeedsAttentionBanner items={attentionItems} />
      </Box>
    </div>
  );
}
