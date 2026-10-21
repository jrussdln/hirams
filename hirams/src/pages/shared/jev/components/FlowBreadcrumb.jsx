import { Fragment } from "react";
import { Box, Typography } from "@mui/material";
import {
  StoreOutlined,
  BusinessOutlined,
  PersonOutlined,
  DoubleArrowOutlined,
} from "@mui/icons-material";

// The animated hop between two parties.
const ARROW_INDEXES = [0, 1, 2];

/**
 * THE FLOW STRIP — the round trip a batch travels.
 *
 *   CLIENT →→→ COMPANY →→→ SUPPLIER →→→ COMPANY →→→ CLIENT
 *
 * The client orders from the company, the company buys from the supplier,
 * the company hands the goods back to the client. Every party is named by
 * its nickname.
 */
export default function FlowBreadcrumb({
  clientName = "",
  companyName = "",
  supplierName = "",
  colors,
}) {
  const parties = [
    { label: clientName || "—", icon: PersonOutlined },
    { label: companyName || "—", icon: BusinessOutlined },
    { label: supplierName || "—", icon: StoreOutlined },
    { label: companyName || "—", icon: BusinessOutlined },
    { label: clientName || "—", icon: PersonOutlined },
  ];

  const iconSx = {
    fontSize: "0.8rem",
    color: colors.textSecondary,
    flexShrink: 0,
  };
  const labelSx = {
    fontSize: "0.58rem",
    fontWeight: 700,
    color: colors.textPrimary,
    textTransform: "uppercase",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        flexWrap: "wrap",
        px: 1.25,
        py: 0.75,
        mb: 1.5,
        borderRadius: "8px",
        background: colors.mutedBg,
        border: `0.5px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.border}`,
      }}
    >
      {parties.map((party, i) => {
        const Icon = party.icon;
        return (
          <Fragment key={`${party.label}-${i}`}>
            {i > 0 && (
              <Box
                sx={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {ARROW_INDEXES.map((a) => (
                  <DoubleArrowOutlined
                    key={a}
                    sx={{
                      fontSize: "0.7rem",
                      color: colors.textMuted,
                      animation: `arrowPulse 1s ease-in-out ${
                        a * 0.15
                      }s infinite`,
                      "@keyframes arrowPulse": {
                        "0%, 100%": { opacity: 0.15 },
                        "50%": { opacity: 1 },
                      },
                    }}
                  />
                ))}
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.4,
                minWidth: 0,
              }}
            >
              <Icon sx={iconSx} />
              <Typography noWrap sx={labelSx}>
                {party.label}
              </Typography>
            </Box>
          </Fragment>
        );
      })}
    </Box>
  );
}
