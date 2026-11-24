// ─── Finance dashboard ───────────────────────────────────────────────────────
// Body of the dashboard for the Finance Officer role. Dashboard.jsx renders the
// welcome banner and mounts this component underneath it, so anything added
// here shows up between the banner and the page footer.
//
// Finance's Needs Attention — the shared banner, scoped to what finance
// acts on: purchase-order carts, suppliers at "For Approval", and
// Pending JEV inventory (clients are purely management's alarm).
//
// Finance also sees the Collectibles / Collection ledger — the same card
// management gets, with its own View All driven by the dashboard shell.
import { Box, Grid, useTheme } from "@mui/material";
import useAttentionItems from "../../../../hooks/useAttentionItems";
import NeedsAttentionBanner from "./NeedsAttentionBanner";
import useCollectiblesCollection from "./useCollectiblesCollection";
import { CollectiblesCollectionPanel } from "./ManagementView";

export default function FinanceView({ viewingAll, onViewingAllChange }) {
  // Finance's slice of the alarm: suppliers (shared approval with
  // management), purchase-order carts, and Pending JEV inventory.
  // Clients are purely management's call.
  const attentionItems = useAttentionItems(["suppliers", "carts", "jev"]);
  const theme = useTheme();
  const collectiblesData = useCollectiblesCollection();

  return (
    <div className="space-y-6">
      {!viewingAll && (
        <Box>
          <NeedsAttentionBanner items={attentionItems} />
        </Box>
      )}

      {/* Collectibles / Collection — also visible to Finance */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <CollectiblesCollectionPanel
            collectibles={collectiblesData.collectibles}
            collections={collectiblesData.collections}
            theme={theme}
            viewingAll={viewingAll}
            onViewingAllChange={onViewingAllChange}
          />
        </Grid>
      </Grid>
    </div>
  );
}
