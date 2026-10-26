import { Box, Skeleton as MSkeleton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// Mirrors JevViewPanel's chrome (slate card · header strip · the From / To
// columns and the total band they share one grid with), so swapping this
// skeleton for the loaded panel produces no layout shift or colour jump.
const useColors = (c) => ({
  outerBg: c.slate.outerBg,
  border: c.slate.border,
  divider: c.slate.divider,
  expandedBg: c.slate.expandedBg,
});

/**
 * Loading skeleton for the /jev-update page while its initial data is
 * still in flight — it dresses the page as the JEV panel it is about to
 * show instead of an opaque "Loading…" note.
 *
 * `rows` spaces out the placeholder entry rows in each From / To column.
 */
export default function Skeleton({ rows = 4 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useColors(getThemeColors(isDark));

  // Header strip: JEV number · status pill · "JOURNAL ENTRY VOUCHER ·
  // <type>" · the fold triangle.
  const header = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.5,
        py: 1.25,
      }}
    >
      <MSkeleton variant="rounded" width={110} height={16} sx={{ borderRadius: "6px" }} />
      <MSkeleton variant="rounded" width={64} height={16} sx={{ borderRadius: "50px" }} />
      <MSkeleton variant="text" width={"38%"} height={12} sx={{ borderRadius: 1 }} />
      <MSkeleton
        variant="rounded"
        width={20}
        height={20}
        sx={{ marginLeft: "auto", borderRadius: "50px", flexShrink: 0 }}
      />
    </Box>
  );

  // One From / To column: its heading, then `rows` placeholder entries
  // (account name bar + signed amount pill), then the Add Entry pill —
  // the exact anatomy JevViewPanel's columns have.
  const column = (side) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        px: 1.5,
        py: 1.5,
        ...(side === "to" && { borderLeft: `0.5px solid ${colors.divider}` }),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <MSkeleton variant="circular" width={14} height={14} />
        <MSkeleton variant="text" width={54} height={14} sx={{ borderRadius: 1 }} />
      </Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <MSkeleton
            variant="text"
            width={`${72 - (i % 3) * 14}%`}
            height={14}
            sx={{ borderRadius: 1 }}
          />
          <MSkeleton variant="rounded" width={64} height={16} sx={{ borderRadius: "6px", flexShrink: 0 }} />
        </Box>
      ))}
      <MSkeleton
        variant="rounded"
        width={86}
        height={22}
        sx={{ borderRadius: "50px", marginTop: 0.5 }}
      />
    </Box>
  );

  // The total band under the columns — same single grid, two cells.
  const totals = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        bgcolor: colors.expandedBg,
        borderTop: `0.5px solid ${colors.divider}`,
      }}
    >
      {["from", "to"].map((side, i) => (
        <Box
          key={side}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 1.5,
            py: 0.875,
            ...(i === 1 && { borderLeft: `0.5px solid ${colors.divider}` }),
          }}
        >
          <MSkeleton variant="text" width={40} height={12} sx={{ borderRadius: 1 }} />
          <MSkeleton variant="rounded" width={70} height={14} sx={{ borderRadius: "6px" }} />
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: `0.5px solid ${colors.border}`,
        background: colors.outerBg,
        overflow: "hidden",
      }}
    >
      {header}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          borderTop: `0.5px solid ${colors.divider}`,
        }}
      >
        {column("from")}
        {column("to")}
      </Box>
      {totals}
    </Box>
  );
}
