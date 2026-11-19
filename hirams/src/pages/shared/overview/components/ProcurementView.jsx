// ─── Procurement dashboard ───────────────────────────────────────────────────
// Body of the dashboard for the Procurement role. Dashboard.jsx renders the
// welcome banner and mounts this component underneath it, so anything added
// here shows up between the banner and the page footer.
//
// The Procurement's Needs Attention — Price Verification and Price Approval.
import { Box } from "@mui/material";
import useAttentionItems from "../../../../hooks/useAttentionItems";
import NeedsAttentionBanner from "./NeedsAttentionBanner";

export default function ProcurementView() {
  const attentionItems = useAttentionItems([
    "txn-verif",
    "price-verif",
  ]);

  return (
    <div className="space-y-6">
      <Box>
        <NeedsAttentionBanner items={attentionItems} />
      </Box>
    </div>
  );
}
