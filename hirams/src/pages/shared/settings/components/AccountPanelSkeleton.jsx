import { Box, Divider, Skeleton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// Mirrors AccountPanel's field-row chrome, so swapping this skeleton for the
// loaded card produces no colour shift.
const useColors = (c) => ({
  cardBorder: c.account.cardBorder,
  divider: c.account.divider,
});

/**
 * Loading skeleton for the body of the My Account tab (AccountPanel).
 *
 * IMPORTANT: this renders ONLY the field-rows card. AccountPanel already
 * draws the blue header banner above the slot where this is mounted, so the
 * banner must NOT be duplicated here (it previously was, causing two stacked
 * blue banners while loading).
 *
 * The rows mirror the panel's real field layout (icon box + label + divider
 * + value) so the switch to loaded content has no layout shift.
 */
export default function AccountPanelSkeleton() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const colors = useColors(getThemeColors(isDark));

  const fieldRows = [
    { labelW: "38%", valueW: "55%" },
    { labelW: "42%", valueW: "48%" },
    { labelW: "46%", valueW: "44%" },
    { labelW: "30%", valueW: "60%" },
    { labelW: "26%", valueW: "35%" },
  ];

  return (
    <Box
      sx={{
        border: `1px solid ${colors.cardBorder}`,
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
        overflow: "hidden",
      }}
    >
      {fieldRows.map((row, i) => (
        <Box key={i}>
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 1.2, sm: 1.1 },
              gap: { xs: 0.5, sm: 1.5 },
            }}
          >
            {/* Icon box + label */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                minWidth: { sm: 140 },
                flexShrink: 0,
              }}
            >
              <Skeleton
                variant="rounded"
                width={28}
                height={28}
                sx={{ flexShrink: 0 }}
              />
              <Skeleton
                variant="text"
                width={row.labelW}
                height={14}
                sx={{ borderRadius: 1 }}
              />
            </Box>

            {/* Vertical divider (desktop only) */}
            <Skeleton
              variant="rectangular"
              width={1}
              height={20}
              sx={{ display: { xs: "none", sm: "block" }, mx: 0.5 }}
            />

            {/* Value */}
            <Skeleton
              variant="text"
              width="100%"
              height={18}
              sx={{
                borderRadius: 1,
                maxWidth: { xs: "100%", sm: row.valueW },
              }}
            />
          </Box>

          {i < fieldRows.length - 1 && (
            <Divider sx={{ mx: { xs: 1.5, sm: 2 }, borderColor: colors.divider }} />
          )}
        </Box>
      ))}
    </Box>
  );
}
